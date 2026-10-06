# Independent security / reliability council review

## Executive verdict

**Final council status:** This report preserves initial findings as an audit trail. The closing decision below supersedes S2's stale-snapshot/display-binding findings: inspected code now tightens freshness, binding, and isolated fresh work. Production-default distributed admission remains deliberately deferred and unresolved. Enabled-model breaker checking needs the producer/consumer schema correction identified at close; no final target-environment approval was given.

**NO-GO for production-capacity or paid-service promises.** [OP] Keep a capacity-limited research beta or disable the analyst until the operational gates below are evidenced on the actual deployed SHA. Receipt issuer authentication is materially sound in the inspected paths; the highest-leverage blocker is enforcing shared capacity and making readiness evidence describe fresh, working dependencies rather than configuration presence.

Review date: 2026-10-06. Repository: `/data/frontier-oss-ideas`; starting HEAD: `5a05725cabdcbaca2e88875175aef41c8435fbed`, package version 1.6.10. This is an independent code review, **not** a penetration test, deployment certification, provider load test, or customer validation. No source modifications or dependency installs were made. No credential values were inspected, printed, or used for live provider requests. Tests used mocks/fake values and one loopback emulator, not cloud Redis. The custom reproduction ran in a clean environment (`env -i`) with fake credentials only.

Evidence labels: **[VF]** directly inspected code or observed local test; **[SI]** consequence inferred from that code with stated prerequisites; **[NE]** missing target-environment evidence; **[OP]** release judgment. File references are repository-relative `path:line-range`. These are source references, not assertions that a deployment runs this code.

### Coordination / changing workspace

The parent is fixing supply-provenance gate binding, empty-evidence confidence/wedges, and client races. I did not duplicate those edits. The working tree changed during this review; the release gate was reread after the parent's change. Its new supply-provenance comparison is at `scripts/release-gate.mjs:25-28`. Findings below remain reproducible with that addition. Other references concern inspected snapshots; rerun the verification plan on the final merged SHA. No full current-working-tree certification is implied.

## Bounded ranked findings

### S1 — Production scan admission falls back to per-instance limits when Redis is absent

**Priority: P0 before public production; confirmed configuration-triggered capacity defect, not an unconditional quota bypass.**

- [VF] `lib/core/admission.ts:31-35` returns local admission when URL/token are absent unless `REQUIRE_DISTRIBUTED_LIMITS === 'true'`; it does **not** require distributed admission merely because `NODE_ENV === 'production'`. The public entrypoint matcher delegates to this function (`proxy.ts:5-14`). `.env.example:34-38` ships the flag as `false`.
- [VF] Clean-environment reproduction: `NODE_ENV=production`, no Redis, flag absent → `admitScan(...) === 'ok'`. By contrast the LLM token layer correctly treats production as requiring Redis (`lib/llm/shared-budget.ts:19-31`).
- [SI] If production is started without this flag/Redis, anonymous traffic spreads across replicas and gets each process's 400/10-minute allowance; restarting resets it. This violates a **global** ceiling but does not prove unlimited provider spend: route-local/provider guards still constrain each instance. Correctly configured Redis failures already fail closed (`lib/core/admission.ts:37-49`).
- **Root fix:** make distributed scan admission required for production by default, exactly as shared-token admission does; permit in-memory operation only through an explicit nonproduction local mode. Centralize the policy used by admission and `/api/health` so their statements cannot diverge. Do not rely solely on the operator remembering a flag.
- **Verification:** missing, partial, malformed, HTTP failure, timeout, and invalid Redis result must yield 503 / zero scans in production across every matcher entry. Prove the shared 400-work-unit cap under two independent app instances; then kill Redis mid-burst and assert no local fallback. Development without Redis should still work only under its deliberate local policy.

### S2 — Strict canary can pass stale scans and a completely unavailable enabled analyst

**Priority: P0 if strict-green is used to approve this service; confirmed gate false-positive, not remote signature forgery.**

- [VF] `scripts/release-gate.mjs:15-35` checks configuration and deterministic scan health. The LLM check at line 22 only verifies budget scope. It never requires a successful enabled analyst request, available primary models, or recent successful gateway observations. `runGate` performs health/search/verify only (`:48-51`).
- [VF] The canary uses one fixed query (`:49`). `app/api/search/route.ts:15,22,35-41` accepts `fresh` but drops it when calling `scanIdea(q)`; scan cache defaults to 20 minutes (`lib/scan.ts:14-16,49-55,100-102`). The gate does not reject `cached: true` or check capsule age. Therefore old signed healthy evidence can coexist with a currently dead Redis/provider/signing dependency. The current supply-provenance addition does not close this freshness gap.
- [VF] An explicit evaluator fixture with a 2020 capsule, `cached:true`, and all four LLM breakers `open` still returns strict `passed:true` while supplying the expected configuration/trust fields. This is a test fixture, **not** proof the real deployment is down or that fabricated verifier booleans can be submitted to the real gate. `runGate` obtains its verification from the target server.
- **Root fix:** forward a bounded `fresh:true` canary option to `scanIdea`, isolate/bypass an older in-flight cached scan for the canary, and check receipt-covered timestamps against a declared age/skew bound. Bind the expected model version, query, score/coverage and source summaries to the capsule. When the analyst is enabled, add a small authenticated/operator canary that requires real content from the actual gateway, budget reservation, and bounded latency; when intentionally disabled, record that reduced release scope. Separate `/live` from `/ready` instead of treating `health.ok === true` as readiness (`app/api/health/route.ts:11-32`).
- **Verification:** prime cache, take Redis/providers/signing offline, rerun strict canary, and require failure. Test future timestamps, old receipts, unexpected model stamp, all breakers open, account quota exhaustion, and no citation-supported content. Test an explicitly disabled analyst as an allowed **deterministic-only** scope rather than falsely promising AI availability. Preserve the parent's supply-provenance regression tests.

### S3 — Minute-level provider ceilings and backoff are not global; GitHub's anonymous default is too high

**Priority: P0 capacity design before growing traffic; confirmed local policy defects with conditional target-environment impact.**

- [VF] `lib/core/pace.ts:21-29` stores guards in a process-local map and defaults every provider to 25/minute. `lib/core/budget.ts:13-14,16-35` explicitly scopes the ceiling to a warm instance. `.env.example:54-57` documents GitHub anonymous quota as 10/minute, but leaves the example override commented at 25.
- [VF] A scan can run both primary and variant GitHub searches (`lib/scan.ts:58-65`). A revoked token can add an anonymous fallback (`lib/sources/github.ts:40-45`). Thus global application work units are not a per-provider request budget.
- [VF] Source pacing counts 429 toward a three-failure breaker but ignores `Retry-After` (`lib/core/pace.ts:64-73`, `lib/core/budget.ts:63-75,90-95`). GitHub handles 403/429 by sleeping **at most five seconds** then retrying (`lib/sources/github.ts:47-59`); a longer provider-specified backoff is not honored. 403 passes through `pace.ts`'s breaker reset path. HTTP-date `Retry-After` becomes NaN in the GitHub numeric parser and effectively an immediate timer.
- [SI] Autoscaling, unique-query bursts, rejected credentials, or quota exhaustion can collectively exceed the real shared account/IP quota even with a healthy admission Redis. Actual enforcement keys/quotas are provider-specific and unverified here. Application denial may be appropriately conservative, but cannot be advertised as minute-level compliance.
- **Root fix:** reserve distributed per-provider requests immediately before dispatch using provider-account/egress quota scopes and server time. Default GitHub to the safe anonymous limit unless an observed valid dedicated credential permits its configured tier. Honor parsed delta/date backoff as a next-allowed time; for long waits return degraded evidence rather than retry early inside the scan. Treat rate-limit 403 separately from permanent/auth 403; publish health without secrets. Preserve a single half-open probe and account for variants/retries separately.
- **Verification:** two app instances, primary+variant+401 fallback, 403/429 with numeric/date backoff, and timeout/body failure; prove no request occurs inside the forbidden backoff or above the shared minute ceiling. Test the actual managed provider/account limits in staging, not by saturating a public endpoint. Keep test traffic bounded.

### S4 — Hedge-rate governor is a preflight hint, not an atomic dispatch cap

**Priority: P1; confirmed spend-amplification policy defect, not a demonstrated escape from hard token budgets.**

- [VF] `lib/llm/router.ts:339-342` checks `allowHedge()` once before attempts; actual `launch(true)` at `:347-371` only calls `noteHedge()` and does not recheck the governor. Failures and hedge timers can launch additional hedges later (`:394,421-423`).
- [VF] `lib/llm/hedge-policy.ts:87-95` separates permission from charging. Clean-environment reproduction queues ten permitted tickets before recording any; all ten succeed and the reported hedge rate reaches **1.0 despite a 0.2 ceiling**. This models requests making their preflight decision before any stall fires. Cold start also intentionally permits hedges until ten requests (`:93`); that is not a hard 20% bound.
- [SI] Concurrent requests or multiple hedge launches within one route may amplify cost and load beyond the governor's stated policy. Local cumulative per-request reservations and shared worst-case reservations still bind (`router.ts:326-331,358-363`), so this is **not** evidence of an unbounded token-spend exploit.
- **Root fix:** replace `allowHedge()`/`noteHedge()` with a synchronous atomic `tryReserveHedge()` at every actual dispatch; use unique request identity to define whether the policy counts hedged requests or extra attempts. Explicitly specify and bound cold-start allowances. If claiming a fleet-wide hedge ratio, use shared coordination; otherwise label the scope as process-local.
- **Verification:** seed a stable sample, start many requests concurrently, trigger staggered hangs and failures, and prove a discrete bound on permitted extra attempts. Include multiple failures in one chain and cancelled hedges. Verify hard token ceilings remain intact and unhedged in-flight work is not aborted solely by a governor refusal.

### S5 — Usage reporting drops billed unsuccessful attempts and can claim an exact total smaller than its reasoning subtotal

**Priority: P1 before billing, cost analytics, or pilot spend measurement; confirmed accounting/reporting bug.**

- [VF] A successful route sets prompt/completion/total from the winner only (`lib/llm/router.ts:399-409`). A reasoning-exhausted attempt returns only `rt`, not its prompt/completion usage (`:442-449`). On all-failure paths, total remains initialized to zero (`:317-319`) even when reasoning tokens were billed. Cancelled hedges are recorded without actual usage (`:376-382`).
- [VF] Mocked primary charges 24 prompt + 400 completion (400 reasoning), then fallback charges 10 + 5. Returned usage is `totalTokens:15, estimated:false, reasoningTokens:400`; known aggregate usage should be **439** (reasoning is a completion subset and must not be double-counted). Hard no-refund reservations are still conservative; this does **not** reopen the old quota-refund bug (`:95-103`).
- **Root fix:** record prompt/completion/total for every settled attempt and aggregate known charges; distinguish winner usage, known total, reserved upper bound, and unknown cancelled/timed-out charges. Mark aggregate as incomplete/estimated when any potentially billable attempt is unknown. Reconcile provider billing asynchronously, without refunding ambiguous reservations.
- **Verification:** exhausted reasoning + success, two empty charged responses + success, all-model failures, malformed usage, and cancelled paid hedge. Require nonnegative finite usage; total must be consistent with known completion/reasoning subtotals. Never describe winner-only usage as total request cost.

### S6 — Signing health is a presence check; invalid private keys silently downgrade new receipts

**Priority: P1, and P0 when authenticated receipts are promised; confirmed readiness/reporting defect, no confirmed issuer forgery.**

- [VF] `app/api/health/route.ts:19` reports `signing-configured` whenever the private-key environment variable is nonempty. `lib/scoring/receipt.ts:29-36,66-74` silently returns a hash-only receipt for an invalid/non-Ed25519 key.
- [VF] Fake invalid key reproduction: health says `signing-configured`, actual receipt algorithm is `sha256`. A fresh strict issuer check rejects this; an older cached signed scan can mask the new failure (S2).
- **Root fix:** validate the key type and active public-key match at startup/readiness without exporting the secret; expose invalid/missing/mismatch states. In a signed-production mode reject new scans rather than silently downgrading to checksums. Retain an explicit hash-only beta mode with accurate copy.
- **Verification:** missing/malformed/wrong-type private key, valid but mismatched public pin, valid rotated keyring, and old cached signed receipt. Readiness must fail when the configured active signer cannot issue a receipt trusted by the active policy. Key revocation tests must remove compromised pins, not preserve them as trusted history.

## Conditional abuse surfaces / not yet proven exploit severity

1. **Forwarded identity is only safe behind a sanitizing ingress.** [VF] `lib/core/ratelimit.ts:42-47` hashes the caller's first forwarded value, without validating IP syntax or establishing trusted proxy provenance. With a direct/self-hosted server, changing `x-forwarded-for` changes the bucket (reproduced). [SI] It bypasses per-client limits **only if** ingress lets attackers set the trusted header; the shared global Redis cap still applies. Not established against Vercel. Fix: overwrite/remove forwarded headers at ingress, restrict origin access, canonicalize IPs, and use authenticated verified identities for entitlements. Verify forged headers over the actual deployed edge/origin path. Do not treat a hash, MCP Origin check, or an arbitrary X-Api-Key as authentication.
2. **Proof/verification workloads are outside scan admission.** [VF] `proxy.ts:14` excludes `/api/verify`, `/api/export`, `/c/*`; those paths parse up to 256 KiB (`app/api/verify/route.ts:11`, `app/api/export/route.ts:23`), recurse/hash/verify, and synchronously deflate/inflate (`lib/share.ts:68-98`). Alias reads issue Redis GET (`lib/shares.ts:40-44`); a token-shaped random alias is enough to induce a lookup. [SI] This is a concrete unmetered resource surface for anonymous callers, but **no cost-amplification factor or denial-of-service threshold was measured**. Fix: separate low-cost proof/read/write limits, WAF/global concurrency controls, nesting/string/array caps, request-body read deadlines (`lib/core/input.ts:5-24` currently bounds bytes, not time), and cache immutable validated records. Do not charge proof views as new scans or require scanning upstreams to view a frozen receipt. Verify malformed, compressed-limit, deep JSON, slow-body and random-alias workloads in isolated staging.
3. **Operator-controlled outbound URLs need validation, not an invented public SSRF claim.** [VF] `lib/core/redis-endpoint.ts:14-20` accepts any nonlocal HTTPS hostname, not just Upstash; `ModelRouter` accepts `MELIOUS_BASE_URL` without HTTPS/host validation (`lib/llm/router.ts:250-255,435-439,480-481`). These are deployment-controlled values, not public request parameters. No public SSRF or key-exfiltration exploit was demonstrated. Require HTTPS, approved hosts, no userinfo, no redirect following, sensible time/size bounds, and config ownership; a malicious/mistaken operator configuration can otherwise send bearer credentials to the wrong service. Test fake endpoints only.
4. **Citation validation is not semantic grounding.** [VF] `lib/llm/analyst.ts:25-42,54-61` warns against untrusted DATA and checks citation identifiers, but does not prove that claims are supported or prevent all prompt injection. Do not describe this as a demonstrated prompt-injection exploit or as verified research. Red-team third-party titles and assess claim-support with human reviewers; retain the explicit unsigned-memo disclaimer.

## Receipt integrity: what holds, and what it does not mean

- [VF] Canonical capsule hashes cover source/demand metadata included in the capsule (`lib/scoring/receipt.ts:10-26`; `lib/scoring/capsule.ts:17-31`; `lib/scan.ts:75-98`). Ed25519 signs the digest. Trust requires a configured public key/keyring, supported algorithm, matching timestamp and valid digest/signature (`receipt.ts:92-107`). An attacker-supplied self-signed key is **not** accepted as an issuer merely because its signature is valid. The selected security tests exercise self-signed/wrong pin/tampered capsule/timestamp/key ID rejection.
- [VF] Share export refuses digest/signature/timestamp mismatch (`lib/share.ts:68-78`); page and OG require shared integrity policy and label hash-only/self-signed artifacts distinctly (`lib/share.ts:55-65`; `app/c/[token]/page.tsx:16-24,50-54`; `app/c/[token]/opengraph-image.tsx:29-38,54`). Links are restricted to HTTP(S) and rendered through React (`lib/share.ts:101-104`; proof page `:69-72`). Inflation has an output limit (`share.ts:89`). These reduce common forgery/XSS/decompression-bomb risks; they are not an exhaustive exploit proof.
- [VF] Trusted durable aliases use content addressing + `SET NX` and revalidate digest/issuer on load (`lib/shares.ts:24-44`). “Write-once” is an application property, **not** protection against an operator deleting Redis, losing the database, or later revoking a key. Self-contained proof URLs are portable plaintext-compressed evidence, not encryption, confidential storage, or revocable shares (`lib/share.ts:8-13`). `no-referrer`/`noindex` headers (`vercel.json:44-54`) help but do not remove URLs from access logs, browser history, messaging previews or recipients' copies.
- [NE] No current deployment key match, custodian provenance, revocation status, independently distributed fingerprint, backup/restore, deletion policy or confidential-pilot approval was inspected. `docs/ISSUER_PIN.md:28-38` explicitly says the historical sandbox-generated private half must be treated as compromised. That is a documented operator gate, not proof a current production key is compromised. Never reuse that historical pair or keep a compromised key trusted solely to preserve old green badges.
- [OP] No confirmed issuer-trust bypass, RCE, unrestricted network SSRF from query input, or runtime secret disclosure was established in this bounded review. Do not convert untested risks into claimed vulnerabilities.

## Deployment / external blockers (owner evidence required)

| Gate | Required evidence before promotion | Owner / stop condition |
|---|---|---|
| Shared admission | Production-default fail-closed fix; actual managed Redis concurrency/outage tests; matched replica budget/window config; restricted Redis commands/credentials; uptime/latency/error alarms | Operator + SRE; any local fallback or unexplained ceiling violation blocks |
| Provider capacity | Account/egress scoped minute quotas and parsed backoff across replicas; measured source degradation; bounded scan cancellation/deadline | SRE; an app global cap alone is insufficient |
| Analyst | Newly rotated least-privilege credential, funded approved account, actual useful completions for required model routes, token/monetary account hard caps, gateway privacy/retention terms | Operator; disable analyst if unavailable rather than emulating success |
| Receipts | Fresh operator-held Ed25519 key, active pin match and independent public fingerprint publication, revocation procedure; documented share privacy/retention | Operator + security; old compromised keys cannot remain trusted |
| Deployment identity / rollback | Gate on the actual deployed full SHA, fresh requests, promotion protection, no-cache readiness, external checks and rollback/kill-switch drill | Release owner; manual report alone is not automatic protection |
| Pilot / commercial scope | Consented nonconfidential queries; contact data separately access-controlled; deletion process; no unsupported entitlements/billing; human relevance/claim review | Founder + privacy owner; no paid reliability or privacy promises without implementation |

[VF] `.github/workflows/deployment-gate.yml:2-8,20-34` is manual `workflow_dispatch`, accepts nonstrict mode, and writes an artifact. It does not itself block promotion; external branch/promotion rules are [NE]. Expected SHA checking is present. `.github/workflows/ci.yml:12-18,27-32` runs real-Redis Lua tests in CI, but green CI is not managed-Upstash or deployed failure evidence. `vercel.json:7-24` bounds selected server functions; it does not enforce provider or monetary budgets. The analyst exports 60 seconds (`app/api/analyst/route.ts:10`) and runs scan before a router with its own deadline (`:26-27`; `lib/llm/router.ts:256,323,359-370`): test whole-request deadlines/cancellation rather than quoting router timing alone. Under-200ms failover is measured **after detection**, not detection latency or time-to-answer.

Historical release documentation is not fresh external evidence: `docs/RELEASE_1_6_10.md:31-45,59-62` reports prior gateway quota exhaustion and failing strict gates. I did not rerun live calls, inspect balances, or infer those are the current external states. `docs/LAUNCH_DECISION_2026.md:9-17` proposes five pilots, repeat use and written commitments; none are established by this code/test review. Independent held-out calibration, decision utility, retention and commercial commitments remain [NE]. Keep them separate from technical approval.

### Unsafe shortcuts to reject

- Setting production distributed-required false, allowing loopback Redis in production, substituting an emulator for managed target evidence, increasing quotas to make a canary green, or refunding timed-out/cancelled work.
- Passing a beta/non-strict gate as production certification; reusing a cached scan; accepting missing build SHA; changing failed gateway completions into synthetic 200s; claiming all model routes work because failover code passed mocks.
- Treating `signatureValid`, a matching hash, or a self-carried public key as issuer authentication; silently downgrading signed mode; retaining compromised pins for rotation compatibility.
- Advertising provider ceilings/circuit breakers as fleet-wide; advertising the hedge governor as a strict hard spend cap; treating aborted hedges as free; using winner usage as billing truth.
- Sharing confidential pilot ideas through public proof URLs or logging full queries/secrets. The URL is the artifact; noindex is not access control or deletion.
- Calling citation-ID existence semantic correctness, discussion activity buyer demand, or a green test suite paid-product readiness.

## Verification performed / bounded next plan

### Performed locally

1. Fully read the supplied Founder_Work.md (entire file), all files below, and the cited supporting source/configuration. No full repository audit is claimed.
2. Existing selected tests: **81 passed, 0 failed, 0 skipped** across security, receipts/shares, shared budget, router, adaptive hedge, pacing, health, source health and loopback-distributed tests. Logs: `/data/council-security-tests.txt`. This run took approximately 9.6 seconds; it preceded later parent edits and is not a final-merge result.
3. Release-gate JavaScript tests: **10 passed, 0 failed** at that run; log `/data/council-security-gate-tests.txt`. The gate was reread after the parent's supply-provenance addition and the stale/open-model fixture still passed.
4. Clean-environment bespoke reproduction: `/data/council-security-repro.mts` and `/data/council-security-repro.json`. Observed S1, S2, S4, S5, S6 and conditional forwarded identity. First attempt as `.ts` failed due to CJS transformation of the gate's top-level await; rerunning as `.mts` succeeded. No network/provider operation was used in these reproductions.
5. Real Redis server/CLI were unavailable here; production Lua was **not** run against actual Redis. The loopback tests exercise the bundled REST emulator, not the target implementation. No npm/pnpm install, build, deployment, audit advisory lookup, actual ingress test, provider stress test, pilot test or secret operation was run.

### Next 24 hours — engineer/SRE: three bounded loops

**Loop 1: enforce boundaries.** Fix S1 and request/dispatch hedge reservation; add regression tests and rerun affected suites. Owner: backend engineer. Output: minimal reviewed diff + production fail-closed/atomic-hedge tests. Success: zero upstream work under missing/unavailable production Redis; deterministic hedge bound under simultaneous stalls.

**Loop 2: evidence and accounting.** Fix S2/S5/S6, preserving the parent's provenance/evidence work. Owner: backend + release engineer. Output: fresh canary, active signer validation and per-attempt accounting tests. Success: stale cache/dead enabled model/broken signer cannot produce strict-green; usage is aggregate/incomplete honestly. Do not widen scopes into billing or unrelated refactors.

**Loop 3: target-environment proof.** Operator provisions rotated keys, real Redis and approved provider access; SRE runs two-instance concurrency, backoff, outage and rollback drills with an explicit traffic/spend bound and final deployed SHA. Record request counts, reservation ceilings, source statuses, rejection behavior, timestamps and receipts, never credentials or confidential ideas. Success: no unexpected bypass, useful actual enabled model response, valid issuer, fresh strict gate, operator-owned kill switch. If the target dependencies are unavailable, record the blocker and stop rather than fabricate a receipt or repeat endlessly.

Then run the final merged project's complete unit/typecheck/build workflow in the parent's normal installation context. This reviewer did not interfere with installs or leave app servers running. Within seven days, the founder should execute the preregistered consented pilot and independent claim-support review; operational green is not pilot success. Expand only after observed decision utility and voluntary repeat use, not after adding more routing options.

## Exact mandated files fully read

### Founder brief
- `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md`

### Every `lib/llm/*.ts` (5 files)
- `lib/llm/analyst.ts` (62 lines)
- `lib/llm/fault-injection.ts` (28 lines)
- `lib/llm/hedge-policy.ts` (121 lines)
- `lib/llm/router.ts` (490 lines; read in contiguous sections including 1-40, 35-260, 260-490)
- `lib/llm/shared-budget.ts` (40 lines)

### Every `app/api/*/route.ts` (9 files)
- `app/api/analyst/route.ts` (30 lines)
- `app/api/badge/route.ts` (26 lines)
- `app/api/cohort/route.ts` (48 lines)
- `app/api/compare/route.ts` (55 lines)
- `app/api/export/route.ts` (49 lines)
- `app/api/health/route.ts` (40 lines)
- `app/api/mcp/route.ts` (70 lines)
- `app/api/search/route.ts` (52 lines)
- `app/api/verify/route.ts` (21 lines)

Supporting source fully read: `lib/scoring/receipt.ts`, `lib/scoring/capsule.ts`, `lib/share.ts`, `lib/shares.ts`, `lib/scan.ts`, `lib/core/admission.ts`, `lib/core/ratelimit.ts`, `lib/core/redis-endpoint.ts`, `lib/core/pace.ts`, `lib/core/budget.ts`, `lib/core/fetch.ts`, `lib/core/input.ts`, `lib/sources/github.ts`, `lib/sources/index.ts`, baseline `lib/mcp.ts`, `proxy.ts`, `app/c/[token]/page.tsx`, `app/c/[token]/opengraph-image.tsx`, `scripts/release-gate.mjs` (including reread after parent edit), `scripts/llm-torture.ts`, `vercel.json`, `.github/workflows/ci.yml`, `.github/workflows/deployment-gate.yml`. Selected docs/tests were inspected as cited; this is not a claim to have read all tests or docs.

## Confidence / falsifier

**0.90** [OP] in the listed local code/reproduction defects; **no quantified confidence in production status** because no live target or secrets were used. Weakest assumption: that the reviewed entrypoints/configuration resemble the final deployment rather than an externally guarded variant. Actual ingress sanitization, enforced production-required mode, fresh target receipts, distributed provider quotas and bounded successful analyst/rollback evidence would remove conditional blockers. A green mocked fixture cannot do that. Founder challenge: obtain an operator-owned fresh target-environment receipt and outage/concurrency report before making the next reliability promise.

## Council debate addendum — proposed evidence-integrity diff

Reviewed the parent's evolving diff after the initial report. [OP] Approve the narrow release direction: centralized `qualifiedItems` excludes failed-source and audit-floor items, zero confidence without qualified evidence, healthy comparison-gap guards, latest-wins state updates, and strict receipt-covered supply provenance. None removes the noncode NO-GO conditions above.

**Single severe, bounded security fix to include now:** S1. Make `lib/core/admission.ts:33-35` require distributed admission when `NODE_ENV === 'production' || REQUIRE_DISTRIBUTED_LIMITS === 'true'`, matching `lib/llm/shared-budget.ts:19`; change the health policy at `app/api/health/route.ts:18` and add missing-config production tests. The parent was notified; I did not implement it. This is fail-closed tightening, not a relaxation to obtain a green gate.

Proposed-code objections sent to the parent (line numbers reflect the inspected work-in-progress):

- [VF] `lib/sources/openalex.ts:43-50` accepts one valid title field but does not type-check both. A row with object-valued `display_name` and valid string `title` passes the OR; mapping at `:63` selects the object through `??`. Later semantic filtering expects string `.toLowerCase()` (`lib/scoring/semantic-filter.ts:20-21`). [SI] A malformed upstream row can break a scan. Validate optional title fields individually or map only the validated nonempty string. This is a payload-contract hole, not a remote user-controlled RCE.
- [VF] New PyPI validation at `lib/sources/pypi.ts:29-32` validates release collections as arrays but not their members; `:37` dereferences every member. A `null` file member causes TypeError, and the catch at `:46-48` flags only SyntaxError, silently continuing. [SI] A healthy empty HTML search can then obscure this malformed exact-name response. Validate each release-file record/date and set a static malformed-response notice on contract failure. Add null/scalar member regression cases.
- [NE] GitHub `incomplete_results:true` partial search results are not labeled by the proposed validator or existing mapper. Do not imply pristine exhaustive evidence from such a response. Add a caveat and strict test if this is inside the narrow contract scope.
- [VF] Current dedupe at `lib/core/dedup.ts:39-51` retains the first URL/title twin; the scan applies relevance only after it (`lib/scan.ts:71-72`). [SI] A weaker/irrelevant earlier description can erase a qualified later twin before qualification. The architect should preserve duplicate groups or select the best qualified representative after annotation, with source-order invariance tests; do not silently turn duplication into “no evidence.” Dedupe may alter samples, not magically turn raw upstream totals into unique-company counts.
- [VF] The proposed `LatestRequest` generation helper correctly guards state even if abort is ignored (`lib/core/latest-request.ts:15-29`). `app/page.tsx`'s proof flow checks generation before clipboard await and afterward, but a failed clipboard write enters a fallback prompt without rechecking generation. [SI] The older idea's link can still be presented/copied after a newer query starts. Check generation before side effects/fallback prompts and test clipboard resolution/rejection under a query switch. An already-completed OS clipboard write cannot be undone by a React generation check; do not describe client cancellation as server billing cancellation.

These are bounded review objections to unfinished changes, not claims the final code retains them. Retest the final patch with realistic valid/empty provider fixtures as well as malformed envelopes. Stricter validators should fail closed on corruption without excluding legitimate API field variants. The proposed helper files were fully read for this addendum; source files in the diff were inspected at their changed validation/mapping sites, not represented as a new full-repository audit.

## Final council decision and security dissent

### Accepted narrow scope / inspected progress

[VF] At closing inspection, `scripts/release-gate.mjs:22-24` rejects cached snapshots, ages above 120 seconds, future skew above 30 seconds, unequal scan/capsule timestamps, mismatched displayed query/score/confidence/coverage/verdict, and an unexpected `crowding-1.3` model stamp. `runGate` now sends `fresh:true` (`:53`), search forwards it to `scanIdea` (`app/api/search/route.ts:22,41`), and fresh scans use isolated UUID in-flight keys (`lib/scan.ts:57-59`). These address the original stale-cache and display-binding slice of S2; the initial reproduction is historical and must not be presented as the outcome of this final code.

[OP] Agree to release only the bounded evidence-integrity changes. No gateway routing, hedge accounting/governor, billing, or signer-validation expansion is included in this increment. An enabled analyst's useful real gateway completion remains a **separate external launch gate**, not satisfied by closed breakers or this diff. No technical or commercial production readiness is certified.

### Last-minute gate schema objection — regression tests needed

[VF] At close, `scripts/release-gate.mjs:25` checked breaker values as `b?.state === 'closed' || b?.state === 'half_open'`, but the actual `ModelRouter.health()` publishes **string states** (`lib/llm/router.ts:269-271`). Consequently, a correctly configured enabled analyst with actual closed breaker strings would falsely fail strict. Current new negative tests use object states (`tests/release-gate.test.mjs:93-94`) and miss this producer/consumer mismatch. This was sent to the parent immediately. Correct the schema match, require known model identifiers/valid states as appropriate, and add a positive fixture from actual `router.health()`; missing/all-open must continue to fail. Do not remove the availability check to make tests green. This is a newly observed false-negative readiness defect, not a new proof of unsafe strict approval.

Local final gate test run: **13 passed, 0 failed** (approximately 88 ms), log `/data/council-security-gate-final.txt`; these test results do **not** resolve the above schema issue or constitute a full final-project regression run. The parent's subsequent correction, if any, was not reverified by this reviewer before closing.

### Deferred P0 and explicit dissent

The council declined automatic production-default Redis enforcement in this automatically deploying increment because the current research beta is intentionally unprovisioned and changing the default would make its public scan service unavailable. This deployment characterization is the parent's stated operational context, not independently tested external infrastructure evidence. `lib/core/admission.ts:33-35` was inspected at close and still permits the local fallback unless the distributed-required flag is true.

**Security dissent:** maintain S1 as an unresolved **P0 before public production / capacity guarantees**, not as fixed or waived. An outage-avoidance justification explains sequencing; it does not make process-local quotas global. Do not advertise “production-ready,” hard fleet ceilings, managed Redis protection, or globally coordinated provider pacing for this beta. Require a named operator/release owner, documented accepted risk, beta scope, traffic/provider hard limits, and a concrete provisioning deadline. Coordinate Redis configuration/verification first, then enable required mode and merge the production-default safety fix in a controlled rollout with rollback. If traffic cannot be contained within the actual provider/spend ceilings, restrict/disable scan ingress rather than weakening the strict gate.

### Unresolved at finish

- **P0 external:** managed Redis provisioning, multi-instance concurrency/outage evidence, provider-account minute quotas/backoff, active trusted signer custody/revocation, fresh deployed-SHA strict canary, real useful enabled analyst completion, and a working kill switch/rollback. No external secrets or services were exercised here.
- **P1 code deferred:** atomic hedge dispatch policy, complete/unknown usage accounting, signer readiness/downgrade policy, proof/verify resource controls and outbound config validation. They remain in the report; no claim that the narrow increment resolves them.
- **Proposal objections:** OpenAlex/PyPI malformed-row handling, partial GitHub notice, best qualified duplicate selection, and clipboard fallback race require parent final-patch tests. This close does not imply these evolving changes remain unfixed or were fully reverified.
- **Nontechnical launch blockers:** consent/privacy/deletion and pilot commitments; independently reviewed relevance/claim support; measured decision utility and repeat use. Code integrity improvements are not customer validation.

**Final disposition: approve the limited evidence-integrity direction; dissent on declaring shared-admission safety complete; retain launch NO-GO.** No source edits made by this reviewer. Report is finished; the parent owns final merge tests, operator provisioning, risk acceptance, and promotion decisions.
