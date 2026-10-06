import assert from 'node:assert/strict'
import test from 'node:test'
import { dedupeAcrossSources } from '../lib/core/dedup'
import { filterSourcesByRelevance } from '../lib/scoring/semantic-filter'
import type { EvidenceItem, SourceResult } from '../lib/types'
import { scanIdea } from '../lib/scan'
import { SOURCE_ADAPTERS, SOURCE_ORDER } from '../lib/sources'

const query = 'quantum orchard planner'
const item = (title: string, url: string, description: string | null = null): EvidenceItem => ({
  title, url, description, date: null, meta: null,
})
const source = (id: SourceResult['source'], items: EvidenceItem[], notice?: string): SourceResult => ({
  source: id, label: id, status: 'ok', totalCount: 1000, items, ...(notice ? { notice } : {}),
})

test('later qualified URL duplicate survives an earlier irrelevant observation with original provenance', () => {
  const offTopic = item('weather widget', 'https://github.com/acme/orchard?utm_source=hn')
  const qualified = { ...item(query, 'https://github.com/acme/orchard'), meta: '120 stars', date: '2026-01-01T00:00:00Z' }
  const original = [source('hackernews', [offTopic], 'partial primary observation'), source('github', [qualified], 'credential fallback')]
  const snapshot = structuredClone(original)
  const result = dedupeAcrossSources(original, query)
  assert.equal(result.collapsed, 1)
  assert.deepEqual(result.sources[0].items, [])
  assert.equal(result.sources[1].items[0], qualified)
  assert.equal(result.sources[0].notice, 'partial primary observation')
  assert.equal(result.sources[1].notice, 'credential fallback')
  assert.equal(result.sources[0].totalCount, 1000)
  assert.equal(result.sources[1].totalCount, 1000)
  assert.deepEqual(original, snapshot, 'inputs must not be mutated')
  const filtered = filterSourcesByRelevance(result.sources, query)
  assert.equal(filtered[1].relevanceFilter?.qualified, 1)
  assert.equal(filtered[0].relevanceFilter?.qualified, 0)
})

test('duplicate titles retain the qualified description in its original source', () => {
  const title = 'Universal seasonal planning utility'
  const result = dedupeAcrossSources([
    source('github', [item(title, 'https://github.com/acme/season', 'weather widget')]),
    source('npm', [item(title, 'https://npmjs.com/package/season', query)]),
  ], query)
  assert.equal(result.collapsed, 1)
  assert.equal(result.sources[0].items.length, 0)
  assert.equal(result.sources[1].items[0].description, query)
  assert.equal(filterSourcesByRelevance(result.sources, query)[1].relevanceFilter?.qualified, 1)
})

test('ties and query-less legacy calls preserve original source priority', () => {
  const early = source('github', [item(query, 'https://example.org/a')])
  const later = source('npm', [item(query, 'https://example.org/a')])
  for (const q of [undefined, query]) {
    const result = dedupeAcrossSources([early, later], q)
    assert.deepEqual(result.sources[0].items, early.items)
    assert.equal(result.sources[1].items.length, 0)
    assert.equal(result.collapsed, 1)
  }
})

test('errored sources cannot suppress healthy observations and audit-only evidence is not deleted wholesale', () => {
  const healthy = source('npm', [item('weather widget', 'https://example.org/a'), item('stock ticker', 'https://example.org/b')])
  const failed = { ...source('github', [item(query, 'https://example.org/a')]), status: 'error' as const }
  const result = dedupeAcrossSources([failed, healthy], query)
  assert.equal(result.sources[0], failed)
  assert.deepEqual(result.sources[1].items, healthy.items)
  assert.equal(result.collapsed, 0)
  const filtered = filterSourcesByRelevance(result.sources, query)
  assert.equal(filtered[1].relevanceFilter?.qualified, 0)
  assert.equal(filtered[1].items.length, 2)
})

test('retained evidence ordering stays in original source order, not relevance rank order', () => {
  const first = item('weather widget', 'https://example.org/a')
  const second = item(query, 'https://example.org/b')
  const result = dedupeAcrossSources([source('github', [first, second])], query)
  assert.deepEqual(result.sources[0].items, [first, second])
  assert.equal(result.collapsed, 0)
})

test('fresh scan bypasses both a cached result and older identical in-flight work', async () => {
  const saved = { ...SOURCE_ADAPTERS }
  const idea = 'quantum orchard planner fresh isolation'
  const opts = { expand: false, demand: false, ctx: {} }
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  let entered!: () => void
  const started = new Promise<void>((resolve) => { entered = resolve })
  let calls = 0
  let oldScan: ReturnType<typeof scanIdea> | undefined
  let freshScan: ReturnType<typeof scanIdea> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    for (const id of SOURCE_ORDER) SOURCE_ADAPTERS[id] = async () => source(id, [])
    SOURCE_ADAPTERS.github = async () => {
      const n = ++calls
      if (n === 1) { entered(); await held }
      return source('github', [{ ...item(idea, `https://github.com/acme/fresh-${n}`), meta: `${n * 100} stars` }])
    }
    oldScan = scanIdea(idea, opts)
    await started
    freshScan = scanIdea(idea, { ...opts, fresh: true })
    const observed = await Promise.race([
      freshScan,
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 2000) }),
    ])
    assert.ok(observed, 'fresh work must complete while older work is still held')
    assert.equal(calls, 2)
    assert.equal(observed.sources[0].items[0].url, 'https://github.com/acme/fresh-2')
    const cached = await scanIdea(idea, opts)
    assert.equal(cached.cached, true, 'fresh writes under the normal cache key')
    assert.equal(cached.sources[0].items[0].url, 'https://github.com/acme/fresh-2')
    const nextFresh = await scanIdea(idea, { ...opts, fresh: true })
    assert.equal(calls, 3, 'fresh must bypass the now populated cache')
    assert.equal(nextFresh.sources[0].items[0].url, 'https://github.com/acme/fresh-3')
    release()
    const older = await oldScan
    assert.equal(older.sources[0].items[0].url, 'https://github.com/acme/fresh-1')
    const afterOlder = await scanIdea(idea, opts)
    assert.equal(afterOlder.sources[0].items[0].url, 'https://github.com/acme/fresh-3', 'older completion cannot overwrite newer healthy cache')
  } finally {
    if (timer) clearTimeout(timer)
    release()
    await Promise.allSettled([oldScan, freshScan].filter((p): p is ReturnType<typeof scanIdea> => Boolean(p)))
    Object.assign(SOURCE_ADAPTERS, saved)
  }
})