import type { Wedge } from '@/lib/types'

export function WedgePanel({ wedges }: { wedges: Wedge[] }) {
  if (!wedges.length) return null
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
    </section>
  )
}
