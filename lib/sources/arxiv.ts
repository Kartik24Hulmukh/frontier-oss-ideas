import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'
import { count } from './contract'

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'))
  return match ? match[1].trim() : null
}

export async function searchArxiv(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'arXiv Papers'
  try {
    const phrase = '"' + query + '"'
    const url =
      'https://export.arxiv.org/api/query?search_query=all:' +
      encodeURIComponent(phrase) +
      '&max_results=10&sortBy=relevance'
    const res = await pacedFetch('arxiv', url, { timeoutMs: ctx.timeoutMs })
    if (!res.ok) return errorResult('arxiv', label, 'arXiv returned ' + res.status + '.')
    const xml = await res.text()
    // A proxy/login/challenge page can be HTTP 200. Require the expected feed
    // envelope and explicit count, not absence of entries as proof of emptiness.
    if (!/^\s*(?:<\?xml[^?]*\?>\s*)?<feed\b[^>]*>[\s\S]*<\/feed>\s*$/.test(xml) ||
      /<(?:html|!DOCTYPE)\b/i.test(xml)) {
      return errorResult('arxiv', label, 'arXiv returned a malformed feed.')
    }
    const totalMatch = xml.match(/<opensearch:totalResults\b[^>]*>(\d+)<\/opensearch:totalResults>/)
    const totalCount = totalMatch ? Number.parseInt(totalMatch[1], 10) : 0
    const entries = xml.split('<entry>').slice(1)
    if (!totalMatch || !count(totalCount) || totalCount < entries.length ||
      (xml.match(/<entry\b/g) ?? []).length !== entries.length ||
      (xml.match(/<\/entry>/g) ?? []).length !== entries.length ||
      entries.some((entry) => !extractTag(entry, 'id') || !extractTag(entry, 'title') ||
        !extractTag(entry, 'published') || /\/api\/errors[?#]/.test(extractTag(entry, 'id') ?? ''))) {
      return errorResult('arxiv', label, 'arXiv returned a malformed feed.')
    }
    const items: EvidenceItem[] = entries.map((entry) => {
      const title = (extractTag(entry, 'title') ?? 'Untitled paper').replace(/\s+/g, ' ')
      const summary = (extractTag(entry, 'summary') ?? '').replace(/\s+/g, ' ')
      const id = extractTag(entry, 'id') ?? ''
      const published = extractTag(entry, 'published')
      return {
        title,
        description: summary.length > 220 ? summary.slice(0, 220) + '…' : summary || null,
        url: id,
        date: published,
        meta: published ? 'published ' + published.slice(0, 10) : null,
        relevance: 1,
      }
    })
    return { source: 'arxiv', label, status: 'ok', totalCount, items }
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('arxiv', label, e.message, e.status === 429)
    return errorResult('arxiv', label, 'arXiv request failed or timed out.')
  }
}
