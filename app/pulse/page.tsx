import type { Metadata } from 'next'
import { Card, PageShell } from '@/components/page-shell'
import { mapLimit } from '@/lib/cohort'
import { TTLCache } from '@/lib/core/cache'
import { scanIdea } from '@/lib/scan'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const metadata: Metadata = {
  title: 'Simultaneity Pulse — the most crowded builder lanes right now',
  description: 'A live comparison of public-artifact crowding signals for curated fall-2026 ideas; not a count of unique teams.',
}

/** Curated fall-2026 lanes. Override with PULSE_LANES="idea one|idea two". */
const DEFAULT_LANES = [
  'AI code review agent',
  'MCP server marketplace',
  'AI meeting notes',
  'LLM observability',
  'browser automation agent',
  'AI SDR outbound',
  'voice AI receptionist',
  'agent memory layer',
  'AI compliance audit',
  'local-first notes app',
]

const pulseCache = new TTLCache<Array<{ idea: string; score: number; verdict: string; confidence: number }>>(2, 6 * 60 * 60 * 1000)

async function loadPulse() {
  const hit = pulseCache.get('pulse')
  if (hit) return hit
  const lanes = (process.env.PULSE_LANES?.split('|').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_LANES).slice(0, 12)
  const rows = await mapLimit(lanes, 2, async (idea) => {
    const r = await scanIdea(idea, { demand: false, expand: false })
    return { idea, score: r.score, verdict: r.verdict, confidence: r.confidence }
  })
  rows.sort((a, b) => b.score - a.score)
  if (rows.some((r) => r.confidence >= 50)) pulseCache.set('pulse', rows)
  return rows
}

export default async function PulsePage() {
  const rows = await loadPulse()
  return (
    <PageShell
      eyebrow="Simultaneity Pulse · refreshed every 6 hours"
      title="The most simultaneous ideas right now"
      lede="Every lane scored live on the same public methodology. Cite it as “Simultaneity 73”. Watch a lane from the home page to track its delta."
    >
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Lane</th>
              <th className="px-4 py-3">Simultaneity</th>
              <th className="hidden px-4 py-3 sm:table-cell">Verdict</th>
              <th className="hidden px-4 py-3 sm:table-cell">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={r.idea}>
                <td className="px-4 py-3 font-mono">{i + 1}</td>
                <td className="px-4 py-3"><a className="underline decoration-border underline-offset-4 hover:decoration-foreground" href={`/s/${encodeURIComponent(r.idea)}`}>{r.idea}</a></td>
                <td className="px-4 py-3 font-mono text-lg font-bold text-signal">{r.score}</td>
                <td className="hidden px-4 py-3 sm:table-cell">{r.verdict}</td>
                <td className="hidden px-4 py-3 font-mono sm:table-cell">{r.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Card title="How to cite">
        <p>“AI code review agent scores Simultaneity 81 (Saturated) — simultaneityindex, {new Date().toISOString().slice(0, 10)}”. Every scan carries a SHA-256 receipt; signed Ed25519 receipts are issued when the deployment has a key configured.</p>
      </Card>
    </PageShell>
  )
}
