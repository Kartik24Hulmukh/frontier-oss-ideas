import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeCrowding } from '../lib/scoring/score'
import type { SourceResult } from '../lib/types'

function emptyOk(source: SourceResult['source'], label: string): SourceResult {
  return { source, label, status: 'ok', totalCount: 0, items: [] }
}

function allEmpty(): SourceResult[] {
  return [
    emptyOk('github', 'GitHub'),
    emptyOk('hackernews', 'HN'),
    emptyOk('arxiv', 'arXiv'),
    emptyOk('openalex', 'OpenAlex'),
    emptyOk('npm', 'npm'),
    emptyOk('pypi', 'PyPI'),
    emptyOk('huggingface', 'HF'),
    emptyOk('reddit', 'Reddit'),
  ]
}

function hotReddit(): SourceResult {
  return {
    source: 'reddit',
    label: 'Reddit',
    status: 'ok',
    totalCount: 40,
    items: [
      {
        title: '[r/SaaS] does anyone know a tool like this',
        description: null,
        url: 'https://www.reddit.com/r/SaaS/comments/abc',
        date: new Date().toISOString(),
        meta: '120 upvotes · 40 comments',
        isLaunchSignal: true,
        relevance: 1,
      },
      {
        title: '[r/startups] I wish there was a tool for this',
        description: null,
        url: 'https://www.reddit.com/r/startups/comments/def',
        date: new Date().toISOString(),
        meta: '80 upvotes · 20 comments',
        isLaunchSignal: true,
        relevance: 1,
      },
    ],
  }
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
    ],
  }
}

describe('supply x demand battlefield matrix', () => {
  it('labels a fully empty scan Ghost Town (low supply, low demand)', () => {
    const result = computeCrowding('totally novel quantum teapot', allEmpty())
    assert.equal(result.quadrant, 'Ghost Town')
    assert.ok(result.supplyScore < 40)
    assert.ok(result.demandScore < 35)
  })

  it('labels low supply + hot Reddit demand as Blue Ocean', () => {
    const sources = allEmpty().filter((s) => s.source !== 'reddit')
    sources.push(hotReddit())
    const result = computeCrowding('a genuinely underserved workflow', sources)
    assert.equal(result.quadrant, 'Blue Ocean')
    assert.ok(result.demandScore >= 35)
    assert.ok(result.supplyScore < 40)
  })

  it('labels high supply + hot demand as Gold Rush', () => {
    const sources = [crowdedGitHub(), hotReddit()]
    const result = computeCrowding('AI code review agent', sources)
    assert.equal(result.quadrant, 'Gold Rush')
  })

  it('labels high supply + weak demand as Bloodbath', () => {
    const sources = [crowdedGitHub()]
    const result = computeCrowding('AI code review agent', sources)
    assert.equal(result.quadrant, 'Bloodbath')
  })
})
