# 1.6.3 — Proof integrity is not issuer authentication

## Resume point and scope
Read both supplied 1.6.0/1.6.1 ship records in full. Main and production were already 1.6.2 (`f0bbf02c187cb00052e02def97a6301ec96ec0a7`), not 1.6.1. The OG and sub-lane increments in the supplied next-steps list had already shipped. `Founder_Work.md` is absent from the repository and supplied files.

This is a focused security increment, not certification of every file or completion of the full founder mission. No independent agent runtime is available; the council below is an explicit multi-perspective analysis, not real parallel agents. No 100x outcome is measured.

## Premortem council (analysis, not independent agents)
- Distribution: a score card in chat creates implicit authority even when the receipt is hash-only.
- Security: an attacker can author a new capsule AND a new matching checksum. A token prefix is not an issuer signature. Broken signatures must not downgrade to “hash-only”.
- Research: partial source status and heuristics cannot establish market saturation or investment merit. Preserve provenance and uncertainty.
- Operator: deploy keys and distributed budgets; never turn a green checksum into paid-launch certification.
- Decision: repair one central integrity policy, apply it to export/page/metadata/OG, and explicitly distinguish checksums, untrusted signatures and pinned issuer authentication. Do not hide the red production gate.

## Structural fixes
| Failure | Implemented fix | Verification |
|---|---|---|
| Edited evidence still renders a score and metadata | Invalid receipts render a neutral page and neutral metadata, not the supplied claims | Page + metadata unit tests; HTTP tamper smoke |
| Invalid Ed25519 signature looks “Intact (hash-only)” | Central policy requires a valid signature whenever algorithm is signed; mint refuses invalid signatures | Signed forgery unit and HTTP tests |
| Matching checksum looks like official proof | Page, metadata and OG explicitly say origin and scan claims are not authenticated; pinned issuer alone gets “Verified” | Label and rendered page tests |
| Nested malformed JSON crashes React | Runtime schema for rendered capsule fields and receipt structure before acceptance | Malformed nested-array/object/range/date tests |
| Compressible huge capsule mints a link its own decoder rejects | Same 256 KiB decoded size ceiling before compression and during inflation | Compressible-payload regression test |
| Proof URL leaks through same-origin referrers | Proof-specific no-referrer metadata and response headers; noindex/nofollow/noarchive header | Metadata assertion; deployment header check still required |
| Timing tests fail under build/CI load | Inject server clock into loopback emulator; rolling-window boundary test advances deterministic time | Full suite |
| OG test only asserts 200, misses forged score | Compare rejected OG PNG bytes to the neutral image | Pixel-equivalent fallback test |

Hash-only export remains available for public research snapshots. It is **not** proof that Simultaneity computed the supplied score. A third party can create a new valid checksum. Signed-but-unpinned receipts are not official either. The capsule score remains an uncalibrated heuristic.

## Verification run
- Typecheck clean; production Next build clean; npm audit 0 vulnerabilities at install.
- Final local suite: **127 passed, 0 failed, 1 skipped** TypeScript tests + **10/10** JS tests. Real Redis/Lua integration requires CI's Redis service; no claim it ran locally.
- Initial parallel build/test exposed an existing wall-clock boundary test flake. Fixed with deterministic server time; final suite passed.
- Local production HTTP smoke: export 200; hash-only disclaimer visible; OG PNG 200; edited capsule export 422 and viewer/metadata show no claims; broken-signature export 422 and viewer/metadata show no claims. Seven checks passed. Evidence: `docs/evidence/proof-integrity-local-1.6.3.json`.
- Live strict canary on **1.6.2**: FAILED distributed admission, pinned issuer, healthy supply, healthy demand. Retained in `docs/evidence/gate-before-1.6.3.json`. Do not loosen the gate.
- New bounded Melious four-model live drill: **FAILED (2/13 passed)**. Upstream returned rate limits; no model success was established. Token pre-request rejection and bad-key stop passed; local mocked failure/breaker/budget tests pass. Evidence: `docs/evidence/gateway-1.6.3.json`. Failover dispatch after failure detection is distinct from total response time; sub-200ms dispatch is not recovery of a hung request within 200ms.
- Supplied GitHub credential still authenticates. It is compromised by disclosure and must be rotated; authentication is not safety. No supplied secret is committed.

## State map
| State | Scope |
|---|---|
| Done in prior main | Multi-source scan, demand/provenance, MCP, cohorts, briefs, frozen links, OG, sub-lane estimates, bounded model router |
| Done in this increment | Proof integrity boundary, neutral rejection across surfaces, truthful issuer labels, bounded decoded minting, deterministic timing regression |
| Partial | Relevance/scoring calibration, per-instance live quotas, hash-only live snapshots, long link transport reliability, operational source health |
| Missing/operator-gated | Secret rotation, managed Redis/distributed limits, pinned receipt signer, scoped gateway capacity, Reddit primary OAuth, alerts/rollback/load evidence |
| Missing/product-research | Independent blinded labels, consented pilot decision outcomes, voluntary retention, commercial commitments, billing/entitlements |
| Broken/blocked external | Current gateway drill rate-limited; strict production canary red |

## Launch decision
Continue a candid capacity-limited research beta. No paid-production or 100x traction claim. Follow `docs/LAUNCH_DECISION_2026.md`: five analyst pilots, pre/post decision logs, blinded calibration, repeat use, explicit commitments. Operators must rotate credentials and provision/verify infrastructure before strict promotion. This increment is a trust repair, not a shortcut around those gates.

## Reproduce
```sh
npm ci
npm run typecheck
npm test
npm run build
npm start
# Separate process:
npm exec -- tsx scripts/proof-integrity-smoke.ts http://localhost:3000 smoke.json
node scripts/release-gate.mjs https://frontier-oss-ideas.vercel.app --strict --expected-sha FULL_SHA --output gate.json
# Scoped rotated key in environment only:
npm run llm:torture -- --output gateway.json
```
