# Release 1.6.2 - Proof links that unfurl (OG image for /c/[token]), deterministic sub-lane ties, live gateway drill

## Why (council debate, condensed)
Three voices argued this increment before a line was written:

- **Distribution:** "Proof links are our only viral surface, and they unfurl as bare 4 KB URLs in chat. An OG image with the frozen score turns every share into a screenshot-grade artifact." - shipped.
- **Integrity:** "Sub-lane ties break on alphabetical id, which an analyst could call arbitrary." - fixed by ordering ties on the evidence, not the label.
- **Operator:** "The real lever is provisioning keys/Redis; OG images are garnish." - accepted as true but out of sandbox reach (Vercel env); recorded again as operator-gated.
- **Premortem voice:** "A tampered proof must never render a score card in a chat preview." - the OG route re-verifies the digest before drawing and falls back to a neutral card.

## What changed
1. **`app/c/[token]/opengraph-image.tsx` (new):** frozen proofs now unfurl with their score,
   verdict and scan date. The image is rendered **from the re-verified capsule only** - tampered,
   malformed, unknown `si_` alias or junk tokens get a neutral "could not be verified" card, never a score.
2. **Deterministic sub-lane ties (`lib/scoring/wedge-expansion.ts`):** equal score/claim ties now
   order by sample size before id. Tie-breaking is fully evidence-derived, not label-derived.
3. **Live gateway drill (1.6.2):** re-ran `llm:torture` against the real Melious gateway across all four
   models: 13/13 gates passed (all four models answer live; 429/5xx/504/timeout failover < 200ms;
   breakers short-circuit; per-request and window token ceilings enforced before network; bad key stops
   the chain). Evidence retained in `docs/evidence/gateway-1.6.2.json`.

## Verification
- `tsc --noEmit` clean; `next build` clean; `npm test` 119 passed / 0 failed / 1 skipped (CI-only real-Redis test) + 10/10 `.mjs` tests, incl. the new `tests/proof-og.test.ts`.
- Local production smoke: export -> 200, `/c/<token>` -> 200 Intact, tampered -> 422, OG image -> 200 image/png for a valid token and neutral card for a tampered one.
- Production (after merge): health reports `1.6.2 @ <merge-sha>`; OG image verified live on a real minted proof link.

## Still operator-gated (unchanged, honest)
Managed Redis (short `si_` aliases), `RECEIPT_PRIVATE_KEY`/`RECEIPT_PUBLIC_KEY` ("Verified" badge),
scoped Melious key, Reddit OAuth, and rotation of the exposed GitHub PAT and Melious key - both of
which were pasted into the task prompt again and must be treated as compromised.
