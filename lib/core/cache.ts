/**
 * Minimal in-memory response cache, keyed by normalized query.
 * Not a database — just enough to survive a Product Hunt / HN traffic spike
 * without hammering GitHub, arXiv, Reddit, etc. rate limits on identical queries.
 * Resets on cold start (serverless), which is an acceptable tradeoff at this stage.
 */
const store = new Map<string, { expiresAt: number; value: unknown }>()

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ENTRIES = 500

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expiresAt) {
    store.delete(key)
    return undefined
  }
  return hit.value as T
}

export function cacheSet(key: string, value: unknown, ttlMs = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value
    if (oldestKey !== undefined) store.delete(oldestKey)
  }
  store.set(key, { expiresAt: Date.now() + ttlMs, value })
}
