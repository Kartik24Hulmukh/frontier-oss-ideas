/**
 * Tiny in-process TTL + LRU cache. Warm Vercel/Node instances reuse it, which
 * absorbs launch-day bursts (same query fanned out by HN readers) without a
 * database. Swap for Upstash/Redis by implementing the same interface.
 */
export interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(
    private readonly maxEntries = 500,
    private readonly ttlMs = 15 * 60 * 1000,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const hit = this.store.get(key)
    if (!hit) return undefined
    if (hit.expiresAt <= now) {
      this.store.delete(key)
      return undefined
    }
    // refresh LRU position
    this.store.delete(key)
    this.store.set(key, hit)
    return hit.value
  }

  set(key: string, value: T, ttlMs = this.ttlMs, now = Date.now()): void {
    if (this.store.has(key)) this.store.delete(key)
    this.store.set(key, { value, expiresAt: now + ttlMs })
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest === undefined) break
      this.store.delete(oldest)
    }
  }

  get size(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }
}

/** Coalesce identical in-flight work so 50 concurrent identical scans cost one fan-out. */
export class InFlight<T> {
  private pending = new Map<string, Promise<T>>()

  run(key: string, work: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key)
    if (existing) return existing
    const p = work().finally(() => this.pending.delete(key))
    this.pending.set(key, p)
    return p
  }
}
