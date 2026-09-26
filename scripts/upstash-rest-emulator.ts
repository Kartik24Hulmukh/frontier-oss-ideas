/**
 * Upstash-REST-compatible loopback emulator.
 *
 * Why this exists (premortem PM2): the strict release gate stays red until a
 * distributed limiter is proven to work, but a verifier (auditor, CI job,
 * reviewer) has no cloud credential. Rather than loosening the gate, this
 * serves the exact Upstash REST contract our admission and shared-budget code
 * speaks, atomically (Node is single-threaded per request handler), with
 * server-side TIME and fault injection. It is accepted by the app only on
 * loopback, only outside production, only with ALLOW_LOOPBACK_REDIS=true.
 *
 * Run:  npm run redis:loopback -- 8099
 */
import { createServer, type Server } from 'node:http'

export type Fault = 'off' | 'error' | 'malformed' | 'down'

interface Entry {
  bucket?: number
  value?: number
  zset?: Array<{ score: number; member: string }>
  expiresAt?: number
}

export interface Emulator {
  url: string
  port: number
  server: Server
  setFault(f: Fault): void
  reset(): void
  close(): Promise<void>
}

export function createStore() {
  const store = new Map<string, Entry>()
  const live = (k: string): Entry | undefined => {
    const e = store.get(k)
    if (!e) return undefined
    if (e.expiresAt !== undefined && e.expiresAt <= Date.now()) {
      store.delete(k)
      return undefined
    }
    return e
  }
  return { store, live }
}

/** Rolling-window admission script (KEYS: per-key, global; ARGV: cost, perKey, global, ttlSeconds, windowMs, nonce). */
function evalAdmission(ctx: ReturnType<typeof createStore>, keys: string[], argv: string[]): number {
  const [cost, perKey, globalCap, ttl, windowMs] = argv.map(Number)
  const now = Date.now() // server-side time: app clock skew cannot widen the window
  const cutoff = now - windowMs
  const a = ctx.live(keys[0]), b = ctx.live(keys[1])
  const za = (a?.zset ?? []).filter((m) => m.score > cutoff)
  const zb = (b?.zset ?? []).filter((m) => m.score > cutoff)
  const expiresAt = now + ttl * 1000
  if (za.length + cost > perKey || zb.length + cost > globalCap) {
    ctx.store.set(keys[0], { zset: za, expiresAt })
    ctx.store.set(keys[1], { zset: zb, expiresAt })
    return 0
  }
  for (let i = 1; i <= cost; i++) {
    const member = `${now}:${argv[5]}:${i}`
    za.push({ score: now, member })
    zb.push({ score: now, member: `${keys[0]}|${member}` })
  }
  ctx.store.set(keys[0], { zset: za, expiresAt })
  ctx.store.set(keys[1], { zset: zb, expiresAt })
  return 1
}

/** Rolling-window irrevocable token reservation (KEYS: budget key; ARGV: tokens, limit, windowMs, deadlineMs, id). */
function evalReserve(ctx: ReturnType<typeof createStore>, keys: string[], argv: string[]): number {
  const tokens = Number(argv[0])
  const limit = Number(argv[1])
  const window = Number(argv[2]) + Number(argv[3])
  const now = Date.now() // server-side time: app clock skew cannot widen the budget
  const e = ctx.live(keys[0]) ?? { zset: [] }
  const zset = (e.zset ?? []).filter((m) => m.score > now - window)
  const used = zset.reduce((s, m) => s + Number(m.member.split(':')[0]), 0)
  if (used + tokens > limit) {
    ctx.store.set(keys[0], { zset, expiresAt: now + window * 2 })
    return 0
  }
  zset.push({ score: now, member: tokens + ':' + argv[4] })
  ctx.store.set(keys[0], { zset, expiresAt: now + window * 2 })
  return 1
}

export function execCommand(ctx: ReturnType<typeof createStore>, cmd: unknown[]): { result: number } | { error: string } {
  if (!Array.isArray(cmd) || String(cmd[0]).toUpperCase() !== 'EVAL') return { error: 'ERR only EVAL is emulated' }
  const script = String(cmd[1])
  const numKeys = Number(cmd[2])
  if (!Number.isInteger(numKeys) || numKeys < 1) return { error: 'ERR bad numkeys' }
  const keys = cmd.slice(3, 3 + numKeys).map(String)
  const argv = cmd.slice(3 + numKeys).map(String)
  try {
    // Dispatch on a marker unique to each production script; both are now rolling-window ZSETs.
    if (script.includes("'ZCARD'")) return { result: evalAdmission(ctx, keys, argv) }
    if (script.includes('ZREMRANGEBYSCORE')) return { result: evalReserve(ctx, keys, argv) }
    return { error: 'ERR unknown script' }
  } catch (e) {
    return { error: 'ERR ' + (e as Error).message }
  }
}

export async function startEmulator(port = 0, fault: Fault = 'off'): Promise<Emulator> {
  let ctx = createStore()
  let current: Fault = fault
  const server = createServer((req, res) => {
    if (current === 'down') {
      req.socket.destroy()
      return
    }
    const auth = req.headers.authorization ?? ''
    if (!auth.startsWith('Bearer ') || auth.length < 10) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      if (current === 'error') {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'injected upstream failure' }))
        return
      }
      if (current === 'malformed') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{ this is not json')
        return
      }
      let body: unknown
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'bad request body' }))
        return
      }
      const out = execCommand(ctx, body as unknown[])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(out))
    })
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const address = server.address()
  const boundPort = typeof address === 'object' && address ? address.port : port
  return {
    port: boundPort,
    url: 'http://127.0.0.1:' + boundPort,
    server,
    setFault: (f: Fault) => {
      current = f
    },
    reset: () => {
      ctx = createStore()
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

if (process.argv[1] && process.argv[1].includes('upstash-rest-emulator')) {
  const port = Number(process.argv[2] ?? 8099)
  const fault = (process.argv[3] as Fault) ?? 'off'
  startEmulator(port, fault).then((e) => {
    console.log('[upstash-emulator] listening on ' + e.url + ' (fault=' + fault + ')')
    console.log('[upstash-emulator] export UPSTASH_REDIS_REST_URL=' + e.url)
    console.log("[upstash-emulator] export UPSTASH_REDIS_REST_TOKEN=loopback-dev-token")
    console.log("[upstash-emulator] export ALLOW_LOOPBACK_REDIS=true  # never set in production")
  })
}
