import { SOURCE_ORDER } from '@/lib/sources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness + configuration probe. Never echoes token values, only whether
 * credentials are configured, so operators can self-diagnose a degraded
 * scan (e.g. GitHub 401s when GITHUB_TOKEN is stale) in one request.
 */
export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'simultaneity-index',
      version: '1.2.0',
      sources: SOURCE_ORDER,
      config: {
        githubToken: Boolean(process.env.GITHUB_TOKEN),
        openAlexApiKey: Boolean(process.env.OPENALEX_API_KEY),
        openAlexMailto: Boolean(process.env.OPENALEX_MAILTO),
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
