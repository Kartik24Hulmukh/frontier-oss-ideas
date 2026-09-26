import { findCollisions, mapLimit, rankCohort, toCsv } from '@/lib/cohort'
import { clientKey, RateLimiter, rateLimitResponse } from '@/lib/core/ratelimit'
import { scanIdea } from '@/lib/scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_IDEAS = Number(process.env.COHORT_MAX_IDEAS ?? 25)
const cohortLimiter = new RateLimiter(3, 60 * 60 * 1000)

/**
 * Cohort screening for accelerators and funds.
 * POST { ideas: string[], format?: 'json' | 'csv' }
 * Keys listed in COHORT_API_KEYS (comma-separated) bypass the public limit.
 */
export async function POST(request: Request) {
  let body: { ideas?: unknown; format?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const ideas = Array.isArray(body.ideas)
    ? [...new Set(body.ideas.filter((i): i is string => typeof i === 'string').map((i) => i.trim()).filter((i) => i.length >= 3))]
    : []
  if (ideas.length === 0) return Response.json({ error: 'Provide ideas: string[] (1-' + MAX_IDEAS + ').' }, { status: 400 })
  if (ideas.length > MAX_IDEAS) return Response.json({ error: `Max ${MAX_IDEAS} ideas per batch on this plan.` }, { status: 413 })

  const key = request.headers.get('x-api-key')
  const allowed = (process.env.COHORT_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean)
  if (!(key && allowed.includes(key))) {
    const limit = cohortLimiter.check(clientKey(request))
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec)
  }

  const results = await mapLimit(ideas, 3, async (idea) => ({ idea, result: await scanIdea(idea, { demand: true }) }))
  const rows = rankCohort(results)
  const collisions = findCollisions(ideas)
  if (body.format === 'csv') {
    return new Response(toCsv(rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cohort-screening.csv"' },
    })
  }
  return Response.json({ generatedAt: new Date().toISOString(), count: rows.length, rows, collisions })
}
