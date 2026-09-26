/**
 * Live gold-set calibration. Usage: GITHUB_TOKEN=... pnpm calibrate
 * Writes docs/CALIBRATION.md with Spearman rho, pairwise ordinal agreement,
 * exact/adjacent band agreement and every miss named.
 */
import { writeFileSync } from 'node:fs'
import { mapLimit } from '../lib/cohort'
import { bandDistance, GOLD_SET, pairwiseAgreement, spearman } from '../lib/calibration/gold-set'
import { scanIdea } from '../lib/scan'

async function main() {
  const rows = await mapLimit(GOLD_SET, 2, async (g) => {
    const r = await scanIdea(g.idea, { demand: false, fresh: true })
    return { ...g, score: r.score, verdict: r.verdict, confidence: r.confidence }
  })
  const rho = spearman(rows.map((r) => -r.rank), rows.map((r) => r.score))
  const pairwise = pairwiseAgreement(rows.map((r) => r.rank), rows.map((r) => r.score))
  const exact = rows.filter((r) => bandDistance(r.expected, r.verdict) === 0).length
  const adjacent = rows.filter((r) => bandDistance(r.expected, r.verdict) <= 1).length
  const date = new Date().toISOString().slice(0, 10)
  const md = [
    `# Calibration — ${date}`,
    '',
    `Gold set: ${rows.length} ideas with expert ordinal crowding ranks (lib/calibration/gold-set.ts).`,
    '',
    `- **Spearman rho:** ${rho.toFixed(2)}`,
    `- **Pairwise ordinal agreement:** ${(pairwise * 100).toFixed(0)}%`,
    `- **Exact band agreement:** ${exact}/${rows.length}`,
    `- **Within one band:** ${adjacent}/${rows.length}`,
    '',
    '| Expert rank | Idea | Expected | Engine | Score | Confidence |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.rank} | ${r.idea} | ${r.expected} | ${r.verdict}${bandDistance(r.expected, r.verdict) > 1 ? ' ⚠️' : ''} | ${r.score} | ${r.confidence}% |`),
    '',
    'Misses by two or more bands are flagged ⚠️ and are the next methodology work items.',
  ].join('\n')
  writeFileSync('docs/CALIBRATION.md', md + '\n')
  console.log(md)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
