# 1.6.5 — Honest source observations and recoverable pacing

## Scope
Continue from main `c873063e70ff1eea6d14fc57a3461cc99a2635a1` (1.6.4). The last increment exposed operational source health; this increment fixes misleading successful observations and an undispatched recovery-probe deadlock.

## Premortem → implemented correction
| Failure | Structural correction | Regression |
|---|---|---|
| Provider rejects authentication but health says healthy | Only 2xx records success; all other HTTP statuses record failures | 100 mocked status/provider combinations |
| First upstream failure stays green until breaker opens | Provider status reflects latest failed observation independently of retry breaker | First 503 regression |
| Quiet warm instance says healthy indefinitely | Observation expiry at five minutes, with age field | Exact expiry boundary and refresh |
| Malformed ceiling silently disables budget | Positive safe-integer validation, fail closed before fetch | Eight invalid inputs; zero dispatches |
| Half-open reservation consumes probe despite quota refusal | Release only undispatched reservation; do not invent an upstream outcome | Open → cooldown → quota refusal → window expiry → recovery |
| Concurrent recovery floods a sick provider | Preserve single-probe ownership | Concurrent second dispatch refused |

Aggregate health prioritizes degraded providers; otherwise any expired/unobserved provider makes it unobserved. `failures` counts all unsuccessful HTTP/network attempts; breaker `consecutiveFailures` counts retryable upstream failures only. Nonretryable errors do not open a retry breaker. Provider HTTP health does not validate response contents, relevance, source completeness or commercial readiness. Observation expiry does not close an open breaker. Configuration changes require a fresh guard/process.

## Local verification
- TypeScript: passed.
- TypeScript tests: 136 passed, zero failed, one real-Redis test skipped.
- JavaScript release-gate tests: 10 passed.
- Next production build: passed.
- Local production proof HTTP smoke: all seven passed (synthetic integrity evidence only).
- Built HTTP health endpoint: 200, no-store, initially unobserved.

Initial verification found an accidental nullish-expression replacement; it was fixed before the clean rerun. No failed run is presented as passing.

## Fresh live baseline — still blocked
Retained exact-main-SHA strict canary: `docs/evidence/gate-continuation-1.6.4.json`. Production 1.6.4 at `c873063...` still fails distributed admission, issuer trust, healthy supply and healthy demand. Live health reports no configured model gateway, no pinned key and no Reddit OAuth. The enabled-analyst budget check passes because the analyst is disabled, not because gateway capacity was validated.

An authenticated GitHub inspection returned `404 Branch not protected` for main. This is not independent protected release approval. Do not change protections or waive launch gates to make this patch look ready.

## Inputs and honest limits
All four supplied documents were read, including their tails. `Founder_Work.md` and literal `repos.md` are absent; existing `docs/LEVERAGE_REPOS.md` was read. Native fetch, node:test and Next.js already implement the recommended thin-adapter/test approach; no new dependency or speculative multi-agent framework is needed for this patch.

The Jittest #73 attachment describes a different Python/pytest acceptance system. Its named files are absent from this checkout. Keep its source-bound human/cost/custody requirements separate; no Simultaneity test closes #73.

This is one agent, with parallel independent verification processes, not independent research agents or a human council. The focused reliability/security/research perspectives chose truthful observations and probe recovery over feature accumulation. An exhaustive in-depth review of all 211 tracked files, external human calibration, pilots, billing and measured 100x impact are not completed.

## Operator/human work that code cannot fabricate
1. Rotate both plaintext credentials and install least-privilege replacements as deployment secrets. Git delivery authorization is not provider deployment configuration.
2. Provision managed Redis, require distributed limits, and record genuine concurrent/outage evidence.
3. Provision an Ed25519 signer with an independently pinned issuer key.
4. Restore primary supply/demand credentials and obtain gateway capacity before live four-model testing; do not charge an exposed old key for repetitive drills.
5. Record alerts, load tests, rollback drill and protected independent release approval.
6. Freeze held-out lanes and collect two independent reviewer judgments/adjudication.
7. Obtain consented five-analyst decision pilots and week-2 repeat use before paid launch. Billing/entitlements remain missing.

Recommendation: remain a capacity-limited research beta. This release is not production/commercial approval.
