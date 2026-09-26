import { readObject, inputResponse, validIdea } from '@/lib/core/input'
import { clientKey, rateLimitResponse } from '@/lib/core/ratelimit'
import { RateLimiter } from '@/lib/core/ratelimit'
import { scanIdea } from '@/lib/scan'
import { analystMemo, sharedRouter } from '@/lib/llm/analyst'
import type { RouteProfile } from '@/lib/llm/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// LLM calls are the most expensive path: a stricter per-client limit than scans.
const analystLimiter = new RateLimiter(Number(process.env.ANALYST_RATE_LIMIT) || 6, 600_000)
const PROFILES: RouteProfile[] = ['quality', 'fast', 'reasoning']

/** POST { query, profile? } -> scan + grounded AI analyst memo routed across GLM-5.3 / GLM-5.3 Flash / Kimi K3 / Qwen 3.8 27B. */
export async function POST(request: Request) {
  let body: { query?: unknown; profile?: unknown }
  try { body = await readObject(request) } catch (error) { return inputResponse(error) }
  const q = typeof body.query === 'string' ? body.query : ''
  if (!validIdea(q) || q.trim().length < 3) return Response.json({ error: 'Idea must be 3–120 characters without control characters.' }, { status: 400 })
  const profile = PROFILES.includes(body.profile as RouteProfile) ? (body.profile as RouteProfile) : 'quality'
  if (!sharedRouter().configured()) return Response.json({ error: 'AI analyst is not configured on this deployment.', fallback: 'Use the deterministic Opportunity Brief download.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  const limit = analystLimiter.check(clientKey(request))
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSec)
  const result = await scanIdea(q.trim())
  const memo = await analystMemo(result, profile)
  const status = memo.ok ? 200 : memo.route.error === 'budget_exceeded' ? 429 : 503
  return Response.json({ query: result.query, score: result.score, verdict: result.verdict, coverage: result.coverage, receipt: result.receipt, ...memo }, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...(memo.route.model ? { 'X-Simultaneity-Model': memo.route.model } : {}) } })
}
