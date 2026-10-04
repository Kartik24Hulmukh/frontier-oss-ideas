import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterSourceByRelevance } from '../lib/scoring/semantic-filter'
import { computeCrowding } from '../lib/scoring/score'
import type { SourceResult } from '../lib/types'

const QUERY = 'AI code review agent'
const now = new Date().toISOString()

function emptyOk(source: SourceResult['source'], label: string): SourceResult {
  return { source, label, status: 'ok', totalCount: 0, items: [] }
}

function fillers(): SourceResult[] {
  return [
    emptyOk('hackernews', 'HN'),
    emptyOk('arxiv', 'arXiv'),
    emptyOk('openalex', 'OpenAlex'),
    emptyOk('npm', 'npm'),
    emptyOk('pypi', 'PyPI'),
    emptyOk('huggingface', 'HF'),
    emptyOk('crates', 'crates.io'),
  ]
}

/** Irrelevant homonyms: high stars, recent dates, huge raw counts. */
function irrelevantGitHub(count: number): SourceResult {
  return {
    source: 'github',
    label: 'GitHub Repositories',
    status: 'ok',
    totalCount: count,
    items: Array.from({ length: 10 }, (_, i) => ({
      title: `weather/stock-ticker-dashboard-${i}`,
      description: 'stock market prices and weather forecast widgets',
      url: `https://github.com/weather/stock-ticker-dashboard-${i}`,
      date: now,
      meta: '200,000 stars · last push 2026-09-30',
    })),
  }
}

function irrelevantCrates(count: number): SourceResult {
  return {
    source: 'crates',
    label: 'crates.io',
    status: 'ok',
    totalCount: count,
    items: Array.from({ length: 10 }, (_, i) => ({
      title: `restaurant-recipe-parser-${i}`,
      description: 'restaurant reviews and recipe parsing utilities',
      url: `https://crates.io/crates/restaurant-recipe-parser-${i}`,
      date: now,
      meta: '900,000 downloads · updated 2026-09-30',
    })),
  }
}

describe('crowding-1.2 relevance attenuation', () => {
  it('scores 500,000 irrelevant GitHub hits exactly 0 while raw counts and audit items stay visible', () => {
    const filtered = filterSourceByRelevance(irrelevantGitHub(500_000), QUERY)
    const result = computeCrowding(QUERY, [filtered, ...fillers()])
    const gh = result.breakdown.find((b) => b.source === 'github')
    assert.equal(result.score, 0)
    assert.equal(gh?.subScore, 0)
    // Raw provider count is preserved for audit.
    assert.equal(result.sources[0].totalCount, 500_000)
    // Two audit-floor items remain inspectable.
    assert.equal(result.sources[0].items.length, 2)
    assert.equal(result.sources[0].relevanceFilter?.qualified, 0)
  })

  it('scores 100,000 irrelevant crates.io hits exactly 0', () => {
    const filtered = filterSourceByRelevance(irrelevantCrates(100_000), QUERY)
    const result = computeCrowding(QUERY, [filtered, ...fillers()])
    const crates = result.breakdown.find((b) => b.source === 'crates')
    assert.equal(result.score, 0)
    assert.equal(crates?.subScore, 0)
    assert.equal(result.sources[0].totalCount, 100_000)
    assert.equal(result.sources[0].items.length, 2)
    assert.equal(result.sources[0].relevanceFilter?.qualified, 0)
  })

  it('a 10% qualified sample scores strictly below its unfiltered equivalent', () => {
    const raw: SourceResult = {
      ...irrelevantGitHub(2000),
      items: [
        {
          title: 'acme/ai-code-review-agent',
          description: 'AI code review agent for pull requests',
          url: 'https://github.com/acme/ai-code-review-agent',
          date: now,
          meta: '2,400 stars · last push 2026-09-01',
        },
        ...irrelevantGitHub(2000).items.slice(0, 9),
      ],
    }
    const filtered = filterSourceByRelevance(raw, QUERY)
    assert.equal(filtered.relevanceFilter?.before, 10)
    assert.equal(filtered.relevanceFilter?.qualified, 1)
    const withFilter = computeCrowding(QUERY, [filtered, ...fillers()])
    const withoutFilter = computeCrowding(QUERY, [raw, ...fillers()])
    assert.ok(
      withFilter.score < withoutFilter.score,
      `attenuated ${withFilter.score} must be strictly below unfiltered ${withoutFilter.score}`,
    )
  })

  it('fully qualified samples are scored exactly as before', () => {
    const raw: SourceResult = {
      ...irrelevantGitHub(500),
      items: Array.from({ length: 5 }, (_, i) => ({
        title: `acme/ai-code-review-${i}`,
        description: 'AI code review for developers',
        url: `https://github.com/acme/ai-code-review-${i}`,
        date: now,
        meta: '900 stars · last push 2026-09-01',
      })),
    }
    const filtered = filterSourceByRelevance(raw, QUERY)
    assert.equal(filtered.relevanceFilter?.qualified, filtered.relevanceFilter?.before)
    const withFilter = computeCrowding(QUERY, [filtered, ...fillers()])
    const withoutFilter = computeCrowding(QUERY, [raw, ...fillers()])
    assert.equal(withFilter.score, withoutFilter.score)
  })

  it('sources without a relevance filter are unchanged', () => {
    const result = computeCrowding(QUERY, [irrelevantGitHub(500_000), ...fillers()])
    const gh = result.breakdown.find((b) => b.source === 'github')
    // No filter: prior behaviour stands — huge raw counts and starred items score high.
    assert.ok((gh?.subScore ?? 0) > 0)
  })

  it('capsule is stamped crowding-1.2', () => {
    const result = computeCrowding(QUERY, [irrelevantGitHub(10), ...fillers()])
    assert.equal(result.capsule.modelVersion, 'crowding-1.2')
  })
})
