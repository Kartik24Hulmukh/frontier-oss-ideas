import { version } from '@/package.json'
import { acceptableRedisUrl } from '@/lib/core/redis-endpoint'
import { sharedRouter } from '@/lib/llm/analyst'
import { trustedKeyCount, receiptReadiness } from '@/lib/scoring/receipt'
import { providerBudgetMode } from '@/lib/core/budget'
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
      receipts: receiptReadiness().signer === 'valid' ? 'signing-configured' : receiptReadiness().signer === 'invalid' ? 'blocked-invalid-signer' : 'hash-only',
      receiptReadiness: receiptReadiness(),
      receiptTrust: { pinnedKeys: trustedKeyCount(), rotationReady: trustedKeyCount() > 1 },
      pacing: 'provider-ceilings+circuit-breakers',
      providerBudgetScope: providerBudgetMode(),
      breakerScope: 'per-instance',
      snapshotStorage: { ttlSeconds: 1200, scope: providerBudgetMode() === 'distributed-configured' ? 'redis-configured' : providerBudgetMode() === 'blocked' ? 'blocked' : 'per-instance' },
      modelGateway: process.env.MELIOUS_API_KEY ? 'configured' : 'not-configured',
      // Presence for most credentials; GitHub is an observed, process-local status. Never values.
      credentials: {
        github: githubCredentialStatus(),
        openalex: Boolean(process.env.OPENALEX_API_KEY),
        reddit: Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
        receiptPublicKeyPinned: receiptReadiness().issuerMatched,
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
