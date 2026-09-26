import type { CrowdingResult, Quadrant } from '@/lib/types'

const CELLS: Array<{ q: Quadrant; pos: string; hint: string }> = [
  { q: 'Blue Ocean', pos: 'col-start-1 row-start-1', hint: 'low supply · high demand' },
  { q: 'Gold Rush', pos: 'col-start-2 row-start-1', hint: 'high supply · high demand' },
  { q: 'Ghost Town', pos: 'col-start-1 row-start-2', hint: 'low supply · low demand' },
  { q: 'Bloodbath', pos: 'col-start-2 row-start-2', hint: 'high supply · low demand' },
]

export function MatrixPanel({ result }: { result: CrowdingResult }) {
  const quad = result.quadrant
  const demand = result.demand
  if (!quad) return null
  const x = Math.min(100, Math.max(0, quad.supply))
  const y = Math.min(100, Math.max(0, quad.demand ?? 0))
  return (
    <section aria-label="Supply by demand battlefield" className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Battlefield · supply × demand</span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          demand {quad.demand ?? '—'}/100 · trend {demand?.trend ?? 'unknown'} · coverage {demand?.coverage ?? 0}%
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2 md:p-8">
        <div className="relative">
          <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-md border border-border bg-border">
            {CELLS.map((c) => (
              <div
                key={c.q}
                className={`${c.pos} flex flex-col justify-between p-3 ${quad.quadrant === c.q ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'}`}
              >
                <span className="font-mono text-xs font-bold uppercase tracking-widest">{c.q}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">{c.hint}</span>
              </div>
            ))}
          </div>
          {quad.demand !== null && (
            <span
              aria-hidden="true"
              className="absolute size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-background bg-signal shadow"
              style={{ left: `${x}%`, bottom: `${y}%` }}
            />
          )}
          <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>supply → {quad.supply}</span>
            <span>↑ demand</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-2xl font-semibold tracking-tight">{quad.quadrant ?? 'Supply-only reading'}</h3>
          <p className="text-base leading-7">{quad.headline}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-mono text-xs uppercase tracking-widest text-signal">What to do · </span>
            {quad.action}
          </p>
          {demand && demand.sources.some((s) => s.status !== 'ok' || s.provenance === 'mirror' || s.notice) && (
            <div role="status" className="rounded border border-border p-3 text-sm leading-6">
              <strong>Demand evidence is incomplete or degraded.</strong> Coverage counts responding adapters, not healthy primary sources.
              <ul>{demand.sources.filter((s) => s.status !== 'ok' || s.provenance === 'mirror' || s.notice).map((s) => (
                <li key={s.source}>{s.label}: {s.notice ?? s.errorMessage ?? (s.provenance === 'mirror' ? 'archive mirror; primary unavailable' : s.status)}</li>
              ))}</ul>
            </div>
          )}
          {demand && (
            <ul className="flex flex-col gap-2 border-t border-border pt-4">
              {demand.breakdown.map((b) => (
                <li key={b.source} className={`text-sm leading-6 ${b.included ? '' : 'opacity-50'}`}>
                  <span className="font-mono text-xs uppercase tracking-widest">{b.label} · {b.included ? b.subScore : 'n/a'}</span>
                  <br />
                  <span className="text-muted-foreground">{b.signal}</span>
                </li>
              ))}
            </ul>
          )}
          {demand && demand.sources.some((s) => s.items.length > 0) && (
            <details className="border-t border-border pt-3">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-muted-foreground">Demand evidence</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {demand.sources.flatMap((s) => s.items.slice(0, 4).map((i) => (
                  <li key={i.url} className="truncate text-sm">
                    <a className="underline decoration-border underline-offset-4 hover:decoration-foreground" href={i.url} target="_blank" rel="noreferrer">{i.title}</a>
                    <span className="text-muted-foreground"> · {i.meta}</span>
                  </li>
                )))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  )
}
