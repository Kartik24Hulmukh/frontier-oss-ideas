import { computeCrowding } from '../lib/scoring/score'
import type { SourceResult } from '../lib/types'

const sources: SourceResult[] = [
  {
    source: 'github',
    label: 'GitHub',
    status: 'ok',
    totalCount: 10,
    items: [
      {
        title: 'demo/repo',
        description: 'demo',
        url: 'https://github.com/demo/repo',
        date: '2025-01-01T00:00:00Z',
        meta: '10 stars · last push 2025-01-01',
      },
    ],
  },
  {
    source: 'hackernews',
    label: 'HN',
    status: 'ok',
    totalCount: 2,
    items: [],
  },
  {
    source: 'arxiv',
    label: 'arXiv',
    status: 'ok',
    totalCount: 0,
    items: [],
  },
  {
    source: 'openalex',
    label: 'OpenAlex',
    status: 'ok',
    totalCount: 0,
    items: [],
  },
  {
    source: 'npm',
    label: 'npm',
    status: 'ok',
    totalCount: 0,
    items: [],
  },
  {
    source: 'pypi',
    label: 'PyPI',
    status: 'ok',
    totalCount: 0,
    items: [],
  },
  {
    source: 'huggingface',
    label: 'HF',
    status: 'ok',
    totalCount: 0,
    items: [],
  },
]

const result = computeCrowding('smoke test idea', sources)
console.log(
  JSON.stringify(
    {
      score: result.score,
      verdict: result.verdict,
      confidence: result.confidence,
      wedges: result.wedges.map((w) => w.title),
      capsuleLinks: result.capsule.evidenceLinks.length,
    },
    null,
    2,
  ),
)
