import { randomUUID } from 'node:crypto'
import { acceptableRedisUrl } from '@/lib/core/redis-endpoint'

// Redis server time avoids app-instance clock skew. Reservations are deliberately
// irrevocable; a timeout does not prove that the provider performed no billable work.
export const RESERVE_TOKENS_LUA = `local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local window = tonumber(ARGV[3]) + tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local entries = redis.call('ZRANGE', KEYS[1], 0, -1)
local used = 0
for _, entry in ipairs(entries) do used = used + tonumber(string.match(entry, '^(%d+):')) end
local cost = tonumber(ARGV[1])
if used + cost > tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], now, ARGV[1] .. ':' .. ARGV[5])
redis.call('PEXPIRE', KEYS[1], window * 2)
return 1`

function required() { return process.env.NODE_ENV === 'production' || process.env.REQUIRE_DISTRIBUTED_LIMITS === 'true' }

export function sharedBudgetMode() {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url || token) return url && token && acceptableRedisUrl(url) ? 'distributed-configured' : 'blocked-invalid-config'
  return required() ? 'blocked-missing-config' : 'per-instance'
}

export async function reserveSharedTokens(tokens: number, limit: number, windowMs: number, deadlineMs: number, fetcher: typeof fetch = fetch): Promise<'ok' | 'limited' | 'unavailable'> {
  if (![tokens, limit, windowMs, deadlineMs].every(n => Number.isSafeInteger(n) && n > 0) || tokens > limit) return 'limited'
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url && !token) return required() ? 'unavailable' : 'ok'
  if (!url || !token || !acceptableRedisUrl(url)) return 'unavailable'
  try {
    const res = await fetcher(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(['EVAL', RESERVE_TOKENS_LUA, 1, 'si:llm:tokens:v1', tokens, limit, windowMs, deadlineMs, randomUUID()]), signal: AbortSignal.timeout(1500), cache: 'no-store' })
    if (!res.ok) return 'unavailable'
    const data = await res.json()
    if (data.error || (data.result !== 0 && data.result !== 1)) return 'unavailable'
    return data.result === 1 ? 'ok' : 'limited'
  } catch { return 'unavailable' }
}
