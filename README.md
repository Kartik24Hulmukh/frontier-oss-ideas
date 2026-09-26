# Simultaneity Index

## What's new in v1.1 — “Battlefield”

- **Supply × Demand battlefield** — 7 supply sources + Reddit, Stack Overflow, Ask HN demand → Blue Ocean / Gold Rush / Ghost Town / Bloodbath with a concrete next move.
- **MCP server for agents** — `POST /api/mcp` exposes `crowding_check(idea)`. Claude Code: `claude mcp add --transport http simultaneity https://<deployment>/api/mcp`. See `/agents`.
- **Cohort screening for funds** — `POST /api/cohort` + `/funds` (novelty ranking, idea-twin collisions, CSV).
- **Verifiable receipts** — SHA-256 (Ed25519 with `RECEIPT_PRIVATE_KEY`), check with `POST /api/verify`.
- **Retention** — watchlist with deltas, share links `/s/<idea>`, `/pulse` leaderboard.
- **Trust** — query expansion + cross-source dedup, public `/methodology`, live gold-set calibration: **Spearman ρ 0.83, 81% pairwise ordinal agreement, 19/20 within one band** (`docs/CALIBRATION.md`, `pnpm calibrate`).
- **Production hardening** — scan cache, in-flight coalescing, per-IP rate limits; 26 tests; `pnpm verify` green.

```bash
curl "https://<deployment>/api/search?q=AI+code+review+agent"
```

Recommended env for production: `GITHUB_TOKEN`, `OPENALEX_API_KEY`, `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`, `RECEIPT_PRIVATE_KEY` (see `.env.example`). Council + premortem: `docs/COUNCIL_PREMORTEM_V11.md`.

**Live crowding intelligence for builders and AI agents.**

Enter an idea and scan eight public ecosystems in real time: GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, Hugging Face, and Reddit. The app returns a transparent crowding score, confidence, source coverage, verifiable evidence, a **Supply x Demand battlefield quadrant** (Blue Ocean / Gold Rush / Ghost Town / Bloodbath), and open-wedge recommendations.

Also ships as an **MCP tool** (`crowding_check`) so agents (Cursor, [redacted] Desktop, Windsurf, goose, ...) can pre-flight-check an idea before scaffolding a project — see [MCP server](#mcp-server-for-agents) below.

## Deploy to Vercel

This repository is configured for direct Vercel deployment.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Simultaneity Index release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### 2. Import in Vercel

1. Open [vercel.com/new](https://vercel.com/new).
2. Import the GitHub repository.
3. Vercel detects **Next.js** automatically.
4. Add the environment variables below.
5. Select **Deploy**.

### 3. Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical production URL for metadata and sitemap |
| `GITHUB_TOKEN` | Strongly recommended | Raises GitHub API limits; use a read-only fine-grained token |
| `OPENALEX_API_KEY` | Recommended | Free OpenAlex API key for 2026 access |
| `OPENALEX_MAILTO` | Recommended | Polite OpenAlex identification |

Copy `.env.example` to `.env.local` for local development. Never commit real tokens.

```bash
cp .env.example .env.local
```

## Local development

Requirements: Node.js 20+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

Or run all checks:

```bash
pnpm verify
```

Health endpoint after deployment:

```text
GET /api/health
```

## API

### Scan one idea

```bash
curl -X POST https://YOUR_DOMAIN/api/search \
  -H 'content-type: application/json' \
  -d '{"query":"AI code review agent"}'
```

### Compare ideas

```bash
curl -X POST https://YOUR_DOMAIN/api/compare \
  -H 'content-type: application/json' \
  -d '{"queries":["AI code review agent","local-first AI agent OS"]}'
```

## MCP server for agents

Simultaneity Index ships a zero-dependency MCP (Model Context Protocol) server so coding agents can pre-flight-check an idea before scaffolding a project.

```bash
npx simultaneity-mcp
```

Or point any MCP-compatible client (Cursor, [redacted] Desktop, Windsurf, goose) at:

```json
{
  "mcpServers": {
    "simultaneity-index": {
      "command": "npx",
      "args": ["simultaneity-mcp"]
    }
  }
}
```

Exposes one tool, `crowding_check(query)`, returning the score, verdict, Supply x Demand quadrant, confidence, and top wedges as agent-readable text plus the raw JSON payload. Point it at a self-hosted deployment with `SIMULTANEITY_API_URL=https://your-domain.example`.

## Architecture

```text
query
  → seven parallel source adapters
  → normalized source results
  → weighted score + confidence
  → wedge engine
  → downloadable evidence capsule
```

- Next.js App Router
- Node.js Vercel Functions
- React + Tailwind CSS
- No database required for the alpha
- Server-side tokens only
- Partial source failures degrade gracefully

## Repository map

- `app/` — UI, metadata, health/search/compare routes
- `components/` — result, source, wedge, and search interfaces
- `lib/sources/` — public-source adapters
- `lib/scoring/` — score, confidence, wedge, and capsule logic
- `tests/` — scoring and adapter contract tests
- `docs/` — product research, methodology, architecture, and roadmap
- `vercel.json` — function limits and security headers
- `.github/workflows/ci.yml` — typecheck, test, and production build

## Product status

**Alpha.** The score is a public-signal heuristic, not investment advice, market-demand proof, or a legal novelty opinion. Every returned artifact has a public evidence URL.

## License

MIT
