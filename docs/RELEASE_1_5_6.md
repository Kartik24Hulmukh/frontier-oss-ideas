# Release 1.5.6 — receipt key rotation

## Founder decision
Keep the research beta; do not claim commercial readiness. This increment closes an integrity/availability trap: one immutable issuer pin made safe Ed25519 rotation impossible without temporarily rejecting old receipts or trusting an unannounced replacement.

## Council / premortem synthesis
- **Research integrity:** old receipts must remain independently verifiable.
- **Security:** a receipt-provided key is never a trust root.
- **Operations:** rotation must not require downtime or accepting arbitrary keys.
- **Product:** expose readiness without leaking secrets.

## Shipped
- Optional bounded `RECEIPT_PUBLIC_KEYS` JSON keyring (maximum 10 pins), alongside the active legacy pin.
- Stable SHA-256 SPKI `keyId` on new signed receipts; legacy signed receipts remain valid.
- Fail-closed malformed-key handling, deduplication, Ed25519-only enforcement, and key-id mismatch rejection.
- Health metadata reports pin count and rotation readiness, never key material.
- Regression coverage for rotation, key identifiers, and forged identifiers.

## Honest state
Done: implementation and tests. Partial: operator must publish and configure independent pins. Missing: managed Redis, approved Reddit OAuth, independent expert calibration, consented pilots, durable accounts/billing. No measured 100x claim.
