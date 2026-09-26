import { createHash } from 'node:crypto'
import { RateLimiter } from './ratelimit'
import { acceptableRedisUrl } from './redis-endpoint'
const local = new RateLimiter(80, 600_000)
const globalLocal = new RateLimiter(400, 600_000)
// Fixed windows use Redis TIME, never an application-supplied bucket.
// Both keys share a cluster hash tag; the bucket is stored atomically in each hash.
export const ADMISSION_LUA = `local t = redis.call('TIME')
local bucket = math.floor(tonumber(t[1]) / 600)
local function count(key)
  if tonumber(redis.call('HGET', key, 'bucket')) ~= bucket then return 0 end
  return tonumber(redis.call('HGET', key, 'count') or '0')
end
local n = count(KEYS[1])
local g = count(KEYS[2])
local cost = tonumber(ARGV[1])
if n + cost > tonumber(ARGV[2]) or g + cost > tonumber(ARGV[3]) then return 0 end
redis.call('HSET', KEYS[1], 'bucket', bucket, 'count', n + cost)
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('HSET', KEYS[2], 'bucket', bucket, 'count', g + cost)
redis.call('EXPIRE', KEYS[2], ARGV[4])
return 1`
/** Atomic fixed-window admission across instances, with a hard shared upstream budget. */
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
      body: JSON.stringify(['EVAL', ADMISSION_LUA, 2, `si:quota:v2:{admission}:${hash}`, 'si:quota:v2:{admission}:global', cost, 80, 400, 1200]),
      signal: AbortSignal.timeout(2500), cache: 'no-store',
    })
    if (!res.ok) return 'unavailable'
    const data = await res.json()
    if (data.error || (data.result !== 0 && data.result !== 1)) return 'unavailable'
    return data.result === 1 ? 'ok' : 'limited'
  } catch { return 'unavailable' }
}
