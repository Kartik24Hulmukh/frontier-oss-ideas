import { renderBadge } from '@/lib/badge'
import { scanIdea } from '@/lib/scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** README badge: ![simultaneity](https://<site>/api/badge?q=your+idea). CDN-cached 6h. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 120)
  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  }
  if (q.length < 2) {
    return new Response(renderBadge(null, null), { status: 400, headers: { ...headers, 'Cache-Control': 'no-store' } })
  }
  try {
    const r = await scanIdea(q, { demand: false })
    return new Response(renderBadge(r.coverage < 50 ? null : r.score, r.coverage < 50 ? null : r.verdict), {
      headers: { ...headers, 'Cache-Control': 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400' },
    })
  } catch {
    return new Response(renderBadge(null, null), { headers: { ...headers, 'Cache-Control': 'public, s-maxage=300' } })
  }
}
