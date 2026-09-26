/** End-to-end live check against real upstream APIs: pnpm tsx scripts/live-smoke.ts "idea" */
import { handleRpc } from '../lib/mcp'
import { scanIdea } from '../lib/scan'

async function main() {
  const idea = process.argv[2] ?? 'AI code review agent'
  const t0 = Date.now()
  const r = await scanIdea(idea)
  const t1 = Date.now()
  console.log(JSON.stringify({
    idea, ms: t1 - t0, score: r.score, verdict: r.verdict, confidence: r.confidence, coverage: r.coverage,
    quadrant: r.quadrant?.quadrant, demand: r.demand?.score, trend: r.demand?.trend,
    expansions: r.expansions, duplicatesCollapsed: r.duplicatesCollapsed,
    supply: r.breakdown.map((b) => `${b.source}:${b.included ? b.subScore : 'x'}`).join(' '),
    demandSources: r.demand?.breakdown.map((b) => `${b.source}:${b.included ? b.subScore : 'x'}`).join(' '),
    errors: [...r.sources, ...(r.demand?.sources ?? [])].filter((s) => s.status !== 'ok').map((s) => `${s.source}: ${s.errorMessage}`),
    receipt: r.receipt?.digest.slice(0, 16),
  }, null, 2))
  const cached = await scanIdea(idea)
  console.log('cache hit:', Boolean(cached.cached), 'in', Date.now() - t1, 'ms')
  const mcp = (await handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'crowding_check', arguments: { idea } } })) as { result: { content: Array<{ text: string }> } }
  console.log('--- MCP text ---\n' + mcp.result.content[0].text.slice(0, 900))
}
main()
