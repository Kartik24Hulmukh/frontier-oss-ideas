# Independent Red Team — Simultaneity Index

**Review date:** 2026-10-06. **Initial repository HEAD:** `5a05725cabdcbaca2e88875175aef41c8435fbed` (`package.json` 1.6.10). **Scope:** local code and supplied research; no live deployment or customer verification. The parent changed other files during this review. Findings below distinguish the inspected starting implementation, authorized adapter repairs, observed parent repairs, and outstanding risks.

**Labels:** [VF] directly observed local fact or executed synthetic result; [SI] strong inference; [WI] weak inference; [UA] unverified assumption; [NE] missing evidence; [OP] judgment. Local test results do not certify real providers or deployment. Historical research assertions remain assertions unless independently verified here.

## 1. Executive verdict

**[OP] NO-GO for paid/commercial launch, normalized “market standard” claims, or growth that depends on trustworthy strategic ranking. Conditional GO for a small, consented, explicitly experimental evidence-review pilot.** Do not scale distribution yet. Keep the product narrowly framed as a public-artifact discovery aid, not a novelty detector or buyer-demand instrument.

The most dangerous failure is not an unsigned receipt. It is **a correctly signed, reproducible, confidently wrong recommendation**. At 14:56Z an apparently healthy eight-source scan achieved **100 confidence from one irrelevant item**, and unrelated historical Stack Overflow activity produced demand **100** at **33% coverage** and a Blue Ocean label. The final council repair now caps that singleton to **4 confidence** and abstains on its quadrant. However, **nine generic AI-weather items across three channels still produce 100 confidence**, and the underlying invalid demand score remains 100. [VF; `redteam-evidence/final-check.json`; `redteam-evidence/council-final-check.json`]

The evidence-integrity-first / no-feature-expansion council proposal is directionally right, with a critical objection: integrity must include **measurement validity, abstention and decision utility**, not merely payload checks, signature correctness and UI guards. Otherwise the proposal hardens a misleading instrument.

### Brutal truth

- [SI] More code, more adapters and better cryptography can make this product *look* more authoritative faster than they make it useful.
- [NE] No independently adjudicated predictive accuracy, changed decisions with good outcomes, voluntary retention, or willingness-to-pay receipts were established by this review.
- [OP] A clever metric name is not a moat; a published formula is not a standard; a citation is not customer value; a changed decision is not necessarily a better decision.
- [OP] The current constraint is evidence that a narrowly defined buyer makes a **better, faster recurring decision** from these artifacts. Not the number of launch channels.

## 2. Mandate, boundaries and reproducibility

[VF] Read all **853 lines** of `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md`, including its evidence labels, experiment/kill criteria, anti-delusion rules and operating format.

[VF] Initially performed read-only review. A subsequent explicit parent instruction authorized **only** response-contract fixes in `lib/sources/*.ts` and `tests/adapter-contracts.test.ts`. My source edits are limited to that authorization; I did not change demand, scoring, UI, routing, deployment configuration or other agents' repairs. Added `lib/sources/contract.ts` as a shared dependency-free validator.

[VF] No credentials were requested or used. No outbound requests were made by my reproductions; adapters were executed with `globalThis.fetch` mocked. No `npm install`, `npm ci`, dependency changes, full build, deployment, push or commit was performed by me. The initial reproduction had a CJS/top-level-await harness failure; renaming the external script to `.mts` fixed the harness. That failure was not a product bug.

### Evidence files and commands

- `redteam-evidence/repro.mts` / `results.json` / `repro-output.txt`: initial adverse synthetic probes at 14:51:45Z, after the parent's empty-evidence confidence repair but before my adapter repairs and the parent's dedup change. Includes hashes of the inspected scoring/demand/share code.
- `redteam-evidence/final-check.mts` / `final-check.json`: remaining confidence/demand defects and successful dedup winner after concurrent parent repairs, at 14:56:42Z.
- `redteam-evidence/council-final-check.mts` / `council-final-check.json`: final council caps, quadrant abstention and remaining multi-channel generic-match overconfidence, executed at 15:00:37Z. No source changes.
- `redteam-evidence/adapter-tests.txt`: **39 tests passed, 0 failed** across the new adapter-contract file and four existing test files. New file contributes 26 tests. Everything is offline/mock-based.
- `redteam-evidence/typecheck.txt`: `tsc --noEmit --incremental false`, exit 0 after corrections. This is a shared-tree check at that instant, not deployment evidence.

Reproduce from `/data/frontier-oss-ideas` without installing dependencies:

```sh
./node_modules/.bin/tsx --tsconfig tsconfig.json /data/redteam-evidence/final-check.mts
./node_modules/.bin/tsx --test tests/adapter-contracts.test.ts tests/adapters.test.ts tests/crates.test.ts tests/all-provider-health.test.ts tests/github-credential-health.test.ts
./node_modules/.bin/tsc --noEmit --incremental false
```

**Do not rerun `repro.mts` expecting the original findings file to remain unchanged:** it writes `results.json`, and current code includes repairs. Preserve that original receipt when comparing versions.

## 3. Verified defects, root causes and recommendations

### B1 — HTTP 200 could fabricate healthy empty ecosystems — REPAIRED locally

**[VF] Before repair:** GitHub, HN, OpenAlex, npm and crates accepted `{}` as `status:ok`, count 0, empty items. arXiv accepted arbitrary HTML as a healthy empty feed. PyPI accepted `{}` exact-name responses and invented two package hits from the requested candidate names. The transport health helper classified their HTTP 200 observations healthy. These are mock contract tests, not evidence that any real provider currently returns these payloads. [`results.json.malformedHttp200`; original adapter JSON defaults]

**Root cause:** compile-time types/casts and `?? []`/`?? 0` were substituted for runtime provider schema validation. A transport success was equated to a measurement success.

**Implemented root fix [VF]:** validate expected envelopes, array types, safe non-negative totals and mapped row fields. Preserve genuine empty envelopes. Reject malformed responses with static errors and no upstream body/request URL. arXiv requires feed envelope, explicit total, consistent entry delimiters, required fields, and rejection of API-error entries/HTML. PyPI validates exact-name `info`, releases and individual file records, and cannot launder a malformed exact response through a healthy empty HTML fallback. HF cannot launder a malformed HTTP 200 models/datasets response through a valid other subendpoint. GitHub `incomplete_results:true` retains evidence with a partial-evidence notice. OpenAlex rejects malformed preferred title types and chooses a validated nonempty title fallback.

**Tests [VF]:** 39/39 targeted tests plus clean typecheck. Coverage includes existing minimal fixtures, legitimate empty results, invalid envelopes/totals/rows, malformed successful HF subendpoints, arbitrary arXiv HTML/error feeds, PyPI null/scalar release files and empty-search laundering, OpenAlex preferred-title precedence, and GitHub incomplete notice.

**Residual boundary [NE]:** no live-provider acceptance test of the stricter schemas; no general XML parser; provider schema changes may now visibly degrade availability. That is safer than false emptiness, but requires observation and deliberate schema updates. `sourceHealth` remains an HTTP observation, not parsed-evidence health. Do not present it as a provenance or accuracy certificate.

### B2 — Weak lexical evidence can still receive maximum confidence — SINGLETON REPAIRED; semantic validity OUTSTANDING, P0 for authoritative claims

**[VF] Pre-final-caps reproduction at 14:56Z:** query `AI code review agent`; eight healthy channels, seven empty; GitHub sole title `AI weather model`, no description, dates or traction. Lexical relevance is **0.29**, above threshold **0.18**. Result: score **0**, coverage **100**, confidence **100**. [`final-check.json.oneIrrelevantItem`; `lib/scoring/semantic-filter.ts:9–40,43–60`; `lib/scoring/score.ts:305–315`]

**Root cause:** generic AI-family overlap suffices to qualify; confidence rewards coverage and low score variance, not semantic specificity, sample sufficiency, recall or independently measured error. Rounding tiny subscores to zero helps all channels “agree.”

**Root fix:** separate transport coverage, evidence sufficiency and empirical reliability. Require specific query-concept coverage rather than generic AI/model overlap; return “insufficient evidence” when the qualified sample is weak. Rename the current percentage an operational heuristic, not probability. Do not display maximum epistemic confidence from cross-channel silence. Calibrate reliability on blinded held-out relevance labels and abstentions, including homonyms, adversarial descriptions, synonyms and non-software lanes.

**Parent final repairs acknowledged [VF]:** no evidence => confidence 0; final sufficiency caps multiply the coverage/agreement heuristic by `min(1, qualified_items/8) × min(1, evidence_sources/3)`. Final execution yields singleton confidence **4**, not 100. Production scan abstains when supply confidence <50 or demand coverage <67. This closes the demonstrated singleton strategic-label path. **Residual reproduced:** nine distinct generic AI-weather items across the first three supply channels yield score **2**, confidence **100**, coverage **100**; all qualify through generic AI/model overlap. More false-positive samples satisfy sufficiency without validating semantics. [`council-final-check.json.manyGenericItems`]

### B3 — Demand scores do not validate relevance, intent or comparable recency — OUTSTANDING, P0

**[VF]** `scoreDemandSource` uses raw match counts, question views, generic engagement, and Ask HN markers, without supply-style relevance qualification. Each demand channel can score **100 with 1,000,000 raw hits and zero inspectable items**. A single unrelated 2014 Stack Overflow question, 10,000 total hits and 1,000,000 views produces demand **100**, coverage **33**, trend unknown. Before final abstention guards, coupling it to the weak measured supply above produced **Blue Ocean**. Final production-equivalent guard execution now returns a **null quadrant** for 33% demand coverage and supply confidence 4; the underlying demand score is unchanged at 100. Those gates do not validate relevance when two or three channels are available. [`results.json.demandNoItems`; `final-check.json.historicDemandWithSomeSupply`; `lib/demand/index.ts:154–207,231–292`; `lib/scoring/quadrant.ts:26–42`]

**Root cause:** discussion volume is treated as relevant demand evidence; all-time SO/Ask HN counts are not comparable to Reddit's year-filtered limited results; total/source status can substitute for an inspectable sample. Renormalizing weights lets one available channel become the entire instrument.

**Do not change demand yet — required design/regressions:**
1. Runtime envelope and row contracts for Reddit primary, mirror, SO count/list and Ask HN. Malformed HTTP 200 must not become healthy zero; transport success is not evidence validity.
2. Query-specific qualification before scoring, using actual description/body where available; distinguish product request, complaint, implementation question, launch promotion and unrelated discussion.
3. Empty inspectable qualified sample => no positive demand claim, regardless of raw count. Preserve raw counts for audit separately.
4. Use matched, explicitly documented windows across channels, and timestamps bounded to those windows; missing dates remain unknown, future dates must not count as recent.
5. Label capped returned counts versus provider totals; avoid interpreting counts from unlike queries/windows as a normalized demand scale.
6. Expose primary/mirror, missing coverage and freshness in the decision artifact. Gate quadrants on sufficient evidence on **both** axes, not merely non-null score.
7. Keep trend unknown until comparable repeated windows exist. Current `computeDemand` correctly forces unknown; exported `trendOf` still derives trends from relevance-ranked snippets and should not be reused as a valid trend detector.
8. Buyer commitment remains a separate measurement; discussion heat never becomes willingness to pay by adding more adapters.

### B4 — Outages still rank as “novelty” — OUTSTANDING library/export risk, P1

**[VF]** `computeCrowding` with all sources failed returns 0 score / 0 confidence / 0 coverage but still `Open lane`. `rankCohort` sorts by score alone: failed lane gets **noveltyRank 1**, measured lane with score 15 gets rank 2. CSV labels the field `novelty_rank` and does not carry coverage in its columns. [`results.json.allFailed,cohortOutageRank`; `lib/cohort.ts:35–48,65–69`; `lib/scoring/score.ts:267–290`]

**Root cause:** a numeric fallback for unavailable measurement is used as an actual comparative value. Rank names turn absence of public matches into novelty claims.

**Root fix:** typed `known/partial/insufficient` result state, nullable score for unavailable measurement, and an unranked section for incomplete scans. Compare only compatible supported source sets/windows; include state and coverage in every export. Replace “novelty rank” with a precise observed-artifact crowding ordering, with ties/uncertainty preserved.

**Parent repairs [VF/NE]:** a supply-confidence >=50 guard, demand-coverage >=67 guard and cautious quadrant wording were observed; the parent reported healthy comparison work. Those do not establish that every cohort/CSV/MCP downstream consumer abstains. Reverify that closure against the stable final tree rather than claiming it from a UI improvement.

### B5 — The qualified-total cliff changes the measurement regime — OUTSTANDING, P1

**[VF]** Raw total 1,000,000; sample 10; 9 qualified => effective count **54.000039...**. 10 qualified => **1,000,000**. The final scoring functions cap totals, so this is **not** a million-point score jump; for npm's count term it changes about 21.6 to its cap of 40, before item/recency terms. [`results.json.qualifiedCliff`; `lib/scoring/score.ts:57–69,198–200`]

**Root cause:** the logarithmic evidence bound disappears entirely at fully-qualified samples. One threshold-crossing sampled item switches from bounded evidence to extrapolating the complete unsampled tail. “Monotonic” does not imply smooth or calibrated.

**Root fix:** continuously bound extrapolation for all samples; distinguish discovery-sample evidence from ecosystem-wide prevalence. Search-ranked top 10 are not a random sample, so a statistical-sounding fraction is not a prevalence estimate. Validate stability under query rephrasing, one-item threshold changes, provider ranking changes and duplicate ownership before choosing a new formula. Do not tune for a desired headline verdict.

### B6 — Dedup could erase the only relevant observation — PARENT REPAIRED locally; residual modeling issue

**[VF] Original:** an off-topic earlier GitHub observation and a relevant later HN observation of the same URL were collapsed before relevance filtering; the relevant item disappeared. [`results.json.dedupeBeforeRelevance`]

**[VF] Current:** the parent passes query into dedup and chooses the highest-relevance observation before collapse. The final check retains the relevant HN winner. [`final-check.json.dedupWinner`; `lib/core/dedup.ts:39–67`; `lib/scan.ts:73–74`]

**Residual [SI]:** choosing a single observation still discards independent observations (e.g. repo traction versus launch engagement) and can transfer which channel “owns” evidence, changing channel weights. Canonical URLs alone do not establish unique teams; identical titles can be independent artifacts, while different URLs can refer to one product. Treat identity and channel observations separately; keep a clustered artifact with all observed provenance rather than silently treating either duplication or collapse as unique competitor truth.

### B7 — Receipt integrity is not scoring replay or source truth — OUTSTANDING, P1

**[VF]** Capsule links keep only `{source,title,url}`, at most five items/source and 25 overall. Summaries preserve source/status/raw total/notice and breakdowns, but not full scoring item dates, metadata, relevance thresholds, raw response digests or all qualified evidence. GitHub scoring can use ten sampled items (and merged variants), beyond the five-link export. [`lib/scoring/capsule.ts:5–31`; `lib/scan.ts`; `results.json.capsuleReplay`]

**Root cause:** the signed artifact contains selected outputs and links, not the complete measurement inputs. A valid Ed25519 signature attests to the issuer's capsule bytes; it cannot establish that a provider returned them, that every link supports its claim, or that the score can be independently recomputed.

**Parent final repair [VF]:** capsule supply links and analyst supply citation selection now exclude below-threshold audit-floor items, while raw scan sources retain them for inspection. This prevents audit-only evidence being promoted into citation support; falsely qualified items remain possible.

**Root fix:** either narrow the claim to “issuer-authenticated snapshot of reported outputs” or version a replayable evidence schema with all normalized scoring inputs, sample/qualification metadata, source/variant query, per-source capture time, parameters/model version and raw-payload digest where lawful. Separate integrity, issuer identity, reproducibility, provider attestation, relevance and predictive utility in the verifier/UI. Do not ship a broad “verified” badge conflating them.

**Additional schema weakness [VF]:** `isCapsule` accepts malformed optional `demandSourceSummary`, `demandEvidenceLinks`, `demandBreakdown` and `breakdown` fields. A hash-only receipt over those malformed fields can still get `shareIntegrityValid:true`; the renderer currently avoids consuming some of them, so **no signature bypass/XSS claim is made**. Future verification/export consumers cannot rely on the TypeScript type assertion. Validate version-specific full schemas before accepting capsules. [`lib/share.ts:38–46`; `results.json.shareShape`]

### B8 — Partial search is still healthy full-weight coverage — OUTSTANDING, P1

**[VF]** HF with models HTTP 200 empty and datasets HTTP 503 returns `status:ok`, notice, and supply coverage 100 when passed alone to scorer; PyPI exact-name-only results likewise retain `ok` and full configured weight despite a challenged broad search. New GitHub incomplete notices identify partial search without changing score inclusion. [`results.json.partialHf`; `lib/sources/huggingface.ts`; `lib/sources/pypi.ts`; `lib/scoring/score.ts:available/coverage`]

**Parent final repair [VF]:** `mergeSource` now preserves notices from primary/variant observations, including degraded query coverage. This improves provenance visibility, not measurement completeness.

**Root cause:** `ok` conflates “some inspectable evidence obtained” and “intended search completed.” Source-count coverage does not measure retrieval scope.

**Root fix:** preserve endpoint/query-level completeness and freshness, and explicitly separate partial observations from complete search. Do not impose an arbitrary penalty merely to get lower scores; gate unsupported conclusions and show partialness. The parent's strict supply verifier may reject notices for promotion, but that does not change the free scan's measurement semantics.

## 4. Product/launch failure mechanisms and disconfirmers

| Failure mechanism | Evidence versus inference | Disconfirm the launch thesis with |
|---|---|---|
| Confidently wrong advice destroys trust | [VF] B2–B5; [SI] users may abandon the tool after one obvious miss | Blinded reviewers marking the decisive evidence irrelevant or an “open” lane with known omitted alternatives |
| Broad software feeds do not cover the buyer's competitive landscape | [VF] searched channels are public software/research/discussion feeds; [SI] private SaaS, consultants/internal processes and nontechnical substitutes are underrepresented | Compare named alternatives from five target analysts with returned evidence; measure missed relevant products, not only precision |
| Buyers do not pay for a recurring job | [NE] no commitments/retention receipts established | Concierge artifact versus the analyst's current workflow; ask for a concrete second assignment and a paid pilot, not praise |
| Metric-standard/brand story outruns the measurement | [VF] supplied research explicitly proposes owning the lexicon; [UA] standards adoption or brand defensibility | Independent analysts prefer citing actual competitors and source links, never the numeric score |
| MCP listing creates no habitual use | [VF] MCP is a shipped surface; [UA] registry presence yields adoption/default preflight behavior | Track consented real-client repeat tool calls with completed evidence review, not registry submission count |
| False time-series deltas look like market movement | [VF] source availability and ranking can change output; [SI] deltas could mostly be retrieval noise | Repeated paired scans with fixed source support and stable query semantics; inspect changes in underlying artifacts |
| “Near-zero marginal cost” hides quota/manual costs | [VF] scan fans out to multiple requests per provider; [NE] cost/support baseline | Measure calls, rejected requests, runtime, analyst review and support minutes per completed customer task |
| Launch traffic exceeds provider capacity | [VF] shared default admission 400 units/10min; per-instance pacing 25/provider/min; GH variants, HF and SO use multiple calls | Staging cold-query burst and multiple-instance/outage drill with deployed configuration and real allowed provider ceilings |
| Confidential cohort ideas leak through sharing | [VF] storage-free proof URLs carry evidence/query; short aliases and public routes exist; [SI] participants may share confidential one-liners | Test consent/deletion/referrer/log handling before accepting private batch applications; confidential work must not enter public artifacts |

**Capacity inference, not load result:** 400 one-scan units per 10 minutes permits an average 40 scans/min. With a GitHub variant, that is roughly 80 GH requests/min before retry; default instance pacing is 25/min, while shared upstream quota can also be exhausted across instances. Caches help repeated queries, not cold launch bursts. Actual deployment overrides and sustainable throughput were not measured. [`lib/core/admission.ts:6,42`; `lib/core/pace.ts:26`; `lib/scan.ts:61–68`; `proxy.ts:9`]

## 5. Challenge the research's authority and scoring

1. **[VF] Historical calibration is author-labelled, not independent.** `docs/CALIBRATION.md` explicitly discloses 20 author estimates, historical rho 0.83 / pairwise agreement 81% / exact band agreement 10/20 and no rerun for the release. Those are not current crowding-1.3 accuracy, confidence calibration or outcome prediction. Pairwise comparisons share the same 20 ideas; do not treat pairs as independent observations for narrow intervals. Within-one-band success is permissive on a four-band ordinal scale.
2. **[VF] The research's proposed “calibrated with expert ranking” badges were prescriptions, not observations.** `Final Report (4).md:40–51` and `SIMULTANEITY_INDEX_100X_PLAYBOOK.md:163` invite authority claims that are unsupported until independent reviewers actually label held-out lanes. Do not convert a suggested 72% example into a measured statistic.
3. **[VF] Funding-date text contradicts itself.** The playbook says deadlines fall on the first day of even-numbered months, then calls 3 November the confirmed next deadline (`:25,293,487`). That may refer to a particular call, but the generalized statement is internally inconsistent. Treat all deadline/program/batch assertions as [UA] until checked on the exact official call. No live grant or YC verification performed here.
4. **[VF] “Twenty customers = $40K–$200K ARR” is conditional arithmetic, not a revenue forecast.** The playbook's $2K–$10K/year, 200–500-applicant screening and near-zero-marginal-cost story (`:21,407`) supplies no buyer/payment/support receipts here. The present cohort route caps at 25 by default; paid promises require entitlements and service delivery.
5. **[VF] Council confidence 0.61 is a judgment, not a calibrated success probability.** The GTM verdict names personas and “converged” council positions (`:1–8,255–273`), but the independent reviewer records/methodology behind that convergence were not supplied. The current release note explicitly discloses prior single-author perspectives and missing real pilots. Agreement among prompts fed the same research is correlated evidence, not multiple independent measurements.
6. **[VF] Historical shipping claims disagree by release.** Founder Session Report describes a merged stdio MCP surface; the v1.2 report later documents incorrect framing and tool argument mismatch. A merged commit is not a working real-client integration. Keep version/SHA-specific execution receipts authoritative, not accumulated “shipped” language.
7. **[UA] External competitor claims remain unverified here.** Counts/pricing/registry presence and claimed superiority in the supplied September research were not independently rechecked. Even if true, incumbent feature counts and stars do not prove their paying users or this product's obtainable revenue. Treat a spreadsheet/manual search/general agent/do-nothing as substitutes, not just validator brands.
8. **[VF] Historical strict gate did not pass.** `docs/evidence/gate-production-1.6.9-strict.json` at 2026-10-04, deployed build `a00c99e...`: distributed configuration, issuer trust, healthy supply and healthy demand all fail. This is historical, not a fresh live check. `docs/RELEASE_1_6_10.md` preserves NO-GO and blocked live-model success. Local adapter fixes cannot promote that deployment.

## 6. Debate the council choices

### Choice A — Integrity first, no expansion: support with conditions

**[OP] APPROVE the final evidence-integrity/no-expansion repair direction for a limited research beta, with caveats; DO NOT APPROVE paid/authoritative launch.** The final sufficiency/abstention caps, qualification-consistent citation selection, dedup winner selection, notice preservation and adapter contracts remove concrete harmful failure paths. Approve these as safety heuristics, not semantic correctness or calibration claims.

**[OP] Adopt**, but define integrity as **valid measurement + honest unknowns + supported claims**, not “all types compile and signatures verify.” The authorized adapter repair is necessary. Empty-evidence, stale memo, supply-provenance and comparison guards are necessary. They are not sufficient.

**Objections:**
- Prioritize unknown-state semantics and qualified-evidence sufficiency ahead of more cryptographic infrastructure. A signed false positive is still false.
- Do not postpone customer observation until a perfect scanner exists. A manually checked small pilot can determine whether the workflow is worth fixing.
- Freeze the metric/model during validation; every heuristic repair can invalidate historical calibration and longitudinal comparisons.
- Do not make source completeness depend on three demand providers all agreeing to serve anonymous traffic. That operational ideal may be unattainable; publish a narrower supported scope instead of silently relaxing gates.
- Do not let “no expansion” excuse known harmful advice. Removing authoritative copy, rankings or quadrants is scope reduction, not feature expansion.

### Choice B — Concierge evidence service, score optional

**[OP] Best next experiment.** One customer segment: accelerator analyst assessing a four-idea shortlist. Deliver relevant alternatives and uncertainty, with manual verification. Compare a score-plus-links artifact to links-plus-limitations without score. Measure actual workflow completion, evidence accuracy, time and repeat assignments.

### Choice C — Pause/kill this standalone product

**[OP] Rational if nobody delegates a second real decision or pays after two bounded iterations.** Keep reusable discovery/provenance components, but stop maintaining a metric-standard story unsupported by recurring utility. No new suite, third product or registry campaign to avoid this decision.

**Recommendation:** choose B under A's safety constraints. Keep a pause/kill date. No paid-production certification or fundraising story built on hypothetical buyer count.

## 7. Founder context, risk register and scenario discipline

**Context ledger (no invented personal facts):**
- [VF] Local implementation 1.6.10; public beta framing; eight supply channels, three demand channels, MCP, cohort and share surfaces.
- [VF] Historical production gate failures; local mock-tested repairs this review.
- [NE] Founder runway/burn/time, actual team capacity, reachable analyst network, current users, revenue, conversion, retention, provider approvals and full operating costs.
- [UA] Analysts value public-artifact crowding enough to delegate it repeatedly; name/standard creates defensibility; MCP default behavior compounds.
- [OP] One objective: demonstrate trustworthy repeat decision support. One bottleneck: externally observed utility. One core metric: completed, independently checked evidence reviews that lead to a voluntarily assigned second real task.

**Ranked risk judgments (qualitative, not fitted probabilities):**
1. Semantic/scoring overconfidence: observed defect; very high trust impact.
2. No repeat buyer job: unmeasured, plausibly high likelihood; existential business impact.
3. Provider degradation / capacity mismatch: structural exposure; high launch impact.
4. Confidential cohort handling and unsupported verification claims: plausible severe downside; require privacy/security review before private applications.
5. Metric-standard/distribution thesis fails: speculative upside without evidence; high opportunity cost.
6. Excess product surface consumes founder capacity: unknown resource constraints; operational distraction risk.

**Bear/base/breakout scenarios [OP/UA]:** bear = users see errors, do not repeat, revenue zero and project paused within 30–90 days; base = a small manually verified niche workflow, revenue only on explicit paid pilots, low fixed-cost cap; breakout = repeatedly useful analyst workflow with adjudicated proprietary labels and consented outcomes, wider adoption only after demonstrated retention. **[NE] Defensible probability ranges, dollar capital requirement and multi-year revenue paths cannot be estimated from the supplied customer/runway evidence.** Do not reverse-engineer them into a billion-dollar outcome. Any numerical scenario probabilities would currently be subjective guesses, not investment evidence.

## 8. Immediate execution plan and experiment

| Horizon | Owner | Output | Metric / decision gate |
|---|---|---|---|
| Next 24h | Parent/maintainer + operator | Freeze stable SHA; final suite/build; fresh deployed gate with matching SHA; clearly identify unknown/partial states | No promotion from local tests; every remaining failed gate listed, no unsupported launch claims |
| Next 7d | Research lead + founder | Freeze rubric; two blinded reviewers; five consented analyst tasks, each four lanes | Item precision/omitted alternatives/abstention plus concrete pre/post rationale; no calibration badge before actual measurement |
| Next 30d | Founder | Two bounded workflow iterations, repeat assignment and paid pilot requests | Proceed only if at least 3/5 independently assign a second real task and three written pilot commitments exist; payment stronger than praise |
| Next 90d | Founder/board | Continue/narrow/pause/kill memo using observed cohorts and costs | No expansion without repeat utility and acceptable source reliability; stop if demand still unproven |

**Experiment [OP]:** hypothesis = a verified alternatives brief changes or accelerates an analyst's real screening task and earns voluntary repeat use. Method = five consenting analysts with four assigned lanes each; record their current alternatives/pre-decision, then present a randomized score-plus-links or links-only brief. Independent reviewer assesses relevance and omissions; record decisive evidence, completed task time and reason for repeat/rejection. Freeze the machine version/rubric before collecting outcomes.

**Proposed, not measured, gates:** at least 3/5 identify a concrete useful change and voluntarily provide a second task by week two; no “go build” claim from unknown evidence; three written pilot commitments before paid rollout, and request actual paid commitment before claiming commercial validation. These five-person targets are directional learning gates, not statistical proof. Budget = founder's explicitly capped time; [NE] available cash runway was not supplied.

**Falsifier:** reviewers/analysts prefer the existing workflow or the links-only artifact; apparent decision changes stem from false evidence, and no second tasks emerge. **Kill criterion:** after two bounded iterations, fewer than 3/5 voluntary second assignments and no credible paid commitments => pause paid tier and stop feature growth; narrow once or kill the standalone proposition. A decision change that is worse does not count as success.

## 9. 100× leverage, confidence and reversal conditions

**[OP] Credible nonlinear opportunity:** an adjudicated dataset of query→relevant alternatives→known omissions→real analyst decisions/outcomes, collected with consent and transparent evaluation. That may improve retrieval and decision support. The flywheel is hypothetical until people repeatedly contribute real tasks; public counts and signed generated prose are not themselves a proprietary asset.

**Confidence [OP]: 0.90** in withholding paid/authoritative launch **today**, because directly reproduced epistemic defects and absent buyer/outcome evidence are enough for that decision. This is a subjective decision confidence, not a 90% business-failure forecast. **[WI] Low confidence** in long-term commercial viability in either direction because customer/runway evidence is missing. High confidence in the specific local adapter defect repair; no claim of deployed closure.

**Weakest assumption:** the target analyst has a recurring costly enough screening job where these public artifacts beat existing search/general-agent workflows.

**What would change my mind:** independently adjudicated held-out relevance/recall and abstention results; compatible-source stable comparisons; fresh deployed strict gate/load/outage receipts pinned to final SHA; verified real-client MCP task completion; voluntary repeat assignments; actual paid pilot receipts; and evidence that decisions improve rather than merely change.

**Founder challenge:** hand five skeptical analysts real tasks and ask which claim in the brief they would stake an actual screening decision on. Then ask them to assign the next task and pay. Do not replace rejection with another launch plan.

## 10. Exact reading coverage

**Fully read requested source/demand/share files:**

- `lib/sources/arxiv.ts` (all original 46 lines + every authorized edit)
- `lib/sources/crates.ts` (all original 59 + edits)
- `lib/sources/github.ts` (all original 97 + edits)
- `lib/sources/hackernews.ts` (all original 48 + edits)
- `lib/sources/huggingface.ts` (all original 89 + edits)
- `lib/sources/index.ts` (all 63; unchanged by me)
- `lib/sources/npm.ts` (all original 46 + edits)
- `lib/sources/openalex.ts` (all original 79 + edits)
- `lib/sources/pypi.ts` (all original 90 + edits)
- `lib/sources/contract.ts` (entire newly authored helper)
- `lib/demand/index.ts` (all original 292: lines 1–240 and 231–292; no edits by me)
- `lib/share.ts` (all 104; no edits by me)
- `lib/shares.ts` (all 45; no edits by me)

**No partial-only file in the requested `lib/sources/*`, `lib/demand/*`, `lib/share*.ts` groups at time of inventory.** Every original file in those groups was read; the new helper was authored/read in full. Later source changes by other agents are not silently claimed as a complete fresh reread.

**Other full reads used:** Founder_Work mandate; original `lib/scoring/score.ts`, `lib/scan.ts`, `lib/scoring/capsule.ts`, `lib/scoring/semantic-filter.ts`, `lib/core/dedup.ts`, `lib/cohort.ts`, `lib/core/pace.ts`, `lib/core/fetch.ts`, `lib/core/admission.ts`, `proxy.ts`, `lib/scoring/quadrant.ts`, `app/api/search/route.ts`, `app/api/compare/route.ts`, `app/api/cohort/route.ts`, `app/api/export/route.ts`, `app/c/[token]/page.tsx`, `app/c/[token]/opengraph-image.tsx`, `package.json`; current dedup/evidence/quadrant, full capsule and changed score tail; scan/capsule final changed ranges; `docs/CALIBRATION.md`, `docs/LAUNCH_DECISION_2026.md`, `docs/PRODUCTION_GATES.md`, `docs/RELEASE_1_6_10.md`; `Founder_Session_Report.md`, `SHIP_REPORT_v1.2.md`, `Simultaneity-Index-v1.1-Ship-Report.md`; newly authored contract tests; original crates test.

**Partial reads / scoped excerpts only:**
- `README.md`: directly inspected lines 1–130 and returned introductory excerpts; not claiming the remaining body.
- `lib/scoring/receipt.ts`: visible opening excerpt and lines 50–108; not certifying a full reread.
- `lib/llm/analyst.ts`: targeted citation-selection grep excerpts only; not a full analyst/router security review.
- `lib/scoring/wedge-expansion.ts`: returned first 145-line range; this was a concurrent changing file, not a stable full-tree certification.
- `tests/adapters.test.ts`, `tests/security.test.ts`, other existing test files: selected fixture/test ranges and grep matches; passing execution is not a full content read.
- `Final Report (4).md`: lines 1–150 and targeted claim/line excerpts from remaining sections.
- `SIMULTANEITY_INDEX_100X_PLAYBOOK.md`: lines 1–150 and targeted claims from lines 163–487.
- `Simultaneity-Index_GTM_Master_Council_Verdict_2026-09-26.md`: lines 1–140,255–289 and selected claim excerpts; no full-read claim.
- Historical gate JSON: loaded complete JSON by script; inspected bounded returned configuration/check fields. Other evidence artifacts inventoried, not exhaustively audited.
- `LEVERAGE_MAP.csv`: inventoried only; not read/analyzed. No comparative repository/star counts from it are used in this verdict.

**Coverage limitations [NE]:** not an exhaustive security audit, provider-term legal review, dependency audit, complete LLM-router review, production readiness test, current public-market sweep or customer study. Reported local repairs must be followed by the parent's stable-tree final verification and operator-owned deployed checks.
