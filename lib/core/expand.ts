/**
 * Deterministic semantic query expansion.
 *
 * Keyword search misses synonyms ("AI code review agent" vs "automated PR
 * reviewer"). Rather than ship an embedding model into a stateless function,
 * we expand with a curated builder-vocabulary lexicon. It is transparent
 * (variants are shown to the user and written into the capsule), testable, and
 * costs zero latency. An embedding-backed expander can implement the same
 * signature later.
 */
const LEXICON: Array<[RegExp, string[]]> = [
  [/\bcode review\b/, ['pull request review', 'pr reviewer']],
  [/\bpull request\b|\bpr\b/, ['code review']],
  [/\bagents?\b/, ['assistant', 'autonomous']],
  [/\bassistant\b/, ['copilot', 'agent']],
  [/\bllm\b/, ['language model', 'gpt']],
  [/\bai\b/, ['llm']],
  [/\brag\b|retrieval augmented/, ['retrieval augmented generation', 'semantic search']],
  [/\bchatbot\b/, ['conversational agent', 'chat assistant']],
  [/\bmonitor(ing)?\b/, ['observability', 'tracking']],
  [/\bobservability\b/, ['monitoring', 'tracing']],
  [/\bscraper\b|\bscraping\b/, ['crawler', 'web extraction']],
  [/\binvoice\b/, ['billing', 'accounts payable']],
  [/\bcompliance\b/, ['audit', 'governance']],
  [/\bsecurity\b/, ['vulnerability', 'appsec']],
  [/\btesting\b|\btests?\b/, ['test generation', 'qa automation']],
  [/\bdocs?\b|\bdocumentation\b/, ['docs generator', 'technical writing']],
  [/\bnote[- ]?taking\b|\bnotes\b/, ['knowledge base', 'second brain']],
  [/\bmeeting\b/, ['transcription', 'call notes']],
  [/\bcrm\b/, ['sales pipeline', 'customer relationship']],
  [/\bspreadsheet\b/, ['excel', 'tabular data']],
  [/\bvoice\b/, ['speech', 'text to speech']],
  [/\bimage generation\b/, ['text to image', 'diffusion']],
  [/\bworkflow\b/, ['automation', 'orchestration']],
  [/\bdashboard\b/, ['analytics', 'reporting']],
  [/\bmcp\b/, ['model context protocol']],
]

const STOP = new Set(['a', 'an', 'the', 'for', 'of', 'to', 'and', 'with', 'in', 'on', 'that', 'my', 'your', 'tool', 'app'])

export function keyTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

/**
 * Returns the original query first, followed by up to `max` distinct variants.
 * Variants substitute one matched concept at a time, preserving the rest of the
 * phrase, so they stay on-topic.
 */
export function expandQuery(query: string, max = 3): string[] {
  const base = query.trim().replace(/\s+/g, ' ')
  const lower = base.toLowerCase()
  const out: string[] = [base]
  for (const [pattern, alts] of LEXICON) {
    const m = lower.match(pattern)
    if (!m) continue
    for (const alt of alts) {
      const variant = lower.replace(pattern, alt).replace(/\s+/g, ' ').trim()
      if (variant && !out.map((o) => o.toLowerCase()).includes(variant)) out.push(variant)
      if (out.length > max) return out
    }
  }
  return out
}

/** Jaccard similarity over key terms, 0-1. */
export function termSimilarity(a: string, b: string): number {
  const A = new Set(keyTerms(a))
  const B = new Set(keyTerms(b))
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}
