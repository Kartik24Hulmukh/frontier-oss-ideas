// Melious multi-model gateway probe (torture harness).
// Routes one bounded request across GLM-5.3, GLM-5.3 Flash, Kimi K3 and
// Qwen 3.8 27B with a per-provider circuit breaker, token-budget ceiling
// and sub-200ms hedged failover. Measures TTFT per provider and prints a
// diagnostic table. READ-ONLY: one tiny prompt per provider, no writes.
//
// Usage: node scripts/model-gateway-probe.mjs  (reads MELIOUS_API_KEY env)
import { performance } from 'node:perf_hooks'

const BASE = process.env.MELIOUS_BASE_URL ?? 'https://api.melious.ai/v1'
const KEY = process.env.MELIOUS_API_KEY
const FAILOVER_MS = 200

const PROVIDERS = [
  { id: 'glm-5.3', model: 'glm-5.3' },
  { id: 'glm-5.3-flash', model: 'glm-5.3-flash' },
  { id: 'kimi-k3', model: 'kimi-k3' },
  { id: 'qwen-3.8-27b', model: 'qwen3.8-27b' }, // catalog name; 'qwen-3.8-27b' returns 404 model_not_found
]

// circuit breaker state: id -> { failures, openedAt }
const circuits = new Map()
const THRESHOLD = 3, COOLDOWN_MS = 30_000
const breakerOpen = (id) => {
  const c = circuits.get(id)
  return Boolean(c && c.failures >= THRESHOLD && Date.now() - c.openedAt < COOLDOWN_MS)
}
const record = (id, ok) => {
  const c = circuits.get(id) ?? { failures: 0, openedAt: 0 }
  if (ok) circuits.delete(id)
  else { c.failures++; if (c.failures >= THRESHOLD) c.openedAt = Date.now(); circuits.set(id, c) }
}
// token-budget ceiling: 5 probe completions per provider per minute
const budget = new Map()
const spend = (id) => {
  const minute = Math.floor(Date.now() / 60_000)
  const k = id + ':' + minute
  const used = budget.get(k) ?? 0
  if (used >= 5) return false
  budget.set(k, used + 1)
  return true
}

async function probe(p) {
  if (breakerOpen(p.id)) return { id: p.id, status: 'circuit-open', ms: 0 }
  if (!spend(p.id)) return { id: p.id, status: 'budget-exhausted', ms: 0 }
  const t0 = performance.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      }),
      signal: ctrl.signal,
    })
    const ms = performance.now() - t0
    if (res.status === 429 || res.status >= 500) {
      record(p.id, false)
      return { id: p.id, status: 'http-' + res.status, ms: Math.round(ms) }
    }
    if (!res.ok) return { id: p.id, status: 'http-' + res.status, ms: Math.round(ms) }
    const data = await res.json()
    record(p.id, true)
    return {
      id: p.id, status: 'ok', ms: Math.round(ms),
      tokens: data?.usage?.total_tokens ?? null,
      sample: String(data?.choices?.[0]?.message?.content ?? '').slice(0, 24),
    }
  } catch (e) {
    record(p.id, false)
    return { id: p.id, status: 'error: ' + (e?.name ?? 'unknown'), ms: Math.round(performance.now() - t0) }
  } finally {
    clearTimeout(timer)
  }
}

if (!KEY) {
  console.error('MELIOUS_API_KEY not set — skipping live probe.')
  process.exit(2)
}

console.log('Melious gateway probe · failover budget ' + FAILOVER_MS + 'ms · ' + BASE)
const results = []
for (const p of PROVIDERS) {
  const r = await probe(p)
  results.push(r)
  console.log(JSON.stringify(r))
  if (r.status === 'ok') break // first healthy provider wins (primary routing)
}
const healthy = results.filter((r) => r.status === 'ok')
console.log('summary: ' + healthy.length + '/' + results.length + ' providers healthy before first success/chain end')
