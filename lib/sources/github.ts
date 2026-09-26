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

    let notice: string | undefined
    let res = await fetchWithTimeout(url, {
      headers,
      timeoutMs: ctx.timeoutMs,
    })
    // A revoked/expired/mis-scoped deployment token returns 401. Public repository
    // search works anonymously, so degrade to the unauthenticated quota instead of
    // silently dropping a supply source (the root cause of 86% production coverage).
    if (res.status === 401 && headers.Authorization) {
      delete headers.Authorization
      notice = 'GITHUB_TOKEN rejected (401); used anonymous GitHub search. Rotate the deployment token.'
      console.warn('[simultaneity] ' + notice)
      res = await fetchWithTimeout(url, { headers, timeoutMs: ctx.timeoutMs })
    }
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
      ...(notice ? { notice } : {}),
    }
  } catch {
    return errorResult('github', label, 'GitHub request failed or timed out.')
  }
}
