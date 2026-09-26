import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { readObject, validIdea } from '../lib/core/input'
import { clientKey, RateLimiter } from '../lib/core/ratelimit'
import { admitScan } from '../lib/core/admission'
import { handleRpc } from '../lib/mcp'
import { issueReceipt, trustedReceipt, verifyReceipt } from '../lib/scoring/receipt'
import { computeCrowding } from '../lib/scoring/score'
import { searchPypi } from '../lib/sources/pypi'
import { canonicalUrl } from '../lib/core/dedup'
import { GET as mcpGet } from '../app/api/mcp/route'
import { toCsv } from '../lib/cohort'
import { POST as search } from '../app/api/search/route'
import { POST as compare } from '../app/api/compare/route'
import { POST as cohort } from '../app/api/cohort/route'
import { POST as verify } from '../app/api/verify/route'
import { POST as mcp } from '../app/api/mcp/route'
import type { EvidenceCapsule } from '../lib/types'
const request = (value: unknown, headers = {}) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(value), headers })
const capsule: EvidenceCapsule = { version: '1.1', query: 'code review', score: 10, confidence: 50, verdict: 'Open lane', searchedAt: '2026-09-26T00:00:00Z', evidenceLinks: [], disclaimer: 'heuristic' }
describe('public trust boundaries', () => {
  it('zero available sources means zero confidence', () => {
    assert.equal(computeCrowding('test', []).confidence, 0)
    assert.equal(computeCrowding('test', [{ source: 'github', label: 'GH', status: 'error', totalCount: 0, items: [] }]).confidence, 0)
  })
  it('does not report a challenged PyPI search as a healthy empty ecosystem', async () => {
    const original = globalThis.fetch
    try {
      globalThis.fetch = (async (url: string) => String(url).includes('/search/') ? new Response('<title>Client Challenge</title>') : new Response('', { status: 404 })) as typeof fetch
      assert.equal((await searchPypi('some obscure idea')).status, 'error')
    } finally { globalThis.fetch = original }
  })
  it('keeps distinct HN evidence instead of collapsing all item URLs', () => {
    assert.notEqual(canonicalUrl('https://news.ycombinator.com/item?id=1'), canonicalUrl('https://news.ycombinator.com/item?id=2'))
    assert.equal(canonicalUrl('https://arxiv.org/pdf/2401.00001.pdf'), canonicalUrl('https://arxiv.org/abs/2401.00001'))
    assert.equal(canonicalUrl('https://example.org/?id=1&utm_source=x'), 'example.org?id=1')
  })
  it('validates MCP Origin, protocol version, and SSE refusal', async () => {
    assert.equal((await mcp(request({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://evil.test' }))).status, 403)
    assert.equal((await mcp(request({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': 'bogus' }))).status, 400)
    assert.equal(mcpGet(new Request('http://localhost/api/mcp', { headers: { accept: 'text/event-stream' } })).status, 405)
  })
  it('rejects null, scalar and array request bodies without crashing', async () => {
    for (const handler of [search, compare, cohort, verify, mcp]) for (const value of [null, [], 5, 'text']) {
      assert.equal((await handler(request(value))).status, 400)
    }
  })
  it('bounds actual streamed bytes, not the claimed Content-Length', async () => {
    await assert.rejects(() => readObject(request({ q: 'a'.repeat(40000) }, { 'Content-Length': '1' })), /too large/)
  })
  it('rejects long and control-character queries', async () => {
    assert.equal(validIdea('a'.repeat(121)), false)
    assert.equal(validIdea('bad\nidea'), false)
    assert.equal((await search(request({ query: 'a'.repeat(121) }))).status, 400)
    assert.equal((await cohort(request({ ideas: ['valid idea', 2] }))).status, 400)
    assert.equal((await compare(request({ queries: ['a', 'b'] }))).status, 400)
  })
  it('arbitrary API keys cannot rotate rate-limit identities', () => {
    const a = request({}, { 'x-forwarded-for': '203.0.113.5', 'x-api-key': 'made-up-1' })
    const b = request({}, { 'x-forwarded-for': '203.0.113.5', 'x-api-key': 'made-up-2' })
    assert.equal(clientKey(a), clientKey(b))
    assert.ok(!clientKey(a).includes('203.0.113'))
  })
  it('charges weighted work atomically and bounds active key memory', () => {
    const r = new RateLimiter(3, 1000, 1)
    assert.equal(r.check('a', 0, 2).allowed, true)
    assert.equal(r.check('a', 1, 2).allowed, false)
    assert.equal(r.check('b', 2).allowed, false)
    assert.equal(r.check('a', 3).allowed, true)
    assert.equal(r.check('b', 1004).allowed, true)
  })
  it('rejects malformed RPC and batches without scan amplification', async () => {
    for (const value of [null, {}, { jsonrpc: '1.0', method: 'ping' }, { jsonrpc: '2.0', method: 'ping', params: [] }]) {
      assert.ok(JSON.stringify(await handleRpc(value as never)).includes('-32600'))
    }
    assert.equal((await mcp(request(Array.from({ length: 100 }, () => ({ method: 'tools/call' }))))).status, 400)
    let called = false
    assert.equal(await handleRpc({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'crowding_check', arguments: { idea: 'code review' } } }, (async () => { called = true }) as never), null)
    assert.equal(called, false)
  })
  it('distinguishes self-signed integrity from trusted issuer identity', () => {
    const a = generateKeyPairSync('ed25519'), b = generateKeyPairSync('ed25519')
    const pem = a.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const pub = a.publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const other = b.publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const receipt = issueReceipt(capsule, pem)
    assert.equal(receipt.issuedAt, capsule.searchedAt)
    assert.equal(verifyReceipt(capsule, receipt).signatureValid, true)
    assert.equal(trustedReceipt(capsule, receipt, pub), true)
    assert.equal(trustedReceipt(capsule, receipt, other), false)
    assert.equal(trustedReceipt({ ...capsule, score: 99 }, receipt, pub), false)
    assert.equal(trustedReceipt(capsule, { ...receipt, issuedAt: 'tomorrow' }, pub), false)
  })
  it('neutralizes spreadsheet formulas without dropping user text', () => {
    for (const idea of ['=HYPERLINK("https://bad")', '+SUM(1,2)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1']) {
      const csv = toCsv([{ idea, score: 3, confidence: 50, verdict: 'Open lane', quadrant: null, noveltyRank: 1, topEvidence: [] }])
      assert.ok(csv.includes('"\'' + idea.replace(/"/g, '""')))
    }
  })
  it('shared quota fails closed on missing configuration, timeout and invalid Redis replies', async () => {
    const names = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'REQUIRE_DISTRIBUTED_LIMITS'] as const
    const old = names.map((n) => process.env[n])
    try {
      delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN
      process.env.REQUIRE_DISTRIBUTED_LIMITS = 'true'
      assert.equal(await admitScan('test'), 'unavailable')
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'fake'
      for (const [result, expected] of [[1, 'ok'], [0, 'limited'], [null, 'unavailable']] as const) {
        assert.equal(await admitScan('test', 1, (async () => Response.json({ result })) as typeof fetch), expected)
      }
      assert.equal(await admitScan('test', 1, (async () => { throw new Error('timeout') }) as typeof fetch), 'unavailable')
    } finally { names.forEach((n, i) => { if (old[i] === undefined) delete process.env[n]; else process.env[n] = old[i] }) }
  })
})
