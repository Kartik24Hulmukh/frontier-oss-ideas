import type { SourceResult, SubLane, Verdict } from '@/lib/types'
import { qualifiedItems } from './evidence'

/**
 * Sub-lane expansion (1.5.12). Turns "this lane is crowded" into ranked, testable
 * positioning bets. Every number is derived from the evidence already fetched for
 * this scan: we count how many sampled, relevance-filtered items explicitly claim a
 * dimension (offline, self-hosted, CLI, ...). No competitor is invented, no network
 * call is made, and each lane ships a re-scan query so the estimate can be verified
 * against live sources instead of trusted.
 */
interface Dimension {
  id: string
  label: string
  suffix: string
  pattern: RegExp
  angle: string
}

export const SUB_LANE_DIMENSIONS: readonly Dimension[] = [
  { id: 'offline', label: 'Offline / local-first', suffix: 'offline local-first', pattern: /\b(offline|local[- ]first|on[- ]device|runs? locally|no internet)\b/i, angle: 'local-first architecture with zero telemetry leakage' },
  { id: 'self-hosted', label: 'Self-hosted / open-core', suffix: 'self-hosted', pattern: /\b(self[- ]?host(ed|able)?|on[- ]prem(ise)?s?|docker|kubernetes|helm)\b/i, angle: 'self-hostable deployment teams can run inside their own perimeter' },
  { id: 'cli', label: 'CLI / pipeline-native', suffix: 'CLI', pattern: /\b(cli|command[- ]line|terminal|shell|pre-commit|github action|ci\/cd|pipeline)\b/i, angle: 'developer-native CLI that drops into CI pipelines' },
  { id: 'native', label: 'Rust / native performance', suffix: 'Rust', pattern: /\b(rust|zig|wasm|webassembly|native|blazing|high[- ]performance|c\+\+)\b/i, angle: 'native-speed implementation where incumbents are slow or heavy' },
  { id: 'privacy', label: 'Privacy / compliance', suffix: 'privacy compliance', pattern: /\b(privacy|private|gdpr|hipaa|soc ?2|compliance|audit|encrypt(ed|ion)?|zero[- ]knowledge)\b/i, angle: 'compliance-grade variant for regulated buyers' },
  { id: 'realtime', label: 'Real-time / streaming', suffix: 'real-time', pattern: /\b(real[- ]?time|streaming|live|websocket|low[- ]latency)\b/i, angle: 'real-time streaming variant where batch tools dominate' },
  { id: 'mobile', label: 'Mobile / edge', suffix: 'mobile', pattern: /\b(mobile|ios|android|edge device|react native|flutter)\b/i, angle: 'mobile or edge surface for users away from a desktop' },
  { id: 'api', label: 'API / SDK for builders', suffix: 'API SDK', pattern: /\b(api|sdk|library|plugin|extension|integration)\b/i, angle: 'embeddable API/SDK so other products ship the capability' },
]

const MIN_SAMPLE = 8

export function expandSubLanes(query: string, parentScore: number, verdict: Verdict, sources: SourceResult[], limit = 3): SubLane[] {
  const items = sources.filter((s) => s.status === 'ok').flatMap((s) => qualifiedItems(s).map((item) => ({ item, source: s.source })))
  const sample = items.length
  const q = query.toLowerCase()
  const lanes: SubLane[] = []
  for (const d of SUB_LANE_DIMENSIONS) {
    // A dimension already named in the idea is not a sub-lane of it.
    if (d.pattern.test(q)) continue
    const claims = items.filter(({ item }) => d.pattern.test(`${item.title} ${item.description ?? ''}`))
    // Laplace-smoothed share of sampled evidence claiming the dimension.
    const share = (claims.length + 0.5) / (sample + 1)
    const estimate = Math.round(Math.min(100, Math.max(0, parentScore * Math.min(1, share * 2.5))))
    lanes.push({
      id: d.id,
      label: d.label,
      estimatedScore: estimate,
      claimedBy: claims.length,
      sampled: sample,
      confidence: sample >= MIN_SAMPLE * 3 ? 'medium' : sample >= MIN_SAMPLE ? 'low' : 'insufficient',
      recommendation: `Investigate a ${d.angle}: ${claims.length} of ${sample} qualified sampled artifacts mention it. Absence from this sample is not a verified market gap.`,
      verifyQuery: `${query} ${d.suffix}`.replace(/\s+/g, ' ').trim().slice(0, 120),
      examples: claims.slice(0, 2).map(({ item, source }) => ({ source, title: item.title, url: item.url })),
      buildHere: false,
    })
  }
  if (sample === 0) return []
  void verdict
  return rank(lanes, limit)
}

function rank(lanes: SubLane[], limit: number): SubLane[] {
  const sorted = [...lanes].sort((a, b) => a.estimatedScore - b.estimatedScore || a.claimedBy - b.claimedBy || a.sampled - b.sampled || a.id.localeCompare(b.id)).slice(0, limit)
  if (sorted[0] && sorted[0].confidence !== 'insufficient') sorted[0] = { ...sorted[0], buildHere: true }
  return sorted
}
