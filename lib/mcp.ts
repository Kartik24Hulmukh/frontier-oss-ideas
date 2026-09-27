import { validIdea } from '@/lib/core/input'
import { scanIdea } from '@/lib/scan'
import type { CrowdingResult } from '@/lib/types'

/**
 * Minimal, dependency-free Model Context Protocol server (Streamable HTTP,
 * stateless JSON responses). Exposes `crowding_check` so Cursor, Claude Code,
 * goose, Windsurf etc. can run a pre-scaffold simultaneity check.
 */
export const MCP_PROTOCOL_VERSION = '2025-06-18'

export const TOOLS = [
  {
    name: 'crowding_check',
    title: 'Simultaneity Index crowding check',
    description:
      'Before building a new project, check public-source crowding around the idea (not a unique-team count). Scans GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, Hugging Face (supply) and Reddit, Stack Overflow, Ask HN (demand). Returns a 0-100 Simultaneity score, verdict, Supply x Demand quadrant, confidence, wedges and evidence links.',
    inputSchema: {
      type: 'object',
      properties: {
        idea: { type: 'string', description: 'One-line description of the idea, e.g. "AI code review agent for Terraform"' },
        depth: { type: 'string', enum: ['quick', 'full'], description: 'quick = supply only; full = supply + demand (default)' },
      },
      required: ['idea'],
    },
  },
] as const

type JsonRpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> }

export function summarize(r: CrowdingResult): string {
  const lines = [
    r.coverage < 50 ? 'WARNING: Insufficient coverage. Do not interpret this as market openness.' : '',
    `Simultaneity ${r.score}/100 — ${r.verdict} (confidence ${r.confidence}%, coverage ${r.coverage}%).`,
    r.quadrant?.quadrant ? `Battlefield: ${r.quadrant.quadrant} (demand ${r.quadrant.demand}/100). ${r.quadrant.action}` : '',
    r.verdictDetail,
    'Source caveats (coverage is not primary-source health):',
    ...[...r.sources, ...(r.demand?.sources ?? [])].filter(s => s.status !== 'ok' || s.notice || ('provenance' in s && s.provenance === 'mirror')).map(s => `- ${s.label}: ${s.notice ?? s.errorMessage ?? 'degraded evidence'}`),
    'Discussion heat is not verified buyer demand; confidence is not a calibrated probability.',
    'Top wedges:',
    ...r.wedges.slice(0, 3).map((w) => `- [${w.priority}] ${w.title}: ${w.rationale}`),
    ...(r.subLanes?.length ? ['Least-claimed sub-lanes (estimates; verify with crowding_check):', ...r.subLanes.map((l) => `- ${l.label}: est. ${l.estimatedScore}/100 (${l.claimedBy}/${l.sampled} sampled claim it, ${l.confidence})${l.buildHere ? ' <- build here' : ''}; verify: "${l.verifyQuery}"`)] : []),
    'Evidence:',
    ...r.capsule.evidenceLinks.slice(0, 8).map((e) => `- (${e.source}) ${e.title} — ${e.url}`),
  ]
  return lines.filter(Boolean).join('\n')
}

export async function handleRpc(
  msg: JsonRpcRequest,
  scan: typeof scanIdea = scanIdea,
): Promise<Record<string, unknown> | null> {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || (msg.id !== undefined && msg.id !== null && typeof msg.id !== 'string' && typeof msg.id !== 'number') || (msg.params !== undefined && (!msg.params || typeof msg.params !== 'object' || Array.isArray(msg.params)))) {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }
  }
  const id = msg.id ?? null
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result })
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
  // Notifications (no id) get no response body.
  if (msg.id === undefined) return null
  switch (msg.method) {
    case 'initialize':
      return ok({
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'simultaneity-index', version: '1.3.1' },
        instructions: 'Call crowding_check with a one-line idea before scaffolding any new project.',
      })
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: TOOLS })
    case 'tools/call': {
      const params = msg.params ?? {}
      if (params.name !== 'crowding_check') return fail(-32602, `Unknown tool: ${String(params.name)}`)
      if (params.arguments === null || (params.arguments !== undefined && (typeof params.arguments !== 'object' || Array.isArray(params.arguments)))) return fail(-32602, 'Arguments must be an object')
      const args = (params.arguments ?? {}) as { idea?: unknown; query?: unknown; depth?: unknown }
      const rawIdea = typeof args.idea === 'string' ? args.idea : typeof args.query === 'string' ? args.query : ''
      const idea = rawIdea.trim()
      if (!validIdea(rawIdea) || (args.depth !== undefined && args.depth !== 'quick' && args.depth !== 'full')) return ok({ content: [{ type: 'text', text: 'Provide a 3–120 character idea and depth quick or full.' }], isError: true })
      const result = await scan(idea, { demand: args.depth !== 'quick' })
      return ok({ content: [{ type: 'text', text: summarize(result) }], structuredContent: { ...result.capsule, receipt: result.receipt } })
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`)
  }
}
