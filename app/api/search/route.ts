import { displayQuery, normalizeQuery } from '@/lib/core/normalize'
import { computeCrowding } from '@/lib/scoring'
import { runAllSources } from '@/lib/sources'
import { cacheGet, cacheSet } from '@/lib/core/cache'
import type { CrowdingResult } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
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

  const query = displayQuery(raw)
  const cacheKey = normalizeQuery(query)
  const cached = cacheGet<CrowdingResult>(cacheKey)
  if (cached) {
    return Response.json(cached, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
        'X-Cache': 'hit',
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
    },
  })
}
