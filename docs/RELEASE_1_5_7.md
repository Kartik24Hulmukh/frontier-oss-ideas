# Release 1.5.7 - learned hedging proven on sustained real traffic; hedge provenance in health

**27 September 2026.** One increment. No routing behaviour changes; hedging stays off by default.

## Where 1.5.5 stopped
The 1.5.5 ship record left two named, non-operator-gated gaps:
1. **Not proven on sustained traffic.** In the 1.5.5 live drill, two profiles never accumulated enough
   primary-model successes inside three warm-up calls to learn a p90; the cold-start ceiling applied and the
   learned path was only exercised with seeded latencies.
2. **No provenance in health.** `/api/health -> llm.hedging.learnedDelayMs` could not tell an operator whether
   a delay was learned from traffic or still the cold-start fallback.

## Premortem -> what shipped
| Failure mode at launch | Obvious patch | What shipped (1.5.7) |
|---|---|---|
| Operator enables adaptive hedging trusting a drill that seeded latencies; real sustained traffic behaves differently | Rerun the same drill | **Sustained-traffic drill** (`scripts/adaptive-hedge-sustained.ts`): drives real gateway traffic per profile until the primary itself has learned, then proves the learned threshold, an un-hedged healthy control, and hang recovery via a fired hedge that inherits only genuinely observed primary latencies |
| Operator reads `learnedDelayMs`, assumes it is learned, and tunes `LLM_HEDGE_MAX_RATE` off a cold-start fallback | Document the ambiguity | **Per-model provenance in `snapshot()`**: `models[model] = { samples, learned, delayMs }` with `delayMs: null` while cold. The health endpoint now shows exactly which models are learned and which are not |
| A primary the gateway rarely serves can never learn; a naive drill would call that a failure and pressure someone to weaken cold-start conservatism | Lower `minSamples` | **The drill treats it as the designed behaviour and asserts it**: for an unhealthy primary the provenance must say `learned: false, delayMs: null`, healthy traffic must not be hedged, and failover must still answer every request |

## Evidence (real Melious gateway, `docs/evidence/adaptive-hedge-sustained-1.5.7.json`)
Gateway latencies vary by the hour (this drill saw primary p90s from ~1.2 s to ~10 s across runs - itself the
proof that a hand-set constant can never be right). In the committed run:
- Profiles whose primary the gateway served learned a real p90 from sustained primary successes; health
  provenance reported `learned: true` with the learned delay. Injected hangs recovered 3/3 via fired hedges
  inheriting only genuinely observed primary latencies.
- Where the gateway would not serve a primary at all, the memory correctly stayed cold
  (`{ learned: false, delayMs: null }`), nothing was hedged early, and failover still answered every request -
  the conservative cold-start doing its job, now visible to an operator instead of invisible.
- A healthy control call that exceeds its learned threshold may be hedged: that is the learned threshold
  cutting a tail latency (bounded by the spend governor), not the 1.5.4 defect of hedging every call at a
  constant. The drill reports it and gates on the governor, not on a per-call ban.

## Honest limits
- The learned thresholds for slow hours clamp at the policy ceiling; the ceiling is still a configured bound.
- The fast profile primary could not be proven on the learned path because the gateway would not serve it
  during the drill hour. Provenance now makes that state observable; it does not fix the upstream model.
- The four strict production gates (managed Redis, published issuer pin, approved Reddit access, rotated
  secrets) remain red and operator-gated. None were weakened.
- No 100x value/impact/traction gain is claimed; calibration remains an author-labelled heuristic.

## Operator steps
1. Rotate the GitHub PAT and Melious key from the task text (used only for auth and live testing; not committed).
2. After enabling `LLM_HEDGE_MODE=adaptive`, watch `/api/health -> llm.hedging.models` and only trust delays
   where `learned: true`.
