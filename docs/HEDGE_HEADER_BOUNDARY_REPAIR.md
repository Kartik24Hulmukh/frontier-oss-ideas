# Preserve observed failure headers during hedge cancellation

## Defect / bounded repair

[VF] The settled-loser repair in PR56 covers completed response parsing. An additional exact-boundary test shows that a losing model can return error headers while its body stalls; if another model wins first, cancellation formerly labeled it only `hedge_cancelled` and discarded the known error/cooldown. All four new 429/503/504/404 cases failed before this follow-up.

[VF] Each in-flight attempt now retains a small observation of error status, classification and Retry-After immediately after headers, before awaiting error-body billing. On cancellation, the common recorder applies the observed failure once instead of inventing a pure cancellation. Parsed body usage is still unavailable, so billing is explicitly unknown and conservative reservations remain charged. Truly unobserved cancellations retain their previous classification. Late completion cannot mutate the returned snapshot or double-count availability.

## Verification

- New boundary regressions: 4 failures before, 4 passes after. Total race suite now 9/9.
- Focused routing/accounting/backoff/dispatch suite: 48/48 passes, zero skips.
- Combined `npm run verify` with actual local Redis 7.4.6: typecheck/build passed; 1,701/1,701 TypeScript tests and 22/22 JavaScript tests passed, zero skips. This supersedes earlier 1,697-test counts for this later code snapshot, not the truth of historical receipts.
- Runtime dependency/security patch base: `f7e36fee3ffe986c9a2e18d85864b501340bc62b` (PRs57,56,58 merged). No dependency changes in this follow-up.
- Actual before/after logs and source-hash receipt are under `docs/evidence/hedge-header-boundary/`.

## Premortem / state delta

Known provider refusal disappears when a winner cancels a stalled error body → full settlement and observed headers were conflated → preserve known safety metadata separately from unknown billing → exact-boundary regressions and full suite. Router remains 🟡 Partial for overall production/account/fleet acceptance; authored synthetic tests and scoped receipts are ✅ Done within that explicit scope.

[NE] No live gateway requests, invoice reconciliation, managed Redis/target replica drills or new customer study. No final deployment identity is inferred from local tests or PR previews. Production remains subject to the unweakened strict gate and the external requirements in `GO_RUNBOOK_1_6_12.md`. Breakers remain process-local. Four requested live-model stress results are still missing, not synthesized.
