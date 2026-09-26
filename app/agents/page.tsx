import type { Metadata } from 'next'
import { Card, PageShell } from '@/components/page-shell'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'MCP server & API — Simultaneity Index for AI agents',
  description: 'Give Cursor, Claude Code, goose and Windsurf a pre-scaffold crowding check: crowding_check(idea) over MCP or plain HTTP.',
}

const code = 'rounded-md bg-muted p-4 font-mono text-xs leading-5 overflow-x-auto whitespace-pre'

export default function AgentsPage() {
  return (
    <PageShell
      eyebrow="Agent-native · MCP + HTTP"
      title="Make every agent check the lane before it scaffolds"
      lede="One tool, crowding_check(idea): 10 sources, confidence, Supply × Demand quadrant, wedges and a signed evidence receipt. Stateless Streamable HTTP — no install, no API key for the free tier."
    >
      <Card title="1 · Add the MCP server (Cursor .cursor/mcp.json / Claude Code / Windsurf / goose)">
        <pre className={code}>{`{
  "mcpServers": {
    "simultaneity": { "url": "${SITE_URL}/api/mcp" }
  }
}`}</pre>
        <p>Claude Code: <code className="font-mono">{'claude mcp add --transport http simultaneity ' + SITE_URL + '/api/mcp'}</code></p>
      </Card>
      <Card title="1b · Windsurf, goose, OpenHands and stdio-only clients">
        <p>Windsurf (<code className="font-mono">~/.codeium/windsurf/mcp_config.json</code>):</p>
        <pre className={code}>{`{
  "mcpServers": {
    "simultaneity": { "serverUrl": "${SITE_URL}/api/mcp" }
  }
}`}</pre>
        <p>goose (<code className="font-mono">~/.config/goose/config.yaml</code>):</p>
        <pre className={code}>{`extensions:
  simultaneity:
    name: simultaneity
    type: streamable_http
    uri: ${SITE_URL}/api/mcp
    enabled: true
    timeout: 60`}</pre>
        <p>OpenHands (<code className="font-mono">config.toml</code>):</p>
        <pre className={code}>{`[mcp]
shttp_servers = ["${SITE_URL}/api/mcp"]`}</pre>
        <p>Clients that only speak stdio: run the zero-dependency bridge from a clone of the repo.</p>
        <pre className={code}>{`{
  "mcpServers": {
    "simultaneity": {
      "command": "node",
      "args": ["bin/simultaneity-mcp.mjs"],
      "env": { "SIMULTANEITY_API_URL": "${SITE_URL}" }
    }
  }
}`}</pre>
      </Card>
      <Card title="2 · Auto-trigger it (CLAUDE.md / AGENTS.md / .cursorrules)">
        <pre className={code}>{`Before scaffolding any new project or feature idea, call the
simultaneity crowding_check tool with a one-line description.
If the verdict is Crowded or Saturated, propose a wedge before writing code.`}</pre>
      </Card>
      <Card title="3 · Or plain HTTP">
        <pre className={code}>{`curl "${SITE_URL}/api/search?q=AI+code+review+agent"

curl -X POST ${SITE_URL}/api/mcp -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"crowding_check","arguments":{"idea":"AI code review agent"}}}'`}</pre>
      </Card>
      <Card title="Why this vs other idea-check MCPs">
        <ul className="list-disc pl-5">
          <li>Seven supply sources incl. arXiv, OpenAlex and Hugging Face — plus three demand channels.</li>
          <li>Confidence + coverage math, visible degraded-source warnings, published methodology & gold-set calibration.</li>
          <li>Tamper-evident receipts (SHA-256, Ed25519 when configured) — verify at POST /api/verify.</li>
        </ul>
      </Card>
    </PageShell>
  )
}
