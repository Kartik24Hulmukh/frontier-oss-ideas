import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Pricing — Simultaneity Index',
  description: 'Free scans for every builder. Pro watchlists, Team API and Cohort Screening for funds.',
}

const PLANS = [
  { name: 'Free', price: '$0', note: 'forever', items: ['20 scans / 10 min', 'All 10 sources + battlefield', 'JSON capsule + receipt', 'Local watchlist', 'MCP + HTTP API (fair use)'], cta: ['Scan an idea', '/'] },
  { name: 'Pro · planned', price: '$19', note: '/mo · $189/yr', items: ['Usage limits to be confirmed', 'Weekly delta email alerts', 'Compare up to 3 ideas today', 'PDF one-pager export', 'Charter: 40% off for first 500'], cta: ['Join the charter list', 'https://github.com/Kartik24Hulmukh/frontier-oss-ideas/issues/new?title=Pro%20charter%20request'] },
  { name: 'Team / API · planned', price: '$99', note: '/mo', items: ['5,000 API + MCP calls / mo', 'Dedicated API key', 'Webhook alerts', 'Signed Ed25519 receipts'], cta: ['Request a key', 'https://github.com/Kartik24Hulmukh/frontier-oss-ideas/issues/new?title=Team%20API%20key%20request'] },
  { name: 'Cohort pilot', price: '$2k–$10k', note: '/yr', items: ['Up to 25 ideas per demo batch', 'Idea-twin collision map', 'Crowding ranking + CSV today', 'Larger batches: discuss a pilot'], cta: ['Book a pilot', '/funds'] },
]

export default function PricingPage() {
  return (
    <PageShell eyebrow="Pricing" title="Free for builders. Paid for teams who screen many ideas." lede="The free scanner works today. Paid prices are proposals, not purchasable subscriptions; email alerts, billing, PDF and webhooks are not yet available. Do not post private ideas or credentials in public GitHub requests.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <section key={p.name} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{p.name}</h2>
            <p><span className="text-3xl font-semibold">{p.price}</span> <span className="text-sm text-muted-foreground">{p.note}</span></p>
            <ul className="flex flex-1 flex-col gap-1 text-sm">{p.items.map((i) => <li key={i}>· {i}</li>)}</ul>
            <a href={p.cta[1]} className="min-h-11 rounded-md border border-foreground px-4 py-3 text-center font-mono text-xs uppercase tracking-widest hover:bg-foreground hover:text-background">{p.cta[0]}</a>
          </section>
        ))}
      </div>
    </PageShell>
  )
}
