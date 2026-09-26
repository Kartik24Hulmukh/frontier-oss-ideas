import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import type { EvidenceCapsule, ScanReceipt } from '@/lib/types'

/**
 * Tamper-evident scan receipts. Every capsule gets a SHA-256 digest over its
 * canonical JSON. When RECEIPT_PRIVATE_KEY (PKCS8 PEM, Ed25519) is configured
 * the digest is also signed, so a VC, professor, or judge can verify that a
 * "Simultaneity 73" screenshot really came from this engine at that time.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  const obj = value as Record<string, unknown>
  return (
    '{' +
    Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k]))
      .join(',') +
    '}'
  )
}

export function digestCapsule(capsule: EvidenceCapsule): string {
  return createHash('sha256').update(canonicalJson(capsule)).digest('hex')
}

function loadKey(pem = process.env.RECEIPT_PRIVATE_KEY) {
  if (!pem) return null
  try {
    const key = createPrivateKey(pem.replace(/\\n/g, '\n'))
    return key.asymmetricKeyType === 'ed25519' ? key : null
  } catch {
    return null
  }
}

export function issueReceipt(capsule: EvidenceCapsule, pem?: string): ScanReceipt {
  const digest = digestCapsule(capsule)
  const key = loadKey(pem)
  if (!key) {
    return { algorithm: 'sha256', digest, signature: null, publicKey: null, issuedAt: capsule.searchedAt }
  }
  const signature = sign(null, Buffer.from(digest, 'hex'), key).toString('base64')
  const publicKey = createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString()
  return { algorithm: 'ed25519+sha256', digest, signature, publicKey, issuedAt: capsule.searchedAt }
}

export function verifyReceipt(capsule: EvidenceCapsule, receipt: ScanReceipt): { digestMatches: boolean; signatureValid: boolean | null } {
  const digestMatches = digestCapsule(capsule) === receipt.digest
  if (!receipt.signature || !receipt.publicKey) return { digestMatches, signatureValid: null }
  try {
    const ok = verify(null, Buffer.from(receipt.digest, 'hex'), createPublicKey(receipt.publicKey), Buffer.from(receipt.signature, 'base64'))
    return { digestMatches, signatureValid: ok }
  } catch {
    return { digestMatches, signatureValid: false }
  }
}

/** Pin trust to a deployment-controlled key, never to a key supplied in a receipt. */
export function trustedReceipt(capsule: EvidenceCapsule, receipt: ScanReceipt, trustedPem = process.env.RECEIPT_PUBLIC_KEY): boolean {
  try {
    const trusted = trustedPem ? createPublicKey(trustedPem.replace(/\\n/g, '\n')) : null
    if (!trusted || !receipt.publicKey || receipt.algorithm !== 'ed25519+sha256' || receipt.issuedAt !== capsule.searchedAt) return false
    if (trusted.asymmetricKeyType !== 'ed25519') return false
    const supplied = createPublicKey(receipt.publicKey)
    if (!trusted.export({ type: 'spki', format: 'der' }).equals(supplied.export({ type: 'spki', format: 'der' }))) return false
    const checked = verifyReceipt(capsule, receipt)
    return checked.digestMatches && checked.signatureValid === true
  } catch { return false }
}
