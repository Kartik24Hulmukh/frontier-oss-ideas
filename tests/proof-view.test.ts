import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { deflateRawSync } from 'node:zlib'
import { generateKeyPairSync } from 'node:crypto'
import View, { generateMetadata } from '../app/c/[token]/page'
import { encodeShare } from '../lib/share'
import { issueReceipt } from '../lib/scoring/receipt'
import type { EvidenceCapsule } from '../lib/types'

const c: EvidenceCapsule = { version: '1.2', query: 'forged claim sentinel', score: 86, confidence: 90, verdict: 'Saturated', searchedAt: '2026-09-27T12:00:00.000Z', evidenceLinks: [], disclaimer: 'Heuristic.' }
const key = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
function raw(capsule: EvidenceCapsule, receipt: unknown, prefix = issueReceipt(capsule).digest.slice(0, 16)) {
  return `v1.${prefix}.${deflateRawSync(Buffer.from(JSON.stringify({ capsule, receipt }))).toString('base64url')}`
}
test('page and metadata suppress unverified evidence, including valid digests with broken signatures', async () => {
  const r = issueReceipt(c)
  const signed = { ...issueReceipt(c, key), signature: Buffer.alloc(64).toString('base64') }
  const bad = [raw({ ...c, score: 12 }, r), raw(c, signed), 'v1.bad.token', raw({ ...c, evidenceLinks: [null] } as unknown as EvidenceCapsule, r)]
  for (const token of bad) {
    const props = { params: Promise.resolve({ token }) }
    const html = renderToStaticMarkup(await View(props))
    assert.match(html, /This proof link is not valid/)
    assert.doesNotMatch(html, /forged claim sentinel|Saturated|Score<\/dt>/)
    const meta = await generateMetadata(props)
    assert.match(String(meta.title), /Invalid proof link/)
    assert.equal(meta.referrer, 'no-referrer')
    assert.doesNotMatch(JSON.stringify(meta), /forged claim sentinel|Saturated/)
  }
})
test('valid hash-only page and metadata disclose lack of authenticated origin', async () => {
  const props = { params: Promise.resolve({ token: encodeShare(c, issueReceipt(c)) }) }
  const html = renderToStaticMarkup(await View(props))
  assert.match(html, /origin and scan claims not authenticated/)
  const meta = await generateMetadata(props)
  assert.match(String(meta.description), /origin and scan claims not authenticated/)
})
