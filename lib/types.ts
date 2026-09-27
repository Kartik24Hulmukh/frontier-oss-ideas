export type SourceId =
  | 'github'
  | 'hackernews'
  | 'arxiv'
  | 'openalex'
  | 'npm'
  | 'pypi'
  | 'huggingface'

export type SourceStatus = 'ok' | 'error' | 'rate_limited'

export interface EvidenceItem {
  title: string
  description: string | null
  url: string
  date: string | null
  meta: string | null
  isLaunchSignal?: boolean
  /** 0-1 heuristic relevance to the query; default 1 when unknown */
  relevance?: number
}

export interface SourceResult {
  source: SourceId
  label: string
  status: SourceStatus
  totalCount: number
  items: EvidenceItem[]
  errorMessage?: string
  /** Non-fatal operator notice, e.g. credential fallback. Never contains secrets. */
  notice?: string
  /** Conservative pre-score relevance filtering; counts remain visible for audit. */
  relevanceFilter?: { before: number; after: number; threshold: number }
}

export interface ScoreBreakdown {
  source: SourceId
  label: string
  subScore: number
  signal: string
  weight: number
  included: boolean
}

export type Verdict = 'Open lane' | 'Early movers' | 'Crowded' | 'Saturated'

export interface Wedge {
  title: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
}

export interface CrowdingResult {
  query: string
  normalizedQuery: string
  score: number
  confidence: number
  coverage: number
  verdict: Verdict
  verdictDetail: string
  breakdown: ScoreBreakdown[]
  sources: SourceResult[]
  wedges: Wedge[]
  timeline: { earliest: string | null; latest: string | null }
  searchedAt: string
  methodology: string
  capsule: EvidenceCapsule
  /** Demand-side heat (Reddit, Stack Overflow, Ask HN). Optional for backwards compatibility. */
  demand?: DemandResult
  /** Supply x Demand battlefield quadrant. */
  quadrant?: QuadrantResult
  /** Query variants actually searched (semantic expansion). */
  expansions?: string[]
  /** Near-duplicate evidence items collapsed across sources. */
  duplicatesCollapsed?: number
  /** Tamper-evident receipt for the capsule. */
  receipt?: ScanReceipt
}

export interface EvidenceCapsule {
  version: '1.0' | '1.1' | '1.2'
  /** Snapshot metadata is covered by the receipt digest/signature. */
  modelVersion?: string
  normalizedQuery?: string
  expansions?: string[]
  duplicatesCollapsed?: number
  sourceSummary?: Array<{ source: SourceId; status: SourceStatus; totalCount: number; notice?: string }>
  breakdown?: ScoreBreakdown[]
  demandSourceSummary?: Array<{ source: DemandSourceId; status: SourceStatus; totalCount: number; provenance?: 'primary' | 'mirror'; notice?: string }>
  demandBreakdown?: DemandBreakdown[]
  coverage?: number
  demandCoverage?: number
  demandEvidenceLinks?: Array<{ source: DemandSourceId; title: string; url: string }>
  demandScore?: number | null
  quadrant?: Quadrant | null
  query: string
  score: number
  confidence: number
  verdict: Verdict
  searchedAt: string
  evidenceLinks: Array<{ source: SourceId; title: string; url: string }>
  disclaimer: string
}

export interface AdapterContext {
  githubToken?: string
  openAlexApiKey?: string
  openAlexMailto?: string
  timeoutMs?: number
}

export type SourceAdapter = (
  query: string,
  ctx: AdapterContext,
) => Promise<SourceResult>

export type DemandSourceId = 'reddit' | 'stackoverflow' | 'askhn'

export interface DemandSourceResult {
  source: DemandSourceId
  label: string
  status: SourceStatus
  totalCount: number
  items: EvidenceItem[]
  errorMessage?: string
  /** Where the evidence came from. 'mirror' = public archive fallback after the primary was unavailable. */
  provenance?: 'primary' | 'mirror'
  /** Non-fatal, user-visible provenance notice (e.g. why a mirror was used). Never contains secrets. */
  notice?: string
}

export interface DemandBreakdown {
  source: DemandSourceId
  label: string
  subScore: number
  signal: string
  weight: number
  included: boolean
}

export interface DemandResult {
  score: number | null
  coverage: number
  trend: 'rising' | 'flat' | 'falling' | 'unknown'
  breakdown: DemandBreakdown[]
  sources: DemandSourceResult[]
}

export type Quadrant = 'Blue Ocean' | 'Gold Rush' | 'Ghost Town' | 'Bloodbath'

export interface QuadrantResult {
  quadrant: Quadrant | null
  supply: number
  demand: number | null
  headline: string
  action: string
}

export interface ScanReceipt {
  algorithm: 'sha256' | 'ed25519+sha256'
  digest: string
  signature: string | null
  publicKey: string | null
  issuedAt: string
  /** SHA-256 fingerprint of the signing SPKI; absent on legacy/hash-only receipts. */
  keyId?: string
}
