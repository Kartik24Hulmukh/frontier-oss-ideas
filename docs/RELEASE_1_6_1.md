# Release 1.6.1: self-verifying proof links, so Phase 3 works without storage

## Why
The roadmap's Phase 3 (`/api/export` + immutable `/c/[token]` viewer) was listed as done in an earlier launch doc, but it was never in the repo. The 1.5.12 ship record said it was blocked because it needed managed Redis before links could be truly immutable. This release removes that blocker.

## Relation to 1.6.0
1.6.0 (#36) added a Redis write-once `si_` share. It returns **503 in production without managed Redis**, and **422 unless the receipt is signed by a pinned issuer**. Neither is provisioned live, so sharing was dead on arrival. 1.6.1 keeps 1.6.0 as a short-alias layer and adds a storage-free proof link that always works.

## What shipped
- `lib/share.ts`: the token **is** the evidence. It is the canonical JSON of `{capsule, receipt}`, raw-deflated and base64url-encoded, prefixed by `v1.<first 16 hex of the capsule digest>`. Nothing is stored, so there is nothing to edit, expire or lose, and no database for an operator to set up.
- `POST /api/export` returns `{token, url, path, bytes}`. It refuses edited capsules with **422** (`digest_mismatch`), oversize capsules with 413 and malformed bodies with 400. Bodies are capped at 256 KiB, the same as `/api/verify`.
- `/c/[token]`: a server-rendered viewer that re-verifies everything on every view and never trusts the token's claims. Status is one of:
  - Verified: signed by the pinned issuer
  - Intact: signature valid but the key isn't pinned
  - Intact (hash-only)
  - TAMPERED
  - rejected: malformed links render nothing from the payload
- Home page: new **Proof link** button. It asks for consent first, because the idea ends up in the URL. `/s/[q]` still re-scans live; `/c/` is the frozen snapshot you can cite.

## Premortem → fixes
| Failure mode | Fix |
|---|---|
| Links die because Redis was never provisioned or the data expired | No storage at all. The URL is the evidence. |
| Someone edits the score and shares a "proof" | Minting refuses digest mismatches. The viewer recomputes the digest, and the prefix binds the link to the original digest, so swapping in a different capsule+receipt is flagged too. |
| A self-signed key passes as the official issuer | Uses the existing `trustedReceipt` pin/keyring. "Verified" appears only for the pinned issuer. |
| Zip-bomb or oversized token used for DoS | Token is capped at 12,000 chars and inflate at 256 KiB (`maxOutputLength`). Both are tested. |
| XSS through evidence URLs | Only http(s) links are rendered as anchors (`safeHref`), plus React escaping. |
| Privacy: the idea leaks into a public URL | Explicit confirm dialog before minting. Pages are `noindex`. |

## Verification
- `tsc --noEmit` clean. `next build` clean (`/api/export` and `/c/[token]` are compiled).
- `npm test`: **115 passed / 0 failed / 1 skipped** (the CI-only real-Redis test) plus 10/10 `.mjs` tests. That includes 4 new proof-link tests.
- Local `next start` end-to-end run against live sources: "AI code review" scored 86, Saturated. Export returned 200 with a 4,583-char token. The viewer returned 200 and showed Intact. A tampered export got 422. A corrupted token was rejected. See `docs/evidence/proof-links-1.6.1.json`.

## Limits
- Links are about 4-5 KB. They work fine in browsers and chat apps, but some may truncate them. An optional short alias needs managed Redis, which the operator still has to provision.
- "Verified" needs the operator to set `RECEIPT_PRIVATE_KEY` / `RECEIPT_PUBLIC_KEY` in production. Until then links show as Intact (hash-only).
