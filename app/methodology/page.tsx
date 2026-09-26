import type { Metadata } from 'next'
import { Card, PageShell } from '@/components/page-shell'
import { GOLD_SET } from '@/lib/calibration/gold-set'

export const metadata: Metadata = {
  title: 'Methodology & calibration — Simultaneity Index',
  description: 'The published Simultaneity formula, source weights, demand model, quadrant thresholds and gold-set calibration.',
}

export default function MethodologyPage() {
  return (
    <PageShell eyebrow="Open standard · v1.1" title="How the Simultaneity score is computed" lede="A metric is only citeable if its formula is public. Here is all of it — and where it fails.">
      <Card title="Supply score (0–100)">
        <p><code className="font-mono">Simultaneity = 0.65 × weighted mean(sub-scores) + 0.35 × peak sub-score</code>, over healthy sources only. Weights: GitHub 0.28 · Hacker News 0.18 · Hugging Face 0.14 · arXiv, OpenAlex, npm, PyPI 0.10 each. The peak blend stops one hot channel (e.g. many starred repos) from being diluted by empty ones.</p>
        <p>Bands: 0–25 Open lane · 26–50 Early movers · 51–75 Crowded · 76–100 Saturated.</p>
      </Card>
      <Card title="Demand heat (0–100) and the battlefield">
        <p>Weighted mean of Reddit threads in the past year (0.40), Ask HN posts & comments (0.35) and Stack Overflow questions (0.25). Trend compares evidence from the last 6 months with the 6 months before.</p>
        <p>Quadrants: supply ≥ 50 is high; demand ≥ 40 is real pull (−10 if falling, +5 if rising). Blue Ocean · Gold Rush · Ghost Town · Bloodbath.</p>
      </Card>
      <Card title="Accuracy guards">
        <p>Transparent query expansion (one synonym variant for GitHub + HN, shown on every scan), cross-source de-duplication by canonical URL and title, confidence = 0.65 × coverage + 0.35 × cross-source agreement, and unavailable sources shown greyed out — never silently zero.</p>
      </Card>
      <Card title={`Gold set · ${GOLD_SET.length} expert-ranked ideas`}>
        <p>Run <code className="font-mono">pnpm calibrate</code> to score every idea live and publish Spearman ρ, pairwise ordinal agreement and every miss to <code className="font-mono">docs/CALIBRATION.md</code>.</p>
        <ol className="list-decimal pl-5">
          {GOLD_SET.map((g) => (
            <li key={g.idea}>{g.idea} <span className="text-muted-foreground">— expected {g.expected}</span></li>
          ))}
        </ol>
      </Card>
      <Card title="What this is not">
        <p>Not a viability score, not demand validation, not investment or legal novelty advice. Keyword and lexicon matching can still miss ideas described in unusual language — read the evidence links.</p>
      </Card>
    </PageShell>
  )
}
