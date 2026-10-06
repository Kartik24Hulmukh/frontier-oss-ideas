# Independent GO Red Team — bounded demand qualification implementation

Date: 2026-10-06. Inspected baseline: `/data/frontier-oss-ideas`, HEAD `242c6ec07b98bfc7c993186f507cbfb131e0bf13` (main). Shared working tree was concurrently modified by the parent and other council agents. No commit, merge, push, deployment, install, key use, model/gateway request, or real customer study performed by this agent.

## Executive verdict

**[OP] NO-GO for paid production or authoritative buyer-demand/market-standard claims. Conditional GO for merging the verified bounded evidence-safety repair after the parent's final stable-tree suite/build.** The repair eliminates the demonstrated demand-score inflation from unseen provider totals, views/comments, old/future/missing dates, obvious lexical drift and promotional observations. It does not establish semantic accuracy, independent customer demand or successful real-provider acceptance.

**Brutal truth:** a receipt can faithfully sign an uncalibrated observation. Four URLs across two channels are a safety floor, not four buyers, independent people, willingness to pay, or scientific sufficiency. Even a score of 100 here means the bounded observed sample filled, not 100% market demand. A low sample score is not proof that a market is unwanted.

## Owned and coordinated scope

[Verified local changes] Authored/modified only:
- `/data/frontier-oss-ideas/lib/demand/index.ts`
- `/data/frontier-oss-ideas/lib/demand/qualification.ts` (new)
- `/data/frontier-oss-ideas/tests/demand-qualification.test.ts` (new)
- `/data/frontier-oss-ideas/tests/v11.test.ts` — demand import/helper/expectations only, explicitly authorized by parent in follow-up messages.
- `/data/frontier-oss-ideas/tests/demand-mirror.test.ts` — strengthened raw/rejected audit assertions; explicitly authorized.
- `/data/frontier-oss-ideas/tests/demand-provenance.test.ts` — strengthened stale-evidence abstention, qualified-only receipt links and metadata tamper assertions; explicitly authorized.
- `/data/go-redteam.md` — this requested external report.

Parent owns `lib/types.ts`, scan/capsule projection, supply semantic filtering/scoring and all other changes. Interface was proposed and refined by session messages. Parent added optional type-only `DemandQualification` import and bounded receipt projection; parent changed scan links to `qualifiedDemandItems`. This agent did not change the supply formula or those parent-owned files. Existing SO adapter compatibility test passed unchanged.

## Root cause and implemented contract

[Verified local implementation]
1. HTTP 200 is not evidence validity. Reddit primary validates its envelope and every mapped row; SO validates list and successful count envelopes, required fields, safe totals and total/sample consistency; HN validates envelope, safe count, numeric item IDs, text fields and dates. Returned arrays are bounded at 25; oversized responses fail visibly. Invalid successful count envelopes fail rather than becoming a healthy default count. An unavailable SO count remains a visible top-hits-only notice.
2. Mirror validates its array envelope, records raw returned count including rejected rows, and records malformed-row rejection provenance. Valid normalized audit rows remain inspectable even when stale/unrelated. Malformed mirror rows have a sanitized normalized item where resolvable, otherwise explicit null + raw index + reason. Arbitrary raw upstream bodies are not retained or echoed. Mirror metadata and primary-failure notice are never erased; the existing 0.5 mirror weight factor remains.
3. Same **365-day capture window** in every channel, checked locally for each item: missing/invalid, outside-window and future dates cannot qualify. Reddit uses `sort=new&t=year`; mirror uses explicit `after`/`before` and creation ordering; SO both endpoints use identical `fromdate`/`todate` and creation ordering; HN uses `search_by_date` and both numeric time bounds. Aggregate support requires capture-window ends within 60 seconds and exact same query. These align recency bounds, NOT source retrieval recall/ranking/population.
4. `demand-lexical-window-v1`, explicitly **uncalibrated**: reuse the current transparent expansion/key-term taxonomy; remove generic AI/model/agent/software anchors; require multiple specific query anchors for multi-anchor queries and a title-anchor gate so unrelated title + keyword-dump body cannot pass. Use `semanticRelevance` as diagnostic annotation, not a substitute for demand-specific topical and intent gates. Obvious launches/promotions are rejected; Reddit/HN need lexical request/complaint/help pull. SO's validated question collection supports implementation-question observations, not buyer intent.
5. Raw provider/returned `totalCount` stays unchanged for audit. Full source items retain normalized rejected observations. Metadata carries query/method/window/capturedAt/raw/sample/qualified/rejected counts, qualified indices, reasons and rejected items with primary/mirror provenance. Qualified total = observed unique qualified URLs, bounded at 25, **no extrapolation**. The receipt projection omits raw rejected items/indices to bound artifact size, retains audit counts and qualification context (parent integration).
6. Source heat = `round(min(100, qualified_observed_count / 25 * 100))`; engagement and raw totals contribute **nothing**. Selection is revalidated using stored query/window, not spoofable count/indices. Healthy empty, old/unrelated-only and legacy/no-qualification sources cannot establish a positive score.
7. Aggregate abstains (`score:null`) below **2 distinct supported source IDs + 4 unique qualified URLs**, for mixed query/window support, or duplicate source IDs. Coverage is qualified-supported unique channels / 3, not HTTP-response coverage. These thresholds are disclosed **uncalibrated safeguards**; per-source `sufficient` means at least one inspectable qualified observation, not aggregate sufficiency. Breakdown explicitly states aggregate-abstention reasons. Failed sources never contribute. `trendOf` and aggregate trend always return `unknown`: ranked or bounded latest snippets are not measured temporal rates.
8. Discussion heat never becomes verified buyer demand. Legacy demand-only tests previously rewarded fake non-HTTPS `t0` rows without query and all-time counts; explicitly authorized updates now use HTTPS/recent/query-specific pull fixtures, expect bounded observed count rather than raw heat, expect empty aggregate null, and expect trend unknown. Supply/other v11 expectations untouched.

## Executed verification — all synthetic/offline

[Verified local execution] Command:

```sh
cd /data/frontier-oss-ideas
./node_modules/.bin/tsx --test tests/demand-qualification.test.ts tests/demand-mirror.test.ts tests/demand-provenance.test.ts tests/adapters.test.ts tests/v11.test.ts
./node_modules/.bin/tsc --noEmit --incremental false
git diff --check -- lib/demand/index.ts lib/demand/qualification.ts tests/demand-qualification.test.ts tests/v11.test.ts tests/demand-mirror.test.ts tests/demand-provenance.test.ts
```

- **706 tests passed, 0 failed, 0 skipped** in the final targeted shared-tree run, logged at `/data/redteam-demand-tests-final.txt`.
- New test file contributes **674 tests**, including **648 deterministic synthetic combinations**: 3 channels × 2 origins × 3 audit totals × 4 date states × 3 topical/intent states × 3 sample sizes. These are fixtures, **not hundreds of real users**, interviews or provider success samples.
- Other cases cover malformed HTTP200 envelopes/rows/counts, real-empty contract versus epistemic abstention, matched query restrictions, aliases and generic AI drift/body stuffing, exact date boundaries, duplicate URLs, audit retention, sample bound, forged stored counts/indices, mixed query/window/duplicate-channel insufficiency, and source/mirror provenance.
- Existing mirror/SO fallback tests pass. Scan → receipt → verification test now proves old mirrored evidence cannot qualify, rejected links are excluded, normalized audit row remains, mirror/notice survive, and tampering with receipt-bound qualification counts breaks the digest.
- Final nonincremental **typecheck exit 0**, `/data/redteam-demand-typecheck-final.txt` (empty stdout/stderr). Initial shared-tree typechecks temporarily failed while parent type/snapshot/usage edits were incomplete; those were not reported as passes.
- Scoped diff whitespace check passed.
- No full build or whole-repository suite executed by this agent. Parent must run stable-tree final verification. No public provider, deployment, managed Redis, funded-model or customer-result certification follows from these tests.

## Adversarial dissent / residual risks

1. **[NE] Semantic validity remains unmeasured.** Lexical anchors can misread homonyms, negation, sarcasm, quoted requests and appended keyword bait; conservative title gates can miss body-only comments and legitimate paraphrases. A question can mean free technical help, not demand for a product. Do not publish a calibrated relevance or buyer-intent badge.
2. **[SI] Search samples are biased and unlike across channels.** Explicit recency bounds do not establish equal recall, a random sample, complete retrieval, unique people/organizations or meaningful population denominators. URL dedup does not establish unique buyers; exact-query matching is intentionally strict. Two supported channels can repeat one community's narrative.
3. **[OP] 25-item scale, 60-second alignment, 2-channel/4-URL gates and intent/title thresholds are safety design choices, not validated calibration.** Do not infer market absence or use numeric quadrant language as strategic proof. Freeze method/version before external evaluation; historical demand outputs are not comparable to this new measurement regime.
4. **[NE] Stricter provider contracts have not had a live acceptance drill.** Provider schema changes may reduce availability; this is safer than malformed-success inflation, but operator observation is needed. Missing SO counts stay visibly partial. A full unread tail is never extrapolated.
5. **[NE] Receipt bounds are not full replay/provider attestation.** Receipt summary omits rejected item content/indices; full sources are retained in scan but not necessarily export. Crypto proves issuer-reported bytes, not provider truth, semantic correctness or a trustworthy signer.
6. **[OP] Production and commercial NO-GO unchanged.** Managed shared quotas/admission, trusted operator signer, deployed strict gate/target SHA, outage/load/rollback, billing/entitlements/privacy and observed buyer commitments are separate parent/operator gates. Nothing in this demand-only patch closes them.

## Historical research: challenge, not accumulated authority

[Verified textual observations] The fully read Final Report calls the name a real moat, recommends launches/PH as demand, and offers a hypothetical 72% expert-calibration badge; the later GTM verdict calls the metric-standard position defensible, rejects per-report pricing and prioritizes HN/registries rather than PH-first. Pricing prescriptions conflict ($19 Pro versus $6 watchlist, annual cohort versus per-session triage). Those are historical proposals, not measured commitments. PH launches are supply/promotion, never demand by mere counting.

Historical founder report says stdio MCP shipped; later v1.2 report says framing/argument mismatches meant real clients could hang. Thus a merged artifact is not a working client receipt. Calibration document explicitly limits 20 author labels; historical rho/ordinal agreement cannot certify this method. Historical generic-weather and old-demand JSON reproductions remain preserved, not overwritten to manufacture before/after evidence. The latest release explicitly retains semantic, operational and commercial NO-GO. Competitive counts, grants/deadlines, licenses and historical deployment claims were not independently reverified in this offline scope.

## Options and bounded next experiment

- **A — Approve repair as research-beta safety increment only.** Parent stable-tree suite/build, final qualified receipt bindings, operator canary. Do not launch it as buyer demand.
- **B — Preferred next validation: manually checked alternatives/pull brief with numeric score optional.** Freeze method; two blinded reviewers adjudicate relevant/irrelevant/request/promotion/implementation items and named omissions, including held-out homonyms/body-only comments. Separately recruit consenting budget owners for real screening tasks and voluntary second assignments/payment requests. Synthetic pass rate is not utility.
- **C — Hide/retire demand quadrants if external relevance/utility fails.** Keep inspectable discovery links and uncertainty; do not expand frameworks/adapters to avoid a negative result.

Recommendation [OP]: A followed by B; C if two bounded validation cycles show no useful independently checked repeat decision support. Nonlinear leverage is an adjudicated, consented query→evidence→decision-outcome dataset, not more signed public counts. Confidence [OP] 0.90 in withholding authoritative/paid launch now; not a business-failure probability. Weakest assumption: target analysts have a recurring costly job this artifact improves. Reversal evidence: held-out relevance/omission labels, compatible repeated captures, final deployed technical receipts, and voluntary repeat/paid commitments. Founder challenge: ask skeptical analysts to stake one real screening decision on a manually verified claim, then assign and fund the next task.

## Exact full-read paths

Full text actually read in this session (not merely globbed/inventoried or executed):

### Mandate / release / historical evidence
- `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md` — all 853 lines, explicit bounded ranges completed.
- `/data/frontier-oss-ideas/docs/council-1.6.11/council-redteam.md` — all 268 lines.
- `/data/frontier-oss-ideas/docs/RELEASE_1_6_11.md`
- `/data/frontier-oss-ideas/docs/CALIBRATION.md`
- `/data/frontier-oss-ideas/docs/COUNCIL_DECISIONS_1_6_11.md`
- `/data/frontier-oss-ideas/docs/evidence/gate-production-1.6.9-strict.json`
- `/data/redteam-evidence/final-check.json`
- `/data/redteam-evidence/council-final-check.json`
- `/data/research/A_A_Frontier_OSS_Ideas/Founder_Session_Report.md` — all 27 lines.
- `/data/research/A_A_Frontier_OSS_Ideas/SHIP_REPORT_v1.2.md` — all 44 lines.
- `/data/research/A_A_Frontier_OSS_Ideas/Simultaneity-Index-v1.1-Ship-Report.md` — all 33 lines.
- `/data/research/A_A_Frontier_OSS_Ideas/LEVERAGE_MAP.csv` — all 25 lines; textual prescriptions only, not independent license/star verification.
- `/data/research/A_A_Frontier_OSS_Ideas/Final Report (4).md` — all 470 lines via 1–150, 151–310 and 311–470.
- `/data/research/A_A_Frontier_OSS_Ideas/Simultaneity-Index_GTM_Master_Council_Verdict_2026-09-26.md` — all 289 lines via 1–170 and 171–289.

### Implementation / compatibility reads
- `/data/frontier-oss-ideas/lib/demand/index.ts` — original and final authored version in full.
- `/data/frontier-oss-ideas/lib/demand/qualification.ts` — full authored version.
- `/data/frontier-oss-ideas/lib/core/expand.ts` — full original taxonomy.
- `/data/frontier-oss-ideas/lib/scoring/semantic-filter.ts` — full baseline version; NOT claiming full later parent-modified reread.
- `/data/frontier-oss-ideas/lib/sources/contract.ts`
- `/data/frontier-oss-ideas/package.json`
- `/data/frontier-oss-ideas/tests/demand-mirror.test.ts` — full baseline plus authorized edits.
- `/data/frontier-oss-ideas/tests/demand-provenance.test.ts` — full baseline plus authorized edits.
- `/data/frontier-oss-ideas/tests/demand-qualification.test.ts` — full new authored file.

### Partial/inventory-only, explicitly NOT full-read
- `/data/research/A_A_Frontier_OSS_Ideas/SIMULTANEITY_INDEX_100X_PLAYBOOK.md` — inventoried line/byte counts only; full 499-line historical text remains unread here (capacity allocated to implementation, mandatory source reads and adverse evidence).
- `/data/frontier-oss-ideas/lib/types.ts` — initial head/demand interface excerpts; parent new metadata not fully reread.
- `/data/frontier-oss-ideas/lib/scan.ts` — scoped scan/receipt selection excerpts only.
- `/data/frontier-oss-ideas/tests/v11.test.ts` — first 120 lines including full demand section and later authorized demand edits; remaining supply/receipt/MCP/cohort body not fully read.
- `/data/frontier-oss-ideas/tests/adapters.test.ts` — SO partial-total excerpt, not full file; execution is not a full read.
- Other repository/historical nested evidence paths — selected inventory only; no exhaustive history or security-audit claim.
