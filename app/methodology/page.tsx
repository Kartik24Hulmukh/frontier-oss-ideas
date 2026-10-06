import type { Metadata } from 'next'
import { Card, PageShell } from '@/components/page-shell'
import { GOLD_SET } from '@/lib/calibration/gold-set'

export const metadata: Metadata = {
  title: 'Methodology & calibration — Simultaneity Index',
  description: 'The published Simultaneity formula, source weights, demand model, quadrant thresholds and gold-set calibration.',
}

export default function MethodologyPage() {
  return (
    <PageShell eyebrow="Uncalibrated instrument · crowding-1.4" title="How the Simultaneity score is computed" lede="A metric is only citeable if its formula is public. Here is all of it — and where it fails.">
      <Card title="Supply score (0–100)">
        <p><code className="font-mono">Simultaneity = 0.65 × weighted mean(sub-scores) + 0.35 × peak sub-score</code>, over healthy sources only. Weights: GitHub 0.28 · Hacker News 0.18 · Hugging Face 0.14 · arXiv and OpenAlex 0.10 each · npm and PyPI 0.08 each · crates.io 0.04. The peak blend stops one hot channel (e.g. many starred repos) from being diluted by empty ones.</p>
        <p>Model crowding-1.4 requires specific workflow anchors; generic AI/tool overlap alone does not qualify. It excludes below-threshold audit items. For every filtered sample, the usable total is min(raw × qualified / sampled, qualified × (1 + log10(1 + raw / sampled))). No inspectable sample means zero usable total. Even fully qualified samples cannot validate the unseen raw tail. This bound and confidence caps are not independently calibrated. Market quadrants abstain below 50% supply confidence or 67% demand coverage. Lexical relevance, sample gates and score thresholds still need independent held-out validation.</p>
        <p>Bands: 0–25 Open lane · 26–50 Early movers · 51–75 Crowded · 76–100 Saturated.</p>
      </Card>
      <Card title="Demand heat (0–100) and the battlefield">
        <p>Weighted mean of Reddit threads in the past year (0.40), Ask HN posts & comments (0.35) and Stack Overflow questions (0.25). Only inspectable recent topical questions or pull/complaint signals qualify. Each source sub-score is observed unique qualified items / 25 × 100; raw counts and engagement are audit-only. Aggregate heat requires two supported channels, four unique URLs and matched query/windows (capture skew ≤60 seconds); otherwise it abstains. Mirrors retain a 50% weight and explicit caveat. These are uncalibrated discussion proxies, not purchase intent. Trend is unknown: relevance-ranked samples cannot establish rising or falling market demand.</p>
        <p>Quadrants: supply ≥ 50 is high; discussion heat ≥ 40 is the heuristic split. Blue Ocean · Gold Rush · Ghost Town · Bloodbath.</p>
      </Card>
      <Card title="Accuracy guards">
        <p>Transparent query expansion (one synonym variant for GitHub + HN, shown on every scan), cross-source de-duplication by canonical URL and title, confidence = (0.65 × coverage + 0.35 × cross-source agreement) × min(1, qualified items / 8) × min(1, qualified sources / 3), with confidence forced to zero when no qualified supply items are observed (not a calibrated probability), and unavailable sources shown greyed out — never silently zero.</p>
      </Card>
      <Card title={`Gold set · ${GOLD_SET.length} author-estimated ideas (not independent validation)`}>
        <p>Run <code className="font-mono">pnpm calibrate</code> to score every idea live and publish Spearman ρ, pairwise ordinal agreement and every miss to <code className="font-mono">docs/CALIBRATION.md</code>.</p>
        <ol className="list-decimal pl-5">
          {GOLD_SET.map((g) => (
            <li key={g.idea}>{g.idea} <span className="text-muted-foreground">— expected {g.expected}</span></li>
          ))}
        </ol>
      </Card>
      <Card title="Receipt trust"><p>Exports include capsule and receipt. SHA-256 detects edits only relative to a known digest. Ed25519 verification authenticates this deployment only when issuerTrusted is true against its configured key. It does not verify that search providers or market claims are correct. Share links re-compute results and are not immutable receipts.</p></Card>
      <Card title="What this is not">
        <p>Not a viability score, not demand validation, not investment or legal novelty advice. Keyword and lexicon matching can still miss ideas described in unusual language — read the evidence links.</p>
      </Card>
    </PageShell>
  )
}
