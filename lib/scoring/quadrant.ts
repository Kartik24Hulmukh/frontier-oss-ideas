import type { Quadrant, QuadrantResult } from '@/lib/types'

/** Supply >= 50 is "high supply"; demand >= 40 is "real pull" (demand channels are noisier, so the bar is lower). */
export const SUPPLY_SPLIT = 50
export const DEMAND_SPLIT = 40

const COPY: Record<Quadrant, { headline: string; action: string }> = {
  'Blue Ocean': {
    headline: 'Low observed supply, stronger discussion signal — validate buyer demand.',
    action: 'Move now. Ship a narrow v1 in weeks, capture the people asking in the linked threads, and publish before the lane heats up.',
  },
  'Gold Rush': {
    headline: 'High observed supply and discussion activity — revenue is not established.',
    action: 'Enter only with a non-copyable asset: proprietary data, a distribution channel, deep workflow integration, or a compliance-grade niche.',
  },
  'Ghost Town': {
    headline: 'Low supply, low demand — quiet for a reason?',
    action: 'Validate pull before building: 10 customer interviews or a landing page test. Either you are early or nobody needs it.',
  },
  Bloodbath: {
    headline: 'High observed supply, weak discussion signal — buyer demand remains uncertain.',
    action: 'Do not enter as another clone. Pivot to the layer above the lane (aggregation, evaluation, neutral tooling) or kill the idea.',
  },
}

export function quadrantFor(supply: number, demand: number | null, trend: 'rising' | 'flat' | 'falling' | 'unknown' = 'unknown'): QuadrantResult {
  if (demand === null) {
    return {
      quadrant: null,
      supply,
      demand: null,
      headline: 'Demand channels unavailable — supply-only reading.',
      action: 'Re-run later for the full battlefield view; treat this scan as a crowding check only.',
    }
  }
  const highSupply = supply >= SUPPLY_SPLIT
  // Falling demand pushes borderline lanes down one band.
  const effectiveDemand = trend === 'falling' ? demand - 10 : trend === 'rising' ? demand + 5 : demand
  const highDemand = effectiveDemand >= DEMAND_SPLIT
  const quadrant: Quadrant = highSupply ? (highDemand ? 'Gold Rush' : 'Bloodbath') : highDemand ? 'Blue Ocean' : 'Ghost Town'
  return { quadrant, supply, demand, ...COPY[quadrant] }
}
