export type SourceId = 'github' | 'hackernews' | 'arxiv' | 'npm'

export interface EvidenceItem {
  title: string
  description: string | null
  url: string
  date: string | null // ISO date the artifact was created/published
  meta: string | null // e.g. "12,340 stars" or "412 points · 208 comments"
  isLaunchSignal?: boolean // e.g. Show HN post
}

export interface SourceResult {
  source: SourceId
  label: string
  status: 'ok' | 'error' | 'rate_limited'
  totalCount: number // total matches reported by the API
  items: EvidenceItem[]
  errorMessage?: string
}

export interface ScoreBreakdown {
  source: SourceId
  label: string
  subScore: number // 0-100
  signal: string // human-readable explanation
}

export interface CrowdingResult {
  query: string
  score: number // 0-100
  verdict: 'Open lane' | 'Early movers' | 'Crowded' | 'Saturated'
  verdictDetail: string
  breakdown: ScoreBreakdown[]
  sources: SourceResult[]
  timeline: { earliest: string | null; latest: string | null }
  searchedAt: string
}
