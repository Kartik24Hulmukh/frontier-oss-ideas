import { clientKey, rateLimitResponse, scanLimiter } from '@/lib/core/ratelimit'
import { handleRpc, TOOLS } from '@/lib/mcp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, X-Api-Key',
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: HEADERS })
  }
  const batch = Array.isArray(body) ? body : [body]
  if (batch.some((m) => (m as { method?: string })?.method === 'tools/call')) {
    const limit = scanLimiter.check(clientKey(request))
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec)
  }
  const responses = (await Promise.all(batch.map((m) => handleRpc(m as never)))).filter(Boolean)
  if (responses.length === 0) return new Response(null, { status: 202, headers: HEADERS })
  return Response.json(Array.isArray(body) ? responses : responses[0], { headers: HEADERS })
}

/** Human/agent discovery. Streamable HTTP servers may refuse SSE on GET. */
export function GET() {
  return Response.json(
    {
      name: 'simultaneity-index',
      transport: 'streamable-http (stateless JSON)',
      endpoint: '/api/mcp',
      tools: TOOLS.map((t) => t.name),
      install: 'Add { "simultaneity": { "url": "https://<your-deployment>/api/mcp" } } to your MCP client config.',
    },
    { headers: HEADERS },
  )
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}
