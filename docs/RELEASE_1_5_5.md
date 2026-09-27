# Release 1.5.5 - adaptive stall hedging

**Founder decision: keep the public research beta running. This is a reliability/cost increment, not a
commercial-launch certification.** No 100x gain in value, impact or traction is claimed or measured here.

## Where the work stopped
1.5.4 merged stall hedging (`717fa59`) and listed one honest limit first: *"Hedging spends tokens to save time.
In the no-fault control run the hedge fired anyway, because the primary took longer than 150 ms. In production,
set the delay near the primary model's observed p90 latency; I suggest 2,500 ms."* That instruction is the bug:
it asks an operator to hand-tune a constant that is different per model, per prompt size and per hour, and that
silently degrades into either a token-burning hedge storm or a hedge that never fires.

The unshipped 1.5.4 branch record also described a "declare-dead" design whose race logic killed healthy live
models at their overhead budget. That approach is **not** revived here: hedging already gives bounded recovery
without ever declaring a healthy model dead, so the correct fix was to make hedging self-tuning, not to add a
second, more dangerous kill path.

## Premortem -> what shipped
| Failure mode at launch | Obvious patch | What shipped (1.5.5) |
|---|---|---|
| Operator sets one hedge constant; it is wrong for 3 of 4 models, so the bill doubles or the hedge never fires | "Document a better default" | **Per-model learned threshold.** A bounded ring of recent clean latencies per model; hedge at `clamp(p90 * multiplier, minMs, maxMs)`, recomputed at dispatch. No constant to get wrong |
| A fresh serverless instance hedges wildly because it knows nothing | Prewarm scripts | **Conservative cold start.** Below `minSamples` clean successes the static fallback (or the ceiling) applies, so an unmeasured model is never hedged early |
| One bad minute (429s, timeouts) drags the learned p90 down and starts a hedging storm | Exclude outliers | **Only clean successes teach the latency memory.** Failures, timeouts and cancelled hedges are never observed |
| Gateway-wide slowdown makes every request hedge and doubles the token bill | Global kill switch an operator must notice | **Rolling spend governor.** Hedges are capped as a fraction of recent requests (`LLM_HEDGE_MAX_RATE`, default 0.2). Past the cap hedging simply stops; requests still complete sequentially |
| Nobody can tell whether hedging is helping in production | Logs | **`/api/health` -> `llm.hedging`** reports mode, per-model learned delay, hedge count and hedge rate over the window |
| The change silently alters existing routing | Feature flag nobody sets | **Off by default.** With neither `LLM_HEDGE_MODE` nor `LLM_HEDGE_AFTER_MS` set, routing is strictly sequential, exactly as 1.5.3/1.5.4. Token caps, breaker semantics and 401/403 chain-stop are untouched |

## What was checked
| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Full suite (`npm test`) | **108 passed / 0 failed / 1 skipped** (the skip is the CI-only real-Redis test). 5 new tests: p90 learning and clamping; cold start does not hedge a healthy primary; a learned threshold hedges a later stall and cancels the hung call; the spend governor caps the hedge rate; hedging stays off when unconfigured |
| Live Melious drill (`scripts/adaptive-hedge-live.ts`, all three profiles, real gateway) | **pass: true.** Healthy control calls hedged: **0/3** (1.5.4's 150 ms constant hedged healthy calls). Injected hangs recovered: **3/3** (fast 1,470 ms end to end, quality 4,919 ms, reasoning 15,879 ms - the reasoning backup itself took 10.6 s). Evidence: `docs/evidence/adaptive-hedge-live-1.5.5.json` |

## Honest limits
- In the live drill two profiles had too few *primary-model* successes to learn a p90 within three warm-up
  calls (their warm-up answers came from backups), so the cold-start ceiling applied and no healthy call was
  hedged. The fault runs were seeded with the observed latencies. On hosted traffic the memory fills naturally;
  it is not yet proven on hosted traffic, because no gateway secret is installed in the deployment.
- Hedging still costs tokens when it fires. The governor bounds the cost; it does not make it zero.
- The four strict production gates from 1.5.2/1.5.3/1.5.4 are still red and still need an operator: managed
  Redis for distributed admission, an independently published issuer pin, approved Reddit access, rotated
  secrets. None of them were weakened.
- `Founder_Work.md` is not in the repo or the attachments, so it could not be used as a system prompt.
- This environment cannot spawn separate agents, so the "parallel agents / council" step was reasoned through
  as an explicit premortem table above, not run as real independent agents. Stated plainly rather than dressed up.

## Operator steps after this merge
1. Rotate the GitHub PAT and the Melious key that appear in the task text (used here only for clone/auth and
   live testing; neither is committed).
2. Install the scoped gateway key as a Vercel secret and set `LLM_HEDGE_MODE=adaptive`. Leave
   `LLM_HEDGE_AFTER_MS` set to 2500 as the cold-start fallback only.
3. Watch `llm.hedging.hedgeRate` on `/api/health` for a day before raising `LLM_HEDGE_MAX_RATE`.
