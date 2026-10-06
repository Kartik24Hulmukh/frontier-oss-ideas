/** Test-only runner-owned Redis6390. Never touches parent Redis6389.
 * AOF + always fsync for the bounded crash/recovery drill, NOT HA evidence. */
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
export async function ephemeralRedis() {
  const dir = await mkdtemp('/data/go-redis-drill-')
  let child: ChildProcess | undefined
  async function start() {
    if (child) throw new Error('Runner Redis is already running')
    const next = spawn('/data/redis-test-host/redis-7.4.6/src/redis-server', ['--port', '6390', '--bind', '127.0.0.1', '--protected-mode', 'yes', '--dir', dir, '--save', '', '--appendonly', 'yes', '--appendfsync', 'always'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { next.kill(); reject(new Error('Redis startup timeout: ' + output)) }, 5000)
      next.stdout!.on('data', c => { output += c; if (output.includes('Ready to accept connections')) { clearTimeout(timer); resolve() } })
      next.stderr!.on('data', c => { output += c })
      next.once('exit', code => { clearTimeout(timer); reject(new Error('Runner Redis exited before ready: ' + code + ' ' + output)) })
    })
    child = next
  }
  async function stop(signal: NodeJS.Signals = 'SIGKILL') {
    if (!child) return
    const prior = child; child = undefined
    await new Promise<void>(resolve => { prior.once('exit', () => resolve()); prior.kill(signal) })
  }
  try { await start() } catch (e) { await rm(dir, { recursive: true, force: true }); throw e }
  return { port: '6390', start, stop, async close() { await stop('SIGTERM'); await rm(dir, { recursive: true, force: true }) } }
}
