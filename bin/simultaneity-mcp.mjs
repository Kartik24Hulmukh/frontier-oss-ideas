#!/usr/bin/env node
// Simultaneity Index MCP stdio bridge. Zero dependencies.
// Forwards newline-delimited JSON-RPC (MCP stdio transport) to the hosted
// stateless Streamable-HTTP endpoint, so the server logic lives in ONE place
// (lib/mcp.ts) and stdio clients (Claude Desktop, Cursor, goose) get the same tool.
//   node bin/simultaneity-mcp.mjs
//   SIMULTANEITY_API_URL=http://localhost:3000 node bin/simultaneity-mcp.mjs
import { createInterface } from 'node:readline'

const BASE = (process.env.SIMULTANEITY_API_URL || 'https://frontier-oss-ideas.vercel.app').replace(/[/]+$/, '')
const ENDPOINT = BASE + '/api/mcp'
const TIMEOUT_MS = Number(process.env.SIMULTANEITY_TIMEOUT_MS || 45000)

const out = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')
const log = (...a) => process.stderr.write('[simultaneity-mcp] ' + a.join(' ') + '\n')

async function forward(message) {
  const id = message && typeof message === 'object' && 'id' in message ? message.id : null
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.status === 202 || res.status === 204) return
    const text = await res.text()
    let body
    try { body = JSON.parse(text) } catch { body = null }
    if (body && typeof body === 'object') return out(body)
    if (id !== null) out({ jsonrpc: '2.0', id, error: { code: -32603, message: 'Upstream HTTP ' + res.status + ': ' + text.slice(0, 200) } })
  } catch (err) {
    if (id !== null) out({ jsonrpc: '2.0', id, error: { code: -32603, message: 'Simultaneity API unreachable (' + ENDPOINT + '): ' + (err && err.message) } })
  }
}

const rl = createInterface({ input: process.stdin, terminal: false })
const pending = new Set()
rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let msg
  try { msg = JSON.parse(trimmed) } catch {
    return out({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
  }
  const p = forward(msg).finally(() => pending.delete(p))
  pending.add(p)
})
rl.on('close', async () => { await Promise.allSettled([...pending]); process.exit(0) })
log('bridging stdio ->', ENDPOINT)
