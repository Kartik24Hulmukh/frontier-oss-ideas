import type {
  CrowdingResult,
  ScoreBreakdown,
  SourceResult,
} from './types'

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

function monthsAgo(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44)
}

function parseStars(meta: string | null): number {
  if (!meta) return 0
  const match = meta.match(/^([\d,]+) stars/)
  return match ? Number.parseInt(match[1].replace(/,/g, ''), 10) : 0
}

function scoreGitHub(result: SourceResult): ScoreBreakdown {
  if (result.status !== 'ok') {
    return { source: 'github', label: result.label, subScore: 0, signal: 'Source unavailable — excluded from score.' }
  }
  const competitors = result.items.filter((i) => parseStars(i.meta) >= 50)
  const recent = result.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 18
  })
  // Competitor repos dominate; volume and recency add pressure
  const score = clamp(
    competitors.length * 12 +
      Math.min(result.totalCount, 200) / 10 +
      recent.length * 4,
  )
  const signal =
    competitors.length > 0
      ? `${competitors.length} repo${competitors.length === 1 ? '' : 's'} with 50+ stars among top results; ${result.totalCount.toLocaleString()} total matches; ${recent.length} created in the last 18 months.`
      : `${result.totalCount.toLocaleString()} matching repos, none of the top results have meaningful traction yet.`
  return { source: 'github', label: result.label, subScore: Math.round(score), signal }
}

function scoreHackerNews(result: SourceResult): ScoreBreakdown {
  if (result.status !== 'ok') {
    return { source: 'hackernews', label: result.label, subScore: 0, signal: 'Source unavailable — excluded from score.' }
  }
  const launches = result.items.filter((i) => i.isLaunchSignal)
  const highSignal = result.items.filter((i) => {
    const points = Number.parseInt(i.meta?.match(/^([\d,]+) points/)?.[1]?.replace(/,/g, '') ?? '0', 10)
    return points >= 50
  })
  const score = clamp(
    launches.length * 18 + highSignal.length * 8 + Math.min(result.totalCount, 100) / 5,
  )
  const signal =
    launches.length > 0
      ? `${launches.length} Show HN launch${launches.length === 1 ? '' : 'es'} detected — teams are already shipping in this lane. ${highSignal.length} ${highSignal.length === 1 ? 'story' : 'stories'} with 50+ points.`
      : `${result.totalCount.toLocaleString()} related stories, ${highSignal.length} with strong engagement, no direct launches spotted in top results.`
  return { source: 'hackernews', label: result.label, subScore: Math.round(score), signal }
}

function scoreArxiv(result: SourceResult): ScoreBreakdown {
  if (result.status !== 'ok') {
    return { source: 'arxiv', label: result.label, subScore: 0, signal: 'Source unavailable — excluded from score.' }
  }
  const recent = result.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 24
  })
  const score = clamp(Math.min(result.totalCount, 50) * 1.2 + recent.length * 5)
  const signal =
    result.totalCount > 0
      ? `${result.totalCount.toLocaleString()} papers match the exact phrase; ${recent.length} published in the last 2 years — ${recent.length >= 3 ? 'active academic heat' : 'modest academic interest'}.`
      : 'No papers match the exact phrase — academically unexplored.'
  return { source: 'arxiv', label: result.label, subScore: Math.round(score), signal }
}

function scoreNpm(result: SourceResult): ScoreBreakdown {
  if (result.status !== 'ok') {
    return { source: 'npm', label: result.label, subScore: 0, signal: 'Source unavailable — excluded from score.' }
  }
  const recentlyMaintained = result.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 12
  })
  const score = clamp(Math.min(result.totalCount, 100) / 2.5 + recentlyMaintained.length * 5)
  const signal =
    result.totalCount > 0
      ? `${result.totalCount.toLocaleString()} matching packages; ${recentlyMaintained.length} of the top results published within the last year.`
      : 'No matching packages published.'
  return { source: 'npm', label: result.label, subScore: Math.round(score), signal }
}

// Weights: GitHub is the strongest "someone is building this" signal
const WEIGHTS: Record<string, number> = {
  github: 0.4,
  hackernews: 0.3,
  arxiv: 0.15,
  npm: 0.15,
}

function verdictFor(score: number): {
  verdict: CrowdingResult['verdict']
  verdictDetail: string
} {
  if (score <= 25)
    return {
      verdict: 'Open lane',
      verdictDetail:
        'Little evidence anyone is building this. Either genuinely early, or the idea has a feasibility problem nobody has cracked.',
    }
  if (score <= 50)
    return {
      verdict: 'Early movers',
      verdictDetail:
        'A handful of teams are circling. There is still room, but the clock started — differentiation matters from day one.',
    }
  if (score <= 75)
    return {
      verdict: 'Crowded',
      verdictDetail:
        'Multiple funded or shipping teams occupy this lane. Compete only with a non-copyable asset: data, distribution, or position.',
    }
  return {
    verdict: 'Saturated',
    verdictDetail:
      'This idea has been independently invented many times. Consider being the neutral layer above the lane rather than another entrant.',
  }
}

export function computeCrowding(
  query: string,
  sources: SourceResult[],
): CrowdingResult {
  const breakdown = sources.map((s) => {
    switch (s.source) {
      case 'github':
        return scoreGitHub(s)
      case 'hackernews':
        return scoreHackerNews(s)
      case 'arxiv':
        return scoreArxiv(s)
      case 'npm':
        return scoreNpm(s)
    }
  })

  // Weighted average over available sources only
  const available = breakdown.filter(
    (b) => sources.find((s) => s.source === b.source)?.status === 'ok',
  )
  const totalWeight = available.reduce((sum, b) => sum + WEIGHTS[b.source], 0)
  const score =
    totalWeight > 0
      ? Math.round(
          available.reduce((sum, b) => sum + b.subScore * WEIGHTS[b.source], 0) /
            totalWeight,
        )
      : 0

  const allDates = sources
    .flatMap((s) => s.items.map((i) => i.date))
    .filter((d): d is string => Boolean(d))
    .sort()

  const { verdict, verdictDetail } = verdictFor(score)

  return {
    query,
    score,
    verdict,
    verdictDetail,
    breakdown,
    sources,
    timeline: {
      earliest: allDates[0] ?? null,
      latest: allDates[allDates.length - 1] ?? null,
    },
    searchedAt: new Date().toISOString(),
  }
}
