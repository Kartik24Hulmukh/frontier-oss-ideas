/** Run: env -i PATH="$PATH" HOME=/data ./node_modules/.bin/tsx scripts/distributed-redis-drill.ts
 * Starts runner-owned real Redis6390; dedicated DB14. Parent6389 untouched. Local evidence only.
 */
import { spawn, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createInterface } from 'node:readline'
import assert from 'node:assert/strict'
import { startRealRedisBridge } from './real-redis-rest-bridge'
import { ephemeralRedis } from './ephemeral-redis-process'

async function main() {
  const redisProcess = await ephemeralRedis()
  process.env.REDIS_PORT = redisProcess.port
  const bridge = await startRealRedisBridge().catch(async error => { await redisProcess.close(); throw error })
  await bridge.cleanup()
  function worker(skew: number) {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/distributed-redis-worker.ts'], {
      cwd: process.cwd(), env: { PATH: process.env.PATH, HOME: '/data', NODE_ENV: 'test', ALLOW_LOOPBACK_REDIS: 'true', REQUIRE_DISTRIBUTED_LIMITS: 'true', UPSTASH_REDIS_REST_URL: bridge.url, UPSTASH_REDIS_REST_TOKEN: 'loopback-drill-only', DRILL_CLOCK_SKEW_MS: String(skew) }, stdio: ['pipe', 'pipe', 'pipe'],
    })
    let seq = 0, stderr = ''
    const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()
    child.stderr.on('data', c => { stderr += c })
    createInterface({ input: child.stdout }).on('line', line => {
      const data = JSON.parse(line), p = pending.get(data.id)
      if (!p) return
      clearTimeout(p.timer); pending.delete(data.id)
      if (data.error) p.reject(new Error(data.error)); else p.resolve(data.result)
    })
    child.on('exit', () => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Worker exited: ' + stderr)) } pending.clear() })
    return {
      pid: child.pid,
      run(command: object): Promise<any> {
        const id = ++seq
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => { pending.delete(id); reject(new Error('Worker timeout: ' + stderr)) }, 15_000)
          pending.set(id, { resolve, reject, timer }); child.stdin.write(JSON.stringify({ id, ...command }) + '\n')
        })
      },
      close: () => child.kill(),
    }
  }
  const a = worker(0), b = worker(3_600_000)
  const evidence: Record<string, any> = { checkedAt: new Date().toISOString(), baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceSha256: Object.fromEntries(['lib/core/admission.ts', 'lib/core/budget.ts', 'lib/core/pace.ts', 'lib/llm/shared-budget.ts'].map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])), scope: 'local two-process + real Redis, NOT staging/managed provider evidence', redisVersion: bridge.version, isolatedDb: bridge.db, pids: [a.pid, b.pid], clockSkewMs: [0, 3_600_000], cases: [] }
  assert.notEqual(a.pid, b.pid)
  const record = (name: string, details: object) => evidence.cases.push({ name, ...details })
  try {
    let results = (await Promise.all([a.run({ op: 'admission', key: 'same-client', repeat: 50 }), b.run({ op: 'admission', key: 'same-client', repeat: 50 })])).flat()
    assert.equal(results.filter(x => x === 'ok').length, 80)
    assert.equal(results.filter(x => x === 'limited').length, 20)
    record('same-client atomic80 with skew', { admitted: 80, limited: 20 })
    await bridge.cleanup()
    results = (await Promise.all(Array.from({ length: 10 }, (_, i) => (i % 2 ? a : b).run({ op: 'admission', key: 'client' + i, cost: 80 })))).flat()
    assert.equal(results.filter(x => x === 'ok').length, 5)
    record('shared work-unit400', { acceptedBatches: 5, rejectedBatches: 5, batchCost: 80 })
    results = (await Promise.all([a.run({ op: 'tokens', cost: 100, limit: 1000, repeat: 8 }), b.run({ op: 'tokens', cost: 100, limit: 1000, repeat: 8 })])).flat()
    assert.equal(results.filter(x => x === 'ok').length, 10)
    assert.equal(results.filter(x => x === 'limited').length, 6)
    record('irrevocable shared token1000', { accepted: 10, limited: 6, cost: 100 })
    results = (await Promise.all([a.run({ op: 'provider', provider: 'fleet', ceiling: 7, repeat: 10 }), b.run({ op: 'provider', provider: 'fleet', ceiling: 7, repeat: 10 })])).flat()
    assert.equal(results.filter(x => x === 200).length, 7)
    assert.equal(bridge.calls.get('fleet'), 7)
    record('actual provider dispatch shared7', { dispatched: 7, rejected: 13 })
    // Anonymous calls are <=10 even with a configured authenticated ceiling30.
    results = (await Promise.all([a.run({ op: 'provider', provider: 'github', ceiling: 30, repeat: 8 }), b.run({ op: 'provider', provider: 'github', ceiling: 30, repeat: 8 })])).flat()
    assert.equal(results.filter(x => x === 200).length, 10)
    assert.equal(bridge.calls.get('github'), 10)
    record('anonymous GitHub clamps30 to10', { dispatched: 10, rejected: 6 })
    // delta/date/reset/body policy tests: receive on A; independent B must not dispatch.
    for (const [provider, scenario, expectedStatus] of [['delta', 'delta', 429], ['date', 'date', 429], ['github', 'reset', 403], ['stackoverflow', 'body', 200]] as const) {
      await bridge.cleanup(); await a.run({ op: 'reset' }); await b.run({ op: 'reset' })
      const first = await a.run({ op: 'provider', provider, scenario })
      assert.equal(first[0], expectedStatus)
      const before = bridge.calls.get(provider)
      const second = await b.run({ op: 'provider', provider })
      assert.equal(second[0].status, 429)
      assert.ok(second[0].retryAfterMs >= 55_000)
      assert.equal(bridge.calls.get(provider), before)
      record('cross-worker backoff ' + scenario, { dispatched: 1, rejected: 1, retryAfterMs: second[0].retryAfterMs })
    }
    // Monotonic cooldown: short update never overwrites a long provider wait.
    assert.equal(await a.run({ op: 'backoff', provider: 'monotonic', delay: 120_000 }), true)
    assert.equal(await b.run({ op: 'backoff', provider: 'monotonic', delay: 1000 }), true)
    const monotonic = await b.run({ op: 'provider', provider: 'monotonic' })
    assert.ok(monotonic[0].retryAfterMs >= 115_000)
    record('cooldown max not last-writer', { retryAfterMs: monotonic[0].retryAfterMs })
    // Real Redis expiry recovery at short explicit cooldown, no application clock.
    await a.run({ op: 'backoff', provider: 'expiry', delay: 150 })
    const rejected = await b.run({ op: 'provider', provider: 'expiry' })
    assert.equal(rejected[0].status, 429)
    await new Promise(r => setTimeout(r, 200))
    assert.equal((await b.run({ op: 'provider', provider: 'expiry' }))[0], 200)
    record('Redis cooldown expiry recovery', { rejected: 1, recovered: 1 })
    bridge.setCorrupt(true)
    const malformed = await b.run({ op: 'provider', provider: 'corrupt' })
    assert.equal(malformed[0].status, 503); assert.equal(bridge.calls.get('corrupt'), undefined)
    bridge.setCorrupt(false)
    record('malformed backend no dispatch', { rejected: 1 })
    // Backend HTTP outage after real successful operations. No local fallback.
    bridge.setUnavailable(true)
    results = (await Promise.all([a.run({ op: 'admission', key: 'outage' }), b.run({ op: 'tokens', cost: 1, limit: 1000 })])).flat()
    assert.deepEqual(results, ['unavailable', 'unavailable'])
    assert.equal((await b.run({ op: 'provider', provider: 'outage' }))[0].status, 503)
    assert.equal(bridge.calls.get('outage'), undefined)
    record('backend transport outage fail-closed', { admission: 'unavailable', tokens: 'unavailable', provider: 503, dispatches: 0 })
    bridge.setUnavailable(false)
    // Successful reservation followed by inability to persist provider backoff.
    bridge.failAfterNextEval(true)
    const failedWrite = await a.run({ op: 'provider', provider: 'failed-write', scenario: 'delta' })
    assert.equal(failedWrite[0].status, 503)
    assert.equal((await b.run({ op: 'provider', provider: 'failed-write' }))[0].status, 503)
    assert.equal(bridge.calls.get('failed-write'), 1)
    record('cooldown persistence outage rejects source and next replica', { first: 503, second: 503, dispatched: 1 })
    bridge.failAfterNextEval(false); bridge.setUnavailable(false)
    // Policy disagreements can only tighten this provider bucket, not widen it.
    await bridge.cleanup(); await a.run({ op: 'reset' }); await b.run({ op: 'reset' })
    assert.equal((await a.run({ op: 'provider', provider: 'policy', ceiling: 2, repeat: 2 })).filter((x: any) => x === 200).length, 2)
    assert.equal((await b.run({ op: 'provider', provider: 'policy', ceiling: 20 }))[0].status, 429)
    assert.equal(bridge.calls.get('policy'), 2)
    record('replica provider config cannot widen active ceiling', { stricter: 2, looser: 20, dispatched: 2 })
    await bridge.cleanup(); await a.run({ op: 'reset' }); await b.run({ op: 'reset' })
    assert.equal((await a.run({ op: 'admission', key: 'crash', repeat: 8 })).filter((x: any) => x === 'ok').length, 8)
    assert.equal((await a.run({ op: 'tokens', cost: 300, limit: 1000 }))[0], 'ok')
    assert.equal((await a.run({ op: 'provider', provider: 'restart', ceiling: 2 }))[0], 200)
    await redisProcess.stop('SIGKILL')
    const dead = (await Promise.all([a.run({ op: 'admission', key: 'crash', repeat: 16 }), b.run({ op: 'admission', key: 'crash', repeat: 16 })])).flat()
    assert.equal(dead.filter(x => x === 'unavailable').length, 32)
    assert.equal((await b.run({ op: 'tokens', cost: 100, limit: 1000 }))[0], 'unavailable')
    assert.equal((await b.run({ op: 'provider', provider: 'restart', ceiling: 2 }))[0].status, 503)
    assert.equal(bridge.calls.get('restart'), 1)
    record('real Redis SIGKILL mid-workload fails closed', { admittedBeforeCrash: 8, admissionsRefusedDuringOutage: 32, tokens: 'unavailable', provider: 503, newDispatches: 0 })
    await redisProcess.start()
    assert.equal(await bridge.redis(['ZCARD', 'si:quota:v3:{admission}:global']), 8)
    assert.equal((await b.run({ op: 'tokens', cost: 800, limit: 1000 }))[0], 'limited')
    assert.equal((await b.run({ op: 'provider', provider: 'restart', ceiling: 2 }))[0], 200)
    assert.equal((await a.run({ op: 'provider', provider: 'restart', ceiling: 2 }))[0].status, 429)
    assert.equal(bridge.calls.get('restart'), 2)
    record('AOF restart preserves admission/token/provider debt', { priorAdmissionUnits: 8, tokenOverrunRefused: true, providerTotal: 2 })
    console.log(JSON.stringify(evidence, null, 2))
  } finally { a.close(); b.close(); await bridge.cleanup(); await bridge.close(); await redisProcess.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
