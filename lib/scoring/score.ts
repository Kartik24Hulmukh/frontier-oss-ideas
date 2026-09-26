import type {
  CrowdingResult,
  ScoreBreakdown,
  SourceId,
  SourceResult,
  Verdict,
} from '@/lib/types'
import { displayQuery, normalizeQuery } from '@/lib/core/normalize'
import { computeWedges } from './wedge'
import { buildCapsule } from './capsule'

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

const WEIGHTS: Record<SourceId, number> = {
  github: 0.25,
  hackernews: 0.16,
  arxiv: 0.09,
  openalex: 0.09,
  npm: 0.09,
  pypi: 0.09,
  huggingface: 0.13,
  reddit: 0.1,
}

/**
 * Supply = evidence someone is building it (code, packages, models, papers).
 * Demand = evidence someone wants it (discussion, requests, launches people react to).
 * HN Show-HN launches count toward demand (public reaction), everything else on HN
 * toward supply (a shipped thing exists). Reddit is a pure demand-side channel.
 */
const SOURCE_CATEGORY: Record<SourceId, 'supply' | 'demand'> = {
  github: 'supply',
  hackernews: 'supply',
  arxiv: 'supply',
  openalex: 'supply',
  npm: 'supply',
  pypi: 'supply',
  huggingface: 'supply',
  reddit: 'demand',
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
  const competitors = result.items.filter((i) => parseStars(i.meta) >= 50)
  const recent = result.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 18
  })
  const score = clamp(
    competitors.length * 12 +
      Math.min(result.totalCount, 200) / 10 +
      recent.length * 4,
  )
  const signal =
    competitors.length > 0
      ? `${competitors.length} repo(s) with 50+ stars in top results; ${result.totalCount.toLocaleString()} total matches; ${recent.length} created in last 18 months.`
      : `${result.totalCount.toLocaleString()} matching repos; top results lack meaningful traction yet.`
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
  const launches = result.items.filter((i) => i.isLaunchSignal)
  const highSignal = result.items.filter((i) => parsePoints(i.meta) >= 50)
  const score = clamp(
    launches.length * 18 +
      highSignal.length * 8 +
      Math.min(result.totalCount, 100) / 5,
  )
  const signal =
    launches.length > 0
      ? `${launches.length} Show HN launch signal(s); ${highSignal.length} stories with 50+ points.`
      : `${result.totalCount.toLocaleString()} related stories; ${highSignal.length} high-engagement; no direct launches in top results.`
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
  const recent = result.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 24
  })
  const score = clamp(Math.min(result.totalCount, 50) * 1.2 + recent.length * 5)
  const signal =
    result.totalCount > 0
      ? `${result.totalCount.toLocaleString()} works; ${recent.length} in last 2 years — ${recent.length >= 3 ? 'active academic heat' : 'modest academic interest'}.`
      : 'No academic matches for this phrasing.'
  return {
    source,
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scorePackage(result: SourceResult, source: 'npm' | 'pypi'): ScoreBreakdown {
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
  const recentlyMaintained = result.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 12
  })
  const score = clamp(
    Math.min(result.totalCount, 100) / 2.5 + recentlyMaintained.length * 5 + result.items.length * 3,
  )
  const signal =
    result.items.length > 0
      ? `${result.totalCount.toLocaleString()} package signals; ${recentlyMaintained.length} recently maintained among top hits.`
      : 'No matching packages found.'
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
  const hot = result.items.filter((i) => parseDownloads(i.meta) >= 1000)
  const score = clamp(result.items.length * 6 + hot.length * 8 + Math.min(result.totalCount, 40))
  const signal =
    result.items.length > 0
      ? `${result.items.length} models/datasets; ${hot.length} with meaningful download traction — AI supply-side heat.`
      : 'No Hugging Face models/datasets matched.'
  return {
    source: 'huggingface',
    label: result.label,
    subScore: Math.round(score),
    signal,
    weight,
    included: true,
  }
}

function scoreReddit(result: SourceResult): ScoreBreakdown {
  const weight = WEIGHTS.reddit
  if (result.status !== 'ok') {
    return {
      source: 'reddit',
      label: result.label,
      subScore: 0,
      signal: 'Source unavailable — excluded from score.',
      weight,
      included: false,
    }
  }
  const wants = result.items.filter((i) => i.isLaunchSignal)
  const score = clamp(wants.length * 16 + Math.min(result.totalCount, 60) * 1.1)
  const signal =
    result.items.length > 0
      ? wants.length + ' explicit want/ask post(s); ' + result.totalCount.toLocaleString() + ' related discussions — demand-side heat.'
      : 'No Reddit discussion found for this phrasing yet.'
  return {
    source: 'reddit',
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
    case 'huggingface':
      return scoreHuggingFace(result)
    case 'reddit':
      return scoreReddit(result)
  }
}

function verdictFor(score: number): { verdict: Verdict; verdictDetail: string } {
  if (score <= 25)
    return {
      verdict: 'Open lane',
      verdictDetail:
        'Little evidence anyone is building this. Either genuinely early — or the idea has a feasibility problem nobody has cracked. Validate demand next.',
    }
  if (score <= 50)
    return {
      verdict: 'Early movers',
      verdictDetail:
        'A handful of teams are circling. There is still room, but the clock started — differentiation and wedge matter from day one.',
    }
  if (score <= 75)
    return {
      verdict: 'Crowded',
      verdictDetail:
        'Multiple shipping teams occupy this lane. Compete only with a non-copyable asset: data, distribution, workflow depth, or position.',
    }
  return {
    verdict: 'Saturated',
    verdictDetail:
      'This idea has been independently invented many times. Consider being the neutral layer above the lane rather than another entrant.',
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
  const confidence = Math.round(clamp(coverage * 0.65 + agreement * 0.35, 0, 1) * 100)

  const allDates = sources
    .flatMap((s) => s.items.map((i) => i.date))
    .filter((d): d is string => Boolean(d))
    .sort()

  const { verdict, verdictDetail } = verdictFor(score)
  const wedges = computeWedges(query, score, verdict, sources, breakdown)

  // 2D Supply x Demand battlefield geometry — the single most decision-changing
  // output: a score alone cannot separate "nobody wants this" from "open lane".
  const supplyBreakdown = available.filter((b) => SOURCE_CATEGORY[b.source] === 'supply')
  const demandBreakdown = available.filter((b) => SOURCE_CATEGORY[b.source] === 'demand')
  const weightedAvg = (rows: ScoreBreakdown[]): number => {
    const w = rows.reduce((sum, b) => sum + b.weight, 0)
    if (w === 0) return 0
    return rows.reduce((sum, b) => sum + b.subScore * b.weight, 0) / w
  }
  const supplyScore = Math.round(clamp(weightedAvg(supplyBreakdown)))
  const demandScore = Math.round(clamp(weightedAvg(demandBreakdown)))
  const SUPPLY_SPLIT = 40
  const DEMAND_SPLIT = 35
  let quadrant: import('@/lib/types').Quadrant
  let quadrantDetail: string
  if (supplyScore < SUPPLY_SPLIT && demandScore >= DEMAND_SPLIT) {
    quadrant = 'Blue Ocean'
    quadrantDetail =
      'Low supply, real demand signal. Few teams are shipping this and people are asking for it in public — the highest-leverage lane to enter now.'
  } else if (supplyScore >= SUPPLY_SPLIT && demandScore >= DEMAND_SPLIT) {
    quadrant = 'Gold Rush'
    quadrantDetail =
      'High supply, high demand. The market is real but so is the fight — win on distribution, data, or a non-copyable wedge, not on being first.'
  } else if (supplyScore < SUPPLY_SPLIT && demandScore < DEMAND_SPLIT) {
    quadrant = 'Ghost Town'
    quadrantDetail =
      'Low supply, low demand. Could be genuinely early — or nobody actually wants it. Go validate demand with real conversations before writing code.'
  } else {
    quadrant = 'Bloodbath'
    quadrantDetail =
      'High supply, weak or falling demand. Many teams chasing a shrinking or already-served audience — avoid a head-on entry.'
  }
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
    timeline: {
      earliest: allDates[0] ?? null,
      latest: allDates[allDates.length - 1] ?? null,
    },
    searchedAt,
    methodology:
      'Heuristic crowding score from live public sources (GitHub, HN, arXiv, OpenAlex, npm, PyPI, Hugging Face, Reddit). Not investment advice; not a legal novelty opinion.',
    supplyScore,
    demandScore,
    quadrant,
    quadrantDetail,
  }

  return {
    ...resultBase,
    capsule: buildCapsule(resultBase),
  }
}
