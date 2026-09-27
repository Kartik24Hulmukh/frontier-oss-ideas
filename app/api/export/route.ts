import { readObject, inputResponse } from '@/lib/core/input'
import { encodeShare, ShareError } from '@/lib/share'
import { saveShare } from '@/lib/shares'
import { trustedReceipt } from '@/lib/scoring/receipt'
import { SITE_URL } from '@/lib/site'
import type { EvidenceCapsule, ScanReceipt } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { capsule, receipt } -> { token, path, url, proofPath, shortPath? }
 *
 * Always mints a storage-free, self-verifying proof link (/c/v1.<digest16>.<payload>),
 * so sharing works even before managed Redis or receipt keys are provisioned.
 * When the receipt is from the pinned issuer AND write-once storage is available
 * (1.6.0 `saveShare`), a short immutable alias /c/si_<hash> is added and preferred.
 * Edited capsules (digest mismatch) are refused with 422.
 */
export async function POST(request: Request) {
  let body: { capsule?: EvidenceCapsule; receipt?: ScanReceipt }
  try {
    body = await readObject(request, 262144) as typeof body
  } catch (error) {
    return inputResponse(error)
  }
  let token: string
  try {
    token = encodeShare(body.capsule as EvidenceCapsule, body.receipt as ScanReceipt)
  } catch (error) {
    if (error instanceof ShareError) {
      const status = error.code === 'digest_mismatch' ? 422 : error.code === 'too_large' ? 413 : 400
      return Response.json({ error: error.message, code: error.code }, { status })
    }
    return Response.json({ error: 'Could not export this capsule.' }, { status: 400 })
  }
  const capsule = body.capsule as EvidenceCapsule, receipt = body.receipt as ScanReceipt
  let shortPath: string | undefined
  let created = false
  if (trustedReceipt(capsule, receipt)) {
    try { const saved = await saveShare(capsule, receipt); shortPath = `/c/${saved.token}`; created = saved.created } catch { /* durable alias optional; the proof link needs no storage */ }
  }
  const proofPath = `/c/${token}`
  const path = shortPath ?? proofPath
  return Response.json(
    { token, path, url: `${SITE_URL}${path}`, proofPath, shortPath: shortPath ?? null, bytes: token.length, storage: shortPath ? 'write-once redis alias + self-contained proof' : 'none (self-contained, content-addressed)' },
    { status: created ? 201 : 200, headers: { 'Cache-Control': 'no-store' } },
  )
}
