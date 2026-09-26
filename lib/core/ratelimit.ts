/**
 * Tiny per-IP fixed-window rate limiter for public API routes.
 * In-memory per serverless instance: not bulletproof against distributed
 * abuse, but it caps accidental storms and trivial scrapers, and keeps
 * the alpha database-free. Tighten with an edge KV store if abuse appears.
 */
const buckets = new Map<string, { windowStart: number; count: number }>()

const MAX_KEYS = 2000

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetInSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart > windowMs) {
    if (buckets.size >= MAX_KEYS) {
      const oldestKey = buckets.keys().next().value
      if (oldestKey !== undefined) buckets.delete(oldestKey)
    }
    buckets.set(key, { windowStart: now, count: 1 })
    return { allowed: true, remaining: limit - 1, limit, resetInSeconds: Math.ceil(windowMs / 1000) }
  }

  bucket.count += 1
  const resetInSeconds = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000))
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, limit, resetInSeconds }
  }
  return { allowed: true, remaining: limit - bucket.count, limit, resetInSeconds }
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(result.resetInSeconds),
  }
}
