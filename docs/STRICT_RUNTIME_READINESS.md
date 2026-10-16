# Strict canary must probe runtime readiness

## Verdict / defect

[VF] The previous strict canary checked liveness/configuration and scan integrity but never requested `/api/ready`. A simulated deployment with healthy configuration, trusted receipts and a fresh complete scan could pass despite unavailable operational dependencies. Three of four initial regression tests reproduced this false-green behavior.

[OP] Tighten acceptance; do not relax healthy-source, issuer, freshness or distributed-budget requirements.

## Repair

- Strict `runGate` requests `/api/ready` once per canary, before its single fresh search. Beta retains its explicitly non-production scope and does not assert operational readiness.
- Strict evaluation requires HTTP 200 and the actual readiness contract: `ready:true`, operational-only scope, healthy Redis, valid signer, matching issuer, positive integer pin count and receipt readiness.
- Expected HTTP 503 is preserved as a failed `operational-readiness` check, not an ignored error or a retry. The canary still collects scan/provenance/tamper diagnostics where those endpoints work.
- Unexpected status, transport or JSON failures remain hard failures. No configuration-based or synthetic fallback.
- Direct callers of strict `evaluateGate` must supply the observed readiness response as the sixth argument `{status, body}`. Missing evidence fails closed. Existing fixture tests now supply an explicit synthetic valid readiness record.

## Verification / evidence

- Before: 4 new tests, 3 failed and 1 passed. After: all 22 JavaScript gate tests passed, zero skips, including unavailable/missing/contradictory payloads, valid readiness, beta separation and unexpected HTTP 401/404/429/500 rejection.
- Actual bounded production canary on `dd9c315901e4c0c1772f021b501478b2bc20555f`: **13/18 checks passed, NO-GO**. Five failed checks: operational-readiness, distributed-configured, issuer-trust, healthy-supply, healthy-demand. The extra failed check is newly detected evidence, not a new readiness claim. Raw report: `docs/evidence/runtime-readiness/production-baseline.json`.
- No managed-store provisioning, signer creation/self-trust, secret use, unbounded public load or live Melious testing.

## Premortem / state-map delta

Configuration survives while Redis/signer runtime breaks → liveness-only gate confuses configured with working → require fresh operational probe and fail closed → deterministic before/after plus actual failed canary. `scripts/release-gate.mjs` remains 🟡 Partial for launch acceptance; its targeted false-green repair is verified. New fixtures/receipts are ✅ Done in their stated synthetic/local scope. Complete exact-SHA multi-instance/outage/load/rollback, source-policy and semantic/customer gates remain open under `GO_RUNBOOK_1_6_12.md`.

This adds one technical check; historical 17-check reports remain historical. Even 18/18 would be a bounded canary, not proof of commercial readiness, source recall, operator key custody or independent customer utility.
