# crowding-1.4: qualified observations, not a market census

This is an **uncalibrated lexical instrument**, not independent market validation. The prior crowding-1.3 model remains historical; scores across revisions are not comparable without rescanning.

## Supply

Specific workflow anchors must match in the title/body; generic AI/model/agent overlap alone cannot qualify a specific workflow. Multi-anchor queries require at least two specific matched concepts (or 60% when larger), including a title match. Transparent code/PR/diff-review aliases preserve common phrasing. Explicit code-review negation and code-of-conduct homonyms abstain. This does not solve general entailment, sarcasm, all homonyms, translation, missing context, or mechanism/constraint verification. Unsupported generic/non-ASCII queries abstain rather than treating every item as relevant.

Audit-floor observations remain visible but do not support scores, confidence, timelines, wedges, sublanes or citations. Every filtered sample—including a fully qualified sample—uses:

`effectiveTotal = min(raw × qualified / sampled, qualified × (1 + log10(1 + raw / sampled)))`

Zero inspectable/qualified observations means zero usable total. Provider totals are preserved for audit. The old 9/10 versus10/10 million-count discontinuity is removed. Even the logarithmic tail estimate is an unvalidated heuristic; it is not a count of verified competitors or independent teams.

Existing source weights, subscore formulas and 65% weighted-mean/35% peak blend remain. Confidence is an uncalibrated coverage/agreement/sample-sufficiency heuristic, forced to zero without qualified supply. A confidence percentage is not a probability of correctness. Source notices and source roles still matter; a paper/model/package is not automatically a shipping product. Semantic calibration, role/identity labeling and duplicate/fork adjudication remain required.

## Discussion support: demand-lexical-window-v1

Only recent, inspectable, topical pull/question observations in a matched365-day capture window qualify. Reddit/HN require a lexical request/complaint signal; obvious promotions do not qualify. Stack Overflow question observations are implementation questions, not buying intent. At most25 observations per source are considered; raw hit counts/views/comments do not multiply support.

Source heat = `round(qualified unique observed URLs /25 ×100)`. Weights remain Reddit0.40, SO0.25, AskHN0.35; mirrors retain0.5 weight and explicit provenance. Aggregate requires at least2 supported distinct channels,4 unique URLs, same query and window capture skew≤60seconds. Otherwise score is `null`, not invented zero. Trend is always unknown. These thresholds are safety choices, not calibrated demand estimates or unique-buyer denominators.

## Receipts and optional memo

Capsule1.2 includes the new model stamp and demand qualification summaries. Signatures protect issued fields, not provider truth, complete replay, scientific validity or narrative entailment. Qualification summaries omit rejected item payloads/indices; full scan audit observations are separate.

The optional memo accepts only an exact snapshot ID and issued receipt. Digest-keyed server snapshots are immutable, retained up to20minutes, and coordinated via authenticated Redis when configured. Query-cache replacement does not replace a retained older snapshot. Absent/expired/mismatched snapshots never trigger a hidden rescan. Only capsule-bound safe links become numbered citations. No qualified supply means no model dispatch, even if discussion links exist. Citation existence is not claim support; human checking remains mandatory.
