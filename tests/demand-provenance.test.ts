import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanIdea } from '../lib/scan'
import { issueReceipt, verifyReceipt } from '../lib/scoring/receipt'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { summarize } from '../lib/mcp'
import { analystMessages } from '../lib/llm/analyst'
import { MatrixPanel } from '../components/matrix-panel'

test('scan → signed capsule → verification preserves degraded demand provenance', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('pullpush')) return Response.json({ data: [{ title: 'Need test tool', permalink: '/r/test/comments/1/tool/', created_utc: 1700000000 }] })
    if (url.includes('reddit.com')) return new Response('', { status: 403 })
    return new Response('', { status: 503 })
  }) as typeof fetch
  try {
    const result = await scanIdea('provenance regression unique', { fresh: true, expand: false })
    const source = result.capsule.demandSourceSummary?.find(s => s.source === 'reddit')
    assert.equal(source?.provenance, 'mirror')
    assert.match(source?.notice ?? '', /Primary Reddit unavailable/)
    const roundtrip = JSON.parse(JSON.stringify(result.capsule))
    assert.equal(verifyReceipt(roundtrip, result.receipt!).digestMatches, true)
    const { generateKeyPairSync } = await import('node:crypto')
    const key = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const receipt = issueReceipt(roundtrip, key)
    assert.equal(verifyReceipt(roundtrip, receipt).signatureValid, true)
    roundtrip.demandSourceSummary.find((s: { source: string }) => s.source === 'reddit').provenance = 'primary'
    assert.equal(verifyReceipt(roundtrip, receipt).digestMatches, false)
    assert.match(summarize(result), /Primary Reddit unavailable/)
    assert.match(summarize(result), /not verified buyer demand/)
    const messages = analystMessages(result, [])
    assert.match(messages[1].content, /provenance=mirror/)
    assert.match(messages[1].content, /Primary Reddit unavailable/)
    assert.match(messages[0].content, /not a calibrated probability/)
    const html = renderToStaticMarkup(createElement(MatrixPanel, { result }))
    assert.match(html, /Demand evidence is incomplete or degraded/)
    assert.match(html, /Primary Reddit unavailable/)
  } finally { globalThis.fetch = original }
})
