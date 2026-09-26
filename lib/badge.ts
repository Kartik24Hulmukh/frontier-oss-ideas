import type { Verdict } from './types'

const COLORS: Record<Verdict | 'unknown', string> = {
  'Open lane': '#2e7d32',
  'Early movers': '#7cb342',
  Crowded: '#f9a825',
  Saturated: '#c62828',
  unknown: '#9e9e9e',
}

export function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] as string)
}

/** Approximate Verdana 11px width, good enough for shields-style badges. */
function textWidth(s: string) {
  return Math.round(s.length * 6.6 + 10)
}

export function renderBadge(score: number | null, verdict: Verdict | null, label = 'simultaneity') {
  const value = score === null || verdict === null ? 'unavailable' : `${score} \u00b7 ${verdict}`
  const color = COLORS[verdict ?? 'unknown']
  const lw = textWidth(label)
  const vw = textWidth(value)
  const total = lw + vw
  const l = escapeXml(label)
  const v = escapeXml(value)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${l}: ${v}"><title>${l}: ${v}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${total}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="${lw / 2}" y="14">${l}</text><text x="${lw + vw / 2}" y="14">${v}</text></g></svg>`
}
