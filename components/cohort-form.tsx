'use client'

import { useState } from 'react'

type Row = { noveltyRank: number; idea: string; score: number; verdict: string; confidence: number; quadrant: string | null }
type Collision = { a: string; b: string; similarity: number }

export function CohortForm() {
  const [text, setText] = useState('AI code review agent\nAI pull request reviewer for Terraform\nsoil moisture forecasting for smallholder farms\nMCP server for legal contract search')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [collisions, setCollisions] = useState<Collision[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ideas = () => text.split('\n').map((s) => s.trim()).filter(Boolean)

  async function run(format: 'json' | 'csv') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/cohort', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ideas: ideas(), format }) })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Screening failed.')
      if (format === 'csv') {
        const url = URL.createObjectURL(await res.blob())
        const a = document.createElement('a')
        a.href = url
        a.download = 'cohort-screening.csv'
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await res.json()
        setRows(data.rows)
        setCollisions(data.collisions)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Screening failed.')
    } finally {
      setBusy(false)
    }
  }

  const btn = 'min-h-11 rounded-md border border-foreground px-4 font-mono text-xs uppercase tracking-widest disabled:opacity-50'
  return (
    <div className="flex flex-col gap-4">
      <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground" htmlFor="cohort">One applicant idea per line (max 25 on the public demo)</label>
      <textarea id="cohort" value={text} onChange={(e) => setText(e.target.value)} rows={7} className="w-full rounded-md border border-border bg-background p-3 font-mono text-sm" />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => run('json')} className={`${btn} bg-foreground text-background`}>{busy ? 'Screening…' : `Screen ${ideas().length} ideas`}</button>
        <button type="button" disabled={busy} onClick={() => run('csv')} className={btn}>Download CSV</button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {rows && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-3 py-2">Novelty</th><th className="px-3 py-2">Idea</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Verdict</th><th className="px-3 py-2">Quadrant</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.idea}><td className="px-3 py-2 font-mono">#{r.noveltyRank}</td><td className="px-3 py-2">{r.idea}</td><td className="px-3 py-2 font-mono font-bold text-signal">{r.score}</td><td className="px-3 py-2">{r.verdict}</td><td className="px-3 py-2">{r.quadrant ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && (
        <p className="text-sm text-muted-foreground">
          {collisions.length === 0 ? 'No idea-twins detected inside this cohort.' : `Idea-twins inside the cohort: ${collisions.map((c) => `“${c.a}” ↔ “${c.b}” (${Math.round(c.similarity * 100)}%)`).join('; ')}`}
        </p>
      )}
    </div>
  )
}
