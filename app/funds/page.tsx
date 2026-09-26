import type { Metadata } from 'next'
import { CohortForm } from '@/components/cohort-form'
import { Card, PageShell } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Cohort screening for accelerators & funds — Simultaneity Index',
  description: 'Screen up to 25 public or consented idea summaries per demo batch: collision map, novelty ranking, Supply × Demand quadrant and evidence links.',
}

export default function FundsPage() {
  return (
    <PageShell
      eyebrow="For accelerators, funds & university venture programs"
      title="Screen a whole cohort for idea-twins in minutes"
      lede="Paste applicant one-liners. Get a crowding ranking, lexical overlap flags inside the batch, crowding against the open ecosystem, and linked evidence your partners can verify."
    >
      <Card title="Live demo · public API: POST /api/cohort">
        <CohortForm />
      </Card>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card title="Collision map"><p>Text-similarity flags for human review, not proof that two applicants have identical products.</p></Card>
        <Card title="Crowding ranking"><p>Every idea ranked by Simultaneity score with confidence and the Supply × Demand quadrant.</p></Card>
        <Card title="Verifiable brief"><p>CSV plus per-row JSON evidence capsules and receipts (hash-only unless signing is configured), so diligence notes cite evidence, not vibes.</p></Card>
      </div>
      <Card title="Pilot pricing">
        <p><strong>Proposed pilot range: $2,000–$10,000 / year, subject to a scoped agreement.</strong> Today’s demo supports up to 25 ideas, CSV export and JSON evidence. Billing, white-label PDFs, background screening of 200–500 ideas and unlimited batches are not available. API keys never bypass the global safety budget. Do not upload confidential applicant data without informed consent; queries go to external providers. Never post private ideas or credentials in public GitHub issues.</p>
        <p><a className="underline" href="https://github.com/Kartik24Hulmukh/frontier-oss-ideas/issues/new?title=Cohort%20screening%20pilot">Book a pilot →</a></p>
      </Card>
    </PageShell>
  )
}
