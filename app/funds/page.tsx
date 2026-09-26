import type { Metadata } from 'next'
import { CohortForm } from '@/components/cohort-form'
import { Card, PageShell } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Cohort screening for accelerators & funds — Simultaneity Index',
  description: 'Screen 200–500 applicant ideas per batch: collision map, novelty ranking, Supply × Demand quadrant and evidence links.',
}

export default function FundsPage() {
  return (
    <PageShell
      eyebrow="For accelerators, funds & university venture programs"
      title="Screen a whole cohort for idea-twins in minutes"
      lede="Paste applicant one-liners. Get a novelty ranking, idea-twin collisions inside the batch, crowding against the open ecosystem, and linked evidence your partners can verify."
    >
      <Card title="Live demo · public API: POST /api/cohort">
        <CohortForm />
      </Card>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card title="Collision map"><p>Pairs of applicants pitching the same thing, before your partners notice in the IC meeting.</p></Card>
        <Card title="Novelty ranking"><p>Every idea ranked by Simultaneity score with confidence and the Supply × Demand quadrant.</p></Card>
        <Card title="Verifiable brief"><p>CSV + JSON capsules with SHA-256 / Ed25519 receipts, so diligence notes cite evidence, not vibes.</p></Card>
      </div>
      <Card title="Pilot pricing">
        <p><strong>Cohort Screening — $2,000–$10,000 / year.</strong> Unlimited batches, white-label PDF/CSV brief, API key (COHORT_API_KEYS) with no public rate limit, founder-call onboarding. First five pilots get 50% off year one in exchange for a named case study.</p>
        <p><a className="underline" href="https://github.com/Kartik24Hulmukh/frontier-oss-ideas/issues/new?title=Cohort%20screening%20pilot">Book a pilot →</a></p>
      </Card>
    </PageShell>
  )
}
