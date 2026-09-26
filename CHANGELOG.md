# Changelog

## 1.2.0 — 2026-09-26 · “Distribution loops”

### Added
- **README badge** `GET /api/badge?q=` — shields-style SVG (score · verdict), CDN-cached 6h. Every repo that embeds it is a backlink + live ad.
- **Dynamic OG image** for share links `/s/[idea]` (score, verdict, quadrant, confidence) so shared scans render as cards on X/LinkedIn/Slack; Twitter card upgraded to `summary_large_image`.
- **Zero-dependency MCP stdio bridge** `bin/simultaneity-mcp.mjs` (newline-delimited JSON-RPC → hosted `/api/mcp`); one server implementation, two transports. `GET /api/mcp` now returns copy-paste configs for HTTP, `npx mcp-remote` and local stdio.
- `lib/site.ts` single source of truth for the canonical URL.
- 3 new tests (29 total).

### Fixed
- PR #3 was unmergeable (branched before PR #2). Reconciled: v1.1 implementation kept; PR #2 duplicates removed (`lib/sources/reddit.ts` counted Reddit as *supply*, `components/quadrant-panel.tsx`, `tests/quadrant.test.ts`), and the PR #2 stdio script (LSP `Content-Length` framing, which MCP stdio does not use, and the wrong `query` argument) replaced by the bridge.
- `crowding_check` accepts `query` as an alias for `idea` (back-compat with PR #2 clients).
- Canonical URL defaulted to a non-existent `simultaneity-index.vercel.app` in metadata, robots and sitemap → now the real deployment.
- `tsconfig.tsbuildinfo` untracked; test glob quoted so CI runs identically in every shell.

## 1.1.0 — 2026-09-26 · “Battlefield”

### Added
- **Demand heat** from Reddit (app-only OAuth optional), Stack Overflow and Ask HN, with trend detection.
- **Supply × Demand battlefield**: Blue Ocean / Gold Rush / Ghost Town / Bloodbath with a concrete “what to do”.
- **MCP server** (`POST /api/mcp`, Streamable HTTP, stateless) exposing `crowding_check`; `/agents` install page; `public/llms.txt`.
- **GET /api/search?q=** with CORS for agents and curl.
- **Cohort screening** `POST /api/cohort` (novelty ranking, idea-twin collisions, CSV) + `/funds` live demo.
- **Tamper-evident receipts** (SHA-256; Ed25519 when `RECEIPT_PRIVATE_KEY` set) + `POST /api/verify`.
- **Retention**: local watchlist with score deltas, share links `/s/[idea]`, `/pulse` leaderboard, `?q=` deep links.
- **Trust**: transparent query expansion, cross-source dedup, `/methodology`, 20-idea gold set, `pnpm calibrate` → `docs/CALIBRATION.md`.
- **Reliability**: TTL/LRU scan cache, in-flight coalescing, per-IP sliding-window rate limit.
- `/pricing`, sitemap for all public pages, 16 new tests (26 total).

### Changed
- Evidence capsule version `1.1` adds `demandScore` and `quadrant` (backwards compatible).
