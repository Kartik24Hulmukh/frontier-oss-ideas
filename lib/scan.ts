import { createHash, randomUUID } from 'node:crypto'
import { InFlight, TTLCache } from '@/lib/core/cache'
import { dedupeAcrossSources } from '@/lib/core/dedup'
import { expandQuery } from '@/lib/core/expand'
import { displayQuery, normalizeQuery } from '@/lib/core/normalize'
import { runDemand } from '@/lib/demand'
import { qualifiedDemandItems } from '@/lib/demand/qualification'
import { retainScanSnapshot } from '@/lib/core/scan-snapshots'
export { lookupScanSnapshot } from '@/lib/core/scan-snapshots'
import { computeCrowding } from '@/lib/scoring'
import { quadrantFor } from '@/lib/scoring/quadrant'
import { filterSourcesByRelevance } from '@/lib/scoring/semantic-filter'
import { issueReceipt } from '@/lib/scoring/receipt'
import { runAllSources, searchGitHub, searchHackerNews } from '@/lib/sources'
import type { AdapterContext, CrowdingResult, DemandResult, SourceResult } from '@/lib/types'

const cache = new TTLCache<{ result: CrowdingResult; sequence: number }>(
  Number(process.env.SCAN_CACHE_MAX ?? 500),
  Number(process.env.SCAN_CACHE_TTL_MS ?? 20 * 60 * 1000),
)
const inflight = new InFlight<CrowdingResult>()
let scanSequence = 0

export function defaultContext(): AdapterContext {
  return {
    githubToken: process.env.GITHUB_TOKEN,
    openAlexApiKey: process.env.OPENALEX_API_KEY,
    openAlexMailto: process.env.OPENALEX_MAILTO,
    timeoutMs: 8_000,
  }
}

/** Merge a variant-query result into the primary result for the same source. */
export function mergeSource(primary: SourceResult, extra: SourceResult | undefined): SourceResult {
  if (!extra) return primary
  if (extra.status !== 'ok') return { ...primary, notice: [primary.notice, 'Query variant unavailable; original-query evidence only.'].filter(Boolean).join(' ') }
  if (primary.status !== 'ok') return { ...extra, label: primary.label, notice: ['Primary query unavailable; variant-query evidence only.', extra.notice].filter(Boolean).join(' ') }
  const seen = new Set(primary.items.map((i) => i.url))
  const added = extra.items.filter((i) => !seen.has(i.url)).map((i) => ({ ...i, relevance: 0.7 }))
  return {
    ...primary,
    ...((primary.notice || extra.notice) ? { notice: [...new Set([primary.notice, extra.notice].filter(Boolean))].join(' ') } : {}),
    totalCount: Math.max(primary.totalCount, extra.totalCount),
    items: [...primary.items, ...added].slice(0, 15),
  }
}

export interface ScanOptions {
  ctx?: AdapterContext
  demand?: boolean
  expand?: boolean
  fresh?: boolean
}

export async function scanIdea(rawQuery: string, opts: ScanOptions = {}): Promise<CrowdingResult & { cached?: boolean }> {
  const query = displayQuery(rawQuery)
  const key = createHash('sha256').update(JSON.stringify([normalizeQuery(query), opts.ctx ?? null])).digest('hex') + (opts.demand === false ? ':s' : '') + (opts.expand === false ? ':x' : '')
  if (!opts.fresh) {
    const hit = cache.get(key)
    if (hit) return { ...hit.result, cached: true }
  }
  // A fresh canary must dispatch new observations, not join an older scan.
  // Keep the regular cache key below so healthy fresh results remain reusable.
  return inflight.run(opts.fresh ? `${key}:fresh:${randomUUID()}` : key, async () => {
    const sequence = ++scanSequence
    const ctx = opts.ctx ?? defaultContext()
    const expansions = opts.expand === false ? [query] : expandQuery(query, 3)
    const variant = expansions[1]

    const [primary, ghVariant, hnVariant, demand] = await Promise.all([
      runAllSources(query, ctx),
      variant ? searchGitHub(variant, ctx) : Promise.resolve(undefined),
      variant ? searchHackerNews(variant, ctx) : Promise.resolve(undefined),
      opts.demand === false ? Promise.resolve<DemandResult | undefined>(undefined) : runDemand(query, ctx),
    ])

    const merged = primary.map((s) =>
      s.source === 'github' ? mergeSource(s, ghVariant) : s.source === 'hackernews' ? mergeSource(s, hnVariant) : s,
    )
    const { sources: deduped, collapsed } = dedupeAcrossSources(merged, query)
    const sources = filterSourcesByRelevance(deduped, query)
    const base = computeCrowding(query, sources)
    const quadrant = demand ? quadrantFor(base.score, demand.coverage >= 67 ? demand.score : null, demand.trend, base.confidence >= 50) : undefined
    const capsule = {
      ...base.capsule,
      version: '1.2' as const,
      expansions: variant ? expansions.slice(0, 2) : [query],
      duplicatesCollapsed: collapsed,
      demandSourceSummary: demand?.sources.map(({ source, status, totalCount, provenance, notice, qualification }) => ({ source, status, totalCount, ...(qualification ? { qualification: (({ rejectedItems: _rejected, qualifiedIndices: _indices, ...summary }) => summary)(qualification) } : {}), ...(provenance ? { provenance } : {}), ...(notice ? { notice } : {}) })) ?? [],
      demandBreakdown: demand?.breakdown ?? [],
      coverage: base.coverage,
      demandCoverage: demand?.coverage ?? 0,
      demandEvidenceLinks: demand?.sources.filter((s) => s.status === 'ok').flatMap((s) => qualifiedDemandItems(s).slice(0, 5).map((i) => ({ source: s.source, title: i.title, url: i.url }))) ?? [],
      demandScore: demand?.score ?? null,
      quadrant: quadrant?.quadrant ?? null,
    }
    const result: CrowdingResult = {
      ...base,
      methodology:
        base.methodology +
        ' Observed, query-qualified discussion support within a 365-day window; not buyer demand. Lexical semantics remain uncalibrated. Query expanded with transparent synonym variants; cross-source duplicates collapsed.',
      demand,
      quadrant,
      expansions: variant ? expansions.slice(0, 2) : [query],
      duplicatesCollapsed: collapsed,
      capsule,
      receipt: issueReceipt(capsule),
    }
    // Snapshot retention is separate from healthy query caching; a store outage
    // leaves the deterministic scan usable but memo lookup fails closed.
    await retainScanSnapshot(result).catch(() => undefined)
    // Do not cache badly degraded scans; let the next request retry upstreams.
    // A slower older scan must not overwrite a newer healthy fresh snapshot.
    if (result.coverage >= 50 && sequence >= (cache.get(key)?.sequence ?? 0)) cache.set(key, { result, sequence })
    return result
  })
}

export function cacheStats() {
  return { entries: cache.size }
}
