import type { CrowdingResult, EvidenceCapsule } from '@/lib/types'

type CapsuleInput = Omit<CrowdingResult, 'capsule'>

export function buildCapsule(result: CapsuleInput): EvidenceCapsule {
  const evidenceLinks = result.sources
    .filter((s) => s.status === 'ok')
    .flatMap((s) =>
      s.items.slice(0, 5).map((item) => ({
        source: s.source,
        title: item.title,
        url: item.url,
      })),
    )
    .slice(0, 25)

  return {
    version: '1.2',
    modelVersion: 'crowding-1.0',
    normalizedQuery: result.normalizedQuery,
    coverage: result.coverage,
    sourceSummary: result.sources.map(({ source, status, totalCount, notice }) => ({ source, status, totalCount, ...(notice ? { notice } : {}) })),
    breakdown: result.breakdown.map((entry) => ({ ...entry })),
    query: result.query,
    score: result.score,
    confidence: result.confidence,
    verdict: result.verdict,
    searchedAt: result.searchedAt,
    evidenceLinks,
    disclaimer:
      'Heuristic crowding evidence from public sources only. Not investment, legal, or novelty advice.',
  }
}
