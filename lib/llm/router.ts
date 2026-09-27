import { reserveSharedTokens, sharedBudgetMode } from './shared-budget'
import { HedgeController, type HedgePolicy } from './hedge-policy'
/**
 * Melious model router: token-budget ceilings, sub-200ms failover and per-model
 * circuit breakers for HTTP 429 / 5xx / gateway timeouts.
 *
 * Design rules (premortem-driven):
 * - Budgets are enforced BEFORE any network call (no "spend then check").
 * - Failover never sleeps: an open breaker or a retryable failure dispatches the
 *   next model immediately; Retry-After only extends that model's cooldown.
 * - 401/403 stop the chain (a bad key will fail on every model; do not burn quota).
 * - The API key is read from the environment only and never logged or returned.
 */

export type ModelId = 'glm-5.3' | 'glm-5.3-flash' | 'kimi-k3' | 'qwen3.8-27b'

export interface ModelSpec {
  id: ModelId
  label: string
  /** Hard per-call completion ceiling for this model. */
  maxOutputTokens: number
  /** Per-attempt timeout (response headers + body). */
  timeoutMs: number
}

export const MODELS: Record<ModelId, ModelSpec> = {
  'glm-5.3': { id: 'glm-5.3', label: 'GLM-5.3', maxOutputTokens: 1200, timeoutMs: 20_000 },
  'glm-5.3-flash': { id: 'glm-5.3-flash', label: 'GLM-5.3 Flash', maxOutputTokens: 900, timeoutMs: 10_000 },
  'kimi-k3': { id: 'kimi-k3', label: 'Kimi K3', maxOutputTokens: 1600, timeoutMs: 25_000 },
  'qwen3.8-27b': { id: 'qwen3.8-27b', label: 'Qwen 3.8 27B', maxOutputTokens: 900, timeoutMs: 12_000 },
}

export type RouteProfile = 'quality' | 'fast' | 'reasoning'

export const ROUTES: Record<RouteProfile, ModelId[]> = {
  quality: ['glm-5.3', 'kimi-k3', 'qwen3.8-27b', 'glm-5.3-flash'],
  fast: ['glm-5.3-flash', 'qwen3.8-27b', 'glm-5.3', 'kimi-k3'],
  reasoning: ['kimi-k3', 'glm-5.3', 'qwen3.8-27b', 'glm-5.3-flash'],
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export type AttemptOutcome = 'ok' | 'circuit_open' | 'rate_limited' | 'server_error' | 'timeout' | 'network_error' | 'bad_request' | 'auth_error' | 'model_unavailable' | 'empty' | 'hedge_cancelled'

export interface Attempt {
  model: ModelId
  outcome: AttemptOutcome
  status?: number
  latencyMs: number
  /** Time from previous attempt finishing to this attempt being dispatched. */
  failoverMs?: number
  /** True when dispatched while an earlier attempt was still in flight. */
  hedged?: boolean
}

export interface RouteResult {
  ok: boolean
  text?: string
  model?: ModelId
  attempts: Attempt[]
  usage: { promptTokens: number; completionTokens: number; totalTokens: number; estimated: boolean }
  error?: 'budget_exceeded' | 'all_models_failed' | 'auth_error' | 'not_configured' | 'deadline_exceeded' | 'budget_unavailable'
  maxFailoverMs: number
}

/** Conservative UTF-8 byte reservation plus message framing; not a tokenizer. */
export function estimateTokens(text: string): number {
  return Buffer.byteLength(text, 'utf8') + 16
}

export function estimateMessages(messages: ChatMessage[]): number {
  return messages.reduce((n, m) => n + estimateTokens(m.content), 3)
}

// ---------------------------------------------------------------- budgets

export interface BudgetConfig {
  /** Ceiling for prompt + completion on a single request. */
  perRequestTokens: number
  /** Rolling-window ceiling across all requests in this instance. */
  windowTokens: number
  windowMs: number
}

export class TokenBudget {
  private reservations: Array<{ at: number; tokens: number }> = []
  constructor(public readonly config: BudgetConfig, private now: () => number = Date.now) {}
  private used() {
    const cutoff = this.now() - this.config.windowMs
    this.reservations = this.reservations.filter(r => r.at > cutoff)
    return this.reservations.reduce((sum, r) => sum + r.tokens, 0)
  }
  /** Conservative rolling-window charge. Unknown billing is never refunded. */
  reserve(tokens: number): boolean {
    const used = this.used()
    if (!Number.isSafeInteger(tokens) || tokens <= 0 || tokens > this.config.perRequestTokens || used + tokens > this.config.windowTokens) return false
    this.reservations.push({ at: this.now(), tokens })
    return true
  }
  /** No refunds: provider usage can omit reasoning tokens or arrive after a timeout. */
  settle(_reserved: number, _actual: number) {}
  snapshot() {
    const used = this.used()
    return { used, windowTokens: this.config.windowTokens, perRequestTokens: this.config.perRequestTokens, windowMs: this.config.windowMs, remaining: Math.max(0, this.config.windowTokens - used), accounting: 'conservative-no-refund' }
  }
}

// ---------------------------------------------------------------- breakers

export type BreakerState = 'closed' | 'open' | 'half_open'

export interface BreakerConfig { failureThreshold: number; cooldownMs: number; maxCooldownMs: number }

export class CircuitBreaker {
  private failures = 0
  private openedAt = 0
  private cooldown: number
  private state: BreakerState = 'closed'
  private probing = false
  constructor(private config: BreakerConfig, private now: () => number = Date.now) {
    this.cooldown = config.cooldownMs
  }
  /** Returns true when a call may be attempted (closed, or a single half-open probe). */
  allow(): boolean {
    if (this.state === 'closed') return true
    if (this.state === 'open' && this.now() - this.openedAt >= this.cooldown) { this.state = 'half_open'; this.probing = false }
    if (this.state === 'half_open' && !this.probing) { this.probing = true; return true }
    return false
  }
  releaseProbe() { this.probing = false }
  success() { this.failures = 0; this.state = 'closed'; this.probing = false; this.cooldown = this.config.cooldownMs }
  /** Trip on retryable failure. retryAfterMs (from HTTP 429) extends the cooldown. */
  failure(retryAfterMs?: number, immediate = false) {
    this.failures += 1
    if (this.state === 'half_open') this.cooldown = Math.min(this.cooldown * 2, this.config.maxCooldownMs)
    if (immediate || this.state === 'half_open' || this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      this.openedAt = this.now()
      this.probing = false
      if (retryAfterMs && retryAfterMs > this.cooldown) this.cooldown = Math.min(retryAfterMs, this.config.maxCooldownMs)
    }
  }
  snapshot() {
    if (this.state === 'open' && this.now() - this.openedAt >= this.cooldown) return { state: 'half_open' as BreakerState, failures: this.failures }
    return { state: this.state, failures: this.failures }
  }
}

// ---------------------------------------------------------------- router

export interface RouterOptions {
  apiKey?: string
  baseUrl?: string
  fetcher?: typeof fetch
  now?: () => number
  budget?: BudgetConfig
  breaker?: BreakerConfig
  /** Hard wall-clock deadline for the whole chain. */
  deadlineMs?: number
  sharedBudget?: boolean
  timeouts?: Partial<Record<ModelId, number>>
  /** Stall hedge: if the newest in-flight attempt has not settled after this many ms, dispatch the next model in parallel (max 2 in flight). First non-empty answer wins; the loser is aborted. Undefined = strictly sequential. */
  hedgeAfterMs?: number
  /** 'adaptive' learns each model's p90 latency and hedges at p90*multiplier; 'static' uses hedgeAfterMs. */
  hedgeMode?: 'static' | 'adaptive'
  /** Overrides for the adaptive policy (multiplier, floor/ceiling, spend governor). */
  hedgePolicy?: Partial<HedgePolicy>
}

export interface CompleteRequest {
  messages: ChatMessage[]
  profile?: RouteProfile
  maxOutputTokens?: number
  temperature?: number
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const s = Number(value)
  if (Number.isFinite(s) && s >= 0) return Math.min(s * 1000, 600_000)
  const d = Date.parse(value)
  return Number.isFinite(d) ? Math.max(0, Math.min(d - Date.now(), 600_000)) : undefined
}

function classify(status: number): AttemptOutcome {
  if (status === 429) return 'rate_limited'
  if (status === 401 || status === 403) return 'auth_error'
  if (status === 404) return 'model_unavailable'
  if (status === 408 || status === 504 || status === 524) return 'timeout'
  if (status >= 500) return 'server_error'
  return 'bad_request'
}

interface Settled { id: ModelId; outcome: AttemptOutcome; status?: number; retryAfter?: number; text?: string; pt?: number; ct?: number; dispatch: number; failoverMs?: number; hedged: boolean; end: number }

export class ModelRouter {
  readonly budget: TokenBudget
  private breakers = new Map<ModelId, CircuitBreaker>()
  private fetcher: typeof fetch
  private now: () => number
  private baseUrl: string
  private apiKey?: string
  private sharedBudget: boolean
  private deadlineMs: number
  private timeouts: Partial<Record<ModelId, number>>
  private hedgeAfterMs?: number
  private hedgeMode: 'static' | 'adaptive'
  readonly hedgeController: HedgeController

  constructor(opts: RouterOptions = {}) {
    this.fetcher = opts.fetcher ?? fetch
    this.now = opts.now ?? Date.now
    this.sharedBudget = opts.sharedBudget ?? false
    this.apiKey = opts.apiKey
    this.baseUrl = (opts.baseUrl ?? 'https://api.melious.ai/v1').replace(/\/$/, '')
    this.deadlineMs = opts.deadlineMs ?? 28_000
    this.timeouts = opts.timeouts ?? {}
    this.hedgeAfterMs = opts.hedgeAfterMs !== undefined && Number.isFinite(opts.hedgeAfterMs) && opts.hedgeAfterMs >= 0 ? opts.hedgeAfterMs : undefined
    this.hedgeMode = opts.hedgeMode === 'adaptive' ? 'adaptive' : 'static'
    this.hedgeController = new HedgeController(opts.hedgePolicy ?? {}, this.now)
    this.budget = new TokenBudget(opts.budget ?? { perRequestTokens: 6000, windowTokens: 400_000, windowMs: 3_600_000 }, this.now)
    const bc = opts.breaker ?? { failureThreshold: 2, cooldownMs: 30_000, maxCooldownMs: 300_000 }
    for (const id of Object.keys(MODELS) as ModelId[]) this.breakers.set(id, new CircuitBreaker(bc, this.now))
  }

  configured() { return Boolean(this.apiKey) }

  health() {
    const breakers = Object.fromEntries([...this.breakers].map(([id, b]) => [id, b.snapshot().state]))
    const hedging = this.hedgingEnabled() ? { mode: this.hedgeMode, staticAfterMs: this.hedgeAfterMs ?? null, ...this.hedgeController.snapshot() } : { mode: 'off' as const }
    return { configured: this.configured(), hedging, gateway: 'melious', budgetScope: this.sharedBudget ? sharedBudgetMode() : 'per-instance', breakers, budget: this.budget.snapshot() }
  }

  /** Hedging is on when a static delay is configured or adaptive mode is selected. */
  hedgingEnabled() { return this.hedgeMode === 'adaptive' || this.hedgeAfterMs !== undefined }

  /** Stall threshold for the newest in-flight model: learned p90 in adaptive mode, else the static delay. */
  private hedgeDelayFor(model: ModelId): number {
    if (this.hedgeMode !== 'adaptive') return this.hedgeAfterMs ?? 86_400_000
    return this.hedgeController.delayFor(model, this.hedgeAfterMs)
  }

  async complete(req: CompleteRequest): Promise<RouteResult> {
    const attempts: Attempt[] = []
    const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimated: true }
    const fail = (error: RouteResult['error']): RouteResult => ({ ok: false, attempts, usage, error, maxFailoverMs: Math.max(0, ...attempts.map((a) => a.failoverMs ?? 0)) })
    if (!this.apiKey) return fail('not_configured')
    const chain = ROUTES[req.profile ?? 'quality']
    const promptTokens = estimateMessages(req.messages)
    const started = this.now()
    const outputs = chain.map(id => Math.max(16, Math.min(req.maxOutputTokens ?? MODELS[id].maxOutputTokens, MODELS[id].maxOutputTokens)))
    if (outputs.some(n => !Number.isSafeInteger(n)) || promptTokens + outputs[0] > this.budget.config.perRequestTokens) return fail('budget_exceeded')
    if (this.sharedBudget) {
      // One atomic reservation covers the complete failover chain. No network roundtrip
      // between attempts, so shared accounting does not add failover latency.
      const worstCase = Math.min(this.budget.config.perRequestTokens, outputs.reduce((sum, n) => sum + promptTokens + n, 0))
      const admission = await reserveSharedTokens(worstCase, this.budget.config.windowTokens, this.budget.config.windowMs, this.deadlineMs)
      if (admission !== 'ok') return fail(admission === 'limited' ? 'budget_exceeded' : 'budget_unavailable')
    }
    let requestCharged = 0
    let lastEnd: number | undefined
    let lastDispatch = started
    let lastDispatchId: ModelId = chain[0]
    let next = 0
    let terminal: RouteResult['error'] | undefined
    // Spend governor: a gateway-wide slowdown must not double the token bill.
    this.hedgeController.noteRequest()
    let hedgeBlocked = !this.hedgingEnabled() || !this.hedgeController.allowHedge()
    const inflight = new Map<ModelId, { controller: AbortController; promise: Promise<Settled> }>()
    const perRequest = this.budget.config.perRequestTokens
    const maxOf = (id: ModelId) => Math.max(16, Math.min(req.maxOutputTokens ?? MODELS[id].maxOutputTokens, MODELS[id].maxOutputTokens))
    // Dispatch the next eligible model. A hedge never ends the request: if it cannot
    // be afforded it is simply not sent and the in-flight attempt keeps running.
    const launch = (hedge: boolean): boolean => {
      while (next < chain.length) {
        const id = chain[next]
        const breaker = this.breakers.get(id)!
        if (!breaker.allow()) {
          next++
          const t = this.now()
          attempts.push({ model: id, outcome: 'circuit_open', latencyMs: 0, failoverMs: lastEnd === undefined ? undefined : t - lastEnd })
          lastEnd = t
          continue
        }
        const reservation = promptTokens + maxOf(id)
        const remaining = this.deadlineMs - (this.now() - started)
        if (remaining <= 50) { breaker.releaseProbe(); if (!hedge) terminal = 'deadline_exceeded'; hedgeBlocked = true; return false }
        if (requestCharged + reservation > perRequest || !this.budget.reserve(reservation)) { breaker.releaseProbe(); if (!hedge) terminal = 'budget_exceeded'; hedgeBlocked = true; return false }
        next++
        requestCharged += reservation
        const dispatch = this.now()
        lastDispatch = dispatch
        lastDispatchId = id
        if (hedge) this.hedgeController.noteHedge()
        const failoverMs = hedge ? undefined : lastEnd === undefined ? undefined : dispatch - lastEnd
        const controller = new AbortController()
        const timeoutMs = Math.min(this.timeouts[id] ?? MODELS[id].timeoutMs, remaining)
        inflight.set(id, { controller, promise: this.attempt(id, maxOf(id), req, promptTokens, reservation, timeoutMs, controller, dispatch, failoverMs, hedge && inflight.size > 0) })
        return true
      }
      return false
    }
    const cancelLosers = () => {
      for (const [id, f] of inflight) {
        f.controller.abort(Object.assign(new Error('hedge lost'), { name: 'AbortError' }))
        this.breakers.get(id)!.releaseProbe()
        attempts.push({ model: id, outcome: 'hedge_cancelled', latencyMs: this.now() - lastDispatch, hedged: true })
      }
      inflight.clear()
    }
    launch(false)
    while (inflight.size > 0) {
      const races: Array<Promise<Settled | 'hedge'>> = [...inflight.values()].map((f) => f.promise)
      let hedgeTimer: ReturnType<typeof setTimeout> | undefined
      if (!hedgeBlocked && inflight.size < 2 && next < chain.length) {
        const wait = Math.max(0, this.hedgeDelayFor(lastDispatchId) - (this.now() - lastDispatch))
        races.push(new Promise((resolve) => { hedgeTimer = setTimeout(() => resolve('hedge'), wait) }))
      }
      const settled = await Promise.race(races)
      if (hedgeTimer) clearTimeout(hedgeTimer)
      if (settled === 'hedge') { if (!launch(true)) hedgeBlocked = true; continue }
      inflight.delete(settled.id)
      const breaker = this.breakers.get(settled.id)!
      const attempt: Attempt = { model: settled.id, outcome: settled.outcome, status: settled.status, latencyMs: settled.end - settled.dispatch, failoverMs: settled.failoverMs }
      if (settled.hedged) attempt.hedged = true
      // Only clean successes teach the model its normal speed.
      this.hedgeController.observe(settled.id, attempt.latencyMs, settled.outcome)
      if (settled.outcome === 'ok' && settled.text) {
        breaker.success()
        attempts.push(attempt)
        cancelLosers()
        usage.promptTokens = settled.pt ?? promptTokens
        usage.completionTokens = settled.ct ?? estimateTokens(settled.text)
        usage.totalTokens = usage.promptTokens + usage.completionTokens
        usage.estimated = !(typeof settled.pt === 'number' && typeof settled.ct === 'number')
        return { ok: true, text: settled.text, model: settled.id, attempts, usage, maxFailoverMs: Math.max(0, ...attempts.map((a) => a.failoverMs ?? 0)) }
      }
      attempts.push(attempt)
      lastEnd = settled.end
      const outcome = settled.outcome
      if (outcome === 'auth_error') { breaker.releaseProbe(); cancelLosers(); return fail('auth_error') }
      if (outcome === 'bad_request') breaker.releaseProbe()
      if (outcome === 'rate_limited') breaker.failure(settled.retryAfter, true)
      else if (outcome === 'model_unavailable') breaker.failure(300_000, true)
      else if (outcome === 'server_error' || outcome === 'timeout' || outcome === 'network_error' || outcome === 'empty') breaker.failure()
      // Failover never sleeps: a settled failure dispatches the next model at once.
      if (inflight.size === 0) launch(false)
      else if (inflight.size < 2 && !hedgeBlocked) launch(true)
    }
    return fail(terminal ?? 'all_models_failed')
  }

  private async attempt(id: ModelId, maxOut: number, req: CompleteRequest, promptTokens: number, reservation: number, timeoutMs: number, controller: AbortController, dispatch: number, failoverMs: number | undefined, hedged: boolean): Promise<Settled> {
    let outcome: AttemptOutcome = 'network_error'
    let status: number | undefined
    let retryAfter: number | undefined
    // Ref'd timer (AbortSignal.timeout is unref'd and cannot keep a hung call observable).
    const timer = setTimeout(() => controller.abort(Object.assign(new Error('attempt timeout'), { name: 'TimeoutError' })), timeoutMs)
    try {
      const res = await this.fetcher(this.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: id, messages: req.messages, max_tokens: maxOut, temperature: req.temperature ?? 0.2 }),
        signal: controller.signal,
      })
      status = res.status
      if (res.ok) {
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
        const text = (json.choices?.[0]?.message?.content ?? '').trim()
        const pt = json.usage?.prompt_tokens, ct = json.usage?.completion_tokens
        this.budget.settle(reservation, typeof pt === 'number' && typeof ct === 'number' ? pt + ct : promptTokens + estimateTokens(text))
        if (text) return { id, outcome: 'ok', status, text, pt, ct, dispatch, failoverMs, hedged, end: this.now() }
        outcome = 'empty'
      } else {
        outcome = classify(res.status)
        retryAfter = parseRetryAfter(res.headers.get('retry-after'))
        await res.body?.cancel().catch(() => undefined)
        this.budget.settle(reservation, 0)
      }
    } catch (error) {
      this.budget.settle(reservation, 0)
      const name = (error as { name?: string })?.name
      outcome = name === 'TimeoutError' || name === 'AbortError' || controller.signal.aborted ? 'timeout' : 'network_error'
    } finally {
      clearTimeout(timer)
    }
    return { id, outcome, status, retryAfter, dispatch, failoverMs, hedged, end: this.now() }
  }
}

let shared: ModelRouter | undefined
/** Process-wide router configured from the environment. */
export function getRouter(): ModelRouter {
  if (!shared) {
    const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : d }
    shared = new ModelRouter({
      sharedBudget: true,
      hedgeAfterMs: process.env.LLM_HEDGE_AFTER_MS ? num(process.env.LLM_HEDGE_AFTER_MS, 2500) : undefined,
      hedgeMode: process.env.LLM_HEDGE_MODE === 'adaptive' ? 'adaptive' : 'static',
      hedgePolicy: {
        multiplier: Number(process.env.LLM_HEDGE_P90_MULTIPLIER) > 0 ? Number(process.env.LLM_HEDGE_P90_MULTIPLIER) : undefined,
        maxHedgeRate: Number.isFinite(Number(process.env.LLM_HEDGE_MAX_RATE)) && process.env.LLM_HEDGE_MAX_RATE ? Number(process.env.LLM_HEDGE_MAX_RATE) : undefined,
      } as Partial<import('./hedge-policy').HedgePolicy>,
      apiKey: process.env.MELIOUS_API_KEY || undefined,
      baseUrl: process.env.MELIOUS_BASE_URL || undefined,
      budget: {
        perRequestTokens: num(process.env.LLM_MAX_TOKENS_PER_REQUEST, 6000),
        windowTokens: num(process.env.LLM_TOKEN_BUDGET_PER_WINDOW, 400_000),
        windowMs: num(process.env.LLM_TOKEN_BUDGET_WINDOW_MS, 3_600_000),
      },
    })
  }
  return shared
}
