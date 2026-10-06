import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CircuitBreaker, ModelRouter, ROUTES, parseRetryAfter } from '../lib/llm/router'

const messages = [{ role: 'user' as const, content: 'hello' }]
const base = 1_700_000_000_000
const ok = () => Response.json({ choices: [{ message: { content: 'answer' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } })

for (const [label, header] of [['numeric', '900'], ['HTTP date', new Date(base + 900_000).toUTCString()]] as const) {
  test(`900s ${label} Retry-After is not capped by parser or breaker cooldown`, () => {
    let now = base
    const wait = parseRetryAfter(header, () => now)
    assert.equal(wait, 900_000)
    const b = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10, maxCooldownMs: 100 }, () => now)
    b.failure(wait, true)
    now += 600_000
    assert.equal(b.snapshot().state, 'open')
    assert.equal(b.allow(), false)
    now = base + 899_999
    assert.equal(b.allow(), false)
    now++
    assert.equal(b.snapshot().state, 'half_open')
    assert.equal(b.allow(), true)
    assert.equal(b.allow(), false, 'only one half-open probe at mandatory boundary')
  })

  test(`router honors ${label} mandatory model wait across requests while immediately failing over`, async () => {
    let now = base
    let refusal = true
    const calls: string[] = []
    const r = new ModelRouter({ apiKey: 'fake', now: () => now, breaker: { failureThreshold: 1, cooldownMs: 10, maxCooldownMs: 100 },
      fetcher: (async (_url, init) => {
        const model = JSON.parse(String(init?.body)).model
        calls.push(model)
        return model === ROUTES.quality[0] && refusal ? new Response('{}', { status: 429, headers: { 'retry-after': header } }) : ok()
      }) as typeof fetch })
    const first = await r.complete({ messages, maxOutputTokens: 100 })
    assert.equal(first.ok, true)
    assert.equal(first.model, ROUTES.quality[1])
    assert.ok(first.maxFailoverMs < 200)
    refusal = false
    for (const offset of [100, 600_000, 899_999]) {
      now = base + offset
      const result = await r.complete({ messages, maxOutputTokens: 100 })
      assert.equal(result.attempts[0].outcome, 'circuit_open')
      assert.equal(result.model, ROUTES.quality[1])
      assert.equal(r.health().breakers[ROUTES.quality[0]], 'open')
    }
    assert.equal(calls.filter(m => m === ROUTES.quality[0]).length, 1)
    now = base + 900_000
    assert.equal(r.health().breakers[ROUTES.quality[0]], 'half_open')
    const recovery = await r.complete({ messages, maxOutputTokens: 100 })
    assert.equal(recovery.model, ROUTES.quality[0])
    assert.equal(r.health().breakers[ROUTES.quality[0]], 'closed')
  })
}

test('longer subsequent provider waits extend not-before; old in-flight success cannot erase it', () => {
  let now = base
  const b = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10, maxCooldownMs: 100 }, () => now)
  b.failure(900_000, true)
  now += 100
  b.success()
  assert.equal(b.allow(), false)
  b.failure(1_200_000, true)
  b.failure(100, true)
  now = base + 900_000
  assert.equal(b.allow(), false)
  now = base + 1_200_100
  assert.equal(b.allow(), true)
})

test('ordinary exponential recovery stays capped without shortening provider mandatory wait', () => {
  let now = 0
  const b = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10, maxCooldownMs: 20 }, () => now)
  b.failure()
  now = 10; assert.equal(b.allow(), true)
  b.failure(); now = 29; assert.equal(b.allow(), false)
  now = 30; assert.equal(b.allow(), true)
  b.failure(); now = 49; assert.equal(b.allow(), false)
  now = 50; assert.equal(b.allow(), true)
  b.failure(900_000, true)
  now += 20; assert.equal(b.allow(), false)
  now = 900_050; assert.equal(b.allow(), true)
})

test('Retry-After parsing supports safe finite integer milliseconds without a 600s ceiling', () => {
  assert.equal(parseRetryAfter('900.0001', () => base), 900_001, 'round upward, never retry early')
  assert.equal(parseRetryAfter('3600', () => base), 3_600_000)
  assert.equal(parseRetryAfter('-1', () => base), undefined)
  assert.equal(parseRetryAfter('1e100', () => base), undefined)
  assert.equal(parseRetryAfter('not a date', () => base), undefined)
  assert.equal(parseRetryAfter(String(Number.MAX_SAFE_INTEGER / 1000), () => base), undefined)
  assert.equal(parseRetryAfter(new Date(base - 1000).toUTCString(), () => base), 0)
})

test('503 Retry-After also imposes mandatory wait before the exponential breaker threshold', async () => {
  let now = base
  let primaryCalls = 0
  const r = new ModelRouter({ apiKey: 'fake', now: () => now,
    breaker: { failureThreshold: 2, cooldownMs: 10, maxCooldownMs: 100 },
    fetcher: (async (_url, init) => {
      const model = JSON.parse(String(init?.body)).model
      if (model === ROUTES.quality[0]) { primaryCalls++; return new Response('{}', { status: 503, headers: { 'retry-after': '900' } }) }
      return ok()
    }) as typeof fetch })
  assert.equal((await r.complete({ messages, maxOutputTokens: 100 })).ok, true)
  now += 600_000
  const blocked = await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(blocked.attempts[0].outcome, 'circuit_open')
  assert.equal(primaryCalls, 1)
  now = base + 900_000
  await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(primaryCalls, 2)
})
