import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { TTLCache, InFlight } from '../lib/core/cache'
import { RateLimiter } from '../lib/core/ratelimit'
import { expandQuery, termSimilarity } from '../lib/core/expand'
import { canonicalUrl, dedupeAcrossSources } from '../lib/core/dedup'
import { computeDemand, trendOf } from '../lib/demand'
import { qualifyDemandSource } from '../lib/demand/qualification'
import { quadrantFor } from '../lib/scoring/quadrant'
import { digestCapsule, issueReceipt, verifyReceipt } from '../lib/scoring/receipt'
import { handleRpc, TOOLS } from '../lib/mcp'
import { findCollisions, mapLimit, rankCohort, toCsv } from '../lib/cohort'
import { GOLD_SET, pairwiseAgreement, spearman } from '../lib/calibration/gold-set'
import { computeCrowding } from '../lib/scoring/score'
import { mergeSource } from '../lib/scan'
import type { DemandSourceResult, EvidenceCapsule, SourceResult } from '../lib/types'

const now = () => new Date().toISOString()

describe('cache + rate limit', () => {
  it('expires and evicts LRU', () => {
    const c = new TTLCache<number>(2, 1000)
    c.set('a', 1, 1000, 0)
    c.set('b', 2, 1000, 0)
    c.get('a', 1)
    c.set('c', 3, 1000, 2)
    assert.equal(c.get('b', 3), undefined)
    assert.equal(c.get('a', 3), 1)
    assert.equal(c.get('a', 5000), undefined)
  })
  it('coalesces in-flight work', async () => {
    const f = new InFlight<number>()
    let calls = 0
    const work = async () => { calls++; return 7 }
    const [a, b] = await Promise.all([f.run('k', work), f.run('k', work)])
    assert.equal(a + b, 14)
    assert.equal(calls, 1)
  })
  it('limits per key in a sliding window', () => {
    const rl = new RateLimiter(2, 1000)
    assert.ok(rl.check('x', 0).allowed)
    assert.ok(rl.check('x', 10).allowed)
    const third = rl.check('x', 20)
    assert.equal(third.allowed, false)
    assert.ok(third.retryAfterSec >= 1)
    assert.ok(rl.check('x', 1500).allowed)
    assert.ok(rl.check('y', 20).allowed)
  })
})

describe('query expansion + dedup', () => {
  it('expands code review synonyms and keeps original first', () => {
    const out = expandQuery('AI code review agent')
    assert.equal(out[0], 'AI code review agent')
    assert.ok(out.some((v) => v.includes('pull request review')))
    assert.ok(out.length <= 4)
  })
  it('returns only the original for unknown vocabulary', () => {
    assert.deepEqual(expandQuery('bagpipe tuning'), ['bagpipe tuning'])
  })
  it('canonicalizes arxiv and github urls', () => {
    assert.equal(canonicalUrl('https://arxiv.org/pdf/2401.00001v2.pdf'), canonicalUrl('https://arxiv.org/abs/2401.00001'))
    assert.equal(canonicalUrl('https://www.github.com/a/b/tree/main'), 'github.com/a/b')
  })
  it('collapses cross-source duplicates', () => {
    const item = { title: 'acme/review-bot', description: null, url: 'https://github.com/acme/review-bot', date: now(), meta: null }
    const s: SourceResult[] = [
      { source: 'github', label: 'GH', status: 'ok', totalCount: 1, items: [item] },
      { source: 'hackernews', label: 'HN', status: 'ok', totalCount: 1, items: [{ ...item, url: 'https://github.com/acme/review-bot/' }] },
    ]
    const { sources, collapsed } = dedupeAcrossSources(s)
    assert.equal(collapsed, 1)
    assert.equal(sources[1].items.length, 0)
  })
  it('merges variant results without duplicating urls', () => {
    const a: SourceResult = { source: 'github', label: 'GH', status: 'ok', totalCount: 5, items: [{ title: 'x', description: null, url: 'u1', date: null, meta: null }] }
    const b: SourceResult = { ...a, totalCount: 9, items: [...a.items, { title: 'y', description: null, url: 'u2', date: null, meta: null }] }
    const m = mergeSource(a, b)
    assert.equal(m.items.length, 2)
    assert.equal(m.totalCount, 9)
    assert.equal(mergeSource(a, { ...b, status: 'error' }).items.length, 1)
  })
  it('measures term similarity', () => {
    assert.ok(termSimilarity('AI code review agent', 'code review agent for AI') > 0.7)
    assert.equal(termSimilarity('bagpipe', 'terraform'), 0)
  })
})

function demandSrc(source: DemandSourceResult['source'], total: number, n: number, monthsBack = 1): DemandSourceResult {
  const d = new Date(Date.now() - monthsBack * 30 * 864e5).toISOString()
  return qualifyDemandSource({ source, label: source, status: 'ok', totalCount: total, items: Array.from({ length: n }, (_, i) => ({ title: 'Need code review help ' + i, description: null, url: `https://example.test/${source}/${i}`, date: d, meta: source === 'reddit' ? '5 upvotes · 25 comments' : source === 'askhn' ? 'Ask HN · 10 points' : '1,000 views · 1 answers' })) }, 'code review')
}

describe('demand + quadrant', () => {
  it('scores hot demand higher than cold demand', () => {
    const hot = computeDemand([demandSrc('reddit', 25, 10), demandSrc('stackoverflow', 5000, 10), demandSrc('askhn', 800, 10)])
    const cold = computeDemand([demandSrc('reddit', 0, 0), demandSrc('stackoverflow', 0, 0), demandSrc('askhn', 0, 0)])
    assert.equal(hot.score, 40, '10 observed qualified items / bounded sample 25; raw totals and views do not boost score')
    assert.equal(cold.score, null, 'empty samples establish neither demand nor its absence')
    assert.equal(hot.coverage, 100)
  })
  it('excludes failed demand sources and returns null when all fail', () => {
    const failed: DemandSourceResult = { source: 'reddit', label: 'r', status: 'error', totalCount: 0, items: [] }
    const r = computeDemand([failed, { ...failed, source: 'askhn' }, { ...failed, source: 'stackoverflow' }])
    assert.equal(r.score, null)
    assert.equal(r.coverage, 0)
  })
  it('abstains on trend from non-comparable ranked snippets', () => {
    assert.equal(trendOf([demandSrc('reddit', 6, 6, 1), demandSrc('askhn', 1, 1, 9)]), 'unknown')
    assert.equal(trendOf([demandSrc('reddit', 1, 1, 1)]), 'unknown')
  })
  it('maps all four quadrants and the null case', () => {
    assert.equal(quadrantFor(20, 70).quadrant, 'Blue Ocean')
    assert.equal(quadrantFor(80, 70).quadrant, 'Gold Rush')
    assert.equal(quadrantFor(20, 10).quadrant, 'Ghost Town')
    assert.equal(quadrantFor(80, 10).quadrant, 'Bloodbath')
    assert.equal(quadrantFor(80, 45, 'falling').quadrant, 'Bloodbath')
    assert.equal(quadrantFor(50, null).quadrant, null)
  })
})

describe('receipts', () => {
  const capsule: EvidenceCapsule = { version: '1.1', query: 'x', score: 10, confidence: 50, verdict: 'Open lane', searchedAt: '2026-09-26T00:00:00.000Z', evidenceLinks: [], disclaimer: 'd' }
  it('digest is stable regardless of key order', () => {
    const reordered = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(capsule).reverse())))
    assert.equal(digestCapsule(capsule), digestCapsule(reordered))
  })
  it('detects tampering and verifies ed25519 signatures', () => {
    const { privateKey } = generateKeyPairSync('ed25519')
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const receipt = issueReceipt(capsule, pem)
    assert.equal(receipt.algorithm, 'ed25519+sha256')
    assert.deepEqual(verifyReceipt(capsule, receipt), { digestMatches: true, signatureValid: true })
    assert.equal(verifyReceipt({ ...capsule, score: 99 }, receipt).digestMatches, false)
    assert.equal(issueReceipt(capsule).signature, null)
  })
})

describe('MCP server', () => {
  const fake = async (q: string) => {
    const r = computeCrowding(q, [{ source: 'github', label: 'GH', status: 'ok', totalCount: 0, items: [] }])
    return { ...r, quadrant: quadrantFor(r.score, 70) }
  }
  it('initializes and lists crowding_check', async () => {
    const init = await handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize' }, fake as never)
    assert.ok(JSON.stringify(init).includes('simultaneity-index'))
    const list = (await handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, fake as never)) as { result: { tools: typeof TOOLS } }
    assert.equal(list.result.tools[0].name, 'crowding_check')
  })
  it('calls the tool and returns text + structured capsule', async () => {
    const res = (await handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'crowding_check', arguments: { idea: 'bagpipe tuning' } } }, fake as never)) as { result: { content: Array<{ text: string }>; structuredContent: { query: string } } }
    assert.match(res.result.content[0].text, /Simultaneity \d+\/100/)
    assert.equal(res.result.structuredContent.query, 'bagpipe tuning')
  })
  it('handles notifications, bad tools and unknown methods', async () => {
    assert.equal(await handleRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, fake as never), null)
    assert.ok(JSON.stringify(await handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } }, fake as never)).includes('-32602'))
    assert.ok(JSON.stringify(await handleRpc({ jsonrpc: '2.0', id: 5, method: 'bogus' }, fake as never)).includes('-32601'))
  })
})

describe('cohort + calibration', () => {
  it('finds idea twins and ranks by novelty', async () => {
    const c = findCollisions(['AI code review agent', 'AI code review agent for Terraform', 'bagpipe tuning'])
    assert.equal(c.length, 1)
    const out = await mapLimit([3, 1, 2], 2, async (n) => n * 2)
    assert.deepEqual(out, [6, 2, 4])
    const mk = (score: number) => ({ ...computeCrowding('x', []), score })
    const rows = rankCohort([{ idea: 'hot', result: mk(90) }, { idea: 'cold', result: mk(5) }])
    assert.equal(rows[0].idea, 'cold')
    assert.ok(toCsv(rows).startsWith('novelty_rank'))
  })
  it('spearman and pairwise agreement behave', () => {
    assert.equal(Math.round(spearman([1, 2, 3], [10, 20, 30]) * 100), 100)
    assert.equal(Math.round(spearman([1, 2, 3], [30, 20, 10]) * 100), -100)
    assert.equal(pairwiseAgreement([1, 2, 3], [90, 50, 10]), 1)
    assert.ok(GOLD_SET.length >= 20)
    assert.equal(new Set(GOLD_SET.map((g) => g.rank)).size, GOLD_SET.length)
  })
})
