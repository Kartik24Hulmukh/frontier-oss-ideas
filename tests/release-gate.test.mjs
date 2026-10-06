import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGate } from '../scripts/release-gate.mjs'
const sources = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface', 'crates'].map(source => ({ source, status: 'ok', totalCount: 0 }))
const health = { ok: true, version: 'test', admission: 'distributed-configured', credentials: { receiptPublicKeyPinned: true } }
const scan = { query: 'test idea', score: 50, coverage: 100, capsule: { version: '1.2', modelVersion: 'crowding-1.3', sourceSummary: sources.map(s => ({ ...s })) }, sources, demand: { sources: ['reddit','stackoverflow','askhn'].map(source => ({ source, status: 'ok', totalCount: 0 })) } }
scan.demand.sources[0].provenance = 'primary'
scan.capsule.demandSourceSummary = scan.demand.sources.map(s => ({ ...s }))
Object.assign(scan, { searchedAt: new Date().toISOString(), confidence: 70, verdict: 'Early movers' })
Object.assign(scan.capsule, { query: scan.query, score: scan.score, coverage: scan.coverage, confidence: scan.confidence, verdict: scan.verdict, searchedAt: scan.searchedAt })
const verification = { digestMatches: true, issuerTrusted: true }
test('strict gate accepts complete technical fixture', () => assert.equal(evaluateGate(health, scan, verification, true).passed, true))
test('strict gate rejects per-instance admission and untrusted issuer', () => {
  assert.equal(evaluateGate({ ...health, admission: 'per-instance' }, scan, verification, true).passed, false)
  assert.equal(evaluateGate(health, scan, { ...verification, issuerTrusted: false }, true).passed, false)
})
test('strict gate rejects anonymous fallback despite 100% coverage', () => assert.equal(evaluateGate(health, { ...scan, sources: sources.map(s => ({ ...s, notice: 'fallback' })) }, verification, true).passed, false))
test('gate rejects missing provenance, malformed score and broken digest', () => {
  for (const broken of [{ ...scan, score: null }, { ...scan, capsule: {} }, { ...scan, coverage: 40 }]) assert.equal(evaluateGate(health, broken, verification).passed, false)
  assert.equal(evaluateGate(health, scan, {}).passed, false)
})
test('beta gate explicitly permits unprovisioned infrastructure, not strict gate', () => {
  const betaHealth = { ok: true, admission: 'per-instance' }
  assert.equal(evaluateGate(betaHealth, scan, { digestMatches: true }).passed, true)
  assert.equal(evaluateGate(betaHealth, scan, { digestMatches: true }, true).passed, false)
})

test('strict gate rejects enabled analyst with per-instance spending limits', () => {
  const result = evaluateGate({ ...health, llm: { configured: true, budgetScope: 'per-instance' } }, scan, { digestMatches: true, issuerTrusted: true }, true)
  assert.equal(result.passed, false)
  assert.equal(result.checks.find(c => c.name === 'llm-distributed-budget').passed, false)
})

test('strict gate rejects mirror demand even with 100% responding coverage', () => {
  const mirrored = structuredClone(scan)
  Object.assign(mirrored.demand.sources[0], { provenance: 'mirror', notice: 'primary unavailable' })
  mirrored.capsule.demandSourceSummary = mirrored.demand.sources.map(s => ({ ...s }))
  const r = evaluateGate(health, mirrored, verification, true)
  assert.equal(r.checks.find(c => c.name === 'healthy-demand').passed, false)
  assert.equal(r.checks.find(c => c.name === 'demand-provenance').passed, true)
})
test('strict gate rejects lost or changed receipt-covered demand metadata', () => {
  for (const fields of [{ provenance: 'mirror' }, { notice: 'fallback' }, { totalCount: 99 }, { status: 'error' }]) {
    const altered = structuredClone(scan)
    Object.assign(altered.demand.sources[0], fields)
    assert.equal(evaluateGate(health, altered, verification, true).checks.find(c => c.name === 'demand-provenance').passed, false)
  }
})
test('gate rejects duplicate sources, impossible coverage and unexpected deployment SHA', () => {
  const duplicate = structuredClone(scan)
  duplicate.capsule.sourceSummary = Array(7).fill(sources[0])
  assert.equal(evaluateGate(health, duplicate, verification).passed, false)
  assert.equal(evaluateGate(health, { ...scan, coverage: 101 }, verification).passed, false)
  for (const build of [null, 'b'.repeat(40), 'a'.repeat(7)]) assert.equal(evaluateGate({ ...health, build }, scan, verification, true, 'a'.repeat(40)).passed, false)
  assert.equal(evaluateGate({ ...health, build: 'a'.repeat(40) }, scan, verification, true, 'a'.repeat(40)).passed, true)
  assert.equal(evaluateGate(health, scan, verification, true, '').passed, false)
})

test('strict gate requires explicit primary Reddit provenance', () => {
  const missing = structuredClone(scan)
  delete missing.demand.sources[0].provenance
  delete missing.capsule.demandSourceSummary[0].provenance
  assert.equal(evaluateGate(health, missing, verification, true).checks.find(c => c.name === 'healthy-demand').passed, false)
})

test('strict gate rejects altered or missing receipt-covered supply provenance', () => {
  for (const patch of [{ status:'error' }, { totalCount:99 }, { notice:'fallback' }]) {
    for (const target of ['sources','capsule']) {
      const altered=structuredClone(scan)
      Object.assign(target === 'sources' ? altered.sources[0] : altered.capsule.sourceSummary[0], patch)
      assert.equal(evaluateGate(health,altered,verification,true).checks.find(c=>c.name==='supply-provenance').passed,false)
    }
  }
  const altered=structuredClone(scan); altered.capsule.sourceSummary=[]
  assert.equal(evaluateGate(health,altered,verification,true).checks.find(c=>c.name==='supply-provenance').passed,false)
})


test('strict gate rejects stale, future and cached snapshots or mismatched display', () => {
  for (const timestamp of [new Date(Date.now()-121000).toISOString(),new Date(Date.now()+31000).toISOString(),'invalid']) {
    const altered=structuredClone(scan); altered.searchedAt=timestamp; altered.capsule.searchedAt=timestamp
    assert.equal(evaluateGate(health,altered,verification,true).checks.find(c=>c.name==='fresh-snapshot').passed,false)
  }
  assert.equal(evaluateGate(health,{...scan,cached:true},verification,true).checks.find(c=>c.name==='fresh-snapshot').passed,false)
  for (const [key,value] of [['query','forged'],['score',99],['coverage',99],['confidence',99],['verdict','Saturated']]) {
    const altered=structuredClone(scan); altered[key]=value
    assert.equal(evaluateGate(health,altered,verification,true).checks.find(c=>c.name==='snapshot-binding').passed,false)
  }
  const altered=structuredClone(scan); altered.capsule.modelVersion='unknown'
  assert.equal(evaluateGate(health,altered,verification,true).checks.find(c=>c.name==='snapshot-binding').passed,false)
})
test('strict gate rejects enabled analyst with every breaker open or unobserved', () => {
  for (const breakers of [undefined,{}, {a:'open',b:'open'}]) {
    const h={...health,llm:{configured:true,budgetScope:'distributed-configured',breakers}}
    assert.equal(evaluateGate(h,scan,verification,true).checks.find(c=>c.name==='llm-breaker-availability').passed,false)
  }
  assert.equal(evaluateGate({...health,llm:{configured:false}},scan,verification,true).checks.find(c=>c.name==='llm-breaker-availability').passed,true)
})

test('strict breaker gate uses actual string-valued router health schema', () => {
  assert.equal(evaluateGate({...health,llm:{configured:true,budgetScope:'distributed-configured',breakers:{primary:'closed',fallback:'open'}}},scan,verification,true).checks.find(c=>c.name==='llm-breaker-availability').passed,true)
})
