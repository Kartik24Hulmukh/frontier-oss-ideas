import { ImageResponse } from 'next/og'
import { encodeShare as encodeShareSafe, decodeShare, shareIntegrityValid, shareTrustLabel } from '@/lib/share'
import { loadShare } from '@/lib/shares'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'Simultaneity Index frozen proof'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TONE: Record<string, string> = {
  'Open lane': '#2e7d32',
  'Early movers': '#7cb342',
  Crowded: '#f9a825',
  Saturated: '#c62828',
}

const FALLBACK = (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 64, background: '#f9f8f7', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#666' }}>Simultaneity Index</div>
    <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, marginTop: 24 }}>Frozen proof snapshot</div>
    <div style={{ display: 'flex', fontSize: 26, color: '#666', marginTop: 12 }}>This link could not be verified, so no score is shown.</div>
  </div>
)

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  let token = ''
  try { token = decodeURIComponent((await params).token) } catch { return new ImageResponse(FALLBACK, size) }
  try {
    let share
    if (token.startsWith('si_')) {
      const record = await loadShare(token).catch(() => null)
      if (!record) return new ImageResponse(FALLBACK, size)
      share = decodeShare(encodeShareSafe(record.capsule, record.receipt))
    } else {
      share = decodeShare(token)
    }
    if (!shareIntegrityValid(share)) return new ImageResponse(FALLBACK, size)
    const capsule = share.capsule
    const tone = TONE[capsule.verdict] ?? '#555555'
    const query = capsule.query.length > 70 ? capsule.query.slice(0, 70) + '...' : capsule.query
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: '#f9f8f7', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#666' }}>Simultaneity Index · Frozen proof</div>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{`“${query}”`}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
            <div style={{ display: 'flex', fontSize: 160, fontWeight: 800, color: tone, lineHeight: 1 }}>{capsule.score}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16 }}>
              <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: tone }}>{capsule.verdict}</div>
              <div style={{ display: 'flex', fontSize: 26, color: '#444' }}>{`Scanned ${new Date(capsule.searchedAt).toISOString().slice(0, 10)}`}</div>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#666' }}>{shareTrustLabel(share)}</div>
        </div>
      ),
      size,
    )
  } catch {
    return new ImageResponse(FALLBACK, size)
  }
}
