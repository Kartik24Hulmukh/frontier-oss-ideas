import type { DemandSourceResult, EvidenceItem } from '@/lib/types'
import { expandQuery, keyTerms } from '@/lib/core/expand'
import { semanticRelevance } from '@/lib/scoring/semantic-filter'

/** Observed lexical discussion support, NOT buyer demand or calibrated semantics. */
export const DEMAND_WINDOW_DAYS = 365
export const DEMAND_SAMPLE_LIMIT = 25
const DAY = 86_400_000
const GENERIC = new Set('ai artificial intelligence ml machine learning llm language model gpt agent agents assistant autonomous copilot tool app software platform system solution automation'.split(' '))
const stem = (s: string) => s.replace(/(ing|ers?|s)$/i, '')
const terms = (s: string) => new Set(keyTerms(s).map(stem))
export interface DemandQualification {
  query: string
  method: 'demand-lexical-window-v1'
  semanticReliability: 'uncalibrated'
  capturedAt: string
  window: { start: string; end: string; days: number }
  rawCount: number
  sampledCount: number
  qualifiedCount: number
  rejectedCount: number
  qualifiedTotal: number
  qualifiedIndices: number[]
  sufficient: boolean
  reasons: string[]
  rejectedItems: Array<{ item: EvidenceItem | null; index: number; reasons: string[]; provenance: 'primary' | 'mirror' }>
}
export type QualifiedDemandSource = DemandSourceResult & { qualification?: DemandQualification }
export function demandWindow(now = Date.now()): DemandQualification['window'] {
  return { start: new Date(now - DEMAND_WINDOW_DAYS * DAY).toISOString(), end: new Date(now).toISOString(), days: DEMAND_WINDOW_DAYS }
}
function inspectable(item: EvidenceItem): boolean {
  try {
    const u = new URL(item.url)
    return !!item.title?.trim() && u.protocol === 'https:' && !!u.hostname
  } catch { return false }
}
/** Reuse existing transparent synonym taxonomy, but generic AI overlap never suffices. */
function topical(query: string, item: EvidenceItem): boolean {
  const title = terms(item.title)
  const body = terms(`${item.title} ${item.description ?? ''}`)
  return expandQuery(query, 12).some(variant => {
    const anchors = [...terms(variant)].filter(t => !GENERIC.has(t) && !GENERIC.has(stem(t)))
    if (!anchors.length) return false
    const required = anchors.length === 1 ? 1 : Math.max(2, Math.ceil(anchors.length * 0.6))
    // A body-only keyword dump must not rescue an unrelated title.
    return anchors.filter(t => body.has(t)).length >= required && anchors.filter(t => title.has(t)).length >= Math.min(2, required)
  })
}
export function demandItemReasons(item: EvidenceItem, query: string, source: DemandSourceResult['source'], window: DemandQualification['window']): string[] {
  const reasons: string[] = []
  if (!inspectable(item)) reasons.push('uninspectable')
  const timestamp = typeof item.date === 'string' ? Date.parse(item.date) : NaN
  if (!Number.isFinite(timestamp)) reasons.push('missing-or-invalid-date')
  else if (timestamp < Date.parse(window.start)) reasons.push('outside-window')
  else if (timestamp > Date.parse(window.end)) reasons.push('future-date')
  if (!topical(query, item)) reasons.push('insufficient-topical-anchors')
  const text = `${item.title} ${item.description ?? ''}`
  const promotion = /\b(show hn|launch(?:ed|ing)?|announc(?:e|ed|ing)|introducing|check out|try my|i built|we built)\b/i.test(text)
  const pull = /\b(need|looking for|wish|want|recommend|alternative|how (?:do|can|to)|help|problem|issue|broken|frustrat\w*|struggl\w*|can't|cannot|doesn't|unable|error|fails?|failing)\b|\?/i.test(text)
  if (promotion) reasons.push('promotion-not-pull')
  else if (source !== 'stackoverflow' && !pull) reasons.push('discussion-without-pull')
  return reasons
}
export function qualifyDemandSource(source: DemandSourceResult, query: string, now = Date.now(), malformed: DemandQualification['rejectedItems'] = []): QualifiedDemandSource {
  const window = demandWindow(now)
  const rejectedItems = [...malformed]
  const qualifiedIndices: number[] = []
  const seen = new Set<string>()
  const items = source.items.map((item, index) => {
    const reasons = demandItemReasons(item, query, source.source, window)
    const identity = item.url.replace(/\/$/, '')
    if (seen.has(identity)) reasons.push('duplicate-observation')
    // Reject first, then record identity: an irrelevant duplicate cannot erase support.
    if (!reasons.length && index < DEMAND_SAMPLE_LIMIT) { qualifiedIndices.push(index); seen.add(identity) }
    else {
      if (index >= DEMAND_SAMPLE_LIMIT) reasons.push('sample-bound')
      rejectedItems.push({ item, index, reasons, provenance: source.provenance ?? 'primary' })
    }
    return { ...item, relevance: semanticRelevance(query, item) }
  })
  const sufficient = source.status === 'ok' && qualifiedIndices.length > 0
  const reasons = ['Lexical qualification is uncalibrated; discussion heat is not verified buyer demand.', 'Only observed unique qualified items count; provider totals and engagement are audit-only.']
  if (!sufficient) reasons.push('No inspectable recent topical pull sample; abstain.')
  const qualification: DemandQualification = {
    query, method: 'demand-lexical-window-v1', semanticReliability: 'uncalibrated', capturedAt: new Date(now).toISOString(), window,
    rawCount: source.totalCount, sampledCount: items.length + malformed.length,
    qualifiedCount: qualifiedIndices.length, rejectedCount: rejectedItems.length,
    qualifiedTotal: qualifiedIndices.length, qualifiedIndices, sufficient, reasons, rejectedItems,
  }
  return { ...source, items, qualification }
}
/** Recheck against the declared query/window rather than trusting stored indices/counts. */
export function qualifiedDemandItems(source: QualifiedDemandSource): EvidenceItem[] {
  const q = source.qualification
  if (source.status !== 'ok' || !q || typeof q.query !== 'string' || !q.query.trim() || !q.window || q.method !== 'demand-lexical-window-v1' || q.window.days !== DEMAND_WINDOW_DAYS || !Number.isFinite(Date.parse(q.window.end)) || !Number.isFinite(Date.parse(q.window.start)) || Date.parse(q.window.end) - Date.parse(q.window.start) !== DEMAND_WINDOW_DAYS * DAY) return []
  const seen = new Set<string>()
  return source.items.slice(0, DEMAND_SAMPLE_LIMIT).filter(item => {
    if (demandItemReasons(item, q.query, source.source, q.window).length) return false
    const key = item.url.replace(/\/$/, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
