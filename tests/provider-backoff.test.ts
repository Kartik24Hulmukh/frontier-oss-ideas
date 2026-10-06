import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { BudgetGate, providerBudgetMode, reserveProviderCall, persistProviderBackoff } from '../lib/core/budget'
import { pacedFetch, parseRetryAfter, __resetSourceHealthForTests, sourceHealth } from '../lib/core/pace'
import { searchGitHub } from '../lib/sources/github'
const env = { ...process.env }, fetcher = globalThis.fetch, clock = Date.now
let now = 1_800_000_000_000
beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; delete process.env.REQUIRE_DISTRIBUTED_LIMITS
  now = 1_800_000_000_000; Date.now = () => now; __resetSourceHealthForTests()
})
afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k]
  Object.assign(process.env, env); globalThis.fetch = fetcher; Date.now = clock; __resetSourceHealthForTests()
})
test('Retry-After parses delta and date but not malformed numeric dates', () => {
  assert.equal(parseRetryAfter('120', now), 120_000)
  assert.equal(parseRetryAfter(new Date(now + 120_000).toUTCString(), now), 120_000)
  for (const value of [null, '', 'NaN', 'Infinity', '-1', '1.5', '9007199254740992', '2026']) {
    if (value === '2026') { assert.equal(parseRetryAfter(value, now), 2_026_000); continue }
    assert.equal(parseRetryAfter(value, now), 0)
  }
  assert.equal(parseRetryAfter(new Date(now - 1000).toUTCString(), now), 0)
})
test('local GitHub default and explicit anonymous30 never dispatch above10', async () => {
  for (const override of [undefined, '30']) {
    __resetSourceHealthForTests()
    if (override) process.env.PACING_GITHUB_PER_MINUTE = override; else delete process.env.PACING_GITHUB_PER_MINUTE
    let dispatched = 0
    globalThis.fetch = (async () => { dispatched++; return new Response('{}') }) as typeof fetch
    for (let i = 0; i < 10; i++) await pacedFetch('github', 'https://mock.test')
    await assert.rejects(pacedFetch('github', 'https://mock.test'), /provider ceiling/)
    assert.equal(dispatched, 10)
  }
})
test('long delta/date backoff blocks redis-free retries and retains response body', async () => {
  for (const header of ['120', new Date(now + 120_000).toUTCString()]) {
    __resetSourceHealthForTests(); let dispatched = 0
    globalThis.fetch = (async () => { dispatched++; return new Response('{"items":[]}', { status: 429, headers: { 'Retry-After': header } }) }) as typeof fetch
    const res = await pacedFetch('header', 'https://mock.test')
    assert.deepEqual(await res.json(), { items: [] })
    now += 5000
    await assert.rejects(pacedFetch('header', 'https://mock.test'), /backoff active/)
    assert.equal(dispatched, 1); assert.equal(sourceHealth().status, 'degraded')
    assert.ok(sourceHealth().providers[0].retryInMs >= 110_000)
    now -= 5000
  }
})
test('Stack Exchange body backoff precedes the next request and expires', async () => {
  let dispatched = 0
  globalThis.fetch = (async () => { dispatched++; return Response.json({ items: [], backoff: 60 }) }) as typeof fetch
  const r = await pacedFetch('stackoverflow', 'https://mock.test')
  assert.deepEqual(await r.json(), { items: [], backoff: 60 })
  await assert.rejects(pacedFetch('stackoverflow', 'https://mock.test'), /backoff active/)
  assert.equal(dispatched, 1)
  now += 60_000
  await pacedFetch('stackoverflow', 'https://mock.test'); assert.equal(dispatched, 2)
})
test('provider Date avoids future application skew shortening absolute backoff', async () => {
  const real = now; now += 3_600_000
  globalThis.fetch = (async () => new Response('{}', { status: 403, headers: { Date: new Date(real).toUTCString(), 'X-RateLimit-Reset': String((real + 120_000) / 1000), 'X-RateLimit-Remaining': '0' } })) as typeof fetch
  await pacedFetch('github', 'https://mock.test')
  assert.equal(sourceHealth().providers[0].retryInMs, 120_000)
})
test('invalid/partial/required Redis configuration dispatches nothing; production loopback stays forbidden', async () => {
  let dispatched = 0
  globalThis.fetch = (async () => { dispatched++; return new Response('{}') }) as typeof fetch
  for (const config of [
    { url: undefined, token: undefined, required: 'true', mode: 'test' },
    { url: 'http://127.0.0.1:1234', token: 'synthetic', required: 'true', mode: 'production' },
    { url: 'https://redis.test', token: undefined, required: undefined, mode: 'test' },
  ]) {
    __resetSourceHealthForTests()
    for (const [key, value] of Object.entries({ UPSTASH_REDIS_REST_URL: config.url, UPSTASH_REDIS_REST_TOKEN: config.token, REQUIRE_DISTRIBUTED_LIMITS: config.required, NODE_ENV: config.mode, ALLOW_LOOPBACK_REDIS: 'true' })) {
      if (value) process.env[key] = value; else delete process.env[key]
    }
    assert.equal(providerBudgetMode(), 'blocked')
    await assert.rejects(pacedFetch('blocked', 'https://mock.test'), /quota unavailable/)
  }
  assert.equal(dispatched, 0)
})
test('malformed/backend error results fail closed and no reservation refund', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic'
  for (const data of [{ result: 1 }, { result: [1, -1] }, { result: [1, 2] }, { result: [0, '60000'] }, { error: 'oops' }, { result: [2, 0] }]) {
    assert.equal((await reserveProviderCall('p', 10, (async () => Response.json(data)) as typeof fetch)).status, 'unavailable')
  }
  assert.equal(await persistProviderBackoff('p', 60_000, (async () => Response.json({ result: 1 })) as typeof fetch), false)
})
test('BudgetGate invalid inputs are closed; tightening anonymous ceiling counts prior authenticated calls', () => {
  for (const n of [NaN, Infinity, 0, -1, 1.5]) assert.equal(new BudgetGate(n, 60_000).tryConsume().ok, false)
  const gate = new BudgetGate(30, 60_000)
  for (let i = 0; i < 10; i++) assert.equal(gate.tryConsume('p', now, 30).ok, true)
  assert.equal(gate.tryConsume('p', now, 10).ok, false)
})
test('GitHub adapter capped5s retry cannot dispatch during120s provider backoff', async () => {
  let dispatched = 0
  globalThis.fetch = (async () => { dispatched++; return new Response('{}', { status: 429, headers: { 'Retry-After': '120' } }) }) as typeof fetch
  const result = await searchGitHub('synthetic-loopback-only')
  assert.equal(result.status, 'rate_limited'); assert.equal(dispatched, 1)
  assert.match(result.errorMessage!, /backoff active/)
})
