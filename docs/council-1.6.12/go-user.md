# User advocate implementation handoff — exact analyst snapshot integrity

Date: 2026-10-06. Base inspected: `main` at `242c6ec07b98bfc7c993186f507cbfb131e0bf13`. Concurrent checkout work belongs to separate parent/security/demand owners; no commit or merge performed.

## Executive verdict

[OP] The precise analyst identity/citation defect is fixed within my owned scope and passes independent synthetic verification. The memo now describes the **displayed server-retained capsule**, not a new query scan; each numeric `[E#]` occurrence is a navigable, capsule-bound link. Approve this bounded research-aid improvement, not a production/commercial readiness claim or evidence of customer demand.

[OP] The prior highest-leverage bottleneck was decision integrity, not another model/provider. This patch closes that particular defect without claiming calibrated scoring, demand validation, trustworthy generated claims, or paid adoption.

## Independently confirmed root causes

- [VF] Original `app/api/analyst/route.ts::POST` accepted query/profile and called `scanIdea` again. Request generation guards alone could not detect a new digest for the same query.
- [VF] Original `app/page.tsx::requestMemo` retained only narrative/model/failovers, discarding returned receipt and citation mappings. Its instruction to verify `[E#]` links accompanied a plain preformatted string with no links.
- [VF] Original `lib/llm/analyst.ts` selected raw source items, notices and derived wedges, while calling that evidence receipt-covered. A capsule records only a subset of sampled fields/links; raw source title/description and result-level facts are not interchangeable with signed capsule fields.
- [VF] A process-only scan cache is not a dependable lookup across separate serverless search/analyst functions. Parent corrected the initially proposed synchronous/local helper to an asynchronous shared-store contract before integration.

## Owned implementation

Only these repository files were changed by this session:

1. `app/api/analyst/route.ts`
   - Accepts `{ snapshotId, receipt, profile? }`; rejects legacy query-only requests.
   - Awaits `lookupScanSnapshot(snapshotId: string, receipt: unknown): Promise<CrowdingResult | null>` exported by parent-owned `lib/scan.ts`.
   - Ignores caller query/score/source/capsule fields; never invokes `scanIdea` or source acquisition.
   - Unknown/expired/mismatched receipt → 409; thrown store failure → 503; no safe capsule evidence refs → 422 before gateway dispatch; unconfigured analyst → 503. The existing deterministic scan/brief remains usable.
   - Success returns memo snapshot ID, mapped citations, invalid-citation count and route accounting.
2. `lib/llm/analyst.ts`
   - Citation refs come only from capsule supply/demand links; HTTPS parsing rejects malformed URLs, non-HTTPS and embedded credentials.
   - Prompt facts come only from capsule query/time/score/coverage/source summaries/demand summaries. Raw descriptions, notices outside capsule, wedges and unbound trend are omitted.
   - Demand-only evidence is permitted per parent decision but prompt-constrained to discussion observations and missing supply evidence, not strategy/market verdict/wedges.
   - Invalid numeric citations, including long IDs and E0/E01, become `[uncited]`; existing citation validity is explicitly not entailment verification.
   - No-evidence direct helper path returns zero attempts/zero accounting without a gateway call. Receipt ID persists through success/failure.
   - Disclaimer distinguishes capsule-bound interpretation from signed narrative and claim support. No assertion that caller raw source text is receipt-covered.
3. `app/page.tsx`
   - Captures active snapshot; sends only its digest/issued receipt and profile.
   - Requires current request eligibility and active digest before attachment; rejects response digest mismatch and malformed/duplicate/unmapped/foreign/unsafe citation maps.
   - Retains mapped refs; uses titles from the active capsule rather than model-supplied link text.
   - Renders an anchor for every repeated `[E#]` in narrative, plus a mapped evidence list with safe external-link attributes.
   - Shows snapshot prefix/date, invalid-citation warning, uncited-narrative warning and uncertainty scope; errors do not replace scan or remove deterministic exports.
4. New tests only: `tests/analyst-snapshot.test.ts`, `tests/analyst-snapshot-ui.test.ts`, `tests/analyst-snapshot-route.test.ts`.

No package/dependency/lockfile changes. No live gateway keys or gateway calls. No edits to router/hedge/budget, scan/receipt/types or other owners' files.

## Parent helper contract and inspected integration

[VF] Requested exact helper contract and no-rescan/immutable/TTL/receipt-match semantics through parent session messages. Parent owns `lib/core/scan-snapshots.ts` and scan retention integration; this session read, did not modify, that implementation.

[VF] Inspected helper stores JSON copies in an independent digest-keyed store: local 500-entry/20-minute fallback, or authenticated Redis `SET NX EX 1200`/`GET`; bounded record size; exact canonical issued-receipt equality; digest/signature/time checks; fresh parsed return value. Scan retention includes degraded observations and does not replace the healthy query-cache policy. Retention failures leave deterministic scan usable; analyst lookup fails closed.

[NE] My route tests exercised local fallback and required-store misconfiguration, not deployed cross-instance managed Redis. Parent separately reported real-Redis cross-process checks and broader build/tests; those are parent reports, not independently rerun here. No target deployment receipt is asserted by this review.

## Independent verification receipts

Commands were run from `/data/frontier-oss-ideas`.

- [VF] `node_modules/.bin/tsx --test tests/analyst-snapshot*.test.ts`: **17/17 passed, zero skips**. Log: `/data/analyst-snapshot-tests.txt`.
  - Capsule-only facts despite mutated raw source/query/score/wedges; safe supply/demand mapping; invalid numeric refs; no-evidence zero-dispatch; mocked gateway success retains digest/map; demand-only prompt limitation.
  - Actual page helpers executed from its TypeScript source in memory; static rendering verifies every repeated citation anchor, safe attributes and escaped titles.
  - Controlled hook scheduler executes actual home `runSearch`/`requestMemo`: exact body, valid mapping, same-query digest mismatch, late prior-snapshot memo, 503/422/409 preserving deterministic controls. This is an in-process regression, not a browser claim.
  - Actual endpoint: legacy/malformed rejection, unknown snapshot no-acquisition, retained degraded 422 despite injected body evidence, mismatched issued receipt 409, citable unconfigured 503, mocked successful retained capsule path ignoring forged fields, required store misconfiguration 503. No upstream acquisition occurs on analyst calls.
- [VF] Final adjacent run: `node_modules/.bin/tsx --test tests/analyst-snapshot*.test.ts tests/llm-router.test.ts tests/demand-provenance.test.ts tests/latest-request.test.ts tests/evidence-integrity.test.ts`: **558/558 passed, zero skips**. Log: `/data/analyst-regressions.txt`.
- [VF] `npm run typecheck`: passed after parent helper/types landed. Log: `/data/analyst-typecheck.txt`.
- [VF] Scoped `git diff --check`: passed, no whitespace findings.
- [VF] **9/9 real local Chromium checks passed**, with all search/analyst APIs replaced by synthetic route fixtures on a separate local Next dev server, port 3131. Evidence: `/data/analyst-browser-evidence.json`; runner: `/data/analyst-browser.cjs`; screenshot: `/data/analyst-browser-mobile.png`; downloaded JSON: `/data/analyst-browser-downloaded.json`.
  1. Only displayed snapshot ID/receipt submitted.
  2. Every repeated E citation linked inline, mapped list and dated identity visible.
  3. Same-query different digest rejected without losing score.
  4. Download still contains displayed digest after mismatch.
  5. Late memo cannot attach to a newly scanned same-query snapshot.
  6–8. Unconfigured/no-evidence/missing-snapshot errors preserve scan and brief.
  9. At 390px no horizontal overflow or uncaught page errors.
  Local dev server launched for these checks and stopped afterwards. Parent port 3000 was not used.

### Failures and correction history (not hidden)

- Initial typecheck failed because parent helper/type changes were not yet present and the no-evidence fallback omitted required `route.usage`. I fixed the owned fallback with explicit zero accounting; final typecheck passed once parent integrated its helper/types.
- Browser runner initially could not resolve `playwright` from `/data`; used the already-installed `/vercel/sandbox/node_modules/playwright` and `/usr/local/bin/chromium`. No installation/package edit.
- First browser assertion compared lowercase digest prefix to CSS-transformed uppercase visible text. Changed the assertion to case-insensitive; digest/citation implementation was unchanged. The final run passed all nine scenarios.

## Remaining objections / release boundary

1. [NE] A valid citation ID/link does not prove the narrative claim is supported. Tests validate binding and navigability, not model truth. Uncited claims remain possible and are disclosed, not silently called grounded.
2. [OP] Prompt guardrails for discussion-only output are not a deterministic strategic-claim classifier. Do not claim that generated prose can never violate them. If stronger assurance is required, use a fixed discussion-only template or disable this path pending review.
3. [VF] Evidence table remains capped at 24, supply links preceding demand. Large supply capsules may leave no demand citation refs; prompt explicitly forbids invented demand citations. This is a bounded narrative view, not an exhaustive evidence review.
4. [SI] Digest/receipt is a bearer snapshot reference, not per-user authorization. These scans are public-artifact research, but idea text can still be sensitive; the twenty-minute snapshot store needs the parent privacy disclosure and authenticated managed-store configuration. No private ideas were used in verification.
5. [NE] Distributed persistence, actual deployment/key/gateway configuration, exact-SHA target verification, provider health and operational drills remain external gates. Local beta fallback cannot promise cross-instance availability; a 409 is intentional instead of a fabricated new narrative.
6. [OP] The broader product still needs calibrated supply/demand semantics, consistent recipient/OG/cohort caveats, observed comprehension and decision utility. This work is not a complete UI/accessibility audit or buyer-demand experiment. Prior review findings must be checked against current parent/demand changes before repetition.

[OP] Confidence: 0.95 in this scoped identity/link regression fix under tested synthetic cases; no quantified confidence in customer utility or target deployment readiness. Falsifier: any analyst handler acquiring a new query scan, any memo attaching with a different displayed digest, or any rendered numeric E citation lacking a safe capsule-bound mapping.

## Exact read coverage this continuation

Fully read instruction/review/delivery:
- `/data/.agent-service/files/ea3f786f-1d2f-44e6-ba6e-648c9b115d0c/Founder_Work.md` (entire file)
- `/data/council-user.md` (entire prior review, including debate/corrections)
- `docs/DELIVERY_1_6_11.md` (entire; historical claims treated as delivery claims)

Fully read repository UI/source/config:
- `app/page.tsx` (entire original continuation snapshot; owned patch and final full diff)
- `app/api/analyst/route.ts`, `lib/llm/analyst.ts` (entire pre-edit and final implementations)
- `app/api/search/route.ts`
- `components/search-form.tsx`, `components/source-section.tsx`, `components/score-display.tsx`, `components/matrix-panel.tsx`, `components/wedge-panel.tsx`
- `lib/scan.ts`, `lib/types.ts` (entire initial and final parent-integrated versions)
- `lib/core/scan-snapshots.ts`, `lib/core/cache.ts`, `lib/core/latest-request.ts`, `lib/core/input.ts`, `lib/core/ratelimit.ts`
- `lib/scoring/capsule.ts`, `lib/scoring/evidence.ts`, `lib/scoring/receipt.ts`
- `lib/sources/github.ts`
- `package.json`, `tsconfig.json`
- `scripts/browser-integrity-smoke.cjs` (existing harness, read only)

Fully read tests:
- All three new `tests/analyst-snapshot*.test.ts`
- `tests/latest-request.test.ts`, `tests/llm-router.test.ts` (initial 1–220 plus remaining 221–end)
- `tests/evidence-integrity.test.ts`, `tests/demand-provenance.test.ts`
- `tests/claims.test.ts`, `tests/brief.test.ts`, `tests/share.test.ts`, `tests/proof-view.test.ts`, `tests/live-evidence.test.ts`

Partial/targeted reads only:
- `lib/llm/router.ts` (initial types/first 100 lines, environment/configuration/getRouter searches); router is security-owned, not re-audited here.
- Repository/test inventories, diffs/status and supporting file path searches.
- `tests/security.test.ts` appeared in a backgrounded command whose content was not independently consumed here; do not count it as fully read.
- No full current audit of other UI pages/watchlist/cohort/proof/OG files or all research attachments. Earlier `council-user.md` inventory remains a prior review, not newly repeated full-read evidence.

## Final disposition

[OP] Hand off the bounded exact-snapshot fix and its tests to parent. No commit/merge. Preserve explicit NO-GO on commercial/production claims until target gates and consented analyst decision-replay evidence exist. The next customer-facing experiment is still whether a real reviewer correctly identifies the snapshot/limits and can inspect closest artifacts—not counting this engineering patch as traction.

## Final dissent closure — deterministic supply gate (supersedes demand-only allowance above)

Parent requested a narrower root fix after accepting the initial report. **The earlier demand-only gateway allowance and prompt-only objection are now superseded, not release exceptions.**

[VF] Added shared `hasQualifiedSupplyEvidence` in owned `lib/llm/analyst.ts`, based solely on safe HTTPS links in the server-built, qualified **supply** capsule evidence list. It uses the same URL predicate as the citation table. Raw source items and demand links cannot satisfy it.

[VF] Analyst endpoint now responds **422 before router configuration checks or dispatch** when no safe qualified capsule supply ref exists, including demand-only and unsafe-supply snapshots. Exact error: `No qualified supply evidence; discussion links remain in deterministic brief. No strategic memo generated.` The displayed scan and brief remain unchanged.

[VF] `analystMemo` independently applies the same supply gate and returns `no_evidence`, zero attempts/zero usage/no citations, and the retained snapshot ID without calling `router.complete`. Defense does not rely on model obedience. Existing `analystMessages` discussion-only policy test remains as policy verification but does not authorize gateway execution.

[VF] Added direct-helper and retained-snapshot endpoint regressions covering safe discussion links with absent supply, non-HTTPS supply, credential-bearing supply URLs, injected raw caller supply, zero router/config/upstream calls, unchanged brief and retained discussion link. The prior empty-snapshot endpoint test now asserts the precise new error.

[VF] `node_modules/.bin/tsx --test tests/analyst-snapshot*.test.ts`: **19/19 passed, zero skips**. Receipt: `/data/analyst-snapshot-supply-gate-tests.txt`. `npm run typecheck` passed against the concurrently updated 1.6.12 workspace; receipt `/data/analyst-supply-gate-typecheck.txt`. Scoped diff whitespace check passed. No new browser run requested/performed for this addendum; the preceding nine browser checks remain historical to the identity/link patch.

Only the already-owned analyst route/helper and two already-new analyst-snapshot test files changed in this follow-up, plus this report. No package changes, commit, merge, live keys or gateway calls. Broader production gates and claim-entailment limitations still apply; the specific demand-only prompt-level strategy risk is closed by denying narrative generation deterministically.
