import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGate, runGate } from '../scripts/release-gate.mjs'

const supply = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface', 'crates'].map(source => ({ source, status: 'ok', totalCount: 0 }))
const demand = ['reddit', 'stackoverflow', 'askhn'].map(source => ({ source, status: 'ok', totalCount: 0, provenance: 'primary' }))
const health = { ok: true, version: 'fixture', admission: 'distributed-configured', credentials: { receiptPublicKeyPinned: true } }
const verification = { digestMatches: true, issuerTrusted: true }
const ready = { status: 200, body: { ready: true, scope: 'operational-dependencies-only', redis: 'healthy', receipts: { ready: true, signer: 'valid', issuerMatched: true, pinnedKeys: 1 } } }
function snapshot() {
  const display = { query: 'AI code review agent', score: 50, coverage: 100, confidence: 70, verdict: 'Crowded', searchedAt: new Date().toISOString() }
  return { ...display, cached: false, sources: supply, demand: { sources: demand }, capsule: { ...display, version: '1.2', modelVersion: 'crowding-1.4', sourceSummary: supply, demandSourceSummary: demand } }
}

test('strict gate fails closed when runtime readiness is absent despite healthy configuration', () => {
  assert.equal(evaluateGate(health, snapshot(), verification, true).passed, false)
})
test('strict gate rejects unavailable, malformed and contradictory runtime readiness', () => {
  const cases = [
    { ...ready, status: 503 },
    { ...ready, body: { ...ready.body, ready: false } },
    { ...ready, body: { ...ready.body, redis: 'unavailable' } },
    { ...ready, body: { ...ready.body, redis: 'missing' } },
    ...['ready', 'signer', 'issuerMatched', 'pinnedKeys'].map((field, i) => ({ ...ready, body: { ...ready.body, receipts: { ...ready.body.receipts, [field]: [false, 'invalid', false, 0][i] } } })),
    { status: 200, body: { ready: true } },
    { status: 200, body: null },
  ]
  for (const r of cases) assert.equal(evaluateGate(health, snapshot(), verification, true, undefined, r).passed, false, JSON.stringify(r))
  assert.equal(evaluateGate(health, snapshot(), verification, true, undefined, ready).passed, true)
  assert.equal(evaluateGate(health, snapshot(), verification, false).passed, true, 'beta remains explicitly non-production')
})

async function canary(readinessStatus, readinessBody, strict = true) {
  const original = globalThis.fetch
  const paths = []
  const scan = snapshot()
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname
    paths.push(path)
    if (path === '/api/health') return Response.json(health)
    if (path === '/api/ready') return Response.json(readinessBody, { status: readinessStatus })
    if (path === '/api/search') return Response.json(scan)
    if (path === '/api/verify') {
      const body = JSON.parse(init.body)
      return Response.json(body.capsule.score === 999 ? { digestMatches: false, issuerTrusted: false } : verification)
    }
    throw new Error('Unexpected path: ' + path)
  }
  try { return { report: await runGate('https://deployment.example', strict), paths } }
  finally { globalThis.fetch = original }
}
test('strict live canary probes readiness and preserves a 503 as an explicit failed check', async () => {
  const { report, paths } = await canary(503, { ...ready.body, ready: false, redis: 'unavailable' })
  assert.equal(report.passed, false)
  assert.equal(report.checks.find(c => c.name === 'operational-readiness')?.passed, false)
  assert.equal(report.checks.find(c => c.name === 'tamper-rejected')?.passed, true)
  assert.equal(paths.filter(p => p === '/api/ready').length, 1)
})
test('strict canary accepts valid readiness; beta does not imply or probe operational readiness', async () => {
  assert.equal((await canary(200, ready.body)).report.passed, true)
  const beta = await canary(503, { ready: false }, false)
  assert.equal(beta.report.passed, true)
  assert.equal(beta.paths.includes('/api/ready'), false)
})

for (const status of [401, 404, 429, 500]) {
  test(`strict canary rejects unexpected readiness HTTP ${status} without fallback`, async () => {
    await assert.rejects(canary(status, ready.body), new RegExp('/api/ready: HTTP ' + status))
  })
}
