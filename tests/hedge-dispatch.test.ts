import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HedgeController } from '../lib/llm/hedge-policy'
import { ModelRouter, ROUTES, estimateMessages } from '../lib/llm/router'
import { reserveSharedTokens } from '../lib/llm/shared-budget'

const messages = [{ role: 'user' as const, content: 'hello' }]
const ok = () => Response.json({ choices: [{ message: { content: 'answer' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } })
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('ten stale preflight permissions cannot bypass two atomic extra-dispatch slots', () => {
  const c = new HedgeController({ maxHedgeRate: 0.2, minRequestsForRate: 10 })
  for (let i = 0; i < 10; i++) c.noteRequest()
  const hints = Array.from({ length: 10 }, () => c.allowHedge())
  assert.ok(hints.every(Boolean))
  const tickets = hints.map(() => c.tryReserveHedge())
  assert.equal(tickets.filter(Boolean).length, 2)
  assert.equal(c.snapshot().hedgeRate, 0.2)
  assert.equal(c.snapshot().scope, 'process-local')
  assert.equal(c.snapshot().metric, 'extra-attempts-per-request')
})

test('cold-start burst is bounded explicitly; rate zero forbids hedges even on first request', () => {
  const c = new HedgeController({ maxHedgeRate: 0.2, minRequestsForRate: 10 })
  c.noteRequest()
  assert.equal(c.snapshot().coldStartAllowance, 2)
  assert.equal(Array.from({ length: 20 }, () => c.tryReserveHedge()).filter(Boolean).length, 2)
  const zero = new HedgeController({ maxHedgeRate: 0 })
  zero.noteRequest()
  assert.equal(zero.allowHedge(), false)
  assert.equal(zero.tryReserveHedge(), false)
})

test('rolling-window expiration and invalid policy values cannot produce unlimited cold tickets', () => {
  let now = 0
  const c = new HedgeController({ minRequestsForRate: 0, statsWindowMs: -1, maxHedgeRate: 1 }, () => now)
  c.noteRequest()
  assert.equal(c.tryReserveHedge(), true)
  assert.equal(c.tryReserveHedge(), false)
  now = 2
  assert.equal(c.tryReserveHedge(), false, 'no requests in the active window')
  c.noteRequest()
  assert.equal(c.tryReserveHedge(), true)
})

test('concurrent stalled routes dispatch only two hedges at the warm 20% boundary', async () => {
  const calls: string[] = []
  const r = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1, fetcher: (async (_url, init) => {
    const m = JSON.parse(String(init?.body)).model
    calls.push(m)
    if (m === ROUTES.quality[0]) await sleep(50)
    return ok()
  }) as typeof fetch })
  const results = await Promise.all(Array.from({ length: 10 }, () => r.complete({ messages, maxOutputTokens: 100 })))
  assert.ok(results.every(x => x.ok))
  assert.equal(calls.filter(m => m !== ROUTES.quality[0]).length, 2)
  assert.equal(r.hedgeController.snapshot().hedges, 2)
  assert.equal(r.hedgeController.snapshot().requests, 10)
  assert.equal(r.hedgeController.snapshot().hedgeRate, 0.2)
  assert.equal(results.filter(x => x.attempts.some(a => a.outcome === 'hedge_cancelled')).length, 2)
  assert.equal(r.budget.snapshot().used, 12 * (estimateMessages(messages) + 100))
})

test('failure-triggered replacement hedges must reserve every extra dispatch; refusal leaves primary alive', async () => {
  const calls: string[] = []
  const r = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1,
    hedgePolicy: { minRequestsForRate: 1, maxHedgeRate: 0.2 }, fetcher: (async (_url, init) => {
      const m = JSON.parse(String(init?.body)).model
      calls.push(m)
      if (m === ROUTES.quality[0]) { await sleep(50); return ok() }
      return new Response('{}', { status: 500 })
    }) as typeof fetch })
  for (let i = 0; i < 9; i++) r.hedgeController.noteRequest()
  const result = await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.ok, true)
  assert.equal(result.model, ROUTES.quality[0])
  assert.deepEqual(calls, ROUTES.quality.slice(0, 3))
  assert.equal(r.hedgeController.snapshot().hedges, 2, 'each replacement while primary is alive costs another ticket')
  assert.equal(result.attempts.filter(a => a.hedged).length, 2)
  assert.equal(result.attempts.some(a => a.outcome === 'hedge_cancelled'), false)
})

test('governor refusal preserves immediate sequential failover and does not consume hedge or token tickets', async () => {
  const calls: string[] = []
  const r = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1, hedgePolicy: { maxHedgeRate: 0 }, fetcher: (async (_url, init) => {
    const m = JSON.parse(String(init?.body)).model
    calls.push(m)
    if (m === ROUTES.quality[0]) { await sleep(15); return new Response('{}', { status: 500 }) }
    return ok()
  }) as typeof fetch })
  const result = await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.ok, true)
  assert.deepEqual(calls, ROUTES.quality.slice(0, 2))
  assert.equal(r.hedgeController.snapshot().hedges, 0)
  assert.ok(result.maxFailoverMs < 200)
  assert.equal(result.attempts.some(a => a.hedged), false)
  assert.equal(result.usage.reservedTokens, 248)
})

test('unaﬀordable hedge neither ends primary nor consumes an extra-dispatch ticket', async () => {
  let calls = 0
  const r = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1,
    budget: { perRequestTokens: 150, windowTokens: 1000, windowMs: 60000 }, fetcher: (async () => { calls++; await sleep(10); return ok() }) as typeof fetch })
  const result = await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.ok, true)
  assert.equal(calls, 1)
  assert.equal(result.usage.reservedTokens, 124)
  assert.equal(r.hedgeController.snapshot().hedges, 0)
})

test('per-request and shared-process token ceilings still bind under concurrent stalls', async () => {
  let calls = 0
  const r = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1,
    budget: { perRequestTokens: 250, windowTokens: 600, windowMs: 60000 }, fetcher: (async () => { calls++; await sleep(10); return ok() }) as typeof fetch })
  const results = await Promise.all(Array.from({ length: 10 }, () => r.complete({ messages, maxOutputTokens: 100 })))
  assert.ok(results.some(x => x.error === 'budget_exceeded'))
  assert.equal(calls, 4)
  assert.ok(r.budget.snapshot().used <= 600)
  assert.ok(results.every(x => x.usage.reservedTokens! <= 250))
  assert.equal(r.hedgeController.snapshot().hedges, 0)
})

test('shared reservation fails closed for unsafe retention arithmetic before any Redis work', async () => {
  let calls = 0
  const result = await reserveSharedTokens(10, 100, Number.MAX_SAFE_INTEGER, 1, (async () => { calls++; return Response.json({ result: 1 }) }) as typeof fetch)
  assert.equal(result, 'limited')
  assert.equal(calls, 0)
})

test('rejected routes cannot inflate the governor denominator without any model dispatch', async () => {
  const r = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1,
    budget: { perRequestTokens: 150, windowTokens: 124, windowMs: 60000 },
    fetcher: (async () => { await sleep(15); return ok() }) as typeof fetch })
  const results = await Promise.all(Array.from({ length: 10 }, () => r.complete({ messages, maxOutputTokens: 100 })))
  assert.equal(results.filter(x => x.error === 'budget_exceeded').length, 9)
  assert.equal(r.hedgeController.snapshot().requests, 1)
  assert.equal(r.hedgeController.snapshot().hedges, 0)
})
