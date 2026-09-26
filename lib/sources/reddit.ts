import { errorResult, fetchWithTimeout } from '@/lib/core/fetch'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'

/**
 * Demand-side adapter. Reddit is where builders and buyers openly say
 * "I want X" or "does anything like X exist" — the cheapest public proxy
 * for demand heat that pairs with our supply-side sources.
 */
export async function searchReddit(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'Reddit'
  try {
    const q = encodeURIComponent(query)
    const url =
      'https://www.reddit.com/search.json?q=' +
      q +
      '&sort=relevance&limit=15&t=year'
    const res = await fetchWithTimeout(url, {
      timeoutMs: ctx.timeoutMs,
      headers: { 'User-Agent': 'simultaneity-index/1.0 (demand-signal adapter)' },
    })
    if (res.status === 429) return errorResult('reddit', label, 'Reddit rate-limited this request.', true)
    if (!res.ok) return errorResult('reddit', label, 'Reddit returned ' + res.status + '.')
    const data = await res.json()
    const children: Array<{ data: Record<string, unknown> }> = data?.data?.children ?? []
    const items: EvidenceItem[] = children.map(({ data: post }) => {
      const title = String(post.title ?? 'Untitled post')
      const score = Number(post.score ?? 0)
      const comments = Number(post.num_comments ?? 0)
      const permalink = String(post.permalink ?? '')
      const subreddit = String(post.subreddit ?? '')
      const createdUtc = Number(post.created_utc ?? 0)
      const wantSignal = /\b(wish|want|looking for|does anyone know|anyone built|need a tool|is there a|any tool)\b/i.test(
        title,
      )
      return {
        title: subreddit ? '[r/' + subreddit + '] ' + title : title,
        description: null,
        url: permalink ? 'https://www.reddit.com' + permalink : String(post.url ?? ''),
        date: createdUtc ? new Date(createdUtc * 1000).toISOString() : null,
        meta: score.toLocaleString() + ' upvotes · ' + comments.toLocaleString() + ' comments',
        isLaunchSignal: wantSignal,
        relevance: 1,
      }
    })
    return {
      source: 'reddit',
      label,
      status: 'ok',
      totalCount: Number(data?.data?.dist ?? items.length),
      items,
    }
  } catch {
    return errorResult('reddit', label, 'Reddit request failed or timed out.')
  }
}
