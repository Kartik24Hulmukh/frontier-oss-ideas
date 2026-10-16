import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ModelRouter, ROUTES } from '../lib/llm/router'

const messages = [{ role: 'user' as const, content: 'hello' }]
const answer = () => Response.json({ choices: [{ message: { content: 'answer' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } })

for (const status of [429, 503, 504, 404]) {
  test(`already-settled losing hedge HTTP ${status} still updates breaker and mandatory wait`, async () => {
    let now = 1_700_000_000_000
    const pending: Array<(response: Response) => void> = []
    let ready!: () => void
    const both = new Promise<void>(resolve => { ready = resolve })
    const calls: string[] = []
    const router = new ModelRouter({ apiKey: 'fake', now: () => now, hedgeAfterMs: 1,
      breaker: { failureThreshold: 2, cooldownMs: 10, maxCooldownMs: 100 },
      fetcher: (async (_url, init) => {
        calls.push(JSON.parse(String(init?.body)).model)
        if (calls.length > 2) return answer()
        return new Promise<Response>(resolve => { pending.push(resolve); if (pending.length === 2) ready() })
      }) as typeof fetch })
    const work = router.complete({ messages, maxOutputTokens: 100 })
    await both
    pending[0](answer())
    pending[1](new Response('{}', { status, headers: { 'retry-after': '900' } }))
    const result = await work
    assert.equal(result.ok, true)
    assert.equal(result.model, ROUTES.quality[0])
    const loser = ROUTES.quality[1]
    assert.equal(result.attempts.find(a => a.model === loser)?.status, status, 'fixture must settle the failure before loser cancellation')
    assert.equal(router.health().breakers[loser], 'open')
    if (status === 404) assert.equal(router.health().availability[loser].refusals, 1)
    // A new reasoning-profile request starts at the losing hedge. It must skip
    // the blocked model, not redispatch because the other model won the race.
    now += status === 404 ? 299_999 : 899_999
    const next = await router.complete({ messages, profile: 'reasoning', maxOutputTokens: 100 })
    assert.equal(next.attempts[0].outcome, 'circuit_open')
    assert.equal(calls.filter(m => m === loser).length, 1)
  })
}

test('already-settled reasoning-starved loser updates availability once', async () => {
  const pending: Array<(response: Response) => void> = []
  let ready!: () => void
  const both = new Promise<void>(resolve => { ready = resolve })
  const router = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1,
    breaker: { failureThreshold: 1, cooldownMs: 60000, maxCooldownMs: 60000 },
    fetcher: (async () => new Promise<Response>(resolve => { pending.push(resolve); if (pending.length === 2) ready() })) as typeof fetch })
  const work = router.complete({ messages, maxOutputTokens: 100 })
  await both
  pending[0](answer())
  pending[1](Response.json({ choices: [{ message: { content: '' }, finish_reason: 'length' }], usage: { prompt_tokens: 10, completion_tokens: 20, reasoning_tokens: 20 } }))
  const result = await work
  assert.equal(result.ok, true)
  assert.equal(result.usage.knownTotalTokens, 45)
  assert.equal(router.health().breakers[ROUTES.quality[1]], 'open')
  assert.equal(router.health().availability[ROUTES.quality[1]].reasoningExhausted, 1)
})

for (const status of [429, 503, 504, 404]) {
  test(`losing hedge with observed HTTP ${status} headers and stalled body cannot lose safety state`, async () => {
    let finishPrimary!: (response: Response) => void
    let headersSeen!: () => void
    const seen = new Promise<void>(resolve => { headersSeen = resolve })
    const router = new ModelRouter({ apiKey: 'fake', hedgeAfterMs: 1,
      breaker: { failureThreshold: 2, cooldownMs: 10, maxCooldownMs: 100 },
      fetcher: (async (_url, init) => {
        const model = JSON.parse(String(init?.body)).model
        if (model === ROUTES.quality[0]) return new Promise<Response>(resolve => { finishPrimary = resolve })
        const response = new Response('{}', { status, headers: { 'retry-after': '900' } })
        // Mark the exact post-headers/pre-body boundary without timing sleeps.
        response.json = () => { headersSeen(); return new Promise(() => {}) }
        return response
      }) as typeof fetch })
    const work = router.complete({ messages, maxOutputTokens: 100 })
    await seen
    finishPrimary(answer())
    const result = await work
    assert.equal(result.ok, true)
    const loser = ROUTES.quality[1]
    assert.equal(router.health().breakers[loser], 'open', 'winning before body parse finishes must not erase observed error/backoff')
    const attempt = result.attempts.find(a => a.model === loser)!
    assert.equal(attempt.status, status)
    assert.equal(attempt.billingUnknown, true, 'unparsed error-body billing remains unknown')
    assert.equal(result.usage.knownTotalTokens, 15)
    assert.equal(result.usage.reservedTokens, 248)
    if (status === 404) assert.equal(router.health().availability[loser].refusals, 1)
    const snapshot = JSON.stringify(result)
    await new Promise(resolve => setTimeout(resolve, 1))
    assert.equal(JSON.stringify(result), snapshot, 'late cancellation completion must not mutate or double-account the snapshot')
    if (status === 404) assert.equal(router.health().availability[loser].refusals, 1)
  })
}
