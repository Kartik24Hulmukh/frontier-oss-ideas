import { errorResult as supplyError, fetchWithTimeout } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
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
    // Reddit blocks most anonymous datacenter traffic; app-only OAuth (free) fixes it.
    const token = await redditToken(ctx)
    const host = token ? 'https://oauth.reddit.com/search' : 'https://www.reddit.com/search.json'
    const url = host + '?q=' + encodeURIComponent(query) + '&sort=relevance&t=year&limit=25&type=link&raw_json=1'
    const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'application/json' }
    if (token) headers.Authorization = 'Bearer ' + token
    const res = await pacedFetch('reddit', url, { timeoutMs: ctx.timeoutMs, headers })
    if (res.status === 403 && !token) return demandError('reddit', label, 'Reddit blocks anonymous server traffic — set REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET.')
    if (res.status === 429) return demandError('reddit', label, 'Reddit rate limited this request.', true)
    if (!res.ok) return demandError('reddit', label, 'Reddit returned ' + res.status + '.')
    const data = await res.json()
    const children: Array<{ data: { title: string; permalink: string; created_utc: number; score: number; num_comments: number; subreddit: string; selftext?: string } }> = data?.data?.children ?? []
    const items: EvidenceItem[] = children.slice(0, 10).map(({ data: d }) => ({
      title: d.title,
      description: d.selftext ? d.selftext.slice(0, 180) : null,
      url: 'https://www.reddit.com' + d.permalink,
      date: new Date(d.created_utc * 1000).toISOString(),
      meta: `r/${d.subreddit} · ${d.score} upvotes · ${d.num_comments} comments`,
      relevance: 1,
    }))
    return { source: 'reddit', label, status: 'ok', totalCount: children.length, items }
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
    const after = Math.floor(Date.now() / 1000) - 365 * 24 * 3600
    const base = process.env.REDDIT_MIRROR_URL || 'https://api.pullpush.io/reddit/search/submission/'
    const url = base + '?q=' + encodeURIComponent(query) + '&size=25&after=' + after
    const res = await pacedFetch('reddit-mirror', url, { timeoutMs: ctx.timeoutMs, headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429) return demandError('reddit', label, MIRROR_LABEL + ' rate limited this request.', true)
    if (!res.ok) return demandError('reddit', label, MIRROR_LABEL + ' returned ' + res.status + '.')
    const data = (await res.json()) as { data?: unknown }
    if (!data || !Array.isArray(data.data)) return demandError('reddit', label, MIRROR_LABEL + ' returned a malformed payload.')
    const rows = (data.data as Array<Record<string, unknown>>).filter((d) => typeof d?.title === 'string' && typeof d?.permalink === 'string')
    const items: EvidenceItem[] = rows.slice(0, 10).map((d) => {
      const created = Number(d.created_utc)
      const self = typeof d.selftext === 'string' && d.selftext !== '[removed]' && d.selftext !== '[deleted]' ? d.selftext : ''
      return {
        title: String(d.title),
        description: self ? self.slice(0, 180) : null,
        url: 'https://www.reddit.com' + String(d.permalink),
        date: Number.isFinite(created) ? new Date(created * 1000).toISOString() : null,
        meta: `r/${String(d.subreddit ?? '?')} · ${Number(d.score ?? 0)} upvotes · ${Number(d.num_comments ?? 0)} comments · via mirror`,
        relevance: 1,
      }
    })
    return { source: 'reddit', label, status: 'ok', totalCount: rows.length, items, provenance: 'mirror' }
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
    const url =
      'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&site=stackoverflow&pagesize=20&filter=total&q=' +
      encodeURIComponent(query)
    const listUrl = url.replace('&filter=total', '')
    const [totalRes, listRes] = await Promise.all([
      pacedFetch('stackoverflow', url, { timeoutMs: ctx.timeoutMs }),
      pacedFetch('stackoverflow', listUrl, { timeoutMs: ctx.timeoutMs }),
    ])
    if (listRes.status === 429 || listRes.status === 400) {
      return demandError('stackoverflow', label, 'Stack Exchange throttled this request.', true)
    }
    if (!listRes.ok) return demandError('stackoverflow', label, 'Stack Exchange returned ' + listRes.status + '.')
    const list = await listRes.json()
    const total = totalRes.ok ? ((await totalRes.json())?.total ?? null) : null
    const raw: Array<{ title: string; link: string; creation_date: number; score: number; answer_count: number; is_answered: boolean; view_count: number }> = list.items ?? []
    const items: EvidenceItem[] = raw.slice(0, 10).map((q) => ({
      title: q.title.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      description: null,
      url: q.link,
      date: new Date(q.creation_date * 1000).toISOString(),
      meta: `${q.view_count.toLocaleString()} views · ${q.answer_count} answers${q.is_answered ? '' : ' · unanswered'}`,
      relevance: 1,
    }))
    return { source: 'stackoverflow', label, status: 'ok', totalCount: typeof total === 'number' ? total : raw.length, items }
  } catch (e) {
    if (e instanceof UpstreamError) return demandError('stackoverflow', label, e.message, e.status === 429)
    return demandError('stackoverflow', label, 'Stack Exchange request failed or timed out.')
  }
}

export async function searchAskHN(query: string, ctx: AdapterContext = {}): Promise<DemandSourceResult> {
  const label = 'Ask HN + comment pull'
  try {
    const url = 'https://hn.algolia.com/api/v1/search?query=' + encodeURIComponent(query) + '&tags=(ask_hn,comment)&hitsPerPage=20'
    const res = await pacedFetch('askhn', url, { timeoutMs: ctx.timeoutMs })
    if (!res.ok) return demandError('askhn', label, 'Hacker News returned ' + res.status + '.')
    const data = await res.json()
    const hits: Array<{ title?: string | null; story_title?: string | null; comment_text?: string | null; objectID: string; created_at: string; points?: number | null }> = data.hits ?? []
    const items: EvidenceItem[] = hits.slice(0, 10).map((h) => ({
      title: h.title ?? h.story_title ?? 'HN comment',
      description: h.comment_text ? h.comment_text.replace(/<[^>]+>/g, ' ').slice(0, 180) : null,
      url: 'https://news.ycombinator.com/item?id=' + h.objectID,
      date: h.created_at,
      meta: h.title ? `Ask HN · ${h.points ?? 0} points` : 'comment',
      relevance: 1,
    }))
    return { source: 'askhn', label, status: 'ok', totalCount: data.nbHits ?? items.length, items }
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

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n))

function monthsAgo(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44)
}

function firstNumber(meta: string | null, word: string): number {
  if (!meta) return 0
  const m = meta.match(new RegExp('([\\d,]+)\\s*' + word, 'i'))
  return m ? Number.parseInt(m[1].replace(/,/g, ''), 10) : 0
}

export function scoreDemandSource(r: DemandSourceResult): DemandBreakdown {
  const weight = DEMAND_WEIGHTS[r.source] * (r.provenance === 'mirror' ? REDDIT_MIRROR_WEIGHT_FACTOR : 1)
  if (r.status !== 'ok') {
    return { source: r.source, label: r.label, subScore: 0, signal: 'Source unavailable — excluded from demand score.', weight, included: false }
  }
  const recent = r.items.filter((i) => {
    const m = monthsAgo(i.date)
    return m !== null && m <= 6
  }).length
  let score = 0
  let signal = ''
  if (r.source === 'reddit') {
    const engaged = r.items.filter((i) => firstNumber(i.meta, 'comments') >= 10).length
    score = clamp(r.totalCount * 2 + engaged * 6 + recent * 3)
    signal = `${r.totalCount} threads in the last year; ${engaged} with 10+ comments; ${recent} in last 6 months.`
  } else if (r.source === 'stackoverflow') {
    const views = r.items.reduce((s, i) => s + firstNumber(i.meta, 'views'), 0)
    score = clamp(Math.log10(1 + r.totalCount) * 22 + Math.log10(1 + views) * 6)
    signal = `${r.totalCount.toLocaleString()} developer questions; ${views.toLocaleString()} views across top hits.`
  } else {
    const asks = r.items.filter((i) => i.meta?.startsWith('Ask HN')).length
    score = clamp(Math.log10(1 + r.totalCount) * 20 + asks * 8 + recent * 2)
    signal = `${r.totalCount.toLocaleString()} Ask HN posts/comments mention it; ${asks} direct Ask HN threads in top hits.`
  }
  if (r.provenance === 'mirror') signal += ' [via archive mirror — primary unavailable; weight halved]'
  return { source: r.source, label: r.label, subScore: Math.round(score), signal, weight, included: true }
}

export function trendOf(sources: DemandSourceResult[]): DemandResult['trend'] {
  const dates = sources.flatMap((s) => s.items.map((i) => monthsAgo(i.date))).filter((m): m is number => m !== null && m <= 24)
  if (dates.length < 4) return 'unknown'
  const last6 = dates.filter((m) => m <= 6).length
  const prior = dates.filter((m) => m > 6 && m <= 12).length
  if (last6 >= prior * 1.5 && last6 >= 2) return 'rising'
  if (prior >= last6 * 1.5 && prior >= 2) return 'falling'
  return 'flat'
}

export function computeDemand(sources: DemandSourceResult[]): DemandResult {
  const breakdown = sources.map(scoreDemandSource)
  const ok = breakdown.filter((b) => b.included)
  const w = ok.reduce((s, b) => s + b.weight, 0)
  const score = w > 0 ? Math.round(ok.reduce((s, b) => s + b.subScore * b.weight, 0) / w) : null
  return {
    score,
    coverage: sources.length ? Math.round((ok.length / sources.length) * 100) : 0,
    // Relevance-ranked top hits are not comparable time windows.
    trend: 'unknown',
    breakdown,
    sources,
  }
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
