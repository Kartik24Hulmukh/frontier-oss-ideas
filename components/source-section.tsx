import type { DemandSourceResult, SourceResult } from '@/lib/types'

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function SourceSection({ result }: { result: SourceResult | DemandSourceResult }) {
  const mirrored = 'provenance' in result && result.provenance === 'mirror'
  const notice = 'notice' in result ? result.notice : undefined
  return (
    <section aria-label={result.label} className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-foreground">
          {result.label}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {result.status === 'ok'
            ? `${result.totalCount.toLocaleString()} matches`
            : mirrored
              ? 'Blocked - mirror evidence'
              : result.status === 'rate_limited'
                ? 'Rate limited'
                : 'Unavailable'}
        </span>
      </div>

      {result.status !== 'ok' && (
        <div role="status" className="border-b border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            {result.errorMessage ?? 'This source could not be reached.'}
          </p>
          {notice && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {notice}
            </p>
          )}
        </div>
      )}

      {result.items.length === 0 ? (
        result.status === 'ok' ? (
          <p className="p-4 text-sm text-muted-foreground">No matching artifacts found.</p>
        ) : null
      ) : (
        <ul className="divide-y divide-border">
          {result.items.map((item) => {
            const date = formatDate(item.date)
            return (
              <li key={item.url + item.title}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1 p-4 transition-colors hover:bg-muted"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground group-hover:underline">
                      {item.title}
                    </span>
                    {item.isLaunchSignal && (
                      <span className="border border-signal px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-signal">
                        Launch signal
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                      {item.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 font-mono text-[11px] text-muted-foreground">
                    {item.meta && <span>{item.meta}</span>}
                    {date && <span>{date}</span>}
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
