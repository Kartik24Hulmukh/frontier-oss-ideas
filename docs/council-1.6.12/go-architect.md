# Independent continuation architect — provider capacity and real Redis drills

## Executive verdict

[OP] Approve only the owned, bounded provider reservation/backoff repair for integration. **Production/commercial NO-GO remains.** Real local Redis evidence now replaces the earlier emulator-only gap for the tested concurrency/outage invariants; it is NOT managed-Upstash, staging, live-provider, deployment, load/SLO, privacy, calibration or customer evidence.

Start: main `242c6ec`. Shared working tree, no branch checkout/commit/merge by this architect. Founder brief, delivery status and prior architect/security reports were fully read before the independent first-pass proposal. No subagents, secrets, live providers, public stress or package edits. Parent owns admission/health/receipt and integration. Existing source-health expectation was changed by the parent, not by me.

**Important boundary:** all core/provider/LLM capacity source and all existing scripts/configurations listed below were studied; the requested complete remaining repository source study is **not complete**. Exact unread source files are listed below. Inventory is not semantic review; the state-map CSV was used only as a path inventory. Do not describe this handoff as a whole-repository audit or silently mark all 302 listed artifacts accepted.

## Independent first pass, before implementation

[VF] Existing `pace.ts` used process-local guards and universal25/min default. `admitScan` counted scans/work units, not primary/variant/fallback/retry calls. `github.ts` retried rate errors after at most5s. `pace.ts` ignored Retry-After; Stack Exchange supplied backoff in successful bodies that its adapter ignored. This made the GitHub anonymous ceiling unsafe and could retry during a required long wait. Code evidence: lib/core/pace.ts, lib/core/budget.ts, lib/core/admission.ts, lib/sources/github.ts, lib/demand/index.ts. Prior reports identified these defects; fresh source reads independently confirmed them.

[SI] Increasing global scan-work limits or labeling a local breaker "shared" would not solve the actual-dispatch boundary. [OP] Smallest root fix: atomic Redis reservation immediately before each paced upstream call, shared cooldown persistence before adapters see responses, conservative GitHub defaults, and denial rather than shortened sleep. Do not build a new orchestration framework.

Parent approved the conservative shared-provider proposal and later explicitly approved a runner-owned Redis6390 crash/restart drill. Parent's Redis6389 was left untouched except for the preexisting Lua test (which creates/deletes its own unique test keys).

## Proposed council decisions

1. [OP] Accept actual-dispatch quotas and monotonic shared backoff, not a claim that all upstream/account limits are solved. One conservative provider-ID bucket deliberately combines credentials/fallbacks within the same Redis deployment.
2. [OP] Keep the beta's current missing-Redis policy explicit, not disguised as distributed capacity. Configured or required controls fail closed. No production-default flag flip was authorized here; controlled provisioning remains P0 before fleet-capacity promises.
3. [OP] Accept real two-process Redis results as local implementation evidence. Require actual managed target/ingress/provider/operator receipts separately before promotion.
4. [OP] Retain independent relevance/calibration/decision-replay/consent gates. More passing engineering tests are not willingness to pay or decision utility.
5. [OP] Do not widen this patch into LLM routing/accounting, signer or admission edits. Communicate residuals to their owners and require a final merged-SHA regression run.

## Counterarguments and dissent

- "The global admission400 is sufficient": no; variable per-scan fanout, retries and fallback calls have a different minute budget. Two-worker provider counters directly test actual dispatch.
- "A per-provider local gate is cheaper": true for latency, false as a fleet hard cap. The shared EVAL adds a network roundtrip per attempt plus one on a cooldown write. Local gates remain conservative front filters, never distributed evidence.
- "Separate authenticated and anonymous buckets maximize capacity": they risk independent spend over one shared egress/account. Default10 and shared provider-ID scope trade utilization for simpler conservative safety. Verified operator account/egress identity and actual limits must precede a richer partition.
- "Make production Redis mandatory immediately": desirable before production promises, but parent explicitly retained unprovisioned capacity-limited beta sequencing. This is accepted sequencing, not removal of the unresolved production gate. If the beta cannot remain within real limits, restrict ingress rather than soften checks.
- "A shorter required wait keeps scans fast": wrong boundary. Return degraded/rate-limited evidence; do not dispatch inside a forbidden wait. The old GitHub5s timer remains in its owned adapter, but pacing now denies its early retry; our test actually waits5s and observes one upstream dispatch, not two.
- "Redis crash/restart proves production resilience": no. This was one local Redis7.4.6 process with appendfsync=always, not managed replication/failover, eviction or cloud outages. State deletion/eviction or inconsistent namespaces can still reset ceilings.

## Implemented scope

### lib/core/budget.ts
- Redis rolling actual-call reservations use Redis TIME, UUID members, same-cluster-slot keys, irrevocable charges and strict result validation.
- Provider keys are SHA256(provider-ID), not raw URLs, queries or credential-derived/account secrets. All credentials for one provider share the bucket.
- An active stricter replica ceiling is retained (TTL refreshed at reservation); a looser replica cannot widen it. Rollout to a higher ceiling needs an idle period/controlled plan, not deleting debt during traffic.
- Cooldown EVAL applies MAX(existing not-before, server-now+duration), with expiry. A short later update cannot erase an earlier long wait.
- Missing+required, partial, invalid, backend HTTP/transport/JSON/result errors fail closed. Loopback policy is imported unchanged; never allowed in production. REST redirects are rejected.
- BudgetGate rejects invalid limits/windows and supports a tighter anonymous ceiling while counting earlier calls. Retry delay selects the reservation that must actually expire under the tightened cap, not merely the first entry.
- UpstreamError exposes a nonsecret retryAfterMs. Existing ModelGateway remains a process-local request-count helper, NOT true LLM token/fleet accounting.

### lib/core/pace.ts
- Default GitHub10/min; explicit anonymous/fallback calls clamp to<=10 even if configured30. Explicit authenticated higher settings require operator validation; mere presence of an Authorization header is not verified credential health.
- Redis reservation precedes each paced actual dispatch; invalid configuration/Redis refusal does not dispatch. Local reservations may be consumed even when Redis refuses (conservative availability tradeoff, not a refund/bypass).
- Numeric/date Retry-After, GitHub exhausted/reset and conservative429/403 fallback waits are persisted before returning the response. No upper cap silently shortens a representable provider-required wait. HTTP Date anchors absolute deadlines against a skewed application's clock where present.
- Successful Stack Exchange response backoff is inspected on a clone with64KiB/1500ms limits, leaving the original response usable. Failed/oversize/malformed inspection schedules a conservative60s next-call wait; quota_remaining0 schedules24h. These conservative defaults may overblock and are not provider daily quota verification.
- Local health remains explicitly per-instance and shows active cooldown or quota backend failure as degraded; shared denials expose retry time. Local breakers/half-open recovery are NOT fleet-wide.

### New files only
- scripts/real-redis-rest-bridge.ts: loopback test REST transport allowlists exact production Lua and executes it with redis-cli against actual Redis. Does not reimplement quota logic. Dedicated nonzero DB14; test cleanup uses DEL, not FLUSHDB.
- scripts/distributed-redis-worker.ts: independent Node processes call the production admission, shared token and pacedFetch functions.
- scripts/ephemeral-redis-process.ts: runner-owned local Redis6390, appendonly/always-fsync, SIGKILL/restart and cleanup. Parent6389 untouched.
- scripts/distributed-redis-drill.ts: bounded assertions with provider HTTP counters; separate workers, injected application clock skew and production source hashes in output. No synthetic completion/live-provider assertions.
- tests/provider-backoff.test.ts:9 deterministic mocked regressions including actual5s GitHub early-retry behavior and production-loopback prohibition.

No existing scripts/configuration, admission, health route, receipt, package or lockfiles were edited by this architect. `/data/go-architect.md` is the authorized findings file; helper/log files outside repository are not product changes.

## Verification actually observed

[VF] Final scoped tests: **41/41 passed,0 failed,0 skipped**. Command:

```sh
env -i PATH="$PATH" HOME=/data REDIS_TEST_PORT=6389 REDIS_CLI=/data/redis-test-host/redis-7.4.6/src/redis-cli ./node_modules/.bin/tsx --test tests/provider-backoff.test.ts tests/pacing.test.ts tests/source-health.test.ts tests/shared-budget.test.ts tests/redis-lua.test.ts tests/distributed-loopback.test.ts tests/github-credential-health.test.ts
```

`/data/go-targeted-tests-final.tap`; isolated new regressions9/9: `/data/go-provider-tests.tap`. `/data/go-typecheck-final.log`: tsc --noEmit exit0. Earlier tsc caught concurrent missing snapshot export/usage errors outside owned files; earlier aggregate40/41 failed on the old immediate429/503 source-health expectation (`/data/go-targeted-tests.tap`). Parent was informed and updated that expectation; failure was not suppressed. First bridge run failed because redis-cli INFO is raw text even with --json; corrected the test transport and reran, not substituted an emulator.

[VF] Final two-worker drill passed **17 assertion groups**, real Redis7.4.6. Evidence `/data/go-real-redis-drill.json` includes pids, application1h skew, timestamp/base SHA and production file hashes. Run:

```sh
env -i PATH="$PATH" HOME=/data ./node_modules/.bin/tsx scripts/distributed-redis-drill.ts
```

-80 admissions from100 same-client attempts across workers;20 denied.
-5 batches80 work units accepted out of10 independent clients; global400 holds.
-10 token reservations100 accepted out of16 against shared1000;6 denied.
-7 actual provider dispatches from20 attempts against configured7;13 denied.
-GitHub anonymous configured30 still dispatched10 from16;6 denied.
-Cross-worker delta/date/reset/body backoffs each dispatched once then blocked other worker before upstream; server-derived retry times roughly60/120s.
-Long120s cooldown survives short1s update; short150ms cooldown actually expires and recovers.
-Malformed backend and transport503 fail closed; a failed cooldown write rejects the source and other replica dispatch.
-Active ceiling2 is not widened by replica20.
-Runner Redis6390 SIGKILL after8 admissions:32 additional admissions unavailable; token reservation unavailable; provider503; zero further upstream dispatches.
-Restart with AOF retains8 admission units, prior300token debt (new800 refused against1000), and provider-call debt (two total accepted against2, then refused).

No full test/build, cloud deployment, live load, real provider/model availability, managed Redis, customer or commercial result is asserted here. Parent runs final integration/release gates. Production-source hashes bind this local run to the files actually tested; concurrent working-tree changes are not made immutable by HEAD alone.

## Remaining operator and engineering gates

**P0 before capacity promises:** provision approved managed Redis/TLS/ACL/command support, matched deployment/account namespace and limits, no eviction/deletion of active debt, production-required policy rollout, strict exact deployedSHA fresh canary, real ingress sanitization and bounded target outage/failover/rollback/kill-switch receipts. User secrets were neither requested nor loaded by this reviewer.

**Provider policy:** choose verified per-account/egress limits and partition identity across deployments/services using the same credentials/IP. Present namespace only shares each provider-ID inside one Redis store; HackerNews supply uses `hackernews` and demand uses `askhn`, despite same Algolia host. Reddit OAuth token acquisition is fetchWithTimeout rather than pacedFetch. Redirect hops and already-reserved/in-flight calls cannot be recalled when a response reports backoff. A minute rolling quota is not minimum request spacing or an account daily/monetary cap. Match actual policies before claiming compliance.

**LLM owner:** router currently parses Retry-After with600s cap and caps breaker cooldown at default300s; waits longer than that can be shortened. This source-provider repair does NOT fix model-router backoff or make its per-model breaker fleet-wide. Shared token reservation requires matched window/limit/deadline config; tests do not establish provider billing truth or consistent config across unmanaged replicas. Reported known usage is not provider bill reconciliation. Parent/LLM owner notified of the cap finding.

**Signer/health owner:** operational readiness must actively prove its configured dependency rather than relabeling local observations as fleet health. This reviewer read evolving readiness code but did not certify the parent's final signer/health implementation.

**Nontechnical:** independent blind relevance/ordinal calibration and claim-support review; consented decision-replay utility/voluntary repeat use; provider privacy/retention/deletion; entitlements/billing/paid service promises remain distinct gates. Local correctness is not PMF.

[OP] Confidence0.92 in the scoped tested concurrency/backoff behaviors; no quantified live-production confidence. Weakest assumption: all relevant application requests pass through pacedFetch and use the intended shared Redis identity/policy. Falsifier: a separately deployed worker or shared-provider service can exceed the intended account cap, a managed outage falls back locally, or a long required wait leads to upstream dispatch before its actual not-before time.

## Exact full-read record

External full reads before implementation:
- /data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md
- /data/council-architect.md (all201 lines)
- /data/council-security.md (all209 lines)

Repository files below were fully read through tool-returned text or authored and reviewed in full, not merely passed to a program. Some concurrently owned files changed after the read; full-read means the read snapshot, not final acceptance. Lockfiles/generated .next/build artifacts/binaries and remaining tests are not claimed semantically read. Existing scripts were read offline, not executed live.

- .env.example
- .github/workflows/ci.yml
- .github/workflows/deployment-gate.yml
- .gitignore
- app/api/analyst/route.ts
- app/api/cohort/route.ts
- app/api/compare/route.ts
- app/api/health/route.ts
- app/api/search/route.ts
- bin/simultaneity-mcp.mjs
- docs/COUNCIL_DECISIONS_1_6_11.md
- docs/DELIVERY_1_6_11.md
- lib/brief.ts
- lib/cohort.ts
- lib/core/admission.ts
- lib/core/budget.ts
- lib/core/cache.ts
- lib/core/dedup.ts
- lib/core/expand.ts
- lib/core/fetch.ts
- lib/core/input.ts
- lib/core/latest-request.ts
- lib/core/normalize.ts
- lib/core/pace.ts
- lib/core/ratelimit.ts
- lib/core/redis-endpoint.ts
- lib/core/scan-snapshots.ts
- lib/demand/index.ts
- lib/llm/analyst.ts
- lib/llm/fault-injection.ts
- lib/llm/hedge-policy.ts
- lib/llm/router.ts
- lib/llm/shared-budget.ts
- lib/mcp.ts
- lib/scan.ts
- lib/sources/arxiv.ts
- lib/sources/contract.ts
- lib/sources/crates.ts
- lib/sources/github.ts
- lib/sources/hackernews.ts
- lib/sources/huggingface.ts
- lib/sources/index.ts
- lib/sources/npm.ts
- lib/sources/openalex.ts
- lib/sources/pypi.ts
- lib/types.ts
- next-env.d.ts
- next.config.mjs
- package.json
- postcss.config.mjs
- proxy.ts
- scripts/adaptive-hedge-live.ts
- scripts/adaptive-hedge-sustained.ts
- scripts/browser-integrity-smoke.cjs
- scripts/calibrate.ts
- scripts/demand-live-probe.ts
- scripts/distributed-redis-drill.ts
- scripts/distributed-redis-worker.ts
- scripts/ephemeral-redis-process.ts
- scripts/hedge-live.ts
- scripts/live-smoke.ts
- scripts/llm-torture.ts
- scripts/model-gateway-probe.mjs
- scripts/production-smoke.mjs
- scripts/proof-integrity-smoke.ts
- scripts/real-redis-rest-bridge.ts
- scripts/receipt-keygen.mjs
- scripts/release-gate.mjs
- scripts/smoke-score.ts
- scripts/snapshot-redis-drill.ts
- scripts/snapshot-redis-worker.ts
- scripts/sublane-live.ts
- scripts/upstash-rest-emulator.ts
- tests/distributed-loopback.test.ts
- tests/pacing.test.ts
- tests/provider-backoff.test.ts
- tests/redis-lua.test.ts
- tests/source-health.test.ts
- tsconfig.json
- vercel.json

### Inventory-only remaining listed source (NOT fully read)

- app/agents/page.tsx
- app/api/badge/route.ts
- app/api/export/route.ts
- app/api/mcp/route.ts
- app/api/verify/route.ts
- app/c/[token]/opengraph-image.tsx
- app/c/[token]/page.tsx
- app/funds/page.tsx
- app/globals.css
- app/layout.tsx
- app/methodology/page.tsx
- app/page.tsx
- app/pricing/page.tsx
- app/privacy/page.tsx
- app/pulse/page.tsx
- app/robots.ts
- app/s/[q]/opengraph-image.tsx
- app/s/[q]/page.tsx
- app/sitemap.ts
- components/cohort-form.tsx
- components/matrix-panel.tsx
- components/page-shell.tsx
- components/score-display.tsx
- components/search-form.tsx
- components/source-section.tsx
- components/watchlist.tsx
- components/wedge-panel.tsx
- lib/badge.ts
- lib/calibration/gold-set.ts
- lib/scoring/capsule.ts
- lib/scoring/evidence.ts
- lib/scoring/index.ts
- lib/scoring/quadrant.ts
- lib/scoring/receipt.ts
- lib/scoring/score.ts
- lib/scoring/semantic-filter.ts
- lib/scoring/wedge-expansion.ts
- lib/scoring/wedge.ts
- lib/share.ts
- lib/shares.ts
- lib/site.ts

`docs/STATE_MAP_1_6_11.csv`: path inventory only,302 records; its statuses are not this reviewer's semantic acceptance. The complete-source-study requirement remains open for the files above; combine separately scoped reviews or explicitly finish these reads before stating a full-source audit.
