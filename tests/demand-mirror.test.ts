import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { searchReddit, demandStatusLabel, scoreDemandSource, computeDemand, DEMAND_WEIGHTS, REDDIT_MIRROR_WEIGHT_FACTOR } from '../lib/demand'

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  const original = globalThis.fetch
  globalThis.fetch = ((input: RequestInfo | URL) => handler(String(input))) as typeof fetch
  return () => { globalThis.fetch = original }
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const now = Math.floor(Date.now() / 1000)
const mirrorRows = { data: [
  { title: 'Need an MCP crowding tool', permalink: '/r/LocalLLaMA/comments/a/x/', created_utc: now - 86400, score: 40, num_comments: 22, subreddit: 'LocalLLaMA', selftext: 'looking for one' },
  { title: 'broken row without permalink' },
] }

describe('reddit demand mirror fallback', () => {
  it('uses primary when reddit answers and marks provenance primary', async () => {
    const restore = mockFetch((url) => url.includes('pullpush') ? json({ data: [] }) : json({ data: { children: [] } }))
    try {
      const r = await searchReddit('mcp crowding primary-ok')
      assert.equal(r.status, 'ok')
      assert.equal(r.provenance, 'primary')
      assert.equal(demandStatusLabel(r), 'healthy')
    } finally { restore() }
  })

  it('falls back to the mirror on anonymous 403, labels it, and down-weights it', async () => {
    const restore = mockFetch((url) => url.includes('pullpush') ? json(mirrorRows) : new Response('blocked', { status: 403 }))
    try {
      const r = await searchReddit('mcp crowding mirror-ok')
      assert.equal(r.status, 'ok')
      assert.equal(r.provenance, 'mirror')
      assert.equal(r.items.length, 1, 'malformed rows are dropped, not fabricated')
      assert.match(r.notice ?? '', /Primary Reddit unavailable/)
      assert.equal(demandStatusLabel(r), 'degraded')
      const b = scoreDemandSource(r)
      assert.equal(b.included, true)
      assert.equal(b.weight, DEMAND_WEIGHTS.reddit * REDDIT_MIRROR_WEIGHT_FACTOR)
      assert.match(b.signal, /archive mirror/)
    } finally { restore() }
  })

  it('stacks reasons and preserves blocked classification when the mirror also fails', async () => {
    const restore = mockFetch((url) => url.includes('pullpush') ? json({ oops: true }) : new Response('blocked', { status: 403 }))
    try {
      const r = await searchReddit('mcp crowding mirror-malformed')
      assert.equal(r.status, 'error')
      assert.match(r.errorMessage ?? '', /blocks anonymous/)
      assert.match(r.errorMessage ?? '', /Mirror fallback also failed: .*malformed/)
      assert.equal(demandStatusLabel(r), 'blocked')
      const d = computeDemand([r])
      assert.equal(d.score, null, 'no demand is fabricated when every path fails')
    } finally { restore() }
  })

  it('honours REDDIT_MIRROR_DISABLED', async () => {
    process.env.REDDIT_MIRROR_DISABLED = 'true'
    let mirrorCalled = false
    const restore = mockFetch((url) => { if (url.includes('pullpush')) { mirrorCalled = true; return json(mirrorRows) } return new Response('x', { status: 403 }) })
    try {
      const r = await searchReddit('mcp crowding disabled')
      assert.equal(r.status, 'error')
      assert.equal(mirrorCalled, false)
    } finally { restore(); delete process.env.REDDIT_MIRROR_DISABLED }
  })
})
