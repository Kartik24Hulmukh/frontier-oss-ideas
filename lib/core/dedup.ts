import type { SourceResult } from '@/lib/types'

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
 * Marks cross-source duplicates by setting relevance to 0 on later copies
 * (source order = priority) and removes them from items. totalCount is left as
 * reported upstream; only displayed/scored evidence is deduplicated.
 */
export function dedupeAcrossSources(sources: SourceResult[]): { sources: SourceResult[]; collapsed: number } {
  const seenUrl = new Set<string>()
  const seenTitle = new Set<string>()
  let collapsed = 0
  const out = sources.map((s) => {
    if (s.status !== 'ok') return s
    const items = s.items.filter((item) => {
      const u = canonicalUrl(item.url)
      const t = titleKey(item.title)
      const dupe = seenUrl.has(u) || (t.length > 12 && seenTitle.has(t))
      if (dupe) {
        collapsed++
        return false
      }
      seenUrl.add(u)
      if (t.length > 12) seenTitle.add(t)
      return true
    })
    return { ...s, items }
  })
  return { sources: out, collapsed }
}
