import type { EvidenceItem, SourceResult } from '@/lib/types'

/**
 * Deterministic, dependency-free semantic relevance guard. It is deliberately
 * conservative: it annotates every item, removes only clear lexical drift, and
 * always retains the two strongest items so sparse lanes remain inspectable.
 * This belongs before scoring so irrelevant homonyms cannot inflate a verdict.
 */
const STOP = new Set('a an and are as at be by for from in into is it of on or that the this to with your'.split(' '))
const FAMILIES = [
  ['ai', 'artificial', 'intelligence', 'ml', 'machine', 'learning', 'model'],
  ['code', 'coding', 'developer', 'development', 'programming'],
  ['review', 'reviewer', 'audit', 'analysis', 'analyze'],
  ['realtime', 'live', 'streaming', 'collaborative', 'collaboration'],
  ['cli', 'terminal', 'commandline', 'console'],
  ['selfhosted', 'onprem', 'local', 'offline'],
]
const family = new Map(FAMILIES.flatMap((xs, i) => xs.map((x) => [x, i] as const)))

function words(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((x) => x.length > 1 && !STOP.has(x))
}
function stem(x: string): string {
  return x.replace(/(ations?|ments?|ingly|edly|ing|ers?|ies|s)$/i, '').slice(0, 18)
}
function concepts(value: string): Set<string> {
  return new Set(words(value).flatMap((x) => {
    const s = stem(x); const f = family.get(x)
    return f === undefined ? [s] : [s, `family:${f}`]
  }))
}

export function semanticRelevance(query: string, item: EvidenceItem): number {
  const q = concepts(query)
  const title = concepts(item.title)
  const body = concepts(`${item.title} ${item.description ?? ''}`)
  if (!q.size) return 1
  const overlap = (set: Set<string>) => [...q].filter((x) => set.has(x)).length / q.size
  // Title overlap is harder to spoof than a long description.
  return Math.round(Math.min(1, overlap(title) * 0.7 + overlap(body) * 0.3) * 100) / 100
}

export function filterSourceByRelevance(source: SourceResult, query: string, threshold = 0.18): SourceResult {
  if (source.status !== 'ok' || source.items.length === 0) return source
  const ranked = source.items.map((item, index) => ({ item: { ...item, relevance: semanticRelevance(query, item) }, index }))
  const keep = new Set(ranked.filter((x) => (x.item.relevance ?? 0) >= threshold).map((x) => x.index))
  // Conservative floor: evidence remains auditable and a niche query is not erased.
  ranked.slice().sort((a, b) => (b.item.relevance ?? 0) - (a.item.relevance ?? 0)).slice(0, 2).forEach((x) => keep.add(x.index))
  const items = ranked.filter((x) => keep.has(x.index)).map((x) => x.item)
  // Qualified = sampled items that truly cleared the threshold. Audit-floor
  // items below it stay visible but must not count as scoring evidence.
  const qualified = ranked.filter((x) => (x.item.relevance ?? 0) >= threshold).length
  return { ...source, items, relevanceFilter: { before: source.items.length, after: items.length, qualified, threshold } }
}

export function filterSourcesByRelevance(sources: SourceResult[], query: string, threshold?: number): SourceResult[] {
  return sources.map((source) => filterSourceByRelevance(source, query, threshold))
}
