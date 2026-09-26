# Simultaneity Index 1.3.0 — combined release notes

This release landed in two parts: **Part A** (PR #10) shipped the AI analyst memo with resilient Melious model routing; **Part B** (PR #11) shipped provider pacing, adapter circuit breakers, the receipt keygen and the 50-lane calibration publication.

---

## Part A — AI Analyst memo with resilient Melious model routing (PR #10)

## What shipped
- `lib/llm/router.ts`: model router over the Melious OpenAI-compatible gateway across **GLM-5.3**, **GLM-5.3 Flash**, **Kimi K3** and **Qwen 3.8 27B** with three route profiles:
  - `quality`: glm-5.3 → kimi-k3 → qwen3.8-27b → glm-5.3-flash
  - `fast`: glm-5.3-flash → qwen3.8-27b → glm-5.3 → kimi-k3
  - `reasoning`: kimi-k3 → glm-5.3 → qwen3.8-27b → glm-5.3-flash
- **Token-budget ceilings** enforced *before* any network call: per-request ceiling (prompt estimate + capped completion), rolling window ceiling per instance, per-model completion caps; reservations are settled to actual gateway `usage`, so concurrent requests cannot overspend.
- **Failover under 200 ms**: no sleeps between attempts; open breakers are skipped in O(1); every attempt records `failoverMs` and the result reports `maxFailoverMs`.
- **Circuit breakers** per model: HTTP 429 opens immediately and honours `Retry-After`; 5xx, 504/524 gateway timeouts, hung upstreams (per-attempt ref'd abort timer), network errors and empty completions trip after 2 failures; single half-open probe with exponential cooldown (cap 5 min); 404 model-removed opens for 5 min; 401/403 stop the chain (a bad key fails everywhere — do not burn quota).
- `lib/llm/analyst.ts` + `POST /api/analyst`: grounded diligence memo (Verdict, cited Why, Open wedge, Kill criteria, 7-day falsification test). Evidence is sanitised, numbered `[E#]`, fenced as untrusted data (prompt-injection defence); citations to non-existent evidence are rewritten to `[uncited]` and counted. Stricter per-client limit (`ANALYST_RATE_LIMIT`, default 6/10 min). Returns 503 with deterministic-brief fallback when not configured; 429 when budget is exhausted.
- UI: **AI analyst memo** button beside the decision brief, labelled as AI narrative not covered by the receipt.
- `/api/health` now reports `llm` (configured, breaker states, budget) — never the key.
- `scripts/llm-torture.ts` (`pnpm llm:torture --output evidence.json`): live gate against the real gateway with injected 429/5xx/504/hang faults.

## Verification
- 60 tests pass (55 TS incl. 6 new router/analyst tests, 5 canary); `tsc` clean; `next build` clean.
- Local production E2E: `/api/analyst` for “AI code review agent” → 200 in 4.7 s, score 76, served by glm-5.3-flash, 10 valid citations, 0 invalid.
- Live torture run 2026-09-26T14:52:16.671Z: **13/13 gates passed**.

| Gate | Result | Detail |
|---|---|---|
| `live-glm-5.3` | PASS | `{"model": "glm-5.3", "ms": 869, "tokens": 82}` |
| `live-glm-5.3-flash` | PASS | `{"model": "glm-5.3-flash", "ms": 766, "tokens": 90}` |
| `live-kimi-k3` | PASS | `{"model": "kimi-k3", "ms": 1341, "tokens": 191}` |
| `live-qwen3.8-27b` | PASS | `{"model": "qwen3.8-27b", "ms": 3230, "tokens": 304}` |
| `failover-429-quality` | PASS | `{"served": "kimi-k3", "failoverMs": 0, "attempts": ["rate_limited", "ok"]}` |
| `failover-429-fast` | PASS | `{"served": "qwen3.8-27b", "failoverMs": 0, "attempts": ["rate_limited", "ok"]}` |
| `failover-429-reasoning` | PASS | `{"served": "glm-5.3", "failoverMs": 0, "attempts": ["rate_limited", "ok"]}` |
| `failover-5xx-cascade` | PASS | `{"served": "qwen3.8-27b", "failoverMs": 0, "attempts": ["server_error", "timeout", "ok"]}` |
| `failover-gateway-timeout` | PASS | `{"served": "qwen3.8-27b", "failoverMs": 0, "timeoutAttemptMs": 801}` |
| `breaker-short-circuit` | PASS | `{"attempts": ["kimi-k3:circuit_open", "glm-5.3:ok"]}` |
| `budget-per-request-ceiling` | PASS | `{"error": "budget_exceeded"}` |
| `budget-window-ceiling` | PASS | `{"first": 80, "second": "ok", "third": "budget_exceeded", "budget": {"used": 159, "windowTokens": 900, "perRequestTokens": 2000, "windowMs": 60000, "r` |
| `auth-error-stops-chain` | PASS | `{"attempts": ["glm-5.3:401"]}` |

## Operator actions
1. Add `MELIOUS_API_KEY` as a Vercel **encrypted** env var (Production). Rotate the key that was pasted in chat.
2. Tune `LLM_TOKEN_BUDGET_PER_WINDOW` to the monthly spend cap ÷ hours. Budgets and breakers are per instance; move them to Redis alongside admission for a hard global cap.
3. Re-run `pnpm llm:torture` after any gateway/model change.

## Boundaries
The memo is an AI narrative over receipt-covered evidence, not evidence itself and not covered by the receipt. Failover latency is router decision time, not upstream model latency (Kimi K3 is the slowest live model).

---

## Part B — Provider pacing, circuit breakers, 50-lane calibration (PR #11)

**Prepared 26 September 2026 · Release branch `release/1.3.0` · Engine target `1.3.0`**

## What this release adds on top of 1.2.3

| Change | Why (premortem vector) | Evidence |
|---|---|---|
| `lib/core/budget.ts` — BudgetGate token ceilings, CircuitBreaker, ModelGateway | #2 upstream rate-limit thrashing; founder directive on 429/5xx circuit breakers and sub-200ms failover | `tests/pacing.test.ts` |
| `lib/core/pace.ts` — shared per-provider minute ceilings wired through `pacedFetch` | GitHub Search is 30/min authenticated, 10/min anonymous — app admission alone cannot respect that | adapter tests |
| GitHub adapter: bounded 403/429 retry (≤5s, single) before degrading | Removes instant rate_limited verdicts on transient windows | mocked fetch tests |
| Demand adapters (Reddit / StackOverflow / Ask HN) paced + circuit-broken, classified `healthy/degraded/blocked` | A dead lane and an unmeasured lane are different products — demand outages must never flatten silently | demandStatusLabel |
| `scripts/receipt-keygen.mjs` — offline Ed25519 keypair generator with SHA-256 fingerprint | Unblocks the issuer-trust gate; keys never touch the repo | manual run |
| Version alignment 1.2.3 → 1.3.0 (package, health, MCP) | Honest versioning across all surfaces | `/api/health` |
| 50-lane calibration benchmark (ρ 0.84, 83.6% pairwise, 96% adjacent band) published in repo docs | Research gate: calibration data must ship with the engine, not live in chat | `docs/CALIBRATION_50_LANES.csv` |

## Remaining operator gates (unchanged — require deployment console access)
1. Rotate the GitHub PAT that was shared in chat; install a least-privilege search token in Vercel.
2. Provision Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN`), then `REQUIRE_DISTRIBUTED_LIMITS=true`.
3. Run `node scripts/receipt-keygen.mjs` offline; set `RECEIPT_PRIVATE_KEY`, publish + pin `RECEIPT_PUBLIC_KEY`.
4. Configure Reddit OAuth credentials; confirm demand health on the strict canary.
5. Optional model-gateway: set `MELIOUS_API_KEY` only as a deployment secret. Never in source.

## Verification
- `pnpm typecheck && pnpm test` pass locally (see CI).
- Live strict canary remains the promotion control: `node scripts/release-gate.mjs https://frontier-oss-ideas.vercel.app --strict`.
