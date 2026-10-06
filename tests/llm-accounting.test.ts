import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ModelRouter, ROUTES, estimateMessages, type RouteResult } from '../lib/llm/router'

const messages = [{ role: 'user' as const, content: 'hello' }]
const reply = (text: string, usage?: unknown, status = 200, reason = 'stop') => Response.json({ choices: [{ message: { content: text }, finish_reason: reason }], usage }, { status })
const known = (pt = 10, ct = 5, rt = 0) => ({ prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct, completion_tokens_details: { reasoning_tokens: rt } })
function router(plan: (model: string, init: RequestInit) => Response | Promise<Response>, opts: ConstructorParameters<typeof ModelRouter>[0] = {}) {
  return new ModelRouter({ apiKey: 'fake-test-key', fetcher: (async (_u, init) => plan(JSON.parse(String(init?.body)).model, init!)) as typeof fetch, ...opts })
}
function invariant(result: RouteResult) {
  const u = result.usage
  for (const n of [u.promptTokens, u.completionTokens, u.totalTokens, u.reasoningTokens, u.knownTotalTokens, u.reservedTokens]) {
    assert.equal(typeof n, 'number'); assert.ok(Number.isFinite(n) && n! >= 0)
  }
  assert.equal(u.totalTokens, u.promptTokens + u.completionTokens)
  assert.ok(u.completionTokens >= u.reasoningTokens)
  assert.ok(u.totalTokens >= u.knownTotalTokens!)
  assert.equal(u.estimated, !u.complete)
  assert.equal(u.unknownAttempts, result.attempts.filter(a => a.billingUnknown).length)
  assert.equal(u.reservedTokens, result.attempts.reduce((n, a) => n + (a.reservedTokens ?? 0), 0))
}

test('reasoning exhaustion plus success reports 439 total, not winner-only 15 or double-counted reasoning', async () => {
  const r = router(m => m === ROUTES.fast[0] ? reply('', known(24, 400, 400), 200, 'length') : reply('answer', known()))
  const result = await r.complete({ messages, profile: 'fast', maxOutputTokens: 400 })
  assert.equal(result.ok, true)
  assert.equal(result.usage.promptTokens, 34)
  assert.equal(result.usage.completionTokens, 405)
  assert.equal(result.usage.totalTokens, 439)
  assert.equal(result.usage.knownTotalTokens, 439)
  assert.equal(result.usage.reasoningTokens, 400)
  assert.equal(result.usage.winnerUsage?.totalTokens, 15)
  assert.equal(result.usage.estimated, false)
  assert.equal(result.attempts[0].usage?.totalTokens, 424)
  assert.ok(result.maxFailoverMs < 200)
  invariant(result)
})

test('two billed empty attempts plus success aggregate every settled attempt', async () => {
  let n = 0
  const r = router(() => reply(++n < 3 ? '' : 'answer', known(10, 20)))
  const result = await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.ok, true)
  assert.equal(result.usage.totalTokens, 90)
  assert.equal(result.usage.complete, true)
  assert.deepEqual(result.attempts.map(a => a.usage?.totalTokens), [30, 30, 30])
  invariant(result)
})

test('all-model billed failure preserves nonzero usage on unsuccessful result', async () => {
  const result = await router(() => reply('', known(10, 30, 30), 200, 'length')).complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.error, 'all_models_failed')
  assert.equal(result.usage.totalTokens, 160)
  assert.equal(result.usage.reasoningTokens, 120)
  assert.equal(result.usage.estimated, false)
  invariant(result)
})

test('HTTP errors retain reported usage, missing error usage is unknown rather than free', async () => {
  const result = await router(m => m === ROUTES.quality[0] ? reply('', known(10, 2), 500) : reply('answer', known())).complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.usage.totalTokens, 27)
  assert.equal(result.usage.complete, true)
  invariant(result)
  const unknown = await router(m => m === ROUTES.quality[0] ? new Response('{}', { status: 429 }) : reply('answer', known())).complete({ messages, maxOutputTokens: 100 })
  assert.equal(unknown.usage.knownTotalTokens, 15)
  assert.equal(unknown.usage.estimated, true)
  assert.equal(unknown.usage.unknownAttempts, 1)
  invariant(unknown)
})

test('cancelled potentially paid work remains unknown and fully reserved, including late responses', async () => {
  let resolve!: (r: Response) => void
  const r = router(m => m === ROUTES.quality[0] ? new Promise<Response>(yes => { resolve = yes }) : reply('answer', known()), { hedgeAfterMs: 1 })
  const result = await r.complete({ messages, maxOutputTokens: 100 })
  const reservation = estimateMessages(messages) + 100
  assert.equal(result.ok, true)
  assert.equal(result.usage.knownTotalTokens, 15)
  assert.equal(result.usage.reservedTokens, 2 * reservation)
  assert.equal(result.usage.unknownAttempts, 1)
  assert.equal(result.usage.complete, false)
  assert.equal(r.budget.snapshot().used, 2 * reservation)
  assert.equal(result.attempts.find(a => a.outcome === 'hedge_cancelled')?.billingUnknown, true)
  invariant(result)
  const snapshot = JSON.stringify(result)
  resolve(reply('late paid answer', known(10, 90)))
  await new Promise(r => setTimeout(r, 5))
  assert.equal(JSON.stringify(result), snapshot, 'returned snapshot must not silently mutate later')
  assert.equal(r.budget.snapshot().used, 2 * reservation, 'late billing must not refund')
})

test('already-settled loser in the same promise race retains its known charge', async () => {
  const pending: Array<(r: Response) => void> = []
  let ready!: () => void
  const both = new Promise<void>(resolve => { ready = resolve })
  const r = router(() => new Promise<Response>(resolve => { pending.push(resolve); if (pending.length === 2) ready() }), { hedgeAfterMs: 1 })
  const work = r.complete({ messages, maxOutputTokens: 100 })
  await both
  for (const resolve of pending) resolve(reply('answer', known()))
  const result = await work
  assert.equal(result.usage.totalTokens, 30)
  assert.equal(result.usage.unknownAttempts, 0)
  assert.equal(result.attempts.filter(a => a.outcome === 'ok').length, 2)
  invariant(result)
})

for (const [label, usage] of [
  ['missing', undefined], ['negative', { prompt_tokens: -1, completion_tokens: -5 }],
  ['string', { prompt_tokens: '10', completion_tokens: '5' }],
  ['fractional', { prompt_tokens: 1.5, completion_tokens: 2.5 }],
  ['reasoning greater than completion', { prompt_tokens: 10, completion_tokens: 5, reasoning_tokens: 30 }],
  ['contradictory total', { prompt_tokens: 10, completion_tokens: 5, total_tokens: 100 }],
  ['bad reasoning', { prompt_tokens: 10, completion_tokens: 5, reasoning_tokens: -10 }],
  ['null', null], ['unsafe', { prompt_tokens: 1e100, completion_tokens: 1e100 }],
] as const) {
  test(`malformed/incomplete usage: ${label} cannot claim exact billing`, async () => {
    const result = await router(() => reply('answer', usage)).complete({ messages, maxOutputTokens: 100 })
    assert.equal(result.ok, true)
    assert.equal(result.usage.complete, false)
    assert.equal(result.usage.estimated, true)
    assert.equal(result.usage.unknownAttempts, 1)
    invariant(result)
  })
}

test('partial failed-response usage retains reasoning lower bound and sanitizes malformed content', async () => {
  const result = await router(m => m === ROUTES.quality[0] ? Response.json({ choices: [{ message: { content: {} } }], usage: { prompt_tokens: 24, reasoning_tokens: 40 } }) : reply('answer', known())).complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.usage.knownTotalTokens, 79)
  assert.equal(result.usage.reasoningTokens, 40)
  assert.equal(result.usage.unknownAttempts, 1)
  invariant(result)
})

test('unknown network/timeout failures and blocked failover never refund or report complete', async () => {
  const r = router(() => { throw new TypeError('unknown billed work') }, { budget: { perRequestTokens: 180, windowTokens: 1000, windowMs: 60000 } })
  const result = await r.complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.error, 'budget_exceeded')
  assert.equal(result.usage.unknownAttempts, 1)
  assert.equal(result.usage.totalTokens, 0)
  assert.equal(r.budget.snapshot().used, 124)
  invariant(result)
})

test('noncooperative fetch is still bounded by per-attempt timeout and immediate failover', async () => {
  const result = await router(m => m === ROUTES.fast[0] ? new Promise<Response>(() => {}) : reply('answer', known()), { timeouts: { 'glm-5.3-flash': 5 } }).complete({ messages, profile: 'fast', maxOutputTokens: 100 })
  assert.equal(result.ok, true)
  assert.equal(result.attempts[0].outcome, 'timeout')
  assert.equal(result.usage.unknownAttempts, 1)
  assert.ok(result.maxFailoverMs < 200)
  invariant(result)
})

test('error body hang cannot stall auth stopping or retryable failover', async () => {
  for (const status of [401, 429, 500]) {
    const r = router(m => m === ROUTES.quality[0] ? new Response(new ReadableStream({ start() {} }), { status }) : reply('answer', known()))
    const result = await r.complete({ messages, maxOutputTokens: 100 })
    assert.equal(result.attempts[0].status, status)
    assert.equal(result.attempts[0].outcome, status === 401 ? 'auth_error' : status === 429 ? 'rate_limited' : 'server_error')
    assert.equal(result.ok, status !== 401)
    assert.ok(result.attempts[0].latencyMs < 200)
    assert.equal(result.usage.unknownAttempts, 1)
    invariant(result)
  }
})

test('all-unknown failures are incomplete, while zero-dispatch failures have no billable attempts', async () => {
  const result = await router(() => { throw new TypeError('ambiguous') }).complete({ messages, maxOutputTokens: 100 })
  assert.equal(result.error, 'all_models_failed')
  assert.equal(result.usage.unknownAttempts, 4)
  assert.equal(result.usage.knownTotalTokens, 0)
  assert.equal(result.usage.reservedTokens, 496)
  invariant(result)
  const noDispatch = await new ModelRouter().complete({ messages })
  assert.equal(noDispatch.usage.reservedTokens, 0)
  assert.equal(noDispatch.usage.unknownAttempts, 0)
  assert.equal(noDispatch.usage.complete, true)
  invariant(noDispatch)
})

test('shared admission reserves the chain once; reporting distinguishes it from local attempt reservations', async () => {
  const saved = { ...process.env }, original = globalThis.fetch
  const commands: unknown[][] = []
  try {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-test-token'
    globalThis.fetch = (async (_url, init) => { commands.push(JSON.parse(String(init?.body))); return Response.json({ result: 1 }) }) as typeof fetch
    const r = router(m => m === ROUTES.quality[0] ? reply('', known(10, 5)) : reply('answer', known()), { sharedBudget: true })
    const result = await r.complete({ messages, maxOutputTokens: 100 })
    assert.equal(result.ok, true)
    assert.equal(commands.length, 1)
    assert.equal(commands[0][4], 496, 'one shared reservation covers all four possible attempts')
    assert.equal(result.usage.sharedReservedTokens, 496)
    assert.equal(result.usage.reservedTokens, 248)
    assert.equal(result.usage.knownTotalTokens, 30)
    invariant(result)
  } finally {
    globalThis.fetch = original
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
    Object.assign(process.env, saved)
  }
})
