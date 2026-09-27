import type { SubLane, Wedge } from '@/lib/types'

export function WedgePanel({ wedges, subLanes = [] }: { wedges: Wedge[]; subLanes?: SubLane[] }) {
  if (!wedges.length && !subLanes.length) return null
  return (
    <section aria-label="Open wedges" className="border border-border bg-card">
      <div className="border-b border-border px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Open wedges
        </span>
      </div>
      <ul className="divide-y divide-border">
        {wedges.map((w) => (
          <li key={w.title} className="flex flex-col gap-1 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold">{w.title}</h3>
              <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {w.priority}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {w.rationale}
            </p>
          </li>
        ))}
      </ul>
      {subLanes.length > 0 && (
        <div className="border-t border-border">
          <div className="border-b border-border px-4 py-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Least-claimed sub-lanes (estimated from this scan&apos;s evidence)
            </span>
          </div>
          <ol className="divide-y divide-border">
            {subLanes.map((l) => (
              <li key={l.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold">{l.label}</h3>
                  <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    est. {l.estimatedScore}/100 · {l.confidence}
                  </span>
                  {l.buildHere && (
                    <span className="border border-foreground px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                      ✓ Build here
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{l.recommendation}</p>
                {l.examples.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Already claiming it:{' '}
                    {l.examples.map((e, i) => (
                      <span key={e.url}>
                        {i > 0 && ', '}
                        <a className="underline" href={e.url} rel="noopener noreferrer nofollow" target="_blank">{e.title}</a>
                      </span>
                    ))}
                  </p>
                )}
                <a className="font-mono text-xs underline" href={`/?q=${encodeURIComponent(l.verifyQuery)}`}>
                  Verify with a live scan: “{l.verifyQuery}” →
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
