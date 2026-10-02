> **1.6.5 source observations:** Health reports only fresh successful HTTP observations; errors, stale observations and invalid provider ceilings cannot silently look healthy. Recovery probes survive local quota refusal. [Release scope](docs/RELEASE_1_6_5.md). Full launch gates remain blocked.

> **1.6.3 trust repair:** Proof pages and OG distinguish authenticated issuers from user-supplied checksums. Invalid signatures and tampered evidence never render score claims. [Release + verified limits](docs/RELEASE_1_6_3.md). Strict production and live gateway gates are not green.

> **1.5.2 provenance hardening:** demand mirror provenance survives signed exports; partial-source notices remain visible; strict canaries reject degraded demand and can pin the deployed commit. [Release scope](docs/RELEASE_1_5_2.md). Still public research beta.

> **1.5.1 verification hardening:** Redis-server-time admission, real-Lua concurrency tests in CI, truthful version/config health, and explicit issuer pins. [Release scope](docs/RELEASE_1_5_1.md). Public research beta; strict production gates remain blocking.

> **1.3.0 AI analyst:** grounded, cited diligence memo routed across GLM-5.3 / GLM-5.3 Flash / Kimi K3 / Qwen 3.8 27B with token ceilings, <200 ms failover dispatch after failure detection (not hung-request recovery) and circuit breakers. See [release record](docs/RELEASE_1_3_0.md).
> **1.2.3 decision artifacts:** Download a dated decision brief from each scan. Capsule 1.2 retains receipt-covered provenance. See [release record](docs/RELEASE_1_2_3.md) and run `node scripts/release-gate.mjs <deployment> --strict` before promotion. Commercial readiness remains blocked.

> **1.2.1 public-beta hardening:** Read [production gates](docs/PRODUCTION_GATES.md) before launch. Configure shared Redis admission for multi-instance production. Email alerts, billing and paid plans remain planned. Existing calibration labels are author estimates, not independent expert validation. `/privacy` describes actual query handling. Exported evidence is `{ capsule, receipt }`; verify it with `POST /api/verify` and check `issuerTrusted` separately from `signatureValid`.

# Simultaneity Index

## What's new in v1.1 — “Battlefield”

- **Supply × Demand battlefield** — 7 supply sources + Reddit, Stack Overflow, Ask HN demand → Blue Ocean / Gold Rush / Ghost Town / Bloodbath with a concrete next move.
- **MCP server for agents** — `POST /api/mcp` exposes `crowding_check(idea)`. Claude Code: `claude mcp add --transport http simultaneity https://<deployment>/api/mcp`. See `/agents`.
- **Cohort screening for funds** — `POST /api/cohort` + `/funds` (novelty ranking, idea-twin collisions, CSV).
- **Verifiable receipts** — SHA-256 (Ed25519 with `RECEIPT_PRIVATE_KEY`), check with `POST /api/verify`.
- **Retention** — watchlist with deltas, share links `/s/<idea>`, `/pulse` leaderboard.
- **Trust** — query expansion + cross-source dedup, public `/methodology`, live gold-set calibration: **Historical author-labelled sample: Spearman ρ 0.83, 81% pairwise ordinal agreement, 19/20 within one band — not independent validation** (`docs/CALIBRATION.md`, `pnpm calibrate`).
- **Production hardening** — scan cache, in-flight coalescing, per-IP rate limits; 26 tests; `pnpm verify` green.

```bash
curl "https://<deployment>/api/search?q=AI+code+review+agent"
```

Recommended env for production: `GITHUB_TOKEN`, `OPENALEX_API_KEY`, `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`, `RECEIPT_PRIVATE_KEY` (see `.env.example`). Council + premortem: `docs/COUNCIL_PREMORTEM_V11.md`.

**Live crowding intelligence for builders and AI agents.**

Enter an idea and scan seven public ecosystems in real time: GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, and Hugging Face. The app returns a transparent crowding score, confidence, source coverage, verifiable evidence, and open-wedge recommendations.

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


## Distribution surfaces (v1.2)

**README badge** — show builders you checked the lane:

```md
![simultaneity](https://frontier-oss-ideas.vercel.app/api/badge?q=AI+code+review+agent)
```

**MCP for agents** (Cursor, Claude Desktop, Windsurf, goose):

```json
{ "mcpServers": { "simultaneity": { "url": "https://frontier-oss-ideas.vercel.app/api/mcp" } } }
```

stdio-only clients: `{ "command": "npx", "args": ["-y", "mcp-remote", "https://frontier-oss-ideas.vercel.app/api/mcp"] }`
or, from a clone, `node bin/simultaneity-mcp.mjs` (set `SIMULTANEITY_API_URL` for self-hosting).

**Share cards** — `/s/<idea>` renders a live OG image with score, verdict and quadrant.
