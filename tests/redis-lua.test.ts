/** Actual Redis executes the production Lua. Set REDIS_TEST_PORT to enable. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ADMISSION_LUA } from '../lib/core/admission'
import { RESERVE_TOKENS_LUA } from '../lib/llm/shared-budget'
const exec = promisify(execFile)
const enabled = Boolean(process.env.REDIS_TEST_PORT)
async function redis(...args: (string | number)[]) {
  const { stdout } = await exec(process.env.REDIS_CLI || 'redis-cli', ['-h', '127.0.0.1', '-p', process.env.REDIS_TEST_PORT!, '--raw', ...args.map(String)])
  if (/^(ERR|WRONGTYPE|CROSSSLOT)/.test(stdout)) throw new Error(stdout)
  return stdout.trim()
}
test('real Redis: production Lua enforces concurrency, rollover, global and rolling ceilings', { skip: !enabled }, async () => {
  const prefix = `si-test:{${process.pid}}:`
  const key = prefix + 'client', global = prefix + 'global', budget = prefix + 'budget'
  const extra = Array.from({length: 6}, (_,i) => prefix + i)
  const rolling = [prefix + 'client2', prefix + 'global2']
  try {
    const admit = (client: string, cost = 1) => redis('EVAL', ADMISSION_LUA, 2, client, global, cost, 80, 400, 1200)
    const results = await Promise.all(Array.from({length: 100}, () => admit(key)))
    assert.equal(results.filter(r => r === '1').length, 80)
    assert.equal(results.filter(r => r === '0').length, 20)
    for (let i = 0; i < 4; i++) assert.equal(await admit(extra[i], 80), '1')
    assert.equal(await admit(extra[4]), '0')
    // Rolling window: only admissions older than the window are released, and a window
    // boundary can never admit two full quotas back to back (v2 fixed-window defect).
    const k2 = rolling[0], g2 = rolling[1]
    const stale = Date.now() - 11 * 60_000
    for (let i = 0; i < 80; i++) {
      await redis('ZADD', k2, stale, `${stale}:stale:${i}`)
      await redis('ZADD', g2, stale, `${k2}|${stale}:stale:${i}`)
    }
    const roll = (cost: number, nonce: string) => redis('EVAL', ADMISSION_LUA, 2, k2, g2, cost, 80, 400, 1200, 600000, nonce)
    assert.equal(await roll(80, 'r1'), '1')
    assert.equal(await redis('ZCARD', k2), '80')
    assert.equal(await roll(1, 'r2'), '0')
    assert.ok(Number(await redis('TTL', g2)) > 0)
    // Seed an expired reservation; Lua must remove it using server time.
    await redis('ZADD', budget, 1, '100:expired')
    const reserve = (id: number) => redis('EVAL', RESERVE_TOKENS_LUA, 1, budget, 10, 100, 60000, 10000, id)
    const reservations = await Promise.all(Array.from({length: 30}, (_, i) => reserve(i)))
    assert.equal(reservations.filter(r => r === '1').length, 10)
    assert.equal(reservations.filter(r => r === '0').length, 20)
    assert.equal(await redis('ZCARD', budget), '10')
    assert.ok(Number(await redis('PTTL', budget)) > 0)
  } finally { await redis('DEL', key, global, budget, ...extra, ...rolling) }
})
