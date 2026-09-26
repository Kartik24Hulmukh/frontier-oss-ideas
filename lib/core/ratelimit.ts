/**
 * Sliding-window per-key rate limiter (in-memory, per instance).
 * Protects upstream API quotas (GitHub 60/h unauthenticated, 5000/h with token)
 * and your bill. Free tier default: 20 scans / 10 minutes / IP.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): { allowed: boolean; remaining: number; retryAfterSec: number } {
    const cutoff = now - this.windowMs
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length >= this.limit) {
      const retryAfterSec = Math.max(1, Math.ceil((list[0] + this.windowMs - now) / 1000))
      this.hits.set(key, list)
      return { allowed: false, remaining: 0, retryAfterSec }
    }
    list.push(now)
    this.hits.set(key, list)
    if (this.hits.size > 10_000) {
      // opportunistic GC of idle keys
      for (const [k, v] of this.hits) {
        if (!v.some((t) => t > cutoff)) this.hits.delete(k)
      }
    }
    return { allowed: true, remaining: this.limit - list.length, retryAfterSec: 0 }
  }
}

export function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anon'
  const apiKey = request.headers.get('x-api-key')
  return apiKey ? `key:${apiKey.slice(0, 64)}` : `ip:${ip}`
}

const SCAN_LIMIT = Number(process.env.SCAN_RATE_LIMIT ?? 20)
const SCAN_WINDOW_MS = Number(process.env.SCAN_RATE_WINDOW_MS ?? 10 * 60 * 1000)

export const scanLimiter = new RateLimiter(SCAN_LIMIT, SCAN_WINDOW_MS)

export function rateLimitResponse(retryAfterSec: number): Response {
  return Response.json(
    {
      error: `Rate limit reached. Try again in ${retryAfterSec}s, or use an API key for higher limits.`,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )
}
