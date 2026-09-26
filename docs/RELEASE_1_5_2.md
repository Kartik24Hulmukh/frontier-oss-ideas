# 1.5.2 — preserve degradation across trust boundaries

## Decision
Continue public research beta. Do not certify commercial production. No 100× outcome has been measured.

## Premortem and implemented fixes
| Failure at launch | Root cause | Fix and verification |
| --- | --- | --- |
| Archive mirror mistaken for healthy primary demand | Gate inspected only status=ok | Require explicit Reddit primary provenance; reject mirror/notice; regression tests |
| Signed export conceals source degradation | Demand summary dropped provenance and notices | Preserve both inside receipt-covered capsule; scan→sign→roundtrip→tamper test |
| Human acts on incomplete evidence | UI/brief omit demand accountability | Visible degradation banner and demand table, escaped upstream text |
| Partial supply endpoint masquerades as full health | PyPI exact-name and HF single-endpoint successes have no notice | Retain useful evidence, mark partial search; strict gate rejects notices |
| Stack Overflow top hits presented as total | Count endpoint failure silently falls back to list size | Explicit top-hit-only notice |
| Canary verifies the wrong deployment | Reported SHA not asserted | --expected-sha validates full commit identity; Actions pins github.sha |
| Duplicate statuses satisfy provenance count | Seven entries accepted without checking identities | Exact unique source sets and bounded coverage validation |

## Verification before merge
- Clean npm install: zero reported vulnerabilities.
- Production build including TypeScript passed.
- 89 TypeScript tests passed with real Redis 6.2, zero failures/skips; 10 release-gate tests passed separately.
- Frozen pnpm 10.34.3 installation passed (esbuild lifecycle script warning retained in local log).
- Local production-server live-source beta canary: 6/6 passed.
- Fresh live gateway suite: **12/13 passed**. All four configured models answered; injected timeout recovery failed. Measured dispatch gaps after failure detection were 0 ms; the injected hang took 800 ms to detect. Neither sub-200ms hung-request recovery nor complete gateway readiness is established. Added failure-attempt diagnostics; original failing evidence retained.
- Baseline deployed strict canary: 7/11; distributed configuration, issuer trust, supply health and demand health failed. Re-run strengthened gate after merge.

## Compatibility and rollout
Capsule 1.2 gains optional provenance/notice fields; no old receipt is rewritten. New receipts cover these fields. Existing receipt verification still accepts old digest-valid exports, but stricter production assessment requires matching demand metadata and primary Reddit provenance. No quota namespace or signing-key changes in this increment. Deploy as beta; do not weaken gates to manufacture green status. Roll back by reverting this increment if a functional regression occurs, recognizing rollback reopens provenance gaps.

## Review scope and remaining work
Both supplied files were read in full. The repository was cloned at a31061f. Founder_Work.md is absent. This is a targeted review of the scan→capsule→receipt→gate path, demand/source adapters, affected UI/brief/tests and launch research. **Not every repository file was deeply reviewed.** No claim of exhaustive review is made.

Missing: managed Redis provisioning/outage and rollback drill, independently published fresh signing pin, approved provider access, rotated secrets, independent relevance validation, consented decision pilots and retention/WTP evidence. Durable accounts, entitlements, billing, hosted immutable snapshots and email retention remain unimplemented. Do not add them solely to satisfy a feature checklist before validated demand.

Secrets supplied in the task were used only in process memory for authorized API operations; not committed or installed as deployment runtime secrets. Operator must rotate exposed GitHub and Melious credentials.
