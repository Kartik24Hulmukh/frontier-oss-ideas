import { computeCrowding } from '@/lib/scoring'
import {
  searchArxiv,
  searchGitHub,
  searchHackerNews,
  searchNpm,
} from '@/lib/sources'
import type { SourceResult } from '@/lib/types'

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
  const query = raw.slice(0, 120)

  const settled = await Promise.allSettled([
    searchGitHub(query),
    searchHackerNews(query),
    searchArxiv(query),
    searchNpm(query),
  ])

  const fallbacks: SourceResult[] = [
    { source: 'github', label: 'GitHub Repositories', status: 'error', totalCount: 0, items: [], errorMessage: 'Request failed.' },
    { source: 'hackernews', label: 'Hacker News', status: 'error', totalCount: 0, items: [], errorMessage: 'Request failed.' },
    { source: 'arxiv', label: 'arXiv Papers', status: 'error', totalCount: 0, items: [], errorMessage: 'Request failed.' },
    { source: 'npm', label: 'npm Packages', status: 'error', totalCount: 0, items: [], errorMessage: 'Request failed.' },
  ]

  const sources = settled.map((result, i) =>
    result.status === 'fulfilled' ? result.value : fallbacks[i],
  )

  return Response.json(computeCrowding(query, sources))
}
