import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'
import { record, nonempty, optionalText } from './contract'

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
    let malformedExact = false
    await Promise.all(candidates.slice(0, 3).map(async (name) => {
      try {
        const res = await pacedFetch(
          'pypi',
          'https://pypi.org/pypi/' + encodeURIComponent(name) + '/json',
          { timeoutMs: ctx.timeoutMs ?? 5000 },
        )
        if (!res.ok) return
        const data = await res.json()
        if (!record(data) || !record(data.info) || !nonempty(data.info.name) ||
          !record(data.releases) || !Object.values(data.releases).every((files) =>
            Array.isArray(files) && files.every((file) => record(file) && optionalText(file.upload_time_iso_8601))) ||
          !optionalText(data.info.summary) || !optionalText(data.info.package_url) ||
          !optionalText(data.info.version)) {
          malformedExact = true
          return
        }
        const info = data.info as { name: string; summary?: string | null; package_url?: string | null; version?: string | null }
        const dates = Object.values(data.releases ?? {}).flat().map((f) => (f as { upload_time_iso_8601?: string }).upload_time_iso_8601).filter((d): d is string => typeof d === 'string' && !Number.isNaN(Date.parse(d))).sort()
        items.push({
          title: info.name ?? name,
          description: info.summary ?? null,
          url: info.package_url ?? ('https://pypi.org/project/' + name + '/'),
          date: dates.at(-1) ?? null,
          meta: info.version ? 'version ' + info.version : null,
          relevance: name === slug ? 1 : 0.7,
        })
      } catch (error) {
        if (error instanceof SyntaxError) malformedExact = true
        // continue
      }
    }))
    let searchAvailable = false
    try {
      const searchRes = await pacedFetch(
        'pypi',
        'https://pypi.org/search/?q=' + encodeURIComponent(query),
        {
          headers: { Accept: 'text/html' },
          timeoutMs: ctx.timeoutMs,
        },
      )
      if (searchRes.ok) {
        const html = await searchRes.text()
        searchAvailable = /package-snippet|No projects found|No results found/i.test(html) && !/Client Challenge|captcha/i.test(html)
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

    if (malformedExact) return errorResult('pypi', label, 'PyPI returned a malformed exact-name response.')
    if (!searchAvailable && items.length === 0) return errorResult('pypi', label, 'PyPI search unavailable or challenged; exact-name probes found no evidence. Not evidence of an empty ecosystem.')
    const unique = [...new Map(items.map((i) => [i.url, i])).values()]
    return {
      source: 'pypi',
      label,
      status: 'ok',
      totalCount: unique.length,
      items: unique.slice(0, 10),
      ...(!searchAvailable ? { notice: 'PyPI search unavailable or challenged; exact-name evidence only, not ecosystem-wide search.' } : {}),
    }
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('pypi', label, e.message, e.status === 429)
    return errorResult('pypi', label, 'PyPI request failed or timed out.')
  }
}
