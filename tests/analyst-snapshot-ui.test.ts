import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { computeCrowding } from '../lib/scoring/score'
import { issueReceipt } from '../lib/scoring/receipt'
import { LatestRequest } from '../lib/core/latest-request'
import type { CrowdingResult } from '../lib/types'

// Execute the actual page module in memory. Exports below are test-only;
// Next page module itself stays within Next's allowed export contract.
const source = readFileSync('app/page.tsx', 'utf8')
const require = createRequire(import.meta.url)
function loadPage(reactOverride?: unknown) {
  const code = ts.transpileModule(source + '\nexport { memoForSnapshot, MemoText };', { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} as any }
  const localRequire = (name: string) => {
    if (name === 'react' && reactOverride) return reactOverride
    if (name === '@/lib/core/latest-request') return { LatestRequest }
    if (name.startsWith('@/components/')) {
      const exportName = name.endsWith('watchlist') ? 'Watchlist' : name.split('/').at(-1)!.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
      const component = Object.defineProperty(() => null, 'name', { value: exportName })
      return { [exportName]: component, WatchButton: () => null, recordScan: () => undefined }
    }
    if (name === '@/lib/brief') return { opportunityBrief: () => 'DETERMINISTIC BRIEF' }
    return require(name)
  }
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports)
  return module.exports
}
function fixture(query = 'snapshot review'): CrowdingResult {
  const result = computeCrowding(query, [{ source: 'github', label: 'GitHub', status: 'ok', totalCount: 1, items: [{ title: 'Snapshot repo <script>', description: null, url: 'https://example.org/repo', date: null, meta: null }] }])
  result.receipt = issueReceipt(result.capsule)
  return result
}
function payload(result: CrowdingResult) { return { ok: true, snapshotId: result.receipt!.digest, memo: 'Observed [E1] repeated [E1].', citations: [{ id: 'E1', ...result.capsule.evidenceLinks[0] }], invalidCitations: 1, route: { model: 'synthetic', attempts: [{}] } } }
const page = loadPage()
test('client discards mismatched/missing snapshot identity even for the same query', () => {
  const scan = fixture(); const p = payload(scan)
  for (const snapshotId of [undefined, '', 'b'.repeat(64)]) assert.equal(page.memoForSnapshot({ ...p, snapshotId }, scan), null)
  assert.equal(page.memoForSnapshot(p, { ...scan, receipt: undefined }), null)
  assert.ok(page.memoForSnapshot(p, scan))
})
test('client rejects unmapped, duplicate, foreign and unsafe citation maps', () => {
  const scan = fixture(); const p = payload(scan)
  for (const citations of [[], null, [null], [{ ...p.citations[0], url: 'https://attacker.example' }], [{ ...p.citations[0], id: 'E0' }], [p.citations[0], p.citations[0]], [{ ...p.citations[0], source: 'askhn' }]]) assert.equal(page.memoForSnapshot({ ...p, citations }, scan), null)
  const unsafe = fixture(); unsafe.capsule.evidenceLinks[0].url = 'javascript:alert(1)'
  assert.equal(page.memoForSnapshot(payload(unsafe), unsafe), null)
  assert.equal(page.memoForSnapshot({ ...p, memo: 'Missing [E10000]' }, scan), null)
})
test('actual UI renderer links EVERY repeated E citation safely and escapes capsule titles', () => {
  const scan = fixture(); const memo = page.memoForSnapshot(payload(scan), scan)
  const html = renderToStaticMarkup(createElement(page.MemoText, { memo }))
  assert.equal((html.match(/href="https:\/\/example.org\/repo"/g) ?? []).length, 2)
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2)
  assert.match(html, /aria-label="\[E1\] github: Snapshot repo &lt;script&gt;"/)
  assert.ok(!html.includes('<script>'))
})

// Controlled hook scheduler exercises real requestMemo/runSearch functions.
// This is an in-process UI regression, not a browser/accessibility certification.
function homeHarness() {
  let cursor = 0; const slots: any[] = []
  const component = loadPage({
    useRef: (value: any) => { const i = cursor++; return slots[i] ??= { current: value } },
    useState: (value: any) => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], (v: any) => { slots[i] = v }] },
    useEffect: () => undefined,
  }).default
  const render = () => { cursor = 0; return component() }
  const find = (node: any, pred: (node: any) => boolean): any => {
    if (!node || typeof node !== 'object') return undefined
    if (Array.isArray(node)) { for (const n of node) { const found = find(n, pred); if (found) return found } return }
    if (pred(node)) return node
    return find(node.props?.children, pred)
  }
  return { render, find, search: (query: string) => find(render(), n => n.type?.name === 'SearchForm').props.onSearch(query), memo: () => find(render(), n => n.type === 'button' && n.props.children === 'AI analyst memo').props.onClick(), memoNode: () => find(render(), n => n.type?.name === 'MemoText'), errorNode: () => find(render(), n => n.props?.['aria-label'] === 'AI analyst memo') }
}

test('actual home request sends only snapshot reference; valid citations retained; mismatch does not replace scan', async () => {
  const original = globalThis.fetch; const scan = fixture(); let body: any
  globalThis.fetch = (async (url: any, init: any) => {
    if (url === '/api/search') return Response.json(scan)
    body = JSON.parse(init.body); return Response.json(payload(scan))
  }) as typeof fetch
  try {
    const home = homeHarness(); await home.search(scan.query); await home.memo()
    assert.deepEqual(body, { snapshotId: scan.receipt!.digest, receipt: scan.receipt, profile: 'fast' })
    assert.equal(home.memoNode().props.memo.snapshotId, scan.receipt!.digest)
    assert.equal(home.memoNode().props.memo.citations[0].url, 'https://example.org/repo')
    globalThis.fetch = (async () => Response.json({ ...payload(scan), snapshotId: 'f'.repeat(64) })) as typeof fetch
    await home.memo(); assert.equal(home.memoNode(), undefined)
    assert.match(JSON.stringify(home.errorNode()), /memo discarded/)
    assert.ok(home.find(home.render(), n => n.type?.name === 'ScoreDisplay'))
    assert.ok(home.find(home.render(), n => n.type === 'button' && n.props.children === 'Download decision brief'))
  } finally { globalThis.fetch = original }
})

test('actual home discards late memo when scan changes and leaves deterministic brief on unavailable/no-evidence errors', async () => {
  const original = globalThis.fetch; const a = fixture('first snapshot'); const b = fixture('second snapshot')
  let release!: (value: Response) => void
  globalThis.fetch = (async (url: any, init: any) => url === '/api/search' ? Response.json(JSON.parse(init.body).query === a.query ? a : b) : new Promise<Response>(resolve => { release = resolve })) as typeof fetch
  try {
    const home = homeHarness(); await home.search(a.query); const pending = home.memo()
    await home.search(b.query); release(Response.json(payload(a))); await pending
    assert.equal(home.memoNode(), undefined)
    for (const [status, error] of [[503, 'AI analyst is not configured'], [422, 'No citable evidence in this snapshot'], [409, 'This exact scan snapshot is unavailable']] as const) {
      globalThis.fetch = (async () => Response.json({ error }, { status })) as typeof fetch
      await home.memo(); assert.equal(home.memoNode(), undefined)
      assert.match(JSON.stringify(home.errorNode()), new RegExp(error))
      assert.ok(home.find(home.render(), n => n.type?.name === 'ScoreDisplay'))
      assert.ok(home.find(home.render(), n => n.type === 'button' && n.props.children === 'Download decision brief'))
    }
  } finally { globalThis.fetch = original }
})
