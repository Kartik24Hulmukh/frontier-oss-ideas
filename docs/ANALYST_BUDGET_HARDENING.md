# Analyst spend-boundary hardening — 26 September 2026

## Decision: ship safety fixes; do not certify commercial launch

Starting main: `345a1ac`. Both attached continuation reports were read. They agree that production provisioning and independent validation are still incomplete. `Founder_Work.md` is not present among the attachments or the 118 tracked repository files; its unseen instructions cannot be claimed as followed. The supplied MP4 is a 30-second prior-run replay with no audio; a 3-second contact sheet was inspected, not a frame-by-frame audit.

## Done / Partial / Missing / Broken

| State | Finding |
|---|---|
| Done, reverified | Baseline: 60 TS + 5 gate tests; public search, digest verification, tamper rejection; live gateway 13/13 bounded fault-injection checks. |
| Broken, fixed here | Analyst endpoint absent from global admission matcher. |
| Broken, fixed here | Timeout/network-error refunds could recycle potentially billed token quota; fixed-window settlement could debit a newer window. |
| Partial, improved | Shared LLM quota now implemented using atomic Redis Lua and conservative rolling reservations. Production dispatch fails closed without Redis. Real Upstash outage/concurrency tests remain. |
| Partial | Model breakers and data-source pacing remain per-instance. Shared request/token admission does not turn these into globally coordinated breakers or minute-level provider quotas. |
| Missing in production | Redis admission, trusted signing keys, Reddit OAuth, encrypted rotated LLM credential. |
| Missing product evidence | Independent calibration, pilots, measured decision changes, retention and willingness to pay. |
| Missing scope | Durable accounts/watchlists, billing/entitlements, webhook jobs, immutable hosted snapshots. Local watchlists and proposal pricing must not be sold as these. |

## Premortem → implementation

1. **New endpoint bypasses safety controls:** include `/api/analyst` in the shared proxy and regression-test the matcher.
2. **Autoscaling multiplies spend caps:** reserve worst-case route tokens atomically in Redis before any model dispatch; fail closed in production if Redis is missing, partial, malformed or unavailable. Health exposes budget scope without credentials.
3. **Provider finishes after our timeout:** never refund uncertain work. The rolling shared window includes the route deadline. No per-attempt Redis roundtrip, preserving fast local failover.
4. **CJK/emoji undercounted:** UTF-8 byte-based prompt reservations plus framing replace chars/4. This is conservative accounting, not a certified provider tokenizer or dollar-billing cap. Configure provider-side spending limits too.
5. **One request spends the cap four times:** cumulative per-request admission includes every attempted model, not just the latest attempt.
6. **Half-open breaker stuck after budget refusal:** release unused probe leases on local budget/deadline refusal and request/auth errors.
7. **Green canary hides enabled unbounded LLM:** strict release gate now rejects an enabled analyst without distributed token budget configuration.

## Actual parallel council

Three separate Melious model requests ran concurrently for SRE/security, research integrity and product/traction. A second round supplied the actual proposed router and Lua code. The first round exhausted completion budgets for two reviewers; those were not counted as completed final reviews. Second-round reviewers all supplied critiques (one response truncated). This is model consultation, not human validation or independent execution agents.

Chair decisions:
- **Accept:** production must fail closed by default, not rely only on an operator remembering REQUIRE_DISTRIBUTED_LIMITS. Implemented and tested.
- **Reject for this safety increment:** refund all unused reservations. Conservative no-refund accounting deliberately sacrifices capacity to avoid ambiguous billing and cross-window races. Future exact settlement needs reservation identities, authoritative provider total usage and rollover tests.
- **Clarify:** local + Redis counters are separate ceilings, not two provider charges. Local safety may reject earlier and waste a shared reservation; this is availability cost, not spend amplification. Optimize only after real workload measurement.
- **Reject factual errors:** Reddit OAuth supplies demand data, not user identity; receipt signatures do not authenticate clients; health configuration booleans are not credential leaks.
- **Agree:** no commercial-launch approval until operational and customer-validation gates pass.

## Verification and limitations

- 66 TypeScript tests + 6 release-gate tests pass after changes; typecheck and optimized Next build pass.
- Live Melious tests use the existing four model IDs, with injected 429/5xx/timeouts in front of real upstream calls. This is a bounded smoke/torture run, **not provider saturation testing**. See `evidence/gateway-after.json`.
- Lua executed through fakeredis + Lua: 100 concurrent reservations, 10 accepted at 100 tokens, 90 rejected, ceiling 1000. This is an emulator test, **not deployed Redis evidence**.
- Strict production gate remains red; see `evidence/production-before.json`. Healthy HTTP alone is not launch approval.
- Under-200ms means router switching after a failure is observed, not model response time or failure-detection latency.
- Full in-depth review of all 118 files has not been completed in this increment. No claim that every premortem risk is resolved or that value/traction has improved 100x.

## Operator sequence

1. Revoke/rotate both credentials pasted in task text; store fresh least-privilege secrets only in the deployment secret store.
2. Provision Upstash; configure identical budgets/window/deadline across replicas; enable REQUIRE_DISTRIBUTED_LIMITS. Test concurrent traffic and Redis outage in staging. Keep provider-account hard spend limits.
3. Provision receipt signing and independently pinned public key; configure Reddit under approved access terms; investigate strict source-health failures.
4. Enable the rotated Melious key only after admission works. Run gateway torture and a real HTTP analyst scan in staging and production.
5. Run strict deployment gate, latency/coverage monitoring, rollback drill, external security review and held-out calibration before commercial launch.
