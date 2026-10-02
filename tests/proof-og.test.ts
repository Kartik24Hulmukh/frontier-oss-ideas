import assert from 'node:assert/strict'
import test from 'node:test'
import Image from '../app/c/[token]/opengraph-image'
import { encodeShare } from '../lib/share'
import { deflateRawSync } from 'node:zlib'
import { generateKeyPairSync } from 'node:crypto'
import { issueReceipt } from '../lib/scoring/receipt'
import type { EvidenceCapsule } from '../lib/types'

const capsule: EvidenceCapsule = {
  version: '1.2', query: 'AI code review', score: 86, confidence: 0.9, verdict: 'Saturated', searchedAt: '2026-09-27T12:00:00.000Z',
  evidenceLinks: [{ source: 'github', title: 'reviewer', url: 'https://github.com/x/reviewer' }], disclaimer: 'Heuristic.',
}

test('OG image renders for a valid proof token, and fails closed to a neutral card otherwise', async () => {
  const token = encodeShare(capsule, issueReceipt(capsule))
  const ok = await Image({ params: Promise.resolve({ token }) })
  assert.equal(ok.status, 200)
  assert.match(String(ok.headers.get('content-type')), /image/)
  // Tampered, malformed, unknown si_ alias and junk percent-encoding never throw and never leak a score.
  const tampered = token.replace(/^v1\.[a-f0-9]{16}/, 'v1.0000000000000000')
  for (const bad of [tampered, 'v1.nope.nope', 'si_' + 'f'.repeat(32), '%', '']) {
    const res = await Image({ params: Promise.resolve({ token: bad }) })
    assert.equal(res.status, 200, `fallback card for ${bad.slice(0, 24)}`)
  }
})

test('tampered digest and invalid signatures produce the exact neutral OG card', async () => {
  const key = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const receipt = issueReceipt(capsule)
  const badSignature = { ...issueReceipt(capsule, key), signature: Buffer.alloc(64).toString('base64') }
  const neutral = Buffer.from(await (await Image({ params: Promise.resolve({ token: 'invalid' }) })).arrayBuffer())
  for (const [c, r] of [[{ ...capsule, score: 12 }, receipt], [capsule, badSignature]] as const) {
    const token = `v1.${receipt.digest.slice(0, 16)}.${deflateRawSync(Buffer.from(JSON.stringify({ capsule: c, receipt: r }))).toString('base64url')}`
    const response = await Image({ params: Promise.resolve({ token }) })
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), neutral)
  }
  const valid = await Image({ params: Promise.resolve({ token: encodeShare(capsule, receipt) }) })
  assert.notDeepEqual(Buffer.from(await valid.arrayBuffer()), neutral)
})
