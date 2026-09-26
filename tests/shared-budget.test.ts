import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reserveSharedTokens, RESERVE_TOKENS_LUA } from '../lib/llm/shared-budget'
import { ModelRouter, TokenBudget, estimateTokens, ROUTES } from '../lib/llm/router'
import { config } from '../proxy'

test('analyst scan path is covered by global admission', () => assert.ok(config.matcher.includes('/api/analyst')))
test('UTF8 accounting is conservative for multilingual prompts', () => {
  assert.ok(estimateTokens('你好😀') >= Buffer.byteLength('你好😀'))
})
test('reservations form a rolling window, no cross-window settlement refund', () => {
  let now = 0
  const b = new TokenBudget({ perRequestTokens: 100, windowTokens: 100, windowMs: 1000 }, () => now)
  assert.equal(b.reserve(40), true)
  now = 900; assert.equal(b.reserve(60), true)
  now = 1001; b.settle(40, 0)
  assert.equal(b.snapshot().used, 60)
  assert.equal(b.reserve(50), false)
  now = 1900; assert.equal(b.snapshot().used, 0)
})
test('unknown timeouts consume budget across the whole request, not just one model', async () => {
  let calls = 0
  const fetcher = (async () => { calls++; throw new TypeError('unknown billable work') }) as typeof fetch
  const r = new ModelRouter({ apiKey: 'test', fetcher, budget: { perRequestTokens: 180, windowTokens: 1000, windowMs: 60000 } })
  const result = await r.complete({ messages: [{ role: 'user', content: 'hello' }], maxOutputTokens: 100 })
  assert.equal(result.error, 'budget_exceeded')
  assert.equal(calls, 1)
  assert.ok(r.budget.snapshot().used > 100)
})
test('shared reservation fails closed on missing config, Redis faults and malformed responses', async () => {
  const old = { ...process.env }
  try {
    delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.REQUIRE_DISTRIBUTED_LIMITS
    Object.assign(process.env, { NODE_ENV: 'production' })
    assert.equal(await reserveSharedTokens(100, 1000, 1000, 1000), 'unavailable')
    Object.assign(process.env, { NODE_ENV: old.NODE_ENV ?? 'test' })
    process.env.REQUIRE_DISTRIBUTED_LIMITS = 'true'
    assert.equal(await reserveSharedTokens(100, 1000, 1000, 1000), 'unavailable')
    let calls = 0
    const r = new ModelRouter({ apiKey: 'test', sharedBudget: true, fetcher: (async () => { calls++; throw new Error() }) as typeof fetch })
    assert.equal((await r.complete({ messages: [{ role: 'user', content: 'hi' }] })).error, 'budget_unavailable')
    assert.equal(calls, 0)
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'; process.env.UPSTASH_REDIS_REST_TOKEN = 'test'
    for (const body of [{ result: 1 }, { result: 0 }, { result: '1' }, { error: 'outage' }]) {
      const fetcher = (async (_url: unknown, init: RequestInit) => {
        const cmd = JSON.parse(String(init.body)); assert.equal(cmd[0], 'EVAL'); assert.equal(cmd[1], RESERVE_TOKENS_LUA)
        return Response.json(body)
      }) as typeof fetch
      assert.equal(await reserveSharedTokens(100, 1000, 1000, 1000, fetcher), body.result === 1 ? 'ok' : body.result === 0 ? 'limited' : 'unavailable')
    }
    assert.equal(await reserveSharedTokens(-1, 1000, 1000, 1000), 'limited')
    assert.equal(await reserveSharedTokens(100, 1000, 1000, 1000, (async () => { throw new Error('down') }) as typeof fetch), 'unavailable')
  } finally {
    for (const k of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'REQUIRE_DISTRIBUTED_LIMITS', 'NODE_ENV']) {
      if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]
    }
  }
})
test('half-open probe released when local budget blocks dispatch', async () => {
  let now = 0
  const r = new ModelRouter({ apiKey: 'test', now: () => now, fetcher: (async () => new Response('{}', { status: 429 })) as typeof fetch, breaker: { failureThreshold: 1, cooldownMs: 100, maxCooldownMs: 1000 }, budget: { perRequestTokens: 500, windowTokens: 124, windowMs: 1000 } })
  await r.complete({ messages: [{ role: 'user', content: 'hello' }], maxOutputTokens: 100 })
  now = 100
  await r.complete({ messages: [{ role: 'user', content: 'hello' }], maxOutputTokens: 100 })
  now = 1001
  const res = await r.complete({ messages: [{ role: 'user', content: 'hello' }], maxOutputTokens: 100 })
  assert.equal(res.attempts[0].model, ROUTES.quality[0])
  assert.equal(res.attempts[0].outcome, 'rate_limited')
})
