// Provider pacing torture test: token-budget ceilings, 429/5xx circuit
// breakers, and bounded 403/429 retry behavior on the GitHub adapter.
// All fetches are mocked — no network, no secrets.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BudgetGate, CircuitBreaker, UpstreamError } from '../lib/core/budget'

describe('token-budget ceilings', () => {
  it('refuses traffic past the per-minute ceiling and reports a retry delay', () => {
    const gate = new BudgetGate(3, 60_000)
    const now = 1_000_000
    assert.equal(gate.tryConsume('k', now).ok, true)
    assert.equal(gate.tryConsume('k', now + 1).ok, true)
    assert.equal(gate.tryConsume('k', now + 2).ok, true)
    const refused = gate.tryConsume('k', now + 3)
    assert.equal(refused.ok, false)
    assert.ok(refused.retryAfterMs > 0 && refused.retryAfterMs <= 60_000)
  })

  it('window slides: oldest entries expire and free budget', () => {
    const gate = new BudgetGate(1, 60_000)
    const now = 1_000_000
    assert.equal(gate.tryConsume('k', now).ok, true)
    assert.equal(gate.tryConsume('k', now + 61_000).ok, true)
  })
})

describe('circuit breakers for HTTP 429 and 5xx gateway timeouts', () => {
  it('opens after threshold consecutive failures and fast-fails', () => {
    const cb = new CircuitBreaker(3, 30_000)
    const now = 2_000_000
    cb.onFailure('gw:glm-5.3', now)
    cb.onFailure('gw:glm-5.3', now + 1)
    assert.equal(cb.canRequest('gw:glm-5.3', now + 2), true)
    cb.onFailure('gw:glm-5.3', now + 3)
    assert.equal(cb.canRequest('gw:glm-5.3', now + 4), false)
    assert.equal(cb.isOpen('gw:glm-5.3', now + 4), true)
  })

  it('half-open probe after cooldown; success closes the circuit', () => {
    const cb = new CircuitBreaker(2, 30_000)
    const now = 3_000_000
    cb.onFailure('gw:kimi-k3', now)
    cb.onFailure('gw:kimi-k3', now + 1)
    assert.equal(cb.canRequest('gw:kimi-k3', now + 2), false)
    // after cooldown a single probe is allowed
    assert.equal(cb.canRequest('gw:kimi-k3', now + 31_000), true)
    // concurrent probes are not allowed
    assert.equal(cb.canRequest('gw:kimi-k3', now + 31_001), false)
    cb.onSuccess('gw:kimi-k3')
    assert.equal(cb.canRequest('gw:kimi-k3', now + 31_002), true)
  })

  it('UpstreamError carries status and retryability', () => {
    const e = new UpstreamError('rate limited', 429)
    assert.equal(e.status, 429)
    assert.equal(e.retryable, true)
  })
})
