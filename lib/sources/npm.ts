import { errorResult, fetchWithTimeout } from '@/lib/core/fetch'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'

export async function searchNpm(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'npm Packages'
  try {
    const url =
      'https://registry.npmjs.org/-/v1/search?text=' +
      encodeURIComponent(query) +
      '&size=10'
    const res = await fetchWithTimeout(url, { timeoutMs: ctx.timeoutMs })
    if (!res.ok) return errorResult('npm', label, 'npm registry returned ' + res.status + '.')
    const data = await res.json()
    const items: EvidenceItem[] = (data.objects ?? []).map(
      (obj: {
        package: {
          name: string
          description?: string
          date?: string
          links?: { npm?: string }
        }
      }) => ({
        title: obj.package.name,
        description: obj.package.description ?? null,
        url: obj.package.links?.npm ?? ('https://www.npmjs.com/package/' + obj.package.name),
        date: obj.package.date ?? null,
        meta: obj.package.date ? 'last publish ' + obj.package.date.slice(0, 10) : null,
        relevance: 1,
      }),
    )
    return {
      source: 'npm',
      label,
      status: 'ok',
      totalCount: data.total ?? items.length,
      items,
    }
  } catch {
    return errorResult('npm', label, 'npm registry request failed or timed out.')
  }
}
