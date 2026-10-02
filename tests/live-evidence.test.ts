import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { faultInjectingFetch } from '../lib/llm/fault-injection'
import { ModelRouter, MODELS } from '../lib/llm/router'

const model = Object.keys(MODELS)[0]
const init = { method: 'POST', body: JSON.stringify({ model }) }
for (const status of [200, 401, 403, 429, 500, 503, 504]) {
  for (const body of ['insufficient_quota', 'credit exhausted', 'quota exceeded', 'malformed upstream body']) {
    test(`live verification preserves status/body/identity: ${status} ${body}`, async () => {
      const response = new Response(body, { status })
      const upstream = (async () => response) as typeof fetch
      const result = await faultInjectingFetch(upstream, {})('https://example.test', init)
      assert.equal(result, response)
      assert.equal(result.bodyUsed, false)
      assert.equal(await result.text(), body)
    })
  }
}
test('real exhausted gateway fails routing; no synthetic completion succeeds', async () => {
  let calls = 0
  const upstream = (async () => { calls++; return Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 }) }) as typeof fetch
  const router = new ModelRouter({ apiKey: 'test', fetcher: faultInjectingFetch(upstream, {}) })
  const result = await router.complete({ messages: [{ role: 'user', content: 'hello' }] })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'all_models_failed')
  assert.equal(calls, 4)
  assert.ok(result.attempts.every(a => a.outcome === 'rate_limited'))
  assert.equal(result.text, undefined)
})
test('injected failures never contact upstream', async () => {
  let calls = 0
  const upstream = (async () => { calls++; return Response.json({}) }) as typeof fetch
  const fetcher = faultInjectingFetch(upstream, { [model]: 429 })
  assert.equal((await fetcher('https://example.test', init)).status, 429)
  assert.equal(calls, 0)
})
test('injected hang rejects even when already aborted', async () => {
  const c = new AbortController(); c.abort()
  await assert.rejects(faultInjectingFetch(fetch, { [model]: 'hang' })('https://example.test', { ...init, signal: c.signal }), { name: 'TimeoutError' })
})
test('live evidence declares mode and never claims synthetic successes as live', () => {
  const text = readFileSync('scripts/llm-torture.ts', 'utf8')
  assert.match(text, /syntheticCompletions: false/)
  assert.match(text, /live-with-injected-faults/)
  assert.doesNotMatch(text, /chatcmpl-|Math\.random/)
})

for (let status = 200; status < 400; status++) {
  test(`verification cannot inject a successful response: ${status}`, async () => {
    await assert.rejects(faultInjectingFetch(fetch, { [model]: status })('https://example.test', init), RangeError)
  })
}
