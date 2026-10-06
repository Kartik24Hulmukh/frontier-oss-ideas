# Simultaneity Index 1.6.12 — root-cause safety increment

Baseline main: `242c6ec07b98bfc7c993186f507cbfb131e0bf13`. Source delivery: [PR54](https://github.com/Kartik24Hulmukh/frontier-oss-ideas/pull/54), merged SHA `e4eae5cecd40a9324a24ee76485548454a5d2a6d`. Date:6October2026.

**Outcome: verified research-beta repairs, NOT production/commercial GO.** Do not weaken a gate or infer customers/traction from the model council. Founder/research/operations decisions remain external evidence requirements.

## What changed

- crowding-1.4 specific workflow anchors, generic-weather abstention, common PR/diff aliases, explicit negation/homonym regressions, and an always-applied unseen-tail bound.
- demand-lexical-window-v1 runtime contracts, matched365-day qualification, audit retention, sampled-count-only heat, aggregate abstention and unknown trend.
- Exact issued-snapshot memos, bounded immutable Redis/local storage, no silent rescan, capsule-only citations, client identity/citation checks and deterministic no-supply refusal.
- Redis actual-call provider quotas/cooldowns, conservative anonymousGitHub10, server-time rolling reservations and fail-closed configured/required dependencies. Breakers/hedge governor remain explicitly process-local.
- Atomic extra-attempt dispatch governor; aggregate settled-attempt usage, separate known totals/unknown billing/winner/reservation fields; no cancellation refunds. Mandatory model Retry-After no longer shortened by exponential cooldown caps.
- Actual signer/pin readiness, invalid configured signer fails closed, `/api/ready` probes Redis and validates signer rather than advertising env-presence readiness. `/api/health` remains liveness.
- No runtime dependency/framework expansion; package/lock change is version-only. This follows the council's integrity-first choice rather than an unfocused OSS integration spree.

## Verification evidence

| Evidence | Result | Scope |
|---|---|---|
| `npm run verify` with actual Redis7.4.6 | Typecheck/build;1692TS+14JS passed, zero skips | Stable local integrated tree |
| Shared quota/backoff drill |17 assertion groups passed | Two local processes,1h clock skew, real Redis6390 SIGKILL/AOF restart; not managed cloud |
| Snapshot Redis drill |5 cases passed | Separate local processes, real Redis6389/DB13, exact-receipt/outage/TTL/recovery |
| Browser journey |15 checks passed | Real Chromium against built localhost;3 synthetic race/failure cases labelled |
| Analyst browser |9 checks passed | Real Chromium, all search/memo APIs mocked; not provider/model evidence |
| Fresh local strict canary |13/17, FAIL | Distributed configuration, issuer trust, healthy supply, healthy demand remain red |
| `/api/ready` unprovisioned local |503, ready=false | Correct fail-closed operational dependency report |

See `docs/evidence/continuation-1.6.12/` and the six independent reports under `docs/council-1.6.12/`. Earlier report results may predate later owner fixes; this release record and stable integrated verification supersede those timing differences.

## Exact deployed source check

The public deployment returned version1.6.12 and exact source SHA `e4eae5cecd40a9324a24ee76485548454a5d2a6d`. Fresh strict gate: **13/17, FAIL**; same four checks remain red. See `strict-code-deployment.json`. The bounded public HTTP smoke also passed14 checks on that exact build; `/api/ready` returned503 with missing Redis/signer. No waiver, synthetic success or self-trust was used. PR54 current-head CI verify, GitGuardian and Vercel checks passed; CI run: https://github.com/Kartik24Hulmukh/frontier-oss-ideas/actions/runs/37494664313.

## Council reconciliation

The original product review reproduced generic-weather confidence100. That case is now confidence0 with no qualified supporting links. Later PR/diff synonym, code-of-conduct and explicit code-review-negation regressions also pass. These are hand-written synthetic falsifiers, not held-out human calibration. Role classification, broader homonyms/constraints, duplicate identity and independent artifact support remain unvalidated. The product report's earlier specific probes remain historical observations, not claims about the final code.

The architect's long LLM Retry-After dissent was fixed by the LLM owner. The User Advocate's prompt-only demand strategy caveat was closed with a deterministic no-supply gate. Discussion-only links remain inspectable in the deterministic scan/brief; no strategic model memo is dispatched.

## Still NO-GO

- Managed Redis provisioning/required-mode rollout and exact-deployment multi-instance/outage/load/rollback/on-call evidence.
- Operator-controlled Ed25519 custody, separately trusted pin publication, and rotation/revocation of exposed credentials.
- Approved provider credentials/access/terms and current complete healthy supply/demand canary; PyPI CAPTCHA/partial sources and Reddit/archive degradation are not zero-market evidence.
- Independent held-out semantic/role/identity adjudication;50-lane/two-reviewer existing research gate has not been performed.
- Actual consented analyst decision utility, voluntary repeat tasks and genuine budget-owner/pilot commitments. No users, revenue, retention or traction were fabricated.
- Billing/accounts/alerts/webhooks and other unimplemented historical roadmap promises remain unimplemented; historical requirements are not all completed.

Optional Melious remains disabled without an approved funded/rotated account. No live model successes or <200ms hung-request recovery are claimed. Fast local failover dispatch is a different metric from provider completion, billing and fleet backoff.

## Audit boundary

Combined independent read ledgers extend302 baseline entries from160 scoped reads to294 claimed full-read snapshots. Eight exclusions remain: two generated requirement CSVs (all records parsed, not exhaustively semantically reread), two lockfiles (structural/version checks), three binary icons and a historical public-key artifact. New authored files have their own owner reviews. This is NOT “every file fully reviewed” or production acceptance for every item. The new state map preserves that distinction and hashes the delivery snapshot.
