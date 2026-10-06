# Simultaneity Index 1.6.11 — evidence-integrity increment

6 October 2026. Baseline: `5a05725cabdcbaca2e88875175aef41c8435fbed` (1.6.10). **Research beta only; production/commercial launch NO-GO.** GitHub merge/deployment status must be established separately from this local verification record.

## Exact resume point

The supplied 4 October handoff described local commits `2afd446` and `deca3de`, but their patch/source archive was not attached and neither commit existed on verified main. Reconstructed the handoff repairs against main, preserving the `crowding-1.3` usable-total formula. Founder_Work.md and repos.md were supplied and read; their instructions are user operating constraints, not higher-priority system instructions. Six independent agent sessions reviewed architecture, product, growth, security/reliability, user advocacy and adversarial failure modes. These are model-agent reviews, not human interviews or independent scientific validation.

## Root-cause changes

- Share healthy qualified-item selection across scoring, wedges, sub-lanes, capsule links and analyst references. Audit-floor observations remain visible in full scan sources, but cannot support recommendations/citations.
- Empty qualified supply ⇒ zero confidence, no sub-lanes, collect-signal task. Sparse confidence is capped by `min(1, qualifiedItems/8) × min(1, qualifiedSources/3)`; this is an explicitly uncalibrated safeguard, not an accuracy probability.
- Market quadrants abstain below 50% supply confidence or 67% responding demand coverage. Low-evidence scan/proof/preview surfaces say insufficient evidence. Legacy numeric verdict fields remain compatible; a zero diagnostic is not proof of an open market.
- Require healthy/no-notice comparison sources before ecosystem-gap hypotheses; parse explicit star units rather than repository dates/downloads. UI and MCP say Investigate first.
- All eight supply adapters validate successful response envelopes, counts and required rows. Malformed HTTP 200 responses are errors, not healthy zero. Genuine empty payloads remain healthy. GitHub incomplete results, PyPI exact-only and partial HF evidence remain visible caveats.
- Choose the strongest existing query-relevant duplicate observation without mixing provenance. Preserve variant/primary failure notices. A fresh scan bypasses cache and older in-flight work; an older completion cannot overwrite a newer retained healthy cache entry.
- Cancel superseded search/memo/proof requests; generation guards and post-timeout success rejection prevent stale data attachment. Clear old decision evidence on a new or failed scan. Native browser fetch cancellation bounds network waits.
- Strict canary checks receipt-covered supply provenance, fresh noncached age/skew, display-to-capsule/model binding and actual string-valued breaker schema. All-open/missing enabled analyst breakers fail. This is still a canary, not a live useful-model/capacity certificate.
- Correct exact source weights/counts/methodology. Patch high-severity GHSA-68fv-2mgg-jv7q by updating source-map-js 1.2.1 → 1.2.2 in both npm and pnpm lockfiles. No new runtime frameworks or model dependencies.

## Fresh local evidence

| Check | Result | Boundary |
|---|---|---|
| Typecheck, tests, production build | Passed | Raw `evidence/continuation-1.6.11/verify.txt` |
| TypeScript suite | 942 tests: **941 passed, 0 failed, 1 skipped** | Real Redis unavailable locally; CI must establish actual Redis execution |
| Release-gate JavaScript suite | **14/14 passed** | Synthetic fixtures, not target services |
| New evidence matrix | **512 deterministic combinations** | Synthetic source/status/relevance/count/meta combinations, not hundreds of real users |
| Built HTTP smoke | **14 checks passed** | Real public-source scan/cache/receipt/tamper/MCP/cohort/malformed bodies on local build |
| Proof integrity HTTP smoke | **7 checks passed** | Synthetic public capsules/export/view/OG/forgery rejection |
| Actual Chromium | **15 checks passed** | Local production build; 3 explicitly synthetic stale/failure/memo races; no uncaught page errors; desktop/mobile screenshots retained in downloadable bundle |
| npm dependency audit | **0 reported advisories** | Not a penetration test or independent security assessment |
| Fresh strict baseline deployment canary | **4 failing checks** | Exact 1.6.10 deployed SHA: shared admission, issuer trust, healthy supply, healthy demand |

Reproduction: `npm ci && npm run verify`; start with `npm start`, then `node scripts/production-smoke.mjs http://localhost:3000` and `./node_modules/.bin/tsx scripts/proof-integrity-smoke.ts http://localhost:3000 proof.json`. Optional browser harness requires **Playwright 1.63.0** and system Chromium on the isolated test host; run `CHROMIUM_PATH=/path/to/chromium node scripts/browser-integrity-smoke.cjs`. It is a test-host tool, not a runtime dependency. Review its output and labels; do not reinterpret mocked races as live provider success.

## Council decisions / dissent

See `COUNCIL_DECISIONS_1_6_11.md` and six independent reports in `council-1.6.11/`. Agreed: evidence integrity before feature growth; one analyst decision-review hypothesis; preserve failure and uncertainty; use existing OSS testing rather than speculative framework migrations. Security dissented on deferring production-default Redis enforcement: it remains P0. Changing the default before an operator provisions Redis would take down the unprovisioned research beta, so this increment does not pretend to fix that dependency. The release owner must coordinate a controlled fail-closed rollout; no production/global-capacity guarantees meanwhile.

## Not done — authoritative remaining gates

1. **Semantic correctness is not established.** Red Team reproduced nine generic AI weather artifacts across three channels giving confidence 100 for AI code review. Sufficiency caps are not semantic calibration. Demand still scores unqualified/all-time/raw-count questions; relevance, sample sufficiency and comparable windows remain required work. Full raw scoring replay is not possible from selected receipt links alone.
2. **Production infrastructure:** managed shared admission, production-default fail-closed policy, distributed per-provider quotas/backoff, operator-owned trusted signer, alerts, real two-instance/outage/load/rollback drills, target deployed-SHA strict gate.
3. **Optional analyst:** no new live Melious drill or funded-model success evidence was obtained; no gateway keys were used. Hedge dispatch atomicity, aggregate billed usage, signer readiness, proof workload controls and same-snapshot memo/citation UX remain open. Under-200ms failover after detection is not a live time-to-answer guarantee.
4. **Commercial/privacy:** durable retention, billing, entitlements, consent/unsubscribe/deletion and funded delivery obligations remain missing. Pricing is proposal-only; no paid reliability claim.
5. **Validation/distribution:** independent held-out current-model review, consented decision-replay pilots, measured utility, voluntary return and budget-owner commitments. No traction, customer interviews, payments or adoption were invented.
6. **Full review:** 259 baseline tracked files inventoried; full semantic review of every file and historical nested evidence artifact is not complete. State map distinguishes exact scoped reads from inventory-only/partial. Research extraction preserves 1,308 attached-research and 608 repository-doc passages, repetitions and context—not 1,916 distinct completed tasks. Conditional/conflicting historical prescriptions require founder reconciliation; they are not silently marked done.
7. **Credentials:** revoke/rotate both keys disclosed in chat and provision least-privilege replacements securely. This run did not reuse, print or commit them. Git delivery uses the existing GitHub MCP connection.

The supplied video was visually inspected at representative frames: it depicts a historical comparison run, not an application test or missing source artifact. No unseen transcript or prior code state was inferred.

**The mission's full Definition of Done remains unmet. This increment provides concrete verified repairs and an exact continuation point, not production certification.**
