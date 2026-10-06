import { readObject, inputResponse } from '@/lib/core/input'
import { clientKey, rateLimitResponse, RateLimiter } from '@/lib/core/ratelimit'
import { lookupScanSnapshot } from '@/lib/scan'
import { analystMemo, hasQualifiedSupplyEvidence, sharedRouter } from '@/lib/llm/analyst'
import type { RouteProfile } from '@/lib/llm/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const analystLimiter = new RateLimiter(Number(process.env.ANALYST_RATE_LIMIT) || 6, 600_000)
const PROFILES: RouteProfile[] = ['quality', 'fast', 'reasoning']
const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
const FALLBACK = 'The displayed scan and deterministic decision brief remain available. No new scan was run.'

/** POST { snapshotId, receipt, profile? }; never acquire evidence on the analyst path. */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try { body = await readObject(request) } catch (error) { return inputResponse(error, HEADERS) }
  const snapshotId = typeof body.snapshotId === 'string' ? body.snapshotId : ''
  if (!/^[a-f0-9]{64}$/.test(snapshotId) || !body.receipt || typeof body.receipt !== 'object' || Array.isArray(body.receipt)) {
    return Response.json({ error: 'An exact scan snapshot ID and its issued receipt are required.', fallback: FALLBACK }, { status: 400, headers: HEADERS })
  }
  // Scores, queries, source text and capsules supplied by callers are never trusted.
  let result
  try { result = await lookupScanSnapshot(snapshotId, body.receipt) } catch {
    return Response.json({ snapshotId, error: 'Snapshot storage is unavailable. No replacement scan was run.', fallback: FALLBACK }, { status: 503, headers: HEADERS })
  }
  if (!result || result.receipt?.digest !== snapshotId) {
    return Response.json({ snapshotId, error: 'This exact scan snapshot is unavailable or its receipt does not match. Run a new scan explicitly if you want a new memo.', fallback: FALLBACK }, { status: 409, headers: HEADERS })
  }
  if (!hasQualifiedSupplyEvidence(result)) {
    return Response.json({ snapshotId, error: 'No qualified supply evidence; discussion links remain in deterministic brief. No strategic memo generated.', fallback: FALLBACK }, { status: 422, headers: HEADERS })
  }
  if (!sharedRouter().configured()) return Response.json({ snapshotId, error: 'AI analyst is not configured on this deployment.', fallback: FALLBACK }, { status: 503, headers: HEADERS })
  const limit = analystLimiter.check(clientKey(request))
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec)
  const profile = PROFILES.includes(body.profile as RouteProfile) ? body.profile as RouteProfile : 'quality'
  try {
    const memo = await analystMemo(result, profile)
    const status = memo.ok ? 200 : memo.route.error === 'budget_exceeded' ? 429 : 503
    return Response.json({ ...memo, fallback: FALLBACK }, { status, headers: { ...HEADERS, ...(memo.route.model ? { 'X-Simultaneity-Model': memo.route.model } : {}) } })
  } catch {
    return Response.json({ snapshotId, error: 'AI analyst unavailable. Please use the deterministic decision brief.', fallback: FALLBACK }, { status: 503, headers: HEADERS })
  }
}
