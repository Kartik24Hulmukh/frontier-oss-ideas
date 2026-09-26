#!/usr/bin/env node
// Simultaneity Index — Model Context Protocol (MCP) server.
//
// Ships the "crowding.check" tool directly into agent scaffolds (Cursor,
// [redacted] Desktop, Windsurf, goose, etc.) so an agent can pre-flight-check
// an idea for crowding before writing a single line of code. This is the
// decade bet from docs/COUNCIL_VERDICT.md: whoever becomes the default
// pre-build crowding check owns a new layer of the builder stack.
//
// Zero dependencies (hand-rolled JSON-RPC over stdio) so `npx simultaneity-mcp`
// works instantly with no install step and no native bindings to break.
//
// Usage (any MCP-compatible client):
//   npx simultaneity-mcp
// Env:
//   SIMULTANEITY_API_URL  override the API base (default: hosted production API)

import { createInterface } from 'node:readline'

const API_BASE =
  process.env.SIMULTANEITY_API_URL?.replace(/\/$/, '') ||
  'https://frontier-oss-ideas.vercel.app'

const TOOL_NAME = 'crowding_check'

const TOOL_DEFINITION = {
  name: TOOL_NAME,
  description:
    'Check how crowded a product/startup idea already is across GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, Hugging Face, and Reddit before building it. ' +
    'Returns a 0-100 crowding score, a verdict (Open lane / Early movers / Crowded / Saturated), a Supply x Demand quadrant ' +
    '(Blue Ocean / Gold Rush / Ghost Town / Bloodbath), confidence, evidence links, and wedge suggestions. ' +
    'Call this before scaffolding a new project or when a user proposes an idea, so you can warn them if it is already saturated or point them at an open lane.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The idea to check, e.g. "AI code review agent" or "local-first AI agent OS".',
      },
    },
    required: ['query'],
  },
}

function send(message) {
  const body = JSON.stringify(message)
  process.stdout.write(
    'Content-Length: ' + Buffer.byteLength(body, 'utf8') + '\r\n\r\n' + body,
  )
}

function sendLegacyLineProtocol(message) {
  // Some lightweight MCP clients (and all our own tests) speak newline-delimited
  // JSON instead of the LSP-style Content-Length framing. Support both by
  // detecting which framing the first inbound message used.
  process.stdout.write(JSON.stringify(message) + '\n')
}

async function callCrowdingCheck(query) {
  // One retry on transient failures (5xx, network errors, rate limits after a
  // short pause) so a single cold-start blip does not dead-end the agent.
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    let res
    try {
      res = await fetch(API_BASE + '/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(20_000),
      })
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('network error')
      await new Promise((r) => setTimeout(r, 1500))
      continue
    }
    if (res.ok) {
      const data = await res.json()
      return shapeCrowdingResult(data)
    }
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error('Simultaneity Index API returned ' + res.status)
      await new Promise((r) => setTimeout(r, 1500))
      continue
    }
    throw new Error('Simultaneity Index API returned ' + res.status)
  }
  throw lastError ?? new Error('Simultaneity Index API unreachable')
}

function shapeCrowdingResult(rawData) {
  // Defensive normalization: older deployments returned the quadrant as an
  // object ({ quadrant, supply, demand, headline, action }) while the current
  // API returns flat fields. Accept both so the tool never prints
  // "[object Object]" during a rolling deployment.
  const data = normalizeCrowdingPayload(rawData)
  const lines = [
    'Simultaneity check for "' + data.query + '"',
    'Score: ' + data.score + '/100 — ' + data.verdict,
    'Quadrant: ' + data.quadrant + ' (supply ' + data.supplyScore + ', demand ' + data.demandScore + ')',
    'Confidence: ' + data.confidence + '% · coverage: ' + data.coverage + '%',
    data.verdictDetail,
    '',
    'Top wedges:',
    ...(data.wedges ?? []).slice(0, 3).map((w) => '- ' + w.title + ': ' + w.rationale),
    '',
    'Evidence: ' + (data.capsule?.evidenceLinks ?? []).slice(0, 5).map((e) => e.url).join(', '),
  ]
  return { text: lines.join('\n'), raw: data }
}

function normalizeCrowdingPayload(data) {
  if (data && typeof data.quadrant === 'object' && data.quadrant !== null) {
    const q = data.quadrant
    return {
      ...data,
      quadrant: q.quadrant,
      quadrantDetail: [q.headline, q.action].filter(Boolean).join(' '),
      supplyScore: q.supply,
      demandScore: q.demand,
    }
  }
  return data
}

let usesLineProtocol = false

async function handleRequest(req) {
  const { id, method, params } = req
  try {
    if (method === 'initialize') {
      return respond(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'simultaneity-index', version: '1.1.0' },
      })
    }
    if (method === 'tools/list') {
      return respond(id, { tools: [TOOL_DEFINITION] })
    }
    if (method === 'tools/call') {
      const name = params?.name
      const args = params?.arguments ?? {}
      if (name !== TOOL_NAME) {
        return respond(id, undefined, { code: -32601, message: 'Unknown tool: ' + name })
      }
      const query = String(args.query ?? '').trim()
      if (!query) {
        return respond(id, undefined, { code: -32602, message: 'query is required' })
      }
      const { text, raw } = await callCrowdingCheck(query)
      return respond(id, {
        content: [{ type: 'text', text }],
        structuredContent: {
          query: raw.query,
          score: raw.score,
          verdict: raw.verdict,
          quadrant: raw.quadrant,
          supplyScore: raw.supplyScore,
          demandScore: raw.demandScore,
          confidence: raw.confidence,
          coverage: raw.coverage,
          verdictDetail: raw.verdictDetail,
          wedges: raw.wedges,
          capsule: raw.capsule,
          searchedAt: raw.searchedAt,
        },
      })
    }
    if (method === 'notifications/initialized' || method === 'ping') {
      return null
    }
    return respond(id, undefined, { code: -32601, message: 'Unknown method: ' + method })
  } catch (err) {
    return respond(id, undefined, { code: -32000, message: err instanceof Error ? err.message : 'Unknown error' })
  }
}

function respond(id, result, error) {
  if (id === undefined || id === null) return null
  const message = { jsonrpc: '2.0', id }
  if (error) message.error = error
  else message.result = result
  return message
}

function dispatch(message) {
  handleRequest(message).then((reply) => {
    if (!reply) return
    if (usesLineProtocol) sendLegacyLineProtocol(reply)
    else send(reply)
  })
}

// --- stdio framing reader: supports both Content-Length framed JSON-RPC
// (standard MCP transport) and newline-delimited JSON (simple clients/tests).
let buffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffer += chunk
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n')
    if (buffer.trimStart().startsWith('{') && headerEnd === -1) {
      const newlineIdx = buffer.indexOf('\n')
      if (newlineIdx === -1) return
      usesLineProtocol = true
      const line = buffer.slice(0, newlineIdx)
      buffer = buffer.slice(newlineIdx + 1)
      if (line.trim()) {
        try {
          dispatch(JSON.parse(line))
        } catch {
          // ignore malformed line
        }
      }
      continue
    }
    if (headerEnd === -1) return
    const header = buffer.slice(0, headerEnd)
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      buffer = buffer.slice(headerEnd + 4)
      continue
    }
    const length = Number(match[1])
    const bodyStart = headerEnd + 4
    if (buffer.length < bodyStart + length) return
    const body = buffer.slice(bodyStart, bodyStart + length)
    buffer = buffer.slice(bodyStart + length)
    try {
      dispatch(JSON.parse(body))
    } catch {
      // ignore malformed frame
    }
  }
})

process.stdin.on('end', () => process.exit(0))

process.stderr.write('Simultaneity Index MCP server ready (' + API_BASE + ')\n')
