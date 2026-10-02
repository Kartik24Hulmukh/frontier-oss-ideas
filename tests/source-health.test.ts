// Operational source health: breaker snapshots are read-only and surface
// per-provider state without URLs, query text or credentials.
import { describe, it, beforeEach, afterEach } from 'node:test'
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
  afterEach(() => { globalThis.fetch = realFetch; __resetSourceHealthForTests() })
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


describe('source health truthfulness and recovery', () => {
  const realFetch = globalThis.fetch
  const realNow = Date.now
  const saved = { ...process.env }
  let now = 1_000_000
  beforeEach(() => {
    __resetSourceHealthForTests()
    now = 1_000_000
    Date.now = () => now
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    Date.now = realNow
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
    Object.assign(process.env, saved)
    __resetSourceHealthForTests()
  })

  it('reports degraded on the first retryable failure, not just an open breaker', async () => {
    globalThis.fetch = (async () => new Response('busy', { status: 503 })) as typeof fetch
    await pacedFetch('single', 'https://example.test')
    assert.equal(sourceHealth().status, 'degraded')
    assert.equal(sourceHealth().providers[0].state, 'closed')
    assert.equal(sourceHealth().providers[0].lastSuccessAt, null)
  })

  it('never labels non-2xx HTTP responses successful (100 status/provider scenarios)', async () => {
    const statuses = [200, 204, 301, 302, 400, 401, 403, 404, 429, 503]
    for (let i = 0; i < 100; i++) {
      const status = statuses[i % statuses.length]
      const provider = 'status' + i
      globalThis.fetch = (async () => new Response(null, { status })) as typeof fetch
      await pacedFetch(provider, 'https://example.test')
      const row = sourceHealth().providers.find(p => p.provider === provider)!
      const ok = status >= 200 && status < 300
      assert.equal(row.status, ok ? 'healthy' : 'degraded')
      assert.equal(row.failures, ok ? 0 : 1)
      assert.equal(row.lastSuccessAt !== null, ok)
      assert.equal(row.lastFailureAt !== null, !ok)
      assert.equal(row.consecutiveFailures, status === 429 || status >= 500 ? 1 : 0)
    }
  })

  it('expires successful observations after five minutes, with an exact boundary', async () => {
    globalThis.fetch = (async () => new Response('ok')) as typeof fetch
    await pacedFetch('fresh', 'https://example.test')
    now += 300_000
    assert.equal(sourceHealth().status, 'healthy')
    now += 1
    assert.equal(sourceHealth().status, 'unobserved')
    assert.equal(sourceHealth().providers[0].observationAgeMs, 300_001)
    await pacedFetch('fresh', 'https://example.test')
    assert.equal(sourceHealth().status, 'healthy')
  })

  it('blocks malformed, nonfinite, zero, fractional and negative ceilings before dispatch', async () => {
    let calls = 0
    globalThis.fetch = (async () => { calls++; return new Response('ok') }) as typeof fetch
    for (const value of ['NaN', 'Infinity', 'nope', '', '0', '-1', '1.5', '9007199254740992']) {
      __resetSourceHealthForTests()
      process.env.PACING_INVALID_PER_MINUTE = value
      await assert.rejects(pacedFetch('invalid', 'https://example.test'), /invalid provider ceiling/)
      assert.equal(sourceHealth().status, 'degraded')
      assert.equal(sourceHealth().providers[0].configurationValid, false)
      assert.equal(sourceHealth().providers[0].requests, 0)
    }
    assert.equal(calls, 0)
  })

  it('does not strand a half-open probe when local quota rejects dispatch', async () => {
    process.env.PACING_RECOVER_PER_MINUTE = '3'
    let calls = 0
    globalThis.fetch = (async () => { calls++; return new Response('busy', { status: 503 }) }) as typeof fetch
    for (let i = 0; i < 3; i++) await pacedFetch('recover', 'https://example.test')
    now += 30_000
    await assert.rejects(pacedFetch('recover', 'https://example.test'), /provider ceiling/)
    assert.equal(calls, 3)
    now += 30_000
    globalThis.fetch = (async () => { calls++; return new Response('ok') }) as typeof fetch
    await pacedFetch('recover', 'https://example.test')
    assert.equal(calls, 4)
    assert.equal(sourceHealth().status, 'healthy')
    assert.equal(sourceHealth().providers[0].state, 'closed')
  })

  it('allows only one concurrent recovery dispatch', async () => {
    globalThis.fetch = (async () => new Response('busy', { status: 503 })) as typeof fetch
    for (let i = 0; i < 3; i++) await pacedFetch('parallel', 'https://example.test')
    now += 30_000
    let resolve!: (r: Response) => void
    globalThis.fetch = (() => new Promise<Response>(r => { resolve = r })) as typeof fetch
    const first = pacedFetch('parallel', 'https://example.test')
    await assert.rejects(pacedFetch('parallel', 'https://example.test'), /circuit open/)
    resolve(new Response('ok'))
    await first
    assert.equal(sourceHealth().status, 'healthy')
  })
})
