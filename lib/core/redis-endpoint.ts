/**
 * Where a distributed limiter is allowed to talk to.
 *
 * Production must use TLS Upstash REST. A loopback HTTP endpoint is accepted
 * ONLY outside production AND only with an explicit ALLOW_LOOPBACK_REDIS opt-in,
 * so the release gate can be verified end-to-end (with the bundled
 * Upstash-REST emulator) without handing a cloud credential to a verifier.
 * Anything else fails closed.
 */
export function loopbackRedisAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_LOOPBACK_REDIS === 'true' && env.NODE_ENV !== 'production'
}

export function acceptableRedisUrl(url: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (url.startsWith('https://')) return true
  if (!loopbackRedisAllowed(env)) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '::1')
  } catch {
    return false
  }
}
