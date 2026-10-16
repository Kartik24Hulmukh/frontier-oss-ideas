# Settled hedge breaker repair

## Verdict

[VF] The router now applies circuit-breaker and availability outcomes to every recorded settled attempt, including the losing hedge already settled in the winner's promise-race turn. [OP] Accept this bounded implementation repair; production and commercial release remain NO-GO.

## Premortem → cause → repair → evidence

- Provider-required waits are ignored after a successful hedge race → only the selected promise updated breaker state; `cancelLosers` retained loser usage but dropped failure safety effects → centralize outcome handling in the shared settlement recorder, removing duplicate winner/main-loop handling → four deterministic regressions cover losing HTTP 429, 503, 504 and 404, blocked redispatch and refusal observability.
- Repeated billed reasoning starvation remains invisible → same loser path skipped starvation accounting → the same recorder applies starvation once → fifth regression verifies open breaker, one starvation and all 45 known tokens retained.
- A local green result becomes a production claim → synthetic fixtures are mistaken for model/deployment evidence → retain explicit boundaries and external gates → no live Melious request, deployment update, managed Redis test or customer experiment was performed for this repair.

## Verification

[VF] Base source: `dd9c315901e4c0c1772f021b501478b2bc20555f`.

- New regressions before the repair: 5 tests, all 5 failed on missing breaker effects. See `docs/evidence/hedge-breaker-race/before.log`.
- Focused regression run after repair: 44/44 passed, zero skips. See `docs/evidence/hedge-breaker-race/after.log`.
- Full `npm run verify`: TypeScript check and production build passed; TypeScript tests 1,697 total / 1,696 passed / zero failed / 1 skipped; JavaScript gate tests 14/14 passed. The skipped actual-Redis Lua test is not claimed as passed in this receipt.
- [VF] `pnpm audit --audit-level high` found Next.js advisory GHSA-cjq9-62q9-8jv4 affecting the existing pinned 16.3.6. This router-only patch does not resolve that separate dependency blocker.

## State-map delta

| Path | State | Review/verification boundary |
| --- | --- | --- |
| `lib/llm/router.ts` | 🟡 Partial | Full current read and targeted tested safety repair; real account, fleet and billing acceptance still open. |
| `tests/llm-hedge-breakers.test.ts` | ✅ Done | Authored/read/run; five deterministic race fixtures, not real-provider evidence. |
| `docs/HEDGE_BREAKER_REPAIR.md` | ✅ Done | Scoped delivery record, not an exhaustive repository audit. |
| `docs/evidence/hedge-breaker-race/*` | ✅ Done | Actual local before/after test output; synthetic responses explicitly scoped. |

## Unchanged limits

Breakers and hedge-governor learning remain process-local. Unsettled cancelled attempts still have unknown billing and conservative nonrefunded reservations. This patch covers already-settled losers; it does not establish remote cancellation or invoice correctness. A successful answer does not certify all requested models. Do not weaken healthy-source, trust, distributed-admission, semantic or customer-utility gates. The full operator sequence remains `docs/GO_RUNBOOK_1_6_12.md`.
