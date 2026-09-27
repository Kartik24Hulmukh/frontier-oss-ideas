// Live stall-hedge drill against the real Melious gateway (1.5.4).
// Usage: MELIOUS_API_KEY=... tsx scripts/hedge-live.ts > docs/evidence/hedge-live-1.5.4.json
// Injects a hang into the first model of each profile; every other model is a real call.
import { ModelRouter, ROUTES, type RouteProfile } from '../lib/llm/router'

const apiKey = process.env.MELIOUS_API_KEY
if (!apiKey) { console.error('MELIOUS_API_KEY required'); process.exit(2) }
const HEDGE = Number(process.env.HEDGE_MS ?? 150)
const msgs = [{ role: 'user' as const, content: 'Reply with the single word: ready' }]

async function drill(profile: RouteProfile, inject: boolean) {
  const hung = ROUTES[profile][0]
  const fetcher = (async (url: string, init: RequestInit) => {
    const model = JSON.parse(String(init.body)).model
    if (inject && model === hung) {
      return new Promise<Response>((_r, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    }
    return fetch(url, init)
  }) as typeof fetch
  const router = new ModelRouter({ apiKey, fetcher, hedgeAfterMs: HEDGE, budget: { perRequestTokens: 6000, windowTokens: 100000, windowMs: 3600000 } })
  const t0 = Date.now()
  const res = await router.complete({ messages: msgs, profile, maxOutputTokens: 64 })
  const hedgeAttempt = res.attempts.find((a) => a.hedged)
  return { profile, injectedHang: inject ? hung : null, ok: res.ok, model: res.model, error: res.error, totalMs: Date.now() - t0, hedgeDispatchedAfterMs: HEDGE, hedgeAttemptLatencyMs: hedgeAttempt?.latencyMs ?? null, attempts: res.attempts, textPreview: res.text?.slice(0, 40) }
}

async function main() {
  const results = []
  for (const p of ['quality', 'fast', 'reasoning'] as RouteProfile[]) results.push(await drill(p, true))
  results.push(await drill('fast', false))
  const injected = results.filter((r) => r.injectedHang)
  console.log(JSON.stringify({ version: '1.5.4', at: new Date().toISOString(), hedgeAfterMs: HEDGE, passed: injected.filter((r) => r.ok && r.model !== r.injectedHang).length, total: injected.length, results }, null, 2))
}
main()
