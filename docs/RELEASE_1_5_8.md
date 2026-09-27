# Simultaneity Index — 1.5.8 release scope

## What this increment closes
The 1.5.7 record left three non-operator-gated defects in the Melious router path; this release fixes all three and proves them with unit tests plus a fresh live torture run against the real gateway.

| Failure mode at launch | Obvious patch | What shipped (1.5.8) |
|---|---|---|
| `hedge_cancelled` attempt latency was measured from the *last* dispatch, not the cancelled attempt's own dispatch, so operator-visible hedge telemetry understated how long a hung primary stayed in flight | Rename a variable | Per-attempt dispatch recorded in the in-flight map; `hedge_cancelled.latencyMs` is now that attempt's own in-flight span; regression test asserts it spans the primary's hang |
| `parseRetryAfter` read the wall clock for HTTP-date `Retry-After` headers while the rest of the router is injectable-clock deterministic, so cooldown math was untestable and skew-prone | Document it | `parseRetryAfter(value, now)` with the router passing its injected clock; HTTP-date and seconds forms covered by clock-injected tests |
| Operators could see breaker state but not *why* a primary never learns: gateway refusals (404/model_unavailable) left no provenance, so `learned:false` was indistinguishable from a router bug | Log lines | Bounded per-model refusal ring + `availability` provenance in `/api/health → llm.availability` (`refusals`, `lastRefusalAt`), never key material; test asserts a 404 primary surfaces and a served model does not |

## Verification
- `tsc --noEmit`: clean.
- Full suite: 112 passed / 0 failed / 1 skipped (CI-only real-Redis test); three new tests (hedge-cancel provenance, clock-injected Retry-After, refusal availability).
- Live torture vs real Melious gateway (`pnpm llm:torture`, key from environment only): **ALL GATES PASSED** — every model answers directly (glm-5.3 1301ms, glm-5.3-flash 667ms, kimi-k3 1540ms, qwen-27b 4396ms); 429 failover 0ms on all three profiles (<200ms gate); 5xx+504 cascade failover 0ms; hung-gateway timeout failover 0ms; breaker short-circuit; per-request and rolling window token ceilings enforced before network; invalid key stops chain after one call. Evidence: `docs/evidence/gateway-1.5.8.json`.
- Melious gateway stress (section 5 of the mission): routed across GLM-5.3, GLM-5.3 Flash, Kimi K3 and Qwen 3.8 27B with automatic token-budget ceilings, sub-200ms failover and 429/5xx circuit breakers — all enforced and observed live.

## Honest limits (unchanged)
- The four production gates (managed Redis, published issuer pin, approved Reddit access, rotated secrets) remain operator-gated and were not weakened.
- No 100x gain is claimed; calibration remains author-estimated; pilots and willingness-to-pay evidence are still required before any paid launch (see `docs/LAUNCH_DECISION_2026.md`).
- Refusal provenance observes the gateway; it does not fix upstream model availability.
