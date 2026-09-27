import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ModelRouter, ROUTES } from '../lib/llm/router'
import { HedgeController } from '../lib/llm/hedge-policy'

const msgs = [{ role: 'user' as const, content: 'hello' }]
const body = (text: string) => JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fake gateway: per-model latency, and an optional set of models that hang forever. */
function gateway(latency: Record<string, number>, hang: Set<string> = new Set()) {
  const calls: string[] = []
  const f = (async (_url: string, init: RequestInit) => {
    const model = JSON.parse(String(init.body)).model as string
    calls.push(model)
    const signal = init.signal as AbortSignal | undefined
    if (hang.has(model)) {
      await new Promise((_res, rej) => { signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))) })
    }
    await sleep(latency[model] ?? 5)
    return new Response(body('answer from ' + model), { status: 200 })
  }) as unknown as typeof fetch
  return { f, calls }
}

test('HedgeController learns a per-model p90 and clamps it into the policy band', () => {
  const c = new HedgeController({ minSamples: 5, multiplier: 2, minMs: 50, maxMs: 1000 })
  assert.equal(c.p90('a'), undefined)
  assert.equal(c.delayFor('a', 300), 300, 'cold start uses the static fallback')
  assert.equal(c.delayFor('a'), 1000, 'cold start with no fallback waits the ceiling')
  for (const ms of [100, 110, 120, 130, 900]) c.observe('a', ms, 'ok')
  assert.equal(c.p90('a'), 900)
  assert.equal(c.delayFor('a'), 1000, 'clamped to maxMs')
  const d = new HedgeController({ minSamples: 3, multiplier: 1.5, minMs: 10, maxMs: 5000 })
  for (const ms of [200, 100, 300]) d.observe('b', ms, 'ok')
  assert.equal(d.p90('b'), 300)
  assert.equal(d.delayFor('b'), 450)
  d.observe('b', 9999, 'timeout')
  assert.equal(d.p90('b'), 300, 'failures never teach the latency model')
})

test('adaptive mode is conservative while cold: a healthy fast primary is never hedged', async () => {
  const { f, calls } = gateway({})
  const r = new ModelRouter({ apiKey: 'k', fetcher: f, hedgeMode: 'adaptive', hedgePolicy: { minSamples: 5, maxMs: 4000 } })
  const res = await r.complete({ messages: msgs, profile: 'quality' })
  assert.equal(res.ok, true)
  assert.equal(res.model, ROUTES.quality[0])
  assert.deepEqual(calls, [ROUTES.quality[0]])
})

test('adaptive mode learns the primary p90 and hedges a later stall without any hand-set constant', async () => {
  const primary = ROUTES.fast[0]
  const { f, calls } = gateway({ [primary]: 20 })
  const r = new ModelRouter({ apiKey: 'k', fetcher: f, hedgeMode: 'adaptive', hedgePolicy: { minSamples: 3, multiplier: 1.5, minMs: 20, maxMs: 4000, minRequestsForRate: 100 } })
  for (let i = 0; i < 4; i++) assert.equal((await r.complete({ messages: msgs, profile: 'fast' })).model, primary)
  const learned = r.health().hedging as { learnedDelayMs: Record<string, number> }
  assert.ok(learned.learnedDelayMs[primary] >= 20 && learned.learnedDelayMs[primary] < 400, 'learned delay tracks observed p90')

  const hung = gateway({}, new Set([primary]))
  const r2 = new ModelRouter({ apiKey: 'k', fetcher: hung.f, hedgeMode: 'adaptive', hedgePolicy: { minSamples: 3, multiplier: 1.5, minMs: 20, maxMs: 4000, minRequestsForRate: 100 } })
  for (const ms of [20, 22, 24]) r2.hedgeController.observe(primary, ms, 'ok')
  const t0 = Date.now()
  const res = await r2.complete({ messages: msgs, profile: 'fast' })
  const wall = Date.now() - t0
  assert.equal(res.ok, true)
  assert.equal(res.model, ROUTES.fast[1], 'the backup answered')
  assert.ok(wall < 400, 'stall detected and answered from the learned threshold, took ' + wall + 'ms')
  assert.deepEqual(hung.calls, [ROUTES.fast[0], ROUTES.fast[1]])
  assert.ok(res.attempts.some((a) => a.outcome === 'hedge_cancelled'), 'the hung call is cancelled, not left running')
})

test('the spend governor caps the share of requests allowed to hedge', async () => {
  const primary = ROUTES.reasoning[0]
  const { f, calls } = gateway({ [primary]: 60 })
  const r = new ModelRouter({ apiKey: 'k', fetcher: f, hedgeMode: 'adaptive', hedgePolicy: { minSamples: 1, multiplier: 0.05, minMs: 1, maxMs: 4000, maxHedgeRate: 0.2, minRequestsForRate: 3 } })
  for (let i = 0; i < 12; i++) await r.complete({ messages: msgs, profile: 'reasoning' })
  const snap = r.health().hedging as { hedgeRate: number; hedges: number; requests: number }
  assert.equal(snap.requests, 12)
  assert.ok(snap.hedgeRate <= 0.2, 'hedge rate ' + snap.hedgeRate + ' exceeded the ceiling')
  assert.ok(calls.length < 24, 'the governor stopped hedging every request')
})

test('hedging stays off unless it is configured (1.5.3 behaviour preserved)', async () => {
  const { f, calls } = gateway({}, new Set([ROUTES.quality[0]]))
  const r = new ModelRouter({ apiKey: 'k', fetcher: f, timeouts: { [ROUTES.quality[0]]: 120 } as Record<string, number>, deadlineMs: 5000 })
  assert.deepEqual(r.health().hedging, { mode: 'off' })
  const res = await r.complete({ messages: msgs, profile: 'quality' })
  assert.equal(res.ok, true)
  assert.equal(res.model, ROUTES.quality[1])
  assert.equal(calls[0], ROUTES.quality[0])
  assert.ok(res.maxFailoverMs < 200, 'sequential failover still dispatches immediately')
})
