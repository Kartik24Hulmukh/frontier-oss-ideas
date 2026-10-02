# Release 1.6.4 - operational source health

Resumes from the 1.6.3 ship record, whose state map listed **operational source health** as partial.

## What changed
- `/api/health` exposes `sources: { status: healthy|degraded|unobserved, scope: per-instance, providers[] }`.
- Network errors/timeouts now trip provider breakers.
- Read-only breaker snapshots.

## Verification
- TypeScript: clean
- TS tests: 130 passed, 0 failed, 1 real-Redis skipped
- JS gate tests: 10 passed

## Not changed / still blocked
Health is per-instance (serverless instances do not share it). Strict live gate blockers from 1.6.3 (distributed admission, pinned issuer, supply/demand fallbacks) and credential rotation remain operator-gated and are not claimed fixed.
