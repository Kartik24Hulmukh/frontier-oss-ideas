import { BudgetGate, CircuitBreaker, UpstreamError, reserveProviderCall, persistProviderBackoff } from './budget'
import { fetchWithTimeout } from './fetch'

/**
 * Process-local breaker/health plus optional Redis actual-call pacing: minute-level token-budget ceilings plus a
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
  perMinute: number
  nextAllowedAt: number
  quotaUnavailable: boolean
}

const guards = new Map<string, ProviderGuard>()

function guardFor(provider: string): ProviderGuard {
  let g = guards.get(provider)
  if (!g) {
    const perMinute = Number(process.env['PACING_' + provider.toUpperCase() + '_PER_MINUTE'] ?? (provider === 'github' ? 10 : 25))
    const configurationValid = Number.isSafeInteger(perMinute) && perMinute > 0 && perMinute <= 100_000
    g = { configurationValid, gate: new BudgetGate(configurationValid ? perMinute : 1, 60_000), breaker: new CircuitBreaker(3, 30_000), lastStatus: null, lastSuccessAt: null, lastFailureAt: null, requests: 0, failures: 0, perMinute, nextAllowedAt: 0, quotaUnavailable: false }
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
  if (g.nextAllowedAt > Date.now()) {
    const delay = g.nextAllowedAt - Date.now()
    throw new UpstreamError(provider + ' upstream backoff active; retry in ' + Math.ceil(delay / 1000) + 's.', 429, true, delay)
  }
  if (!g.breaker.canRequest(provider)) {
    throw new UpstreamError(provider + ' circuit open after repeated upstream failures; failing fast.', 503, true)
  }
  const hasAuth = new Headers(init?.headers).has('authorization')
  const ceiling = provider === 'github' && !hasAuth ? Math.min(10, g.perMinute) : g.perMinute
  const budget = g.gate.tryConsume('global', Date.now(), ceiling)
  if (!budget.ok) {
    // No request was dispatched: do not strand the single recovery probe.
    g.breaker.releaseProbe(provider)
    throw new UpstreamError(provider + ' per-minute provider ceiling reached; retry in ' + Math.ceil(budget.retryAfterMs / 1000) + 's.', 429, true, budget.retryAfterMs)
  }
  // No token-derived keys. Anonymous GitHub fallback always tightens to <=10,
  // even when an operator explicitly configured an authenticated ceiling.
  const reservation = await reserveProviderCall(provider, ceiling)
  if (reservation.status !== 'ok') {
    g.breaker.releaseProbe(provider)
    if (reservation.status === 'limited') {
      g.nextAllowedAt = Math.max(g.nextAllowedAt, Date.now() + reservation.retryAfterMs)
      throw new UpstreamError(provider + ' shared provider ceiling/backoff reached; retry in ' + Math.ceil(reservation.retryAfterMs / 1000) + 's.', 429, true, reservation.retryAfterMs)
    }
    g.quotaUnavailable = true
    throw new UpstreamError(provider + ' shared provider quota unavailable; no request dispatched.', 503, true)
  }
  g.quotaUnavailable = false
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
  // Persist before exposing the response to adapter retries. Already admitted
  // concurrent requests cannot be recalled; no later reservation may ignore it.
  const delay = await responseBackoff(provider, res)
  if (delay > 0) {
    g.nextAllowedAt = Math.max(g.nextAllowedAt, Date.now() + delay)
    if (!await persistProviderBackoff(provider, delay)) {
      g.failures += 1
      g.lastStatus = res.status
      g.lastFailureAt = Date.now()
      g.breaker.onFailure(provider)
      throw new UpstreamError(provider + ' could not persist upstream backoff; source unavailable.', 503, true, delay)
    }
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
    const status = !g.configurationValid || g.quotaUnavailable || g.nextAllowedAt > now || snap.state !== 'closed' ? 'degraded'
      : observationAgeMs === null || observationAgeMs > 300_000 ? 'unobserved'
      : g.lastStatus !== null && g.lastStatus >= 200 && g.lastStatus < 300 ? 'healthy' : 'degraded'
    providers.push({
      provider, status, configurationValid: g.configurationValid, observationAgeMs,
      state: snap.state,
      consecutiveFailures: snap.failures,
      retryInMs: Math.max(snap.retryInMs, g.nextAllowedAt - now, 0),
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

/** Delta-seconds or IMF-fixdate. No cap that shortens a provider's required wait. */
export function parseRetryAfter(value: string | null, now = Date.now()): number {
  if (!value) return 0
  const text = value.trim()
  if (/^\d+$/.test(text)) {
    const ms = Number(text) * 1000
    return Number.isSafeInteger(ms) ? ms : 0
  }
  // Do not let Date.parse interpret malformed numeric strings as calendar dates.
  if (!/^[A-Za-z]{3}, /.test(text)) return 0
  const date = Date.parse(text)
  const ms = date - now
  return Number.isSafeInteger(ms) ? Math.max(0, ms) : 0
}

async function responseBackoff(provider: string, res: Response): Promise<number> {
  // HTTP Date anchors absolute reset/Retry-After to the provider's own clock,
  // not a skewed replica. Delta-seconds and Redis durations need no app clock.
  const serverDate = Date.parse(res.headers.get('date') ?? '')
  const reference = Number.isFinite(serverDate) ? serverDate : Date.now()
  let delay = parseRetryAfter(res.headers.get('retry-after'), reference)
  const exhausted = res.headers.get('x-ratelimit-remaining') === '0'
  if (provider === 'github' && (exhausted || res.status === 429 || res.status === 403)) {
    const resetText = res.headers.get('x-ratelimit-reset')
    const reset = resetText && /^\d+$/.test(resetText) ? Number(resetText) * 1000 - reference : 0
    if (Number.isSafeInteger(reset)) delay = Math.max(delay, reset)
    // Covers secondary limits/403 without a trustworthy reset, not only 429.
    if (res.status === 429 || res.status === 403) delay = Math.max(delay, 60_000)
  }
  if (res.status === 429) delay = Math.max(delay, 60_000)
  if (provider === 'stackoverflow') {
    // Stack Exchange signals backoff in a successful JSON body. Inspect a clone
    // with a strict size/time bound; never consume the adapter's response body.
    const clone = res.clone(), reader = clone.body?.getReader()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const read = async () => {
        const chunks: Uint8Array[] = []; let size = 0
        if (!reader) return null
        while (true) {
          const next = await reader.read()
          if (next.done) break
          size += next.value.length
          if (size > 65_536) throw new Error('Backoff payload too large')
          chunks.push(next.value)
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'))
      }
      const data = await Promise.race([read(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Backoff read timeout')), 1500) })])
      if (data && Object.hasOwn(data, 'backoff')) {
        const ms = typeof data.backoff === 'number' ? data.backoff * 1000 : NaN
        delay = Math.max(delay, Number.isSafeInteger(ms) && ms >= 0 ? ms : 60_000)
      }
      if (data?.quota_remaining === 0) delay = Math.max(delay, 86_400_000)
    } catch {
      // Unable to inspect a quota-bearing body: conservative next-call backoff;
      // the adapter still handles malformed data and may degrade the current scan.
      delay = Math.max(delay, 60_000)
    } finally {
      if (timer) clearTimeout(timer)
      void reader?.cancel().catch(() => {})
    }
  }
  return delay
}
