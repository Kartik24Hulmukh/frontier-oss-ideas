import { NextResponse, type NextRequest } from 'next/server'
import { admitScan } from '@/lib/core/admission'
import { clientKey } from '@/lib/core/ratelimit'
/** Covers ALL scan entry points, including share previews, badges and server-rendered Pulse. */
export async function proxy(request: NextRequest) {
  if (request.method === 'OPTIONS') return NextResponse.next()
  const path = request.nextUrl.pathname
  if (path === '/api/mcp' && request.method === 'GET') return NextResponse.next()
  const cost = path === '/api/cohort' ? 25 : path === '/api/compare' ? 3 : path === '/pulse' ? 20 : 1
  const status = await admitScan(clientKey(request), cost)
  if (status !== 'ok') return NextResponse.json({ error: status === 'limited' ? 'Scan capacity reached. Retry later.' : 'Scan admission unavailable. Retry later.' }, { status: status === 'limited' ? 429 : 503, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } })
  return NextResponse.next()
}
export const config = { matcher: ['/api/search', '/api/compare', '/api/cohort', '/api/mcp', '/api/badge', '/s/:path*', '/pulse'] }
