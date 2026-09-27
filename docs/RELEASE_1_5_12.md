# Simultaneity Index 1.5.12 — sub-lane expansion

## Founder decision
Resume the roadmap at Phase 2 (wedge actionability). The attached `SIMULTANEITY_INDEX_LAUNCH_PRODUCT.md` describes `lib/scoring/wedge-expansion.ts`, `/api/export` and `/c/[token]` as done; the repository at `92f5f85` contained none of them. This release makes the wedge claim true; export/sharing is **not** shipped and is not claimed.

## What shipped
- `lib/scoring/wedge-expansion.ts`: `expandSubLanes(query, parentScore, verdict, sources)` scores 8 dimensions by counting how many sampled, relevance-filtered items from healthy sources explicitly claim each one. Estimate = parent score × min(1, 2.5 × Laplace-smoothed claim share). Dimensions already named in the idea are skipped.
- Each lane carries `claimedBy`, `sampled`, confidence (`medium` ≥ 24 items, `low` ≥ 8, else `insufficient`), up to two real competitor links, and a `verifyQuery` so the user can confirm the estimate with a live scan instead of trusting it.
- `CrowdingResult.subLanes` (optional; signed capsule schema unchanged, so existing receipts still verify).
- UI: `WedgePanel` shows ranked sub-lanes, a single “Build here” badge (never on insufficient samples), competitor links and a verify link. Shared `/s/[q]` pages show the same.
- MCP: `crowding_check` text includes sub-lanes for agent workflows.

## Premortem
1. *Fabricated precision* → estimates are labelled as estimates, show raw counts, and ship a verify re-scan.
2. *Thin evidence produces confident advice* → no lanes without evidence; no badge under 8 sampled items.
3. *Failed sources skew counts* → only `status: ok` sources are counted (tested).
4. *Receipt breakage* → capsule untouched; field is optional for older clients.
5. *Latency/cost* → pure regex over already-fetched items; no network or model call.

## Verification
- `tsc --noEmit` clean.
- `npm test`: 111 passed / 0 failed / 1 skipped (CI-only real Redis) + 10/10 `.mjs` gate tests, including 3 new sub-lane tests.

## Still operator-gated (unchanged)
Managed Redis, scoped production Melious key, published issuer pin, approved Reddit OAuth, rotation of the repeatedly exposed GitHub/Melious credentials, blinded calibration, consented pilot, billing.
