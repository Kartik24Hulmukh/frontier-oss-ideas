# Security/reliability implementation handoff — scoped LLM routing

Review date: 2026-10-06. Repository: `/data/frontier-oss-ideas`. Starting main HEAD: `242c6ec`. Working tree is shared with the parent and other owners; these receipts are local snapshots, not a final merged/deployed SHA certification.

## Executive verdict

[OP] The two assigned router defects have been addressed in owned code: atomic extra-attempt hedge reservation at dispatch, and complete/incomplete aggregation of potentially billable attempts. Local evidence supports accepting this bounded implementation for integration. Production/commercial launch remains **NO-GO without the external gates below**. No live gateway/credential, managed Redis, deployment, penetration test, or customer validation was performed.

[VF] Only these repository files were modified by this reviewer:
- `lib/llm/router.ts`
- `lib/llm/hedge-policy.ts`
- `lib/llm/shared-budget.ts`
- new `tests/llm-accounting.test.ts`
- new `tests/hedge-dispatch.test.ts`
- new `tests/llm-accounting-backoff.test.ts` (explicit follow-up quota-respect request)

No package/lockfile edits, installs, commits, merges, signer/admission/health edits, analyst route/UI edits, or dependency promotion were made. Other working-tree changes belong to concurrent owners and were left untouched. This report and verification logs are outside the repository in `/data`.

## Independent assessment and premortem (formed before implementation)

[VF] The supplied Founder_Work brief and both council/delivery documents were read before edits. The code was independently inspected rather than treating council claims as current proof:

1. **Stale permission oversells hedges.** `complete()` previously evaluated `allowHedge()` before any timer fired and later dispatched using `noteHedge()` without rechecking. [SI] Concurrent stalls or replacement attempts after failures could all spend stale permissions. The existing token reservations still bound dispatched token envelopes: this was a hedge-policy amplification defect, not proof of unlimited provider billing.
2. **Success hides earlier paid failures.** The winner overwrote aggregate prompt/completion usage. Empty/reasoning-exhausted responses discarded prompt/completion counts, while reasoning alone was added. [SI] A 24+400 exhausted attempt followed by 10+5 success would report 15 total despite a 400 reasoning subtotal; the correct known aggregate is 439, not 839.
3. **Cancellation gets mistaken for free work.** A timeout/abort does not establish whether the provider accepted or billed work. [OP] Neither budget refunds nor exact-zero cost claims are justified by client cancellation.
4. **Observability changes accidentally break ceilings/failover.** [SI] Parsing an endless error body to obtain billing evidence could stall the chain; refusing a hedge could accidentally end the primary; split budget/governor decisions could consume the wrong ticket. Verification must exercise these boundaries, not just happy-path totals.
5. **Green unit tests are relabeled as global guarantees.** The default shared router is process-local; independent replicas have independent learned latency/governor state. [OP] Fleet token reservations and fleet hedge ratios must not be conflated. A mocked Redis response is not evidence of actual managed Redis capacity, account billing, or deployment readiness.

**Chosen minimal design:** count *extra concurrent attempts* (including replacement hedges), not unique hedged requests; synchronously check-and-charge each dispatch; bound and publish cold-start burst; keep all token reservations irrevocable; make request usage aggregate while separately exposing known lower bounds, winning-attempt usage, reservations and unknown attempts. Preserve existing public fields/types, with only optional additive metadata. No signer or analyst redesign in this scope.

## Implementation details

### Atomic dispatch governor

[VF] `HedgeController.tryReserveHedge()` synchronously checks current counters and records one extra-attempt ticket. Router timer-triggered and failure-triggered parallel dispatches both call it immediately before local token reservation/network dispatch, with no intervening await. Sequential failover does not consume a hedge ticket. Legacy `allowHedge()` remains a preview for compatibility, not a reusable dispatch permit; `noteHedge()` remains deprecated manual telemetry, not the router's dispatch path.

[VF] The denominator counts only routes that actually dispatched a first model. Local/shared rejection and entirely open circuits cannot manufacture governor allowance. Reservation/deadline eligibility is checked before consuming a hedge ticket. Governor or token refusal releases a half-open probe and leaves existing in-flight work running; the next candidate is not consumed merely because a parallel hedge was refused.

Policy is explicitly process-local/per-controller. The process singleton is not a distributed governor. Snapshot metadata publishes `scope: process-local`, `metric: extra-attempts-per-request`, and `coldStartAllowance`.

- After the cold-start boundary, each extra dispatch requires existing hedges + 1 <= floor(rate * active dispatched requests).
- Before the boundary, a finite burst is permitted: ceil(rate * (boundary - 1)); defaults permit at most two extra attempts, not unlimited early hedging.
- Rate zero forbids hedges even during cold start.
- Cancellation does not refund a hedge ticket.
- Window/minimum-count settings are normalized to positive integers.
- This is an admission rule, not an assertion that every retrospective rolling snapshot must stay below the ratio: cold-start burst and differently timed request/hedge expiry can temporarily leave a larger displayed ratio. No fleet ratio or hard monetary-cost guarantee is claimed.

### Aggregate usage / incomplete billing evidence

[VF] Each dispatched settled attempt carries sanitized usage, its reservation and a billing-unknown flag. Gateway-reported prompt/completion/reasoning counts are preserved on empty and reasoning-exhausted responses, ordinary successes, and HTTP error bodies when available. Reasoning is treated as a completion subset and never separately added to total. Invalid negative/fractional/string/unsafe counts are not accepted as exact counts; contradictory totals or reasoning > completion mark billing incomplete. Known reasoning supplies a completion lower bound when completion usage is missing/contradictory.

Request fields retain their original names and number/boolean types:
- `promptTokens`, `completionTokens`, `totalTokens`, `reasoningTokens` now aggregate all recorded dispatched attempts, rather than just the winner.
- Missing fields on useful responses can retain conservative text/prompt estimates; unknown failed/cancelled work has no fabricated billed quantity. Consequently zero aggregate known tokens does **not** mean free work when `complete` is false.
- `estimated` is true whenever any dispatched attempt has missing/malformed/contradictory billing evidence.

Optional additive metadata:
- `knownPromptTokens`, `knownCompletionTokens`, `knownTotalTokens`: normalized reported lower bounds, separate from estimates.
- `complete`, `unknownAttempts`: whether every dispatched attempt supplied consistent usage at return time.
- `reservedTokens`: local dispatched-attempt reservations, including ambiguous/cancelled work.
- `sharedReservedTokens`: successfully admitted distributed whole-chain reservation, only when configured distributed admission was used; it can exceed actual dispatched reservations.
- `winnerUsage`: winning attempt's usage, explicitly separate from request cost.
- Per-attempt `usage`, `reservedTokens`, `billingUnknown`.

[VF] A loser already settled in the same race turn is accounted using its actual reported usage/outcome. An unresolved loser is immediately represented as cancelled with unknown billing. Late responses cannot silently mutate the returned snapshot or refund tokens. No asynchronous invoice-reconciliation service was implemented or claimed.

[VF] Attempt timeout/abort races bound even noncooperating fetch promises and clean up the router's timers/listeners. HTTP error-body inspection is capped at 25ms, retaining error classification and immediate auth stop/failover even when a body hangs. This does not prove remote work stopped.

### Token ceilings and shared scope

[VF] Per-model max output, cumulative per-request reservation ceiling, process-local rolling window, shared whole-chain preadmission, 401/403 chain stop, no-sleep sequential failover and breaker behavior are preserved. `TokenBudget.settle()` remains no-refund. `canReserve()` permits checking local affordability before spending a hedge ticket; dispatch check/charges are synchronous.

[VF] Shared Lua reservation logic was not relaxed or rewritten. Shared reservations still use Redis time and retain worst-case charge for window+deadline. Added safe-integer validation for the derived retention sum and comments distinguishing coordinated token reservations from process-local hedging/provider billing. All replicas need matched budget policy; configured Redis is not verified Redis. Actual provider adherence to max_tokens and billing semantics remains an external prerequisite, not a guarantee established by local estimates.

## Full-read ledger

Paths below were read completely at the inspected snapshot (some owner files subsequently evolved). No entire-repository or entire-documents-inventory audit is claimed.

### Mandated material
- `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md`
- `/data/frontier-oss-ideas/docs/council-1.6.11/council-security.md` (all 209 lines)
- `/data/frontier-oss-ideas/docs/DELIVERY_1_6_11.md` (all 14 lines)

### Owned implementation and supporting contracts
All repository-relative paths below are rooted at `/data/frontier-oss-ideas/`:
- `lib/llm/router.ts` (all original 490 lines, contiguous sections; edited dispatch/accounting/attempt paths reviewed again)
- `lib/llm/hedge-policy.ts` (all original 121 lines; final diff reviewed)
- `lib/llm/shared-budget.ts` (all original 40 lines; final diff reviewed)
- `lib/llm/analyst.ts` (initial complete snapshot; read-only consumer inspection, not a final-owner-code audit)
- `lib/llm/fault-injection.ts`
- `app/api/analyst/route.ts` (initial complete snapshot; no edits)
- `lib/core/redis-endpoint.ts`
- `scripts/llm-torture.ts` (read only; never executed)
- `package.json`, `tsconfig.json` (read only)

### Remaining relevant existing test sources — fully read, not merely executed
- `tests/adaptive-hedge.test.ts`
- `tests/llm-router.test.ts`
- `tests/shared-budget.test.ts`
- `tests/distributed-loopback.test.ts`
- `tests/redis-lua.test.ts`
- `tests/health.test.ts`
- `tests/live-evidence.test.ts`
- `tests/all-provider-health.test.ts`
- `tests/source-health.test.ts` (read complete to diagnose the integration-snapshot failure; not modified)
- `tests/analyst-snapshot.test.ts`, `tests/analyst-snapshot-ui.test.ts` (concurrent owner additions; read-only compatibility check)
- New authored/reviewed tests: `tests/llm-accounting.test.ts`, `tests/hedge-dispatch.test.ts`, `tests/llm-accounting-backoff.test.ts`.

**Inventory boundary:** `docs/STATE_MAP_1_6_11.csv` was consulted at relevant LLM/Redis/script rows and the complete tests inventory rows (260–303), including prior “inventory only / partial” entries. Those relevant test sources have now been fully read as listed above. Copying the CSV for reference was not counted as semantic full read of every repository artifact. Unrelated test/doc/source files executed by the full suite are not silently labeled fully reviewed. The inventory was not edited; parent owns inventory consolidation.

## Verification receipts

Commands were run with a clean inherited environment (`env -i`, PATH/HOME and NODE_ENV=test only), so no ambient live credentials were passed to tests. Provider responses were fakes/mocks; distributed-loopback tests use the local emulator. No live model-tool scripts ran.

1. First focused run: **56/56 passed**, no skips; `/data/security-scoped-tests.txt`.
2. Final focused run (new accounting/dispatch plus existing router/adaptive/shared-budget): **59/59 passed**, no skips; `/data/security-scoped-tests-final.txt`.
3. Final related routing/security run (adds health, live-evidence, loopback-distributed and real-Redis test source): **304 total, 303 passed, 0 failed, 1 skipped**; `/data/security-related-tests-final.txt`. Skip is the actual-Redis Lua test: no configured test port/Redis CLI/server in this reviewer environment. Emulator success must not be relabeled real Redis success. Historical delivery evidence about Redis 7.4.6 was read, not rerun here.
4. Latest `tsc --noEmit --incremental false`: **passed (exit 0)**; `/data/security-typecheck-latest.txt`. Earlier snapshots failed on concurrent-owner missing snapshot export, analyst fallback usage, and demand qualification types; those earlier receipts are retained in `/data/security-typecheck.txt` and `/data/security-typecheck-final.txt`, not rewritten as green.
5. JavaScript release-gate tests: **14/14 passed**; `/data/security-gate-tests.txt`.
6. First full TypeScript integration snapshot: **980 total, 978 passed, 1 failed, 1 skipped**; `/data/security-full-tests.txt`. Failure was outside owned files: original source-health test immediately issued another beta call after a 429; the concurrent new provider backoff correctly blocked it for 60s. Parent was notified to reconcile the intended behavior/test. No owned LLM regression failed. **Latest full TypeScript integration snapshot: 1,674 total, 1,673 passed, 0 failed, 1 skipped** (real Redis); `/data/security-full-tests-latest.txt`, exit0. Concurrent owners added substantial test coverage between snapshots; this is not a certification of later changes or a final merged/deployed SHA.
7. `git diff --check` on all three owned implementation files: passed. No Next build/deployment was run by this reviewer; parent owns stable final integration/build/promotion verification.

Coverage includes: stale preflight concurrency; ten simultaneous stalled routes; multiple failure-triggered hedges in one chain; bounded cold burst/rate zero/window expiry; unaffordable and governor-denied hedge preserving primary; zero-dispatch denial not inflating request count; cumulative/process/shared token reservation boundaries; reasoning exhaustion + winner exactly439; two paid empties + winner; all paid/all unknown failures; HTTP error usage; partial/malformed/contradictory usage; noncooperating timeout and error-body hang; cancelled paid loser/no refunds/immutable late response; already-settled loser in the same race; separate shared-chain versus local-attempt reservations. Existing routing/auth/breaker/adaptive tests also remain green.

## External gates and explicit exclusions

| Gate | Evidence still required / owner |
|---|---|
| Final integration identity | Parent runs final stable-tree typecheck/full tests/build, resolves other-owner regressions, publishes exact full SHA and separately verifies deployed SHA. No reviewer commit/merge/promotion. |
| Managed token/admission coordination | Operator/SRE: actual managed Redis Lua/concurrency/outage/timeout/eviction drills across independent instances, matched policy, fail-closed production configuration, command privileges, alarms. Loopback emulator and mocked admission are not substitutes. Parent owns scan admission. |
| Provider accounting | Operator/provider owner: bounded approved real calls establish max_tokens/reasoning behavior, error/timeout/cancellation billing and invoice reconciliation. Missing telemetry never becomes a refund. Add reconciliation if used for billing/cost analytics; gateway “complete” only means consistent reported fields, not certified invoice truth. |
| Fleet hedge claims | No fleet hedge-ratio implementation is delivered. If required, separately coordinate dispatch tickets across replicas; until then label process-local, including cold burst and window semantics. |
| Real enabled analyst | Rotated least-privilege credential, approved funded account, useful citation-linked actual completions, bounded approved spend, provider privacy/retention terms, account-side monetary/token caps. No synthetic success, quota increase or credential reuse to make gates green. |
| Fresh readiness/signer | Parent/operator: valid active trusted signer and key custody/revocation, fresh exact-SHA canary, actual dependency observations and production-default admission. This reviewer did not assess/fix evolving signer/health/admission work. |
| Whole-request behavior | User Advocate/parent: receipt/snapshot-bound analyst route/UI, upstream scan+router deadlines, stale UI protection and deterministic fallback; local router abort is not proof of remote cancellation. |
| Commercial/pilot scope | Consented public/deidentified inputs, privacy/deletion/access controls and human claim-support review; observed decision utility, repeat use and willingness to pay. Code correctness is not customer validation. |

[OP] Confidence is high in the bounded local S4/S5 correction and its regressions, not in deployed/global billing safety. Strongest remaining assumption: gateway-reported usage/max_tokens semantics match the intended provider contract. Actual managed-dependency and invoice evidence on the final deployed SHA could change the release recommendation. Until then keep the capacity-limited research-beta/disabled-analyst scope and retain launch NO-GO.

## Final owned-file integrity receipt

SHA-256 values for the six owned/new files at handoff are preserved in `/data/security-owned-file-sha256.txt`. Parent should reverify after integration. Final report handed off without a commit, merge, package edit, or live gateway request.

## Explicit architect-dissent follow-up — mandatory LLM provider backoff

After the initial handoff, the parent explicitly requested a narrow correction for `parseRetryAfter()` capping waits at600000ms and `CircuitBreaker.failure()` capping provider waits to `maxCooldownMs`. [VF] Independent inspection confirmed both caps could shorten a 900-second provider window. This was an added explicit owned-scope quota-respect request, not an expansion into signer/admission/health or analyst ownership.

[VF] Numeric and HTTP-date Retry-After now yield uncapped safe representable integer milliseconds. Positive fractional milliseconds round upward, not earlier; invalid/negative or unrepresentable timestamps are rejected rather than turned into capped positive waits. A separate mandatory `notBefore` timestamp gates `allow()` and snapshot state independently of the bounded exponential cooldown. Subsequent longer mandatory waits extend it; shorter waits and older in-flight successes cannot erase it. Ordinary exponential cooldown growth remains capped. Retryable server errors (including503/504) propagate the header too, not just429. The current route still fails over immediately to a different eligible model; future attempts of the restricted model wait until the provider boundary. This breaker remains process-local, not replica-coordinated provider quota enforcement.

Eight new offline regressions in `tests/llm-accounting-backoff.test.ts` cover numeric900s/HTTPdate900s parsing, model breaker and router calls at600s,899.999s and900s; one half-open probe at boundary; longer-wait extension; old-success race; ordinary exponential cap; safe parsing and upward rounding; and503 mandatory wait before exponential failure threshold.

**Latest post-follow-up focused receipt:**67/67 passed,0 failed,0 skipped; `/data/security-scoped-tests-backoff-final.txt`. **Latest post-follow-up typecheck:**exit0, `/data/security-typecheck-backoff-final.txt`. Owned diff-check and updated six-file SHA receipt passed. The earlier1,674-test full-suite, related303-pass and JS14-pass receipts predate this follow-up and are not mislabeled as post-follow-up full integration. Parent requested stable handoff and owns its full verify rerun after this final correction. No further owned edits are pending; no live calls were made.
