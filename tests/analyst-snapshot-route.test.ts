import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanIdea } from '../lib/scan'
import { POST } from '../app/api/analyst/route'

const post = (body: unknown) => POST(new Request('http://localhost/api/analyst', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': 'analyst-snapshot-fixture' }, body: JSON.stringify(body) }))

test('analyst rejects legacy query-only/raw bodies and missing or malformed snapshot receipts without acquisition', async () => {
  const original = globalThis.fetch; let calls = 0
  globalThis.fetch = (async () => { calls++; throw new Error('unexpected acquisition') }) as typeof fetch
  try {
    for (const body of [{ query: 'snapshot fixture' }, { snapshotId: 'invalid', receipt: {} }, { snapshotId: 'a'.repeat(64) }, { snapshotId: 'a'.repeat(64), receipt: [] }]) {
      const response = await post(body)
      assert.equal(response.status, 400)
      assert.equal(response.headers.get('Cache-Control'), 'no-store')
    }
    const malformed = await POST(new Request('http://localhost/api/analyst', { method: 'POST', body: '{' }))
    assert.equal(malformed.status, 400)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original }
})

test('unknown snapshot is a 409, never replaced by a rescan or caller evidence', async () => {
  const original = globalThis.fetch; let calls = 0
  globalThis.fetch = (async () => { calls++; throw new Error('unexpected acquisition') }) as typeof fetch
  try {
    const response = await post({ snapshotId: 'a'.repeat(64), receipt: { digest: 'a'.repeat(64) }, query: 'forged query', score: 99, sources: [{ title: 'forged evidence' }] })
    assert.equal(response.status, 409)
    assert.match((await response.json()).fallback, /No new scan was run/)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original }
})

test('server-held degraded snapshot yields deterministic 422 even with injected raw evidence', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch
  try {
    const scan = await scanIdea('analyst empty snapshot fixture', { fresh: true, expand: false, demand: false, ctx: { timeoutMs: 10 } })
    let calls = 0
    globalThis.fetch = (async () => { calls++; throw new Error('unexpected acquisition') }) as typeof fetch
    const response = await post({ snapshotId: scan.receipt!.digest, receipt: scan.receipt, query: 'forged override', score: 100, sources: [{ items: [{ title: 'forged citable evidence', url: 'https://attacker.example' }] }] })
    assert.equal(response.status, 422)
    const body = await response.json()
    assert.equal(body.snapshotId, scan.receipt!.digest)
    assert.equal(body.error, 'No qualified supply evidence; discussion links remain in deterministic brief. No strategic memo generated.')
    assert.match(body.fallback, /deterministic decision brief/)
    assert.equal(calls, 0)
    const mismatched = await post({ snapshotId: scan.receipt!.digest, receipt: { ...scan.receipt, issuedAt: '2020-01-01T00:00:00.000Z' } })
    assert.equal(mismatched.status, 409)
  } finally { globalThis.fetch = original }
})

test('server-held citable snapshot returns unconfigured error without upstream dispatch', async () => {
  const oldKey = process.env.MELIOUS_API_KEY; delete process.env.MELIOUS_API_KEY
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => String(input).includes('api.github.com') ? Response.json({ total_count: 1, items: [{ full_name: 'fixture/analyst-review', html_url: 'https://github.com/fixture/analyst-review', description: 'analyst snapshot fixture review tool', created_at: '2026-01-01T00:00:00.000Z', pushed_at: '2026-10-01T00:00:00.000Z', stargazers_count: 1 }] }) : new Response('', { status: 503 })) as typeof fetch
  try {
    const scan = await scanIdea('analyst review snapshot', { fresh: true, expand: false, demand: false, ctx: { timeoutMs: 10 } })
    assert.ok(scan.capsule.evidenceLinks.length)
    let calls = 0
    globalThis.fetch = (async () => { calls++; throw new Error('unexpected acquisition') }) as typeof fetch
    const response = await post({ snapshotId: scan.receipt!.digest, receipt: scan.receipt })
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.equal(body.snapshotId, scan.receipt!.digest)
    assert.match(body.error, /not configured/)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original; if (oldKey === undefined) delete process.env.MELIOUS_API_KEY; else process.env.MELIOUS_API_KEY = oldKey }
})

test('successful endpoint uses retained capsule, ignores forged caller facts and returns exact ID/link map', async () => {
  const { sharedRouter } = await import('../lib/llm/analyst')
  const { retainScanSnapshot } = await import('../lib/core/scan-snapshots')
  const { computeCrowding } = await import('../lib/scoring/score')
  const { issueReceipt } = await import('../lib/scoring/receipt')
  const scan = computeCrowding('retained review', [{ source: 'github', label: 'GitHub', status: 'ok', totalCount: 1, items: [{ title: 'Retained review', description: null, url: 'https://example.org/retained', date: null, meta: null }] }])
  scan.receipt = issueReceipt(scan.capsule)
  await retainScanSnapshot(scan)
  const router = sharedRouter(); const configured = router.configured; const complete = router.complete
  const original = globalThis.fetch; let calls = 0; let messages = ''
  router.configured = () => true
  router.complete = async args => {
    messages = JSON.stringify(args.messages)
    return { ok: true, text: 'Retained [E1] and missing [E9999].', attempts: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimated: false, reasoningTokens: 0 }, maxFailoverMs: 0 }
  }
  globalThis.fetch = (async () => { calls++; throw new Error('unexpected upstream') }) as typeof fetch
  try {
    const response = await post({ snapshotId: scan.receipt.digest, receipt: scan.receipt, query: 'FORGED_QUERY', score: 99, sources: [{ title: 'FORGED_SOURCE' }], capsule: { query: 'FORGED_CAPSULE' } })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.snapshotId, scan.receipt.digest)
    assert.equal(body.invalidCitations, 1)
    assert.deepEqual(body.citations, [{ id: 'E1', source: 'github', title: 'Retained review', url: 'https://example.org/retained' }])
    assert.match(body.memo, /\[uncited\]/)
    assert.ok(!messages.includes('FORGED_')); assert.ok(messages.includes('retained review'))
    assert.equal(calls, 0)
  } finally { router.configured = configured; router.complete = complete; globalThis.fetch = original }
})

test('required shared store misconfiguration returns 503, not a replacement acquisition', async () => {
  const old = { ...process.env }; const original = globalThis.fetch; let calls = 0
  process.env.REQUIRE_DISTRIBUTED_LIMITS = 'true'
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN
  globalThis.fetch = (async () => { calls++; throw new Error('unexpected acquisition') }) as typeof fetch
  try {
    const response = await post({ snapshotId: 'b'.repeat(64), receipt: { digest: 'b'.repeat(64) } })
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.match(body.error, /storage is unavailable/)
    assert.match(body.fallback, /No new scan was run/)
    assert.equal(calls, 0)
  } finally { process.env = old; globalThis.fetch = original }
})

test('retained discussion-only and unsafe-supply snapshots return precise 422 before any router or acquisition', async () => {
  const { sharedRouter } = await import('../lib/llm/analyst')
  const { retainScanSnapshot } = await import('../lib/core/scan-snapshots')
  const { computeCrowding } = await import('../lib/scoring/score')
  const { issueReceipt } = await import('../lib/scoring/receipt')
  const { opportunityBrief } = await import('../lib/brief')
  const router = sharedRouter(); const configured = router.configured; const complete = router.complete
  const original = globalThis.fetch; let acquisition = 0; let configChecks = 0; let dispatches = 0
  router.configured = () => { configChecks++; return true }
  router.complete = async () => { dispatches++; throw new Error('unexpected gateway') }
  globalThis.fetch = (async () => { acquisition++; throw new Error('unexpected acquisition') }) as typeof fetch
  try {
    for (const supply of [[], [{ source: 'github' as const, title: 'Unsafe supply', url: 'javascript:alert(1)' }]]) {
      const scan = computeCrowding('discussion only gate', [])
      scan.capsule.evidenceLinks = supply
      scan.capsule.demandEvidenceLinks = [{ source: 'askhn', title: 'Inspect discussion', url: 'https://news.ycombinator.com/item?id=123' }]
      scan.receipt = issueReceipt(scan.capsule)
      await retainScanSnapshot(scan)
      const briefBefore = opportunityBrief(scan)
      const response = await post({ snapshotId: scan.receipt.digest, receipt: scan.receipt, sources: [{ items: [{ url: 'https://attacker.example/fake-supply' }] }] })
      assert.equal(response.status, 422)
      const body = await response.json()
      assert.equal(body.snapshotId, scan.receipt.digest)
      assert.equal(body.error, 'No qualified supply evidence; discussion links remain in deterministic brief. No strategic memo generated.')
      assert.match(body.fallback, /deterministic decision brief/)
      assert.equal(opportunityBrief(scan), briefBefore)
      assert.equal(scan.capsule.demandEvidenceLinks[0].url, 'https://news.ycombinator.com/item?id=123')
    }
    assert.equal(configChecks, 0); assert.equal(dispatches, 0); assert.equal(acquisition, 0)
  } finally { router.configured = configured; router.complete = complete; globalThis.fetch = original }
})
