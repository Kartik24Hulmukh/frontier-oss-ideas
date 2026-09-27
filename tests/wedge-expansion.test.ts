import assert from 'node:assert/strict'
import test from 'node:test'
import { expandSubLanes } from '../lib/scoring/wedge-expansion'
import type { EvidenceItem, SourceResult } from '../lib/types'
const item = (title: string, description = ''): EvidenceItem => ({ title, description, url: `https://x/${encodeURIComponent(title)}`, date: null, meta: null })
const crowded: SourceResult[] = [
  { source: 'github', label: 'GitHub', status: 'ok', totalCount: 500, items: [
    item('AI code review bot', 'GitHub action for pull requests'), item('review-cli', 'command-line AI code review'), item('PR reviewer', 'CI pipeline integration'),
    item('CodeRabbit clone', 'real-time review in the browser'), item('LLM reviewer API', 'SDK and REST API'), item('Review GPT', 'plugin for VS Code'),
    item('Secure review', 'SOC 2 compliance audit'), item('Fast review', 'terminal tool'), item('Review assistant', 'shell integration'), item('Reviewer', 'pre-commit hook') ] },
  { source: 'npm', label: 'npm', status: 'error', totalCount: 0, items: [item('ignored self-hosted offline')] },
]
test('sub-lanes rank least-claimed dimensions below the parent score with evidence counts', () => {
  const lanes = expandSubLanes('AI code review', 82, 'Saturated', crowded)
  assert.equal(lanes.length, 3)
  for (const l of lanes) { assert.ok(l.estimatedScore < 82); assert.equal(l.sampled, 10); assert.ok(l.verifyQuery.startsWith('AI code review ')) }
  assert.ok(lanes.every((l, i) => i === 0 || lanes[i - 1].estimatedScore <= l.estimatedScore))
  assert.ok(!lanes.some((l) => l.id === 'cli'), 'heavily claimed CLI lane must not be recommended')
  assert.equal(lanes.filter((l) => l.buildHere).length, 1)
  assert.equal(lanes[0].buildHere, true)
})
test('errored sources never contribute evidence and dimensions already in the idea are skipped', () => {
  const lanes = expandSubLanes('offline AI code review', 82, 'Saturated', crowded, 8)
  assert.ok(!lanes.some((l) => l.id === 'offline'))
  const selfHosted = lanes.find((l) => l.id === 'self-hosted')
  assert.equal(selfHosted?.claimedBy, 0)
  assert.deepEqual(selfHosted?.examples, [])
})
test('no evidence yields no fabricated sub-lanes; thin samples never earn a build-here badge', () => {
  assert.deepEqual(expandSubLanes('quantum orchard planner', 10, 'Open lane', []), [])
  const thin = expandSubLanes('quantum orchard planner', 10, 'Open lane', [{ source: 'pypi', label: 'PyPI', status: 'ok', totalCount: 2, items: [item('orchard'), item('planner')] }])
  assert.ok(thin.length > 0)
  assert.ok(thin.every((l) => l.confidence === 'insufficient' && !l.buildHere))
})
