export type SourceId =
  | 'github'
  | 'hackernews'
  | 'arxiv'
  | 'openalex'
  | 'npm'
  | 'pypi'
  | 'huggingface'
  | 'reddit'

/** Supply = people building it. Demand = people wanting/discussing it. */
export type SourceCategory = 'supply' | 'demand'

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

export type Quadrant = 'Blue Ocean' | 'Gold Rush' | 'Ghost Town' | 'Bloodbath'

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
  /** Supply x Demand battlefield geometry (2D matrix) */
  supplyScore: number
  demandScore: number
  quadrant: Quadrant
  quadrantDetail: string
}

export interface EvidenceCapsule {
  version: '1.0'
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
