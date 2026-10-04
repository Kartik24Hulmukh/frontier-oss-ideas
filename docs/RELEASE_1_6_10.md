# Release 1.6.10 — crowding-1.3 (4 October 2026)

Base: `a71655c` (public 1.6.9). This release re-implements, from the documented
continuation handoff, the `crowding-1.3` scoring change that previously existed
only as an unpushed local patch. It is a fresh implementation, not that patch.

## What changed and why

| Change | Why | Verification |
|---|---|---|
| `qualifiedTotal = min(linear, qualified × (1 + log10(1 + raw/sampled)))` when the filter rejected part of the sample | Linear attenuation still let multi-million raw totals dominate (2M npm hits × 2/20 = 200k "effective" hits) | `crowding-1.3` tests: 2M/2-of-20 npm → effective < 20, subScore ≤ 30; monotonic in qualified count; never above linear |
| Fully qualified / unfiltered sources unchanged | Do not penalise genuinely relevant lanes | existing `fully qualified samples are scored exactly as before` test passes |
| Empty-sample bypass closed (`ok` + raw total + 0 items ⇒ empty filter ⇒ 0) | An unseen total is not evidence; dedupe could empty the sample | `closes the empty-sample bypass` test |
| Methodology string lists 8 sources + model id | crates.io (added 1.6.8) was missing from the published methodology | build + smoke |
| Capsule stamp `crowding-1.3` | Receipts must identify the model that produced them | `brief.test.ts`, attenuation tests |

The bound is **uncalibrated**. It reduces one documented false-positive pattern
(huge homonym totals); it does not prove better overall accuracy.

## Verification evidence (this run)

| Check | Result |
|---|---|
| `npm ci` | exit 0 |
| `npm run typecheck` | clean |
| `npm test` (TS) | **386 tests: 385 pass, 0 fail, 1 skipped** (real Redis not provisioned) |
| Release-gate JS tests | **10/10 pass** |
| New synthetic matrix | **512 combinations** (4 totals × 4 qualified × 4 sources × 4 sample sizes × fresh/stale) — synthetic, not real users |
| `npm run build` | green |
| Local HTTP smoke (`scripts/production-smoke.mjs`) | **14 checks, exit 0** — `docs/evidence/continuation-1.6.10/production-smoke-local.txt` |
| Melious live probe | **0/4 healthy — HTTP 429 `insufficient_quota`** (balance −0.027687 EUR) — `melious-probe.txt` |
| LLM torture drill | failover 0–1 ms (<200 ms) ✅; breakers short-circuit after 429 cascade ✅; per-request budget ceiling ✅; 401 stops chain ✅; live-success gates ❌ (no quota) — `llm-torture.txt` |

No synthetic successes were recorded. The key was read from the environment only.

## State map (after this release)

| Surface | State | Boundary / next action |
|---|---|---|
| Scan / receipt / MCP / cohort HTTP paths | ✅ Done (tested paths) | 14-check local smoke |
| crowding-1.3 scoring | ✅ Merged, 🟡 uncalibrated | blinded calibration set needed |
| Recommendation copy ("Investigate first", outage ≠ gap) from handoff | 🟡 Partial | not re-implemented in this PR; tracked for 1.6.11 |
| Melious 4-model routing | 🔴 Blocked by billing | top up the Melious account, rerun `npm run llm:torture` |
| Strict production gate (distributed admission, issuer pin, supply/demand health) | 🔴 4 failing at 1.6.9 | operator provisioning (Upstash, signing pin, source tokens) |
| Billing, retention, deletion, entitlements | ⬜ Missing | not sold; do not launch paid tier |
| `Founder_Work.md`, `repos.md` | ⬜ Absent from repo | owner to supply |
| Independent multi-agent council / real pilots | ⬜ Missing | single-author perspectives only; no fabricated reviewers |

## Premortem (Nov 2026 launch failed) — this release's slice

| Failure mode | Root cause | Fix | Evidence |
|---|---|---|---|
| "Saturated" verdicts for niche ideas from homonym package hits | raw totals extrapolated linearly from a few qualified samples | logarithmic qualified-evidence bound | 2M-hit test, 512 matrix |
| Score inflated by sources returning totals without items | scorer trusted unseen totals | empty filter ⇒ 0 | empty-sample test |
| Receipts can't be traced to the model | stale model stamp | `crowding-1.3` stamp | brief/attenuation tests |
| Analyst silently unavailable at launch | gateway account out of credit | breaker + failover verified; launch checklist requires positive balance | llm-torture.txt |
| Users distrust methodology page | published source list missed crates.io | corrected | build + smoke |

## Launch status

**NO-GO for production launch** until the strict gate passes on the deployed SHA
and the Melious account is funded. This release is merged to `main` via PR.

## Security note

Credentials pasted into task prompts should be rotated by their owner; nothing
was written to the repo or evidence files (`grep sk-mel` / `ghp_` = 0 hits).
