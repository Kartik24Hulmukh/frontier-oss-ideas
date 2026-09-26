import { createHash } from 'node:crypto'
import { RateLimiter } from './ratelimit'
const local = new RateLimiter(80, 600_000)
const globalLocal = new RateLimiter(400, 600_000)
const LUA = `local n = tonumber(redis.call('GET', KEYS[1]) or '0')
local g = tonumber(redis.call('GET', KEYS[2]) or '0')
local cost = tonumber(ARGV[1])
if n + cost > tonumber(ARGV[2]) or g + cost > tonumber(ARGV[3]) then return 0 end
redis.call('INCRBY', KEYS[1], cost)
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('INCRBY', KEYS[2], cost)
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
  if (!url || !token || !url.startsWith('https://')) return 'unavailable'
  const bucket = Math.floor(Date.now() / 600_000)
  const hash = createHash('sha256').update(key).digest('hex')
  try {
    const res = await fetcher(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', LUA, 2, `si:quota:{${bucket}}:${hash}`, `si:quota:{${bucket}}:global`, cost, 80, 400, 1200]),
      signal: AbortSignal.timeout(2500), cache: 'no-store',
    })
    if (!res.ok) return 'unavailable'
    const data = await res.json()
    if (data.error || (data.result !== 0 && data.result !== 1)) return 'unavailable'
    return data.result === 1 ? 'ok' : 'limited'
  } catch { return 'unavailable' }
}
