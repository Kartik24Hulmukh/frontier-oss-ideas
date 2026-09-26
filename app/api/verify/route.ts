import { readObject, inputResponse } from '@/lib/core/input'
import { verifyReceipt, trustedReceipt } from '@/lib/scoring/receipt'
import type { EvidenceCapsule, ScanReceipt } from '@/lib/types'

export const runtime = 'nodejs'

/** POST { capsule, receipt } → { digestMatches, signatureValid } */
export async function POST(request: Request) {
  let body: { capsule?: EvidenceCapsule; receipt?: ScanReceipt }
  try {
    body = await readObject(request, 262144) as typeof body
  } catch (error) {
    return inputResponse(error)
  }
  if (!body.capsule || typeof body.capsule !== 'object' || Array.isArray(body.capsule) || !body.receipt || typeof body.receipt !== 'object' || typeof body.receipt.digest !== 'string' || !/^[a-f0-9]{64}$/.test(body.receipt.digest)) {
    return Response.json({ error: 'Body must include capsule and receipt.' }, { status: 400 })
  }
  try {
    return Response.json({ ...verifyReceipt(body.capsule, body.receipt), issuerTrusted: trustedReceipt(body.capsule, body.receipt), note: 'A matching hash or self-signed key does not prove issuer identity or evidence accuracy.' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'Malformed capsule or receipt.' }, { status: 400 }) }
}
