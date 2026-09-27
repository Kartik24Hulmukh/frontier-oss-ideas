# 1.6.0 — immutable evidence capsules

Phase 3 adds `POST /api/export` and `/c/[token]`. Export accepts only a digest-valid, Ed25519-signed receipt whose issuer is deployment-pinned. The content-addressed token is deterministic; Redis `SET NX` makes snapshots immutable and retry-safe. Production fails closed when durable Redis is unavailable. Local/test mode has bounded memory storage for development only. The viewer renders the frozen verdict, timestamp, evidence links, digest and issuer fingerprint.

## Premortem controls
- Forged share: pinned issuer + full digest/signature verification.
- Mutable link: content address + write-once storage + collision comparison.
- Ephemeral production data: no filesystem fallback; 503 without Redis.
- Oversized abuse: 256 KiB bounded body.
- Enumeration: 128-bit token suffix; malformed tokens rejected.

Operator gate: provision managed Redis and receipt keys, rotate exposed credentials, then run the strict release gate.
