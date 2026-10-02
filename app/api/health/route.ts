import { version } from '@/package.json'
import { acceptableRedisUrl } from '@/lib/core/redis-endpoint'
import { sharedRouter } from '@/lib/llm/analyst'
import { trustedKeyCount } from '@/lib/scoring/receipt'
import { sourceHealth } from '@/lib/core/pace'
import { githubCredentialStatus } from '@/lib/sources/github'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'simultaneity-index',
      version,
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      admission: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN ? (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && acceptableRedisUrl(process.env.UPSTASH_REDIS_REST_URL) ? 'distributed-configured' : 'blocked-invalid-config') : process.env.REQUIRE_DISTRIBUTED_LIMITS === 'true' ? 'blocked-missing-config' : 'per-instance',
      receipts: process.env.RECEIPT_PRIVATE_KEY ? 'signing-configured' : 'hash-only',
      receiptTrust: { pinnedKeys: trustedKeyCount(), rotationReady: trustedKeyCount() > 1 },
      pacing: 'provider-ceilings+circuit-breakers',
      modelGateway: process.env.MELIOUS_API_KEY ? 'configured' : 'not-configured',
      // Presence for most credentials; GitHub is an observed, process-local status. Never values.
      credentials: {
        github: githubCredentialStatus(),
        openalex: Boolean(process.env.OPENALEX_API_KEY),
        reddit: Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
        receiptPublicKeyPinned: Boolean(process.env.RECEIPT_PUBLIC_KEY),
      },
      llm: sharedRouter().health(),
      sources: sourceHealth(),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
