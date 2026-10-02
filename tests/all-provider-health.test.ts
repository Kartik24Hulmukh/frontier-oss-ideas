import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runAllSources, SOURCE_ORDER } from '../lib/sources'
import { sourceHealth, __resetSourceHealthForTests } from '../lib/core/pace'

test('all seven supply adapters dispatch through source health instrumentation', async () => {
  const real = globalThis.fetch
  __resetSourceHealthForTests()
  globalThis.fetch = (async (url) => {
    const u = String(url)
    if (u.includes('arxiv.org')) return new Response('<feed><opensearch:totalResults>0</opensearch:totalResults></feed>')
    if (u.includes('huggingface.co')) return Response.json([])
    if (u.includes('pypi.org')) return Response.json({ info: { name: 'test', summary: '', project_urls: {} }, releases: {} })
    return Response.json({ items: [], total_count: 0, hits: [], nbHits: 0, results: [], meta: { count: 0 }, objects: [], total: 0 })
  }) as typeof fetch
  try {
    await runAllSources('test', { timeoutMs: 100 })
    assert.deepEqual(sourceHealth().providers.map(p => p.provider).sort(), [...SOURCE_ORDER].sort())
    assert.ok(sourceHealth().providers.every(p => p.requests >= 1))
    assert.equal(sourceHealth().status, 'healthy')
  } finally { globalThis.fetch = real; __resetSourceHealthForTests() }
})
