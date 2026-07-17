import { errorResult, fetchWithTimeout } from '@/lib/core/fetch'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'

/** Best-effort PyPI adapter: JSON for exact-ish names + HTML search parse. */
export async function searchPypi(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'PyPI Packages'
  try {
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const candidates = Array.from(
      new Set([slug, slug.replace(/-/g, '_'), query.toLowerCase().replace(/\s+/g, '-')]),
    )

    const items: EvidenceItem[] = []
    for (const name of candidates.slice(0, 3)) {
      try {
        const res = await fetchWithTimeout(
          'https://pypi.org/pypi/' + encodeURIComponent(name) + '/json',
          { timeoutMs: ctx.timeoutMs ?? 5000 },
        )
        if (!res.ok) continue
        const data = await res.json()
        const info = data.info ?? {}
        const versions = Object.keys(data.releases ?? {}).sort()
        items.push({
          title: info.name ?? name,
          description: info.summary ?? null,
          url: info.package_url ?? ('https://pypi.org/project/' + name + '/'),
          date: versions.length ? versions[versions.length - 1] : null,
          meta: info.version ? 'version ' + info.version : null,
          relevance: name === slug ? 1 : 0.7,
        })
      } catch {
        // continue
      }
    }

    try {
      const searchRes = await fetchWithTimeout(
        'https://pypi.org/search/?q=' + encodeURIComponent(query),
        {
          headers: { Accept: 'text/html' },
          timeoutMs: ctx.timeoutMs,
        },
      )
      if (searchRes.ok) {
        const html = await searchRes.text()
        const re =
          /href="\/project\/([^/]+)\/?"[^>]*>\s*<span class="package-snippet__name">([^<]+)<\/span>[\s\S]*?<p class="package-snippet__description">([^<]*)/g
        let m: RegExpExecArray | null
        const seen = new Set(items.map((i) => i.title.toLowerCase()))
        while ((m = re.exec(html)) && items.length < 10) {
          const name = m[1]
          if (seen.has(name.toLowerCase())) continue
          seen.add(name.toLowerCase())
          items.push({
            title: (m[2] || name).trim(),
            description: (m[3] || '').trim() || null,
            url: 'https://pypi.org/project/' + name + '/',
            date: null,
            meta: null,
            relevance: 0.8,
          })
        }
      }
    } catch {
      // ignore HTML path failures
    }

    return {
      source: 'pypi',
      label,
      status: 'ok',
      totalCount: items.length,
      items: items.slice(0, 10),
    }
  } catch {
    return errorResult('pypi', label, 'PyPI request failed or timed out.')
  }
}
