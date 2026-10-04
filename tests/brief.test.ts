import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeCrowding } from '../lib/scoring/score'
import { opportunityBrief } from '../lib/brief'
import { digestCapsule, issueReceipt, verifyReceipt } from '../lib/scoring/receipt'
import { admitScan } from '../lib/core/admission'

test('capsule records failed sources, weights and model, with stable JSON roundtrip', () => {
  const r = computeCrowding('test idea', [{ source: 'github', label: 'GitHub', status: 'error', totalCount: 0, items: [] }])
  assert.equal(r.capsule.version, '1.2')
  assert.equal(r.capsule.modelVersion, 'crowding-1.3')
  assert.equal(r.capsule.sourceSummary?.[0].status, 'error')
  assert.equal(r.capsule.breakdown?.[0].included, false)
  assert.equal(digestCapsule(JSON.parse(JSON.stringify(r.capsule))), digestCapsule(r.capsule))
  const receipt = issueReceipt(r.capsule)
  for (const changed of [{ ...r.capsule, modelVersion: 'forged' }, { ...r.capsule, sourceSummary: [] }, { ...r.capsule, breakdown: [] }]) assert.equal(verifyReceipt(changed, receipt).digestMatches, false)
})
test('brief is dated, portable, honest about uncertainty and receipt scope', () => {
  const r = computeCrowding('test idea', [])
  const brief = opportunityBrief({ ...r, receipt: issueReceipt(r.capsule) })
  for (const expected of [r.searchedAt.slice(0, 19), 'Incomplete supply coverage', 'not a calibrated probability', 'not verified buyer demand', 'Decision worksheet', 'not this editable worksheet', 'hash alone']) assert.ok(brief.includes(expected), expected)
})
test('brief escapes hostile titles and excludes unsafe evidence URLs', () => {
  const r = computeCrowding('<script>alert(1)</script>', [])
  r.capsule.evidenceLinks = [{ source: 'github', title: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' }]
  const brief = opportunityBrief(r)
  assert.ok(!brief.includes('<script>'))
  assert.ok(!brief.includes('<img'))
  assert.ok(!brief.includes('javascript:'))
  assert.ok(brief.includes('unsafe URL'))
})
test('admission rejects invalid costs before network or local quota mutation', async () => {
  let calls = 0
  const fetcher = (async () => { calls++; return Response.json({ result: 1 }) }) as typeof fetch
  for (const cost of [-1, 0, 0.5, NaN, Infinity, 81]) assert.equal(await admitScan('cost-test', cost, fetcher), 'limited')
  assert.equal(calls, 0)
})

 test('verify accepts richer exports over 32 KiB and rejects bodies over 256 KiB', async () => {
  const { POST } = await import('../app/api/verify/route')
  const r = computeCrowding('large capsule', [])
  const capsule = { ...r.capsule, disclaimer: 'x'.repeat(40000) }
  const request = (value: unknown) => new Request('http://localhost/api/verify', { method: 'POST', body: JSON.stringify(value) })
  const response = await POST(request({ capsule, receipt: issueReceipt(capsule) }))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).digestMatches, true)
  assert.equal((await POST(request({ data: 'x'.repeat(262145) }))).status, 413)
})

test('brief retains demand provenance, operator notices and failed-source reasons', () => {
  const r = computeCrowding('test idea', [])
  r.demand = { score: 30, coverage: 67, trend: 'unknown', breakdown: [], sources: [
    { source: 'reddit', label: 'Reddit', status: 'ok', totalCount: 2, items: [], provenance: 'mirror', notice: 'Primary unavailable <script>' },
    { source: 'askhn', label: 'Ask HN', status: 'error', totalCount: 0, items: [], errorMessage: 'Upstream timed out' },
  ] }
  const brief = opportunityBrief(r)
  for (const expected of ['Demand accountability', 'mirror', 'Primary unavailable', 'Upstream timed out', 'unknown', 'Mirror data is degraded']) assert.ok(brief.includes(expected), expected)
  assert.ok(!brief.includes('<script>'))
})
