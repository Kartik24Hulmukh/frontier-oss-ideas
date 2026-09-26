import type { CrowdingResult } from '@/lib/types'

const QUADRANTS: Array<{ id: CrowdingResult['quadrant']; blurb: string }> = [
  { id: 'Blue Ocean', blurb: 'Low supply · high demand' },
  { id: 'Gold Rush', blurb: 'High supply · high demand' },
  { id: 'Ghost Town', blurb: 'Low supply · low demand' },
  { id: 'Bloodbath', blurb: 'High supply · low demand' },
]

export function QuadrantPanel({ result }: { result: CrowdingResult }) {
  return (
    <section
      aria-label="Supply versus demand battlefield"
      className="border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Battlefield geometry — supply x demand
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-signal">
          {result.quadrant}
        </span>
      </div>

      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-10">
        <div className="grid aspect-square w-full max-w-[280px] grid-cols-2 grid-rows-2 gap-1 border border-border">
          {QUADRANTS.map((q) => (
            <div
              key={q.id}
              className={`flex flex-col items-center justify-center gap-1 p-3 text-center transition-colors ${
                q.id === result.quadrant
                  ? 'bg-signal text-background'
                  : 'bg-muted/60 text-muted-foreground'
              }`}
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest">
                {q.id}
              </span>
              <span className="text-[10px] leading-tight">{q.blurb}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {result.quadrantDetail}
          </p>
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="w-20 text-muted-foreground">supply</span>
              <div className="h-2 flex-1 bg-muted">
                <div className="h-full bg-foreground" style={{ width: `${result.supplyScore}%` }} />
              </div>
              <span className="w-10 text-right text-foreground">{result.supplyScore}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-muted-foreground">demand</span>
              <div className="h-2 flex-1 bg-muted">
                <div className="h-full bg-signal" style={{ width: `${result.demandScore}%` }} />
              </div>
              <span className="w-10 text-right text-foreground">{result.demandScore}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
