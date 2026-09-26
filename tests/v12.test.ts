import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { escapeXml, renderBadge } from '../lib/badge'

describe('README badge', () => {
  it('renders score + verdict with verdict colour', () => {
    const svg = renderBadge(42, 'Early movers')
    assert.match(svg, /^<svg /)
    assert.match(svg, /42 \u00b7 Early movers/)
    assert.match(svg, /#7cb342/)
  })
  it('renders an unavailable badge when scan failed', () => {
    assert.match(renderBadge(null, null), /unavailable/)
  })
  it('escapes hostile labels', () => {
    assert.equal(escapeXml('<a&"b>'), '&lt;a&amp;&quot;b&gt;')
    assert.doesNotMatch(renderBadge(1, 'Open lane', '<script>'), /<script>/)
  })
})
