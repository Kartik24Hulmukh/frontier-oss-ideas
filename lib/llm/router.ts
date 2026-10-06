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

export type AttemptOutcome = 'ok' | 'circuit_open' | 'rate_limited' | 'server_error' | 'timeout' | 'network_error' | 'bad_request' | 'auth_error' | 'model_unavailable' | 'empty' | 'reasoning_exhausted' | 'hedge_cancelled'

/** Reported subtotals plus conservative estimates for missing successful-response fields.
 * Reasoning is a completion subset. Known totals are lower bounds, not billing reconciliation.
 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimated: boolean
  reasoningTokens: number
  knownPromptTokens?: number
  knownCompletionTokens?: number
  knownTotalTokens?: number
  complete?: boolean
}

export interface Attempt {
  model: ModelId
  outcome: AttemptOutcome
  status?: number
  latencyMs: number
  /** Time from previous attempt finishing to this attempt being dispatched. */
  failoverMs?: number
  /** True when dispatched while an earlier attempt was still in flight. */
  hedged?: boolean
  /** Hidden reasoning tokens the gateway billed for this attempt (0 when not reported). */
  reasoningTokens?: number
  usage?: TokenUsage
  reservedTokens?: number
  /** Dispatched but missing, malformed or contradictory billing evidence. */
  billingUnknown?: boolean
}

export interface RouteResult {
  ok: boolean
  text?: string
  model?: ModelId
  attempts: Attempt[]
  usage: TokenUsage & {
    /** Local dispatched-attempt reservations; shared chain admission may reserve more. */
    reservedTokens?: number
    sharedReservedTokens?: number
    unknownAttempts?: number
    winnerUsage?: TokenUsage
  }
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
  canReserve(tokens: number): boolean {
    return Number.isSafeInteger(tokens) && tokens > 0 && tokens <= this.config.perRequestTokens && this.used() + tokens <= this.config.windowTokens
  }
  /** Conservative rolling-window charge. Unknown billing is never refunded. */
  reserve(tokens: number): boolean {
    if (!this.canReserve(tokens)) return false
    this.reservations.push({ at: this.now(), tokens })
    return true
  }
  /** No refunds: provider usage can omit reasoning tokens or arrive after a timeout. */
  settle(_reserved: number, _actual: number) {}
  snapshot() {
    const used = this.used()
    return { used, windowTokens: this.config.windowTokens, perRequestTokens: this.config.perRequestTokens, windowMs: this.config.windowMs, remaining: Math.max(0, this.config.windowTokens - used), scope: 'process-local', accounting: 'conservative-no-refund' }
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
  /** Provider-mandated wait is independent of capped exponential recovery cooldown. */
  private notBefore = 0
  constructor(private config: BreakerConfig, private now: () => number = Date.now) {
    this.cooldown = config.cooldownMs
  }
  /** Returns true when a call may be attempted (closed, or a single half-open probe). */
  allow(): boolean {
    if (this.now() < this.notBefore) return false
    if (this.state === 'closed') return true
    if (this.state === 'open' && this.now() - this.openedAt >= this.cooldown) { this.state = 'half_open'; this.probing = false }
    if (this.state === 'half_open' && !this.probing) { this.probing = true; return true }
    return false
  }
  releaseProbe() { this.probing = false }
  success() {
    this.failures = 0
    // An older in-flight success cannot erase a newer mandatory provider backoff.
    this.state = this.now() < this.notBefore ? 'open' : 'closed'
    if (this.now() >= this.notBefore) this.notBefore = 0
    this.probing = false
    this.cooldown = this.config.cooldownMs
  }
  /** Trip on retryable failure. Provider Retry-After sets an uncapped mandatory not-before. */
  failure(retryAfterMs?: number, immediate = false) {
    this.failures += 1
    if (Number.isSafeInteger(retryAfterMs) && retryAfterMs! > 0) {
      const until = this.now() + retryAfterMs!
      if (Number.isSafeInteger(until)) this.notBefore = Math.max(this.notBefore, until)
    }
    if (this.state === 'half_open') this.cooldown = Math.min(this.cooldown * 2, this.config.maxCooldownMs)
    if (immediate || this.state === 'half_open' || this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      this.openedAt = this.now()
      this.probing = false
    }
  }
  snapshot() {
    if (this.now() < this.notBefore) return { state: 'open' as BreakerState, failures: this.failures }
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

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high'

export interface CompleteRequest {
  messages: ChatMessage[]
  profile?: RouteProfile
  maxOutputTokens?: number
  temperature?: number
  /**
   * Hidden-reasoning budget sent as OpenAI-style `reasoning_effort`. Default 'none':
   * thinking models ([redacted] 3.8 27B on Melious) otherwise spend the WHOLE completion
   * ceiling on reasoning and return empty content (finish_reason=length), which is
   * billed, unverifiable and useless to a citation-checked memo.
   */
  reasoningEffort?: ReasoningEffort
}

export function parseRetryAfter(value: string | null, now: () => number = Date.now): number | undefined {
  if (!value) return undefined
  const nowMs = now()
  const numeric = Number(value)
  const wait = Number.isFinite(numeric)
    ? numeric >= 0 ? Math.ceil(numeric * 1000) : undefined
    : (() => { const date = Date.parse(value); return Number.isFinite(date) ? Math.max(0, Math.ceil(date - nowMs)) : undefined })()
  // Never cap a supported provider wait. Reject only unrepresentable/invalid time.
  return wait !== undefined && Number.isSafeInteger(wait) && Number.isSafeInteger(nowMs + wait) ? wait : undefined
}

function classify(status: number): AttemptOutcome {
  if (status === 429) return 'rate_limited'
  if (status === 401 || status === 403) return 'auth_error'
  if (status === 404) return 'model_unavailable'
  if (status === 408 || status === 504 || status === 524) return 'timeout'
  if (status >= 500) return 'server_error'
  return 'bad_request'
}

interface Settled { id: ModelId; outcome: AttemptOutcome; status?: number; retryAfter?: number; text?: string; usage?: TokenUsage; reservation: number; dispatch: number; failoverMs?: number; hedged: boolean; end: number }

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string | null }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; reasoning_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } }
}

/** Reasoning tokens the gateway billed, from either usage shape. */
export function reasoningTokensOf(json: ChatCompletion): number {
  const u = json.usage
  const n = u?.completion_tokens_details?.reasoning_tokens ?? u?.reasoning_tokens
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : 0
}

const tokenCount = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0

function usageOf(json: ChatCompletion | undefined, promptEstimate: number, text?: string): TokenUsage {
  const u = json?.usage
  const pt = u?.prompt_tokens, ct = u?.completion_tokens
  const rt = json ? reasoningTokensOf(json) : 0
  const knownPromptTokens = tokenCount(pt) ? pt : 0
  const knownCompletionTokens = Math.max(tokenCount(ct) ? ct : 0, rt)
  const reasoning = u?.completion_tokens_details?.reasoning_tokens ?? u?.reasoning_tokens
  const complete = tokenCount(pt) && tokenCount(ct) && rt <= ct
    && (reasoning === undefined || tokenCount(reasoning))
    && (u?.total_tokens === undefined || (tokenCount(u.total_tokens) && u.total_tokens === pt + ct))
    && Number.isSafeInteger(pt + ct)
  // Failed/unknown attempts have no fabricated charge; known lower bounds remain visible.
  const promptTokens = tokenCount(pt) ? pt : text ? promptEstimate : 0
  const completionTokens = Math.max(knownCompletionTokens, !tokenCount(ct) && text ? estimateTokens(text) : 0)
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens,
    reasoningTokens: rt, estimated: !complete, complete, knownPromptTokens,
    knownCompletionTokens, knownTotalTokens: knownPromptTokens + knownCompletionTokens }
}

/**
 * Empty content classification. A thinking model that hit `length` while every
 * completion token went to hidden reasoning is `reasoning_exhausted`: the model is
 * healthy but the request shape starved it. Anything else empty is `empty`.
 */
export function classifyEmpty(json: ChatCompletion): AttemptOutcome {
  const choice = json.choices?.[0]
  const reasoning = reasoningTokensOf(json)
  const completion = json.usage?.completion_tokens
  const starved = choice?.finish_reason === 'length' || (typeof completion === 'number' && completion > 0 && reasoning >= completion) || Boolean(choice?.message?.reasoning_content)
  return starved && reasoning > 0 ? 'reasoning_exhausted' : 'empty'
}

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
  /** Bounded memory of gateway refusals (404 / model_unavailable) per model. */
  private refusals = new Map<ModelId, number[]>()
  /** Bounded memory of reasoning starvation (billed reasoning, empty content) per model. */
  private starvations = new Map<ModelId, number[]>()

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
    return { configured: this.configured(), hedging, gateway: 'melious', budgetScope: this.sharedBudget ? sharedBudgetMode() : 'per-instance', breakers, budget: this.budget.snapshot(), availability: this.availabilitySnapshot() }
  }

  /** Record a gateway refusal; only refusals teach availability, never latency. */
  noteRefusal(id: ModelId) {
    const ring = this.refusals.get(id) ?? []
    ring.push(this.now())
    if (ring.length > 32) ring.shift()
    this.refusals.set(id, ring)
  }

  /** Record a reasoning starvation: the gateway billed reasoning tokens and returned no content. */
  noteStarvation(id: ModelId) {
    const ring = this.starvations.get(id) ?? []
    ring.push(this.now())
    if (ring.length > 32) ring.shift()
    this.starvations.set(id, ring)
  }

  /** Refusal + starvation provenance for /api/health: which primaries the gateway actually serves usefully. No key material. */
  availabilitySnapshot(windowMs = 300_000) {
    const cutoff = this.now() - windowMs
    const out: Record<string, { refusals: number; lastRefusalAt: string | null; reasoningExhausted?: number; lastReasoningExhaustedAt?: string }> = {}
    for (const [id, ring] of this.refusals) {
      const recent = ring.filter((t) => t > cutoff)
      this.refusals.set(id, recent)
      if (recent.length) out[id] = { refusals: recent.length, lastRefusalAt: new Date(recent[recent.length - 1]).toISOString() }
    }
    for (const [id, ring] of this.starvations) {
      const recent = ring.filter((t) => t > cutoff)
      this.starvations.set(id, recent)
      if (recent.length) out[id] = { ...(out[id] ?? { refusals: 0, lastRefusalAt: null }), reasoningExhausted: recent.length, lastReasoningExhaustedAt: new Date(recent[recent.length - 1]).toISOString() }
    }
    return out
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
    const usage: RouteResult['usage'] = { ...usageOf(undefined, 0), estimated: false, complete: true, reservedTokens: 0, unknownAttempts: 0 }
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
      if (sharedBudgetMode() === 'distributed-configured') usage.sharedReservedTokens = worstCase
    }
    let requestCharged = 0
    let lastEnd: number | undefined
    let lastDispatch = started
    let lastDispatchId: ModelId = chain[0]
    let next = 0
    let terminal: RouteResult['error'] | undefined
    // Process-local extra-attempt governor; distributed token admission is separate.
    let hedgeBlocked = !this.hedgingEnabled()
    const inflight = new Map<ModelId, { controller: AbortController; dispatch: number; promise: Promise<Settled>; reservation: number; hedged: boolean; settled?: Settled }>()
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
        if (requestCharged + reservation > perRequest || !this.budget.canReserve(reservation)) { breaker.releaseProbe(); if (!hedge) terminal = 'budget_exceeded'; hedgeBlocked = true; return false }
        // No await between eligibility, hedge charge and local token reservation.
        if (hedge && !this.hedgeController.tryReserveHedge()) { breaker.releaseProbe(); hedgeBlocked = true; return false }
        if (!this.budget.reserve(reservation)) { breaker.releaseProbe(); if (!hedge) terminal = 'budget_exceeded'; hedgeBlocked = true; return false }
        next++
        if (requestCharged === 0) this.hedgeController.noteRequest()
        requestCharged += reservation
        usage.reservedTokens = requestCharged
        const dispatch = this.now()
        lastDispatch = dispatch
        lastDispatchId = id
        const failoverMs = hedge ? undefined : lastEnd === undefined ? undefined : dispatch - lastEnd
        const controller = new AbortController()
        const timeoutMs = Math.min(this.timeouts[id] ?? MODELS[id].timeoutMs, remaining)
        const entry: { controller: AbortController; dispatch: number; reservation: number; hedged: boolean; promise: Promise<Settled>; settled?: Settled } = {
          controller, dispatch, reservation, hedged: hedge,
          promise: this.attempt(id, maxOf(id), req, promptTokens, reservation, timeoutMs, controller, dispatch, failoverMs, hedge),
        }
        entry.promise = entry.promise.then(result => { entry.settled = result; return result })
        inflight.set(id, entry)
        return true
      }
      return false
    }
    const record = (settled: Settled): Attempt => {
      const billed = settled.usage ?? usageOf(undefined, 0)
      const attempt: Attempt = { model: settled.id, outcome: settled.outcome, status: settled.status,
        latencyMs: settled.end - settled.dispatch, failoverMs: settled.failoverMs,
        usage: billed, reservedTokens: settled.reservation, billingUnknown: !billed.complete }
      if (settled.hedged) attempt.hedged = true
      if (billed.reasoningTokens) attempt.reasoningTokens = billed.reasoningTokens
      usage.promptTokens += billed.promptTokens
      usage.completionTokens += billed.completionTokens
      usage.totalTokens = usage.promptTokens + usage.completionTokens
      usage.reasoningTokens += billed.reasoningTokens
      usage.knownPromptTokens! += billed.knownPromptTokens ?? 0
      usage.knownCompletionTokens! += billed.knownCompletionTokens ?? 0
      usage.knownTotalTokens = usage.knownPromptTokens! + usage.knownCompletionTokens!
      if (!billed.complete) { usage.unknownAttempts!++; usage.complete = false; usage.estimated = true }
      this.hedgeController.observe(settled.id, attempt.latencyMs, settled.outcome)
      attempts.push(attempt)
      return attempt
    }
    const cancelLosers = () => {
      for (const [id, f] of inflight) {
        // Another promise may already have settled in this race turn. Preserve its known charge.
        if (f.settled) { record(f.settled); if (f.settled.outcome === 'ok') this.breakers.get(id)!.success() }
        else {
          f.controller.abort(Object.assign(new Error('hedge lost'), { name: 'AbortError' }))
          record({ id, outcome: 'hedge_cancelled', dispatch: f.dispatch, end: this.now(),
            hedged: f.hedged, reservation: f.reservation })
        }
        this.breakers.get(id)!.releaseProbe()
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
      const attempt = record(settled)
      if (settled.outcome === 'ok' && settled.text) {
        breaker.success()
        usage.winnerUsage = attempt.usage
        cancelLosers()
        return { ok: true, text: settled.text, model: settled.id, attempts, usage, maxFailoverMs: Math.max(0, ...attempts.map((a) => a.failoverMs ?? 0)) }
      }
      lastEnd = settled.end
      const outcome = settled.outcome
      if (outcome === 'auth_error') { breaker.releaseProbe(); cancelLosers(); return fail('auth_error') }
      if (outcome === 'bad_request') breaker.releaseProbe()
      if (outcome === 'rate_limited') breaker.failure(settled.retryAfter, true)
      else if (outcome === 'model_unavailable') { breaker.failure(300_000, true); this.noteRefusal(settled.id) }
      else if (outcome === 'reasoning_exhausted') { breaker.failure(); this.noteStarvation(settled.id) }
      else if (outcome === 'server_error' || outcome === 'timeout' || outcome === 'network_error' || outcome === 'empty') breaker.failure(settled.retryAfter)
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
    let billed: TokenUsage | undefined
    let errorBodyTimer: ReturnType<typeof setTimeout> | undefined
    let abort!: () => void
    const aborted = new Promise<never>((_, reject) => {
      abort = () => reject(controller.signal.reason ?? Object.assign(new Error('aborted'), { name: 'AbortError' }))
      controller.signal.addEventListener('abort', abort, { once: true })
    })
    const timer = setTimeout(() => controller.abort(Object.assign(new Error('attempt timeout'), { name: 'TimeoutError' })), timeoutMs)
    try {
      const res = await Promise.race([this.fetcher(this.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: id, messages: req.messages, max_tokens: maxOut, temperature: req.temperature ?? 0.2, reasoning_effort: req.reasoningEffort ?? 'none' }),
        signal: controller.signal,
      }), aborted])
      status = res.status
      outcome = res.ok ? 'empty' : classify(status)
      retryAfter = parseRetryAfter(res.headers.get('retry-after'), this.now)
      // Error usage is useful when present, but an endless error body must not delay failover.
      if (!res.ok) errorBodyTimer = setTimeout(() => controller.abort(Object.assign(new Error('error body timeout'), { name: 'TimeoutError' })), 25)
      let json: ChatCompletion | undefined
      try { json = await Promise.race([res.json(), aborted]) as ChatCompletion }
      catch (error) { if (res.ok && controller.signal.aborted) throw error }
      const content = json?.choices?.[0]?.message?.content
      const text = typeof content === 'string' ? content.trim() : ''
      billed = usageOf(json, promptTokens, res.ok ? text : undefined)
      if (res.ok && text) return { id, outcome: 'ok', status, text, usage: billed, reservation, dispatch, failoverMs, hedged, end: this.now() }
      if (res.ok) outcome = json ? classifyEmpty(json) : 'empty'
    } catch (error) {
      const name = (error as { name?: string })?.name
      outcome = name === 'TimeoutError' || name === 'AbortError' || controller.signal.aborted ? 'timeout' : 'network_error'
    } finally {
      clearTimeout(timer)
      if (errorBodyTimer) clearTimeout(errorBodyTimer)
      controller.signal.removeEventListener('abort', abort)
      // Observed billing never releases an ambiguous or worst-case reservation.
      this.budget.settle(reservation, billed?.totalTokens ?? 0)
    }
    return { id, outcome, status, retryAfter, usage: billed, reservation, dispatch, failoverMs, hedged, end: this.now() }
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
