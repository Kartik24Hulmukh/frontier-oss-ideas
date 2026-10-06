/** Independent Node worker. JSON-line test protocol; no emulated quota state. */
import { createInterface } from 'node:readline'
import { admitScan } from '../lib/core/admission'
import { reserveSharedTokens } from '../lib/llm/shared-budget'
import { pacedFetch, __resetSourceHealthForTests } from '../lib/core/pace'
import { persistProviderBackoff } from '../lib/core/budget'

const realNow = Date.now
Date.now = () => realNow() + Number(process.env.DRILL_CLOCK_SKEW_MS ?? 0)
async function run(c: Record<string, any>) {
  if (c.op === 'reset') { __resetSourceHealthForTests(); return 'reset' }
  if (c.op === 'backoff') return persistProviderBackoff(c.provider, c.delay)
  const attempt = async () => {
    if (c.op === 'admission') return admitScan(c.key, c.cost ?? 1)
    if (c.op === 'tokens') return reserveSharedTokens(c.cost, c.limit, c.window ?? 60_000, c.deadline ?? 60_000)
    if (c.op === 'provider') {
      if (c.ceiling) process.env['PACING_' + c.provider.toUpperCase() + '_PER_MINUTE'] = String(c.ceiling)
      try {
        const r = await pacedFetch(c.provider, process.env.UPSTASH_REDIS_REST_URL + '/upstream/' + c.provider + '/' + (c.scenario ?? 'ok'), c.auth ? { headers: { Authorization: 'Bearer synthetic-provider' } } : undefined)
        return r.status
      } catch (e) { return { status: (e as any).status ?? 0, message: (e as Error).message, retryAfterMs: (e as any).retryAfterMs ?? 0 } }
    }
    throw new Error('Unknown drill command')
  }
  return Promise.all(Array.from({ length: c.repeat ?? 1 }, attempt))
}
createInterface({ input: process.stdin }).on('line', line => {
  const c = JSON.parse(line)
  run(c).then(result => process.stdout.write(JSON.stringify({ id: c.id, result }) + '\n'), error => process.stdout.write(JSON.stringify({ id: c.id, error: String(error) }) + '\n'))
})
