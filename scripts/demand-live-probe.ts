/** Live probe: primary Reddit vs mirror fallback provenance. Usage: tsx scripts/demand-live-probe.ts "query" */
import { searchReddit, scoreDemandSource, demandStatusLabel } from '../lib/demand'

async function main() {
const q = process.argv[2] || 'mcp server'
const t0 = Date.now()
const r = await searchReddit(q, { timeoutMs: 12_000 })
const b = scoreDemandSource(r)
console.log(JSON.stringify({ query: q, status: r.status, class: demandStatusLabel(r), provenance: r.provenance ?? null, totalCount: r.totalCount, notice: r.notice ?? null, error: r.errorMessage ?? null, firstTitle: r.items[0]?.title ?? null, weight: b.weight, subScore: b.subScore, signal: b.signal, ms: Date.now() - t0 }, null, 2))
}
void main()
