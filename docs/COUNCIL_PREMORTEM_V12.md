# v1.2 Council, Premortem & Fixes — 2026-09-26

Evidence tags per Founder_Work.md: [VF] verified · [SI] strong inference · [WI] weak inference · [UA] assumption · [NE] missing evidence.

## State of reality before this release
- [VF] PR #3 (v1.1) was open and **could not merge** — it branched from `4a8c377`, parallel to PR #2. Production (`/api/health` → 1.1.0) had **no `/api/mcp`** (live 404), so the agent-distribution channel the v1.1 council called its decade bet was not actually shipped.
- [VF] typecheck, 26/26 tests and `next build` passed on the PR branch in isolation.
- [VF] PR #2 stdio MCP script framed messages with `Content-Length` headers; MCP stdio is newline-delimited JSON → real clients would hang. [VF] It sent `query`; the server tool expects `idea`.
- [VF] Canonical URL default pointed at a non-existent domain → wrong sitemap/robots/OG URLs.
- [NE] Zero stars, no usage analytics, no user interviews logged. Traction is **unmeasured**, not low or high.

## Council (five seats)
| Seat | Position | Decision |
|---|---|---|
| Distribution | Nothing ships until it is on `main`; then every scan must be able to leave the site | Reconcile + merge; badge + OG cards |
| Agents | Two MCP implementations will drift | One server (`lib/mcp.ts`), stdio is a thin bridge |
| Trust | Badges without method links become vanity | Badge links back to `/methodology` via README usage; score colour = verdict only |
| Reliability | Badges are fetched by GitHub camo from few IPs → would trip the per-IP limiter | Badge uses supply-only scan + 6h CDN cache, no per-IP limiter |
| Adversary | “Badge = vanity metric, not demand” | Accepted. Measure only badge-originated *scans* (referrer), not impressions |

## Premortem (it is Nov 2026 and this failed — why?)
| # | Failure | Fix shipped / next |
|---|---|---|
| P1 | Features never reached prod because PRs rotted | Merged via reconciled branch; CI on every PR [VF] |
| P2 | Agents installed the stdio script and it hung | Replaced by newline-JSON bridge, verified end-to-end against a local server (76 Saturated returned) [VF] |
| P3 | Shared links rendered as bare text → zero viral coefficient | Dynamic OG image, 8s scan budget with graceful fallback card [VF] |
| P4 | Badge traffic melts GitHub quota | s-maxage 6h + stale-while-revalidate 24h + LRU cache [SI] — watch Vercel logs |
| P5 | Cold-start scans exceed Vercel 10s hobby limit for OG crawlers | 8s race + fallback; `maxDuration` 30 on Pro [WI] |
| P6 | Nobody pays | Unchanged thesis: funds (cohort screening) pay, founders do not [UA]. **Next experiment:** 10 accelerator/fund outreach emails with a `/funds` demo on their last public batch; success = 2 calls booked in 14 days |

## One objective · one metric · one experiment
- Objective: get the MCP tool + badge into real builder workflows.
- Metric: weekly scans originating from MCP or badge referrers (add Vercel Analytics custom event — NEXT).
- Experiment: submit to MCP registries (official registry, Smithery, Glama, mcpservers.org) and post one Show HN with a badge in the repo README; kill signal = < 50 agent-originated scans in 21 days.

## Explicit NEXT (not claimed as done)
- Vercel KV + Resend for server-side watchlist alerts.
- Product Hunt adapter; embedding-based query expansion.
- Publish a standalone npm package for `npx simultaneity-mcp` (repo package is `private`).
