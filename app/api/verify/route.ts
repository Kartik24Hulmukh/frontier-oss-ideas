import { verifyReceipt } from '@/lib/scoring/receipt'
import type { EvidenceCapsule, ScanReceipt } from '@/lib/types'

export const runtime = 'nodejs'

/** POST { capsule, receipt } → { digestMatches, signatureValid } */
export async function POST(request: Request) {
  let body: { capsule?: EvidenceCapsule; receipt?: ScanReceipt }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!body.capsule || !body.receipt?.digest) {
    return Response.json({ error: 'Body must include capsule and receipt.' }, { status: 400 })
  }
  return Response.json(verifyReceipt(body.capsule, body.receipt))
}
