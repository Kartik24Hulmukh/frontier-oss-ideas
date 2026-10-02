import { TTLCache } from './cache'

/**
 * Provider pacing + token-budget ceilings.
 *
 * Premortem #2 found that a 400-work-unit/10-minute application admission
 * limit does NOT guarantee compliance with minute-level provider quotas
 * (GitHub Search allows 30 authenticated or 10 anonymous searches per
 * minute; each scan may run a primary plus synonym search). These helpers
 * enforce hard per-provider ceilings *before* an upstream request is made,
 * so quota is spent deliberately instead of thrashing into HTTP 429s.
 *
 * Budgets are per warm instance; the distributed admission layer
 * (lib/core/admission.ts) bounds global request volume.
 */
export class BudgetGate {
  private windows = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Consume one unit if under the ceiling; returns retry delay (ms) when refused. */
  tryConsume(key = 'global', now = Date.now()): { ok: boolean; retryAfterMs: number } {
    const cutoff = now - this.windowMs
    const list = (this.windows.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length >= this.limit) {
      this.windows.set(key, list)
      return { ok: false, retryAfterMs: Math.max(1, list[0] + this.windowMs - now) }
    }
    list.push(now)
    this.windows.set(key, list)
    return { ok: true, retryAfterMs: 0 }
  }
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly retryable = true,
  ) {
    super(message)
    this.name = 'UpstreamError'
  }
}

export interface CircuitState {
  failures: number
  openedAt: number
  halfOpen: boolean
}

/**
 * Circuit breaker for HTTP 429 / 5xx gateway timeouts. After `threshold`
 * consecutive retryable failures the circuit opens for `cooldownMs`; the
 * first caller after cooldown gets a single half-open probe.
 */
export class CircuitBreaker {
  private states = new Map<string, CircuitState>()

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 60_000,
  ) {}

  canRequest(key: string, now = Date.now()): boolean {
    const s = this.states.get(key)
    if (!s) return true
    if (s.failures < this.threshold) return true
    if (now - s.openedAt >= this.cooldownMs) {
      if (s.halfOpen) return false
      s.halfOpen = true
      return true
    }
    return false
  }

  /** Release a reserved half-open probe when no upstream request was dispatched. */
  releaseProbe(key: string): void {
    const s = this.states.get(key)
    if (s) s.halfOpen = false
  }

  onSuccess(key: string): void {
    this.states.delete(key)
  }

  onFailure(key: string, now = Date.now()): void {
    const s = this.states.get(key) ?? { failures: 0, openedAt: now, halfOpen: false }
    s.failures += 1
    s.halfOpen = false
    if (s.failures >= this.threshold) s.openedAt = now
    this.states.set(key, s)
  }

  /** Read-only view for operator health surfaces. Never mutates half-open state. */
  snapshot(key: string, now = Date.now()): { state: 'closed' | 'open' | 'half-open'; failures: number; retryInMs: number } {
    const s = this.states.get(key)
    if (!s) return { state: 'closed', failures: 0, retryInMs: 0 }
    if (s.failures < this.threshold) return { state: 'closed', failures: s.failures, retryInMs: 0 }
    const elapsed = now - s.openedAt
    if (elapsed >= this.cooldownMs) return { state: 'half-open', failures: s.failures, retryInMs: 0 }
    return { state: 'open', failures: s.failures, retryInMs: this.cooldownMs - elapsed }
  }

  isOpen(key: string, now = Date.now()): boolean {
    return !this.canRequestPeek(key, now)
  }

  private canRequestPeek(key: string, now: number): boolean {
    const s = this.states.get(key)
    if (!s || s.failures < this.threshold) return true
    return now - s.openedAt >= this.cooldownMs
  }
}

/**
 * Generic multi-provider gateway for LLM-style bearer APIs (e.g. a Melious
 * routing endpoint across GLM, Kimi and Qwen models) with deterministic
 * sub-200ms failover: providers are raced only across entries whose circuit
 * is closed, with staggered hedged starts capped by `failoverWithinMs`.
 * No keys are logged; only provider ids appear in diagnostics.
 */
export interface GatewayProvider {
  id: string
  url: string
  model: string
  tokenBudgetPerMinute?: number
}

export class ModelGateway {
  private breakers = new CircuitBreaker(3, 30_000)
  private budgets = new TTLCache<number>(10_000, 60_000)

  constructor(private readonly failoverWithinMs = 200) {}

  budgetOk(provider: GatewayProvider, ceiling = provider.tokenBudgetPerMinute ?? 60): boolean {
    const key = 'gw:' + provider.id + ':' + Math.floor(Date.now() / 60_000)
    const used = this.budgets.get(key) ?? 0
    if (used >= ceiling) return false
    this.budgets.set(key, used + 1)
    return true
  }

  order(providers: GatewayProvider[]): GatewayProvider[] {
    return providers.filter((p) => this.breakers.canRequest('gw:' + p.id))
  }

  record(providerId: string, ok: boolean): void {
    if (ok) this.breakers.onSuccess('gw:' + providerId)
    else this.breakers.onFailure('gw:' + providerId)
  }
}
