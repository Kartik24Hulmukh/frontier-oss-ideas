'use client'

import { useEffect, useRef, useState } from 'react'
import { LatestRequest } from '@/lib/core/latest-request'
import { SearchForm } from '@/components/search-form'
import { ScoreDisplay } from '@/components/score-display'
import { SourceSection } from '@/components/source-section'
import { WedgePanel } from '@/components/wedge-panel'
import { MatrixPanel } from '@/components/matrix-panel'
import { WatchButton, Watchlist, recordScan } from '@/components/watchlist'
import { opportunityBrief } from '@/lib/brief'
import type { CrowdingResult } from '@/lib/types'
import type { EvidenceRef } from '@/lib/llm/analyst'

const SOURCE_NAMES = [
  'GitHub',
  'Hacker News',
  'arXiv',
  'OpenAlex',
  'npm',
  'PyPI',
  'crates.io',
  'Hugging Face',
  'Reddit (demand)',
  'Stack Overflow (demand)',
  'Ask HN (demand)',
]

interface SnapshotMemo {
  snapshotId: string
  text: string
  citations: EvidenceRef[]
  invalidCitations: number
  model: string
  failovers: number
}

/** Reject a separately acquired snapshot or an unbound/unsafe citation map. */
function memoForSnapshot(payload: unknown, snapshot: CrowdingResult): SnapshotMemo | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (!snapshot.receipt || p.snapshotId !== snapshot.receipt.digest || p.ok !== true || typeof p.memo !== 'string' || !p.memo.trim() || !Array.isArray(p.citations)) return null
  const bound = [...snapshot.capsule.evidenceLinks, ...(snapshot.capsule.demandEvidenceLinks ?? [])]
  const citations: EvidenceRef[] = []
  const ids = new Set<string>()
  for (const value of p.citations) {
    if (!value || typeof value !== 'object') return null
    const ref = value as EvidenceRef
    if (typeof ref.id !== 'string' || !/^E[1-9]\d*$/.test(ref.id) || ids.has(ref.id)) return null
    const link = bound.find(link => link.url === ref.url && link.source === ref.source)
    if (!link) return null
    try {
      const url = new URL(link.url)
      if (url.protocol !== 'https:' || url.username || url.password) return null
    } catch { return null }
    ids.add(ref.id)
    // Display titles come from the active capsule, never caller/model link text.
    citations.push({ id: ref.id, source: link.source, title: link.title, url: link.url })
  }
  for (const match of p.memo.matchAll(/\[(E\d+)\]/g)) if (!ids.has(match[1])) return null
  const route = p.route as { model?: unknown; attempts?: unknown[] } | undefined
  return { snapshotId: snapshot.receipt.digest, text: p.memo, citations,
    invalidCitations: typeof p.invalidCitations === 'number' && Number.isFinite(p.invalidCitations) ? Math.max(0, p.invalidCitations) : 0,
    model: typeof route?.model === 'string' ? route.model : 'unknown',
    failovers: Array.isArray(route?.attempts) ? Math.max(0, route.attempts.length - 1) : 0 }
}

function MemoText({ memo }: { memo: SnapshotMemo }) {
  const refs = new Map(memo.citations.map(ref => [ref.id, ref]))
  return <div className="whitespace-pre-wrap font-sans text-sm leading-6">{memo.text.split(/(\[E\d+\])/g).map((part, index) => {
    const ref = /^\[E\d+\]$/.test(part) ? refs.get(part.slice(1, -1)) : undefined
    return ref ? <a key={index} href={ref.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" aria-label={`${part} ${ref.source}: ${ref.title}`}>{part}</a> : part
  })}</div>
}

export default function Home() {
  const searchRequest = useRef(new LatestRequest())
  const memoRequest = useRef(new LatestRequest())
  const proofRequest = useRef(new LatestRequest())
  const activeSnapshot = useRef<CrowdingResult | null>(null)
  const [data, setData] = useState<CrowdingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [memo, setMemo] = useState<SnapshotMemo | null>(null)
  const [memoState, setMemoState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [memoError, setMemoError] = useState<string | null>(null)

  async function runSearch(query: string) {
    const request = searchRequest.current.begin()
    memoRequest.current.cancel()
    proofRequest.current.cancel()
    activeSnapshot.current = null
    setData(null)
    setProofState('idle')
    setMemoError(null)
    setShared(false)
    setIsLoading(true)
    setError(null)
    setCopied(false)
    setMemo(null)
    setMemoState('idle')

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: request.signal,
      })
      const payload = await response.json().catch(() => null)
      if (!request.isCurrent()) return
      if (!request.canCommit()) throw new Error('Request timed out. Please try again.')
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Search failed. Please try again.')
      }
      activeSnapshot.current = payload as CrowdingResult
      setData(payload as CrowdingResult)
      try { recordScan(payload as CrowdingResult) } catch { /* A storage failure must not discard a successful scan. */ }
      // Keep private idea text out of browser history unless the user explicitly shares.
    } catch (cause) {
      if (request.isCurrent()) setError(request.signal.aborted ? 'Scan timed out. Please try again.' : cause instanceof Error ? cause.message : 'Search failed.')
    } finally {
      if (request.isCurrent()) setIsLoading(false)
      request.finish()
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) void runSearch(q)
    return () => { searchRequest.current.cancel(); memoRequest.current.cancel(); proofRequest.current.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [shared, setShared] = useState(false)
  async function shareScan() {
    if (!data) return
    if (!window.confirm('Sharing puts your idea in a public URL and re-runs the scan. Continue?')) return
    const url = `${window.location.origin}/s/${encodeURIComponent(data.query)}`
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      window.setTimeout(() => setShared(false), 1800)
    } catch {
      window.prompt('Copy this share link', url)
    }
  }

  const [proofState, setProofState] = useState<'idle' | 'loading' | 'copied'>('idle')
  async function copyProofLink() {
    if (!data) return
    if (!window.confirm('A proof link embeds this exact scan (including your idea) in a public URL. It is frozen and tamper-evident. Continue?')) return
    const request = proofRequest.current.begin()
    setProofState('loading')
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capsule: data.capsule, receipt: data.receipt }), signal: request.signal })
      const payload = await response.json().catch(() => null)
      if (!request.isCurrent()) return
      if (!request.canCommit()) throw new Error('Request timed out. Please try again.')
      if (!response.ok || !payload?.path) throw new Error(payload?.error ?? 'Could not create a proof link.')
      const url = `${window.location.origin}${payload.path}`
      try { await navigator.clipboard.writeText(url) } catch { if (request.canCommit()) window.prompt('Copy this proof link', url) }
      if (!request.canCommit()) return
      setProofState('copied')
      window.setTimeout(() => { if (request.isCurrent()) setProofState('idle') }, 1800)
    } catch (cause) {
      if (request.isCurrent()) {
        setError(request.signal.aborted ? 'Proof request timed out. Please try again.' : cause instanceof Error ? cause.message : 'Could not create a proof link.')
        setProofState('idle')
      }
    } finally { request.finish() }
  }

  async function copyCapsule() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(JSON.stringify({ capsule: data.capsule, receipt: data.receipt }, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy the evidence capsule in this browser.')
    }
  }

  async function requestMemo() {
    if (!data) return
    const snapshot = data
    const snapshotId = snapshot.receipt?.digest
    if (!snapshotId) {
      setMemoError('This scan has no snapshot receipt. The deterministic decision brief still works.')
      setMemoState('error')
      return
    }
    const request = memoRequest.current.begin()
    setMemo(null)
    setMemoState('loading')
    setMemoError(null)
    try {
      const response = await fetch('/api/analyst', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshotId, receipt: snapshot.receipt, profile: 'fast' }), signal: request.signal })
      const payload = await response.json().catch(() => null)
      if (!request.isCurrent()) return
      if (!request.canCommit()) throw new Error('Request timed out. Please try again.')
      if (!response.ok || !payload?.memo) throw new Error(payload?.error ?? (payload?.route?.error === 'budget_exceeded' ? 'AI budget reached for now. Use the decision brief.' : 'AI analyst unavailable. The deterministic decision brief still works.'))
      if (activeSnapshot.current?.receipt?.digest !== snapshotId) return
      const mapped = memoForSnapshot(payload, snapshot)
      if (!mapped) throw new Error('Analyst snapshot or citation mismatch; memo discarded. The displayed scan and deterministic decision brief are unchanged.')
      setMemo(mapped)
      setMemoState('idle')
    } catch (cause) {
      if (request.isCurrent()) {
        setMemoError(request.signal.aborted ? 'AI analyst timed out. The deterministic decision brief still works.' : cause instanceof Error ? cause.message : 'AI analyst unavailable.')
        setMemoState('error')
      }
    } finally { request.finish() }
  }

  function downloadBrief() {
    if (!data) return
    const url = URL.createObjectURL(new Blob([opportunityBrief(data)], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'simultaneity-opportunity-brief.md'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function downloadCapsule() {
    if (!data) return
    const blob = new Blob([JSON.stringify({ capsule: data.capsule, receipt: data.receipt }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${data.normalizedQuery.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scan'}-evidence.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <span className="font-mono text-sm font-bold uppercase tracking-[0.18em]">
            Simultaneity Index
          </span>
          <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-signal" />
            8 supply + 3 demand adapters
          </span>
          <nav className="hidden gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:flex">
            <a href="/pulse" className="hover:text-foreground">Pulse</a>
            <a href="/funds" className="hover:text-foreground">For funds</a>
            <a href="/agents" className="hover:text-foreground">MCP</a>
            <a href="/methodology" className="hover:text-foreground">Methodology</a>
            <a href="/pricing" className="hover:text-foreground">Pricing</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-12 md:px-8 md:py-16">
        <section className="flex flex-col gap-7" aria-labelledby="page-title">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
              Crowding intelligence · evidence, not vibes
            </p>
            <h1
              id="page-title"
              className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-balance md:text-6xl"
            >
              How crowded is the field around your idea?
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Scan code, launches, papers, packages, models, and datasets in real time.
              See the crowding score, confidence, evidence, and open wedge before you build.
            </p>
          </div>
          <SearchForm onSearch={runSearch} isLoading={isLoading} />
          <p className="text-xs text-muted-foreground">Queries go to external search providers. Do not submit confidential information. <a className="underline" href="/privacy">Privacy & data handling</a></p>
          <Watchlist onRescan={runSearch} />
        </section>

        {isLoading && (
          <section className="overflow-hidden rounded-lg border border-border bg-card" role="status" aria-live="polite">
            <div className="border-b border-border px-5 py-3">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Scan in progress
              </span>
            </div>
            <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
              {SOURCE_NAMES.map((name, index) => (
                <li
                  key={name}
                  className="flex min-h-12 items-center gap-3 border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:border-b sm:odd:border-r"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block size-2 animate-pulse rounded-full bg-signal"
                    style={{ animationDelay: `${index * 90}ms` }}
                  />
                  Querying {name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/40 bg-card p-5" role="alert">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {data && !isLoading && (
          <div className="flex flex-col gap-7">
            <ScoreDisplay result={data} />
            <MatrixPanel result={data} />
            {(data.expansions?.length ?? 0) > 1 || (data.duplicatesCollapsed ?? 0) > 0 ? (
              <p className="font-mono text-xs leading-5 text-muted-foreground">
                Also searched: {data.expansions?.slice(1).join(', ') || '—'} · {data.duplicatesCollapsed ?? 0} cross-source duplicate(s) collapsed
                {data.receipt ? ` · receipt ${data.receipt.digest.slice(0, 12)}… (${data.receipt.algorithm})` : ''}
              </p>
            ) : null}
            <WedgePanel wedges={data.wedges} subLanes={data.subLanes} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Verifiable evidence
              </h2>
              <div className="flex flex-wrap gap-2">
                <WatchButton result={data} />
                <button type="button" onClick={downloadBrief} className="min-h-11 rounded-md border border-border bg-card px-4 font-mono text-xs uppercase tracking-widest hover:border-foreground">Download decision brief</button>
                <button type="button" onClick={requestMemo} disabled={memoState === 'loading'} className="min-h-11 rounded-md border border-signal bg-card px-4 font-mono text-xs uppercase tracking-widest hover:border-foreground disabled:opacity-60">{memoState === 'loading' ? 'Analyst thinking…' : 'AI analyst memo'}</button>
                {(memo || memoError) && (
                  <div className="basis-full rounded-lg border border-border bg-card p-4" role="region" aria-label="AI analyst memo" aria-live="polite">
                    {memoError && <p className="text-sm text-muted-foreground">{memoError}</p>}
                    {memo && memo.snapshotId === data.receipt?.digest && (<>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AI narrative · {memo.model}{memo.failovers ? ` · ${memo.failovers} failover(s)` : ''} · snapshot {memo.snapshotId.slice(0, 12)}… · {data.searchedAt}</p>
                      <p className="mb-2 text-xs text-muted-foreground">AI interpretation is not signed by the scan receipt. Links map to this capsule; citation existence does not prove a claim. Discussion activity is not buyer demand.</p>
                      {memo.invalidCitations > 0 && <p className="mb-2 text-xs text-muted-foreground">{memo.invalidCitations} invalid citation(s) removed as [uncited]. Verify all claims before acting.</p>}
                      {memo.citations.length === 0 && <p className="mb-2 text-xs text-muted-foreground">No evidence cited by the model. This narrative is ungrounded; use the deterministic decision brief.</p>}
                      <MemoText memo={memo} />
                      {memo.citations.length > 0 && <ul className="mt-3 space-y-1 text-xs" aria-label="Analyst evidence links">{memo.citations.map(ref => <li key={ref.id}><a href={ref.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">[{ref.id}] {ref.source}: {ref.title}</a></li>)}</ul>}
                    </>)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={shareScan}
                  className="min-h-11 rounded-md border border-border bg-card px-4 font-mono text-xs uppercase tracking-widest transition-colors hover:border-foreground"
                >
                  {shared ? 'Link copied' : 'Share scan'}
                </button>
                <button
                  type="button"
                  onClick={copyProofLink}
                  disabled={proofState === 'loading'}
                  className="min-h-11 rounded-md border border-border bg-card px-4 font-mono text-xs uppercase tracking-widest transition-colors hover:border-foreground"
                >
                  {proofState === 'copied' ? 'Proof link copied' : proofState === 'loading' ? 'Minting…' : 'Proof link'}
                </button>
                <button
                  type="button"
                  onClick={copyCapsule}
                  className="min-h-11 rounded-md border border-border bg-card px-4 font-mono text-xs uppercase tracking-widest transition-colors hover:border-foreground"
                >
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
                <button
                  type="button"
                  onClick={downloadCapsule}
                  className="min-h-11 rounded-md border border-foreground bg-foreground px-4 font-mono text-xs uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  Download evidence
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {data.sources.map((source) => (
                <SourceSection key={source.source} result={source} />
              ))}
            </div>

            <details className="rounded-lg border border-border bg-card p-5">
              <summary className="min-h-11 cursor-pointer font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Evidence capsule preview
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-5 text-muted-foreground">
                {JSON.stringify({ capsule: data.capsule, receipt: data.receipt }, null, 2)}
              </pre>
            </details>
            <p className="font-mono text-xs leading-5 text-muted-foreground">
              Heuristic public-data score · {new Date(data.searchedAt).toLocaleString()} · not investment or legal advice
            </p>
          </div>
        )}

        {!data && !isLoading && !error && (
          <section className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 sm:gap-px">
            {[
              ['01', 'Scan', 'Eight public supply ecosystems: repos, launches, papers, packages, models, and datasets.'],
              ['02', 'Score', 'Transparent heuristics with explicit source coverage and confidence.'],
              ['03', 'Wedge', 'See whether to enter, specialize, move up the stack, or kill the idea.'],
            ].map(([number, title, body]) => (
              <article key={number} className="flex flex-col gap-3 bg-card p-6">
                <span className="font-mono text-xs text-signal">{number}</span>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </section>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-5 py-6 font-mono text-xs uppercase tracking-widest text-muted-foreground md:px-8">
          <span>Simultaneity Index · Alpha</span>
          <span>Crowding intelligence for builders & agents</span>
        </div>
      </footer>
    </div>
  )
}
