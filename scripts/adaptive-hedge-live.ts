// Live adaptive-hedge drill against the real Melious gateway (1.5.5).
// Usage: MELIOUS_API_KEY=... tsx scripts/adaptive-hedge-live.ts > docs/evidence/adaptive-hedge-live-1.5.5.json
// Proves the three claims of 1.5.5 on real traffic:
//  1. the router learns each model's p90 latency with no hand-set constant,
//  2. healthy traffic is NOT hedged (the 1.5.4 limitation: a 150 ms constant hedged every call),
//  3. an injected hang is still detected and answered from the learned threshold.
import { ModelRouter, ROUTES, type RouteProfile } from '../lib/llm/router'

const apiKey = process.env.MELIOUS_API_KEY
if (!apiKey) { console.error('MELIOUS_API_KEY required'); process.exit(2) }
const msgs = [{ role: 'user' as const, content: 'Reply with the single word: ready' }]
const budget = { perRequestTokens: 6000, windowTokens: 400000, windowMs: 3600000 }
const policy = { minSamples: 3, multiplier: 1.3, minMs: 250, maxMs: 8000, maxHedgeRate: 0.34, minRequestsForRate: 6 }

function router(hang: string | null) {
  const fetcher = (async (url: string, init: RequestInit) => {
    const model = JSON.parse(String(init.body)).model
    if (hang && model === hang) return new Promise<Response>((_r, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    return fetch(url, init)
  }) as typeof fetch
  return new ModelRouter({ apiKey, fetcher, hedgeMode: 'adaptive', hedgePolicy: policy, budget })
}

async function main() {
  const out: Record<string, unknown> = { version: '1.5.5', at: new Date().toISOString(), policy }
  const phases: unknown[] = []
  for (const profile of ['quality', 'fast', 'reasoning'] as RouteProfile[]) {
    const primary = ROUTES[profile][0]
    const r = router(null)
    const warm: number[] = []
    for (let i = 0; i < 3; i++) {
      const res = await r.complete({ messages: msgs, profile, maxOutputTokens: 32 })
      warm.push(res.attempts[res.attempts.length - 1]?.latencyMs ?? -1)
      if (!res.ok) { phases.push({ profile, phase: 'warmup', ok: false, error: res.error }); break }
    }
    const learnedDelayMs = r.hedgeController.delayFor(primary)
    const p90 = r.hedgeController.p90(primary) ?? null
    // Control: a healthy call at the learned threshold must NOT be hedged.
    const control = await r.complete({ messages: msgs, profile, maxOutputTokens: 32 })
    const controlHedged = control.attempts.some((a) => a.hedged)
    // Fault: the primary hangs. Reuse the learned latency memory in a hang-injecting router.
    const f = router(primary)
    for (const ms of warm.filter((m) => m > 0)) f.hedgeController.observe(primary, ms, 'ok')
    const t0 = Date.now()
    const fault = await f.complete({ messages: msgs, profile, maxOutputTokens: 32 })
    const totalMs = Date.now() - t0
    phases.push({
      profile, primary, warmupLatenciesMs: warm, observedP90Ms: p90, learnedHedgeDelayMs: learnedDelayMs,
      control: { ok: control.ok, model: control.model, hedged: controlHedged, latencyMs: control.attempts[control.attempts.length - 1]?.latencyMs ?? null },
      fault: { ok: fault.ok, model: fault.model, error: fault.error, totalMs, recoveredFromHang: fault.ok && fault.model !== primary, attempts: fault.attempts },
      hedgeStats: f.health().hedging,
    })
  }
  out.phases = phases
  const p = phases as Array<{ control: { hedged: boolean; ok: boolean }; fault: { recoveredFromHang: boolean } }>
  out.summary = {
    profiles: p.length,
    healthyCallsHedged: p.filter((x) => x.control.hedged).length,
    healthyCallsOk: p.filter((x) => x.control.ok).length,
    hangsRecovered: p.filter((x) => x.fault.recoveredFromHang).length,
    pass: p.every((x) => x.control.ok && !x.control.hedged && x.fault.recoveredFromHang),
  }
  console.log(JSON.stringify(out, null, 2))
}
main()
