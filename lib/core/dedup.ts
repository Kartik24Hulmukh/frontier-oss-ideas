import type { SourceResult } from '@/lib/types'
import { semanticRelevance } from '@/lib/scoring/semantic-filter'

/**
 * Canonical identity for an evidence URL so the same artefact appearing in
 * several channels (a GitHub repo linked from a Show HN post, an arXiv paper also
 * indexed by OpenAlex) is counted once.
 */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url)
    let host = u.hostname.replace(/^www\./, '').toLowerCase()
    let path = u.pathname.replace(/\/+$/, '').toLowerCase()
    if (host === 'arxiv.org') path = path.replace(/^\/(abs|pdf)\//, '/abs/').replace(/v\d+(\.pdf)?$/, '')
    if (host === 'github.com') path = path.split('/').slice(0, 3).join('/')
    if (host === 'doi.org' || host === 'dx.doi.org') host = 'doi.org'
    if (host === 'arxiv.org') path = path.replace(/\.pdf$/, '')
    for (const key of [...u.searchParams.keys()]) if (key.startsWith('utm_') || ['ref', 'fbclid', 'gclid'].includes(key)) u.searchParams.delete(key)
    u.searchParams.sort()
    const query = u.searchParams.toString()
    return host + path + (query ? '?' + query : '')
  } catch {
    return url.trim().toLowerCase()
  }
}

function titleKey(title: string): string {
  return title.toLowerCase().replace(/^show hn:\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Select the most query-relevant observation before collapsing duplicates.
 * Otherwise an early off-topic description can erase a later qualified copy
 * of the same artifact. Ties (and calls without a query) preserve source order.
 * Retain the winning item in its original source, without mixing metadata from
 * different observations. Raw counts, source notices and statuses are unchanged.
 * Qualification still happens after dedup; audit-only items remain inspectable.
 */
export function dedupeAcrossSources(sources: SourceResult[], query?: string): { sources: SourceResult[]; collapsed: number } {
  const seenUrl = new Set<string>()
  const seenTitle = new Set<string>()
  const retained = sources.map(() => new Set<number>())
  const candidates = sources.flatMap((source, sourceIndex) =>
    source.status !== 'ok' ? [] : source.items.map((item, itemIndex) => ({
      item, sourceIndex, itemIndex,
      relevance: query === undefined ? 0 : semanticRelevance(query, item),
    })),
  )
  candidates.sort((a, b) => b.relevance - a.relevance || a.sourceIndex - b.sourceIndex || a.itemIndex - b.itemIndex)
  let collapsed = 0
  for (const { item, sourceIndex, itemIndex } of candidates) {
    const u = canonicalUrl(item.url)
    const t = titleKey(item.title)
    if (seenUrl.has(u) || (t.length > 12 && seenTitle.has(t))) {
      collapsed++
      continue
    }
    seenUrl.add(u)
    if (t.length > 12) seenTitle.add(t)
    retained[sourceIndex].add(itemIndex)
  }
  const out = sources.map((s, sourceIndex) => s.status !== 'ok' ? s : {
    ...s,
    items: s.items.filter((_, itemIndex) => retained[sourceIndex].has(itemIndex)),
  })
  return { sources: out, collapsed }
}
