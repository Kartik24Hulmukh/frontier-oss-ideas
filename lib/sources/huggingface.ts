import { errorResult, fetchWithTimeout } from '@/lib/core/fetch'
import type { AdapterContext, EvidenceItem, SourceResult } from '@/lib/types'

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
      fetchWithTimeout(modelsUrl, {
        headers: { 'User-Agent': 'simultaneity-index/1.0' },
        timeoutMs: ctx.timeoutMs,
      }),
      fetchWithTimeout(datasetsUrl, {
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
  } catch {
    return errorResult('huggingface', label, 'Hugging Face request failed or timed out.')
  }
}
