# 1.5.1 — verification before promotion

26 September 2026. Public research beta remains the release scope. No measured 100× claim.

## Review boundary
Read both attached ship records in full and inspected the repository at 83c7115. Founder_Work.md
is absent. Inspected the video using a chronological contact sheet and decoded all 908 frames;
it is a previous side-by-side run, not an additional source archive. This is **not** a claim that
every repository file or every video frame was semantically reviewed. Targeted deep review covered
admission, token accounting, router, receipts, health, release gates, their tests and related docs.

## Premortem findings and implemented fixes
| Failure | Finding | Fix / evidence |
|---|---|---|
| Autoscaled instances spend different windows | Scan bucket used Date.now; prior server-time claim only held for tokens | Redis TIME chooses bucket inside atomic Lua; identical request under extreme app clock skew test |
| Emulator green while actual script broken | HTTP emulator recognizes script substrings; never executes Lua | Export production script; real Redis test executes it under 100 concurrent requests; CI Redis 7 service |
| Wrong deployment version reported | Live build 83c7115 (package 1.5.0) reported health 1.3.1 | Import package version; regression test |
| Invalid backend called distributed | Presence-only health mislabelled partial/malformed endpoint configuration | Shared budget + admission health report blocked-invalid-config; URL parsing regressions |
| Signer mistaken for explicit issuer pin | trustedReceipt derived a trusted public key from private signer if pin absent | Require RECEIPT_PUBLIC_KEY explicitly; test signer-only false and pinned true |

The changes are bounded improvements, not quantified 100× fixes. Real Redis here was 6.2 from
redislite; CI is configured for Redis 7. Emulator tests remain useful HTTP-contract/fault tests,
not proof of managed deployment behavior. Migration changes key namespace: follow pause/drain/
full-window instructions in LOOPBACK_LIMITER.md; do not mix versions against live quotas.

## Verification executed
- Clean npm ci: 52 packages, audit reported zero vulnerabilities.
- Baseline: 79 TypeScript tests + 6 gate tests passed.
- After changes: **84 TypeScript tests + 6 gate tests, zero failures or skips**, with real Redis enabled.
- Production next build: passed, including TypeScript checking.
- Local production-server beta canary: **6/6**, health → live-source scan → receipt verification → tamper rejection.
- Bounded live Melious torture: **13/13**. All four configured models answered. Injected 429/5xx/
  timeout failover, auth-stop, breakers and token ceilings passed. Observed failover dispatch gaps 0ms.
  This measures time **after failure detection**, not recovery from a hung gateway in <200ms;
  timeout detection itself was ~801ms in the injected timeout check, and normal attempt timeouts are longer.
- Existing production strict canary: **7/11**; distributed-configured, issuer-trust, healthy-supply,
  healthy-demand failed. Raw JSON retained under docs/evidence.

## Council-style decision (one assistant, not independent agents)
No agent-spawning capability was available. Parallel test/build/gateway processes are not agents.
These are explicitly simulated review perspectives:
- Product: prefer a paid feature launch now to test demand.
- Research: reject that until blinded relevance review and decision-change evidence exist.
- Reliability: provisioning and source-health gates remain blockers; emulator success is insufficient.
- Security: retain explicit pinning and secret rotation; do not put chat tokens in deployment config.
- Founder decision: ship the small trust-boundary fixes, keep beta scope, defer commercial promises.

## Done / Partial / Missing / Broken
**Done this release:** server-time admission, real-Lua regression coverage, config/version truth,
explicit pin requirement, local end-to-end canary and live router exercise.
**Partial:** distributed implementation tested locally but not provisioned in production; browser
watchlist is not durable accounts; confidence is still a heuristic. Review is targeted, not exhaustive.
**Missing:** independent calibration, consented analyst pilots/retention/WTP, accounts, billing,
entitlements, webhooks, operator provisioning/rotation, production load/outage/rollback drill.
**Broken production gate:** distributed admission and issuer trust absent; supply/demand health degraded.

## Launch decision / next accountable steps
1. Operator rotates exposed GitHub/Melious credentials; use least-privilege runtime GitHub token.
2. Operator provisions managed Redis, sets REQUIRE_DISTRIBUTED_LIMITS=true, deploys offline-generated
   signing key plus independently published public pin, and obtains approved Reddit access.
3. SRE runs concurrent/outage tests and rollback drill on staging; checks new deployment SHA and
   package version; strict gate must pass on the deployed artifact. Local evidence is not a substitute.
4. Research runs the existing held-out review; founder recruits five consented analysts. Measure
   changed decisions, voluntary week-2 repeat and WTP before charging. Freeze targets in
   LAUNCH_DECISION_2026.md rather than move them after results.
5. Commercial launch is **NO-GO** until operational and customer-evidence gates pass.

Do not commit or deploy the task's exposed tokens. Revoke them after this authorized shipping run.
