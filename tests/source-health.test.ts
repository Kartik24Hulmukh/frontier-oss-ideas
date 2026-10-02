// Operational source health: breaker snapshots are read-only and surface
// per-provider state without URLs, query text or credentials.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { CircuitBreaker } from '../lib/core/budget'
import { pacedFetch, sourceHealth, __resetSourceHealthForTests } from '../lib/core/pace'

describe('CircuitBreaker.snapshot', () => {
  it('reports closed, open with retry delay, then half-open without consuming the probe', () => {
    const b = new CircuitBreaker(2, 1000)
    assert.deepEqual(b.snapshot('p', 0), { state: 'closed', failures: 0, retryInMs: 0 })
    b.onFailure('p', 0)
    assert.equal(b.snapshot('p', 0).state, 'closed')
    b.onFailure('p', 10)
    assert.deepEqual(b.snapshot('p', 110), { state: 'open', failures: 2, retryInMs: 900 })
    assert.equal(b.snapshot('p', 1010).state, 'half-open')
    // Snapshot must not steal the single half-open probe.
    assert.equal(b.canRequest('p', 1010), true)
  })
})

describe('sourceHealth', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => {
    __resetSourceHealthForTests()
    globalThis.fetch = realFetch
  })

  it('is unobserved before traffic', () => {
    assert.deepEqual(sourceHealth(), { status: 'unobserved', scope: 'per-instance', providers: [] })
  })

  it('marks healthy after success and degraded once a breaker opens on 429/5xx/network errors', async () => {
    globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch
    await pacedFetch('alpha', 'https://example.test/a?q=secret-query')
    let h = sourceHealth()
    assert.equal(h.status, 'healthy')
    assert.equal(h.providers[0].provider, 'alpha')
    assert.equal(h.providers[0].lastStatus, 200)
    assert.ok(!JSON.stringify(h).includes('secret-query'))

    let n = 0
    globalThis.fetch = (async () => {
      n += 1
      if (n === 1) throw new TypeError('network down')
      return new Response('busy', { status: n === 2 ? 429 : 503 })
    }) as typeof fetch
    await assert.rejects(pacedFetch('beta', 'https://example.test/b'))
    await pacedFetch('beta', 'https://example.test/b')
    await pacedFetch('beta', 'https://example.test/b')
    h = sourceHealth()
    assert.equal(h.status, 'degraded')
    const beta = h.providers.find((p) => p.provider === 'beta')!
    assert.equal(beta.state, 'open')
    assert.equal(beta.failures, 3)
    assert.equal(beta.requests, 3)
    assert.ok(beta.retryInMs > 0)
    await assert.rejects(pacedFetch('beta', 'https://example.test/b'), /circuit open/)
    globalThis.fetch = realFetch
  })
})
