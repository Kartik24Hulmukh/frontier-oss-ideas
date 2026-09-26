import type { CrowdingResult } from './types'

// Treat all upstream/query text as text, not executable Markdown/HTML.
function text(value: unknown): string {
  return String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_{}\[\]()#+.!|])/g, '\\$1')
}
function safeUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href.replace(/[<>\s()]/g, (c) => encodeURIComponent(c))
  } catch { return null }
}

/** A portable, dated analyst worksheet, generated locally from the completed scan. */
export function opportunityBrief(result: CrowdingResult): string {
  const c = result.capsule
  const lines = [
    '# Opportunity Brief', '', `## ${text(result.query)}`, '',
    `Snapshot: ${text(result.searchedAt)} · Model: ${text(c.modelVersion ?? 'legacy / unspecified')}`, '',
    '> Public-source heuristic, not a market-size estimate, unique-team count, probability of success, or investment advice. Discussion heat is not verified buyer demand.', '',
    '## Evidence snapshot', '',
    `- Crowding: **${result.score}/100 — ${text(result.verdict)}**`,
    `- Source coverage: **${result.coverage}%**; confidence proxy: ${result.confidence}% (not a calibrated probability).`,
    `- Demand heat: ${result.demand?.score ?? 'unknown'}; demand coverage: ${result.demand?.coverage ?? 0}%.`,
    `- Query variants actually searched: ${(result.expansions ?? [result.query]).map(text).join('; ')}`, '',
    result.coverage < 100 ? '**Incomplete supply coverage: missing sources are not evidence of an empty market.**' : 'All supply adapters responded; this does not establish complete market coverage.', '',
    '## Source accountability', '', '| Source | Status | Match count (not unique teams) | Operator notice |', '| --- | --- | ---: | --- |',
    ...result.sources.map((s) => `| ${text(s.label)} | ${s.status} | ${s.status === 'ok' ? s.totalCount : 'unknown'} | ${text(s.notice ?? '')} |`), '',
    '## Demand accountability', '', '| Source | Status | Provenance | Match count | Operator notice |', '| --- | --- | --- | ---: | --- |',
    ...(result.demand?.sources ?? []).map((s) => `| ${text(s.label)} | ${s.status} | ${text(s.provenance ?? 'not recorded')} | ${s.status === 'ok' ? s.totalCount : 'unknown'} | ${text(s.notice ?? s.errorMessage ?? '')} |`), '',
    'Discussion heat is not buyer demand. Mirror data is degraded even when all adapters return results.', '',
    '## Why this score?', '', '| Source | Included | Weight | Subscore | Signal |', '| --- | --- | ---: | ---: | --- |',
    ...result.breakdown.map((b) => `| ${text(b.label)} | ${b.included ? 'yes' : 'no'} | ${b.weight} | ${b.included ? b.subScore : 'excluded'} | ${text(b.signal)} |`), '',
    '## Evidence to inspect', '',
  ]
  for (const e of [...c.evidenceLinks, ...(c.demandEvidenceLinks ?? [])]) {
    const url = safeUrl(e.url)
    lines.push(url ? `- [${text(e.title)}](<${url}>) — ${text(e.source)}` : `- ${text(e.title)} — link omitted (unsafe URL)`)
  }
  lines.push('', '## Differentiation hypotheses — recommendations, not findings', '')
  for (const w of result.wedges) lines.push(`### ${text(w.title)}`, '', text(w.rationale), '')
  lines.push('## Decision worksheet — complete with a human reviewer', '',
    '- Target buyer / workflow: [not yet validated]',
    '- Closest competing evidence and important differences: [review links above]',
    '- Disconfirming evidence: [what would invalidate this opportunity?]',
    '- Fastest falsification experiment: interview 5 target users about their last actual occurrence; request a concrete pilot commitment, not an opinion.',
    '- Proposed kill criterion: no recent costly problem and no pilot commitment after 5 qualified interviews. Adjust and preregister before interviews.',
    '- Decision: [build / specialize / investigate / stop]',
    '- Owner / review date / observed outcome: [complete]', '',
    '## Verification and handling', '',
    `Receipt algorithm: ${text(result.receipt?.algorithm ?? 'none')}`,
    `Capsule digest: ${text(result.receipt?.digest ?? 'none')}`, '',
    'Download the companion evidence JSON and POST { capsule, receipt } to /api/verify. Require digestMatches; require issuerTrusted for issuer authentication. A hash alone is not proof of origin. The receipt covers the capsule, not this editable worksheet or its recommendations.', '',
    'This file is a local snapshot, not a hosted immutable archive. Sharing it may reveal your idea. Evidence links and source content can change.', '')
  return lines.join('\n')
}
