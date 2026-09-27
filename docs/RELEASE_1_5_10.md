# Release 1.5.10 - reasoning starvation fix (2026-09-27)

**A real defect was found by re-running the live drill, not by reading the ship record.** The 1.5.9 record said all 13 gates passed. The first drill of this run passed 12/13. The 13th failed for a reason the evidence file could not explain (`first: 0`). Chasing it exposed a production-relevant flaw in how the router talks to thinking models.

## What was wrong
- One routed model performs hidden chain-of-thought. On Melious, `max_tokens` bounds reasoning + answer together. At `max_tokens=400` the model used **400/400 tokens on reasoning** and returned an empty `content` with `finish_reason: length`. At 60 it did the same. Direct probes reproduced it 4/4 times.
- The router treated this as `empty`: a generic failure. It paid for the tokens (correctly: conservative, no refund), tripped the breaker (arguably wrong: the model was healthy), and spent ~4.4 s before failing over. Nothing in `/api/health` distinguished this from a flaky gateway.
- The torture drill's window-ceiling gate recorded only `usage.totalTokens` for the first request, so the evidence file hid the actual error.

## Why this is the fix and not a patch
The obvious patch is to raise the model's `maxOutputTokens`. That pays more for unverifiable reasoning and still fails on long prompts. Instead:
1. **Control the cause on the wire.** `reasoning_effort: none` is sent by default. Probed live on all four models with `max_tokens` 60 and 400: `reasoning_tokens: 0` and non-empty content in 8/8 calls. Latency for the thinking model fell 5.5x and tokens 5.7x. The analyst memo is citation-checked against a numbered evidence table; hidden reasoning adds cost, not trust. Callers can opt in (`reasoningEffort: 'low' | 'medium' | 'high'`).
2. **Name the failure.** `reasoning_exhausted` is a distinct outcome with per-model provenance in health (`availability[model].reasoningExhausted`). Operators can see if a gateway stops honouring `reasoning_effort`.
3. **Account for it.** `usage.reasoningTokens` surfaces billed hidden reasoning per request and per attempt.
4. **Make the drill self-explaining.** The window gate now retains every result's error, attempts and reasoning tokens and asserts the window was never oversold.

## Verification actually run
- `tsc --noEmit` clean. Suite 115 passed / 0 failed / 1 skipped (CI-only real Redis). `next build` clean.
- Live Melious torture BEFORE the fix: 12/13 (`docs/evidence/gateway-1.5.10-prefix-fail.json`). AFTER: **ALL 13 GATES PASSED** (`docs/evidence/gateway-1.5.10.json`): four models answer directly (686 / 723 / 1240 / 801 ms), 429 failover 0 ms on all profiles, 5xx+504 cascade 0 ms, hung-gateway timeout at 801 ms then 0 ms failover, breaker short-circuit, per-request and rolling-window ceilings enforced before network (489/900 used, later requests refused), invalid key stops the chain after one call.
- Key handling: `MELIOUS_API_KEY` passed via the process environment only; never written to any file or output.

## State map after 1.5.10
- **Done:** everything in 1.5.9 plus reasoning control, starvation provenance and reasoning-token accounting.
- **Partial:** hosted gateway still unconfigured on Vercel (`modelGateway: not-configured`), so the hosted deploy cannot exhibit this fix until the operator installs a scoped key. Scoring heuristic still uncalibrated.
- **Missing (operator-gated):** managed Redis, published issuer pin, approved Reddit OAuth, rotated secrets, blinded calibration, consented pilot, billing. Unchanged.
- **Broken:** none known after this fix.

## Premortem for this increment
1. *Gateway ignores `reasoning_effort` for a future model* -> `reasoning_exhausted` provenance in health makes it visible within one window; breaker isolates the model.
2. *A caller needs deep reasoning* -> explicit opt-in per request; default stays cheap and verifiable.
3. *Usage shape changes* -> `reasoningTokensOf` reads both known shapes and treats anything else as 0 (never negative, never NaN).
4. *Drill flakes on a genuine upstream blip* -> the gate still fails (a gate should), but the evidence now says exactly why.

## Honest limits
- `Founder_Work.md` is not in the repo or the attachments; it could not be followed as a system prompt.
- No parallel-agent substrate exists here; the council is the premortem above plus the standing council docs. No 100x value/impact/traction gain is claimed or measured; this is a measured 5.5x latency / 5.7x token improvement on one model plus a correctness fix.
- Secrets in the task text (GitHub PAT, Melious key) were used in memory only and remain operator-urgent to rotate.
