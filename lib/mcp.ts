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
      'Before building a new project, check how many teams are already building the same idea. Scans GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, Hugging Face (supply) and Reddit, Stack Overflow, Ask HN (demand). Returns a 0-100 Simultaneity score, verdict, Supply x Demand quadrant, confidence, wedges and evidence links.',
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
    `Simultaneity ${r.score}/100 — ${r.verdict} (confidence ${r.confidence}%, coverage ${r.coverage}%).`,
    r.quadrant?.quadrant ? `Battlefield: ${r.quadrant.quadrant} (demand ${r.quadrant.demand}/100). ${r.quadrant.action}` : '',
    r.verdictDetail,
    'Top wedges:',
    ...r.wedges.slice(0, 3).map((w) => `- [${w.priority}] ${w.title}: ${w.rationale}`),
    'Evidence:',
    ...r.capsule.evidenceLinks.slice(0, 8).map((e) => `- (${e.source}) ${e.title} — ${e.url}`),
  ]
  return lines.filter(Boolean).join('\n')
}

export async function handleRpc(
  msg: JsonRpcRequest,
  scan: typeof scanIdea = scanIdea,
): Promise<Record<string, unknown> | null> {
  const id = msg.id ?? null
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result })
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
  // Notifications (no id) get no response body.
  if (msg.id === undefined && msg.method?.startsWith('notifications/')) return null
  switch (msg.method) {
    case 'initialize':
      return ok({
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'simultaneity-index', version: '1.2.0' },
        instructions: 'Call crowding_check with a one-line idea before scaffolding any new project.',
      })
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: TOOLS })
    case 'tools/call': {
      const params = msg.params ?? {}
      if (params.name !== 'crowding_check') return fail(-32602, `Unknown tool: ${String(params.name)}`)
      const args = (params.arguments ?? {}) as { idea?: unknown; query?: unknown; depth?: unknown }
      const rawIdea = typeof args.idea === 'string' ? args.idea : typeof args.query === 'string' ? args.query : ''
      const idea = rawIdea.trim()
      if (idea.length < 3) return ok({ content: [{ type: 'text', text: 'Provide an idea of at least 3 characters.' }], isError: true })
      const result = await scan(idea, { demand: args.depth !== 'quick' })
      return ok({ content: [{ type: 'text', text: summarize(result) }], structuredContent: { ...result.capsule, receipt: result.receipt } })
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`)
  }
}
