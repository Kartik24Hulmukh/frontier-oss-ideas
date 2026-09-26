import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGate } from '../scripts/release-gate.mjs'
const sources = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface'].map(source => ({ source, status: 'ok', totalCount: 0 }))
const health = { ok: true, version: 'test', admission: 'distributed-configured', credentials: { receiptPublicKeyPinned: true } }
const scan = { query: 'test idea', score: 50, coverage: 100, capsule: { version: '1.2', modelVersion: 'crowding-1.0', sourceSummary: sources }, sources, demand: { sources: ['reddit','stackoverflow','askhn'].map(source => ({ source, status: 'ok', totalCount: 0 })) } }
scan.demand.sources[0].provenance = 'primary'
scan.capsule.demandSourceSummary = scan.demand.sources.map(s => ({ ...s }))
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
