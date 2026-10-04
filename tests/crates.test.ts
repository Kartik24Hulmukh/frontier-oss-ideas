import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchCrates, CRATES_USER_AGENT } from '../lib/sources/crates'
import { __resetSourceHealthForTests } from '../lib/core/pace'

test('crates adapter maps crates.io rows, sends identifying UA and paces via shared guard', async () => {
  const real = globalThis.fetch
  __resetSourceHealthForTests()
  let seenUA = ''
  let seenUrl = ''
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    seenUrl = String(url)
    seenUA = new Headers(init?.headers).get('User-Agent') ?? ''
    return Response.json({ crates: [
      { name: 'vecdb', description: ' Embedded vector DB ', updated_at: new Date().toISOString(), recent_downloads: 1234, exact_match: true },
      { name: 'other', description: null, updated_at: null, recent_downloads: null },
      { name: '' },
    ], meta: { total: 42 } })
  }) as typeof fetch
  try {
    const r = await searchCrates('vector database', { timeoutMs: 100 })
    assert.equal(r.status, 'ok')
    assert.equal(r.source, 'crates')
    assert.equal(r.totalCount, 42)
    assert.equal(r.items.length, 2)
    assert.equal(r.items[0].url, 'https://crates.io/crates/vecdb')
    assert.equal(r.items[0].description, 'Embedded vector DB')
    assert.equal(r.items[0].relevance, 1)
    assert.match(r.items[0].meta ?? '', /1,234 recent downloads/)
    assert.equal(seenUA, CRATES_USER_AGENT)
    assert.match(seenUrl, /^https:\/\/crates\.io\/api\/v1\/crates\?/)
  } finally { globalThis.fetch = real; __resetSourceHealthForTests() }
})

test('crates adapter reports 429 as rate_limited and 5xx as error, never as empty ecosystem', async () => {
  const real = globalThis.fetch
  __resetSourceHealthForTests()
  try {
    globalThis.fetch = (async () => new Response('slow down', { status: 429 })) as typeof fetch
    const limited = await searchCrates('x', { timeoutMs: 100 })
    assert.equal(limited.status, 'rate_limited')
    __resetSourceHealthForTests()
    globalThis.fetch = (async () => new Response('boom', { status: 503 })) as typeof fetch
    const broken = await searchCrates('x', { timeoutMs: 100 })
    assert.equal(broken.status, 'error')
    assert.equal(broken.items.length, 0)
  } finally { globalThis.fetch = real; __resetSourceHealthForTests() }
})
