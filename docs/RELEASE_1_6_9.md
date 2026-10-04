# Release 1.6.9 — discount unqualified sample hits from the crowding score (`crowding-1.2`)

## Failure mode

An irrelevant query could look like a crowded lane: providers return huge query-match counts for homonyms, and the relevance filter's audit floor retained two below-threshold items — which the scorer then credited at full engagement (stars, points, downloads), plus the full raw match count.

## Root cause

`lib/scoring/semantic-filter.ts` deliberately keeps up to two below-threshold items so sparse lanes stay inspectable, but `lib/scoring/score.ts` could not distinguish audit-floor items from qualified evidence: every retained item's engagement, recency and item count entered the score, and every source's capped raw total was credited in full.

## Fix

- `filterSourceByRelevance` now records `relevanceFilter.qualified` — the number of sampled items that truly cleared the threshold (audit-floor items excluded).
- Scorers count engagement, recency and item-count signals from qualified items only.
- Each source's capped raw query-match total is attenuated by `qualified / before` (the qualified sample share).
- Raw provider counts and the two audit items remain fully visible in signals, `sources`, and capsule evidence links; signals append an explicit audit note when attenuation is applied.
- Capsules are stamped `modelVersion: 'crowding-1.2'`. Sources without a relevance filter score exactly as before.

## Verification

- New `tests/crowding-attenuation.test.ts` (6 tests):
  - 500,000 irrelevant GitHub hits (200k-star repos, recent dates) score exactly **0**; raw count 500,000 and two audit items remain visible; `qualified: 0`.
  - 100,000 irrelevant crates.io hits score exactly **0**; same visibility guarantees.
  - A 10%-qualified sample (1/10) scores **strictly below** its unfiltered equivalent.
  - A fully qualified sample scores **exactly** as before; unfiltered sources are unchanged.
  - Capsule model stamp is `crowding-1.2`.
- `npm run typecheck`: 0 errors.
- `npm test`: 381 passed, 0 failed, 1 skipped (real Redis), plus 10/10 release-gate tests.
- `npm run build`: production build succeeded.
- `npm run smoke`: passed.
- Production HTTP smoke against `next start` (evidence: `docs/evidence/production-smoke-1.6.9.json`): health, five null-body rejections, one real eight-source scan (coverage 100, all sources `ok`), cache hit, receipt digest verification, tamper rejection, MCP `initialize`/`tools/list`/`tools/call`, cohort — 14/14 checks.

## Not claimed

- Deployed strict canary, global (shared) admission control, pinned receipt issuer keys and live four-model gateway success remain operator-provisioning gates; this release does not claim them. Independent calibration of `crowding-1.2` (blinded reviewers, held-out lanes) is still required before any accuracy claim.
