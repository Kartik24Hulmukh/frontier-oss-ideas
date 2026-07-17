import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeCrowding } from '../lib/scoring/score'
import type { SourceResult } from '../lib/types'

function emptyOk(source: SourceResult['source'], label: string): SourceResult {
  return { source, label, status: 'ok', totalCount: 0, items: [] }
}

function crowdedGitHub(): SourceResult {
  return {
    source: 'github',
    label: 'GitHub Repositories',
    status: 'ok',
    totalCount: 120,
    items: [
      {
        title: 'acme/ai-code-review',
        description: 'AI code review',
        url: 'https://github.com/acme/ai-code-review',
        date: new Date().toISOString(),
        meta: '2,400 stars · last push 2026-01-01',
      },
      {
        title: 'beta/review-bot',
        description: 'review bot',
        url: 'https://github.com/beta/review-bot',
        date: new Date().toISOString(),
        meta: '800 stars · last push 2026-02-01',
      },
      {
        title: 'gamma/pr-ai',
        description: 'pr ai',
        url: 'https://github.com/gamma/pr-ai',
        date: new Date().toISOString(),
        meta: '150 stars · last push 2026-03-01',
      },
    ],
  }
}

describe('computeCrowding', () => {
  it('returns open lane when all sources empty', () => {
    const sources: SourceResult[] = [
      emptyOk('github', 'GitHub'),
      emptyOk('hackernews', 'HN'),
      emptyOk('arxiv', 'arXiv'),
      emptyOk('openalex', 'OpenAlex'),
      emptyOk('npm', 'npm'),
      emptyOk('pypi', 'PyPI'),
      emptyOk('huggingface', 'HF'),
    ]
    const result = computeCrowding('totally novel quantum teapot', sources)
    assert.equal(result.verdict, 'Open lane')
    assert.ok(result.score <= 25)
    assert.ok(result.confidence > 0)
    assert.ok(result.capsule.evidenceLinks.length === 0)
    assert.ok(result.wedges.length >= 1)
  })

  it('raises score when github shows traction', () => {
    const sources: SourceResult[] = [
      crowdedGitHub(),
      emptyOk('hackernews', 'HN'),
      emptyOk('arxiv', 'arXiv'),
      emptyOk('openalex', 'OpenAlex'),
      emptyOk('npm', 'npm'),
      emptyOk('pypi', 'PyPI'),
      emptyOk('huggingface', 'HF'),
    ]
    const result = computeCrowding('AI code review agent', sources)
    assert.ok(result.score > 25)
    assert.ok(['Early movers', 'Crowded', 'Saturated'].includes(result.verdict))
    assert.ok(result.capsule.evidenceLinks.length > 0)
  })

  it('excludes failed sources from weighted score but keeps coverage honest', () => {
    const sources: SourceResult[] = [
      crowdedGitHub(),
      {
        source: 'hackernews',
        label: 'HN',
        status: 'error',
        totalCount: 0,
        items: [],
        errorMessage: 'down',
      },
      emptyOk('arxiv', 'arXiv'),
      emptyOk('openalex', 'OpenAlex'),
      emptyOk('npm', 'npm'),
      emptyOk('pypi', 'PyPI'),
      emptyOk('huggingface', 'HF'),
    ]
    const result = computeCrowding('AI code review agent', sources)
    assert.ok(result.coverage < 100)
    const hn = result.breakdown.find((b) => b.source === 'hackernews')
    assert.equal(hn?.included, false)
  })
})
