import type {
  CrowdingResult,
  EvidenceItem,
  ScoreBreakdown,
  SourceId,
  SourceResult,
  Verdict,
} from '@/lib/types'
import { displayQuery, normalizeQuery } from '@/lib/core/normalize'
import { computeWedges } from './wedge'
import { expandSubLanes } from './wedge-expansion'
import { buildCapsule } from './capsule'

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

const WEIGHTS: Record<SourceId, number> = {
  github: 0.28,
  hackernews: 0.18,
  arxiv: 0.1,
  openalex: 0.1,
  npm: 0.08,
  pypi: 0.08,
  huggingface: 0.14,
  crates: 0.04,
}

function monthsAgo(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44)
}

function parseStars(meta: string | null): number {
  if (!meta) return 0
  const match = meta.match(/([\d,]+)\s*stars/i)
  return match ? Number.parseInt(match[1].replace(/,/g, ''), 10) : 0
}

function parsePoints(meta: string | null): number {
  if (!meta) return 0
  const match = meta.match(/([\d,]+)\s*points/i)
  return match ? Number.parseInt(match[1].replace(/,/g, ''), 10) : 0
}

function parseDownloads(meta: string | null): number {
  if (!meta) return 0
  const match = meta.match(/([\d,]+)\s*downloads/i)
  return match ? Number.parseInt(match[1].replace(/,/g, ''), 10) : 0
}

/**
 * crowding-1.2: the relevance filter keeps up to two below-threshold items as an
 * audit floor so sparse lanes stay inspectable. Those items must never count as
 * scoring evidence, and raw query-match totals are attenuated by the share of
 * sampled items that actually qualified. Raw counts stay visible in signals.
 */
function qualifiedItems(result: SourceResult): EvidenceItem[] {
  const filter = result.relevanceFilter
  if (!filter) return result.items
  return result.items.filter((item) => (item.relevance ?? 1) >= filter.threshold)
}

/**
 * crowding-1.3: linear attenuation (raw × qualified/before) still lets a huge raw
 * total dominate when a handful of sampled items qualify (e.g. 2M npm hits with
 * 2/20 qualified → 200k "effective" hits). The effective total is therefore the
 * smaller of the linear estimate and a qualified-evidence logarithmic bound:
 *   bound = qualified × (1 + log10(1 + raw / sampled))
 * Each qualified, inspectable item can vouch for at most a logarithmic share of
 * the unseen tail. With a filter present and no inspectable sample (sampled = 0,
 * e.g. everything removed by de-duplication) nothing is scored: an unseen raw
 * total is not evidence. Fully qualified samples keep the raw total. Uncalibrated; see docs/METHODOLOGY_CROWDING_1_3.md.
 */
export function qualifiedTotal(result: SourceResult): number {
  const filter = result.relevanceFilter
  if (!filter) return result.totalCount
  if (filter.before <= 0 || filter.qualified <= 0) return 0
  // Fully qualified samples are unchanged: the bound only applies once the
  // filter has rejected sampled evidence as off-topic.
  if (filter.qualified >= filter.before) return result.totalCount
  const raw = Math.max(0, result.totalCount)
  const linear = raw * (filter.qualified / filter.before)
  const bound = filter.qualified * (1 + Math.log10(1 + raw / filter.before))
  return Math.min(linear, bound)
}

function relevanceNote(result: SourceResult): string {
  const filter = result.relevanceFilter
  if (!filter || filter.qualified >= filter.before) return ''
  return ` Scored on ${filter.qualified}/${filter.before} sampled items above relevance threshold ${filter.threshold}; the ${result.totalCount.toLocaleString()} raw match count is shown for audit only.`
}

function scoreGitHub(result: SourceResult): ScoreBreakdown {
  const weight = WEIGHTS.github
  if (result.status !== 'ok') {
    return {
      source: 'github',
      label: result.label,
      subScore: 0,
      signal: 'Source unavailable — excluded from score.',
      weight,
      included: false,
    }
  }
  const items = qualifiedItems(result)
  const competitors = items.filter((i) => parseStars(i.meta) >= 50)
  const recent = items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 18
  })
  const score = clamp(
    competitors.length * 12 +
      Math.min(qualifiedTotal(result), 200) / 10 +
      recent.length * 4,
  )
  const signal =
    (competitors.length > 0
      ? `${competitors.length} repo(s) with 50+ stars in top results; ${result.totalCount.toLocaleString()} total matches; ${recent.length} created in last 18 months.`
      : `${result.totalCount.toLocaleString()} matching repos; top results lack meaningful traction yet.`) +
    relevanceNote(result)
  return {
    source: 'github',
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scoreHackerNews(result: SourceResult): ScoreBreakdown {
  const weight = WEIGHTS.hackernews
  if (result.status !== 'ok') {
    return {
      source: 'hackernews',
      label: result.label,
      subScore: 0,
      signal: 'Source unavailable — excluded from score.',
      weight,
      included: false,
    }
  }
  const items = qualifiedItems(result)
  const launches = items.filter((i) => i.isLaunchSignal)
  const highSignal = items.filter((i) => parsePoints(i.meta) >= 50)
  const score = clamp(
    launches.length * 18 +
      highSignal.length * 8 +
      Math.min(qualifiedTotal(result), 100) / 5,
  )
  const signal =
    (launches.length > 0
      ? `${launches.length} Show HN launch signal(s); ${highSignal.length} stories with 50+ points.`
      : `${result.totalCount.toLocaleString()} related stories; ${highSignal.length} high-engagement; no direct launches in top results.`) +
    relevanceNote(result)
  return {
    source: 'hackernews',
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scoreAcademic(result: SourceResult, source: 'arxiv' | 'openalex'): ScoreBreakdown {
  const weight = WEIGHTS[source]
  if (result.status !== 'ok') {
    return {
      source,
      label: result.label,
      subScore: 0,
      signal: 'Source unavailable — excluded from score.',
      weight,
      included: false,
    }
  }
  const items = qualifiedItems(result)
  const recent = items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 24
  })
  const score = clamp(Math.min(qualifiedTotal(result), 50) * 1.2 + recent.length * 5)
  const signal =
    (result.totalCount > 0
      ? `${result.totalCount.toLocaleString()} works; ${recent.length} in last 2 years — ${recent.length >= 3 ? 'active academic heat' : 'modest academic interest'}.`
      : 'No academic matches for this phrasing.') + relevanceNote(result)
  return {
    source,
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scorePackage(result: SourceResult, source: 'npm' | 'pypi' | 'crates'): ScoreBreakdown {
  const weight = WEIGHTS[source]
  if (result.status !== 'ok') {
    return {
      source,
      label: result.label,
      subScore: 0,
      signal: 'Source unavailable — excluded from score.',
      weight,
      included: false,
    }
  }
  const items = qualifiedItems(result)
  const recentlyMaintained = items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 12
  })
  const score = clamp(
    Math.min(qualifiedTotal(result), 100) / 2.5 + recentlyMaintained.length * 5 + items.length * 3,
  )
  const signal =
    (items.length > 0
      ? `${result.totalCount.toLocaleString()} package signals; ${recentlyMaintained.length} recently maintained among top hits.`
      : 'No matching packages found.') + relevanceNote(result)
  return {
    source,
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scoreHuggingFace(result: SourceResult): ScoreBreakdown {
  const weight = WEIGHTS.huggingface
  if (result.status !== 'ok') {
    return {
      source: 'huggingface',
      label: result.label,
      subScore: 0,
      signal: 'Source unavailable — excluded from score.',
      weight,
      included: false,
    }
  }
  const items = qualifiedItems(result)
  const hot = items.filter((i) => parseDownloads(i.meta) >= 1000)
  const score = clamp(items.length * 6 + hot.length * 8 + Math.min(qualifiedTotal(result), 40))
  const signal =
    (items.length > 0
      ? `${items.length} models/datasets; ${hot.length} with meaningful download traction — AI supply-side heat.`
      : 'No Hugging Face models/datasets matched.') + relevanceNote(result)
  return {
    source: 'huggingface',
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scoreOne(result: SourceResult): ScoreBreakdown {
  switch (result.source) {
    case 'github':
      return scoreGitHub(result)
    case 'hackernews':
      return scoreHackerNews(result)
    case 'arxiv':
      return scoreAcademic(result, 'arxiv')
    case 'openalex':
      return scoreAcademic(result, 'openalex')
    case 'npm':
      return scorePackage(result, 'npm')
    case 'pypi':
      return scorePackage(result, 'pypi')
    case 'crates':
      return scorePackage(result, 'crates')
    case 'huggingface':
      return scoreHuggingFace(result)
  }
}

function verdictFor(score: number): { verdict: Verdict; verdictDetail: string } {
  if (score <= 25)
    return {
      verdict: 'Open lane',
      verdictDetail:
        'Few matching artifacts were observed in the searched sources. Low visibility is not proof of an open market. Check coverage and interview potential users.',
    }
  if (score <= 50)
    return {
      verdict: 'Early movers',
      verdictDetail:
        'Some matching public artifacts were observed. Matches are not a count of unique teams; check relevance and differentiation before building.',
    }
  if (score <= 75)
    return {
      verdict: 'Crowded',
      verdictDetail:
        'Many matching public artifacts were observed. Verify which are direct competitors before choosing a differentiated audience, workflow, or distribution channel.',
    }
  return {
    verdict: 'Saturated',
    verdictDetail:
      'Strong crowding signals were observed across public artifacts. This does not establish independent invention or unique competitor counts. Verify relevance before considering an infrastructure or interoperability wedge.',
  }
}

export function computeCrowding(query: string, sources: SourceResult[]): CrowdingResult {
  const breakdown = sources.map(scoreOne)
  const available = breakdown.filter((b) => b.included)
  const totalWeight = available.reduce((sum, b) => sum + b.weight, 0)
  // Weighted mean across healthy sources. Empty channels correctly pull the
  // average down, but a single high-signal channel (e.g. starred GitHub repos)
  // must still surface — blend with peak channel so traction is not diluted away.
  const weightedMean =
    totalWeight > 0
      ? available.reduce((sum, b) => sum + b.subScore * b.weight, 0) / totalWeight
      : 0
  const peak = available.reduce((m, b) => Math.max(m, b.subScore), 0)
  const score = Math.round(clamp(0.65 * weightedMean + 0.35 * peak))

  const coverage = sources.length > 0 ? available.length / sources.length : 0
  // Confidence: coverage × agreement proxy (lower variance → higher confidence)
  const subs = available.map((b) => b.subScore)
  const mean = subs.length ? subs.reduce((a, b) => a + b, 0) / subs.length : 0
  const variance =
    subs.length > 1
      ? subs.reduce((s, v) => s + (v - mean) ** 2, 0) / subs.length
      : 0
  const agreement = clamp(100 - Math.sqrt(variance), 20, 100) / 100
  const confidence = available.length === 0 ? 0 : Math.round(clamp(coverage * 0.65 + agreement * 0.35, 0, 1) * 100)

  const allDates = sources
    .flatMap((s) => s.items.map((i) => i.date))
    .filter((d): d is string => Boolean(d))
    .sort()

  const { verdict, verdictDetail } = verdictFor(score)
  const wedges = computeWedges(query, score, verdict, sources, breakdown)
  const subLanes = expandSubLanes(displayQuery(query), score, verdict, sources)
  const searchedAt = new Date().toISOString()
  const display = displayQuery(query)
  const normalizedQuery = normalizeQuery(query)

  const resultBase = {
    query: display,
    normalizedQuery,
    score,
    confidence,
    coverage: Math.round(coverage * 100),
    verdict,
    verdictDetail,
    breakdown,
    sources,
    wedges,
    subLanes,
    timeline: {
      earliest: allDates[0] ?? null,
      latest: allDates[allDates.length - 1] ?? null,
    },
    searchedAt,
    methodology:
      'Heuristic crowding score from live public sources (GitHub, HN, arXiv, OpenAlex, npm, PyPI, crates.io, Hugging Face; model crowding-1.3). Not investment advice; not a legal novelty opinion.',
  }

  return {
    ...resultBase,
    capsule: buildCapsule(resultBase),
  }
}
