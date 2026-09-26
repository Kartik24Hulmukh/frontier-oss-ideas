export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'simultaneity-index',
      version: '1.2.2',
      admission: process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'distributed-configured' : process.env.REQUIRE_DISTRIBUTED_LIMITS === 'true' ? 'blocked-missing-config' : 'per-instance',
      receipts: process.env.RECEIPT_PRIVATE_KEY ? 'signing-configured' : 'hash-only',
      // Presence only (booleans) - never values. Lets operators spot missing deployment config.
      credentials: {
        github: Boolean(process.env.GITHUB_TOKEN),
        openalex: Boolean(process.env.OPENALEX_API_KEY),
        reddit: Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
        receiptPublicKeyPinned: Boolean(process.env.RECEIPT_PUBLIC_KEY),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
