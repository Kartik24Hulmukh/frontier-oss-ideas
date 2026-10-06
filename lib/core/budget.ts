import { TTLCache } from './cache'
import { createHash, randomUUID } from 'node:crypto'
import { acceptableRedisUrl } from './redis-endpoint'

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
  tryConsume(key = 'global', now = Date.now(), ceiling = this.limit): { ok: boolean; retryAfterMs: number } {
    if (![this.limit, this.windowMs, ceiling].every(n => Number.isSafeInteger(n) && n > 0)) return { ok: false, retryAfterMs: 60_000 }
    const limit = Math.min(this.limit, ceiling)
    const cutoff = now - this.windowMs
    const list = (this.windows.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length >= limit) {
      this.windows.set(key, list)
      return { ok: false, retryAfterMs: Math.max(1, list[list.length - limit] + this.windowMs - now) }
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
    readonly retryAfterMs = 0,
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

/** Deployment-wide actual-call quota, NOT an account quota across deployments.
 * All credentials/fallbacks for a provider deliberately share a conservative bucket.
 * Reservations are irrevocable. Redis TIME, rolling windows and same-slot keys.
 * A stricter replica's ceiling is retained until the bucket has been idle a window.
 */
export const PROVIDER_RESERVE_LUA = `local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[1])
local previous = tonumber(redis.call('GET', KEYS[3]))
if previous then limit = math.min(limit, previous) end
redis.call('SET', KEYS[3], limit, 'PX', window * 2)
local untilAt = tonumber(redis.call('GET', KEYS[2])) or 0
if untilAt > now then return {0, untilAt - now} end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local used = redis.call('ZCARD', KEYS[1])
if used >= limit then
 local first = redis.call('ZRANGE', KEYS[1], used - limit, used - limit, 'WITHSCORES')
 return {0, math.max(1, tonumber(first[2]) + window - now)}
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('PEXPIRE', KEYS[1], window * 2)
return {1, 0}`

export const PROVIDER_BACKOFF_LUA = `local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local untilAt = math.max(tonumber(redis.call('GET', KEYS[1])) or 0, now + tonumber(ARGV[1]))
redis.call('SET', KEYS[1], untilAt, 'PX', math.max(1, untilAt - now))
return untilAt - now`

export function providerBudgetMode(): 'per-instance' | 'distributed-configured' | 'blocked' {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url || token) return url && token && acceptableRedisUrl(url) ? 'distributed-configured' : 'blocked'
  // Preserve the explicitly capacity-limited beta's admission policy. Operators
  // must enable required mode before making fleet-capacity promises.
  return process.env.REQUIRE_DISTRIBUTED_LIMITS === 'true' ? 'blocked' : 'per-instance'
}

function providerKeys(provider: string): [string, string, string] {
  const base = 'si:provider:v1:{' + createHash('sha256').update(provider).digest('hex') + '}'
  return [base + ':calls', base + ':backoff', base + ':ceiling']
}

async function providerEval(command: unknown[], fetcher: typeof fetch): Promise<unknown> {
  const res = await fetcher(process.env.UPSTASH_REDIS_REST_URL!, {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.UPSTASH_REDIS_REST_TOKEN!, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(1500), cache: 'no-store', redirect: 'error',
  })
  if (!res.ok) throw new Error('Provider quota backend unavailable')
  const data = await res.json()
  if (!data || data.error) throw new Error('Provider quota backend unavailable')
  return data.result
}

export async function reserveProviderCall(provider: string, limit: number, fetcher: typeof fetch = fetch): Promise<{ status: 'ok' | 'limited' | 'unavailable'; retryAfterMs: number }> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100_000) return { status: 'unavailable', retryAfterMs: 0 }
  const mode = providerBudgetMode()
  if (mode === 'per-instance') return { status: 'ok', retryAfterMs: 0 }
  if (mode === 'blocked') return { status: 'unavailable', retryAfterMs: 0 }
  try {
    const result = await providerEval(['EVAL', PROVIDER_RESERVE_LUA, 3, ...providerKeys(provider), limit, 60_000, randomUUID()], fetcher)
    if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) || !Number.isSafeInteger(result[1]) || result[1] < 0 || (result[0] === 1 && result[1] !== 0)) throw new Error('Invalid quota result')
    return { status: result[0] === 1 ? 'ok' : 'limited', retryAfterMs: result[1] }
  } catch { return { status: 'unavailable', retryAfterMs: 0 } }
}

export async function persistProviderBackoff(provider: string, delayMs: number, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!Number.isSafeInteger(delayMs) || delayMs < 1) return false
  const mode = providerBudgetMode()
  if (mode === 'per-instance') return true
  if (mode === 'blocked') return false
  try {
    const result = await providerEval(['EVAL', PROVIDER_BACKOFF_LUA, 1, providerKeys(provider)[1], delayMs], fetcher)
    return typeof result === 'number' && Number.isSafeInteger(result) && result >= delayMs
  } catch { return false }
}
