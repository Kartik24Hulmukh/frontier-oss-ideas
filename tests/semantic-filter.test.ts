import assert from 'node:assert/strict'
import test from 'node:test'
import { filterSourceByRelevance, semanticRelevance } from '../lib/scoring/semantic-filter'
import type { EvidenceItem, SourceResult } from '../lib/types'
const item = (title: string, description = ''): EvidenceItem => ({ title, description, url: `https://x/${title}`, date: null, meta: null })
test('semantic score separates a homonym from the requested workflow', () => {
  assert.ok(semanticRelevance('real time collaborative editor', item('Live collaborative document editor')) > semanticRelevance('real time collaborative editor', item('Real-time stock ticker and market prices')))
})
test('filter removes lexical drift before scoring and reports provenance', () => {
  const source: SourceResult = { source: 'github', label: 'GitHub', status: 'ok', totalCount: 99, items: [item('AI code review assistant'), item('Automated developer code audit'), item('Restaurant reviews'), item('Weather dashboard')] }
  const filtered = filterSourceByRelevance(source, 'AI code review')
  assert.deepEqual(filtered.items.map((x) => x.title), ['AI code review assistant', 'Automated developer code audit'])
  assert.deepEqual(filtered.relevanceFilter, { before: 4, after: 2, threshold: 0.18 })
  assert.equal(filtered.totalCount, 99)
})
test('conservative floor retains two auditable results for sparse lanes', () => {
  const source: SourceResult = { source: 'npm', label: 'npm', status: 'ok', totalCount: 3, items: [item('alpha'), item('beta'), item('gamma')] }
  assert.equal(filterSourceByRelevance(source, 'quantum orchard planner').items.length, 2)
})
