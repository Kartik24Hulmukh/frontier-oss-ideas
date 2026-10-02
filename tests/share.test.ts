import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPairSync } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { decodeShare, encodeShare, safeHref, ShareError, SHARE_TOKEN_MAX_CHARS, shareIntegrityValid, shareTrustLabel } from '../lib/share'
import { issueReceipt } from '../lib/scoring/receipt'
import { POST } from '../app/api/export/route'
import type { EvidenceCapsule } from '../lib/types'

const capsule: EvidenceCapsule = {
  version: '1.2', query: 'AI code review', score: 86, confidence: 0.9, verdict: 'Saturated', searchedAt: '2026-09-27T12:00:00.000Z',
  evidenceLinks: [{ source: 'github', title: 'reviewer', url: 'https://github.com/x/reviewer' }], disclaimer: 'Heuristic.',
  sourceSummary: [{ source: 'github', status: 'ok', totalCount: 500 }],
}
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString()

test('proof link round-trips a signed capsule with no storage and verifies against the pinned key', () => {
  const receipt = issueReceipt(capsule, pem)
  const token = encodeShare(capsule, receipt)
  assert.match(token, /^v1\.[a-f0-9]{16}\.[A-Za-z0-9_-]+$/)
  assert.ok(token.length < SHARE_TOKEN_MAX_CHARS)
  const prev = process.env.RECEIPT_PUBLIC_KEY
  process.env.RECEIPT_PUBLIC_KEY = pub
  try {
    const d = decodeShare(token)
    assert.deepEqual(d.capsule, capsule)
    assert.equal(d.digestMatches, true); assert.equal(d.signatureValid, true); assert.equal(d.bindingOk, true); assert.equal(d.issuerTrusted, true)
  } finally { if (prev === undefined) delete process.env.RECEIPT_PUBLIC_KEY; else process.env.RECEIPT_PUBLIC_KEY = prev }
  assert.equal(encodeShare(capsule, receipt), token, 'tokens are deterministic / content-addressed')
})

test('edited evidence is refused at mint time and flagged as tampered at view time', () => {
  const receipt = issueReceipt(capsule)
  assert.throws(() => encodeShare({ ...capsule, score: 12 }, receipt), (e: unknown) => e instanceof ShareError && e.code === 'digest_mismatch')
  const token = encodeShare(capsule, receipt)
  const [, prefix] = token.split('.')
  const forged = deflateRawSync(Buffer.from(JSON.stringify({ capsule: { ...capsule, score: 12, verdict: 'Open lane' }, receipt }))).toString('base64url')
  const d = decodeShare(`v1.${prefix}.${forged}`)
  assert.equal(d.digestMatches, false); assert.equal(d.issuerTrusted, false)
  const other = issueReceipt({ ...capsule, score: 12 })
  const swapped = deflateRawSync(Buffer.from(JSON.stringify({ capsule: { ...capsule, score: 12 }, receipt: other }))).toString('base64url')
  assert.equal(decodeShare(`v1.${prefix}.${swapped}`).bindingOk, false, 'prefix binds the link to the original digest')
})

test('malformed, oversized and decompression-bomb tokens fail closed', () => {
  for (const bad of ['', 'v2.abc.def', 'v1.0123456789abcdef.!!!', 'v1.0123456789abcdef.AAAA', 'x'.repeat(SHARE_TOKEN_MAX_CHARS + 1)]) {
    assert.throws(() => decodeShare(bad), ShareError)
  }
  const bomb = deflateRawSync(Buffer.alloc(5_000_000, 32)).toString('base64url')
  assert.ok(bomb.length < SHARE_TOKEN_MAX_CHARS)
  assert.throws(() => decodeShare(`v1.0123456789abcdef.${bomb}`), ShareError)
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('https://github.com/x'), 'https://github.com/x')
})

test('/api/export mints a link, rejects tampering with 422 and bad bodies with 400', async () => {
  const receipt = issueReceipt(capsule)
  const post = (body: unknown) => POST(new Request('http://localhost/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
  const ok = await post({ capsule, receipt })
  assert.equal(ok.status, 200)
  const json = await ok.json() as { token: string; path: string }
  assert.equal(json.path, `/c/${json.token}`)
  assert.equal((await post({ capsule: { ...capsule, score: 1 }, receipt })).status, 422)
  assert.equal((await post({ capsule })).status, 400)
})

test('/api/export adds the 1.6.0 write-once si_ alias for pinned receipts and still returns the storage-free proof', async () => {
  const old = { ...process.env }
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; process.env.RECEIPT_PUBLIC_KEY = pub
  try {
    const c2 = { ...capsule, query: 'alias lane' }
    const res = await POST(new Request('http://localhost/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ capsule: c2, receipt: issueReceipt(c2, pem) }) }))
    assert.equal(res.status, 201)
    const j = await res.json() as { path: string; shortPath: string; proofPath: string; token: string }
    assert.match(j.shortPath, /^\/c\/si_[a-f0-9]{32}$/)
    assert.equal(j.path, j.shortPath)
    assert.equal(j.proofPath, `/c/${j.token}`)
    assert.equal(decodeShare(j.token).issuerTrusted, true)
  } finally { process.env = old }
})

function rawToken(c: EvidenceCapsule, receipt: unknown): string {
  return `v1.${issueReceipt(c).digest.slice(0, 16)}.${deflateRawSync(Buffer.from(JSON.stringify({ capsule: c, receipt }))).toString('base64url')}`
}

test('broken signatures cannot downgrade to hash-only and export rejects them', async () => {
  const receipt = { ...issueReceipt(capsule, pem), signature: Buffer.alloc(64).toString('base64') }
  const decoded = decodeShare(rawToken(capsule, receipt))
  assert.equal(decoded.digestMatches, true)
  assert.equal(decoded.signatureValid, false)
  assert.equal(shareIntegrityValid(decoded), false)
  assert.match(shareTrustLabel(decoded), /Invalid proof/)
  assert.throws(() => encodeShare(capsule, receipt), ShareError)
  const res = await POST(new Request('http://localhost/api/export', { method: 'POST', body: JSON.stringify({ capsule, receipt }) }))
  assert.equal(res.status, 422)
})

test('hash-only proofs explicitly disclaim authenticated origin; self-signing is not issuer trust', () => {
  const hash = decodeShare(encodeShare(capsule, issueReceipt(capsule)))
  assert.equal(shareIntegrityValid(hash), true)
  assert.match(shareTrustLabel(hash), /origin and scan claims not authenticated/)
  const signed = decodeShare(encodeShare(capsule, issueReceipt(capsule, pem)))
  assert.match(shareTrustLabel(signed), /Untrusted issuer/)
})

test('decoded and encoded capsule schemas reject render-crashing nested data', () => {
  for (const patch of [{ evidenceLinks: [null] }, { evidenceLinks: [{ source: 'github', title: {}, url: 'https://example.org' }] }, { sourceSummary: [null] }, { score: -1 }, { score: 101 }, { searchedAt: 'not a date' }, { verdict: {} }, { disclaimer: {} }, { quadrant: {} }]) {
    const bad = { ...capsule, ...patch } as EvidenceCapsule
    const receipt = issueReceipt(bad)
    assert.throws(() => encodeShare(bad, receipt), ShareError)
    assert.throws(() => decodeShare(rawToken(bad, receipt)), ShareError)
  }
})

test('timestamp mismatch and malformed receipt algorithms fail closed', () => {
  const receipt = { ...issueReceipt(capsule), issuedAt: '2026-01-01T00:00:00Z' }
  assert.throws(() => encodeShare(capsule, receipt), ShareError)
  assert.equal(shareIntegrityValid(decodeShare(rawToken(capsule, receipt))), false)
  for (const patch of [{ algorithm: 'unknown' }, { publicKey: {} }, { signature: 'not-null' }]) {
    assert.throws(() => decodeShare(rawToken(capsule, { ...issueReceipt(capsule), ...patch })), ShareError)
  }
})

test('minting cannot create a compressed proof that its own decoder rejects for size', () => {
  const large = { ...capsule, disclaimer: 'a'.repeat(262144) }
  assert.throws(() => encodeShare(large, issueReceipt(large)), (e: unknown) => e instanceof ShareError && e.code === 'too_large')
})
