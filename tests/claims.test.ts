import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeCrowding } from '../lib/scoring/score'
import { readFileSync } from 'node:fs'

test('crowding copy does not assert independent invention or unique team counts', () => {
  const text = readFileSync('lib/scoring/score.ts', 'utf8')
  assert.ok(!text.includes('has been independently invented'))
  assert.ok(!text.includes('Multiple shipping teams occupy'))
  assert.match(computeCrowding('test', []).verdictDetail, /not proof of an open market/)
})
test('calibration output and fixtures disclose author-estimated labels', () => {
  for (const path of ['scripts/calibrate.ts', 'docs/CALIBRATION.md', 'lib/calibration/gold-set.ts']) {
    assert.match(readFileSync(path, 'utf8'), /author-estimated ordinal crowding/)
  }
})
