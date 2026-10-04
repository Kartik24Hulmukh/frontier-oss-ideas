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

  it('capsule is stamped crowding-1.3', () => {
    const result = computeCrowding(QUERY, [irrelevantGitHub(10), ...fillers()])
    assert.equal(result.capsule.modelVersion, 'crowding-1.3')
  })
})

describe('crowding-1.3 qualified-evidence logarithmic bound', () => {
  function npmHits(total: number, qualifiedCount: number, sample = 20): SourceResult {
    return {
      source: 'npm',
      label: 'npm',
      status: 'ok',
      totalCount: total,
      items: Array.from({ length: sample }, (_, i) =>
        i < qualifiedCount
          ? { title: `ai-code-review-agent-${i}`, description: 'AI code review agent for pull requests', url: `https://npmjs.com/package/ai-code-review-agent-${i}`, date: now, meta: null }
          : { title: `left-pad-variant-${i}`, description: 'string padding helpers', url: `https://npmjs.com/package/left-pad-variant-${i}`, date: now, meta: null },
      ),
    }
  }
  const others = () => fillers().filter((s) => s.source !== 'npm')

  it('bounds a 2,000,000-hit npm total with 2/20 qualified far below linear attenuation', async () => {
    const { qualifiedTotal } = await import('../lib/scoring/score')
    const npm = filterSourceByRelevance(npmHits(2_000_000, 2), QUERY)
    assert.equal(npm.relevanceFilter?.qualified, 2)
    const eff = qualifiedTotal(npm)
    assert.ok(eff < 20, `effective total ${eff} should be bounded (<20), linear would be 200000`)
    const r = computeCrowding(QUERY, [emptyOk('github', 'GitHub'), ...others(), npm])
    const npmRow = r.breakdown.find((b) => b.source === 'npm')!
    assert.ok(npmRow.subScore <= 30, `npm subScore ${npmRow.subScore} must stay low`)
    assert.ok(npmRow.signal.includes('2,000,000'), 'raw total remains visible for audit')
  })

  it('never exceeds linear attenuation and is monotonic in qualified evidence', async () => {
    const { qualifiedTotal } = await import('../lib/scoring/score')
    let prev = -1
    for (let q = 0; q <= 20; q++) {
      const src = filterSourceByRelevance(npmHits(50_000, q), QUERY)
      const eff = qualifiedTotal(src)
      const linear = src.totalCount * ((src.relevanceFilter?.qualified ?? 0) / (src.relevanceFilter?.before || 1))
      assert.ok(eff <= linear + 1e-9)
      assert.ok(eff >= prev, `monotonic at q=${q}`)
      prev = eff
    }
  })

  it('closes the empty-sample bypass: ok source with a huge total and no items scores 0', () => {
    const empty: SourceResult = { source: 'npm', label: 'npm', status: 'ok', totalCount: 3_000_000, items: [] }
    const filtered = filterSourceByRelevance(empty, QUERY)
    assert.deepEqual(filtered.relevanceFilter, { before: 0, after: 0, qualified: 0, threshold: 0.18 })
    const r = computeCrowding(QUERY, [emptyOk('github', 'GitHub'), ...others(), filtered])
    assert.equal(r.breakdown.find((b) => b.source === 'npm')!.subScore, 0)
  })

  it('512-combination matrix: bounded score never exceeds the unfiltered score', () => {
    let n = 0
    for (const total of [0, 10, 1_000, 2_000_000]) for (const q of [0, 1, 5, 20]) for (const src of ['npm', 'openalex', 'github', 'crates'] as const) for (const sample of [1, 5, 10, 20]) for (const stale of [false, true]) {
      const items = Array.from({ length: sample }, (_, i) => i < Math.min(q, sample)
        ? { title: `ai code review agent ${i}`, description: 'AI code review agent', url: `https://x/${i}`, date: stale ? '2015-01-01T00:00:00Z' : now, meta: null }
        : { title: `weather widget ${i}`, description: 'forecast', url: `https://y/${i}`, date: stale ? '2015-01-01T00:00:00Z' : now, meta: null })
      const raw: SourceResult = { source: src, label: src, status: 'ok', totalCount: total, items }
      const base = fillers().filter((s) => s.source !== src)
      const withGh = src === 'github' ? base : base
      const filtered = computeCrowding(QUERY, [...withGh, filterSourceByRelevance(raw, QUERY)])
      const unfiltered = computeCrowding(QUERY, [...withGh, raw])
      assert.ok(filtered.score <= unfiltered.score, `${src} total=${total} q=${q} sample=${sample}`)
      assert.ok(filtered.score >= 0 && filtered.score <= 100)
      n++
    }
    assert.equal(n, 512)
  })
})
