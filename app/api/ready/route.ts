import { acceptableRedisUrl } from '@/lib/core/redis-endpoint'
import { receiptReadiness } from '@/lib/scoring/receipt'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Operational readiness, distinct from liveness and empirical launch approval. */
export async function GET() {
 const signer = receiptReadiness()
 const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN
 let redis: 'missing' | 'invalid' | 'unavailable' | 'healthy' = !url && !token ? 'missing' : 'invalid'
 if(url && token && acceptableRedisUrl(url)) {
  redis = 'unavailable'
  try {
   const response = await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(['PING']),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(2500)})
   if(response.ok && (await response.json())?.result === 'PONG') redis = 'healthy'
  } catch { /* Fail closed; never disclose endpoint, token, or response body. */ }
 }
 const ready = redis === 'healthy' && signer.ready
 return Response.json({ready,scope:'operational-dependencies-only',redis,receipts:signer,limitation:'Readiness does not certify provider coverage, semantic calibration, customer utility, or commercial launch approval.'},{status:ready?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}})
}
