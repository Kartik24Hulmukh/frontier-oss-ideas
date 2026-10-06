/** Runtime provider contracts. TypeScript assertions are not payload validation.
 * Errors are deliberately static: never echo an upstream body or request URL.
 */
export const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
export const count = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
export const nonempty = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0
export const optionalText = (v: unknown): v is string | null | undefined =>
  v === undefined || v === null || typeof v === 'string'
export const optionalCount = (v: unknown): v is number | null | undefined =>
  v === undefined || v === null || count(v)