import { readObject } from '@/lib/core/input'
import { clientKey, rateLimitResponse, scanLimiter } from '@/lib/core/ratelimit'
import { handleRpc, TOOLS } from '@/lib/mcp'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, X-Api-Key',
}

function transportError(request: Request): Response | null {
  const origin = request.headers.get('origin')
  const allowed = [new URL(request.url).origin, SITE_URL, ...(process.env.MCP_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)]
  if (origin && !allowed.includes(origin)) return Response.json({ error: 'Origin not allowed.' }, { status: 403 })
  const version = request.headers.get('mcp-protocol-version')
  if (version && !['2025-06-18', '2025-03-26'].includes(version)) return Response.json({ error: 'Unsupported MCP protocol version.' }, { status: 400 })
  return null
}

export async function POST(request: Request) {
  const denied = transportError(request)
  if (denied) return denied
  let body: unknown
  try {
    body = await readObject(request)
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: HEADERS })
  }
  // MCP 2025-06-18 does not support JSON-RPC batches. readObject rejects arrays.
  const batch = [body]
  if (batch.some((m) => (m as { method?: string })?.method === 'tools/call')) {
    const limit = scanLimiter.check(clientKey(request))
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec, HEADERS)
  }
  const responses = (await Promise.all(batch.map((m) => handleRpc(m as never)))).filter(Boolean)
  if (responses.length === 0) return new Response(null, { status: 202, headers: HEADERS })
  return Response.json(Array.isArray(body) ? responses : responses[0], { headers: HEADERS })
}

/** Human/agent discovery. Streamable HTTP servers may refuse SSE on GET. */
export function GET(request: Request) {
  const denied = transportError(request)
  if (denied) return denied
  if (request.headers.get('accept')?.includes('text/event-stream')) return new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'POST, OPTIONS' } })
  return Response.json(
    {
      name: 'simultaneity-index',
      transport: 'streamable-http (stateless JSON)',
      endpoint: '/api/mcp',
      tools: TOOLS.map((t) => t.name),
      install: {
        http: { simultaneity: { url: `${SITE_URL}/api/mcp` } },
        stdio: { simultaneity: { command: 'npx', args: ['-y', 'mcp-remote', `${SITE_URL}/api/mcp`] } },
        local: 'node bin/simultaneity-mcp.mjs (zero-dependency stdio bridge, SIMULTANEITY_API_URL to override)',
      },
    },
    { headers: HEADERS },
  )
}

export function OPTIONS(request: Request) {
  const denied = transportError(request)
  if (denied) return denied
  return new Response(null, { status: 204, headers: HEADERS })
}
