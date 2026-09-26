import { termSimilarity } from '@/lib/core/expand'
import type { CrowdingResult } from '@/lib/types'

export interface CohortRow {
  idea: string
  score: number
  verdict: CrowdingResult['verdict']
  confidence: number
  quadrant: string | null
  noveltyRank: number
  topEvidence: string[]
}

export interface Collision {
  a: string
  b: string
  similarity: number
}

/** Pairwise idea-twin detection inside a cohort (applicants colliding with each other). */
export function findCollisions(ideas: string[], threshold = 0.34): Collision[] {
  const out: Collision[] = []
  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const s = termSimilarity(ideas[i], ideas[j])
      if (s >= threshold) out.push({ a: ideas[i], b: ideas[j], similarity: Math.round(s * 100) / 100 })
    }
  }
  return out.sort((x, y) => y.similarity - x.similarity)
}

export function rankCohort(results: Array<{ idea: string; result: CrowdingResult }>): CohortRow[] {
  const sorted = [...results].sort((a, b) => a.result.score - b.result.score)
  return sorted.map(({ idea, result }, i) => ({
    idea,
    score: result.score,
    verdict: result.verdict,
    confidence: result.confidence,
    quadrant: result.quadrant?.quadrant ?? null,
    noveltyRank: i + 1,
    topEvidence: result.capsule.evidenceLinks.slice(0, 3).map((e) => e.url),
  }))
}

/** Run async work with bounded concurrency (protects upstream quotas). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

export function toCsv(rows: CohortRow[]): string {
  const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const head = ['novelty_rank', 'idea', 'simultaneity', 'verdict', 'confidence', 'quadrant', 'evidence']
  return [head.join(','), ...rows.map((r) => [r.noveltyRank, r.idea, r.score, r.verdict, r.confidence, r.quadrant, r.topEvidence.join(' ')].map(esc).join(','))].join('\n')
}
