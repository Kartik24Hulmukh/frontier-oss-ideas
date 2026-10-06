# Simultaneity Index — Founder Session Report (2026-09-26)

## What I inherited
Four research artifacts (Final-Report-4.md, LEVERAGE_MAP.csv, SIMULTANEITY_INDEX_100X_PLAYBOOK.md, GTM Master Council Verdict) analyzing the real, live repo **github.com/Kartik24Hulmukh/frontier-oss-ideas** ("Simultaneity Index" — crowding intelligence for builders/agents, Next.js + 7 source adapters). The council's converged verdict: keep the name/category, but close three gaps before the product can be 100x — (1) no demand-side signal, (2) no agent-distribution surface (a competitor, idea-reality-mcp, already shipped an MCP tool), (3) no retention/caching resilience.

## What I shipped (cloned, built, tested, merged to `main`)
1. **Reddit demand-side adapter** (`lib/sources/reddit.ts`) — first non-supply-side signal, flags explicit "want/ask" posts.
2. **Supply × Demand 2D quadrant** (Blue Ocean / Gold Rush / Ghost Town / Bloodbath) computed in `lib/scoring/score.ts`, rendered via new `components/quadrant-panel.tsx` on every scan — the single most decision-changing output the council called for.
3. **Zero-dependency MCP server** (`scripts/mcp-server.mjs`, `npx simultaneity-mcp`) exposing `crowding_check(query)` over stdio JSON-RPC for Cursor/[redacted] Desktop/Windsurf/goose — the decade-bet distribution wedge from the repo's own council verdict, previously unshipped.
4. **In-memory response cache** (`lib/core/cache.ts`) protecting the free API from rate-limit/traffic spikes.
5. New test suite (`tests/quadrant.test.ts`, 4 tests) — **10/10 tests pass**, `tsc --noEmit` clean, `next build` production build verified.
6. Updated `README.md` (MCP usage, 8-source description) and `docs/ROADMAP.md` (checked off delivered P1 items, added prioritized next-steps: gold-set calibration, retention/watchlists, B2B cohort-screening wedge).
7. Repo hygiene: added description + topics to the GitHub repo (was previously blank — a stated weakness), bumped version to 1.1.0.

## Shipping mechanics
- Cloned with the provided token, worked on branch `feat/supply-demand-matrix-and-mcp`, pushed, opened **PR #2**, and **squash-merged it into `main`** via the GitHub API (merge commit `0e118a1f`, GPG-verified by GitHub). All changes are live on the default branch right now.

## Recommended next moves (highest leverage, in order — captured in ROADMAP.md)
1. List the MCP server on mcpservers.org/Glama/Lobehub and ship the goose "founder distro" — idea-reality-mcp already occupies the bare MCP-tool wedge; win with the quadrant + 8-source evidence capsule.
2. Gold-set calibration (40–60 human-ranked ideas) + published ordinal-accuracy badge to move the score from "heuristic" to "measured."
3. Magic-link accounts + watchlists + weekly public "Simultaneity Pulse" for retention/SEO/shareability.
4. B2B cohort-screening wedge for accelerators/funds ($2–10k/yr contracts) once free-tier traction data exists to sell against.

## Links
- Repo: https://github.com/Kartik24Hulmukh/frontier-oss-ideas
- Merged PR: https://github.com/Kartik24Hulmukh/frontier-oss-ideas/pull/2
- Live app: https://frontier-oss-ideas.vercel.app (auto-redeploys from `main` via existing Vercel integration)
