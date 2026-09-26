import { ImageResponse } from 'next/og'
import { scanIdea } from '@/lib/scan'

export const runtime = 'nodejs'
export const alt = 'Simultaneity Index crowding scan'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TONE: Record<string, string> = {
  'Open lane': '#2e7d32',
  'Early movers': '#7cb342',
  Crowded: '#f9a825',
  Saturated: '#c62828',
}

export default async function Image({ params }: { params: Promise<{ q: string }> }) {
  const raw = (await params).q
  let idea = raw
  try {
    idea = decodeURIComponent(raw)
  } catch {}
  idea = idea.slice(0, 90)
  let score = '?'
  let verdict = 'Live crowding scan'
  let quadrant = ''
  let confidence = ''
  try {
    const r = await Promise.race([
      scanIdea(idea),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ])
    score = String(r.score)
    verdict = r.verdict
    quadrant = r.quadrant?.quadrant ?? ''
    confidence = `confidence ${Math.round(r.confidence)}%`
  } catch {}
  const tone = TONE[verdict] ?? '#555555'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: '#f9f8f7', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#666' }}>Simultaneity Index</div>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>{`How crowded is \u201c${idea}\u201d?`}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
          <div style={{ display: 'flex', fontSize: 160, fontWeight: 800, color: tone, lineHeight: 1 }}>{score}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
            <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: tone }}>{verdict}</div>
            <div style={{ display: 'flex', fontSize: 30, color: '#444' }}>{[quadrant, confidence].filter(Boolean).join(' \u00b7 ') || 'GitHub \u00b7 HN \u00b7 arXiv \u00b7 npm \u00b7 PyPI \u00b7 HF'}</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
