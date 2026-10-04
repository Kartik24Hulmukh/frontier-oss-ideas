# Release 1.6.8 — 8th supply adapter: crates.io (Rust systems ecosystem)

**Date:** 4 October 2026 · **Status:** public research beta (strict production gates still operator-blocked)

## Why
`docs/LEVERAGE_REPOS.md` listed crates.io as the P1 next supply source. Rust-heavy lanes
(vector DBs, WASM runtimes, agent sandboxes, eBPF, embedded inference) were systematically
under-counted by npm/PyPI-only package evidence — a premortem failure mode ("tool called a
crowded Rust lane *Open*"). The fix is a first-class adapter, not a keyword patch.

## What changed
- `lib/sources/crates.ts`: documented public API `GET /api/v1/crates?q=…&per_page=10&sort=relevance`,
  identifying `User-Agent` (crates.io crawler policy), routed through the shared `pacedFetch`
  provider ceiling + circuit breaker (`PACING_CRATES_PER_MINUTE`, default 25/min — well under the 1 req/s policy).
  429 → `rate_limited`, 5xx/timeouts → `error` (excluded from score, never read as an empty ecosystem).
- Scoring: `crates` scored with the package scorer; weights rebalanced to sum 1.0
  (npm 0.10→0.08, pypi 0.10→0.08, crates 0.04). Model version bumped `crowding-1.0` → `crowding-1.1`
  so every capsule/receipt states which model produced it.
- Proof verification accepts `crates` evidence; legacy 7-source capsules still verify.
- Release gate: snapshot provenance and strict `healthy-supply` now require exactly **eight** sources.
- `/api/health` reports `crates` pacing/breaker status automatically.

## Verification (fresh, this workspace)
- `npm run typecheck` — 0 errors
- `npm test` — **375 passed, 0 failed, 1 skipped** (real Redis) + **10/10** JS release-gate tests; new `tests/crates.test.ts`
- `npm run build` — passed
- Live local scan `vector database` → **85 / Saturated / coverage 100 / crowding-1.1**, 8/8 supply sources answering
  (GitHub 14,260 · HN 1,096 · arXiv 391 · OpenAlex 1,513,389 · npm 92,617 · PyPI 1 (exact-name only notice) · HF 4 · **crates.io 2,760**)
- Beta release gate against local `next start`: **passed** (incl. eight-source provenance + tamper rejection)

## Honest limitations
- Calibration (`docs/CALIBRATION.md`) was done on the 7-source model; `crowding-1.1` shifts package weight
  slightly and needs a re-run of the blinded audit before claims about agreement are updated.
- Melious gateway re-checked live 2026-10-04: all four models still `429 insufficient_quota`
  (account balance −0.027687 EUR). Routing/failover code is unchanged and tested; live completion remains unproven.
- Strict gate remains red on operator items (distributed admission, issuer pin, reddit primary).
