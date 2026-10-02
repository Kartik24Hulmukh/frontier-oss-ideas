# Simultaneity Index — truthful verification continuation

**2 October 2026 · Start: main `0d4114f` · Release decision: research beta only**

## Inputs reconciled
Both supplied attachments were read in full. Their delivery accounts conflict.
The actual public repository and deployment are at 1.6.6 / `0d4114f`, not the
1.6.5 state in the earlier continuation note. The proposed `8b95a4b` local branch
was not present in this fresh workspace. The source pacing increment is already
on main, but observed GitHub credential health was missing and is restored here.
`Founder_Work.md` and `repos.md` are absent from tracked files. The existing
`docs/LEVERAGE_REPOS.md` explicitly favors thin adapters and rejects heavy agent
frameworks; no speculative dependency was added.

## Done / partial / missing / broken
| Surface | State | Evidence / next action |
|---|---|---|
| Seven paced supply adapters | Done, process-local | Dedicated all-provider instrumentation regression |
| Core scan/export/verify/tamper path | Done for tested beta path | Fresh local HTTP canary green; not full-user-journey coverage |
| Credential health | Corrected | Presence is no longer acceptance; rotated token invalidates observation |
| Live gateway evidence | Broken, now fails honestly | Old quota-to-200 artifact invalidated; genuine gateway check fails |
| Distributed admission/signing | Missing on live deployment | Health: per-instance, hash-only, zero pinned keys |
| Healthy supply/demand | Partial | Strict live canary rejects fallback/degraded sources |
| Durable retention/billing/jobs | Missing | Browser watchlists are not a paid durable service |
| Independent calibration/pilots | Missing | Author estimates are not blinded reviewer or buyer evidence |
| Every-file deep review | Incomplete | Scope inventory explicitly marks unreviewed files |
| Independent agent council | Not run | No independent agent runtime; perspectives below are single-assistant analysis |

## Premortem and decisions (single-assistant review, not agent votes)
- **Reliability:** A green gate manufactured from exhausted credits is the primary
  release risk. Remove the success emulator structurally, pass upstream response
  identity/status/body untouched, and prohibit all 200–399 injected statuses.
- **Security:** Configured credentials can be rejected or rotated. Observe acceptance
  only from authenticated successful HTTP responses; do not expose values or hashes.
  Both chat-disclosed credentials must be rotated by their owner after delivery.
- **Research:** Signatures prove integrity, not market relevance. Keep independent
  reviewer agreement and adjudication blocking paid-launch claims.
- **Product:** Additive plugins do not prove value. Keep the narrow analyst
  decision-replay pilot in `LAUNCH_DECISION_2026.md`; measure changed decisions
  and voluntary repeat use rather than invented 100x or traction numbers.

## Verification
- Dependency install succeeded; dependency audit: 0 vulnerabilities.
- Typecheck passed; production build passed.
- TypeScript suite: 373 passed, 0 failed, 1 skipped (real Redis unprovisioned).
- JavaScript release gate: 10 passed, 0 failed.
- Beta local HTTP gate: 6/6 passed.
- Strict live HTTP gate: 8/12 passed; failed distributed configuration,
  issuer trust, healthy supply, healthy demand.
- True live Melious verification: 2/13 passed; four models did not produce
  successful completions. Live attempts returned 429; failures remain failures.
- Failover tests measure dispatch after failure detection, not total recovery
  latency. An 800 ms injected timeout cannot establish <200 ms end-to-end recovery.

Raw evidence: `docs/evidence/*continuation*.json`. Old evidence is retained with
explicit invalidity annotation rather than erased. New tests include 200 forbidden
success-injection cases, 28 status/body preservation cases, exhausted-gateway
routing, abort behavior, credential rotation/rejection, and seven-provider coverage.

## Remaining production work — no certification
1. Rotate disclosed secrets; provision dedicated scoped provider credentials.
2. Operator supplies managed Redis and enables required distributed limits.
3. Generate signing key offline, provision independent issuer pin and rotation plan.
4. Restore credits/approved access for live model completions if optional analyst is offered.
5. Resolve live source fallback under approved provider terms, with fresh strict canary.
6. Retain real multi-instance traffic/outage tests, alerting and rollback drill evidence.
7. Complete independent relevance audit and consented analyst pilots.
8. Finish scoped durable product functionality before billing/guaranteed capacity.

Push/PR/merge must use the repository review process; green beta tests do not waive
strict release blockers. The accompanying delivery record records actual Git results.

## Second increment — HTTP journey and MCP version
A 16-check local HTTP journey passed: six public pages, MCP initialize/discovery,
real scan, export, proof page, OG image, tampered export rejection and malformed
search inputs. It found stale MCP `serverInfo.version` (1.3.1); now derives from
package.json with a regression test. Initial journey evidence predates this version
repair and is explicitly a local beta smoke, not external-client certification.

First increment merged through PR #44 after CI and security checks passed, as
`1cf8463cc3e74056a08b1e85898a04ffe7e9504b`. Production gates still block certification.
