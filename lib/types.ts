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
