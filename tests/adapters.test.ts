import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { searchGitHub } from '../lib/sources/github'
import { searchOpenAlex } from '../lib/sources/openalex'
import { searchHuggingFace } from '../lib/sources/huggingface'

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch
  globalThis.fetch = handler as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

describe('source adapter contracts', () => {
  it('encodes GitHub queries and sends bearer auth server-side', async () => {
    let capturedUrl = ''
    let capturedHeaders: HeadersInit | undefined
    const restore = mockFetch((url, init) => {
      capturedUrl = url
      capturedHeaders = init?.headers
      return Response.json({ total_count: 0, items: [] })
    })
    try {
      const result = await searchGitHub('AI code review & security', {
        githubToken: 'test-token',
        timeoutMs: 100,
      })
      assert.equal(result.status, 'ok')
      assert.match(capturedUrl, /AI%20code%20review%20%26%20security/)
      assert.equal((capturedHeaders as Record<string, string>).Authorization, 'Bearer test-token')
    } finally {
      restore()
    }
  })

  it('falls back to anonymous GitHub search when the deployment token is rejected (401)', async () => {
    const auths: (string | undefined)[] = []
    const restore = mockFetch((_url, init) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
      auths.push(auth)
      if (auth) return new Response('Bad credentials', { status: 401 })
      return Response.json({ total_count: 1, items: [{ full_name: 'a/b', description: null, html_url: 'https://github.com/a/b', created_at: '2026-01-01T00:00:00Z', stargazers_count: 5, pushed_at: '2026-09-01T00:00:00Z' }] })
    })
    try {
      const result = await searchGitHub('AI code review agent', { githubToken: 'revoked', timeoutMs: 100 })
      assert.equal(result.status, 'ok')
      assert.equal(result.totalCount, 1)
      assert.deepEqual(auths, ['Bearer revoked', undefined])
      assert.match(result.notice ?? '', /401/)
      assert.doesNotMatch(JSON.stringify(result), /revoked/)
    } finally {
      restore()
    }
  })

  it('passes OpenAlex API key and normalizes evidence URLs', async () => {
    let capturedUrl = ''
    const restore = mockFetch((url) => {
      capturedUrl = url
      return Response.json({
        meta: { count: 1 },
        results: [
          {
            display_name: 'Idea Twins',
            publication_date: '2026-01-01',
            cited_by_count: 12,
            doi: 'https://doi.org/10.1000/example',
            primary_location: null,
          },
        ],
      })
    })
    try {
      const result = await searchOpenAlex('idea twins', {
        openAlexApiKey: 'key-123',
        openAlexMailto: 'test@example.com',
        timeoutMs: 100,
      })
      assert.equal(result.status, 'ok')
      assert.match(capturedUrl, /api_key=key-123/)
      assert.equal(result.items[0]?.url, 'https://doi.org/10.1000/example')
    } finally {
      restore()
    }
  })

  it('merges Hugging Face models and datasets into one source result', async () => {
    const restore = mockFetch((url) => {
      if (url.includes('/api/models')) {
        return Response.json([
          { id: 'org/model', downloads: 1500, likes: 20, lastModified: '2026-01-01' },
        ])
      }
      return Response.json([
        { id: 'org/dataset', downloads: 500, likes: 3, lastModified: '2026-01-02' },
      ])
    })
    try {
      const result = await searchHuggingFace('crowding', { timeoutMs: 100 })
      assert.equal(result.status, 'ok')
      assert.equal(result.items.length, 2)
      assert.match(result.items[0]?.url ?? '', /^https:\/\/huggingface\.co\//)
    } finally {
      restore()
    }
  })
})


it('partial Hugging Face responses retain evidence but flag degraded coverage', async () => {
  for (const failed of ['/api/models', '/api/datasets']) {
    const restore = mockFetch(url => url.includes(failed) ? new Response('', { status: 503 }) : Response.json([{ id: 'org/item' }]))
    try {
      const result = await searchHuggingFace('partial test')
      assert.equal(result.status, 'ok')
      assert.equal(result.items.length, 1)
      assert.match(result.notice ?? '', /Partial Hugging Face/)
    } finally { restore() }
  }
})
it('PyPI exact-name success cannot conceal challenged ecosystem search', async () => {
  const { searchPypi } = await import('../lib/sources/pypi')
  const restore = mockFetch(url => url.includes('/search/') ? new Response('Client Challenge') : Response.json({ info: { name: 'example', package_url: 'https://pypi.org/project/example/' }, releases: {} }))
  try {
    const result = await searchPypi('example')
    assert.equal(result.status, 'ok')
    assert.equal(result.items.length, 1)
    assert.match(result.notice ?? '', /exact-name evidence only/)
  } finally { restore() }
})
it('Stack Overflow top hits cannot conceal an unavailable total count', async () => {
  const { searchStackOverflow } = await import('../lib/demand')
  const restore = mockFetch(url => url.includes('filter=total') ? new Response('', { status: 403 }) : Response.json({ items: [] }))
  try {
    const result = await searchStackOverflow('partial count')
    assert.equal(result.status, 'ok')
    assert.match(result.notice ?? '', /top hits only/)
  } finally { restore() }
})
