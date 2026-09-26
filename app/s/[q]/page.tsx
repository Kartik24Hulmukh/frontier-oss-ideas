import type { Metadata } from 'next'
import { MatrixPanel } from '@/components/matrix-panel'
import { PageShell } from '@/components/page-shell'
import { ScoreDisplay } from '@/components/score-display'
import { WedgePanel } from '@/components/wedge-panel'
import { scanIdea } from '@/lib/scan'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Props = { params: Promise<{ q: string }> }

function decode(q: string) {
  try {
    return decodeURIComponent(q).slice(0, 120)
  } catch {
    return q.slice(0, 120)
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const idea = decode((await params).q)
  return {
    title: `How crowded is \u201c${idea}\u201d? — Simultaneity Index`,
    description: `Live crowding + demand scan for \u201c${idea}\u201d across GitHub, HN, arXiv, OpenAlex, npm, PyPI, Hugging Face, Reddit and Stack Overflow.`,
    robots: { index: false },
  }
}

export default async function SharedScan({ params }: Props) {
  const idea = decode((await params).q)
  const result = await scanIdea(idea)
  return (
    <PageShell eyebrow="Shared scan · re-computed live" title={`Simultaneity ${result.score}: \u201c${result.query}\u201d`}>
      <ScoreDisplay result={result} />
      <MatrixPanel result={result} />
      <WedgePanel wedges={result.wedges} />
      <p className="font-mono text-xs text-muted-foreground">
        Scanned {new Date(result.searchedAt).toUTCString()} · receipt {result.receipt?.digest.slice(0, 16)}… ·{' '}
        <a className="underline" href={`/?q=${encodeURIComponent(result.query)}`}>Open full evidence</a> ·{' '}
        <a className="underline" href="/">Scan your own idea</a>
      </p>
    </PageShell>
  )
}
