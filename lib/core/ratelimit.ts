import { createHash } from 'node:crypto'
/**
 * Sliding-window per-key rate limiter (in-memory, per instance).
 * Protects app capacity; GitHub Search has a separate 10/min anonymous or 30/min authenticated budget.
 * App admission is not a substitute for per-provider request pacing.
 * and your bill. Free tier default: 20 scans / 10 minutes / IP.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now(), cost = 1): { allowed: boolean; remaining: number; retryAfterSec: number } {
    if (!Number.isInteger(cost) || cost < 1 || cost > this.limit) return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(this.windowMs / 1000) }
    const cutoff = now - this.windowMs
    if (!this.hits.has(key) && this.hits.size >= this.maxKeys) {
      for (const [k, v] of this.hits) if (!v.some((t) => t > cutoff)) this.hits.delete(k)
      if (this.hits.size >= this.maxKeys) return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(this.windowMs / 1000) }
    }
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length + cost > this.limit) {
      const retryAfterSec = Math.max(1, Math.ceil((list[Math.max(0, list.length + cost - this.limit - 1)] + this.windowMs - now) / 1000))
      this.hits.set(key, list)
      return { allowed: false, remaining: 0, retryAfterSec }
    }
    list.push(...Array<number>(cost).fill(now))
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
  // Vercel overwrites this header. Self-hosted ingress must overwrite forwarded headers.
  const fwd = request.headers.get(process.env.VERCEL ? 'x-vercel-forwarded-for' : 'x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() || 'anon'
  // Unverified X-Api-Key values must NEVER create a new quota bucket.
  return 'ip:' + createHash('sha256').update(ip).digest('hex')
}

const SCAN_LIMIT = Number(process.env.SCAN_RATE_LIMIT ?? 20)
const SCAN_WINDOW_MS = Number(process.env.SCAN_RATE_WINDOW_MS ?? 10 * 60 * 1000)

export const scanLimiter = new RateLimiter(SCAN_LIMIT, SCAN_WINDOW_MS)

export function rateLimitResponse(retryAfterSec: number, headers: Record<string, string> = {}): Response {
  return Response.json(
    {
      error: `Rate limit reached. Try again in ${retryAfterSec}s, then retry.`,
    },
    { status: 429, headers: { ...headers, 'Retry-After': String(retryAfterSec), 'Cache-Control': 'no-store' } },
  )
}
