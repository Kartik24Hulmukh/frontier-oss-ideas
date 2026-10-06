import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SOURCE_ADAPTERS, SOURCE_ORDER } from '../lib/sources'
import { __resetSourceHealthForTests } from '../lib/core/pace'

const emptyFeed = '<feed xmlns="http://www.w3.org/2005/Atom"><opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:totalResults></feed>'
const secrets = 'sentinel-private-body-not-a-real-credential'

async function mocked<T>(fetcher: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch
  __resetSourceHealthForTests()
  globalThis.fetch = fetcher
  try { return await fn() } finally { globalThis.fetch = real; __resetSourceHealthForTests() }
}

for (const source of SOURCE_ORDER) {
  test(`${source}: malformed HTTP 200 envelope is error, never healthy zero`, async () => {
    for (const value of [{}, null, 3, { error: secrets }, { items: [] }]) {
      const result = await mocked((async () => Response.json(value)) as typeof fetch,
        () => SOURCE_ADAPTERS[source]('unknown lane', { timeoutMs: 100 }))
      assert.equal(result.status, 'error', `${source} accepted ${JSON.stringify(value)}`)
      assert.equal(result.totalCount, 0)
      assert.deepEqual(result.items, [])
      assert.doesNotMatch(JSON.stringify(result), new RegExp(secrets))
    }
  })

  test(`${source}: valid empty response stays healthy`, async () => {
    const result = await mocked((async (url) => {
      if (source === 'arxiv') return new Response(emptyFeed)
      if (source === 'pypi') {
        return String(url).includes('/search/')
          ? new Response('<html><body>No projects found</body></html>')
          : new Response('', { status: 404 })
      }
      const payloads = {
        github: { items: [], total_count: 0 },
        hackernews: { hits: [], nbHits: 0 },
        openalex: { results: [], meta: { count: 0 } },
        npm: { objects: [], total: 0 },
        crates: { crates: [], meta: { total: 0 } },
        huggingface: [],
      }
      return Response.json(payloads[source as keyof typeof payloads])
    }) as typeof fetch, () => SOURCE_ADAPTERS[source]('unknown lane', { timeoutMs: 100 }))
    assert.equal(result.status, 'ok')
    assert.equal(result.totalCount, 0)
    assert.deepEqual(result.items, [])
  })
}

test('arXiv rejects HTML, missing counts, broken entries and API-error feeds', async () => {
  for (const xml of [
    `<html><body>${secrets}</body></html>`,
    '<feed></feed>',
    '<feed><opensearch:totalResults>0</feed>',
    '<feed><opensearch:totalResults>-1</opensearch:totalResults></feed>',
    '<feed><opensearch:totalResults>1</opensearch:totalResults><entry><title>x</title></entry></feed>',
    '<feed><opensearch:totalResults>1</opensearch:totalResults><entry><id>http://arxiv.org/api/errors#bad_query</id><title>Error</title><published>2026-01-01</published></entry></feed>',
  ]) {
    const result = await mocked((async () => new Response(xml)) as typeof fetch,
      () => SOURCE_ADAPTERS.arxiv('unknown lane', {}))
    assert.equal(result.status, 'error')
    assert.doesNotMatch(JSON.stringify(result), new RegExp(secrets))
  }
})

test('arXiv preserves a non-empty Atom feed', async () => {
  const xml = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><opensearch:totalResults>1</opensearch:totalResults><entry><id>http://arxiv.org/abs/2601.00001v1</id><title>Test Paper</title><published>2026-01-01T00:00:00Z</published><summary>Test summary</summary></entry></feed>'
  const result = await mocked((async () => new Response(xml)) as typeof fetch,
    () => SOURCE_ADAPTERS.arxiv('test paper', {}))
  assert.equal(result.status, 'ok')
  assert.equal(result.items[0]?.title, 'Test Paper')
})

test('negative, unsafe or missing totals and wrong array types fail contracts', async () => {
  const cases = [
    ['github', { items: [], total_count: -1 }],
    ['hackernews', { hits: [], nbHits: '0' }],
    ['openalex', { results: [], meta: {} }],
    ['npm', { objects: {}, total: 0 }],
    ['crates', { crates: [], meta: { total: Number.MAX_SAFE_INTEGER + 1 } }],
    ['huggingface', [{ id: 'org/test', downloads: 'a lot' }]],
    ['pypi', { info: { name: 'example' }, releases: [] }],
  ] as const
  for (const [source, payload] of cases) {
    const result = await mocked((async () => Response.json(payload)) as typeof fetch,
      () => SOURCE_ADAPTERS[source]('unknown lane', {}))
    assert.equal(result.status, 'error', source)
  }
})

test('malformed non-empty row does not become invented or incomplete evidence', async () => {
  const cases = [
    ['github', { items: [{}], total_count: 1 }],
    ['hackernews', { hits: [{}], nbHits: 1 }],
    ['openalex', { results: [{}], meta: { count: 1 } }],
    ['npm', { objects: [{}], total: 1 }],
    ['crates', { crates: [{}], meta: { total: 1 } }],
    ['huggingface', [{}]],
    ['pypi', { info: {}, releases: {} }],
  ] as const
  for (const [source, payload] of cases) {
    const result = await mocked((async () => Response.json(payload)) as typeof fetch,
      () => SOURCE_ADAPTERS[source]('unknown lane', {}))
    assert.equal(result.status, 'error', source)
  }
})

test('Hugging Face cannot launder one malformed 200 endpoint through a valid other endpoint', async () => {
  for (const malformedPath of ['/api/models', '/api/datasets']) {
    const result = await mocked((async (url) => Response.json(String(url).includes(malformedPath) ? {} : [{ id: 'org/item' }])) as typeof fetch,
      () => SOURCE_ADAPTERS.huggingface('unknown lane', {}))
    assert.equal(result.status, 'error')
    assert.deepEqual(result.items, [])
  }
})

test('PyPI malformed exact-name response cannot be laundered by valid empty HTML search', async () => {
  const result = await mocked((async (url) => String(url).includes('/search/')
    ? new Response('No projects found')
    : Response.json({ info: {}, releases: {} })) as typeof fetch,
  () => SOURCE_ADAPTERS.pypi('unknown lane', {}))
  assert.equal(result.status, 'error')
})

test('OpenAlex malformed preferred title cannot override a valid fallback string', async () => {
  const result = await mocked((async () => Response.json({
    meta: { count: 1 },
    results: [{ display_name: {}, title: 'valid', id: 'https://openalex.org/W1' }],
  })) as typeof fetch, () => SOURCE_ADAPTERS.openalex('unknown lane', {}))
  assert.equal(result.status, 'error')
  assert.deepEqual(result.items, [])
})

test('OpenAlex empty preferred title uses the validated fallback', async () => {
  const result = await mocked((async () => Response.json({
    meta: { count: 1 },
    results: [{ display_name: '', title: 'Valid fallback', id: 'https://openalex.org/W1' }],
  })) as typeof fetch, () => SOURCE_ADAPTERS.openalex('unknown lane', {}))
  assert.equal(result.status, 'ok')
  assert.equal(result.items[0]?.title, 'Valid fallback')
})

test('PyPI rejects null/scalar file records even when HTML search is valid empty', async () => {
  for (const file of [null, 3, 'bad file', { upload_time_iso_8601: {} }]) {
    const result = await mocked((async (url) => String(url).includes('/search/')
      ? new Response('No projects found')
      : Response.json({ info: { name: 'example' }, releases: { '1.0': [file] } })) as typeof fetch,
    () => SOURCE_ADAPTERS.pypi('unknown lane', {}))
    assert.equal(result.status, 'error')
    assert.deepEqual(result.items, [])
  }
})

test('GitHub incomplete search remains inspectable but exposes partial-evidence notice', async () => {
  const result = await mocked((async () => Response.json({
    total_count: 0, items: [], incomplete_results: true,
  })) as typeof fetch, () => SOURCE_ADAPTERS.github('unknown lane', {}))
  assert.equal(result.status, 'ok')
  assert.match(result.notice ?? '', /Partial GitHub evidence.*incomplete/)
})