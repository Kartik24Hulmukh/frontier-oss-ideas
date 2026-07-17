import type { SourceId, SourceResult } from '@/lib/types'

const DEFAULT_TIMEOUT_MS = 8000

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const { timeoutMs: _t, ...rest } = init ?? {}
    return await fetch(url, {
      ...rest,
      signal: controller.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timer)
  }
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
