# September–October 2026 launch decision

## Decision: public research beta; no paid-production certification yet

**Value hypothesis, not a 100x claim:** help accelerator analysts and technical founders falsify a crowded idea in one evidence-linked brief before spending a week building. The defensible asset would be consented decision outcomes and adjudicated relevance labels, not more model-generated prose.

### Concrete launch gates

| Gate | Owner | Required evidence | Stop condition |
|---|---|---|---|
| Operational | Operator + SRE | Rotated secrets, Redis concurrent/outage test, pinned signing, source-health alerts, rollback drill, strict canary green | Any unbounded spend path, untrusted issuer or unexplained source degradation |
| Relevance | Research lead | Existing 50 held-out lanes; two independent reviewers blinded to score; relevance labels, agreement, confidence intervals, adjudication | Pairwise agreement against consensus below preregistered 70% target; revise heuristic rather than move threshold |
| Decision utility | Founder | Five analyst pilots; each reviews four lanes; log decision before/after and evidence that changed it | Fewer than 3/5 can name a concrete changed decision after two iterations |
| Repeat use | Founder | Consented week-2 follow-up, at least 3/5 repeat without prompting | No repeat pull: pause paid-tier launch |
| Commercial | Founder | Explicit willingness-to-pay interviews and three written pilot commitments; privacy, support and entitlements actually delivered | No billing or guaranteed-capacity promises before implementation |

These targets are proposed preregistration thresholds, not measured outcomes or statistical proof from five participants.

### 26–30 September: remove launch blockers
- Operator rotates exposed credentials and provisions infrastructure. No additional broad personal tokens in app runtime.
- SRE runs distributed traffic/outage tests and confirms provider quota pacing. Retain raw receipts and gate reports.
- Research freezes the held-out lanes and rubric before scoring. Audit irrelevant package counts and broad lexical matches; zero hits are unknown visibility, not no competition.

### 1–10 October: concierge pilot
- Recruit five accelerator analysts with permission; do not send outreach automatically.
- Give each a four-lane shortlist. Record pre-scan build/stop/reframe choice and rationale, then show evidence brief. Capture changed choice, decisive links, false positives, time spent and willingness to repeat.
- Pair each machine score with an explicit falsification test. Publish only consented, de-identified case studies.

### 11–20 October: deliberate public beta
- If gates pass, publish one reproducible case study with capsule, source health, decision change and limitations.
- Offer MCP pre-scaffold check and downloadable brief as distribution surfaces; measure completed evidence reviews rather than impressions.
- Run a small Show HN/accelerator cohort launch, not mass spam. Capacity-limited slots protect provider quotas.

### 21–31 October: choose expansion or stop
- Compare reviewer agreement, relevance errors, weekly changed decisions and voluntary repeat use against frozen targets.
- Expand only the workflow users actually repeat. If no decision utility, stop adding features and revisit the ICP or kill the product.
- Durable watchlists, immutable hosted snapshots, billing and background portfolios remain separately scoped work; the existing browser-only watchlist is not a paid retention service.

### Minimal consented pilot ledger
`participant_id, consent_at, lane_id, pre_decision, pre_reason, scan_receipt_digest, source_coverage, post_decision, decisive_evidence_urls, false_positive_count, minutes_spent, week2_repeat, willingness_to_pay, deletion_requested_at`

Use pseudonymous participant IDs; store contact information separately with access controls. No research query telemetry without consent. Honor deletion requests and do not store confidential business ideas in public artifacts.

### Remaining research-integrity risks
The UI confidence is a source-coverage/agreement heuristic, not a calibrated probability. Receipts prove artifact integrity, not truth. LLM citation IDs prove a link exists, not that it supports the claim. Keyword counts do not establish unique competitors or independent invention. This release corrects verdict, Pulse metadata and calibration-copy overclaims; it does not solve semantic relevance or establish causality.
