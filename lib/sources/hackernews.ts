import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'
import { record, count, nonempty, optionalText, optionalCount } from './contract'

export async function searchHackerNews(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'Hacker News'
  try {
    const q = encodeURIComponent(query)
    const url = 'https://hn.algolia.com/api/v1/search?query=' + q + '&tags=story&hitsPerPage=10'
    const res = await pacedFetch('hackernews', url, { timeoutMs: ctx.timeoutMs })
    if (!res.ok) return errorResult('hackernews', label, 'Hacker News returned ' + res.status + '.')
    const data = await res.json()
    if (!record(data) || !count(data.nbHits) || !Array.isArray(data.hits) ||
      data.nbHits < data.hits.length || !data.hits.every((row) => record(row) &&
        nonempty(row.objectID) && nonempty(row.created_at) && optionalText(row.title) &&
        optionalText(row.url) && optionalCount(row.points) && optionalCount(row.num_comments))) {
      return errorResult('hackernews', label, 'Hacker News returned a malformed response.')
    }
    const items: EvidenceItem[] = (data.hits ?? []).map(
      (hit: {
        title: string | null
        url: string | null
        objectID: string
        created_at: string
        points: number
        num_comments: number
      }) => {
        const title = hit.title ?? 'Untitled story'
        return {
          title,
          description: null,
          url: hit.url ?? ('https://news.ycombinator.com/item?id=' + hit.objectID),
          date: hit.created_at,
          meta: (hit.points ?? 0).toLocaleString() + ' points · ' + (hit.num_comments ?? 0).toLocaleString() + ' comments',
          isLaunchSignal: /^show hn/i.test(title),
          relevance: 1,
        }
      },
    )
    return {
      source: 'hackernews',
      label,
      status: 'ok',
      totalCount: data.nbHits ?? items.length,
      items,
    }
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('hackernews', label, e.message, e.status === 429)
    return errorResult('hackernews', label, 'Hacker News request failed or timed out.')
  }
}
