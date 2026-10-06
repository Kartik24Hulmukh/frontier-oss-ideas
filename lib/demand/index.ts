import { errorResult as supplyError, fetchWithTimeout } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import { record, count, nonempty, optionalText, optionalCount } from '@/lib/sources/contract'
import { demandWindow, qualifyDemandSource, qualifiedDemandItems, DEMAND_SAMPLE_LIMIT } from './qualification'
import type { DemandQualification } from './qualification'
export { qualifiedDemandItems } from './qualification'
import type {
  AdapterContext,
  DemandBreakdown,
  DemandResult,
  DemandSourceId,
  DemandSourceResult,
  EvidenceItem,
} from '@/lib/types'

/**
 * Demand-side adapters. Supply crowding alone cannot separate an *open lane*
 * from a *dead lane nobody wants*. These three public, key-free channels are a
 * cheap, honest proxy for pull: people asking for / complaining about the thing.
 */

const seconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && Number.isFinite(new Date(v * 1000).getTime())
const https = (v: unknown): v is string => { try { return typeof v === 'string' && new URL(v).protocol === 'https:' } catch { return false } }
const redditRow = (v: unknown): v is Record<string, unknown> => record(v) && nonempty(v.title) && typeof v.permalink === 'string' && /^\/r\/[^\s?#]+\/comments\//.test(v.permalink) && seconds(v.created_utc) && optionalText(v.selftext) && optionalText(v.subreddit) && optionalCount(v.num_comments) && (v.score === undefined || (typeof v.score === 'number' && Number.isSafeInteger(v.score)))
function redditItem(d: Record<string, unknown>, mirror = false): EvidenceItem {
  const self = typeof d.selftext === 'string' && !['[removed]', '[deleted]'].includes(d.selftext) ? d.selftext : ''
  return { title: String(d.title), description: self || null, url: 'https://www.reddit.com' + d.permalink,
    date: seconds(d.created_utc) ? new Date(d.created_utc * 1000).toISOString() : null, meta: `r/${d.subreddit ?? '?'} · ${d.score ?? 0} upvotes · ${d.num_comments ?? 0} comments${mirror ? ' · via mirror' : ''}` }
}

const UA = 'SimultaneityIndex/1.1 (+https://github.com/Kartik24Hulmukh/frontier-oss-ideas)'

function demandError(source: DemandSourceId, label: string, message: string, rateLimited = false): DemandSourceResult {
  const base = supplyError('github', label, message, rateLimited)
  return { ...base, source }
}

/**
 * Demand adapters must never silently flatten into "no demand": a dead lane
 * and an unmeasured lane are different products. These helpers classify an
 * adapter outage so the UI can render partial-demand banners honestly.
 */
export function demandStatusLabel(r: DemandSourceResult): 'healthy' | 'degraded' | 'blocked' {
  if (r.status === 'ok') return r.provenance === 'mirror' ? 'degraded' : 'healthy'
  if (r.status === 'rate_limited') return 'degraded'
  return /blocks anonymous|credentials|OAuth/i.test(r.errorMessage ?? '') ? 'blocked' : 'degraded'
}

let cachedRedditToken: { token: string; expiresAt: number } | null = null

async function redditToken(ctx: AdapterContext): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  if (!id || !secret) return null
  if (cachedRedditToken && cachedRedditToken.expiresAt > Date.now() + 60_000) return cachedRedditToken.token
  try {
    const res = await fetchWithTimeout('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      timeoutMs: ctx.timeoutMs,
      headers: {
        Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: 'grant_type=client_credentials',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!data.access_token) return null
    cachedRedditToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
    return data.access_token
  } catch {
    return null
  }
}

export async function searchRedditPrimary(query: string, ctx: AdapterContext = {}): Promise<DemandSourceResult> {
  const label = 'Reddit discussions'
  try {
    const capturedAt = Date.now()
    // Reddit blocks most anonymous datacenter traffic; app-only OAuth (free) fixes it.
    const token = await redditToken(ctx)
    const host = token ? 'https://oauth.reddit.com/search' : 'https://www.reddit.com/search.json'
    const url = host + '?q=' + encodeURIComponent(query) + '&sort=new&t=year&limit=25&type=link&raw_json=1'
    const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/json' }
    if (token) headers.Authorization = 'Bearer ' + token
    const res = await pacedFetch('reddit', url, { timeoutMs: ctx.timeoutMs, headers })
    if (res.status === 403 && !token) return demandError('reddit', label, 'Reddit blocks anonymous server traffic — set REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET.')
    if (res.status === 429) return demandError('reddit', label, 'Reddit rate limited this request.', true)
    if (!res.ok) return demandError('reddit', label, 'Reddit returned ' + res.status + '.')
    const data: unknown = await res.json()
    if (!record(data) || !record(data.data) || !Array.isArray(data.data.children) || data.data.children.length > DEMAND_SAMPLE_LIMIT || data.data.children.some(c => !record(c) || !redditRow(c.data))) return demandError('reddit', label, 'Reddit returned a malformed payload.')
    const children = data.data.children as Array<{ data: Record<string, unknown> }>
    return qualifyDemandSource({ source: 'reddit', label, status: 'ok', totalCount: children.length, items: children.slice(0, DEMAND_SAMPLE_LIMIT).map(c => redditItem(c.data)), provenance: 'primary' }, query, capturedAt)

  } catch (e) {
    if (e instanceof UpstreamError) return demandError('reddit', label, e.message, e.status === 429)
    return demandError('reddit', label, 'Reddit request failed or timed out.')
  }
}


/**
 * Reddit mirror fallback (PullPush public archive). Reddit blocks most anonymous
 * datacenter traffic, which used to silently zero out 40% of the demand weight.
 * When the primary path fails we try the archive, label the result as mirrored,
 * down-weight it, and keep the primary failure reason visible. If the mirror
 * also fails, both reasons are stacked and the original classification
 * (e.g. 'blocked') is preserved — demand is never fabricated.
 */
export const REDDIT_MIRROR_WEIGHT_FACTOR = 0.5
const MIRROR_LABEL = 'PullPush archive mirror'

export async function searchRedditMirror(query: string, ctx: AdapterContext = {}): Promise<DemandSourceResult> {
  const label = 'Reddit discussions'
  try {
    const capturedAt = Date.now()
    const window = demandWindow(capturedAt)
    const after = Math.floor(Date.parse(window.start) / 1000)
    const before = Math.floor(Date.parse(window.end) / 1000)
    const base = process.env.REDDIT_MIRROR_URL || 'https://api.pullpush.io/reddit/search/submission/'
    const url = base + '?q=' + encodeURIComponent(query) + '&size=25&sort=desc&sort_type=created_utc&after=' + after + '&before=' + before
    const res = await pacedFetch('reddit-mirror', url, { timeoutMs: ctx.timeoutMs, headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429) return demandError('reddit', label, MIRROR_LABEL + ' rate limited this request.', true)
    if (!res.ok) return demandError('reddit', label, MIRROR_LABEL + ' returned ' + res.status + '.')
    const data = (await res.json()) as { data?: unknown }
    if (!data || !Array.isArray(data.data) || data.data.length > DEMAND_SAMPLE_LIMIT) return demandError('reddit', label, MIRROR_LABEL + ' returned a malformed payload.')
    const raw = data.data as unknown[]
    const rows = raw.filter(redditRow)
    const malformed: DemandQualification['rejectedItems'] = raw.flatMap((d, index) => redditRow(d) ? [] : [{ item: record(d) && nonempty(d.title) && typeof d.permalink === 'string' && /^\/r\/[^\s?#]+\/comments\//.test(d.permalink) ? redditItem(d, true) : null, index, reasons: ['malformed-row'], provenance: 'mirror' as const }])
    return qualifyDemandSource({ source: 'reddit', label, status: 'ok', totalCount: raw.length, items: rows.slice(0, DEMAND_SAMPLE_LIMIT).map(d => redditItem(d, true)), provenance: 'mirror' }, query, capturedAt, malformed)

  } catch (e) {
    if (e instanceof UpstreamError) return demandError('reddit', label, MIRROR_LABEL + ': ' + e.message, e.status === 429)
    return demandError('reddit', label, MIRROR_LABEL + ' request failed or timed out.')
  }
}

export async function searchReddit(query: string, ctx: AdapterContext = {}): Promise<DemandSourceResult> {
  const primary = await searchRedditPrimary(query, ctx)
  if (primary.status === 'ok') return { ...primary, provenance: 'primary' }
  if (process.env.REDDIT_MIRROR_DISABLED === 'true') return primary
  const mirror = await searchRedditMirror(query, ctx)
  if (mirror.status === 'ok') {
    return {
      ...mirror,
      notice: 'Primary Reddit unavailable (' + (primary.errorMessage ?? primary.status) + '). Showing ' + MIRROR_LABEL + ' data, weighted at ' + REDDIT_MIRROR_WEIGHT_FACTOR * 100 + '%.',
    }
  }
  return {
    ...primary,
    errorMessage: (primary.errorMessage ?? 'Reddit unavailable.') + ' Mirror fallback also failed: ' + (mirror.errorMessage ?? 'unknown error'),
  }
}

export async function searchStackOverflow(query: string, ctx: AdapterContext = {}): Promise<DemandSourceResult> {
  const label = 'Stack Overflow questions'
  try {
    const capturedAt = Date.now()
    const window = demandWindow(capturedAt)
    const url = 'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation&site=stackoverflow&pagesize=25&filter=total&fromdate=' + Math.floor(Date.parse(window.start) / 1000) + '&todate=' + Math.floor(Date.parse(window.end) / 1000) + '&q=' + encodeURIComponent(query)
    const listUrl = url.replace('&filter=total', '')
    const [totalRes, listRes] = await Promise.all([
      pacedFetch('stackoverflow', url, { timeoutMs: ctx.timeoutMs }),
      pacedFetch('stackoverflow', listUrl, { timeoutMs: ctx.timeoutMs }),
    ])
    if (listRes.status === 429 || listRes.status === 400) {
      return demandError('stackoverflow', label, 'Stack Exchange throttled this request.', true)
    }
    if (!listRes.ok) return demandError('stackoverflow', label, 'Stack Exchange returned ' + listRes.status + '.')
    const list: unknown = await listRes.json()
    if (!record(list) || list.error_id !== undefined || !Array.isArray(list.items) || list.items.length > DEMAND_SAMPLE_LIMIT || list.items.some(q => !record(q) || !nonempty(q.title) || !https(q.link) || !seconds(q.creation_date) || !optionalCount(q.view_count) || !optionalCount(q.answer_count) || (q.is_answered !== undefined && typeof q.is_answered !== 'boolean'))) return demandError('stackoverflow', label, 'Stack Exchange returned a malformed list payload.')
    let total: number | null = null
    if (totalRes.ok) {
      const payload: unknown = await totalRes.json()
      if (!record(payload) || payload.error_id !== undefined || !count(payload.total) || payload.total < list.items.length) return demandError('stackoverflow', label, 'Stack Exchange returned a malformed total payload.')
      total = payload.total
    }
    const items = (list.items as Array<Record<string, unknown>>).slice(0, DEMAND_SAMPLE_LIMIT).map(q => ({
      title: String(q.title).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'), description: null,
      url: String(q.link), date: new Date(Number(q.creation_date) * 1000).toISOString(),
      meta: `${Number(q.view_count ?? 0).toLocaleString()} views · ${q.answer_count ?? 0} answers${q.is_answered ? '' : ' · unanswered'}`,
    }))
    return qualifyDemandSource({ source: 'stackoverflow', label, status: 'ok', totalCount: total ?? list.items.length, items, provenance: 'primary', ...(total === null ? { notice: 'Stack Overflow total count unavailable; count reflects returned top hits only.' } : {}) }, query, capturedAt)

  } catch (e) {
    if (e instanceof UpstreamError) return demandError('stackoverflow', label, e.message, e.status === 429)
    return demandError('stackoverflow', label, 'Stack Exchange request failed or timed out.')
  }
}

export async function searchAskHN(query: string, ctx: AdapterContext = {}): Promise<DemandSourceResult> {
  const label = 'Ask HN + comment pull'
  try {
    const capturedAt = Date.now()
    const window = demandWindow(capturedAt)
    const url = 'https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(query) + '&tags=(ask_hn,comment)&hitsPerPage=25&numericFilters=' + encodeURIComponent('created_at_i>=' + Math.floor(Date.parse(window.start) / 1000) + ',created_at_i<=' + Math.floor(Date.parse(window.end) / 1000))

    const res = await pacedFetch('askhn', url, { timeoutMs: ctx.timeoutMs })
    if (!res.ok) return demandError('askhn', label, 'Hacker News returned ' + res.status + '.', res.status === 429)
    const data: unknown = await res.json()
    if (!record(data) || !Array.isArray(data.hits) || data.hits.length > DEMAND_SAMPLE_LIMIT || !count(data.nbHits) || data.nbHits < data.hits.length || data.hits.some(h => !record(h) || typeof h.objectID !== 'string' || !/^\d+$/.test(h.objectID) || !optionalText(h.title) || !optionalText(h.story_title) || !optionalText(h.comment_text) || (!nonempty(h.title) && !nonempty(h.story_title) && !nonempty(h.comment_text)) || typeof h.created_at !== 'string' || !Number.isFinite(Date.parse(h.created_at)) || !optionalCount(h.points))) return demandError('askhn', label, 'Hacker News returned a malformed payload.')
    const items = (data.hits as Array<Record<string, unknown>>).slice(0, DEMAND_SAMPLE_LIMIT).map(h => ({
      title: String(h.title ?? h.story_title ?? 'HN comment'), description: typeof h.comment_text === 'string' ? h.comment_text.replace(/<[^>]+>/g, ' ') : null,
      url: 'https://news.ycombinator.com/item?id=' + h.objectID, date: String(h.created_at), meta: h.title ? `Ask HN · ${h.points ?? 0} points` : 'comment',
    }))
    return qualifyDemandSource({ source: 'askhn', label, status: 'ok', totalCount: data.nbHits, items, provenance: 'primary' }, query, capturedAt)

  } catch (e) {
    if (e instanceof UpstreamError) return demandError('askhn', label, e.message, e.status === 429)
    return demandError('askhn', label, 'Hacker News request failed or timed out.')
  }
}


export const DEMAND_WEIGHTS: Record<DemandSourceId, number> = {
  reddit: 0.4,
  stackoverflow: 0.25,
  askhn: 0.35,
}

export function scoreDemandSource(r: DemandSourceResult): DemandBreakdown {
  const weight = DEMAND_WEIGHTS[r.source] * (r.provenance === 'mirror' ? REDDIT_MIRROR_WEIGHT_FACTOR : 1)
  const items = qualifiedDemandItems(r)
  const included = r.status === 'ok' && items.length > 0
  let signal = included
    ? `${items.length} observed unique qualified pull items in a matched 365-day window; ${r.totalCount.toLocaleString()} raw hits audit-only. Lexical discussion heat, not verified buyer demand; semantics uncalibrated.`
    : 'Insufficient inspectable recent topical pull evidence — excluded from demand score; raw hits and engagement cannot establish buyer demand.'
  if (r.provenance === 'mirror') signal += ' [via archive mirror — primary unavailable; weight halved]'
  // No extrapolation of search-ranked samples, engagement boosts, or unbounded totals.
  return { source: r.source, label: r.label, subScore: included ? Math.round(Math.min(100, items.length / DEMAND_SAMPLE_LIMIT * 100)) : 0, signal, weight, included }
}

/** Ranked search snippets cannot establish comparable temporal rates. */
export function trendOf(_sources: DemandSourceResult[]): DemandResult['trend'] { return 'unknown' }

export function computeDemand(sources: DemandSourceResult[]): DemandResult {
  const breakdown = sources.map(scoreDemandSource)
  const supported = breakdown.filter(b => b.included)
  const w = supported.reduce((s, b) => s + b.weight, 0)
  const uniqueSources = new Set(supported.map(b => b.source))
  const uniqueItems = new Set(sources.flatMap(s => qualifiedDemandItems(s).map(i => i.url.replace(/\/$/, ''))))
  const queries = new Set(sources.filter(s => qualifiedDemandItems(s).length).map(s => s.qualification?.query))
  const ends = sources.filter(s => qualifiedDemandItems(s).length).map(s => Date.parse(s.qualification!.window.end))
  const comparable = ends.length > 0 && Math.max(...ends) - Math.min(...ends) <= 60_000
  const sufficient = comparable && uniqueSources.size >= 2 && uniqueItems.size >= 4 && queries.size === 1 && supported.length === uniqueSources.size
  const score = sufficient && w > 0 ? Math.round(supported.reduce((s, b) => s + b.subScore * b.weight, 0) / w) : null
  if (!sufficient) for (const b of breakdown) b.signal += ' Aggregate abstains: requires two distinct supported channels, four unique qualified URLs and same query/windows (capture skew ≤60s); these are uncalibrated safeguards.'
  return { score, coverage: Math.round(uniqueSources.size / 3 * 100), trend: 'unknown', breakdown, sources }
}

export async function runDemand(query: string, ctx: AdapterContext = {}): Promise<DemandResult> {
  const adapters = [searchReddit, searchStackOverflow, searchAskHN]
  const ids: DemandSourceId[] = ['reddit', 'stackoverflow', 'askhn']
  const settled = await Promise.allSettled(adapters.map((a) => a(query, ctx)))
  const results = settled.map((s, i) =>
    s.status === 'fulfilled' ? s.value : demandError(ids[i], ids[i], 'Adapter threw unexpectedly.'),
  )
  return computeDemand(results)
}
