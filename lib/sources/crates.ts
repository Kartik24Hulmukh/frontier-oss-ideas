import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'
import { record, count, optionalText, optionalCount } from './contract'

/**
 * crates.io supply adapter (Rust systems ecosystem).
 * Uses the documented public API (https://crates.io/api/v1/crates) with an
 * identifying User-Agent as required by the crates.io crawler policy, and
 * stays inside the shared per-provider pacing ceiling + circuit breaker.
 */
export const CRATES_USER_AGENT =
  'simultaneity-index (+https://github.com/Kartik24Hulmukh/frontier-oss-ideas)'

interface CrateRow {
  name: string
  description?: string | null
  updated_at?: string | null
  downloads?: number | null
  recent_downloads?: number | null
  max_version?: string | null
  exact_match?: boolean
}

export async function searchCrates(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'crates.io (Rust)'
  try {
    const url =
      'https://crates.io/api/v1/crates?per_page=10&sort=relevance&q=' +
      encodeURIComponent(query)
    const res = await pacedFetch('crates', url, {
      headers: { Accept: 'application/json', 'User-Agent': CRATES_USER_AGENT },
      timeoutMs: ctx.timeoutMs,
    })
    if (!res.ok) return errorResult('crates', label, 'crates.io returned ' + res.status + '.', res.status === 429)
    const data = (await res.json()) as { crates?: CrateRow[]; meta?: { total?: number } }
    if (!record(data) || !record(data.meta) || !count(data.meta.total) ||
      !Array.isArray(data.crates) || data.meta.total < data.crates.length ||
      !data.crates.every((row) => record(row) && typeof row.name === 'string' &&
        optionalText(row.description) && optionalText(row.updated_at) &&
        optionalCount(row.downloads) && optionalCount(row.recent_downloads))) {
      return errorResult('crates', label, 'crates.io returned a malformed response.')
    }
    const rows = Array.isArray(data.crates) ? data.crates : []
    const items: EvidenceItem[] = rows
      .filter((c) => c && typeof c.name === 'string' && c.name.length > 0)
      .map((c) => ({
        title: c.name,
        description: c.description?.trim() || null,
        url: 'https://crates.io/crates/' + encodeURIComponent(c.name),
        date: c.updated_at ?? null,
        meta:
          typeof c.recent_downloads === 'number'
            ? c.recent_downloads.toLocaleString('en-US') + ' recent downloads'
            : null,
        relevance: c.exact_match ? 1 : 0.85,
      }))
    const total = typeof data.meta?.total === 'number' && Number.isFinite(data.meta.total) ? data.meta.total : items.length
    return { source: 'crates', label, status: 'ok', totalCount: total, items }
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('crates', label, e.message, e.status === 429)
    return errorResult('crates', label, 'crates.io request failed or timed out.')
  }
}
