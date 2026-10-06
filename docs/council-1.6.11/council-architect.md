# Independent architect verdict — Simultaneity Index

**Reviewed:** 2026-10-06. **Author role:** independent architect; no delegated subagents. **Baseline:** `5a05725cabdcbaca2e88875175aef41c8435fbed` (package 1.6.10). Code references below are relative to `/data/frontier-oss-ideas` **at that commit**, not to the concurrently edited working tree.

## Executive verdict

[OP] **Do not promote to decision-grade production or sell “qualified crowding intelligence” yet.** Keep a narrowly described public research beta. The architecture is tractable: retain the adapter/fan-out design, repair the qualification boundary and provider admission; do not replace it with a large RAG system.

[SI] The principal constraint is not missing features or distribution. It is that **qualification applies to supply scoring but is not an end-to-end invariant**. Audit-floor items can become analyst citations and positioning recommendations, raw demand totals can become “Blue Ocean,” and signatures authenticate an incomplete description of the calculation. More channels multiply these weaknesses.

[VF] Credential-free, isolated baseline tests passed **44/44**, while additional deterministic counterexamples reproduced the failures below. Green tests demonstrate current contracts, not their adequacy. No deployment, paid-customer evidence, current calibration, real Redis outage, load test, or live model success was verified here.

### Boundary and independence

Read the entire supplied `Founder_Work.md`. Attached research is historical hypothesis/claim material, not automatically verified evidence. The September council's “brand is a moat,” “near-zero marginal cost,” and “one week closes critical gaps” claims are not established by source code or the checks here. A signed wrong interpretation remains wrong. Existing calibration expressly uses historical author estimates, not external expert labels (`docs/CALIBRATION.md:3-10`).

The parent reported work in progress on shared `qualifiedItems`, empty-evidence confidence, healthy-comparison wedges, stale client guards and supply provenance gates. These are directionally correct, **not independently accepted as completed**. During initial testing, working-tree results changed. I therefore archived immutable main into `/data/architect-baseline`, reran all cited tests there, and base the verdict exclusively on that baseline. The first working-tree run is excluded from verification evidence. Source was not edited; no credentials were used, printed, requested, or loaded from an env file.

## Architecture: keep the small engine, tighten its contracts

[VF] `lib/scan.ts:61-73` concurrently gathers eight supply channels, a GitHub/HN variant and demand; deduplication precedes relevance filtering and supply scoring. `lib/sources/index.ts:33-51` contains unexpected adapter failures. Cache/coalescing are process-local (`lib/core/cache.ts:11-61`); shared admission is a separate Redis-backed layer (`lib/core/admission.ts:10-49`). Issuer trust correctly requires a deployment-pinned Ed25519 key and matching digest/timestamp (`lib/scoring/receipt.ts:92-107`). Demand trend correctly remains `unknown` rather than extrapolating ranked samples (`lib/demand/index.ts:269-280`). These are good foundations.

[OP] The smallest durable contract is an immutable **evidence assessment**, used by every downstream consumer:

- Item identity, original source/query/variant, observed timestamp, retrieval completeness and original features.
- `qualification: qualified | audit_only | unsupported`, relevance value, threshold and policy version.
- Provider-reported count separately from sampled count, qualified count and bounded scoring count.
- HTTP availability separately from evidence adequacy/completeness and provenance quality.
- A score/recommendation's supporting item IDs and explicit abstention reason.

Do not require an ontology or embeddings to implement this. A shared helper plus typed assessment metadata is enough for the initial fix. Missing relevance should not silently mean qualified once a source has declared a qualification policy.

## Ranked findings and tractable fixes

### P0-1 — Supply qualification is bypassed by downstream evidence consumers

[VF] The filter intentionally retains two subthreshold items (`lib/scoring/semantic-filter.ts:43-60`). Only `score.ts` applies its private `qualifiedItems` helper (`58-62`). Sub-lanes consume all healthy-source items (`wedge-expansion.ts:32-34`), assign confidence by their count (`50`), and can award `buildHere` (`62-64`). Generic wedges read unqualified launch/star items (`wedge.ts:24-25`). Analyst references consume all items without qualification/status checks (`lib/llm/analyst.ts:12-22`). Capsule references also include audit-floor items without their qualification label (`capsule.ts:6-15`).

[VF] Baseline reproduction: eight sources, every sampled item irrelevant, **zero qualified evidence → score 0, confidence 100, 16 analyst refs, 16 unlabeled capsule refs, one “build here” sub-lane and a high-priority speed-to-evidence recommendation**. Artifact: `/data/architect-evidence/baseline-reproduce.json`.

**Fix:** share qualification selection across score, timeline, wedges, sub-lanes and analyst references. Preserve audit-only records in a separate, explicitly labeled audit channel, not the model's allowed fact table. Export qualification status as receipt-covered metadata. Require supporting qualified evidence for recommendations; absence should produce “collect signal,” not “build.”

**Verification:** irrelevant-only and mixed-source fixtures across API, brief, MCP, analyst refs and signed capsule. Adding audit-only items must not change score, confidence, lane sample, recommendations, or qualified citations. Parent changes address part of this; specifically recheck analyst and capsule consumers.

### P0-2 — Demand still has the raw-count inflation path that supply just repaired

[VF] Demand adapters initialize relevance to 1 (`lib/demand/index.ts:79-85,172-178,195-201`). `runDemand` calls `computeDemand` directly, with no qualification/deduplication (`284-291`). Demand scoring uses raw totals and all returned items (`231-256`). Any single available source can supply a score (`269-276`); `scan.ts:74` creates a quadrant without evidence-quality gating. `quadrant.ts:8-10` then advises “Move now.”

[VF] Synthetic SO response: `status=ok`, `totalCount=1,000,000`, **items=[] → demand 100 → Blue Ocean at supply 0**. This is a counterexample to the contract, not evidence that a real provider produced this payload. The mock provider check separately confirms an empty successful list is currently accepted.

**Fix:** qualify demand evidence before scoring, distinguish discussion from explicit need/pain, bound totals by inspectable qualified evidence, and abstain on empty/inadequate samples. Pass adequacy into quadrant selection; a numeric score alone is insufficient. Below-threshold availability should be “unmeasured,” not “low demand.” Preserve mirror degradation. Do not promise buyer demand even after qualification.

**Verification:** empty, irrelevant, mirrored, duplicate, single-source and partially unavailable fixtures must not emit an actionable demand quadrant. Large raw totals with no qualifying items must contribute zero scoring evidence and an inadequacy reason. Ask HN/Stack Overflow general discussion must not automatically qualify as purchase intent.

### P0-3 — Confidence and failed comparisons express certainty about absence

[VF] Confidence is coverage plus inter-source agreement, regardless of qualified evidence count (`score.ts:323-332`); all-zero successful channels yield 100. Wedges treat missing/failed low-side subscore as zero (`wedge.ts:63-85`) and no observed launches as meaningful silence (`87-93`). All failed sources can still produce an open-lane speed recommendation (`score.ts:283-289`; `wedge.ts:27-33`).

**Fix:** zero confidence and abstaining copy for no qualified evidence; distinguish coverage from reliability and calibration. Gate each asymmetry on both relevant channels being operationally and evidentially adequate, not merely present. Do not infer stealth/GTM gaps from missing launch observations. Parent's proposed changes should be verified against these exact conditions.

**Verification:** zero-evidence, all-failed, high npm/failed PyPI, high HF/failed GitHub, and unavailable HN fixtures. Healthy transport must not erase partial-search notices. Strong single-source evidence may still be useful: annotate “single-source signal,” not a calibrated confidence claim.

### P0-4 — Variant merging can erase degraded provenance; signing cannot recover it

[VF] `scan.ts:30-39` spreads only the primary result when both variant and primary succeed, while taking the maximum count and adding variant items. Variant notices disappear. When primary fails, `32` replaces it with the successful variant and loses the primary error/query distinction. The signed source summary records only the resulting aggregate (`capsule.ts:22`; `scan.ts:75-87`).

[VF] Fixture: primary healthy, variant has fallback warning and larger count → merged count uses variant, items include variant, **no notice remains** (`baseline-reproduce.json`). A healthy-supply gate over this aggregate cannot detect the degraded contributing observation.

**Fix:** record per-query observations and notices through merging; compute aggregate adequacy conservatively. Store item origin/variant, primary failure, fallback and completeness in the signed capsule. Do not let variant recovery claim primary-query success.

**Verification:** four-way primary/variant success/failure matrix, rejected-credential variant with healthy primary, overlapping hits and count disagreement. Strict gate rejects degraded contributing observations. This is upstream of the parent's supply-summary equality check and must not be overlooked.

### P1-5 — Qualification has a discontinuous raw-total escape hatch and unsupported-language fail-open

[VF] `qualifiedTotal` bypasses its logarithmic bound when every sampled item qualifies (`score.ts:79-85`). Ten-item npm fixture, raw 2M: **9 qualify → effective 56.709; 10 qualify → 2,000,000**. A provider's top-ranked sample is not a random sample supporting population extrapolation. The relevance tokenizer strips non-ASCII text (`semantic-filter.ts:20-21`), then an empty concept set returns 1 (`37`). Tested Chinese query + unrelated English weather item → relevance 1.

**Fix:** use a bounded, continuous qualified count policy for all sample sizes, or remove extrapolated totals from verdict calculation pending calibration. Treat unsupported/empty concepts as “cannot assess,” not perfect relevance. Unicode tokenization is necessary but alone does not solve cross-language semantics. Tighten overly broad lexical families only after held-out tests.

**Verification:** property tests for continuity, no unsupported-query qualification, and no decisive verdict from tiny top-ranked samples with arbitrary raw totals. Recalibrate any changed score model; do not carry historical 0.83/81% marketing figures to the new model. The baseline comment links `docs/METHODOLOGY_CROWDING_1_3.md` (`score.ts:73`), but that file is absent in the archived commit; create the actual rationale document.

### P1-6 — Provider quotas and backoff are not globally enforced

[VF] Guards live in a per-process map; provider default is 25/min (`core/pace.ts:21-29`). Shared admission budgets scans, not actual provider calls (`admission.ts:28-49`; `proxy.ts:9-10`). A scan can do primary+variant GitHub calls plus fallback/retry; provider capacity is not a scan-work-unit constant. GitHub retry caps delay at five seconds (`sources/github.ts:47-52`). Stack Exchange body `backoff`/quota fields are ignored (`demand/index.ts:169-180`).

[VF] Official GitHub documentation states 30 authenticated or 10 unauthenticated non-code searches/minute; therefore default 25/min is already above the anonymous ceiling, even before multiple instances.[^https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28] GitHub says to honor Retry-After/reset or otherwise wait at least a minute; retrying after at most five seconds conflicts with that guidance.[^https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api] Stack Exchange requires obeying response-body `backoff`, has shared IP quotas without access tokens, and discourages identical calls more often than once a minute.[^https://api.stackexchange.com/docs/throttle]

**Fix:** reserve actual requests in a shared provider/credential-or-egress quota bucket before dispatch; use conservative anonymous ceilings after token fallback. Persist cooldowns from headers/body. When required wait exceeds request deadline, return a degraded source plus retry time—do not sleep briefly and violate backoff. A shared cache can reduce repeat retrieval after the correctness fixes; it is not a substitute for provider admission.

**Verification:** independent worker processes against real local Redis plus mock provider counters; aggregate provider calls never exceed the configured rolling budget; body-backoff=60 prevents same-method dispatch for 60s; Redis failure fails closed. Live-provider validation is still an external gate and was not performed here.

### P1-7 — Release canary can certify cached/incomplete evidence, not fresh retrieval

[VF] Search parses `fresh` and passes it to `handle` (`app/api/search/route.ts:15,35-41`), but `22` calls `scanIdea(q)` without options. `release-gate.mjs:44-46` does not request fresh data. Cache accepts supply coverage >=50 regardless of demand health (`scan.ts:100-101`). Gate checks status/notice, not evidence adequacy, snapshot age or score-to-capsule consistency (`release-gate.mjs:12-31`). Workflow is manual (`.github/workflows/deployment-gate.yml:2-8`), not automatic promotion enforcement.

[VF] GitHub exposes `incomplete_results` on timed-out searches.[^https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28] Adapter ignores it (`github.ts:67-91`); mocked incomplete response was `ok` without notice. Consequently strict gate can treat incomplete retrieval as healthy.

**Fix:** actually forward `fresh`, implement explicit freshness/quality gate, carry provider completeness into notices and signed summary, assert top-level claims equal receipt-covered claims, and promote only the exact canaried SHA. “Configured” Redis/LLM is not operational proof. Preserve a beta gate distinct from strict production acceptance.

**Verification:** warm cache followed by upstream failure must make fresh gate fail; incomplete GitHub response cannot pass strict source health; altered score, counts, qualification, evidence origin and provenance all fail snapshot-consistency checks. Require bounded timestamp age and mandatory expected SHA for promotion.

### P1-8 — Environment parsing has fail-open/unbounded states

[VF] Scan limits are arbitrary `Number(env)` values (`ratelimit.ts:50-53`). `new RateLimiter(NaN,NaN).check('x')` allows requests with nonfinite remaining quota; comparisons to NaN do not enforce limits (`17-30`). Scan cache config uses the same unchecked pattern (`scan.ts:14-17`; `cache.ts:22,35`), permitting non-expiring/unbounded behavior with NaN.

**Fix:** shared bounded-positive-integer config parser with explicit safe defaults or startup refusal; distinguish absent from malformed. Apply to cache, rate windows, batch ceilings and provider caps. Do not expose secret values in validation errors.

**Verification:** missing, whitespace, zero, negative, infinity, NaN, nonnumeric and excessive env values; assert finite bounded operational behavior and clear unhealthy configuration. This is readily tractable without any credentials.

## What receipts do and do not establish

[VF] Ed25519 origin pinning is materially better than checksum-only “verification” (`receipt.ts:66-107`), and `/api/verify` truthfully notes that signature does not prove evidence accuracy (`app/api/verify/route.ts:19`). Preserve this distinction.

[SI] Current capsule cannot reproduce the scoring calculation: evidence links contain title/source/URL only, cap five per source and 25 total, omitting stars, dates, descriptions, launch flags, relevance threshold/qualification, and all scoring evidence beyond the cap (`capsule.ts:6-29`; `types.ts:98-120`). AI allowed refs can exceed receipt-covered links in a dominant-source case (`analyst.ts:14-19` versus capsule per-source cap), yet analyst disclaimer calls them receipt-covered (`analyst.ts:58`). Citation validation only checks E-ID existence (`37-42`); it does not establish claim entailment.

[OP] Version the capsule with full qualified scoring records or a content-addressed evidence manifest and feature snapshots. Link recommendations to supporting record IDs. Validate registry membership **and coverage by signed evidence**, while calling the narrative unverified unless claims have human/structured checks. Do not attempt to fix semantic truth with stronger cryptography. External source content may change: an issuer-observed snapshot is not an independently notarized original.

## Counterarguments and choices

1. **“It is a heuristic; disclaimers suffice.”** A heuristic may be uncalibrated, but must not promote explicitly rejected evidence into confidence, citations or “build here.” Disclaimers do not repair contradictory machine-readable output.
2. **“Audit-floor retention protects niche ideas.”** Agree on retaining evidence for inspection. Disagree on letting it support recommendations. Audit visibility and qualified decision support are separate products.
3. **“Bound every total and you miss established busy lanes.”** Real trade-off. Keep raw count visible, qualify direct high-traction records, and display strong channel evidence. Benchmark a continuous bound on held-out known crowded lanes; do not defend an arbitrary sample cliff as an estimator.
4. **“The global scan limit already protects provider quotas.”** It limits aggregate work over ten minutes, not provider minute quotas across warm instances/retries. Per-provider shared reservations are the tractable root-cause fix.
5. **“Add embeddings and the false positives disappear.”** [UA] Embeddings may improve matching but can introduce opaque errors and costs. First fix ownership/propagation of qualification; otherwise a better classifier feeds the same leaky consumers.

[OP] Three choices: **A)** recommended—small contract repair, adversarial fixtures, then a supervised research beta; **B)** narrower and faster—temporarily disable demand quadrants/AI recommendations and ship supply audit reports only; **C)** do not choose now—add channels, paid cohort scoring or a metric-standard campaign before integrity/calibration gates. C increases reputational downside without resolving the constraint.

## Premortem: failure → root → fix → verification

| Failure | Root | Smallest fix | Verification |
|---|---|---|---|
| User builds “open” lane from unrelated hits | Audit-only records counted as recommendation evidence; empty successful channels inflate confidence | Shared qualification plus abstention | Irrelevant-only full-surface fixture: zero qualified refs/recommendations |
| Fund mistakes discussion for demand | Raw demand totals and mentions become actionable quadrant | Qualified demand and adequate-evidence gate | Empty/mismatched/mirror-only fixtures never trigger “move now” |
| Trusted signature lends authority to unrepeatable wrong score | Capsule omits qualification and scoring features | Signed assessment/feature snapshot manifest | Offline recomputation matches score; altered feature/qualification rejected |
| Launch traffic exhausts GitHub/SO | Per-instance budgets; retries ignore required cooldown | Shared actual-call reservations and persisted cooldown | Multi-process provider counters and body/header backoff tests |
| New deployment “passes” while provider is broken | Cached canary, ignored fresh flag, incomplete HTTP-200 marked healthy | Fresh, completeness-aware, SHA-pinned promotion gate | Warm cache then outage/incomplete mock must fail gate |
| A variant fallback looks primary healthy | Merge discards degraded provenance | Signed per-query observation ledger | Variant warning cannot disappear through merge or export |
| One translated query returns spurious certainty | ASCII tokenizer produces empty concept set → relevance 1 | Unsupported-language abstention/Unicode handling | Cross-language mismatch remains unqualified |
| Small model tweak reverses classifications | Fully-qualified-sample raw-total escape hatch; historical calibration reused | Continuous bound, model version, held-out evaluation | Sample perturbation stability and externally labeled pairs |
| Limits silently disappear after config typo | Number(NaN) accepted as quota/cache configuration | Central bounded config validation | Bad env either safe bounded default or startup/health failure |
| More features create a “moat” with no buyer | Public-artifact count confused with useful decisions | Supervised target-user audit pilot | Behavior-based repeat decision usage and willingness to pay, not scans/stars |

## Immediate plan and acceptance gates

- **24h, owner parent/maintainer:** merge only reviewed integrity fixes; add adversarial fixtures for every downstream consumer. Output: typed shared qualification, abstention and preserved observations. Gate: no rejected evidence changes a decision claim.
- **7d, owner maintainer:** demand qualification, fresh canary, actual-call quotas/backoff and config validation. Output: offline integration receipts with reproducible SHA and mocked provider counters. Gate: deterministic negative-path tests and no per-instance loophole.
- **30d, owner founder + two independent reviewers:** held-out, source-snapshot-based assessment of relevance and ordinal ordering, including sparse/non-English/missing-source lanes. Output: documented disagreements, model-specific results and limits. Gate: preregister accuracy/stability acceptance with intended user, not retrofitted marketing thresholds.
- **90d, owner founder:** only if integrity/operations gates pass, test one narrow buyer workflow (e.g. accelerator analyst reviewing existing public technical artifacts). Gate: repeated use for actual decisions and a concrete paid-pilot commitment. Do not claim novelty, simultaneous invention or market demand from these scans.

[OP] Highest leverage: **make “audit-only cannot become a decision fact” executable everywhere**. Confidence in identified deterministic defects: **0.94**; confidence in live production status: **not assessed**. Weakest assumption: users find qualified public-artifact screening valuable enough to repeat/pay. What would change the verdict: end-to-end qualified-evidence regression proof, target-environment quota/outage receipts, model-specific independent evaluation, and direct workflow adoption.

## Verification receipts and limitations

Artifacts written outside source:
- `/data/architect-evidence/reproduce-baseline.ts` and `baseline-reproduce.json`: deterministic seven-case counterexamples, immutable commit imports.
- `/data/architect-evidence/provider-mocks.ts` and `provider-mocks.json`: mocked GitHub incomplete response and Stack Exchange body backoff, no network dispatch.
- `/data/architect-evidence/baseline-tests.tap`: 44 tests, 44 passed, 0 failed, 0 skipped. Command: `env -i PATH="$PATH" HOME=/data NODE_ENV=test ./node_modules/.bin/tsx --test tests/crowding-attenuation.test.ts tests/semantic-filter.test.ts tests/wedge-expansion.test.ts tests/pacing.test.ts tests/source-health.test.ts tests/security.test.ts` from archived baseline. Installed dependencies borrowed via symlink; no reinstall and no lockfile/environment attestation.

No full verify/build/audit, live scans, load test, MCP real-client test, Redis process test, LLM provider run, billing/identity/privacy implementation audit, or customer interview was performed. Local mocked evidence is not deployment evidence. The concurrent working-tree run (`tests.tap`, `reproduce.json`) is excluded. `HEAD` was reconfirmed unchanged after baseline verification; the source working tree contains the parent's edits, not mine.

## Exact semantic-read inventory

**Fully read, all lines, and semantically considered (not a whole-repo certification):**

- Supplied brief: `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md`.
- Baseline `lib/core/*.ts`, exactly all 11 files: `admission.ts`, `budget.ts`, `cache.ts`, `dedup.ts`, `expand.ts`, `fetch.ts`, `input.ts`, `normalize.ts`, `pace.ts`, `ratelimit.ts`, `redis-endpoint.ts`.
- Baseline: `lib/scan.ts`, `lib/types.ts`, `lib/scoring/semantic-filter.ts`, `lib/scoring/score.ts`, `lib/scoring/quadrant.ts`, `lib/scoring/wedge.ts`, `lib/scoring/wedge-expansion.ts`, `lib/scoring/capsule.ts`, `lib/scoring/receipt.ts`, `lib/demand/index.ts`, `lib/llm/analyst.ts`, `lib/sources/github.ts`, `lib/sources/index.ts`, `lib/sources/npm.ts`, `lib/sources/pypi.ts`, `lib/brief.ts`, `lib/mcp.ts`, `lib/cohort.ts`.
- Baseline routes/config: `app/api/search/route.ts`, `app/api/cohort/route.ts`, `app/api/health/route.ts`, `app/api/analyst/route.ts`, `app/api/verify/route.ts`, `proxy.ts`, `scripts/release-gate.mjs`, `.github/workflows/ci.yml`, `.github/workflows/deployment-gate.yml`, `package.json`.
- Baseline docs: `docs/ARCHITECTURE.md`, `docs/PRODUCTION_GATES.md`, `docs/CALIBRATION.md`, `README.md`.
- Baseline tests: `tests/crowding-attenuation.test.ts`, `tests/semantic-filter.test.ts`, `tests/wedge-expansion.test.ts`.
- Attached research, full: `Founder_Session_Report.md`, `SHIP_REPORT_v1.2.md`, `Simultaneity-Index-v1.1-Ship-Report.md` under `docs/research-inputs/`.
- Public docs: GitHub search documentation's targeted rate-limit/incompleteness excerpts; GitHub best-practices targeted rate-limit excerpt; complete returned Stack Exchange throttle page. GitHub pages are **not** claimed fully read.
- All independently authored reproduction scripts and their resulting baseline artifacts above.

**Partially reviewed / searched, not fully semantically read:**
- Attached `Simultaneity-Index_GTM_Master_Council_Verdict_2026-09-26.md`: lines 1–200 of 289.
- Attached `Final Report (4).md`: lines 1–100 of 470.
- Attached `SIMULTANEITY_INDEX_100X_PLAYBOOK.md`: targeted keyword excerpts for accuracy, semantics, calibration, moats, cost and production; not all 499 lines.
- `tests/pacing.test.ts`, `tests/source-health.test.ts`, `tests/security.test.ts`: executed and their result summaries reviewed; source **not** fully read.
- `package-lock.json`, `pnpm-lock.yaml`, remaining source/docs/tests/UI/adapters, `.env.example`, live deployments, Git history beyond the pinned baseline: inventories or file names at most, **not audited**. `LEVERAGE_MAP.csv` was inventoried but not read. Parent-created `lib/core/latest-request.ts` / `lib/scoring/evidence.ts` and all working-tree fixes were not acceptance-reviewed.

The entire required baseline core/scan/architecture read is complete. No claim that every repository file or every attached research file was fully read.

## Council debate addendum — authorized narrow implementation

**This section supersedes the initial no-source-edit boundary for the later explicit implementation request only.** Original independent baseline findings remain unchanged. Council chose evidence integrity before feature growth and explicitly kept `crowding-1.3`'s total bound; no recalibration/model overhaul was implemented or is proposed as part of this handoff. The sample-cliff observation above remains a documented limitation/future evaluation question, **not** an immediate authorized score change.

### New finding: deduplication can erase the only qualified observation

[VF] Baseline `dedup.ts:35-53` kept the first URL/title observation before `scan.ts:71-72` applied relevance. If an early record has irrelevant text and a later copy of that same artifact has a qualified description, the latter is removed; qualification then sees only irrelevant text. Reversing source order could change the decision evidence. This is a representative-selection defect, not proof of unique-team identity.

**Implemented, exact owned source files only:**
- `lib/core/dedup.ts`: optional query-aware selection using existing deterministic `semanticRelevance`. Highest-relevance observations are considered first, stable source/item priority resolves ties. Kept items remain in their original sources and original item order, with their own URL, description, date, metadata and source-level notices. No blending of features, no fabricated provenance and no raw-total edits. Query-less callers retain the original priority. Existing URL/title identity heuristic is unchanged; title collisions/transitive identity remain heuristic limitations.
- `lib/scan.ts`: passes query into dedup, then applies the original qualification pass. Passes `base.confidence > 0` as the fourth `supplyKnown` argument to the parent's `quadrantFor` contract. Unknown supply therefore does not justify a quadrant.
- `lib/scan.ts`: fresh requests get unique in-flight keys, so they cannot join prior scans. Healthy results still write under the regular cache key. Cached entries carry a process-local start sequence so an older pending scan cannot overwrite a newer healthy cached result while that result is retained. No shared cache, cache policy overhaul, provider request fan-out change or score bound change.
- `tests/dedup-relevance.test.ts`: six tests for stronger URL duplicate survival with unchanged provenance and immutable input, stronger duplicate-title description, legacy/tie source priority, failed-source exclusion plus visible audit-only items, retained display ordering, and fresh isolation/cache population/late-older-write suppression. Mock adapter registry is restored after the scan test; no live source calls or credentials.

**Working-tree verification after the final patch:** `tests/dedup-relevance.test.ts`, `tests/semantic-filter.test.ts`, `tests/v11.test.ts`, `tests/scoring.test.ts`: **32/32 passed, zero failures/skips**. `tsc --noEmit`: **exit 0, no diagnostics**. Receipts: `/data/architect-evidence/handoff-tests.tap`, `/data/architect-evidence/handoff-typecheck.txt`. These checks include simultaneous parent edits and do not replace the separate 44-test immutable baseline evidence. Full build, all tests, production canary and deployment remain the parent's integration gates. Parent owns search's fresh-option forwarding, quadrant implementation and strict gate tests; Red Team owns source-envelope validation. Their files were not edited by this architect.

**Additional semantic-read inventory:** fully read/reviewed the current assigned `lib/core/dedup.ts` and `lib/scan.ts` before and after my changes, and every line of the authored `tests/dedup-relevance.test.ts`; reviewed source diffs and selected test result transcripts. No acceptance claim for other concurrently edited files. Initial no-edit analysis was completed before this authorized implementation phase. No credentials used in either phase.

**Residual blockers after this narrow handoff:** analyst/capsule audit-floor ambiguity, demand qualification/adequacy, variant provenance loss, cross-instance provider quota/backoff and target-environment evidence. Preserve them in the release handoff rather than claiming that the dedup/fresh changes make production green.
