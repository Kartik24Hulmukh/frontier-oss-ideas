# Simultaneity Index 1.3.0
## Provider pacing, circuit breakers, and 50-lane calibration publication

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
