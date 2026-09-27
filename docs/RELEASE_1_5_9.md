# Release 1.5.9 - verification pass (2026-09-27)

**No code defect was found this pass. 1.5.9 is a version bump marking a full end-to-end re-verification of 1.5.8 plus retained evidence for the launch gates. The public research beta stands; paid production remains uncertified.**

## What was reviewed
- Both attached 1.5.8 ship records (the shipped one and the unshipped hedge-accounting variant, which mainline 1.5.8 already supersedes).
- Repo at `4ab5d59`: router, hedge policy, shared budget, receipt keyring, analyst, health, all tests, CI, docs, evidence.
- Live production health: `frontier-oss-ideas.vercel.app/api/health` reports 1.5.8 at the deployed docs SHA with `llm.availability` present.

## State map
- **Done:** everything claimed in the 1.5.8 record, re-verified.
- **Partial:** hosted gateway unconfigured (operator secret); scoring heuristic uncalibrated.
- **Missing (operator-gated, not fabricable):** managed Redis, published issuer pin, approved Reddit OAuth, rotated secrets, blinded calibration, consented pilots, billing.
- **Broken:** none found.

## Premortem (launch failed because ... )
1. Regression between merge and now went unnoticed -> full local pipeline re-run and green.
2. Gateway degraded since the 1.5.8 drill -> live torture re-run; all 13 gates passed (evidence retained).
3. Deployed SHA drifted from expectations -> live health polled; version and build match; strict canary re-run and the only failures are the known operator gates (evidence retained).
4. Secrets in the task text misused -> keys used in-memory only, never committed; rotation remains operator-urgent.

## Verification actually run
- `tsc --noEmit` clean.
- Suite: 112 passed / 0 failed / 1 skipped (CI-only real-Redis test); release-gate tests 10/10.
- `next build` clean (19 routes + middleware).
- Live Melious torture (`MELIOUS_API_KEY` from environment only): ALL 13 GATES PASSED. Evidence: `docs/evidence/gateway-1.5.8-recheck.json`.
- Live end-to-end scan + MCP ("AI code review agent"): score 76/100 Saturated, coverage 100%, all 7 supply sources responding, stable receipt digest, cache hit in 0ms. Evidence: `docs/evidence/live-smoke-1.5.9.json`.
- Strict canary vs deployed SHA: 9/12, the three failures exactly the operator gates (`distributed-configured`, `issuer-trust`, `healthy-supply`/`healthy-demand`). None weakened. Evidence: `docs/evidence/gate-1.5.8-recheck.json`.

## Honest limits
- No parallel agents exist in this environment; the "council" is the premortem table above plus the standing council docs. No 100x gain is claimed or measured.
- `Founder_Work.md` is absent from the repo and attachments; it could not be followed as a system prompt.
- Production gates remain red and operator-gated; a canary is not a load test, external calibration, secret revocation, customer validation or commercial launch approval.

## Next steps (operator/founder)
1. Rotate the GitHub PAT and Melious key exposed in the task text immediately.
2. Install a scoped gateway key + `LLM_HEDGE_MODE=adaptive` on the hosted deploy.
3. Provision managed Redis, publish the issuer pin, obtain approved Reddit credentials, re-run the strict canary.
4. Run the preregistered pilot in `docs/LAUNCH_DECISION_2026.md` before any paid launch in the Sept-Oct 2026 window.
