'use client'

import { useEffect, useState } from 'react'
import type { CrowdingResult } from '@/lib/types'

/**
 * Retention surface v1: account-free watchlist + scan history in localStorage.
 * Each re-scan records a new point, so users see *deltas* ("34 → 61") — the
 * reason to come back. Server-side email alerts can sync from the same shape.
 */
export interface WatchPoint {
  score: number
  demand: number | null
  quadrant: string | null
  at: string
}
export interface WatchEntry {
  query: string
  points: WatchPoint[]
}

const KEY = 'simultaneity.watchlist.v1'

export function loadWatchlist(): WatchEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as WatchEntry[]
  } catch {
    return []
  }
}

function save(list: WatchEntry[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
  window.dispatchEvent(new Event('simultaneity-watchlist'))
}

export function recordScan(result: CrowdingResult, addIfMissing = false): void {
  const list = loadWatchlist()
  const q = result.normalizedQuery
  const point: WatchPoint = { score: result.score, demand: result.demand?.score ?? null, quadrant: result.quadrant?.quadrant ?? null, at: result.searchedAt }
  const existing = list.find((e) => e.query.toLowerCase() === q)
  if (existing) {
    const last = existing.points[existing.points.length - 1]
    if (!last || last.at !== point.at) existing.points = [...existing.points, point].slice(-26)
    save(list)
  } else if (addIfMissing) {
    save([{ query: result.query, points: [point] }, ...list])
  }
}

export function isWatched(query: string): boolean {
  return loadWatchlist().some((e) => e.query.toLowerCase() === query.toLowerCase())
}

export function removeWatch(query: string) {
  save(loadWatchlist().filter((e) => e.query.toLowerCase() !== query.toLowerCase()))
}

export function WatchButton({ result }: { result: CrowdingResult }) {
  const [watched, setWatched] = useState(false)
  useEffect(() => setWatched(isWatched(result.normalizedQuery)), [result])
  return (
    <button
      type="button"
      onClick={() => {
        if (watched) removeWatch(result.normalizedQuery)
        else recordScan(result, true)
        setWatched(!watched)
      }}
      className="min-h-11 rounded-md border border-border bg-card px-4 font-mono text-xs uppercase tracking-widest transition-colors hover:border-foreground"
    >
      {watched ? '★ Watching lane' : '☆ Watch this lane'}
    </button>
  )
}

export function Watchlist({ onRescan }: { onRescan: (query: string) => void }) {
  const [list, setList] = useState<WatchEntry[]>([])
  useEffect(() => {
    const sync = () => setList(loadWatchlist())
    sync()
    window.addEventListener('simultaneity-watchlist', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('simultaneity-watchlist', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  if (list.length === 0) return null
  return (
    <section aria-label="Watchlist" className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Your watched lanes · re-scan to see the delta
      </div>
      <ul className="divide-y divide-border">
        {list.map((e) => {
          const first = e.points[0]
          const last = e.points[e.points.length - 1]
          const delta = last && first ? last.score - first.score : 0
          return (
            <li key={e.query} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{e.query}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {first?.score ?? '—'} → {last?.score ?? '—'} ({delta >= 0 ? '+' : ''}{delta}) · {last?.quadrant ?? 'supply-only'} · {e.points.length} scan(s) · last {last ? new Date(last.at).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onRescan(e.query)} className="min-h-9 rounded-md border border-border px-3 font-mono text-xs uppercase tracking-widest hover:border-foreground">Re-scan</button>
                <button type="button" onClick={() => removeWatch(e.query)} className="min-h-9 rounded-md px-3 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground" aria-label={`Stop watching ${e.query}`}>Remove</button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
