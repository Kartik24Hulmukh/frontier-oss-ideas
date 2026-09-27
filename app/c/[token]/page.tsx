import { notFound } from 'next/navigation'
import { PageShell, Card } from '@/components/page-shell'
import { loadShare } from '@/lib/shares'
export const dynamic = 'force-dynamic'; export const runtime = 'nodejs'
export default async function CapsulePage({ params }: { params: Promise<{ token: string }> }) {
 const token=(await params).token, record=await loadShare(token); if(!record) notFound(); const c=record.capsule
 return <PageShell eyebrow="Immutable evidence capsule" title={`Simultaneity ${c.score}: “${c.query}”`} lede="A receipt-verified snapshot. Unlike live scan links, this evidence and score do not change.">
  <Card title="Verdict"><p className="text-3xl font-bold text-signal">{c.verdict} · {c.score}/100</p><p>Confidence {c.confidence}% · scanned {new Date(c.searchedAt).toUTCString()}</p></Card>
  <Card title="Evidence"><ul>{c.evidenceLinks.map((e)=><li key={e.url}><a className="underline" href={e.url} target="_blank" rel="noreferrer">{e.title}</a> · {e.source}</li>)}</ul></Card>
  <Card title="Verification"><p className="break-all font-mono text-xs">Token {token}<br/>SHA-256 {record.receipt.digest}<br/>Issuer key {record.receipt.keyId ?? 'legacy'}</p><p>{c.disclaimer}</p></Card>
 </PageShell>
}
