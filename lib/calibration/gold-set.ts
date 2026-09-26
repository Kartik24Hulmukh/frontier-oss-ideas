import type { Verdict } from '@/lib/types'

/**
 * Gold set for ordinal calibration. `rank` is the author-estimated ordinal crowding
 * judgement (1 = most crowded). Bands are the expected verdict. Edit via PR;
 * `pnpm calibrate` scores every idea live and reports Spearman rho + band
 * agreement into docs/CALIBRATION.md. Failures are published, not hidden.
 */
export interface GoldIdea {
  idea: string
  expected: Verdict
  rank: number
}

export const GOLD_SET: GoldIdea[] = [
  { idea: 'AI code review agent', expected: 'Saturated', rank: 1 },
  { idea: 'chatgpt wrapper chatbot', expected: 'Saturated', rank: 2 },
  { idea: 'retrieval augmented generation framework', expected: 'Saturated', rank: 3 },
  { idea: 'LLM observability', expected: 'Crowded', rank: 4 },
  { idea: 'AI meeting notes', expected: 'Crowded', rank: 5 },
  { idea: 'browser automation agent', expected: 'Crowded', rank: 6 },
  { idea: 'text to speech voice cloning', expected: 'Crowded', rank: 7 },
  { idea: 'MCP server registry', expected: 'Crowded', rank: 8 },
  { idea: 'agent memory layer', expected: 'Crowded', rank: 9 },
  { idea: 'AI invoice extraction', expected: 'Early movers', rank: 10 },
  { idea: 'LLM evaluation for legal contracts', expected: 'Early movers', rank: 11 },
  { idea: 'AI SOC2 compliance evidence collection', expected: 'Early movers', rank: 12 },
  { idea: 'carbon accounting API for shipping', expected: 'Early movers', rank: 13 },
  { idea: 'dental insurance claim denial prediction', expected: 'Early movers', rank: 14 },
  { idea: 'CAD model diffing for mechanical engineers', expected: 'Early movers', rank: 15 },
  { idea: 'beehive acoustic health monitoring', expected: 'Open lane', rank: 16 },
  { idea: 'soil moisture forecasting for smallholder farms in Sahel', expected: 'Open lane', rank: 17 },
  { idea: 'Terraform drift explanation for auditors', expected: 'Open lane', rank: 18 },
  { idea: 'church volunteer rota optimizer', expected: 'Open lane', rank: 19 },
  { idea: 'bagpipe tuning assistant', expected: 'Open lane', rank: 20 },
]

const BAND_INDEX: Record<Verdict, number> = { 'Open lane': 0, 'Early movers': 1, Crowded: 2, Saturated: 3 }

function ranks(values: number[]): number[] {
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const out = new Array<number>(values.length)
  let k = 0
  while (k < sorted.length) {
    let j = k
    while (j + 1 < sorted.length && sorted[j + 1].v === sorted[k].v) j++
    const avg = (k + j) / 2 + 1
    for (let m = k; m <= j; m++) out[sorted[m].i] = avg
    k = j + 1
  }
  return out
}

/** Spearman rank correlation (tie-aware via Pearson on ranks). */
export function spearman(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return 0
  const ra = ranks(a)
  const rb = ranks(b)
  const n = a.length
  const ma = ra.reduce((s, v) => s + v, 0) / n
  const mb = rb.reduce((s, v) => s + v, 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb)
    da += (ra[i] - ma) ** 2
    db += (rb[i] - mb) ** 2
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db)
}

/** Fraction of pairs ordered the same way by expert rank and engine score. */
export function pairwiseAgreement(expertRank: number[], scores: number[]): number {
  let agree = 0
  let total = 0
  for (let i = 0; i < scores.length; i++) {
    for (let j = i + 1; j < scores.length; j++) {
      if (expertRank[i] === expertRank[j]) continue
      total++
      // lower rank number = more crowded = should have higher score
      const expertSaysI = expertRank[i] < expertRank[j]
      if (scores[i] === scores[j]) agree += 0.5
      else if (expertSaysI === scores[i] > scores[j]) agree++
    }
  }
  return total === 0 ? 0 : agree / total
}

export function bandDistance(a: Verdict, b: Verdict): number {
  return Math.abs(BAND_INDEX[a] - BAND_INDEX[b])
}
