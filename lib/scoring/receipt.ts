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

function keyId(key: ReturnType<typeof createPublicKey>): string {
  return createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex')
}

function trustedKeys(single = process.env.RECEIPT_PUBLIC_KEY, keyring = process.env.RECEIPT_PUBLIC_KEYS): ReturnType<typeof createPublicKey>[] {
  const values: string[] = []
  if (single) values.push(single)
  if (keyring) {
    try {
      const parsed = JSON.parse(keyring)
      if (Array.isArray(parsed)) values.push(...parsed.filter((v): v is string => typeof v === 'string'))
    } catch { /* malformed keyring fails closed; the single pin can still work */ }
  }
  const unique = new Map<string, ReturnType<typeof createPublicKey>>()
  for (const pem of values.slice(0, 10)) {
    try {
      const key = createPublicKey(pem.replace(/\\n/g, '\n'))
      if (key.asymmetricKeyType === 'ed25519') unique.set(keyId(key), key)
    } catch { /* skip malformed pins */ }
  }
  return [...unique.values()]
}

export function trustedKeyCount(single = process.env.RECEIPT_PUBLIC_KEY, keyring = process.env.RECEIPT_PUBLIC_KEYS): number {
  return trustedKeys(single, keyring).length
}

/** Configuration readiness checks the actual key, not just env presence. */
export function receiptReadiness(pem = process.env.RECEIPT_PRIVATE_KEY, single = process.env.RECEIPT_PUBLIC_KEY, keyring = process.env.RECEIPT_PUBLIC_KEYS) {
  const key = loadKey(pem)
  const pins = trustedKeys(single, keyring)
  const signer = !pem ? 'missing' : key ? 'valid' : 'invalid'
  const issuerMatched = !!key && pins.some(pin => keyId(pin) === keyId(createPublicKey(key)))
  return { signer, pinnedKeys: pins.length, issuerMatched, ready: signer === 'valid' && issuerMatched }
}
export class ReceiptConfigurationError extends Error {
  constructor() { super('Receipt signer configuration is invalid'); this.name = 'ReceiptConfigurationError' }
}

export function issueReceipt(capsule: EvidenceCapsule, pem?: string): ScanReceipt {
  const digest = digestCapsule(capsule)
  const key = loadKey(pem)
  if ((pem ?? process.env.RECEIPT_PRIVATE_KEY) && !key) throw new ReceiptConfigurationError()
  if (!key) {
    return { algorithm: 'sha256', digest, signature: null, publicKey: null, issuedAt: capsule.searchedAt }
  }
  const signature = sign(null, Buffer.from(digest, 'hex'), key).toString('base64')
  const publicKey = createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString()
  return { algorithm: 'ed25519+sha256', digest, signature, publicKey, issuedAt: capsule.searchedAt, keyId: keyId(createPublicKey(key)) }
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

/** Pin trust to a deployment-controlled keyring, never only to the key supplied in a receipt.
 * RECEIPT_PUBLIC_KEY remains the active pin; RECEIPT_PUBLIC_KEYS is a JSON array
 * of active/retired public PEMs, allowing verification across safe rotations.
 */
export function trustedReceipt(
  capsule: EvidenceCapsule,
  receipt: ScanReceipt,
  trustedPem = process.env.RECEIPT_PUBLIC_KEY,
  keyring = trustedPem === process.env.RECEIPT_PUBLIC_KEY ? process.env.RECEIPT_PUBLIC_KEYS : undefined,
): boolean {
  try {
    if (!receipt.publicKey || receipt.algorithm !== 'ed25519+sha256' || receipt.issuedAt !== capsule.searchedAt) return false
    const supplied = createPublicKey(receipt.publicKey)
    if (supplied.asymmetricKeyType !== 'ed25519') return false
    const id = keyId(supplied)
    if (receipt.keyId && receipt.keyId !== id) return false
    if (!trustedKeys(trustedPem, keyring).some((trusted) => keyId(trusted) === id)) return false
    const checked = verifyReceipt(capsule, receipt)
    return checked.digestMatches && checked.signatureValid === true
  } catch { return false }
}
