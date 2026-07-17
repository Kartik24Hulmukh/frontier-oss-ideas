import type { ScoreBreakdown, SourceResult, Verdict, Wedge } from '@/lib/types'

/**
 * Wedge engine v1 — lightweight, evidence-grounded suggestions.
 * Never invents competitors; only reads live source patterns.
 */
export function computeWedges(
  query: string,
  score: number,
  verdict: Verdict,
  sources: SourceResult[],
  breakdown: ScoreBreakdown[],
): Wedge[] {
  const wedges: Wedge[] = []
  const byId = Object.fromEntries(sources.map((s) => [s.source, s]))
  const sub = Object.fromEntries(breakdown.map((b) => [b.source, b.subScore]))

  const gh = byId.github
  const hn = byId.hackernews
  const hf = byId.huggingface
  const npm = byId.npm
  const pypi = byId.pypi

  const launches = hn?.items.filter((i) => i.isLaunchSignal).length ?? 0
  const hotRepos = gh?.items.filter((i) => /\d{2,}|\d{1,3},\d{3}/.test(i.meta ?? '')).length ?? 0

  if (verdict === 'Open lane') {
    wedges.push({
      title: 'Speed-to-evidence wedge',
      rationale:
        'Lane looks empty on public builder signals. Ship a thin vertical slice and collect proof of demand before the simultaneous wave arrives.',
      priority: 'high',
    })
    if ((sub.arxiv ?? 0) + (sub.openalex ?? 0) > 30) {
      wedges.push({
        title: 'Research-to-product transfer',
        rationale:
          'Academic heat exists without shipping products — translate papers into a workflow tool before others productize the literature.',
        priority: 'high',
      })
    }
  }

  if (verdict === 'Early movers') {
    wedges.push({
      title: 'Differentiate on workflow depth',
      rationale:
        'A few teams are circling. Win on a painful sub-step (integration, evaluation, compliance, or distribution) rather than a clone of the headline idea.',
      priority: 'high',
    })
  }

  if (verdict === 'Crowded' || verdict === 'Saturated') {
    wedges.push({
      title: 'Neutral layer above the lane',
      rationale:
        'Many independent builders already exist. Prefer infrastructure, aggregation, evaluation, or interoperability over another vertical app.',
      priority: 'high',
    })
  }

  // Ecosystem asymmetry wedges
  if ((sub.npm ?? 0) > 40 && (sub.pypi ?? 0) < 20) {
    wedges.push({
      title: 'Python/ML-native packaging gap',
      rationale:
        'JS package supply is denser than Python signals — a Pythonic or model-native packaging of the same idea may still be open.',
      priority: 'medium',
    })
  }
  if ((sub.pypi ?? 0) > 40 && (sub.npm ?? 0) < 20) {
    wedges.push({
      title: 'Developer UX / web surface gap',
      rationale:
        'Python supply exists; JS/web productization may lag — a polished product surface could still be the wedge.',
      priority: 'medium',
    })
  }
  if ((sub.huggingface ?? 0) > 45 && (sub.github ?? 0) < 35) {
    wedges.push({
      title: 'From models to product',
      rationale:
        'Model/dataset activity is high relative to application repos — productize evaluation, routing, or ops around existing models.',
      priority: 'high',
    })
  }
  if (launches === 0 && score > 40) {
    wedges.push({
      title: 'Quiet builders, no public launch',
      rationale:
        'Builder density without Show HN launches suggests stealth or incomplete GTM — a crisp public narrative can still win attention.',
      priority: 'medium',
    })
  }
  if (hotRepos >= 3 && verdict !== 'Open lane') {
    wedges.push({
      title: 'Niche ICP specialization',
      rationale: `Multiple starred repos already claim “${query.slice(0, 48)}”. Specialize for one ICP (industry, region, compliance, or stack) instead of generalist positioning.`,
      priority: 'high',
    })
  }

  // Always offer a kill option when saturated
  if (verdict === 'Saturated') {
    wedges.push({
      title: 'Kill or reframe',
      rationale:
        'Saturated lanes punish undifferentiated weekend builds. Either kill, become the layer above, or reframe the problem until crowding drops.',
      priority: 'high',
    })
  }

  // Deduplicate by title, cap 4
  const seen = new Set<string>()
  const unique: Wedge[] = []
  for (const w of wedges) {
    if (seen.has(w.title)) continue
    seen.add(w.title)
    unique.push(w)
    if (unique.length >= 4) break
  }
  if (unique.length === 0) {
    unique.push({
      title: 'Collect more signal',
      rationale: 'Insufficient source coverage for a sharp wedge. Re-run with GITHUB_TOKEN set and refine the idea phrase.',
      priority: 'low',
    })
  }
  return unique
}
