import { createHash } from 'node:crypto'
import { InFlight, TTLCache } from '@/lib/core/cache'
import { dedupeAcrossSources } from '@/lib/core/dedup'
import { expandQuery } from '@/lib/core/expand'
import { displayQuery, normalizeQuery } from '@/lib/core/normalize'
import { runDemand } from '@/lib/demand'
import { computeCrowding } from '@/lib/scoring'
import { quadrantFor } from '@/lib/scoring/quadrant'
import { issueReceipt } from '@/lib/scoring/receipt'
import { runAllSources, searchGitHub, searchHackerNews } from '@/lib/sources'
import type { AdapterContext, CrowdingResult, DemandResult, SourceResult } from '@/lib/types'

const cache = new TTLCache<CrowdingResult>(
  Number(process.env.SCAN_CACHE_MAX ?? 500),
  Number(process.env.SCAN_CACHE_TTL_MS ?? 20 * 60 * 1000),
)
const inflight = new InFlight<CrowdingResult>()

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
  if (!extra || extra.status !== 'ok') return primary
  if (primary.status !== 'ok') return { ...extra, label: primary.label }
  const seen = new Set(primary.items.map((i) => i.url))
  const added = extra.items.filter((i) => !seen.has(i.url)).map((i) => ({ ...i, relevance: 0.7 }))
  return {
    ...primary,
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
    if (hit) return { ...hit, cached: true }
  }
  return inflight.run(key, async () => {
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
    const { sources, collapsed } = dedupeAcrossSources(merged)
    const base = computeCrowding(query, sources)
    const quadrant = demand ? quadrantFor(base.score, demand.score, demand.trend) : undefined
    const capsule = {
      ...base.capsule,
      version: '1.2' as const,
      expansions: variant ? expansions.slice(0, 2) : [query],
      duplicatesCollapsed: collapsed,
      demandSourceSummary: demand?.sources.map(({ source, status, totalCount, provenance, notice }) => ({ source, status, totalCount, ...(provenance ? { provenance } : {}), ...(notice ? { notice } : {}) })) ?? [],
      demandBreakdown: demand?.breakdown ?? [],
      coverage: base.coverage,
      demandCoverage: demand?.coverage ?? 0,
      demandEvidenceLinks: demand?.sources.filter((s) => s.status === 'ok').flatMap((s) => s.items.slice(0, 5).map((i) => ({ source: s.source, title: i.title, url: i.url }))) ?? [],
      demandScore: demand?.score ?? null,
      quadrant: quadrant?.quadrant ?? null,
    }
    const result: CrowdingResult = {
      ...base,
      methodology:
        base.methodology +
        ' Demand heat from Reddit, Stack Overflow and Ask HN. Query expanded with transparent synonym variants; cross-source duplicates collapsed.',
      demand,
      quadrant,
      expansions: variant ? expansions.slice(0, 2) : [query],
      duplicatesCollapsed: collapsed,
      capsule,
      receipt: issueReceipt(capsule),
    }
    // Do not cache badly degraded scans; let the next request retry upstreams.
    if (result.coverage >= 50) cache.set(key, result)
    return result
  })
}

export function cacheStats() {
  return { entries: cache.size }
}
