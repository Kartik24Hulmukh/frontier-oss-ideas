import { BudgetGate, CircuitBreaker, UpstreamError } from './budget'
import { fetchWithTimeout } from './fetch'

/**
 * Shared per-provider pacing: minute-level token-budget ceilings plus a
 * circuit breaker that opens on HTTP 429 and 5xx gateway failures, so an
 * exhausted upstream (e.g. GitHub Search: 30/min authenticated, 10/min
 * anonymous) is shed fast instead of cascading into scan timeouts.
 */
interface ProviderGuard {
  configurationValid: boolean
  gate: BudgetGate
  breaker: CircuitBreaker
  lastStatus: number | null
  lastSuccessAt: number | null
  lastFailureAt: number | null
  requests: number
  failures: number
}

const guards = new Map<string, ProviderGuard>()

function guardFor(provider: string): ProviderGuard {
  let g = guards.get(provider)
  if (!g) {
    const perMinute = Number(process.env['PACING_' + provider.toUpperCase() + '_PER_MINUTE'] ?? 25)
    const configurationValid = Number.isSafeInteger(perMinute) && perMinute > 0
    g = { configurationValid, gate: new BudgetGate(configurationValid ? perMinute : 1, 60_000), breaker: new CircuitBreaker(3, 30_000), lastStatus: null, lastSuccessAt: null, lastFailureAt: null, requests: 0, failures: 0 }
    guards.set(provider, g)
  }
  return g
}

export async function pacedFetch(
  provider: string,
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const g = guardFor(provider)
  if (!g.configurationValid) {
    throw new UpstreamError(provider + ' invalid provider ceiling configuration; no request dispatched.', 503, false)
  }
  if (!g.breaker.canRequest(provider)) {
    throw new UpstreamError(provider + ' circuit open after repeated upstream failures; failing fast.', 503, true)
  }
  const budget = g.gate.tryConsume()
  if (!budget.ok) {
    // No request was dispatched: do not strand the single recovery probe.
    g.breaker.releaseProbe(provider)
    throw new UpstreamError(provider + ' per-minute provider ceiling reached; retry in ' + Math.ceil(budget.retryAfterMs / 1000) + 's.', 429, true)
  }
  g.requests += 1
  let res: Response
  try {
    res = await fetchWithTimeout(url, init)
  } catch (err) {
    // Network errors / timeouts are upstream failures too: count them toward the breaker.
    g.failures += 1
    g.lastStatus = 0
    g.lastFailureAt = Date.now()
    g.breaker.onFailure(provider)
    throw err
  }
  g.lastStatus = res.status
  if (res.status === 429 || res.status >= 500) {
    g.failures += 1
    g.lastFailureAt = Date.now()
    g.breaker.onFailure(provider)
  } else {
    // Non-retryable HTTP errors must not be counted as successful observations.
    if (res.ok) g.lastSuccessAt = Date.now()
    else { g.failures += 1; g.lastFailureAt = Date.now() }
    g.breaker.onSuccess(provider)
  }
  return res
}

export interface SourceHealth {
  provider: string
  status: 'healthy' | 'degraded' | 'unobserved'
  configurationValid: boolean
  observationAgeMs: number | null
  state: 'closed' | 'open' | 'half-open'
  consecutiveFailures: number
  retryInMs: number
  requests: number
  failures: number
  lastStatus: number | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
}

/**
 * Per-instance operational source health (no URLs, tokens or query text).
 * Fresh successful HTTP observations only; never a coverage/readiness claim.
 * HTTP errors and open breakers degrade health; observations expire after five minutes.
 */
export function sourceHealth(now = Date.now()): { status: 'healthy' | 'degraded' | 'unobserved'; scope: 'per-instance'; providers: SourceHealth[] } {
  const providers: SourceHealth[] = []
  for (const [provider, g] of [...guards.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const snap = g.breaker.snapshot(provider, now)
    const lastObservation = Math.max(g.lastSuccessAt ?? -Infinity, g.lastFailureAt ?? -Infinity)
    const observationAgeMs = Number.isFinite(lastObservation) ? Math.max(0, now - lastObservation) : null
    const status = !g.configurationValid || snap.state !== 'closed' ? 'degraded'
      : observationAgeMs === null || observationAgeMs > 300_000 ? 'unobserved'
      : g.lastStatus !== null && g.lastStatus >= 200 && g.lastStatus < 300 ? 'healthy' : 'degraded'
    providers.push({
      provider, status, configurationValid: g.configurationValid, observationAgeMs,
      state: snap.state,
      consecutiveFailures: snap.failures,
      retryInMs: snap.retryInMs,
      requests: g.requests,
      failures: g.failures,
      lastStatus: g.lastStatus,
      lastSuccessAt: g.lastSuccessAt !== null ? new Date(g.lastSuccessAt).toISOString() : null,
      lastFailureAt: g.lastFailureAt !== null ? new Date(g.lastFailureAt).toISOString() : null,
    })
  }
  const status = providers.length === 0 ? 'unobserved' : providers.some((p) => p.status === 'degraded') ? 'degraded' : providers.some((p) => p.status === 'unobserved') ? 'unobserved' : 'healthy'
  return { status, scope: 'per-instance', providers }
}

/** Test-only reset. */
export function __resetSourceHealthForTests(): void {
  guards.clear()
}

export { UpstreamError }
