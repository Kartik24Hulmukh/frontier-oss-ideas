/** Bounded JSON parsing for public endpoints. Never trust Content-Length alone. */
export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export async function readObject(request: Request, maxBytes = 32768): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader()
  if (!reader) throw new InputError('JSON object required.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw new InputError('Request body too large.', 413) }
      chunks.push(value)
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('JSON object required.')
    return body as Record<string, unknown>
  } catch (e) {
    if (e instanceof InputError) throw e
    throw new InputError('Invalid JSON body.')
  } finally { reader.releaseLock() }
}
export function validIdea(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 3 && value.length <= 120 && !/[\x00-\x1f\x7f]/.test(value)
}
export function inputResponse(error: unknown, headers: Record<string, string> = {}) {
  return Response.json({ error: error instanceof InputError ? error.message : 'Invalid request.' }, { status: error instanceof InputError ? error.status : 400, headers })
}
