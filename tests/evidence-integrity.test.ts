import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeCrowding } from '../lib/scoring/score'
import { computeWedges } from '../lib/scoring/wedge'
import { qualifiedItems, parseStars } from '../lib/scoring/evidence'
import type { SourceId, SourceResult, ScoreBreakdown } from '../lib/types'

const ids: SourceId[] = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface', 'crates']
const source = (id: SourceId, relevance = 1, status: SourceResult['status'] = 'ok', totalCount = 500, meta = '150 stars'): SourceResult => ({
  source: id, label: id, status, totalCount,
  items: [{ title: 'offline code review', description: 'privacy CLI API', url: 'https://example.org/evidence', meta, date: '2026-10-01T00:00:00Z', relevance, isLaunchSignal: true }],
  relevanceFilter: { before: 1, after: 1, qualified: relevance >= 0.18 ? 1 : 0, threshold: 0.18 },
})
// 512 deterministic synthetic combinations. This is not customer research or load evidence.
for (const id of ids) for (const status of ['ok', 'error'] as const) for (const relevance of [0, 0.17, 0.18, 1]) for (const count of [0, 1, 1000, 2_000_000]) for (const meta of ['150 stars', 'last push 2026-10-01']) {
  test(`qualified integrity ${id}/${status}/${relevance}/${count}/${meta}`, () => {
    const s = source(id, relevance, status, count, meta)
    const r = computeCrowding('code review', [s])
    assert.ok(r.score >= 0 && r.score <= 100)
    assert.ok(r.confidence >= 0 && r.confidence <= 100)
    assert.equal(r.capsule.modelVersion, 'crowding-1.4')
    assert.equal(r.sources[0].totalCount, count, 'audit count preserved')
    if (status !== 'ok' || relevance < 0.18) {
      assert.equal(r.score, 0)
      assert.equal(r.confidence, 0)
      assert.deepEqual(r.subLanes, [])
      assert.equal(r.wedges.length, 1)
      assert.equal(r.wedges[0].title, 'Collect more signal')
      assert.equal(r.timeline.latest, null)
    } else {
      assert.equal(qualifiedItems(s).length, 1)
      assert.ok(r.subLanes?.every(l => l.sampled === 1 && l.confidence === 'insufficient' && !l.buildHere))
    }
  })
}
const row = (s: SourceResult, subScore: number): ScoreBreakdown => ({ source: s.source, label: s.label, subScore, weight: 0.1, included: s.status === 'ok', signal: 'synthetic fixture' })
test('ecosystem gaps require both healthy comparison channels and reject notices', () => {
  for (const [dense, sparse, title] of [['npm','pypi','Python/ML-native packaging gap'], ['pypi','npm','Developer UX / web surface gap'], ['huggingface','github','From models to product']] as const) {
    const a = source(dense); const b = source(sparse)
    for (const failure of ['error', 'rate_limited', 'notice', 'missing'] as const) {
      const altered = { ...b, ...(failure === 'notice' ? { notice: 'partial fallback' } : { status: failure === 'missing' ? 'ok' as const : failure }) }
      const ss = failure === 'missing' ? [a] : [a, altered]
      assert.ok(!computeWedges('code review', 45, 'Early movers', ss, ss.map(s => row(s, s.source === dense ? 60 : 0))).some(w => w.title === title))
    }
    assert.ok(computeWedges('code review', 45, 'Early movers', [a,b], [row(a,60),row(b,0)]).some(w => w.title === title))
  }
})
test('dates/downloads never become GitHub traction and audit launch signals never become launches', () => {
  for (const meta of [null, 'last push 2026-10-01', '900 downloads', '49 stars']) assert.ok(parseStars(meta) < 50)
  assert.equal(parseStars('2,400 stars · last push 2026-10-01'), 2400)
  const gh = source('github'); gh.items = Array.from({length:3}, () => ({...gh.items[0], meta: 'last push 2026-10-01'}))
  const hn = source('hackernews',0)
  const ws = computeWedges('code review', 45, 'Early movers', [gh,hn], [row(gh,45),row(hn,0)])
  assert.ok(!ws.some(w => w.title === 'Niche ICP specialization'))
  assert.ok(ws.some(w => w.title === 'Quiet builders, no public launch'))
  assert.ok(!computeWedges('code review',45,'Early movers',[gh,{...hn,status:'error'}],[row(gh,45),row(hn,0)]).some(w => w.title === 'Quiet builders, no public launch'))
})

test('unobserved supply never yields a market quadrant even with high discussion heat', async () => {
  const { quadrantFor } = await import('../lib/scoring/quadrant')
  for (const heat of [null,0,39,40,100]) assert.equal(quadrantFor(0,heat,'unknown',false).quadrant,null)
  assert.equal(quadrantFor(20,70,'unknown',true).quadrant,'Blue Ocean')
  assert.ok(!quadrantFor(20,70).action.includes('Move now'))
})

test('one weak or genuine observation cannot revive maximum confidence or support analyst citations from audit floors', async () => {
  const { evidenceTable } = await import('../lib/llm/analyst')
  const sources: SourceResult[]=ids.map(id=>({...source(id),totalCount:0,items:[]}))
  sources[0]=source('github',0.29,'ok',1); sources[0].items[0].meta=null; sources[0].items[0].date=null
  const r=computeCrowding('AI code review agent',sources)
  assert.ok(r.confidence<=5,`sparse confidence=${r.confidence}`)
  const audit=computeCrowding('code review',[source('github',0.1),source('hackernews',1,'error')])
  assert.deepEqual(audit.capsule.evidenceLinks,[]); assert.deepEqual(evidenceTable(audit),[])
})
test('query merges preserve primary, variant and unavailable-query caveats', async () => {
  const { mergeSource } = await import('../lib/scan')
  const primary=source('github'), variant={...source('github'),notice:'partial variant'}
  assert.match(mergeSource(primary,variant).notice!,/partial variant/)
  assert.match(mergeSource({...primary,status:'error'},variant).notice!,/Primary query unavailable/)
  assert.match(mergeSource(primary,{...variant,status:'error'}).notice!,/variant unavailable/)
  assert.match(mergeSource({...primary,notice:'primary fallback'},variant).notice!,/primary fallback.*partial variant/)
})
