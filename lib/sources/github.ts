import { errorResult, fetchWithTimeout } from '@/lib/core/fetch'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'

export async function searchGitHub(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'GitHub Repositories'
  try {
    const q = encodeURIComponent(query)
    const url = 'https://api.github.com/search/repositories?q=' + q + '&sort=stars&order=desc&per_page=10'
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'simultaneity-index/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (ctx.githubToken) headers.Authorization = 'Bearer ' + ctx.githubToken

    const res = await fetchWithTimeout(url, {
      headers,
      timeoutMs: ctx.timeoutMs,
    })
    if (res.status === 403 || res.status === 429) {
      return errorResult(
        'github',
        label,
        'GitHub rate limit — set GITHUB_TOKEN for higher limits.',
        true,
      )
    }
    if (!res.ok) return errorResult('github', label, 'GitHub returned ' + res.status + '.')

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
        meta: repo.stargazers_count.toLocaleString() + ' stars · last push ' + (repo.pushed_at?.slice(0, 10) ?? 'unknown'),
        relevance: 1,
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
