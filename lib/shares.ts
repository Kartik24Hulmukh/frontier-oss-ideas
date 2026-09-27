import { acceptableRedisUrl } from './core/redis-endpoint'
import { TTLCache } from './core/cache'
import { canonicalJson, digestCapsule, trustedReceipt } from './scoring/receipt'
import type { EvidenceCapsule, ScanReceipt } from './types'

export interface SharedCapsule { capsule: EvidenceCapsule; receipt: ScanReceipt; exportedAt: string }
const memory = new TTLCache<SharedCapsule>(500, 24 * 60 * 60 * 1000)
const TOKEN = /^si_[a-f0-9]{32}$/
const MAX_RECORD_BYTES = 262144

export function shareToken(capsule: EvidenceCapsule): string { return `si_${digestCapsule(capsule).slice(0, 32)}` }
export function validShareToken(token: string): boolean { return TOKEN.test(token) }
function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL, secret = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && secret && acceptableRedisUrl(url) ? { url, secret } : null
}
async function command(args: unknown[]): Promise<unknown> {
  const c = config(); if (!c) throw new Error('SHARE_STORE_UNAVAILABLE')
  const response = await fetch(c.url, { method: 'POST', headers: { Authorization: `Bearer ${c.secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(2500) })
  if (!response.ok) throw new Error('SHARE_STORE_UNAVAILABLE')
  const body = await response.json() as { result?: unknown; error?: unknown }
  if (body.error) throw new Error('SHARE_STORE_UNAVAILABLE'); return body.result
}
export async function saveShare(capsule: EvidenceCapsule, receipt: ScanReceipt): Promise<{ token: string; created: boolean }> {
  if (!trustedReceipt(capsule, receipt)) throw new Error('UNTRUSTED_RECEIPT')
  const token = shareToken(capsule), record: SharedCapsule = { capsule, receipt, exportedAt: new Date().toISOString() }
  if (Buffer.byteLength(JSON.stringify(record), 'utf8') > MAX_RECORD_BYTES) throw new Error('RECORD_TOO_LARGE')
  const c = config()
  if (!c) {
    if (process.env.NODE_ENV === 'production') throw new Error('SHARE_STORE_UNAVAILABLE')
    const prior = memory.get(token); if (prior && canonicalJson(prior.capsule) !== canonicalJson(capsule)) throw new Error('TOKEN_COLLISION')
    memory.set(token, prior ?? record); return { token, created: !prior }
  }
  const result = await command(['SET', `si:share:v1:${token}`, JSON.stringify(record), 'NX'])
  if (result === 'OK') return { token, created: true }
  const prior = await loadShare(token)
  if (!prior || canonicalJson(prior.capsule) !== canonicalJson(capsule)) throw new Error('TOKEN_COLLISION')
  return { token, created: false }
}
export async function loadShare(token: string): Promise<SharedCapsule | null> {
  if (!validShareToken(token)) return null
  const c = config(); if (!c) return process.env.NODE_ENV === 'production' ? null : memory.get(token) ?? null
  const raw = await command(['GET', `si:share:v1:${token}`]); if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_RECORD_BYTES) return null
  try { const value = JSON.parse(raw) as SharedCapsule; return shareToken(value.capsule) === token && trustedReceipt(value.capsule, value.receipt) ? value : null } catch { return null }
}
