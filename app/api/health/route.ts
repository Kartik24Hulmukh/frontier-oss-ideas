export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'simultaneity-index',
      version: '1.2.1',
      admission: process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'distributed-configured' : process.env.REQUIRE_DISTRIBUTED_LIMITS === 'true' ? 'blocked-missing-config' : 'per-instance',
      receipts: process.env.RECEIPT_PRIVATE_KEY ? 'signing-configured' : 'hash-only',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
