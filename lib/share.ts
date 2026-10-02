import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { canonicalJson, digestCapsule, trustedReceipt, verifyReceipt } from '@/lib/scoring/receipt'
import type { EvidenceCapsule, ScanReceipt } from '@/lib/types'

/**
 * Self-verifying proof links (Phase 3: export + immutable sharing).
 *
 * The token IS the evidence: canonical JSON of { capsule, receipt }, raw-deflated
 * and base64url-encoded, prefixed with the first 16 hex chars of the capsule
 * digest. Nothing is stored server-side, so a link can never be edited, expire,
 * or disappear with a database; any tampering breaks the digest and the viewer
 * says so. Immutability is a property of the URL, not of an operator-provisioned
 * Redis. Format: `v1.<digest16>.<payload>`.
 */
export const SHARE_TOKEN_MAX_CHARS = 12000
const INFLATE_MAX_BYTES = 262144

export type ShareErrorCode = 'too_large' | 'malformed' | 'digest_mismatch'
export class ShareError extends Error {
  constructor(readonly code: ShareErrorCode, message: string) { super(message) }
}

export interface DecodedShare {
  capsule: EvidenceCapsule
  receipt: ScanReceipt
  digestMatches: boolean
  signatureValid: boolean | null
  issuerTrusted: boolean
  /** true when the token prefix agrees with the recomputed capsule digest */
  bindingOk: boolean
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string'
const bounded = (v: unknown, max = 100): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max
const date = (v: unknown): v is string => text(v) && Number.isFinite(Date.parse(v))
const sources = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface']
function isCapsule(v: unknown): v is EvidenceCapsule {
  if (!object(v)) return false
  return ['1.0', '1.1', '1.2'].includes(String(v.version)) && text(v.query) &&
    bounded(v.score) && bounded(v.confidence) && date(v.searchedAt) && text(v.disclaimer) &&
    ['Open lane', 'Early movers', 'Crowded', 'Saturated'].includes(String(v.verdict)) &&
    Array.isArray(v.evidenceLinks) && v.evidenceLinks.every(e => object(e) && text(e.source) && sources.includes(e.source) && text(e.title) && text(e.url)) &&
    (v.sourceSummary === undefined || (Array.isArray(v.sourceSummary) && v.sourceSummary.every(s => object(s) && text(s.source) && sources.includes(s.source) && ['ok', 'error', 'rate_limited'].includes(String(s.status)) && bounded(s.totalCount, Number.MAX_SAFE_INTEGER)))) &&
    (v.demandScore === undefined || v.demandScore === null || bounded(v.demandScore)) &&
    (v.quadrant === undefined || v.quadrant === null || ['Blue Ocean', 'Gold Rush', 'Ghost Town', 'Bloodbath'].includes(String(v.quadrant)))
}
function isReceipt(v: unknown): v is ScanReceipt {
  if (!object(v) || !text(v.digest) || !/^[a-f0-9]{64}$/.test(v.digest) || !date(v.issuedAt)) return false
  if (v.algorithm === 'sha256') return v.signature === null && v.publicKey === null
  return v.algorithm === 'ed25519+sha256' && text(v.signature) && v.signature.length > 0 && text(v.publicKey) && v.publicKey.length > 0 &&
    (v.keyId === undefined || (text(v.keyId) && /^[a-f0-9]{64}$/.test(v.keyId)))
}

/** One acceptance policy for page, metadata, export and OG. Integrity is NOT issuer authentication. */
export function shareIntegrityValid(share: DecodedShare): boolean {
  return share.digestMatches && share.bindingOk && share.receipt.issuedAt === share.capsule.searchedAt &&
    (share.receipt.algorithm === 'sha256' ? share.signatureValid === null : share.signatureValid === true)
}
export function shareTrustLabel(share: DecodedShare): string {
  if (!shareIntegrityValid(share)) return 'Invalid proof — evidence or signature verification failed'
  if (share.issuerTrusted) return 'Verified — signed by a pinned Simultaneity issuer'
  if (share.signatureValid === true) return 'Untrusted issuer — signature valid; origin not authenticated'
  return 'Hash-only — checksum matches; origin and scan claims not authenticated'
}

/** Mint a proof token. Refuses capsules whose receipt digest does not match (no laundering of edited evidence). */
export function encodeShare(capsule: EvidenceCapsule, receipt: ScanReceipt): string {
  if (!isCapsule(capsule) || !isReceipt(receipt)) throw new ShareError('malformed', 'Body must include a capsule and receipt.')
  const digest = digestCapsule(capsule)
  if (digest !== receipt.digest) throw new ShareError('digest_mismatch', 'Capsule does not match its receipt digest; refusing to mint a proof link.')
  const checked = verifyReceipt(capsule, receipt)
  if (receipt.issuedAt !== capsule.searchedAt || (receipt.algorithm === 'ed25519+sha256' && checked.signatureValid !== true)) throw new ShareError('digest_mismatch', 'Receipt signature or scan timestamp is invalid.')
  const raw = Buffer.from(canonicalJson({ capsule, receipt }))
  if (raw.length > INFLATE_MAX_BYTES) throw new ShareError('too_large', 'Evidence capsule exceeds the decoded size limit.')
  const payload = deflateRawSync(raw, { level: 9 }).toString('base64url')
  const token = `v1.${digest.slice(0, 16)}.${payload}`
  if (token.length > SHARE_TOKEN_MAX_CHARS) throw new ShareError('too_large', 'Evidence capsule is too large for a self-contained link; download the JSON instead.')
  return token
}

/** Decode and fully re-verify a token. Never trusts the token's own claims. */
export function decodeShare(token: string): DecodedShare {
  if (typeof token !== 'string' || token.length > SHARE_TOKEN_MAX_CHARS) throw new ShareError('too_large', 'Token too large.')
  const m = /^v1\.([a-f0-9]{16})\.([A-Za-z0-9_-]+)$/.exec(token)
  if (!m) throw new ShareError('malformed', 'Unrecognised proof token.')
  let parsed: { capsule?: unknown; receipt?: unknown }
  try {
    parsed = JSON.parse(inflateRawSync(Buffer.from(m[2], 'base64url'), { maxOutputLength: INFLATE_MAX_BYTES }).toString('utf8'))
  } catch { throw new ShareError('malformed', 'Proof token could not be decoded.') }
  if (!parsed || !isCapsule(parsed.capsule) || !isReceipt(parsed.receipt)) throw new ShareError('malformed', 'Proof token does not contain a capsule and receipt.')
  const { capsule, receipt } = parsed as { capsule: EvidenceCapsule; receipt: ScanReceipt }
  const checked = verifyReceipt(capsule, receipt)
  return {
    capsule, receipt, ...checked,
    issuerTrusted: trustedReceipt(capsule, receipt),
    bindingOk: digestCapsule(capsule).startsWith(m[1]) && receipt.digest.startsWith(m[1]),
  }
}

/** Only http(s) links from a capsule are ever rendered as anchors. */
export function safeHref(url: string): string | null {
  try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null } catch { return null }
}
