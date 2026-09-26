import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGate } from '../scripts/release-gate.mjs'
const sources = ['github', 'hackernews', 'arxiv', 'openalex', 'npm', 'pypi', 'huggingface'].map(source => ({ source, status: 'ok' }))
const health = { ok: true, version: 'test', admission: 'distributed-configured', credentials: { receiptPublicKeyPinned: true } }
const scan = { query: 'test idea', score: 50, coverage: 100, capsule: { version: '1.2', modelVersion: 'crowding-1.0', sourceSummary: sources }, sources, demand: { sources: ['reddit','stackoverflow','askhn'].map(source => ({ source, status: 'ok' })) } }
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
