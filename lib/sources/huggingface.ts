import { errorResult } from '@/lib/core/fetch'
import { pacedFetch, UpstreamError } from '@/lib/core/pace'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'
import { record, nonempty, optionalText, optionalCount } from './contract'

function validRows(rows: unknown): boolean {
  return Array.isArray(rows) && rows.every((row) => record(row) && nonempty(row.id) &&
    optionalText(row.lastModified) && optionalText(row.pipeline_tag) &&
    optionalCount(row.downloads) && optionalCount(row.likes))
}

export async function searchHuggingFace(
  query: string,
  ctx: AdapterContext = {},
): Promise<SourceResult> {
  const label = 'Hugging Face Hub'
  try {
    const q = encodeURIComponent(query)
    const modelsUrl =
      'https://huggingface.co/api/models?search=' + q + '&limit=8&sort=downloads&direction=-1'
    const datasetsUrl =
      'https://huggingface.co/api/datasets?search=' + q + '&limit=4&sort=downloads&direction=-1'

    const [modelsRes, datasetsRes] = await Promise.all([
      pacedFetch('huggingface', modelsUrl, {
        headers: { 'User-Agent': 'simultaneity-index/1.0' },
        timeoutMs: ctx.timeoutMs,
      }),
      pacedFetch('huggingface', datasetsUrl, {
        headers: { 'User-Agent': 'simultaneity-index/1.0' },
        timeoutMs: ctx.timeoutMs,
      }),
    ])

    if (!modelsRes.ok && !datasetsRes.ok) {
      return errorResult('huggingface', label, 'Hugging Face Hub unavailable.')
    }

    const items: EvidenceItem[] = []

    if (modelsRes.ok) {
      const models = await modelsRes.json()
      if (!validRows(models)) return errorResult('huggingface', label, 'Hugging Face returned a malformed models response.')
      for (const m of models as Array<{
        id: string
        downloads?: number
        likes?: number
        lastModified?: string
        pipeline_tag?: string
      }>) {
        items.push({
          title: m.id,
          description: m.pipeline_tag ? 'model · ' + m.pipeline_tag : 'model',
          url: 'https://huggingface.co/' + m.id,
          date: m.lastModified ?? null,
          meta:
            (m.downloads ?? 0).toLocaleString() +
            ' downloads · ' +
            (m.likes ?? 0).toLocaleString() +
            ' likes',
          relevance: 1,
        })
      }
    }

    if (datasetsRes.ok) {
      const datasets = await datasetsRes.json()
      if (!validRows(datasets)) return errorResult('huggingface', label, 'Hugging Face returned a malformed datasets response.')
      for (const d of datasets as Array<{
        id: string
        downloads?: number
        likes?: number
        lastModified?: string
      }>) {
        items.push({
          title: d.id,
          description: 'dataset',
          url: 'https://huggingface.co/datasets/' + d.id,
          date: d.lastModified ?? null,
          meta: (d.downloads ?? 0).toLocaleString() + ' downloads · dataset',
          relevance: 0.9,
        })
      }
    }

    return {
      source: 'huggingface',
      label,
      status: 'ok',
      totalCount: items.length,
      items: items.slice(0, 10),
      ...(!modelsRes.ok || !datasetsRes.ok ? { notice: `Partial Hugging Face evidence: ${!modelsRes.ok ? 'models' : 'datasets'} endpoint unavailable.` } : {}),
    }
  } catch (e) {
    if (e instanceof UpstreamError) return errorResult('huggingface', label, e.message, e.status === 429)
    return errorResult('huggingface', label, 'Hugging Face request failed or timed out.')
  }
}
