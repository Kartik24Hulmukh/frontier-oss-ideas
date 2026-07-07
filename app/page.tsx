'use client'

import useSWRMutation from 'swr/mutation'
import { SearchForm } from '@/components/search-form'
import { ScoreDisplay } from '@/components/score-display'
import { SourceSection } from '@/components/source-section'
import type { CrowdingResult } from '@/lib/types'

async function runSearch(
  url: string,
  { arg }: { arg: string },
): Promise<CrowdingResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: arg }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? 'Search failed. Please try again.')
  }
  return res.json()
}

const SOURCE_NAMES = ['GitHub', 'Hacker News', 'arXiv', 'npm']

export default function Home() {
  const { trigger, data, error, isMutating } = useSWRMutation(
    '/api/search',
    runSearch,
  )

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <span className="font-mono text-sm font-bold uppercase tracking-widest">
            Simultaneity Index
          </span>
          <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-full bg-signal"
            />
            System: Online
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 md:px-6 md:py-16">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs uppercase tracking-widest text-signal">
              {'Live crowding analysis · 4 public sources'}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-balance md:text-6xl">
              How many teams are already building your idea?
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
              {
                'Type an idea. We scan GitHub, Hacker News, arXiv, and npm in real time and score how crowded the lane is — before you spend a weekend building it.'
              }
            </p>
          </div>
          <SearchForm onSearch={(q) => trigger(q)} isLoading={isMutating} />
        </div>

        {isMutating && (
          <div
            className="border border-border bg-card"
            role="status"
            aria-live="polite"
          >
            <div className="border-b border-border px-4 py-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Scan in progress
              </span>
            </div>
            <ul className="divide-y divide-border">
              {SOURCE_NAMES.map((name, i) => (
                <li
                  key={name}
                  className="flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block size-2 animate-pulse rounded-full bg-signal"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                  {`Querying ${name}…`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && !isMutating && (
          <div
            className="border border-destructive/40 bg-card p-4"
            role="alert"
          >
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Search failed.'}
            </p>
          </div>
        )}

        {data && !isMutating && (
          <div className="flex flex-col gap-6">
            <ScoreDisplay result={data} />
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Evidence
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {data.sources.map((source) => (
                <SourceSection key={source.source} result={source} />
              ))}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {'Heuristic score from live public data · scanned '}
              {new Date(data.searchedAt).toLocaleString()}
              {' · not investment advice'}
            </p>
          </div>
        )}

        {!data && !isMutating && !error && (
          <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
            {[
              {
                stat: '01',
                title: 'Scan',
                body: 'Four public sources queried live: repos, launches, papers, packages.',
              },
              {
                stat: '02',
                title: 'Score',
                body: 'Weighted heuristics turn raw counts into a 0-100 crowding score.',
              },
              {
                stat: '03',
                title: 'Decide',
                body: 'Open lane, early movers, crowded, or saturated - with the evidence to back it.',
              },
            ].map((item) => (
              <div key={item.stat} className="flex flex-col gap-2 bg-card p-6">
                <span className="font-mono text-xs text-signal">
                  {item.stat}
                </span>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-4 md:px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {'Simultaneity Index · prototype · stateless demo'}
          </p>
        </div>
      </footer>
    </div>
  )
}
