/** Bounded HTTP smoke: uses synthetic public evidence, never writes proof URLs. */
import { deflateRawSync } from 'node:zlib'
import { generateKeyPairSync } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { issueReceipt } from '../lib/scoring/receipt'
import type { EvidenceCapsule } from '../lib/types'
async function main() {
const base = new URL(process.argv[2] ?? 'http://localhost:3000')
if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Use HTTPS or localhost')
const c: EvidenceCapsule = { version: '1.2', query: 'public smoke sentinel', score: 86, confidence: 90, verdict: 'Saturated', searchedAt: '2026-10-02T00:00:00.000Z', evidenceLinks: [], disclaimer: 'Synthetic public test, not a real scan.' }
const receipt = issueReceipt(c)
const checks: { name: string; passed: boolean; status: number }[] = []
const req = (path: string, body?: unknown) => fetch(base.origin + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000), redirect: 'error' })
const exported = await req('/api/export', { capsule: c, receipt })
const j = await exported.json()
checks.push({ name: 'export', passed: exported.ok && typeof j.proofPath === 'string', status: exported.status })
if (!j.proofPath) throw new Error('Export failed')
const viewer = await req(j.proofPath)
const html = await viewer.text()
checks.push({ name: 'hash-only-origin-disclaimer', passed: viewer.ok && html.includes('origin and scan claims not authenticated'), status: viewer.status })
const og = await req(j.proofPath + '/opengraph-image')
checks.push({ name: 'og-image', passed: og.ok && !!og.headers.get('content-type')?.includes('image/png') && (await og.arrayBuffer()).byteLength > 1000, status: og.status })
const key = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const signed = { ...issueReceipt(c, key), signature: Buffer.alloc(64).toString('base64') }
for (const [name, capsule, r] of [['tampered', { ...c, score: 12 }, receipt], ['invalid-signature', c, signed]] as const) {
  const res = await req('/api/export', { capsule, receipt: r })
  checks.push({ name: name + '-export-rejected', passed: res.status === 422, status: res.status })
  const raw = deflateRawSync(Buffer.from(JSON.stringify({ capsule, receipt: r }))).toString('base64url')
  const page = await req(`/c/v1.${receipt.digest.slice(0, 16)}.${raw}`)
  const text = await page.text()
  checks.push({ name: name + '-page-and-metadata-suppress-claims', passed: page.ok && text.includes('This proof link is not valid') && !text.includes(c.query) && !text.includes('Saturated'), status: page.status })
}
const report = { checkedAt: new Date().toISOString(), base: base.origin, passed: checks.every(c => c.passed), checks, limitation: 'Synthetic evidence tests integrity UI, not source correctness or commercial readiness.' }
console.log(JSON.stringify(report, null, 2))
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n')
if (!report.passed) process.exitCode = 1

}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
