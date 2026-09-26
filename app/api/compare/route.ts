import { readObject, inputResponse, validIdea } from '@/lib/core/input'
import { displayQuery } from '@/lib/core/normalize'
import { scanIdea } from '@/lib/scan'
import { clientKey, scanLimiter, rateLimitResponse } from '@/lib/core/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function POST(request: Request) {
  let body: { queries?: unknown }
  try {
    body = await readObject(request)
  } catch (error) {
    return inputResponse(error)
  }

  if (!Array.isArray(body.queries) || body.queries.length > 3 || body.queries.some((q) => !validIdea(q))) {
    return Response.json({ error: 'Provide queries as an array of 2–3 ideas.' }, { status: 400 })
  }

  const queries = body.queries
    .filter((query): query is string => typeof query === 'string')
    .map(displayQuery)
    .filter(Boolean)
    .slice(0, 3)

  if (queries.length < 2) {
    return Response.json({ error: 'Provide at least two valid ideas.' }, { status: 400 })
  }

  const limit = scanLimiter.check(clientKey(request), Date.now(), queries.length)
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec)
  const results = await Promise.all(queries.map((query) => scanIdea(query)))
  const ranked = [...results].sort((a, b) => a.score - b.score)

  return Response.json(
    {
      comparedAt: new Date().toISOString(),
      results,
      openest: ranked[0],
      densest: ranked.at(-1),
      recommendation:
        ranked[0].score + 15 < ranked.at(-1)!.score
          ? `“${ranked[0].query}” is materially less crowded; verify demand before committing.`
          : 'Crowding is similar. Choose using founder-market fit and wedge quality, not score alone.',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    },
  )
}
