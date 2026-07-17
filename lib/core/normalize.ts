/** Normalize user idea text for search + cache keys. */
export function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .slice(0, 120)
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function displayQuery(raw: string): string {
  return raw.trim().slice(0, 120).replace(/\s+/g, ' ')
}

/** Lightweight fingerprint for future cache layers. */
export function queryHash(normalized: string): string {
  let h = 2166136261
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
