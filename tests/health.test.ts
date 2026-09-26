import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GET } from '../app/api/health/route'
import { version } from '../package.json'
import { sharedBudgetMode } from '../lib/llm/shared-budget'
import { acceptableRedisUrl } from '../lib/core/redis-endpoint'
import { admitScan } from '../lib/core/admission'
test('health uses package version and never labels partial/invalid limiter config distributed', async () => {
  const saved = { ...process.env }
  try {
    process.env.UPSTASH_REDIS_REST_URL = 'https://valid.upstash.io'
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    let health = await (await GET()).json()
    assert.equal(health.version, version)
    assert.equal(health.admission, 'blocked-invalid-config')
    assert.equal(sharedBudgetMode(), 'blocked-invalid-config')
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only'
    process.env.UPSTASH_REDIS_REST_URL = 'https://'
    health = await (await GET()).json()
    assert.equal(health.admission, 'blocked-invalid-config')
    assert.equal(sharedBudgetMode(), 'blocked-invalid-config')
  } finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved) }
})
test('Redis URL validation parses HTTPS and treats IPv6 loopback consistently', () => {
  for (const url of ['https://', 'https://user:pass@remote.test', 'https://remote.test/#fragment', 'http://remote.test']) assert.equal(acceptableRedisUrl(url, { NODE_ENV: 'test' }), false)
  assert.equal(acceptableRedisUrl('http://[::1]:8099', { NODE_ENV: 'test', ALLOW_LOOPBACK_REDIS: 'true' }), true)
  assert.equal(acceptableRedisUrl('https://localhost', { NODE_ENV: 'production', ALLOW_LOOPBACK_REDIS: 'true' }), false)
})
test('application clock skew cannot choose independent admission windows', async () => {
  const saved = { ...process.env }, now = Date.now
  const commands: unknown[][] = []
  try {
    process.env.UPSTASH_REDIS_REST_URL = 'https://valid.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only'
    const fetcher = (async (_url: unknown, init: RequestInit) => { commands.push(JSON.parse(init.body as string)); return Response.json({ result: 1 }) }) as typeof fetch
    Date.now = () => 1
    await admitScan('same-client', 1, fetcher)
    Date.now = () => 9999999999999
    await admitScan('same-client', 1, fetcher)
    // Only the per-admission uniqueness nonce may differ: no app-clock input reaches the script.
    assert.deepEqual(commands[0].slice(0, -1), commands[1].slice(0, -1))
    assert.notEqual(commands[0].at(-1), commands[1].at(-1), 'each admission must carry a unique member nonce')
    assert.match(String(commands[0].at(-1)), /^[0-9a-f-]{36}$/)
    assert.match(commands[0][1] as string, /redis.call\('TIME'\)/)
  } finally { Date.now = now; for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved) }
})

 test('a configured signer alone is not an independent issuer pin', async () => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { issueReceipt, trustedReceipt } = await import('../lib/scoring/receipt')
  const { computeCrowding } = await import('../lib/scoring/score')
  const oldPrivate = process.env.RECEIPT_PRIVATE_KEY, oldPublic = process.env.RECEIPT_PUBLIC_KEY
  try {
    const pair = generateKeyPairSync('ed25519')
    process.env.RECEIPT_PRIVATE_KEY = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    delete process.env.RECEIPT_PUBLIC_KEY
    const capsule = computeCrowding('test idea', []).capsule
    const receipt = issueReceipt(capsule)
    assert.equal(trustedReceipt(capsule, receipt), false)
    process.env.RECEIPT_PUBLIC_KEY = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
    assert.equal(trustedReceipt(capsule, receipt), true)
  } finally {
    if (oldPrivate === undefined) delete process.env.RECEIPT_PRIVATE_KEY; else process.env.RECEIPT_PRIVATE_KEY = oldPrivate
    if (oldPublic === undefined) delete process.env.RECEIPT_PUBLIC_KEY; else process.env.RECEIPT_PUBLIC_KEY = oldPublic
  }
})
