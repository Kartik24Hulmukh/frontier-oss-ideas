// Bounded, read-only deployment canary. Does not certify commercial readiness.
import { pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'

export function evaluateGate(health, scan, verification, strict = false) {
  const checks = []
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail })
  check('health', health?.ok === true, health?.version ?? 'missing version')
  check('scan-contract', typeof scan?.query === 'string' && Number.isFinite(scan?.score) && scan.score >= 0 && scan.score <= 100, 'Score must be bounded and query present')
  check('coverage', Number.isFinite(scan?.coverage) && scan.coverage >= (strict ? 95 : 50), `Required: ${strict ? 95 : 50}%`)
  check('receipt-integrity', verification?.digestMatches === true, 'Exported capsule must match receipt')
  check('snapshot-provenance', scan?.capsule?.version === '1.2' && Boolean(scan?.capsule?.modelVersion) && Array.isArray(scan?.capsule?.sourceSummary) && scan.capsule.sourceSummary.length === 7, 'Capsule 1.2 with model and seven source statuses')
  if (strict) {
    check('distributed-configured', health?.admission === 'distributed-configured', 'Configuration only; concurrent/outage tests still required')
    check('issuer-trust', verification?.issuerTrusted === true && health?.credentials?.receiptPublicKeyPinned === true, 'Pinned issuer key required')
    const expected = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface']
    check('healthy-supply', expected.every((id) => scan?.sources?.some((s) => s.source === id && s.status === 'ok' && !s.notice)), 'All seven adapters healthy without credential fallback')
    check('healthy-demand', ['reddit', 'stackoverflow', 'askhn'].every((id) => scan?.demand?.sources?.some((s) => s.source === id && s.status === 'ok')), 'All demand adapters healthy')
  }
  return { passed: checks.every((c) => c.passed), checks }
}

export async function runGate(base, strict = false) {
  const url = new URL(base)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS (or local HTTP)')
  const origin = url.origin
  async function req(path, body) {
    const response = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000), redirect: 'error' })
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
    return response.json()
  }
  const health = await req('/api/health')
  const scan = await req('/api/search', { query: 'AI code review agent' })
  const verification = await req('/api/verify', { capsule: scan.capsule, receipt: scan.receipt })
  const tampered = await req('/api/verify', { capsule: { ...scan.capsule, score: 999 }, receipt: scan.receipt })
  const result = evaluateGate(health, scan, verification, strict)
  result.checks.push({ name: 'tamper-rejected', passed: tampered.digestMatches === false && tampered.issuerTrusted !== true, detail: 'Modified score must not verify' })
  result.passed = result.checks.every((c) => c.passed)
  return { schemaVersion: 1, base: origin, checkedAt: new Date().toISOString(), mode: strict ? 'strict-technical' : 'beta', version: health.version, build: health.build ?? null, ...result, limitation: 'A canary is not a load test, external calibration, secret revocation, customer validation or commercial launch approval.' }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let report
  try { report = await runGate(process.argv[2] || 'http://localhost:3000', process.argv.includes('--strict')) }
  catch (error) { report = { passed: false, checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Gate failed' } }
  const outputIndex = process.argv.indexOf('--output')
  const json = JSON.stringify(report, null, 2) + '\n'
  if (outputIndex >= 0) {
    if (!process.argv[outputIndex + 1]) throw new Error('--output requires a filename')
    await writeFile(process.argv[outputIndex + 1], json)
  }
  console.log(json)
  if (!report.passed) process.exitCode = 1
}
