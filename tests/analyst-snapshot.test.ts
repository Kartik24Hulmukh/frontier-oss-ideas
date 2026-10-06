import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analystMemo, analystMessages, evidenceTable, validateCitations } from '../lib/llm/analyst'
import { ModelRouter } from '../lib/llm/router'
import { computeCrowding } from '../lib/scoring/score'
import { issueReceipt } from '../lib/scoring/receipt'

function fixture() {
  const result = computeCrowding('snapshot review', [{ source: 'github', label: 'GitHub', status: 'ok', totalCount: 1, items: [
    { title: 'Snapshot review repo', description: 'public review tool', url: 'https://example.org/review', date: null, meta: null },
  ] }])
  result.receipt = issueReceipt(result.capsule)
  return result
}

test('analyst references and facts use ONLY capsule fields, not raw source or score mutations', () => {
  const result = fixture()
  const expected = analystMessages(result, evidenceTable(result))
  result.query = 'RAW QUERY SENTINEL'; result.score = 99; result.coverage = 0
  result.sources[0].label = 'RAW LABEL SENTINEL'
  result.sources[0].notice = 'RAW NOTICE SENTINEL'
  result.sources[0].items[0].title = 'RAW TITLE SENTINEL'
  result.sources[0].items[0].description = 'RAW DESCRIPTION SENTINEL'
  result.sources[0].items[0].url = 'https://attacker.example/not-bound'
  result.wedges = [{ title: 'RAW WEDGE SENTINEL', rationale: 'RAW RATIONALE SENTINEL', priority: 'high' }]
  assert.deepEqual(analystMessages(result, evidenceTable(result)), expected)
  assert.equal(evidenceTable(result)[0].url, 'https://example.org/review')
  assert.ok(!expected[1].content.includes('RAW '))
})

test('capsule supply and demand citations map numbered IDs to HTTPS URLs and reject unsafe links', () => {
  const result = fixture()
  result.capsule.demandEvidenceLinks = [{ source: 'askhn', title: 'Public discussion', url: 'https://news.ycombinator.com/item?id=123' }]
  for (const url of ['javascript:alert(1)', 'http://example.org', 'https://user:pass@example.org', 'https://', '//example.org']) {
    result.capsule.evidenceLinks.push({ source: 'github', title: 'unsafe', url })
  }
  const refs = evidenceTable(result)
  assert.deepEqual(refs.map(r => r.id), ['E1', 'E2'])
  assert.equal(refs[1].source, 'askhn')
  assert.match(analystMessages(result, refs)[0].content, /not verified buyer demand/)
})

test('every numeric invalid E citation, including long IDs and E0, becomes explicitly uncited', () => {
  const refs = evidenceTable(fixture())
  const value = validateCitations('[E1] repeated [E1]; invalid [E99] [E123456] [E0] [E01]', refs)
  assert.equal(value.invalidCitations, 4)
  assert.deepEqual(value.cited, ['E1'])
  assert.equal(value.text, '[E1] repeated [E1]; invalid [uncited] [uncited] [uncited] [uncited]')
})

test('no capsule evidence never dispatches a gateway even if raw sources contain items', async () => {
  const result = fixture(); result.capsule.evidenceLinks = []
  let calls = 0
  const router = new ModelRouter({ apiKey: 'synthetic-test-only', fetcher: (async () => { calls++; throw new Error('unexpected gateway') }) as typeof fetch })
  const memo = await analystMemo(result, 'fast', router)
  assert.equal(memo.ok, false); assert.equal(memo.error, 'no_evidence')
  assert.equal(memo.snapshotId, result.receipt!.digest)
  assert.deepEqual(memo.route.attempts, []); assert.equal(calls, 0)
})

test('mocked memo retains exact snapshot ID and citation map, reports invalid claims without receipt truth claims', async () => {
  const result = fixture()
  const router = new ModelRouter({ apiKey: 'synthetic-test-only', fetcher: (async () => Response.json({ choices: [{ message: { content: 'Observed repo [E1], unsupported [E12345].' } }], usage: { prompt_tokens: 10, completion_tokens: 10 } })) as typeof fetch })
  const memo = await analystMemo(result, 'fast', router)
  assert.equal(memo.ok, true); assert.equal(memo.snapshotId, result.receipt!.digest)
  assert.deepEqual(memo.citations, evidenceTable(result))
  assert.equal(memo.invalidCitations, 1); assert.match(memo.memo!, /\[uncited\]/)
  assert.match(memo.disclaimer, /not a signed narrative or proof/)
  assert.ok(!memo.disclaimer.includes('receipt-covered evidence'))
})

test('demand-only analystMessages retains discussion-only policy but does not authorize gateway dispatch', () => {
  const result = fixture(); result.capsule.evidenceLinks = []
  result.capsule.demandEvidenceLinks = [{ source: 'askhn', title: 'Public tool discussion', url: 'https://news.ycombinator.com/item?id=123' }]
  const refs = evidenceTable(result)
  assert.equal(refs.length, 1); assert.equal(refs[0].source, 'askhn')
  assert.match(analystMessages(result, refs)[0].content, /discussion links but no supply artifacts.*never offer strategic recommendations/)
})

test('demand-only or unsafe-supply capsule deterministically returns no_evidence without router dispatch', async () => {
  for (const supply of [[], [{ source: 'github' as const, title: 'Unsafe supply', url: 'javascript:alert(1)' }], [{ source: 'github' as const, title: 'Credentials in URL', url: 'https://user:pass@example.org' }]]) {
    const result = fixture()
    result.capsule.evidenceLinks = supply
    result.capsule.demandEvidenceLinks = [{ source: 'askhn', title: 'Public tool discussion', url: 'https://news.ycombinator.com/item?id=123' }]
    result.receipt = issueReceipt(result.capsule)
    assert.equal(evidenceTable(result).length, 1, 'discussion remains inspectable but cannot authorize a memo')
    let dispatches = 0
    const router = new ModelRouter({ apiKey: 'synthetic-test-only' })
    router.complete = async () => { dispatches++; throw new Error('demand-only gateway must never dispatch') }
    const memo = await analystMemo(result, 'fast', router)
    assert.equal(memo.ok, false); assert.equal(memo.error, 'no_evidence')
    assert.equal(memo.snapshotId, result.receipt.digest)
    assert.deepEqual(memo.citations, []); assert.deepEqual(memo.route.attempts, [])
    assert.equal(memo.route.usage.totalTokens, 0); assert.equal(dispatches, 0)
  }
})
