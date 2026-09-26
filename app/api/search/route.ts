import { displayQuery, normalizeQuery } from '@/lib/core/normalize'
import { computeCrowding } from '@/lib/scoring'
import { runAllSources } from '@/lib/sources'
import { cacheGet, cacheSet } from '@/lib/core/cache'
import { clientIp, rateLimit, rateLimitHeaders } from '@/lib/core/ratelimit'
import type { CrowdingResult } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** 10 scans / minute / IP — generous for humans, caps scrapers. */
const SEARCH_LIMIT = 10
const SEARCH_WINDOW_MS = 60_000

export async function POST(request: Request) {
  const rl = rateLimit('search:' + clientIp(request), SEARCH_LIMIT, SEARCH_WINDOW_MS)
  if (!rl.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Try again in ' + rl.resetInSeconds + ' seconds.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    )
  }

  let body: { query?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const raw = typeof body.query === 'string' ? body.query.trim() : ''
  if (!raw) {
    return Response.json({ error: 'Query is required.' }, { status: 400 })
  }
  if (raw.length > 200) {
    return Response.json({ error: 'Query is too long (max 200 characters).' }, { status: 400 })
  }

  const query = displayQuery(raw)
  const cacheKey = normalizeQuery(query)
  const cached = cacheGet<CrowdingResult>(cacheKey)
  if (cached) {
    return Response.json(cached, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
        'X-Cache': 'hit',
        ...rateLimitHeaders(rl),
      },
    })
  }

  const sources = await runAllSources(query, {
    githubToken: process.env.GITHUB_TOKEN,
    openAlexApiKey: process.env.OPENALEX_API_KEY,
    openAlexMailto: process.env.OPENALEX_MAILTO,
    timeoutMs: 8_000,
  })

  const result = computeCrowding(query, sources)
  cacheSet(cacheKey, result)

  return Response.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'X-Cache': 'miss',
      ...rateLimitHeaders(rl),
    },
  })
}
