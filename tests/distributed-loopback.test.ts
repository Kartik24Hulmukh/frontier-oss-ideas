import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { startEmulator, createStore, execCommand, type Emulator } from '@/scripts/upstash-rest-emulator'
import { admitScan, ADMISSION_LUA } from '@/lib/core/admission'
import { reserveSharedTokens } from '@/lib/llm/shared-budget'
import { acceptableRedisUrl } from '@/lib/core/redis-endpoint'

const setNodeEnv = (v: string) => { (process.env as Record<string, string | undefined>).NODE_ENV = v }

let emu: Emulator
const saved = { ...process.env }

before(async () => {
  emu = await startEmulator(0)
})
after(async () => {
  await emu.close()
  Object.assign(process.env, saved)
})
beforeEach(() => {
  emu.reset()
  emu.setFault('off')
  process.env.UPSTASH_REDIS_REST_URL = emu.url
  process.env.UPSTASH_REDIS_REST_TOKEN = 'loopback-dev-token'
  process.env.ALLOW_LOOPBACK_REDIS = 'true'
  setNodeEnv('test')
})

test('loopback endpoint is refused unless explicitly opted in, and never in production', () => {
  assert.equal(acceptableRedisUrl('http://127.0.0.1:8099', { ALLOW_LOOPBACK_REDIS: 'true', NODE_ENV: 'test' } as NodeJS.ProcessEnv), true)
  assert.equal(acceptableRedisUrl('http://127.0.0.1:8099', { NODE_ENV: 'test' } as NodeJS.ProcessEnv), false)
  assert.equal(acceptableRedisUrl('http://127.0.0.1:8099', { ALLOW_LOOPBACK_REDIS: 'true', NODE_ENV: 'production' } as NodeJS.ProcessEnv), false)
  assert.equal(acceptableRedisUrl('http://evil.example.com', { ALLOW_LOOPBACK_REDIS: 'true', NODE_ENV: 'test' } as NodeJS.ProcessEnv), false)
  assert.equal(acceptableRedisUrl('https://real.upstash.io', {} as NodeJS.ProcessEnv), true)
})

test('admission is atomic and enforces the per-key window against the emulator', async () => {
  assert.equal(await admitScan('tenant-a', 80), 'ok')
  assert.equal(await admitScan('tenant-a', 1), 'limited')
  assert.equal(await admitScan('tenant-b', 1), 'ok')
})

test('admission enforces the shared global ceiling across distinct keys', async () => {
  for (let i = 0; i < 5; i++) assert.equal(await admitScan('tenant-' + i, 80), 'ok')
  assert.equal(await admitScan('tenant-fresh', 1), 'limited', 'global budget of 400 must bind')
})

test('concurrent admissions never oversell the window', async () => {
  const results = await Promise.all(Array.from({ length: 100 }, () => admitScan('tenant-race', 1)))
  assert.equal(results.filter((r) => r === 'ok').length, 80)
  assert.equal(results.filter((r) => r === 'limited').length, 20)
})

test('token reservations are irrevocable and bounded by the rolling window', async () => {
  assert.equal(await reserveSharedTokens(6000, 10000, 60000, 10000), 'ok')
  assert.equal(await reserveSharedTokens(5000, 10000, 60000, 10000), 'limited')
  assert.equal(await reserveSharedTokens(4000, 10000, 60000, 10000), 'ok')
})

test('gateway faults fail closed, never open', async () => {
  emu.setFault('error')
  assert.equal(await admitScan('tenant-fault', 1), 'unavailable')
  assert.equal(await reserveSharedTokens(10, 100, 60000, 10000), 'unavailable')
  emu.setFault('malformed')
  assert.equal(await admitScan('tenant-fault', 1), 'unavailable')
  assert.equal(await reserveSharedTokens(10, 100, 60000, 10000), 'unavailable')
  emu.setFault('down')
  assert.equal(await admitScan('tenant-fault', 1), 'unavailable')
})

test('production refuses a loopback limiter outright', async () => {
  setNodeEnv('production')
  assert.equal(await admitScan('tenant-prod', 1), 'unavailable')
  assert.equal(await reserveSharedTokens(10, 100, 60000, 10000), 'unavailable')
  setNodeEnv('test')
})

test('admission is a rolling window: a boundary cannot admit two quotas back to back', () => {
  let now = 1000
  const ctx = createStore(() => now)
  const run = (cost: number, nonce: string) => execCommand(ctx, ['EVAL', ADMISSION_LUA, 2, 'k', 'g', cost, 4, 100, 60, 150, nonce])
  assert.deepEqual(run(4, 'a'), { result: 1 })
  assert.deepEqual(run(1, 'b'), { result: 0 })
  now += 80
  assert.deepEqual(run(1, 'c'), { result: 0 }, 'half a window must not refill the quota')
  now += 90
  assert.deepEqual(run(4, 'd'), { result: 1 }, 'a fully elapsed window releases exactly the elapsed admissions')
})
