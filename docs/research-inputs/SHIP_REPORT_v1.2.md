# Simultaneity Index: Ship Report v1.2 (2026-09-26)

Repo: https://github.com/Kartik24Hulmukh/frontier-oss-ideas · Live: https://frontier-oss-ideas.vercel.app

Evidence tags: [VF] verified · [SI] strong inference · [UA] assumption · [NE] missing evidence

## 1. Where things stood when I started
- [VF] PR #3 (v1.1 "Battlefield") was open and **could not be merged**. It branched from `4a8c377`, alongside PR #2, which had already been merged. GitHub returned "Pull Request has merge conflicts".
- [VF] Production had **no `/api/mcp`** (it returned 404), and `/api/health` reported 1.0.0/1.1.0. So the MCP agent channel, which the v1.1 council called its "decade bet", had never actually reached users.
- [VF] The PR #2 stdio MCP script used LSP `Content-Length` framing. MCP stdio uses newline-delimited JSON, so real clients would hang. It also sent `query`, but the server tool reads `idea`.
- [VF] The metadata, robots and sitemap URLs defaulted to `simultaneity-index.vercel.app`, which is not the real domain.
- [VF] `tsconfig.tsbuildinfo` (a build cache file) was committed.

## 2. What shipped (PR #3 merged as `6aae753`, PR #4 merged as `a596d8a`)
| Change | Why it matters |
|---|---|
| Merged PR #2 into PR #3. Kept v1.1; removed PR #2's duplicate files (a Reddit adapter that counted Reddit as *supply*, `quadrant-panel`, the old quadrant test, the broken stdio script) | v1.1 is on `main` and in production |
| `GET /api/badge?q=` README badge in shields style, CDN-cached for 6 hours, with no per-IP limit (GitHub fetches badge images from only a few IPs) | Distribution: every README that embeds it links back to the site |
| `/s/[idea]/opengraph-image`: a live social card showing score, verdict, quadrant and confidence. It waits at most 8 s for the scan, then shows a fallback card | Shared links show a preview card instead of bare text |
| `bin/simultaneity-mcp.mjs`: a zero-dependency stdio bridge that forwards to the hosted `/api/mcp` | One server implementation serves both transports |
| `GET /api/mcp` returns copy-paste configs for HTTP, `npx mcp-remote` and local stdio | Easier to install |
| `crowding_check` accepts `query` as another name for `idea` | Older PR #2 clients still work |
| `lib/site.ts` holds the canonical URL, and the Twitter card is now `summary_large_image` | Correct SEO and social URLs |
| Test glob quoted, tsbuildinfo untracked, health/MCP report 1.2.0 | CI behaves the same in every shell |
| CHANGELOG 1.2.0, README "Distribution surfaces", `docs/COUNCIL_PREMORTEM_V12.md` | Records the decisions |

## 3. Verification
- [VF] Local: `tsc` passed, **29/29 tests** passed, and `next build` succeeded with the `/api/badge` and OG routes.
- [VF] Local server: the stdio bridge `tools/call` for "AI code review agent" returned **76 Saturated, confidence 84%**. The OG image returned PNG 200 (49 KB). The badge returned "76 · Saturated".
- [VF] **Production after merge:** `/api/mcp` is live. Badge: "67 · Crowded". The live stdio bridge for "SOC2 evidence collection agent" returned 53 Crowded (conf. 77%). `/s/AI code review agent` renders.

## 4. The one thing you need to do (I don't have Vercel access)
- [VF] In production the **GitHub source shows "Source unavailable — excluded"**. That is why production scores 67 while the local scan with GitHub scores 76.
- [SI] Cause: no `GITHUB_TOKEN` in the Vercel project env, so the unauthenticated rate limit is exhausted.
- **Fix:** in Vercel → Settings → Environment Variables, add `GITHUB_TOKEN` (a fine-grained token with public read only). Do **not** reuse the repo-admin token from this task. Optionally add `RECEIPT_PRIVATE_KEY` so receipts are signed, then redeploy.
- Also rotate the token pasted into this task: it has admin rights on your repos and now appears in a chat log.

## 5. Council verdict and premortem (short)
- **Current bottleneck:** distribution into real builder workflows, not features. [OP]
- **One metric:** weekly scans that come from MCP or badge referrers. [NE] No analytics exist yet, so traction is *unmeasured*. It has not been shown to be high or low.
- **One experiment (21 days):** list the MCP server in the official MCP registry, Smithery, Glama and mcpservers.org. Add the badge to this repo's README and post one Show HN. **Kill signal:** fewer than 50 agent-originated scans.
- **Revenue hypothesis [UA]:** funds pay, founders don't. Test it by sending 10 accelerator emails, each with a `/funds` demo run on that accelerator's last public batch. Success = 2 calls booked in 14 days.
- **Premortem fixes still open (not claimed as done):** server-side watchlist alerts (Vercel KV + Resend), a Product Hunt adapter, embedding-based query expansion, a standalone npm package so `npx simultaneity-mcp` works (the repo package is `private`), and referrer analytics.
- No one can promise "100×" traction. This release puts the product in production and adds three sharing channels (MCP, badge, share cards) whose results can be measured.
