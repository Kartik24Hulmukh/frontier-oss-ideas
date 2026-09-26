import { createHash, randomUUID } from 'node:crypto'
import { RateLimiter } from './ratelimit'
import { acceptableRedisUrl } from './redis-endpoint'
export const ADMISSION_WINDOW_MS = 600_000
const local = new RateLimiter(80, ADMISSION_WINDOW_MS)
const globalLocal = new RateLimiter(400, 600_000)
// Rolling 10-minute windows derived from Redis TIME, never an application-supplied clock.
// Both keys share a cluster hash tag; members are unique per admission so a window boundary
// can never admit two windows' quota back to back (v2 fixed-window defect, closed in v3).
export const ADMISSION_LUA = `local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local cost = tonumber(ARGV[1])
local cutoff = now - tonumber(ARGV[5])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', cutoff)
local n = redis.call('ZCARD', KEYS[1])
local g = redis.call('ZCARD', KEYS[2])
if n + cost > tonumber(ARGV[2]) or g + cost > tonumber(ARGV[3]) then return 0 end
for i = 1, cost do
  local member = now .. ':' .. ARGV[6] .. ':' .. i
  redis.call('ZADD', KEYS[1], now, member)
  redis.call('ZADD', KEYS[2], now, KEYS[1] .. '|' .. member)
end
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[4])
return 1`
/** Atomic rolling-window admission across instances, with a hard shared upstream budget. */
export async function admitScan(key: string, cost = 1, fetcher: typeof fetch = fetch): Promise<'ok' | 'limited' | 'unavailable'> {
  // Reject invalid costs before either backend; negative EVAL costs could refund quota.
  if (!Number.isSafeInteger(cost) || cost < 1 || cost > 80) return 'limited'
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url && !token) {
    if (process.env.REQUIRE_DISTRIBUTED_LIMITS === 'true') return 'unavailable'
    return local.check(key, Date.now(), cost).allowed && globalLocal.check('global', Date.now(), cost).allowed ? 'ok' : 'limited'
  }
  if (!url || !token || !acceptableRedisUrl(url)) return 'unavailable'
  const hash = createHash('sha256').update(key).digest('hex')
  try {
    const res = await fetcher(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', ADMISSION_LUA, 2, `si:quota:v3:{admission}:${hash}`, 'si:quota:v3:{admission}:global', cost, 80, 400, 1200, ADMISSION_WINDOW_MS, randomUUID()]),
      signal: AbortSignal.timeout(2500), cache: 'no-store',
    })
    if (!res.ok) return 'unavailable'
    const data = await res.json()
    if (data.error || (data.result !== 0 && data.result !== 1)) return 'unavailable'
    return data.result === 1 ? 'ok' : 'limited'
  } catch { return 'unavailable' }
}
