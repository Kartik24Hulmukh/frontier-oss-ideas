import { inputResponse, readObject } from '@/lib/core/input'
import { saveShare } from '@/lib/shares'
import type { EvidenceCapsule, ScanReceipt } from '@/lib/types'
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  let body: { capsule?: EvidenceCapsule; receipt?: ScanReceipt }; try { body = await readObject(request, 262144) as typeof body } catch (e) { return inputResponse(e) }
  if (!body.capsule || !body.receipt) return Response.json({ error: 'Body must include capsule and receipt.' }, { status: 400 })
  try { const saved = await saveShare(body.capsule, body.receipt); return Response.json({ ...saved, url: `/c/${saved.token}` }, { status: saved.created ? 201 : 200, headers: { 'Cache-Control': 'no-store' } }) }
  catch (e) { const m = e instanceof Error ? e.message : ''; if (m === 'UNTRUSTED_RECEIPT') return Response.json({ error: 'A valid receipt from the pinned Simultaneity issuer is required.' }, { status: 422 }); return Response.json({ error: 'Immutable share storage is unavailable.' }, { status: 503, headers: { 'Retry-After': '30' } }) }
}
