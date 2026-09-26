import type { CrowdingResult } from '@/lib/types'

const BAND_LABELS = ['Open lane', 'Early movers', 'Crowded', 'Saturated'] as const

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

export function ScoreDisplay({ result }: { result: CrowdingResult }) {
  return (
    <section aria-label="Crowding score" className="border border-border bg-card">
      {result.coverage < 50 && <p role="alert" className="border-b border-border p-4 text-sm">Insufficient source coverage. This score is provisional, not evidence of an open market. Re-scan before deciding.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Crowding score
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {'query: '}
          <span className="text-foreground">{result.query}</span>
        </span>
      </div>

      <div className="flex flex-col gap-8 p-6 md:flex-row md:items-center md:gap-12 md:p-10">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-8xl font-bold leading-none tracking-tight text-signal md:text-9xl">
            {result.score}
          </span>
          <span className="font-mono text-2xl text-muted-foreground">/100</span>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-balance">{result.verdict}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {result.verdictDetail}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
            <span>
              confidence:{' '}
              <span className="text-foreground">{result.confidence}%</span>
            </span>
            <span>
              coverage:{' '}
              <span className="text-foreground">{result.coverage}%</span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div
              className="h-2 w-full bg-muted"
              role="progressbar"
              aria-valuenow={result.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Crowding score ${result.score} out of 100`}
            >
              <div
                className="h-full bg-signal transition-all duration-700"
                style={{ width: `${result.score}%` }}
              />
            </div>
            <div className="flex justify-between">
              {BAND_LABELS.map((band) => (
                <span
                  key={band}
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    band === result.verdict
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {band}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <span className="font-mono text-xs text-muted-foreground">
              {'earliest artifact: '}
              <span className="text-foreground">
                {formatDate(result.timeline.earliest)}
              </span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {'latest artifact: '}
              <span className="text-foreground">{formatDate(result.timeline.latest)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {result.breakdown.map((b, i) => (
          <div
            key={b.source}
            className={`flex flex-col gap-2 p-4 ${
              i > 0 ? 'border-t border-border sm:border-t-0 sm:border-l' : ''
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {b.label}
              </span>
              <span className="font-mono text-lg font-bold text-foreground">
                {b.included ? b.subScore : '—'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
              {b.signal}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
