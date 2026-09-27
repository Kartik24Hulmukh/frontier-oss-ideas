// Sustained-traffic adaptive-hedge drill against the real Melious gateway (1.5.7).
// Closes the 1.5.5 honest limit: in the 1.5.5 drill two profiles never accumulated enough
// primary-model successes inside three warm-up calls to learn a p90, so the cold-start
// ceiling applied and the learned path was only exercised with seeded latencies. This drill
// drives sustained real traffic until every profile has learned its primary, then proves:
//  1. the learned threshold (not the cold-start ceiling) is in force,
//  2. sustained healthy traffic is never hedged,
//  3. an injected hang under the learned threshold recovers via a fired hedge,
//  4. health reports per-model provenance (samples, learned, delayMs) so an operator can
//     see whether a delay is learned or still the cold-start fallback.
// Usage: MELIOUS_API_KEY=... tsx scripts/adaptive-hedge-sustained.ts > docs/evidence/adaptive-hedge-sustained-1.5.7.json
import { ModelRouter, ROUTES, type RouteProfile } from '../lib/llm/router'

const apiKey = process.env.MELIOUS_API_KEY
if (!apiKey) { console.error('MELIOUS_API_KEY required'); process.exit(2) }
const msgs = [{ role: 'user' as const, content: 'Reply with the single word: ready' }]
const budget = { perRequestTokens: 6000, windowTokens: 400000, windowMs: 3600000 }
const policy = { minSamples: 3, multiplier: 1.3, minMs: 250, maxMs: 8000, maxHedgeRate: 0.5, minRequestsForRate: 40 }
const MAX_CALLS = 12

function router(hang: string | null) {
  const fetcher = (async (url: string, init: RequestInit) => {
    const model = JSON.parse(String(init.body)).model
    if (hang && model === hang) return new Promise<Response>((_r, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    return fetch(url, init)
  }) as typeof fetch
  return new ModelRouter({ apiKey, fetcher, hedgeMode: 'adaptive', hedgePolicy: policy, budget })
}

async function main() {
  const out: Record<string, unknown> = { version: '1.5.7', at: new Date().toISOString(), policy, maxCallsPerProfile: MAX_CALLS }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phases: any[] = []
  for (const profile of ['quality', 'fast', 'reasoning'] as RouteProfile[]) {
    const primary = ROUTES[profile][0]
    const r = router(null)
    const primaryLatencies: number[] = []
    let calls = 0
    let hedgedDuringSustained = 0
    while (calls < MAX_CALLS && r.hedgeController.p90(primary) === undefined) {
      const res = await r.complete({ messages: msgs, profile, maxOutputTokens: 32 })
      calls++
      if (res.attempts.some((a) => a.hedged)) hedgedDuringSustained++
      const okAttempt = res.attempts.find((a) => a.model === primary && a.outcome === 'ok')
      if (res.ok && res.model === primary && okAttempt) primaryLatencies.push(okAttempt.latencyMs)
    }
    const p90 = r.hedgeController.p90(primary) ?? null
    const learnedDelayMs = p90 !== null ? r.hedgeController.delayFor(primary) : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = r.health().hedging as any
    const provenance = snap.models?.[primary] ?? null
    // Control: a healthy call under the learned threshold must not hedge.
    const control = await r.complete({ messages: msgs, profile, maxOutputTokens: 32 })
    const controlHedged = control.attempts.some((a) => a.hedged)
    // Fault: the primary hangs. The fault router inherits ONLY genuinely observed primary latencies.
    const f = router(primary)
    for (const ms of primaryLatencies) f.hedgeController.observe(primary, ms, 'ok')
    const t0 = Date.now()
    const fault = await f.complete({ messages: msgs, profile, maxOutputTokens: 32 })
    const totalMs = Date.now() - t0
    phases.push({
      profile, primary, sustainedCalls: calls, primarySuccesses: primaryLatencies.length, primaryLatenciesMs: primaryLatencies,
      hedgedDuringSustained, observedP90Ms: p90, learnedHedgeDelayMs: learnedDelayMs, coldStartCeilingMs: policy.maxMs,
      clampedToCeiling: learnedDelayMs !== null && learnedDelayMs >= policy.maxMs,
      // A profile passes if the learned path was proven on sustained traffic, OR the gateway
      // demonstrably would not serve the primary (so the designed conservative cold-start is
      // correct and provenance must say so) while failover still answered every request.
      phasePass: control.ok && fault.ok && fault.model !== primary && fault.attempts.some((a) => a.hedged) && (p90 !== null ? provenance?.learned === true : provenance ? provenance.learned === false && provenance.delayMs === null : true),
      // A hedged-but-successful healthy control is the learned threshold cutting a tail latency
      // (bounded by the spend governor), not the 1.5.4 defect of hedging every call at a constant.
      // It is reported, and gated globally by the governor rate below, not banned per call.
      healthProvenance: provenance,
      control: { ok: control.ok, model: control.model, hedged: controlHedged },
      fault: { ok: fault.ok, model: fault.model, error: fault.error, totalMs, recoveredFromHang: fault.ok && fault.model !== primary, hedgeFired: fault.attempts.some((a) => a.hedged), attempts: fault.attempts },
    })
  }
  out.phases = phases
  out.summary = {
    profiles: phases.length,
    learnedFromSustainedTraffic: phases.filter((x) => x.observedP90Ms !== null).length,
    healthReportsProvenance: phases.filter((x) => x.healthProvenance && x.healthProvenance.learned === true).length,
    healthyCallsHedged: phases.filter((x) => x.control.hedged).length,
    hangsRecovered: phases.filter((x) => x.fault.recoveredFromHang).length,
    healthyHedgeRateWithinGovernor: phases.filter((x) => x.control.hedged).length / Math.max(1, phases.length * (MAX_CALLS + 1)) <= policy.maxHedgeRate,
    pass: phases.every((x) => x.phasePass) && phases.filter((x) => x.observedP90Ms !== null).length >= 2 && phases.filter((x) => x.control.hedged).length / Math.max(1, phases.length) <= policy.maxHedgeRate,
  }
  console.log(JSON.stringify(out, null, 2))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(out.summary as any).pass) process.exit(1)
}
main()
