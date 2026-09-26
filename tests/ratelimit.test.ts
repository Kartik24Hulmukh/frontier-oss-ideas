import assert from 'node:assert/strict'
import test from 'node:test'
import { clientIp, rateLimit, rateLimitHeaders } from '../lib/core/ratelimit'

test('rate limiter allows within the window and blocks past the limit', () => {
  const key = 'test:' + Math.random()
  const first = rateLimit(key, 2, 60_000)
  const second = rateLimit(key, 2, 60_000)
  const third = rateLimit(key, 2, 60_000)
  assert.equal(first.allowed, true)
  assert.equal(second.allowed, true)
  assert.equal(third.allowed, false)
  assert.equal(third.remaining, 0)
  assert.ok(third.resetInSeconds >= 1)
})

test('rate limiter resets after the window expires', () => {
  const key = 'test:' + Math.random()
  rateLimit(key, 1, 10)
  assert.equal(rateLimit(key, 1, 10).allowed, false)
  // wait past the window
  const start = Date.now()
  while (Date.now() - start < 15) { /* spin briefly */ }
  assert.equal(rateLimit(key, 1, 10).allowed, true)
})

test('different keys do not share buckets', () => {
  const base = 'test:' + Math.random()
  rateLimit(base + ':a', 1, 60_000)
  assert.equal(rateLimit(base + ':a', 1, 60_000).allowed, false)
  assert.equal(rateLimit(base + ':b', 1, 60_000).allowed, true)
})

test('clientIp prefers x-forwarded-for first hop', () => {
  const req = new Request('https://example.com', {
    headers: { 'x-forwarded-for': '203.0.113.9, 70.41.3.18' },
  })
  assert.equal(clientIp(req), '203.0.113.9')
  const fallback = new Request('https://example.com', { headers: { 'x-real-ip': '198.51.100.2' } })
  assert.equal(clientIp(fallback), '198.51.100.2')
})

test('rate limit headers expose limit and remaining', () => {
  const key = 'test:' + Math.random()
  const rl = rateLimit(key, 5, 60_000)
  const headers = rateLimitHeaders(rl)
  assert.equal(headers['X-RateLimit-Limit'], '5')
  assert.equal(headers['X-RateLimit-Remaining'], '4')
})
