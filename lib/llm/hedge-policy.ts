/**
 * Adaptive stall-hedge policy (1.5.5).
 *
 * 1.5.4 shipped stall hedging behind a single hand-set constant (LLM_HEDGE_AFTER_MS).
 * The 1.5.4 ship record flagged the honest limit: a constant is wrong for every model,
 * every prompt size and every hour of the day, so it either fires on healthy traffic
 * (burning tokens) or fires too late to help. This module removes the constant.
 *
 * - Per-model latency memory: a bounded ring of recent successful end-to-end latencies.
 * - Hedge delay = clamp(p90 * multiplier, minMs, maxMs), computed per model at dispatch.
 * - Cold start is conservative: until minSamples successes exist the static fallback
 *   (or maxMs) is used, so a fresh process never hedges aggressively on unknown models.
 * - A rolling hedge-rate governor caps the fraction of requests allowed to hedge, so a
 *   gateway-wide slowdown cannot double the token bill.
 */

export interface HedgePolicy {
  /** Multiple of observed p90 latency at which a stall is declared. */
  multiplier: number
  /** Never hedge sooner than this. */
  minMs: number
  /** Never wait longer than this before hedging. */
  maxMs: number
  /** Successful samples required before the learned delay is trusted. */
  minSamples: number
  /** Maximum fraction of recent requests allowed to hedge (0..1). */
  maxHedgeRate: number
  /** Rolling window for the hedge-rate governor. */
  statsWindowMs: number
  /** Requests needed before the governor can block (avoids blocking the 1st hedge). */
  minRequestsForRate: number
}

export const DEFAULT_HEDGE_POLICY: HedgePolicy = {
  multiplier: 1.3,
  minMs: 250,
  maxMs: 4000,
  minSamples: 5,
  maxHedgeRate: 0.2,
  statsWindowMs: 300_000,
  minRequestsForRate: 10,
}

const RING = 32

export class HedgeController {
  private samples = new Map<string, number[]>()
  private requests: number[] = []
  private hedges: number[] = []
  readonly policy: HedgePolicy

  constructor(policy: Partial<HedgePolicy> = {}, private now: () => number = Date.now) {
    const given = Object.fromEntries(Object.entries(policy).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)))
    const p = { ...DEFAULT_HEDGE_POLICY, ...(given as Partial<HedgePolicy>) }
    p.multiplier = p.multiplier > 0 ? p.multiplier : DEFAULT_HEDGE_POLICY.multiplier
    p.minMs = Math.max(0, p.minMs)
    p.maxMs = Math.max(p.minMs, p.maxMs)
    p.minSamples = Math.max(1, Math.floor(p.minSamples))
    p.maxHedgeRate = Math.min(1, Math.max(0, p.maxHedgeRate))
    this.policy = p
  }

  /** Record a completed attempt. Only clean successes teach the model its normal speed. */
  observe(model: string, latencyMs: number, outcome: string) {
    if (outcome !== 'ok' || !Number.isFinite(latencyMs) || latencyMs < 0) return
    const ring = this.samples.get(model) ?? []
    ring.push(latencyMs)
    if (ring.length > RING) ring.shift()
    this.samples.set(model, ring)
  }

  p90(model: string): number | undefined {
    const ring = this.samples.get(model)
    if (!ring || ring.length < this.policy.minSamples) return undefined
    const sorted = [...ring].sort((a, b) => a - b)
    const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1)
    return sorted[Math.max(0, idx)]
  }

  /** Learned stall threshold for a model, or the caller-supplied fallback while cold. */
  delayFor(model: string, fallbackMs?: number): number {
    const p = this.p90(model)
    if (p === undefined) return fallbackMs !== undefined ? Math.min(Math.max(fallbackMs, 0), this.policy.maxMs) : this.policy.maxMs
    return Math.min(this.policy.maxMs, Math.max(this.policy.minMs, Math.round(p * this.policy.multiplier)))
  }

  noteRequest() { this.prune(); this.requests.push(this.now()) }
  noteHedge() { this.prune(); this.hedges.push(this.now()) }

  /** False when recent hedging already exceeds the configured spend ceiling. */
  allowHedge(): boolean {
    this.prune()
    if (this.requests.length < this.policy.minRequestsForRate) return true
    return (this.hedges.length + 1) / this.requests.length <= this.policy.maxHedgeRate
  }

  private prune() {
    const cutoff = this.now() - this.policy.statsWindowMs
    this.requests = this.requests.filter((t) => t > cutoff)
    this.hedges = this.hedges.filter((t) => t > cutoff)
  }

  snapshot() {
    this.prune()
    const learned: Record<string, number> = {}
    for (const [model] of this.samples) {
      const p = this.p90(model)
      if (p !== undefined) learned[model] = this.delayFor(model)
    }
    return {
      policy: this.policy,
      requests: this.requests.length,
      hedges: this.hedges.length,
      hedgeRate: this.requests.length ? Number((this.hedges.length / this.requests.length).toFixed(3)) : 0,
      learnedDelayMs: learned,
    }
  }
}
