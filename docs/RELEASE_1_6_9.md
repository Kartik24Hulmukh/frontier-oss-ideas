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

## Production verification (post-merge, 2026-10-04)

- PR #49 squash-merged to `main` as `a00c99e`; Vercel auto-deployed. `GET /api/health` → `version 1.6.9`, `build a00c99e…` (`docs/evidence/health-production-1.6.9.json`).
- Standard canary `node scripts/release-gate.mjs https://frontier-oss-ideas.vercel.app` → **6/6 pass** (health, scan-contract, coverage, receipt-integrity, snapshot-provenance, tamper-rejected) — `docs/evidence/gate-production-1.6.9.json`.
- Strict canary → **fails 4 operator gates**: `distributed-configured` (no managed Redis), `issuer-trust` (`pinnedKeys: 0`), `healthy-supply` (deployment `GITHUB_TOKEN` rejected with 401 → anonymous fallback; PyPI challenged), `healthy-demand` (Reddit OAuth absent) — `docs/evidence/gate-production-1.6.9-strict.json`. These need Vercel env changes, not code.
- Live `crowding-1.2` journey (`docs/evidence/live-scan-production-1.6.9.json`, query "Rust WASM component model registry for edge functions"): crates.io returned 36 raw hits with 0/10 qualified → sub-score **0** with the raw count kept for audit; OpenAlex 56 works, 1/10 qualified → sub-score 12; capsule stamped `crowding-1.2`; receipt hash-only (issuer not pinned).
- Melious gateway (`$MELIOUS_API_KEY` from env): `/v1/models` 200, every completion 429 `insufficient_quota` (balance −0.0277 EUR), `qwen3-27b` 404 — `docs/evidence/melious-recheck-1.6.9.json`, `docs/evidence/llm-torture-1.6.9.txt`. Failover 0 ms and breaker/budget ceilings verified in-process only.

### Known limitation surfaced by the live run (next fix)
npm reported 2,085,536 raw signals with 1/10 qualified; linear attenuation (×0.1) still leaves a ~208k effective total, so the npm sub-score was 48 despite a single relevant package. Attenuation is linear in `qualified/before`; a sub-linear or qualified-count-anchored cap for sources whose `totalCount` is a provider-wide keyword count (npm, OpenAlex) is the next `crowding-1.3` candidate. Overall verdict was still correct (score 20, Open lane).

### Operator actions before any commercial launch
1. Rotate the deployment `GITHUB_TOKEN` (prod reports 401) and the credentials pasted into task briefs.
2. Provision Upstash Redis + `REQUIRE_DISTRIBUTED_LIMITS=true`; pin `RECEIPT_PUBLIC_KEY`.
3. Fund the Melious account; re-run `node scripts/model-gateway-probe.mjs` and `npm run llm:torture`.
4. Add Reddit OAuth; re-run the strict gate until 10/10.
