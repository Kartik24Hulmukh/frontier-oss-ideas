// Non-destructive HTTP smoke; one real scan, then cached tool/receipt/compare/cohort checks.
import assert from 'node:assert/strict'
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')
const checks = []
async function req(path, body) {
 const r = await fetch(base + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) })
 const data = await r.json(); return { status: r.status, data }
}
const health = await req('/api/health'); assert.equal(health.status, 200); checks.push({ check: 'health', ...health })
for (const route of ['search', 'compare', 'cohort', 'verify', 'mcp']) { const r = await req('/api/' + route, null); assert.equal(r.status, 400); checks.push({ check: route + ' rejects null', status: r.status }) }
const scan = await req('/api/search', { query: 'AI code review agent' }); assert.equal(scan.status, 200); assert.ok(scan.data.coverage >= 40, 'Not enough sources for smoke'); checks.push({ check: 'real scan', score: scan.data.score, coverage: scan.data.coverage, sources: scan.data.sources.map(s => [s.source, s.status]) })
const repeat = await req('/api/search', { query: 'AI code review agent' }); assert.equal(repeat.data.cached, true); checks.push({ check: 'cache', cached: true })
const receipt = await req('/api/verify', { capsule: scan.data.capsule, receipt: scan.data.receipt }); assert.equal(receipt.data.digestMatches, true); checks.push({ check: 'receipt', ...receipt })
const tampered = await req('/api/verify', { capsule: { ...scan.data.capsule, score: 999 }, receipt: scan.data.receipt }); assert.equal(tampered.data.digestMatches, false); checks.push({ check: 'tamper rejection', ...tampered })
for (const method of ['initialize', 'tools/list', 'tools/call']) { const r = await req('/api/mcp', { jsonrpc: '2.0', id: 1, method, params: method === 'tools/call' ? { name: 'crowding_check', arguments: { idea: 'AI code review agent' } } : {} }); assert.equal(r.status, 200); assert.ok(r.data.result); checks.push({ check: method, status: r.status }) }
const cohort = await req('/api/cohort', { ideas: ['AI code review agent'] }); assert.equal(cohort.status, 200); assert.equal(cohort.data.count, 1); checks.push({ check: 'cohort', count: cohort.data.count })
console.log(JSON.stringify({ base, at: new Date().toISOString(), checks }, null, 2))
