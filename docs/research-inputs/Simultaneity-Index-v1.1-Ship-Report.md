# Simultaneity Index v1.1 "Battlefield": ship report (2026-09-26)

**Repo:** github.com/Kartik24Hulmukh/frontier-oss-ideas
**PR:** https://github.com/Kartik24Hulmukh/frontier-oss-ideas/pull/3 (branch `feat/v1.1-battlefield-mcp-cohort`, commit `05149db`)
**Status:** Pushed and PR opened. The Vercel Preview and GitGuardian checks passed. **The PR is not merged yet.** My sandbox hit its command limit while it was waiting for the GitHub Actions `verify` job, before it could send the merge call. To merge: open PR #3, check that `verify` is green, then click Merge (or run `gh pr merge 3 --merge`).

## What I shipped (39 files, +2,162 lines)
| Area | What it does | Where |
|---|---|---|
| Demand heat | Scores Reddit (optional app-only OAuth), Stack Overflow and Ask HN, plus a rising/flat/falling trend | `lib/demand/` |
| Supply × Demand map | Puts each idea in one of four quadrants (Blue Ocean, Gold Rush, Ghost Town, Bloodbath), each with a "what to do" line. Shown on the results page. | `lib/scoring/quadrant.ts`, `components/matrix-panel.tsx` |
| Agent access (MCP) | Stateless MCP server with a `crowding_check` tool. Also `GET /api/search?q=` with CORS, an `/agents` install page and `llms.txt` | `lib/mcp.ts`, `app/api/mcp`, `app/agents` |
| B2B for funds | Cohort screening: novelty ranking, idea-twin collisions inside a batch, CSV export, bypass keys for paying customers. `/funds` has a live demo and `/pricing` lists the plans | `app/api/cohort`, `lib/cohort.ts` |
| Verifiable results | Every scan gets a SHA-256 receipt, signed with Ed25519 when `RECEIPT_PRIVATE_KEY` is set. `POST /api/verify` checks a receipt | `lib/scoring/receipt.ts` |
| Reasons to come back | Watchlist with score changes over time (stored in the browser), share pages `/s/[idea]`, `/pulse` leaderboard, `?q=` links | `components/watchlist.tsx`, `app/s`, `app/pulse` |
| Accuracy and trust | Synonym-based query expansion, duplicates removed across sources, public `/methodology` page, 20-idea gold set, `pnpm calibrate` script | `lib/core/expand.ts`, `lib/core/dedup.ts`, `lib/calibration` |
| Reliability | 20-minute scan cache, identical in-flight scans merged into one, per-IP rate limit (20 scans per 10 minutes), badly degraded scans not cached | `lib/core/cache.ts`, `lib/core/ratelimit.ts`, `lib/scan.ts` |
| Docs | CHANGELOG, README section, council and premortem notes, published calibration, `.env.example` | `docs/` |

## Checks I ran (on this machine)
- `pnpm typecheck` passed. `pnpm test` passed 26 of 26 (16 new). `pnpm build` passed and produced all 16 routes.
- **Live end-to-end scan against the real APIs:** "AI code review agent" scored 76 (Saturated), confidence 84%, Gold Rush quadrant (demand 64, rising). 4 duplicates were removed. A repeat scan hit the cache in 1 ms, and the MCP `tools/call` returned a summary plus the evidence capsule.
- **Live calibration on the 20-idea gold set:** rank correlation with the expected order (Spearman) 0.83, 81% of idea pairs ranked in the same order, and 19 of 20 within one verdict band. Misses are listed in `docs/CALIBRATION.md`: niche lanes like SOC2 evidence collection scored "Open lane" when "Early movers" was expected. The ranks and bands in the gold set are my own estimates, not an outside expert's.

## Gaps I found and how they're covered
Idea-reality-mcp already offers an MCP idea check. I covered it by shipping MCP support too and competing on evidence depth: 10 sources, receipts, published calibration. The other gaps were stateless one-off scans, rate limits on launch day, doubts about the score, and screenshots nobody can verify; each has a fix in the table above. Reddit blocked unauthenticated requests from this server (403). The app leaves Reddit out of the score in that case, and adding Reddit OAuth credentials fixes it.

## Still to do
1. **Merge PR #3.**
2. In Vercel, set `GITHUB_TOKEN`, `OPENALEX_API_KEY`, `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` and `RECEIPT_PRIVATE_KEY`.
3. List the server on MCP directories (Glama, mcpservers.org, Smithery). Add a repo description and topics.
4. Server-side email alerts for watched ideas (needs a key-value store plus Resend), a Product Hunt adapter, and embedding-based query expansion.
5. **Revoke the GitHub token shared in the task** (`ghp_PBUu…`). It was posted in plain text.
