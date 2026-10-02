# Release 1.6.7 — portable verification, bounded build, fresh live gateway evidence

**2 October 2026 · Research beta (strict production gates remain blocking)**

## Scope

1. **Constrained-build portability (merged as PR #46).** `npm run verify` is pnpm-free and
   `next.config.mjs` caps Next build workers at two (`experimental.cpus`) so constrained
   runners stop failing with `EAGAIN`. Verified here again through the full `npm run verify`
   path after the version bump.
2. **Fresh live Melious gateway evidence (honest failure).** `scripts/llm-torture.ts` was run
   against the live gateway on 2026-10-02 with real credentials and no synthetic completions
   (`docs/evidence/melious-torture-live-2026-10-02.json`, schemaVersion 2,
   `syntheticCompletions: false`).
3. **Version 1.6.7** with changelog and README banner recording the corrected, honest state.

## Live gateway result — 2/13 gates, upstream credit exhaustion

All four routed models (GLM-5.3, GLM-5.3 Flash, Kimi K3, Qwen 3.8 27B) returned
`HTTP 429` on direct completion attempts; the failover chains then met the same upstream
429, so no completion gate can pass while the account has no credits. This is preserved as
failure evidence, not converted to a green result:

| Gate | Result | Reading |
|---|---|---|
| `budget-per-request-ceiling` | PASS | Token ceiling rejects before any network dispatch |
| `auth-error-stops-chain` | PASS | Invalid key stops after one call (`401`) |
| `live-*` (4) | FAIL | Upstream `429` on every model — insufficient credit |
| `failover-429-*`, `failover-5xx-cascade`, `failover-gateway-timeout` | FAIL | Failover dispatch itself worked (`failoverMs: 0`, breakers tripped); fallbacks were also `429`, so no completion was served |
| `breaker-short-circuit` | FAIL | Breakers correctly held open, but then all models were open |
| `budget-window-ceiling` | FAIL | Window reservation accounting is conservative; no live answer to admit |

Routing invariants that do not require a credit balance (budget ceilings, auth-failure chain
stop, breaker tripping, zero-waste failover dispatch) held. Model **completion** availability
is not established and is not claimed. The historical quota-to-synthetic-200 artifact remains
explicitly invalid for live-success evidence.

## Verification performed

- `npm run verify` (npm-only path) — typecheck, 373 tests passed / 0 failed / 1 skipped
  (real-Redis integration), production build compiled all routes with bounded workers.
- JavaScript release-gate tests 10/10.
- Live torture evidence written with `--output`; exit code non-zero, failures preserved.

## Not changed

Release decision is unchanged: **public research beta**. Distributed admission (Redis),
independent issuer pin, provider credentials, source-health canaries on the deployed
environment, durable watchlists/billing, independent calibration and consented analyst
pilots remain open per `PRODUCTION_GATES.md` and `LAUNCH_DECISION_2026.md`.
