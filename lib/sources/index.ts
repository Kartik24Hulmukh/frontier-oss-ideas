import type { AdapterContext, SourceAdapter, SourceId, SourceResult } from '@/lib/types'
import { searchArxiv } from './arxiv'
import { searchGitHub } from './github'
import { searchHackerNews } from './hackernews'
import { searchHuggingFace } from './huggingface'
import { searchNpm } from './npm'
import { searchOpenAlex } from './openalex'
import { searchPypi } from './pypi'

export const SOURCE_ADAPTERS: Record<SourceId, SourceAdapter> = {
  github: searchGitHub,
  hackernews: searchHackerNews,
  arxiv: searchArxiv,
  openalex: searchOpenAlex,
  npm: searchNpm,
  pypi: searchPypi,
  huggingface: searchHuggingFace,
}

export const SOURCE_ORDER: SourceId[] = [
  'github',
  'hackernews',
  'arxiv',
  'openalex',
  'npm',
  'pypi',
  'huggingface',
]

export async function runAllSources(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult[]> {
  const settled = await Promise.allSettled(
    SOURCE_ORDER.map((id) => SOURCE_ADAPTERS[id](query, ctx)),
  )
  return settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    const id = SOURCE_ORDER[i]
    return {
      source: id,
      label: id,
      status: 'error' as const,
      totalCount: 0,
      items: [],
      errorMessage: 'Adapter threw unexpectedly.',
    }
  })
}

export {
  searchArxiv,
  searchGitHub,
  searchHackerNews,
  searchHuggingFace,
  searchNpm,
  searchOpenAlex,
  searchPypi,
}
