# Independent User Advocate — Simultaneity Index

Review date: 2026-10-06. Scope: local source review; no credentials, external queries, or source edits. This report is the only requested deliverable. No real-user study, browser run, production verification, or accessibility certification was performed.

## Executive verdict

[OP] Continue as an **inspectable public-artifact research aid**, not an automated build/kill or applicant-selection authority. The highest-leverage bottleneck is **decision integrity**: keep the query, evidence snapshot, uncertainty, recommendation, export, and recipient view aligned. A disclaimer cannot compensate for a prominent “Build here” or “Move now” directive.

[SI] The smallest credible wedge is helping a builder or analyst identify relevant existing artifacts and plan a falsification step. It is not measuring unique teams, simultaneous invention, market attractiveness, buyer demand, legal novelty, or probability of success.

[NE] Nothing inspected establishes real-user activation, decision-change, retention, payment, or saved time. Historical ship reports describe engineering checks, not customer outcomes. Proposed pilots and interview targets in the playbook are plans, not results.

## Evidence discipline and concurrent changes

Labels follow the fully read Founder_Work.md: [VF] inspected source fact; [SI] inference from source; [OP] judgment; [NE] missing evidence. References below are local source paths/functions, not claims of deployed behavior.

The parent is editing this checkout concurrently. The first home-page read had stale-data and unguarded memo races; a later full read of `app/page.tsx` showed `LatestRequest`, abort signals, current-request checks, clearing old data, cancellation of memo/proof requests, and the corrected home copy “8 supply + 3 demand adapters.” **Treat those race findings as regression targets and fixes observed in source, not as still-unfixed defects or tested fixes.** `LatestRequest` itself was not successfully loaded before this report; timeout semantics remain unverified. Parent is also investigating “Build here” and zero-evidence behavior; recheck those after patches.

## Intended journey and its failure boundaries

1. **Describe a non-confidential idea.** Search has an accessible label, Enter submission, examples, and a 120-character cap (`components/search-form.tsx`). It accepts one/two-character text client-side that the API rejects; explain the minimum before submission. URL/watchlist-driven scans do not populate the input, whose value is internal to SearchForm: bind draft versus completed query explicitly so a blank input cannot look like the active scan.
2. **Wait without losing control.** Loading has a polite status region; all adapter names are animated rather than actual per-adapter progress (`app/page.tsx`). Do not say each is actively “Querying” when a cache can satisfy the request. Use “Checking public sources…” and a genuine completion summary. Offer cancellation/retry if requests stall.
3. **Understand what was observed.** The score dominates before evidence. Move snapshot time, cache/freshness, qualified sample size, missing sources, and the heuristic limitation beside the score. Keep counts of raw matches separate from inspected artifacts and qualified artifacts.
4. **Inspect closest evidence before selecting a hypothesis.** Supply evidence cards are readable but do not display relevance or identify audit-only items (`components/source-section.tsx`). Demand links sit in a collapsed details section with truncated titles (`components/matrix-panel.tsx`). Make “why included / scored versus audit-only / provenance / fetched date” inspectable and expose a short closest-evidence list above recommendations.
5. **Save or share the same claim.** JSON and Markdown preserve a local snapshot; `/s/[q]` reruns; `/c/[token]` freezes a capsule. These are different products. Label them “Live query link,” “Frozen evidence snapshot,” and “Editable decision worksheet.” Integrity/origin checks are not truth checks.
6. **Return and compare responsibly.** Watchlist deltas presently store score, discussion score, quadrant and time, not model version, coverage, qualified count or receipt identity. A changed score can mean changed providers/model/query sample, not changed competition. Show comparability warnings rather than implying a market trend.

## Ranked root causes and fixes

### P0 — Missing observations must not become positive opportunity evidence

[VF, initial scoring snapshot] `lib/scoring/score.ts::computeCrowding` calculates zero with no included sources, maps zero to “Open lane,” and calls `computeWedges` regardless of evidence availability. `lib/scoring/wedge.ts` turns “Open lane” into a high-priority shipping recommendation. `components/score-display.tsx` warns only below 50% responding-source coverage. Healthy adapters with empty or wholly rejected samples can therefore escape that warning; the initial confidence formula can be high when empty channels agree. The later methodology page already claims confidence is forced to zero without qualified items, so this may be under active correction. **Verify code and rendered output agree; do not assume the documentation is a passing test.**

**Root cause:** availability, relevance, and evidentiary sufficiency share one numeric score/verdict path. “No observations” and “observed low density” are not the same state.

**Fix:** derive an explicit eligibility object from adapter health, qualified inspected evidence and primary/mirror provenance. Distinguish all failed, all healthy zero, raw-count/no-sample, all off-topic, and thin but relevant. In insufficient states show “Insufficient evidence” or “No relevant artifacts observed,” not market openness; omit build/kill recommendations. Preserve raw score only as diagnostic data, visibly provisional. Apply the same state to matrix, wedges, memo, brief, cohort, proof and OG images. Retrying a provider failure and refining a phrase are different recovery actions.

**Acceptance:** outage/zero/off-topic fixtures never show “Build here,” “Move now,” or high evidentiary confidence. An honest empty-result message explains limits and proposes inspection/refinement, not a business verdict.

### P0 — Heuristic comparisons cannot authorize build/kill decisions

[VF] `lib/scoring/wedge-expansion.ts` scans title/description regexes across all items of ok sources, ranks smoothed dimension shares, marks the top result `buildHere` once sample >=8, and writes “Build a …”. Eight items can come from one source; these are not eight independently verified builders. Parent is investigating this wording.

[VF] Relevance filtering retains up to two below-threshold audit items (`lib/scoring/semantic-filter.ts`). The main score excludes them, but the inspected sub-lane implementation does not, nor do several wedge item-pattern rules. Unavailable package channels have zero subscores, which can falsely create an ecosystem “gap” when another channel is hot (`lib/scoring/wedge.ts`).

**Root cause:** recommendation consumers do not reuse the scorer’s qualified-evidence and included-channel predicates. Regex absence in a top-N sample is promoted to a market gap.

**Fix:** share a single evidence-selection helper; require the compared channels to be included and relevant before gap language. Replace “Build here” with “Hypothesis to investigate”; replace sub-lane 0–100 estimated scores with “dimension mentioned in X of Y qualified sampled artifacts.” Explain sampling bias, ties and missing coverage; link supporting items and a dedicated verification query. Never call artifacts “builders” or “teams.” Distinguish lower mentions from demonstrated lower competition. Do not represent “compliance-grade” as an attained property or a simple differentiator without security/legal review.

[VF] `lib/scoring/quadrant.ts` says “Move now,” “Ship a narrow v1,” and “kill the idea”; matrix axis hints say high/low demand although the methodology identifies discussion heat. The comment even calls a threshold “real pull.”

**Fix:** use observed artifact density × discussion activity. Replace dramatic quadrants with neutral labels or subordinate legacy labels. Actions should request buyer/workflow evidence and nearest-competitor review. Even fully responding adapters do not establish purchase intent. Never use this to reject applicants automatically.

### P0/P1 — Identity and freshness must travel end to end

[VF] Parent’s later home source prevents older search/memo/proof requests from committing state. This addresses the original A→B→late-A race and old-results-after-error issue. Watchlist re-scan buttons can still initiate another request while the form is disabled: guards must protect every trigger, not only the form.

[VF] `app/api/search/route.ts::handle` in the inspected snapshot accepts `fresh` but calls `scanIdea(q)` without forwarding it. `lib/scan.ts` supports `opts.fresh` and defaults to a 20-minute process cache. Home and shared-page copy promise real-time/live scans without a visible cache state.

**Fix:** forward the fresh option under quota controls; show “Snapshot from [time]; cached” and offer explicit fresh retry. A scan is fresh only if the underlying acquisition was fresh, not because HTTP says no-store. A fresh request may coalesce with an existing in-flight job; define that contract.

[VF] The memo request sends only query/profile; analyst route rescans; home retains only memo text/model/failovers, dropping returned receipt and citations. Even after async races are fixed, the memo can describe a different snapshot of the same idea. Memo UI says verify [E#] links but renders a preformatted string without the API’s citation mapping (`lib/llm/analyst.ts`, `app/api/analyst/route.ts`, `app/page.tsx`). Citation validation confirms IDs exist, not that claims are supported.

**Fix:** bind narrative to the active capsule/receipt or explicitly present its separate snapshot; compare digests before attach. Render numbered citations as safe links to the returned mapping, show invalid/uncited claims, and disclose that demand is not represented in the current supply-only evidence table. Do not silently imply every “Why” claim is evidenced.

### P1 — Recipient views lose the caveats that matter most

[VF] Frozen proof view displays score/verdict/demand/quadrant and source summary, but not capsule coverage/confidence, demand provenance/breakdown, or demandEvidenceLinks. It slices supply evidence to 20 even though capsule can carry 25. A verifier can therefore see an apparently authoritative quadrant without its supporting discussion evidence (`app/c/[token]/page.tsx`).

[VF] Both OG images emphasize verdict and colored score without source-coverage qualification. Live OG truncates query to 90 before scanning, while shared page decodes up to 120: long-query preview and page can describe different scans. Frozen OG correctly rejects invalid proof rather than displaying a score.

**Fix:** render caveats consistently across recipient page, preview, JSON and worksheet. Use the exact same query for acquisition; truncate display only. Put observed time and evidence-sufficiency label on cards. State “Snapshot integrity verified” separately from trusted issuer and source accuracy. Show all evidence or clearly disclose omitted links. An immutable capsule does not freeze externally linked content.

[VF] `lib/brief.ts` is comparatively careful: dates/model, non-probabilistic confidence, failed sources, demand provenance, editable worksheet, receipt scope, safe URL checks and Markdown escaping. Keep it. Its proposed five-interview kill criterion is a suggested experiment to preregister, not a statistically universal stopping rule.

### P1 — Cohort UX can mislead high-stakes decisions

[VF] `components/cohort-form.tsx` leaves old rows visible after edit/failure and allows editing while a request is running. CSV triggers a new scan rather than serializing displayed rows. `lib/cohort.ts` defines noveltyRank as ascending crowding; CSV omits coverage, date, model, receipt and uncertainty. UI omits available confidence/coverage. “No idea-twins detected” is stronger than no lexical flags; metadata says novelty ranking despite page caveats.

**Fix:** capture input/run identity; label previous rows stale or clear them; download the displayed batch with provenance rather than rerun silently. Rename “Novelty” to “Lower observed crowding rank”; put coverage and snapshot in every row/CSV. Use “No lexical-overlap flags at this threshold; semantic overlap not ruled out.” Reject 0/>25/invalid-length rows inline before network; provide row-specific errors. Put consent/external-provider warning immediately beside the textarea, not only in lower pilot copy. Consent is not a guarantee that confidential applications may safely be sent to providers.

### P1/P2 — Accessibility and recovery should be workflow-level

[VF] Good foundations: labels, semantic main/header/nav, visible focus outline, status/alert roles, keyboard-native buttons/details, rel=noopener on many external links, reduced-motion CSS, and text alternatives to colored quadrant selection. These are source strengths, not a WCAG pass.

[SI] Home nav is hidden below sm without a mobile replacement; desktop users have direct methodology access while mobile users do not. At narrow widths long adapter copy and navigation may crowd the header. Provide a visible wrapping mobile menu and a skip-to-main link. Keep limitations reachable before a mobile user acts.

[SI] Results insert far below focused form without a completion announcement or focus policy. Preserve input focus during typing; announce completed query/status and provide “Jump to results.” Distinguish network error, invalid input, quota cooldown, clipboard failure and export failure rather than one global scan error slot.

[VF] CSS signal blue `#2783de` appears on white/light surfaces in small text. Contrast should be measured; do not assume it passes 4.5:1 for normal text. Degraded-demand breakdown uses opacity-50; inspect effective contrast. Verify 10px uppercase labels at 200%/400% zoom, chart text reading order, focus not obscured, screen-reader headings and target spacing. No visual/browser testing was completed.

[VF] Watchlist Remove has no error boundary though save can throw; watch button does catch. Add inline recovery and accessible pressed state. Duplicate generic “Re-scan” controls need lane-specific names. Disclose local-only/no alerts near Watch, not only on Privacy. Record coverage/model/query variants with points and label incomparable deltas.

## Remaining copy drift across pages

Home source now says eight supply plus three demand and includes crates.io in loading; retain that correction. Remaining inspected drift: Pricing says “All 10 sources”; Agents lede says “10 sources” and promises signed receipts unconditionally despite conditional signing later; root layout SEO says “how many teams … inventing” and lists seven supply sources; shared metadata omits crates.io; Privacy omits crates.io and frozen proof storage behavior. Methodology eyebrow remains v1.1 while scoring is crowding-1.3 and incorrectly treats all share links as reruns. Prefer an adapter registry to generate counts/names and one published capability/trust matrix. Cross-page snippets and social metadata are decision language too.

Pulse uses a six-hour cache, drops scan times/coverage, hides confidence on mobile, links to a rerun with different demand/expansion options, and offers an illustrative 81 citation alongside the current date. Show the actual snapshot and settings; mark citation examples explicitly illustrative or generate from the actual row. “Right now” and “most simultaneous” should not imply a comprehensive market leaderboard or independent teams.

## Local browser scenario plan — recommended, not executed

Run against a local app with synthetic fixtures and mocked search/analyst/export endpoints. Use no tokens, real provider calls, private ideas, payments or real-user analytics. Server-rendered share/OG/Pulse routes require a local fixture provider at the server boundary; browser route mocks alone cannot intercept server-side scanIdea. Use snapshot/digest fixtures consistently and assert generated download content, not merely a toast.

| Scenario | Procedure | Required outcome |
| --- | --- | --- |
| A→B race | Seed watched lanes; delay A, run B, release A last | Only B commits result, loading completion, watch history and actions |
| Success→failure | Load A, then B returns 400/429/500/malformed JSON | No unlabeled A result or A export under failed B; actionable retry/cooldown |
| Memo race | Start A memo, scan B, release A memo/error late | No A memo, error or spinner attached to B |
| Proof race | Start A proof export, then scan B; resolve export/clipboard late | No A success attached to B; stale async effects ignored |
| Hung request | Never resolve search/memo/proof | Bounded timeout and recovery; next request works; no false finished state |
| Cache vs fresh | Same query returns cached receipt, then fresh acquisition | Age/cache shown; explicit fresh reaches acquisition; compare receipts |
| All sources failed | Error fixtures for all adapters | Insufficient evidence, no open-market/build/kill directive, export caveats retained |
| Healthy empty | All adapters ok with zero items | No relevant observations distinguished from outage and opportunity |
| Raw/no sample | Huge totalCount with empty sample | Raw count audit only, no high confidence or empty-market conclusion |
| Audit-only floor | Off-topic items retained below relevance threshold | Visible audit-only label; no scoring/sub-lane/memo fact promotion |
| Thin relevant | 1, 7, 8 and 24 qualified items, single/multiple sources | Sample/coverage explicit; no sample threshold becomes “Build here” |
| Channel gap | npm hot/PyPI failed, then PyPI healthy sparse | Failure never interpreted as packaging gap |
| Demand degradation | All unavailable; one source; mirror-only; notice at 100% | Heat unknown/degraded evident; no purchase-intent claim; proof has same caveats |
| Citation mapping | Valid E1, nonexistent E99, uncited text, different receipt | Valid links navigable; errors disclosed; snapshot mismatch blocked/labeled |
| Shares/exports | Markdown/JSON/live/frozen for one fixture | Same claimed snapshot where promised; live rerun clearly different; exact query in OG |
| Proof failures | Tampered token, unsigned, untrusted key, trusted fixture, alias unavailable | Fail closed on invalid; integrity distinct from origin; no authoritative blank score |
| Clipboard/download | Denied clipboard, unsupported API, cancel prompt, download JSON/MD | No false copied confirmation; downloadable/manual fallback with privacy warning |
| Cohort stale/export | Run batch A, edit B, fail B; download CSV after A | Stale A marked; CSV tied to displayed run; caveats and row-level provenance |
| Watchlist | Storage denied/full/corrupt, remove, reload, change model/coverage | Recoverable save/remove; no misleading success; delta comparability visible |
| Keyboard/mobile | Tab/Enter/Space, screen reader; 320/375/768/1280px, 200/400% zoom | Main/nav/results reachable; named controls; announcements, focus and no lost content |
| Content extremes | 3/120-char, emoji, Hindi, long URLs/titles, percent/slash chars | No broken route/overflow; non-Latin relevance limits disclosed rather than false certainty |
| Reduced motion | Emulate prefers-reduced-motion | No looping pulse or distracting transitions |

## Evidence-based experiment and release decision

[OP] One objective: a reviewer can trace a hypothesis to the exact inspected snapshot and identify what is unknown. One bottleneck: decision integrity. Primary initial segment hypothesis: builders comparing related public software artifacts. Funds screening is a separate, higher-stakes validation track, not the default recommendation.

Next 24h — parent engineering owner: finish request guards, eligibility gating and citation/snapshot binding; output deterministic fixture checks for the first 14 scenarios. Success: zero stale commitments or unsupported build/kill directives. Stop release on any P0 fixture failure.

Next 7d — product owner: complete recipient/copy parity, mobile/keyboard checks and cohort safeguards; record exact browser/device versions, fixtures, screenshots and failures. Do not claim accessibility compliance without appropriate verification.

Then recruit consenting target reviewers using non-confidential cases: preregister a comprehension test (identify completed query, timestamp, failed sources, proxy-versus-demand, and live-versus-frozen exports) plus a workflow test (find closest relevant artifact and write a falsification plan). Record observed errors and decisions, including rejection; do not count compliments as demand. Suggested gate, not a measured result: zero critical snapshot/uncertainty misunderstandings before expanding the test. Retained usage or concrete paid commitments require a separate subsequent study.

[OP] Confidence: 0.88 in code-specific UX hazards from the inspected snapshots; 0.45 in their real-world frequency/severity absent browser or user testing. Weakest assumption: users actually want a repeatable artifact-inspection workflow rather than a one-off validation answer. Evidence that would change the verdict: observed correct comprehension, repeated completion on meaningful cases, and independent reviewer evidence of better decisions—not more adapters or a green unit-test count.

## Exact read coverage and verification receipts

**Fully read brief:** `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md` (entire file).

**Fully read UI files** (relative to `/data/frontier-oss-ideas`):
- `components/cohort-form.tsx`
- `components/matrix-panel.tsx`
- `components/page-shell.tsx`
- `components/score-display.tsx`
- `components/search-form.tsx`
- `components/source-section.tsx`
- `components/watchlist.tsx`
- `components/wedge-panel.tsx`
- `app/page.tsx` (initial and later full read showing parent changes)
- `app/agents/page.tsx`
- `app/funds/page.tsx`
- `app/methodology/page.tsx`
- `app/pricing/page.tsx`
- `app/privacy/page.tsx`
- `app/pulse/page.tsx`
- `app/s/[q]/page.tsx`
- `app/c/[token]/page.tsx`
- `app/s/[q]/opengraph-image.tsx`
- `app/c/[token]/opengraph-image.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `app/robots.ts`
- `app/sitemap.ts`

**Fully read supporting source:** `lib/brief.ts`, `lib/scan.ts`, `lib/scoring/index.ts`, `lib/scoring/quadrant.ts`, `lib/scoring/wedge.ts`, `lib/scoring/wedge-expansion.ts`, `lib/scoring/capsule.ts`, `lib/scoring/semantic-filter.ts`, `lib/cohort.ts`, `lib/llm/analyst.ts`, `app/api/export/route.ts`, `app/api/search/route.ts`, `app/api/analyst/route.ts`, `package.json`, `README.md`; tests `tests/claims.test.ts`, `tests/brief.test.ts`, `tests/wedge-expansion.test.ts`.

**Partial supporting reads:** `lib/scoring/score.ts` (first 250 lines and lines 255 through end; the intervening small slice not fully loaded), `lib/demand/index.ts` (183 through end), repository file inventory. Not a full repository audit. No successful read of `lib/core/latest-request.ts`.

**Research coverage (partial, explicitly not full):** keyword excerpts across all seven Markdown files in `/data/research/A_A_Frontier_OSS_Ideas`; substantive first 100 lines of `Simultaneity-Index_GTM_Master_Council_Verdict_2026-09-26.md`; targeted user/pilot/demand/verification excerpts from `SIMULTANEITY_INDEX_100X_PLAYBOOK.md`, `Founder_Session_Report.md`, `SHIP_REPORT_v1.2.md`, `Simultaneity-Index-v1.1-Ship-Report.md`, `Final Report (4).md`. `LEVERAGE_MAP.csv` was inventoried, not analyzed. Older research’s no-cache/no-share/no-MCP inventory is contradicted by current source and must not be recycled as current fact. External competitor/pricing/adoption claims were not independently reverified.

**Tests/browser:** attempted selected credential-free tests using `/data/node_modules/.bin/tsx`; failed before execution because that path does not exist. No tests passed or ran in this review; no production or local browser session ran. Additional final source/tooling inspection was interrupted by sandbox infrastructure errors. All scenario entries above are a proposed test plan, not results. Parent must verify latest patches and run their available harness. No source files were edited by this reviewer.

## Council debate addendum — proposed narrow release (latest diff inspected)

**Approve the direction; approve release only with the following caveats/gates.** The new shared `lib/scoring/evidence.ts` is fully read and correctly excludes non-ok sources and below-threshold audit items. Explicit star-unit parsing removes the earlier numeric-meta trap. The inspected diff makes confidence zero without qualified observations, derives timeline from qualified items, gates cross-channel wedges on healthy/no-notice sources, provides a collect-signal fallback, and changes sub-lane prose to qualified sampled artifacts plus “Investigate first.” These directly address core root causes. They are inspected fixes, not test results. The above historical defect descriptions are superseded where these changes apply.

### Remaining objections to calling the narrow release complete

1. **Zero-evidence headline still reads “Open lane.”** Changing confidence to zero and wedges to collect-signal does not change verdictFor(0). Healthy-empty adapters yield 100% coverage so the current UI warning can still be absent. Require an explicit zero-qualified-evidence banner beside the large score/verdict, and parity in proof/OG/cohort, or replace the decision headline. This is a user-facing release gate even if the numeric diagnostic remains zero.
2. **The guard's timeout is transport cancellation, not an unconditional deadline.** Fully read `lib/core/latest-request.ts`: its timer aborts the controller, but `isCurrent()` tests only generation equality. A transport/mock that ignores abort can later resolve and pass the commit check. Generation guards do handle superseding requests. Add `!controller.signal.aborted` to success-commit eligibility or a separate deadline/result-state guard; retain a way for the timed-out current request to present its error. Test a deferred response that ignores AbortSignal after timeout, not only cancellation-compliant fetch. A truly never-settling mock also needs a raced deadline to finish UI loading; normal browser fetch generally rejects on abort, which is not evidence for every mocked/extended path.
3. **Memo snapshot/citation identity remains unaddressed in the inspected home revision.** The race guard prevents stale query A narrative on B, but the same query can be rescanned at a different digest; home drops citations and receipt. Either bind the memo to the displayed evidence, show its separate dated snapshot and mapped links, or defer the memo surface for an integrity-only release. “Verify each [E#] link” without links is not acceptable evidence UX.
4. **Healthy comparisons are necessary but not sufficient.** An ok/no-notice channel with no inspectable sample and positive raw totals may still be a false packaging gap. Distinguish genuine healthy zero from raw-count/no-sample and wholly off-topic sample; show missing qualification. Avoid interpreting low qualified observations as a proven ecosystem hole. The new qualifiedItems uses `(relevance ?? 1)` when a filter exists: malformed filtered items without annotations become qualified. Internal filter annotates items, so this is not a confirmed normal-flow defect; test this invariant and fail closed if filtered data can enter from elsewhere.
5. **Remaining directive copy can undermine the narrowed claim.** Quadrant “Move now” and “kill” were not changed in the inspected diff. Sub-lane body still proposes a “compliance-grade variant” and displays a noncalibrated parent-derived 0–100 estimate. De-emphasize or relabel these even after the badge fix. Tighten proof/OG caveats, source counts and metadata across pages, not just home.

**Minimum synthetic regression set:** timeout ignoring abort; A/B search and memo/proof races; healthy zero/all failed/audit-only confidence and recommendations; dates/downloads not stars; genuine-star qualifying repo; npm hot with PyPI failed/notice/no-sample; sub-lane sample excludes audit floor; same-query memo digest mismatch; exact export content matched to the displayed snapshot. Parent's planned Chromium journey and synthetic race suite are the right evidence to gather. No parent test results were yet read by this reviewer.

**Read-coverage correction:** after the earlier infrastructure interruption, tooling recovered. `lib/core/latest-request.ts` and `lib/scoring/evidence.ts` were fully read; the latest scoring/wedge/sub-lane/UI diffs were inspected. `app/api/search/route.ts` still has no diff forwarding fresh in this inspection. The report does not claim every concurrently changed adapter or final parent patch was fully reviewed. The earlier absent-helper/infrastructure statements describe the earlier attempt only.

## Final debate disposition — subsequent fixes verified in source

**Approve the narrow evidence-integrity scope with explicit caveats; not an unconditional production-readiness approval.** I inspected the updated helper and diffs without editing source. `canCommit()` now checks generation and non-aborted signal; search/memo/proof response success paths use it, and proof clipboard fallback checks it. This resolves the specific abort-ignoring late-success objection in source. `isCurrent()` remains available for reporting current-request timeout errors, correctly separating success eligibility from error ownership. Native fetch abortion is an appropriate deadline mechanism for this browser implementation; no extra raced deadline is required merely to accommodate a never-settling non-fetch mock. Parent reports targeted tests, but I have not read/run their results and do not record them as independently verified here.

Fresh API forwarding is now present (`scanIdea(q, { fresh })`). Fresh scans use unique in-flight keys; sequence-checked cache writes avoid a slower older healthy scan overwriting a newer cached snapshot. This addresses the earlier forwarding/coalescing objections. A fresh older job completing after a newer badly degraded job can still populate the healthy cache; that is defensible as last-good fallback, provided snapshot age is visible rather than called live. Concurrent fresh requests dispatch separately, so quota/budget coverage remains important; this is not a newly observed abuse bypass.

`quadrantFor` now accepts supplyKnown and suppresses a market quadrant when no qualified supply evidence exists; scanIdea passes `base.confidence > 0`. Blue Ocean action now calls for inspecting alternatives and concrete demand commitment rather than “Move now.” These supersede the earlier no-evidence quadrant and that directive-copy objections. Use explicit evidence sufficiency rather than a confidence-derived boolean in a future cleanup so the semantics stay stable if confidence math changes.

**Remaining acceptance conditions:**
- Crowding score headline still maps zero to “Open lane”; ScoreDisplay still warns only on coverage <50. Healthy zero-qualified scans therefore need an adjacent insufficiency label, with proof/OG/cohort parity. Suppressing the matrix quadrant does not fix the crowding verdict itself.
- Memo remains a separately rescanned narrative whose returned citation mapping and receipt are dropped by home. Bind/render them or defer the memo for an integrity-only release.
- Preserve pending healthy/no-sample comparison guards, cross-page counts/privacy/capability parity, and caveats around noncalibrated sub-lane estimates and “compliance-grade” hypotheses.
- Parent should provide actual Chromium/race-test receipts for search/memo/proof timing, empty/degraded states and exact exports. Engineering tests are not real-user outcomes, demand validation, or an accessibility certification.

**Bottom line:** the debated corrections are materially right and the timeout/fresh/no-evidence-quadrant objections are closed at source-review level. Ship a bounded research aid after the remaining presentation/identity gates pass; do not claim automatic build/kill guidance, verified buyer demand, unique-team measurement, or production readiness from this review.
