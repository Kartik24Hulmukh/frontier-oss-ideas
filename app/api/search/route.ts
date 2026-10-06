import { readObject, inputResponse, validIdea } from '@/lib/core/input'
import { clientKey, rateLimitResponse, scanLimiter } from '@/lib/core/ratelimit'
import { scanIdea } from '@/lib/scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
}

async function handle(request: Request, raw: string, fresh = false) {
  if (!validIdea(raw)) return Response.json({ error: 'Idea must be 3–120 characters without control characters.' }, { status: 400, headers: CORS })
  const q = raw.trim()
  if (!q) return Response.json({ error: 'Query is required.' }, { status: 400, headers: CORS })
  if (q.length < 3) return Response.json({ error: 'Describe the idea in at least 3 characters.' }, { status: 400, headers: CORS })
  const limit = scanLimiter.check(clientKey(request))
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec, CORS)
  const result = await scanIdea(q, { fresh })
  return Response.json(result, {
    headers: {
      ...CORS,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'X-RateLimit-Remaining': String(limit.remaining),
      'X-Simultaneity-Cache': result.cached ? 'HIT' : 'MISS',
    },
  })
}

export async function POST(request: Request) {
  let body: { query?: unknown; fresh?: unknown }
  try {
    body = await readObject(request)
  } catch (error) {
    return inputResponse(error, CORS)
  }
  return handle(request, typeof body.query === 'string' ? body.query : '', body.fresh === true)
}

/** GET /api/search?q=... — agent- and curl-friendly. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  return handle(request, q)
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}
