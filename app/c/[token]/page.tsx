import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { notFound } from 'next/navigation'
import { encodeShare as encodeShareSafe, decodeShare, safeHref, shareIntegrityValid, shareTrustLabel, type DecodedShare } from '@/lib/share'
import { loadShare } from '@/lib/shares'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

async function load(token: string): Promise<{ ok: true; share: DecodedShare } | { ok: false; error: string }> {
  if (token.startsWith('si_')) {
    // 1.6.0 write-once alias: re-derive the proof from the stored record so both link kinds share one verified renderer.
    const record = await loadShare(token).catch(() => null)
    if (!record) notFound()
    try {
      const share = decodeShare(encodeShareSafe(record.capsule, record.receipt))
      return shareIntegrityValid(share) ? { ok: true, share } : { ok: false, error: 'Evidence or signature verification failed.' }
    } catch { return { ok: false, error: 'Invalid stored proof.' } }
  }
  try {
    const share = decodeShare(decodeURIComponent(token))
    return shareIntegrityValid(share) ? { ok: true, share } : { ok: false, error: 'Evidence or signature verification failed.' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid proof link.' }
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await load((await params).token)
  if (!loaded.ok) return { title: 'Invalid proof link \u2014 Simultaneity Index', robots: { index: false, follow: false }, referrer: 'no-referrer' }
  const c = loaded.share.capsule
  return {
    title: `Proof: Simultaneity ${c.score} for \u201c${c.query.slice(0, 80)}\u201d \u2014 Simultaneity Index`,
    description: `${shareTrustLabel(loaded.share)}. Snapshot from ${c.searchedAt}. Verdict: ${c.verdict}.`,
    robots: { index: false, follow: false }, referrer: 'no-referrer',
  }
}

export default async function ProofView({ params }: Props) {
  const loaded = await load((await params).token)
  if (!loaded.ok) {
    return (
      <PageShell eyebrow="Proof link \u00b7 rejected" title="This proof link is not valid">
        <p className="text-sm">{loaded.error} Nothing from this link is shown, because it could not be verified.</p>
        <a className="underline font-mono text-xs" href="/">Scan your own idea</a>
      </PageShell>
    )
  }
  const { capsule: c, receipt: r, issuerTrusted } = loaded.share
  const status = { label: shareTrustLabel(loaded.share), cls: issuerTrusted ? 'border-green-600 text-green-700' : 'border-amber-600 text-amber-700' }
  return (
    <PageShell eyebrow="Proof link \u00b7 frozen snapshot" title={`Simultaneity ${c.score}: \u201c${c.query}\u201d`}>
      <div className={`rounded-lg border-2 p-4 font-mono text-xs uppercase tracking-widest ${status.cls}`} data-testid="proof-status">{status.label}</div>
      <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div><dt className="font-mono text-xs text-muted-foreground">Score</dt><dd className="text-2xl">{c.score}</dd></div>
        <div><dt className="font-mono text-xs text-muted-foreground">Verdict</dt><dd>{c.verdict}</dd></div>
        <div><dt className="font-mono text-xs text-muted-foreground">Demand</dt><dd>{c.demandScore ?? '\u2014'}</dd></div>
        <div><dt className="font-mono text-xs text-muted-foreground">Quadrant</dt><dd>{c.quadrant ?? '\u2014'}</dd></div>
      </dl>
      {c.sourceSummary && c.sourceSummary.length > 0 && (
        <ul className="font-mono text-xs text-muted-foreground">
          {c.sourceSummary.map((s) => <li key={s.source}>{s.source}: {s.status} \u00b7 {s.totalCount} results</li>)}
        </ul>
      )}
      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Evidence at scan time</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {c.evidenceLinks.slice(0, 20).map((e, i) => {
            const href = safeHref(e.url)
            return <li key={i}><span className="font-mono text-xs text-muted-foreground">{e.source}</span> {href ? <a className="underline" href={href} rel="nofollow noopener noreferrer" target="_blank">{e.title}</a> : e.title}</li>
          })}
        </ul>
      </section>
      <p className="font-mono text-xs leading-5 text-muted-foreground">
        Scanned {new Date(c.searchedAt).toUTCString()} \u00b7 {r.algorithm} \u00b7 digest {r.digest.slice(0, 16)}\u2026 \u00b7 content-addressed snapshot; the self-contained URL contains the evidence \u00b7{' '}
        <a className="underline" href={`/s/${encodeURIComponent(c.query)}`}>Re-scan live now</a> \u00b7{' '}
        <a className="underline" href="/">Scan your own idea</a>
      </p>
      <p className="text-xs text-muted-foreground">{c.disclaimer}</p>
    </PageShell>
  )
}
