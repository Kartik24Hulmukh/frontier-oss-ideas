import type { ReactNode } from 'react'

export function PageShell({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <a href="/" className="font-mono text-sm font-bold uppercase tracking-[0.18em]">Simultaneity Index</a>
          <nav className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <a href="/pulse" className="hover:text-foreground">Pulse</a>
            <a href="/funds" className="hover:text-foreground">For funds</a>
            <a href="/agents" className="hover:text-foreground">MCP</a>
            <a href="/methodology" className="hover:text-foreground">Methodology</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/pricing" className="hover:text-foreground">Pricing</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-12 md:px-8 md:py-16">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">{eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-balance md:text-5xl">{title}</h1>
          {lede && <p className="text-base leading-7 text-muted-foreground md:text-lg">{lede}</p>}
        </div>
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-6 font-mono text-xs text-muted-foreground md:px-8">
          Heuristic public-data scores · MIT licensed · not investment or legal advice ·{' '}
          <a className="underline" href="https://github.com/Kartik24Hulmukh/frontier-oss-ideas">source</a>
        </div>
      </footer>
    </div>
  )
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-6">{children}</div>
    </section>
  )
}
