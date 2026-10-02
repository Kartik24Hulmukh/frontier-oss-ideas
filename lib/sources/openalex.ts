import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'

export async function searchOpenAlex(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'OpenAlex Works'
  try {
    const parameters = new URLSearchParams({
      search: query,
      per_page: '10',
    })
    if (ctx.openAlexApiKey) parameters.set('api_key', ctx.openAlexApiKey)
    if (ctx.openAlexMailto) parameters.set('mailto', ctx.openAlexMailto)

    const response = await pacedFetch(
      'openalex',
      `https://api.openalex.org/works?${parameters.toString()}`,
      {
        headers: {
          'User-Agent': `simultaneity-index/1.0${ctx.openAlexMailto ? ` (mailto:${ctx.openAlexMailto})` : ''}`,
        },
        timeoutMs: ctx.timeoutMs,
      },
    )

    if (response.status === 401) {
      return errorResult('openalex', label, 'OpenAlex requires OPENALEX_API_KEY.')
    }
    if (response.status === 429) {
      return errorResult('openalex', label, 'OpenAlex rate limited.', true)
    }
    if (!response.ok) {
      return errorResult('openalex', label, `OpenAlex returned ${response.status}.`)
    }

    const data = await response.json()
    const items: EvidenceItem[] = (data.results ?? []).map(
      (work: {
        display_name?: string
        title?: string
        publication_date?: string
        cited_by_count?: number
        id?: string
        doi?: string | null
        primary_location?: { landing_page_url?: string | null }
      }) => {
        const title = work.display_name ?? work.title ?? 'Untitled work'
        const doi = work.doi?.replace(/^https?:\/\/doi.org\//, '')
        const url =
          work.primary_location?.landing_page_url ||
          (doi ? `https://doi.org/${doi}` : undefined) ||
          work.id ||
          'https://openalex.org'
        return {
          title,
          description: null,
          url,
          date: work.publication_date ?? null,
          meta: `${(work.cited_by_count ?? 0).toLocaleString()} citations`,
          relevance: 1,
        }
      },
    )

    return {
      source: 'openalex',
      label,
      status: 'ok',
      totalCount: data.meta?.count ?? items.length,
      items,
    }
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('openalex', label, e.message, e.status === 429)
    return errorResult('openalex', label, 'OpenAlex request failed or timed out.')
  }
}
