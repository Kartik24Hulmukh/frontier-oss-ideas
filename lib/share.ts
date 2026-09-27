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

function isCapsule(v: unknown): v is EvidenceCapsule {
  const c = v as EvidenceCapsule
  return !!c && typeof c === 'object' && !Array.isArray(c) && typeof c.query === 'string' && typeof c.score === 'number' && typeof c.searchedAt === 'string' && typeof c.verdict === 'string' && Array.isArray(c.evidenceLinks)
}
function isReceipt(v: unknown): v is ScanReceipt {
  const r = v as ScanReceipt
  return !!r && typeof r === 'object' && typeof r.digest === 'string' && /^[a-f0-9]{64}$/.test(r.digest) && typeof r.issuedAt === 'string'
}

/** Mint a proof token. Refuses capsules whose receipt digest does not match (no laundering of edited evidence). */
export function encodeShare(capsule: EvidenceCapsule, receipt: ScanReceipt): string {
  if (!isCapsule(capsule) || !isReceipt(receipt)) throw new ShareError('malformed', 'Body must include a capsule and receipt.')
  const digest = digestCapsule(capsule)
  if (digest !== receipt.digest) throw new ShareError('digest_mismatch', 'Capsule does not match its receipt digest; refusing to mint a proof link.')
  const payload = deflateRawSync(Buffer.from(canonicalJson({ capsule, receipt })), { level: 9 }).toString('base64url')
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
