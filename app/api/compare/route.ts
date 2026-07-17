import { displayQuery } from '@/lib/core/normalize'
import { computeCrowding } from '@/lib/scoring'
import { runAllSources } from '@/lib/sources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function POST(request: Request) {
  let body: { queries?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!Array.isArray(body.queries)) {
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

  const context = {
    githubToken: process.env.GITHUB_TOKEN,
    openAlexApiKey: process.env.OPENALEX_API_KEY,
    openAlexMailto: process.env.OPENALEX_MAILTO,
    timeoutMs: 8_000,
  }

  const results = await Promise.all(
    queries.map(async (query) => computeCrowding(query, await runAllSources(query, context))),
  )
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
