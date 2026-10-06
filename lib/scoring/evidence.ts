import type { EvidenceItem, SourceResult } from '@/lib/types'

/** Audit-floor items stay visible, but never support scores or recommendations. */
export function qualifiedItems(source: SourceResult): EvidenceItem[] {
  if (source.status !== 'ok') return []
  const filter = source.relevanceFilter
  return filter ? source.items.filter(item => (item.relevance ?? 1) >= filter.threshold) : source.items
}

/** Only an explicit star unit is traction; dates and download counts are not. */
export function parseStars(meta: string | null): number {
  const match = meta?.match(/([\d,]+)\s*stars\b/i)
  return match ? Number.parseInt(match[1].replace(/,/g, ''), 10) : 0
}
