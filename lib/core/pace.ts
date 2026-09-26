import { BudgetGate, CircuitBreaker, UpstreamError } from './budget'
import { fetchWithTimeout } from './fetch'

/**
 * Shared per-provider pacing: minute-level token-budget ceilings plus a
 * circuit breaker that opens on HTTP 429 and 5xx gateway failures, so an
 * exhausted upstream (e.g. GitHub Search: 30/min authenticated, 10/min
 * anonymous) is shed fast instead of cascading into scan timeouts.
 */
interface ProviderGuard {
  gate: BudgetGate
  breaker: CircuitBreaker
}

const guards = new Map<string, ProviderGuard>()

function guardFor(provider: string): ProviderGuard {
  let g = guards.get(provider)
  if (!g) {
    const perMinute = Number(process.env['PACING_' + provider.toUpperCase() + '_PER_MINUTE'] ?? 25)
    g = { gate: new BudgetGate(perMinute, 60_000), breaker: new CircuitBreaker(3, 30_000) }
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
  if (!g.breaker.canRequest(provider)) {
    throw new UpstreamError(provider + ' circuit open after repeated 429/5xx; failing fast.', 503, true)
  }
  const budget = g.gate.tryConsume()
  if (!budget.ok) {
    throw new UpstreamError(provider + ' per-minute provider ceiling reached; retry in ' + Math.ceil(budget.retryAfterMs / 1000) + 's.', 429, true)
  }
  const res = await fetchWithTimeout(url, init)
  if (res.status === 429 || res.status >= 500) {
    g.breaker.onFailure(provider)
  } else {
    g.breaker.onSuccess(provider)
  }
  return res
}

export { UpstreamError }
