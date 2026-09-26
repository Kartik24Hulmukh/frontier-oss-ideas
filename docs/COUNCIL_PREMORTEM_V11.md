# v1.1 Council, Premortem & Fixes — 2026-09-26

Inputs: Final-Report-4, 100× Playbook, GTM Master Council Verdict (2026-09-26), LEVERAGE_MAP.csv, full repo read.

## Council (five seats) — converged decision

| Seat | Position | Resolution |
|---|---|---|
| Product | Ship the Supply × Demand battlefield; a score alone is one-and-done | **Shipped** — 3 demand adapters + quadrant engine + UI |
| Distribution | idea-reality-mcp owns “pre-build check”; reach parity *now* | **Shipped** — stateless MCP server at `/api/mcp`, `/agents` install page, `llms.txt` |
| Trust / Research | Metrics get cited only if formula + failures are public | **Shipped** — `/methodology`, 20-idea gold set, live `pnpm calibrate` (ρ 0.83, 81% pairwise, 19/20 within one band) |
| Revenue | Funds pay, founders don’t | **Shipped** — `/api/cohort` + `/funds` demo (novelty rank, idea-twin collisions, CSV) + `/pricing` |
| Reliability (red team) | First HN spike melts unauth GitHub | **Shipped** — TTL/LRU cache, in-flight coalescing, per-IP rate limit, degraded scans not cached |

Decision: position = **“Simultaneity” as the citeable metric**; the app is its reference implementation. Kill list unchanged: no generic validation, no per-report AI essays, no third product.

## Premortem → fix (all in this PR unless marked NEXT)

| # | How it dies | 100× fix |
|---|---|---|
| F1 | Occupied agent niche | Compete on evidence: 10 sources, confidence, receipts. MCP parity shipped; registry listings NEXT (Glama, mcpservers.org, Smithery). |
| F2 | Third validator in a crowded lane | Battlefield quadrant + “we tell you if you’re alone”; never a viability score. |
| F3 | Stateless one-and-done | Watchlist with score deltas + share links `/s/[idea]` + `/pulse` leaderboard. Server-side email alerts NEXT (needs KV + Resend). |
| F5 | Rate-limit collapse | Cache (20 min), coalescing, 20 scans/10 min/IP, `GITHUB_TOKEN` + Reddit OAuth documented. |
| F6 | Score-trust crisis | Published gold set with every miss named; expansions & collapsed duplicates shown on every scan. |
| F7 | Screenshots are unverifiable | SHA-256 receipts always; Ed25519 signatures with `RECEIPT_PRIVATE_KEY`; `POST /api/verify`. |
| F8 | Demand channel blocked (Reddit 403 from datacenters — observed live) | Graceful exclusion + coverage %, app-only OAuth path. |
| F9 | Keyword blind spots (“AI code review” vs “PR reviewer”) | Deterministic lexicon expansion now; embedding expander behind same signature NEXT. |
| F10 | Calibration misses on niche-but-real lanes (e.g. SOC2 evidence → Open lane) | Tracked in `docs/CALIBRATION.md`; next: domain-term weighting + Product Hunt adapter. |

## Live verification (this machine, real APIs)

`AI code review agent` → Simultaneity 76 Saturated, confidence 84%, **Gold Rush** (demand 64, rising), 4 duplicates collapsed, cache hit on repeat in 1 ms, MCP `tools/call` returns summary + capsule.
