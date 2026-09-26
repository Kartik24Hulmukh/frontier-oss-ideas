import type { SourceId, SourceResult } from '@/lib/types'

const DEFAULT_TIMEOUT_MS = 8000

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const { timeoutMs: _t, ...rest } = init ?? {}
  const timeout = AbortSignal.timeout(timeoutMs)
  return fetch(url, { ...rest, signal: rest.signal ? AbortSignal.any([rest.signal, timeout]) : timeout, cache: 'no-store' })
}

export function errorResult(
  source: SourceId,
  label: string,
  message: string,
  rateLimited = false,
): SourceResult {
  return {
    source,
    label,
    status: rateLimited ? 'rate_limited' : 'error',
    totalCount: 0,
    items: [],
    errorMessage: message,
  }
}
