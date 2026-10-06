import { createHash } from 'node:crypto'
import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'
import { record, count, nonempty, optionalText } from './contract'

export type GitHubCredentialStatus = 'accepted' | 'rejected-anonymous-fallback' | 'absent-anonymous' | 'configured-unverified'
let observation: { fingerprint: string; status: GitHubCredentialStatus } | undefined
const fingerprint = (token: string) => createHash('sha256').update(token).digest('hex')

/** Process-local observed HTTP status, not an active credential probe. Never expose tokens/hashes. */
export function githubCredentialStatus(token = process.env.GITHUB_TOKEN): GitHubCredentialStatus {
  if (!token) return 'absent-anonymous'
  return observation?.fingerprint === fingerprint(token) ? observation.status : 'configured-unverified'
}
export function __resetGitHubCredentialForTests() { observation = undefined }

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
    let res = await pacedFetch('github', url, {
      headers,
      timeoutMs: ctx.timeoutMs,
    })
    // A revoked/expired/mis-scoped deployment token returns 401. Public repository
    // search works anonymously, so degrade to the unauthenticated quota instead of
    // silently dropping a supply source (the root cause of 86% production coverage).
    if (res.status === 401 && headers.Authorization) {
      observation = { fingerprint: fingerprint(ctx.githubToken!), status: 'rejected-anonymous-fallback' }
      delete headers.Authorization
      notice = 'GITHUB_TOKEN rejected (401); used anonymous GitHub search. Rotate the deployment token.'
      console.warn('[simultaneity] ' + notice)
      res = await pacedFetch('github', url, { headers, timeoutMs: ctx.timeoutMs })
    }
    if (res.status === 403 || res.status === 429) {
      // Single bounded retry after the provider signalled backoff window,
      // capped at 5s so a scan never stalls beyond its adapter timeout.
      const waitMs = Math.min(5000, Number(res.headers.get('retry-after') ?? 2) * 1000)
      await new Promise((r) => setTimeout(r, waitMs))
      res = await pacedFetch('github', url, { headers, timeoutMs: ctx.timeoutMs })
      if (res.status === 403 || res.status === 429) {
        return errorResult(
          'github',
          label,
          'GitHub rate limit — set GITHUB_TOKEN for higher limits.',
          true,
        )
      }
    }
    if (!res.ok) return errorResult('github', label, 'GitHub returned ' + res.status + '.')

    if (headers.Authorization && ctx.githubToken) {
      observation = { fingerprint: fingerprint(ctx.githubToken), status: 'accepted' }
    }
    const data = await res.json()
    if (!record(data) || !count(data.total_count) || !Array.isArray(data.items) ||
      (data.incomplete_results !== undefined && typeof data.incomplete_results !== 'boolean') ||
      data.total_count < data.items.length || !data.items.every((row) => record(row) &&
        nonempty(row.full_name) && nonempty(row.html_url) && count(row.stargazers_count) &&
        nonempty(row.created_at) && optionalText(row.description) && optionalText(row.pushed_at))) {
      return errorResult('github', label, 'GitHub returned a malformed response.')
    }
    if (data.incomplete_results === true) {
      notice = [notice, 'Partial GitHub evidence: provider marked search results incomplete. Counts and coverage are not exhaustive.'].filter(Boolean).join(' ')
    }
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
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('github', label, e.message, e.status === 429)
    return errorResult('github', label, 'GitHub request failed or timed out.')
  }
}
