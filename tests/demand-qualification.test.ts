/** All fixtures below are deterministic SYNTHETIC observations, not users,
 * interviews, provider acceptance, semantic calibration, or buyer commitments. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeDemand, scoreDemandSource, searchRedditPrimary, searchRedditMirror, searchStackOverflow, searchAskHN, trendOf } from '../lib/demand'
import { qualifyDemandSource, qualifiedDemandItems, DEMAND_WINDOW_DAYS, DEMAND_SAMPLE_LIMIT } from '../lib/demand/qualification'
import type { DemandSourceId, DemandSourceResult, EvidenceItem } from '../lib/types'
const NOW = Date.parse('2026-10-06T16:00:00Z')
const date = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const item = (id = 0): EvidenceItem => ({ title: 'Need code review help', description: 'How can I review code?', url: `https://example.test/${id}`, date: date(1), meta: '1,000,000 views · 100,000 comments' })
const src = (source: DemandSourceId, items: EvidenceItem[], totalCount = 1_000_000, provenance: 'primary' | 'mirror' = 'primary'): DemandSourceResult => ({ source, label: source, status: 'ok', totalCount, items, provenance })

// 3 channels × 2 origins × 3 raw totals × 4 dates × 3 topical/intent states × 3 sample sizes = 648 synthetic cases.
let cases = 0
for (const source of ['reddit', 'stackoverflow', 'askhn'] as const) for (const provenance of ['primary', 'mirror'] as const) for (const rawCount of [0, 25, 1_000_000]) for (const age of [1, 366, -1, null]) for (const kind of ['pull', 'unrelated', 'promotion'] as const) for (const n of [0, 1, 10]) {
  cases++
  test(`SYNTHETIC matrix ${cases}: ${source}/${provenance}/raw=${rawCount}/age=${age}/${kind}/n=${n}`, () => {
    const items = Array.from({ length: n }, (_, i) => ({ ...item(i), date: age === null ? null : date(age), title: kind === 'unrelated' ? 'Need AI weather help' : kind === 'promotion' ? 'Show HN: code review launched' : item(i).title }))
    const qualified = qualifyDemandSource(src(source, items, rawCount, provenance), 'AI code review agent', NOW)
    const expected = age === 1 && kind === 'pull' ? n : 0
    assert.equal(qualifiedDemandItems(qualified).length, expected)
    assert.equal(qualified.qualification?.qualifiedTotal, expected)
    assert.equal(qualified.qualification?.rawCount, rawCount)
    assert.equal(qualified.totalCount, rawCount)
    assert.equal(qualified.items.length, n, 'audit evidence is not erased')
    assert.equal(qualified.qualification?.rejectedCount, n - expected)
    assert.equal(scoreDemandSource(qualified).subScore, expected * 4, 'engagement and raw totals have no score effect')
    assert.equal(qualified.provenance, provenance)
    assert.equal(computeDemand([qualified]).score, null, 'one channel cannot support an aggregate claim')
    for (const rejected of qualified.qualification!.rejectedItems) { assert.equal(rejected.provenance, provenance); assert.ok(rejected.reasons.length) }
  })
}
test('SYNTHETIC aggregate requires 2 channels, 4 unique URLs, aligned windows and same query', () => {
  const a = qualifyDemandSource(src('reddit', [item(1), item(2)]), 'code review', NOW)
  const b = qualifyDemandSource(src('askhn', [item(3), item(4)]), 'code review', NOW)
  assert.equal(computeDemand([a, b]).score, 8)
  assert.equal(computeDemand([a, b]).coverage, 67)
  assert.equal(computeDemand([a, a]).score, null, 'duplicate channel cannot inflate support')
  assert.equal(computeDemand([a, qualifyDemandSource(src('askhn', [item(1), item(2)]), 'code review', NOW)]).score, null)
  assert.equal(computeDemand([a, qualifyDemandSource(src('askhn', [item(3), item(4)]), 'code review', NOW + 61_000)]).score, null)
  assert.equal(computeDemand([a, qualifyDemandSource(src('askhn', [item(3), item(4)]), 'review code', NOW)]).score, null)
  assert.equal(trendOf([a, b]), 'unknown')
})
test('SYNTHETIC raw-only and legacy unqualified samples abstain rather than fabricate zero or heat', () => {
  for (const source of ['reddit', 'stackoverflow', 'askhn'] as const) {
    const legacy = src(source, [item()], 1_000_000)
    assert.equal(scoreDemandSource(legacy).included, false)
    assert.equal(scoreDemandSource(legacy).subScore, 0)
    assert.equal(computeDemand([legacy]).score, null)
    assert.equal(computeDemand([qualifyDemandSource(src(source, []), 'code review', NOW)]).score, null)
  }
})
test('SYNTHETIC aliases can qualify without generic family leakage or body stuffing', () => {
  const q = (title: string, description: string | null = null) => qualifiedDemandItems(qualifyDemandSource(src('reddit', [{ ...item(), title, description }]), 'AI code review agent', NOW)).length
  assert.equal(q('Need pull request review help'), 1)
  assert.equal(q('Need AI weather model help'), 0)
  assert.equal(q('Need AI weather model help', 'code review code review agent'), 0)
  assert.equal(qualifiedDemandItems(qualifyDemandSource(src('reddit', [{ ...item(), title: 'Need an AI agent' }]), 'AI agent', NOW)).length, 0)
})
test('SYNTHETIC date boundaries, missing and invalid URLs, duplicates, sample bound and audit preservation', () => {
  const original = src('reddit', [{ ...item(0), date: date(DEMAND_WINDOW_DAYS) }, { ...item(1), date: new Date(NOW).toISOString() }, { ...item(2), url: 'javascript:alert(1)' }, { ...item(3), date: 'not-a-date' }, item(0)])
  const q = qualifyDemandSource(original, 'code review', NOW)
  assert.equal(q.qualification?.qualifiedCount, 2)
  assert.equal(q.items.length, 5)
  assert.deepEqual(q.qualification?.rejectedItems.map(i => i.reasons), [['uninspectable'], ['missing-or-invalid-date'], ['duplicate-observation']])
  const bounded = qualifyDemandSource(src('reddit', Array.from({ length: 100 }, (_, i) => item(i))), 'code review', NOW)
  assert.equal(bounded.qualification?.qualifiedTotal, DEMAND_SAMPLE_LIMIT)
  assert.equal(bounded.qualification?.rejectedCount, 75)
  assert.equal(scoreDemandSource(bounded).subScore, 100)
})
test('SYNTHETIC qualification counts and stored indices cannot launder rejected items into a score', () => {
  const q = qualifyDemandSource(src('reddit', [{ ...item(), title: 'AI weather' }]), 'code review', NOW)
  q.qualification!.qualifiedCount = 1000; q.qualification!.qualifiedTotal = 1000; q.qualification!.qualifiedIndices = [0]
  assert.equal(scoreDemandSource(q).subScore, 0)
})

const json = (body: unknown) => Response.json(body)
async function mocked(handler: (url: string) => Response, run: () => Promise<void>) {
  const previous = globalThis.fetch
  globalThis.fetch = ((input: RequestInfo | URL) => Promise.resolve(handler(String(input)))) as typeof fetch
  try { await run() } finally { globalThis.fetch = previous }
}
for (const malformed of [{}, null, { data: {} }, { data: { children: {} } }, { data: { children: [{ data: { title: 'Need code review', permalink: '/r/a/comments/x/y/', created_utc: 'today' } }] } }]) {
  test(`SYNTHETIC Reddit HTTP200 rejects malformed envelope ${JSON.stringify(malformed)}`, async () => {
    await mocked(() => json(malformed), async () => assert.equal((await searchRedditPrimary('code review')).status, 'error'))
  })
}
for (const malformed of [{}, { hits: [], nbHits: -1 }, { hits: [], nbHits: '1' }, { hits: [{ title: 'x', objectID: '1', created_at: 'bad' }], nbHits: 1 }, { hits: [{ title: 'x', objectID: 'javascript:1', created_at: date(1) }], nbHits: 1 }]) {
  test(`SYNTHETIC HN HTTP200 rejects malformed envelope ${JSON.stringify(malformed)}`, async () => {
    await mocked(() => json(malformed), async () => assert.equal((await searchAskHN('code review')).status, 'error'))
  })
}
for (const malformed of [{}, { items: {} }, { items: [{ title: 'x', link: 'javascript:1', creation_date: 100 }] }, { items: [], error_id: 400 }]) {
  test(`SYNTHETIC SO HTTP200 rejects malformed list ${JSON.stringify(malformed)}`, async () => {
    await mocked(url => json(url.includes('filter=total') ? { total: 0 } : malformed), async () => assert.equal((await searchStackOverflow('code review')).status, 'error'))
  })
}
for (const malformed of [{}, { total: -1 }, { total: 1.2 }, { total: '100' }]) {
  test(`SYNTHETIC SO HTTP200 rejects malformed count ${JSON.stringify(malformed)}`, async () => {
    await mocked(url => json(url.includes('filter=total') ? malformed : { items: [] }), async () => assert.equal((await searchStackOverflow('code review')).status, 'error'))
  })
}
test('SYNTHETIC mirror preserves dropped-row rejection provenance and raw audit count', async () => {
  await mocked(() => json({ data: [{ title: 'Need code review help', permalink: '/r/a/comments/1/x/', created_utc: Math.floor(Date.now() / 1000) }, { title: 'broken' }] }), async () => {
    const r = await searchRedditMirror('code review')
    assert.equal(r.status, 'ok'); assert.equal(r.totalCount, 2); assert.equal(r.items.length, 1)
    assert.equal(r.qualification?.rejectedCount, 1)
    assert.deepEqual(r.qualification?.rejectedItems[0], { item: null, index: 1, reasons: ['malformed-row'], provenance: 'mirror' })
  })
})
test('SYNTHETIC valid empty contracts healthy at transport layer but epistemically abstain', async () => {
  await mocked(url => json(url.includes('algolia') ? { hits: [], nbHits: 0 } : url.includes('stackexchange') ? url.includes('filter=total') ? { total: 0 } : { items: [] } : { data: { children: [] } }), async () => {
    const results = await Promise.all([searchRedditPrimary('code review'), searchStackOverflow('code review'), searchAskHN('code review')])
    assert.ok(results.every(r => r.status === 'ok')); assert.equal(computeDemand(results).score, null)
  })
})
test('SYNTHETIC all source queries explicitly restrict one comparable annual window', async () => {
  const urls: URL[] = []
  await mocked(url => { urls.push(new URL(url)); return json(url.includes('pullpush') ? { data: [] } : url.includes('algolia') ? { hits: [], nbHits: 0 } : url.includes('stackexchange') ? url.includes('filter=total') ? { total: 0 } : { items: [] } : { data: { children: [] } }) }, async () => {
    await searchRedditPrimary('code review'); await searchRedditMirror('code review'); await searchStackOverflow('code review'); await searchAskHN('code review')
  })
  assert.equal(urls.find(u => u.hostname.includes('reddit.com'))?.searchParams.get('t'), 'year')
  const mirror = urls.find(u => u.hostname.includes('pullpush'))!
  assert.equal(Number(mirror.searchParams.get('before')) - Number(mirror.searchParams.get('after')), 365 * 86400)
  const so = urls.filter(u => u.hostname.includes('stackexchange'))
  assert.equal(so.length, 2); for (const u of so) assert.equal(Number(u.searchParams.get('todate')) - Number(u.searchParams.get('fromdate')), 365 * 86400)
  const hn = urls.find(u => u.hostname.includes('algolia'))!
  assert.match(hn.searchParams.get('numericFilters')!, /^created_at_i>=\d+,created_at_i<=\d+$/)
  assert.equal(hn.pathname, '/api/v1/search_by_date')
})
