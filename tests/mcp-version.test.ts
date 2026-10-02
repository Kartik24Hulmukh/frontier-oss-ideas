import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleRpc } from '../lib/mcp'
import { version } from '../package.json'

test('MCP initialize advertises the installed package version', async () => {
  const reply = await handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize' })
  assert.equal((reply?.result as { serverInfo: { version: string } }).serverInfo.version, version)
})
