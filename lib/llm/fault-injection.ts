import type { ModelId } from './router'

/** Inject failures only. The live upstream response is returned unchanged, including quota errors.
 * This belongs to verification tooling, not a production fallback or success emulator.
 */
export function faultInjectingFetch(
  upstream: typeof fetch,
  faults: Partial<Record<ModelId, number | 'hang'>>,
): typeof fetch {
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    const model = JSON.parse(String(init?.body)).model as ModelId
    const fault = faults[model]
    if (fault === 'hang') {
      return new Promise<Response>((_, reject) => {
        const abort = () => reject(Object.assign(new Error('injected timeout'), { name: 'TimeoutError' }))
        if (init?.signal?.aborted) abort()
        else init?.signal?.addEventListener('abort', abort, { once: true })
      })
    }
    if (typeof fault === 'number') {
      if (!Number.isInteger(fault) || fault < 400 || fault > 599) throw new RangeError('Only HTTP error status injection is permitted')
      return Response.json({ error: 'injected failure' }, {
        status: fault, headers: fault === 429 ? { 'retry-after': '30' } : {},
      })
    }
    return upstream(url, init)
  }) as typeof fetch
}
