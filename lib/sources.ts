import type { EvidenceItem, SourceResult } from './types'

const TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string, headers?: Record<string, string>) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timer)
  }
}

function errorResult(
  source: SourceResult['source'],
  label: string,
  message: string,
  rateLimited = false,
): SourceResult {
  return {
    source,
    label,
    status: rateLimited ? 'rate_limited' : 'error',
    totalCount: 0,
    items: [],
    errorMessage: message,
  }
}

export async function searchGitHub(query: string): Promise<SourceResult> {
  const label = 'GitHub Repositories'
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`
    const res = await fetchWithTimeout(url, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'simultaneity-index-prototype',
    })
    if (res.status === 403 || res.status === 429) {
      return errorResult('github', label, 'GitHub rate limit hit — retry in about a minute.', true)
    }
    if (!res.ok) {
      return errorResult('github', label, `GitHub returned ${res.status}.`)
    }
    const data = await res.json()
    const items: EvidenceItem[] = (data.items ?? []).map(
      (repo: {
        full_name: string
        description: string | null
        html_url: string
        created_at: string
        stargazers_count: number
        pushed_at: string
      }) => ({
        title: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        date: repo.created_at,
        meta: `${repo.stargazers_count.toLocaleString()} stars · last push ${repo.pushed_at?.slice(0, 10) ?? 'unknown'}`,
      }),
    )
    return {
      source: 'github',
      label,
      status: 'ok',
      totalCount: data.total_count ?? items.length,
      items,
    }
  } catch {
    return errorResult('github', label, 'GitHub request failed or timed out.')
  }
}

export async function searchHackerNews(query: string): Promise<SourceResult> {
  const label = 'Hacker News'
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`
    const res = await fetchWithTimeout(url)
    if (!res.ok) {
      return errorResult('hackernews', label, `Hacker News returned ${res.status}.`)
    }
    const data = await res.json()
    const items: EvidenceItem[] = (data.hits ?? []).map(
      (hit: {
        title: string | null
        story_text: string | null
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
          url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
          date: hit.created_at,
          meta: `${(hit.points ?? 0).toLocaleString()} points · ${(hit.num_comments ?? 0).toLocaleString()} comments`,
          isLaunchSignal: /^show hn/i.test(title),
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
  } catch {
    return errorResult('hackernews', label, 'Hacker News request failed or timed out.')
  }
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  return match ? match[1].trim() : null
}

export async function searchArxiv(query: string): Promise<SourceResult> {
  const label = 'arXiv Papers'
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(`"${query}"`)}&max_results=10&sortBy=relevance`
    const res = await fetchWithTimeout(url)
    if (!res.ok) {
      return errorResult('arxiv', label, `arXiv returned ${res.status}.`)
    }
    const xml = await res.text()
    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)</)
    const totalCount = totalMatch ? Number.parseInt(totalMatch[1], 10) : 0
    const entries = xml.split('<entry>').slice(1)
    const items: EvidenceItem[] = entries.map((entry) => {
      const title = (extractTag(entry, 'title') ?? 'Untitled paper').replace(/\s+/g, ' ')
      const summary = (extractTag(entry, 'summary') ?? '').replace(/\s+/g, ' ')
      const id = extractTag(entry, 'id') ?? ''
      const published = extractTag(entry, 'published')
      return {
        title,
        description: summary.length > 220 ? `${summary.slice(0, 220)}…` : summary || null,
        url: id,
        date: published,
        meta: published ? `published ${published.slice(0, 10)}` : null,
      }
    })
    return { source: 'arxiv', label, status: 'ok', totalCount, items }
  } catch {
    return errorResult('arxiv', label, 'arXiv request failed or timed out.')
  }
}

export async function searchNpm(query: string): Promise<SourceResult> {
  const label = 'npm Packages'
  try {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    const res = await fetchWithTimeout(url)
    if (!res.ok) {
      return errorResult('npm', label, `npm registry returned ${res.status}.`)
    }
    const data = await res.json()
    const items: EvidenceItem[] = (data.objects ?? []).map(
      (obj: {
        package: {
          name: string
          description?: string
          date?: string
          links?: { npm?: string; repository?: string; homepage?: string }
        }
      }) => ({
        title: obj.package.name,
        description: obj.package.description ?? null,
        url:
          obj.package.links?.npm ??
          `https://www.npmjs.com/package/${obj.package.name}`,
        date: obj.package.date ?? null,
        meta: obj.package.date
          ? `last publish ${obj.package.date.slice(0, 10)}`
          : null,
      }),
    )
    return {
      source: 'npm',
      label,
      status: 'ok',
      totalCount: data.total ?? items.length,
      items,
    }
  } catch {
    return errorResult('npm', label, 'npm registry request failed or timed out.')
  }
}
