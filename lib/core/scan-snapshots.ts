import { TTLCache } from './cache'
import { acceptableRedisUrl } from './redis-endpoint'
import { canonicalJson, verifyReceipt } from '../scoring/receipt'
import type { CrowdingResult } from '../types'

/** Short-lived server-owned observations, independent of the query cache. */
const TTL_SECONDS = 1200
const MAX_BYTES = 524288
const memory = new TTLCache<string>(500, TTL_SECONDS * 1000)
const ID = /^[a-f0-9]{64}$/
function distributed() {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url && !token && process.env.REQUIRE_DISTRIBUTED_LIMITS !== 'true') return null
  if (!url || !token || !acceptableRedisUrl(url)) throw new Error('SNAPSHOT_STORE_UNAVAILABLE')
  return { url, token }
}
async function command(args: unknown[]): Promise<unknown> {
  const config = distributed()
  if (!config) throw new Error('SNAPSHOT_STORE_UNAVAILABLE')
  const response = await fetch(config.url, { method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(2500) })
  if (!response.ok) throw new Error('SNAPSHOT_STORE_UNAVAILABLE')
  const text = await response.text()
  if (Buffer.byteLength(text) > MAX_BYTES * 2) throw new Error('SNAPSHOT_STORE_UNAVAILABLE')
  const body = JSON.parse(text)
  if (!body || typeof body !== 'object' || body.error || !Object.hasOwn(body, 'result')) throw new Error('SNAPSHOT_STORE_UNAVAILABLE')
  return body.result
}
/** SET NX means a second issuance cannot overwrite an existing digest. */
export async function retainScanSnapshot(result: CrowdingResult): Promise<void> {
  const id = result.receipt?.digest
  if (!id || !ID.test(id)) return
  const record = JSON.stringify(result)
  if (Buffer.byteLength(record) > MAX_BYTES) throw new Error('SNAPSHOT_TOO_LARGE')
  if (distributed()) await command(['SET', `si:snapshot:v1:${id}`, record, 'NX', 'EX', TTL_SECONDS])
  else if (!memory.get(id)) memory.set(id, record)
}
/** Never calls a provider or accepts caller-supplied scan facts. */
export async function lookupScanSnapshot(snapshotId: string, receipt: unknown): Promise<CrowdingResult | null> {
  if (!ID.test(snapshotId) || !receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return null
  const supplied = receipt as Record<string, unknown>
  if (supplied.digest !== snapshotId) return null
  const raw = distributed() ? await command(['GET', `si:snapshot:v1:${snapshotId}`]) : memory.get(snapshotId)
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_BYTES) return null
  try {
    const result = JSON.parse(raw) as CrowdingResult
    if (!result.receipt || result.receipt.digest !== snapshotId || canonicalJson(receipt) !== canonicalJson(result.receipt)) return null
    const age = Date.now() - Date.parse(result.receipt.issuedAt)
    if (!Number.isFinite(age) || age < -60_000 || age >= TTL_SECONDS * 1000) return null
    const checked = verifyReceipt(result.capsule, result.receipt)
    if (!checked.digestMatches || (result.receipt.algorithm === 'ed25519+sha256' && checked.signatureValid !== true)) return null
    return result // JSON parsing returns a fresh object: callers cannot mutate the retained record.
  } catch { return null }
}
