# 1.2.3 — Decision artifacts and executable promotion gates

26 September 2026. Status: public beta, NOT commercial-launch approved.

## Inputs and boundaries
Read the two supplied execution/release documents and inspected the public repository at `9c32cf8`. `Founder_Work.md` was not attached and is not present in this repository. No independent subagent execution facility was available: the council below is a single-assistant multi-perspective review, not independent agents or external validation. Historical research files are context, not verified September–October market forecasts.

## Implemented
- Locally generated Markdown Opportunity Brief: dated evidence snapshot, source health and notices, score contributions, sampled links, explicitly hypothetical differentiation, falsification experiment, and human decision worksheet. No extra scan, hosted query, analytics, or storage is needed to export.
- Capsule schema 1.2: model identifier `crowding-1.0` (scoring algorithm unchanged), normalized query, source statuses/counts/notices, source weights/contributions, actual query variants, duplicate count, demand statuses/contributions. Receipt integrity covers this metadata; existing 1.0/1.1 verification remains compatible.
- Verify input bounded at 256 KiB for richer exports (other endpoints retain their existing bounds).
- Canary: `node scripts/release-gate.mjs <base> [--strict] [--output report.json]`. Nonzero exit on failure; bounded timeouts for every request; no redirects; tamper check. Beta and strict modes are intentionally distinct. Strict checks configured shared admission, pinned issuer trust, all healthy supply/demand adapters, no fallback notice, and snapshot provenance. It does NOT prove Redis liveness/load capacity or commercial readiness.
- Manual GitHub Actions workflow saves the report even on failure. This is an executable promotion check, NOT an automatically enforced deployment-protection rule. Owner must wire promotion/alerts to its result.
- Reject invalid admission costs before Redis or local state access.
- Home headline no longer implies a measured unique-team count.

## Validation
Local: typecheck and optimized Next build passed; dependency audit reported no known vulnerabilities; 54 tests passed (49 TS + 5 canary tests). Production-mode HTTP smoke passed search, malformed bodies, cache, receipt/tamper, MCP initialize/list/call and cohort. Reference scan had score 76 and 100% supply coverage in this environment; this is not calibrated accuracy or load capacity.

Baseline live canary at 2026-09-26T14:22:21Z: version 1.2.2, five of ten strict checks failed (old capsule provenance, shared-admission configuration, pinned issuer trust, supply fallback notice, demand health). Full-coverage supply responses did not erase credential risk. Re-run after deploy and retain the JSON.

## Council and premortem (simulated roles)
| Perspective | Failure predicted | Decision / mitigation | Remaining evidence |
|---|---|---|---|
| Founder / buyer | More scores without a changed decision | Ship portable decision worksheet; target one accelerator analyst workflow | 5 consented pilot organizations; decision citations |
| Research | Unknown sources mistaken for absent competitors | Include source status + model + weights inside receipt | Held-out 40–60 lanes, 2 reviewers, disagreement intervals |
| Security | Upstream text executes in exported report | Escape Markdown/HTML text; only HTTP(S) links without URL credentials; tests | Independent review; secret rotation |
| Platform | Healthy homepage masks unprovisioned infrastructure | Strict canary fails without distributed config and trusted issuer | Redis multi-instance/outage game day; staging load test |
| Growth | Launch claims outrun actual usage | No invented revenue, adoption, partnerships or 100x promise | Signed pilot, denominators and paid conversion |
| Red team | Worksheet edits mistaken for signed evidence | Explicit receipt scope; companion JSON; tamper tests | Independent public key publication and rotation history |
| Operations | “Green gate” mistaken for launch approval | Report states excluded gates; workflow is manual only | Promotion protection + on-call alert ownership |

## September–October 2026 operating sequence
1. **Now / founder + platform:** revoke the exposed chat PAT after this authorized repository change; review audit logs. Replace invalid deployment search credential with dedicated least-privilege token, provision Redis with `REQUIRE_DISTRIBUTED_LIMITS=true`, configure Reddit and pinned Ed25519 receipt keys. Never reuse a broad repository PAT as the search service credential.
2. **Within 72 hours / platform:** run strict canary, record build SHA, run two-instance concurrent admission and Redis-outage tests in staging. Enforce nonzero-gate failure in release promotion. Do not run traffic-stress tests against public production.
3. **Next 14 days / founder:** recruit five accelerator/venture-studio design partners; manually deliver one weekly cohort + brief review. Ask for the actual decision taken and permission to record it. No contact lists, contracts, or outreach were fabricated or sent.
4. **October / research:** preregister 40–60 held-out ideas and two independent reviewers. Measure ranking disagreement, confidence intervals, coverage and decision utility, not just agreement with author estimates.
5. **Only after validation / engineering:** build durable authenticated watchlists and consented alerts, then billing/entitlements and deletion. Avoid adding a payment UI without the entitlement, webhook replay, cancellation and support lifecycle.

Pilot decision thresholds (hypotheses, not observed results): 5 qualified pilots; at least 60% of briefs cited in a build/stop/scope decision; one paid conversion before expanding into fund integrations. Record denominators and negative outcomes. North star: briefs cited in an actual build/capital decision per active organization/month. Stop or change positioning if fewer than 3 of 5 qualified pilots can name a changed decision after two review cycles.

## Primary-source research correction
GitHub Search has endpoint-specific limits, not the generic REST 5,000/hour budget: authenticated search is up to 30 requests/minute, unauthenticated up to 10/minute (code search differs). The scan can search a primary and a synonym query. A 400-work-unit/10-minute app quota does NOT establish compliance with that minute-level provider quota. Shared per-provider pacing and measured upstream request accounting remain open; do not claim configured Redis alone solves provider throttling.
Source: https://docs.github.com/en/rest/search/search#rate-limit (consulted 26 September 2026).

## Reproduce / rollback
```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm audit --audit-level high
pnpm start
# In another process:
node scripts/production-smoke.mjs http://localhost:3000
node scripts/release-gate.mjs http://localhost:3000 --output gate.json
node scripts/release-gate.mjs https://frontier-oss-ideas.vercel.app --strict --output production-gate.json
```
Rollback the release commit and redeploy the preceding known-good commit if the new export/contract breaks. Existing capsule versions remain supported. Do not call rollback a secret-rotation or infrastructure fix.
