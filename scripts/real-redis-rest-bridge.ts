/** Test-only loopback REST transport; executes the unmodified production Lua
 * on real Redis through redis-cli. No emulator, remote target or real credentials.
 * DB14 by default is exclusively reserved for this bounded drill. */
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ADMISSION_LUA } from '../lib/core/admission'
import { RESERVE_TOKENS_LUA } from '../lib/llm/shared-budget'
import { PROVIDER_RESERVE_LUA, PROVIDER_BACKOFF_LUA } from '../lib/core/budget'

const exec = promisify(execFile)
export async function startRealRedisBridge() {
  const cli = process.env.REDIS_CLI ?? '/data/redis-test-host/redis-7.4.6/src/redis-cli'
  const port = process.env.REDIS_PORT ?? '6389'
  const db = process.env.REDIS_DRILL_DB ?? '14'
  if (!/^\d+$/.test(port) || !/^\d+$/.test(db) || db === '0') throw new Error('Use an isolated nonzero drill DB')
  const redis = async (cmd: (string | number)[]) => {
    const { stdout } = await exec(cli, ['-h', '127.0.0.1', '-p', port, '-n', db, '--json', ...cmd.map(String)], { timeout: 3000, maxBuffer: 256_000 })
    return cmd[0] === 'INFO' ? stdout : JSON.parse(stdout.trim())
  }
  if (await redis(['PING']) !== 'PONG') throw new Error('Real Redis is required')
  const info = await redis(['INFO', 'server']) as string
  const version = /redis_version:([^\r\n]+)/.exec(info)?.[1]
  const scripts = new Set([ADMISSION_LUA, RESERVE_TOKENS_LUA, PROVIDER_RESERVE_LUA, PROVIDER_BACKOFF_LUA])
  const calls = new Map<string, number>()
  const evals = new Map<string, number>()
  let unavailable = false, corrupt = false, outageAfterEval = false
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url!, 'http://127.0.0.1').pathname
      if (pathname.startsWith('/upstream/')) {
        const name = pathname.split('/')[2]
        calls.set(name, (calls.get(name) ?? 0) + 1)
        const scenario = pathname.split('/')[3]
        res.setHeader('Content-Type', 'application/json')
        if (scenario === 'delta') { res.statusCode = 429; res.setHeader('Retry-After', '60') }
        if (scenario === 'date') { res.statusCode = 429; res.setHeader('Retry-After', new Date(Date.now() + 120_000).toUTCString()) }
        if (scenario === 'reset') { res.statusCode = 403; res.setHeader('X-RateLimit-Remaining', '0'); res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + 120)) }
        res.end(JSON.stringify(scenario === 'body' ? { items: [], total: 0, backoff: 60 } : { items: [], total: 0 }))
        return
      }
      if (req.headers.authorization !== 'Bearer loopback-drill-only' || req.method !== 'POST') { res.writeHead(403).end(); return }
      if (unavailable) { res.writeHead(503).end(); return }
      let body = ''
      for await (const chunk of req) { body += chunk; if (body.length > 128_000) throw new Error('Too large') }
      const cmd = JSON.parse(body)
      if (!Array.isArray(cmd) || cmd[0] !== 'EVAL' || !scripts.has(cmd[1])) throw new Error('Only exact production EVAL scripts permitted')
      evals.set(cmd[1], (evals.get(cmd[1]) ?? 0) + 1)
      const result = await redis(cmd)
      if (outageAfterEval) unavailable = true
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(corrupt ? { result: 'invalid' } : { result }))
    } catch { res.writeHead(503).end() }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No bridge port')
  const url = `http://127.0.0.1:${address.port}`
  return {
    url, redis, calls, evals, version, db,
    setUnavailable(value: boolean) { unavailable = value },
    setCorrupt(value: boolean) { corrupt = value },
    failAfterNextEval(value: boolean) { outageAfterEval = value },
    async cleanup() {
      // Only production keys created in the explicitly dedicated DB; no FLUSHDB.
      const keys = await redis(['KEYS', 'si:*']) as string[]
      if (keys.length) await redis(['DEL', ...keys])
    },
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  }
}
