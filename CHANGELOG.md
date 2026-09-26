# Changelog

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
