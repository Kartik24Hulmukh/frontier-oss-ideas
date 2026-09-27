# Simultaneity Index 1.5.11 — relevance guard

## Founder decision
Ship the first research-roadmap product increment: a conservative, explainable relevance guard before scoring. Raw search counts stay visible, while obvious lexical drift can no longer inflate a verdict through top-result scoring.

## What changed
- Added dependency-free concept normalization and title-weighted relevance scoring.
- Annotates evidence with a 0–1 relevance value and filters only clear drift.
- Retains the two strongest items as an auditable sparse-lane floor.
- Records `relevanceFilter` before/after/threshold provenance on every affected source.
- Integrated after cross-source deduplication and before crowding scoring.

## Council / premortem
- **Trust:** hiding evidence would undermine reproducibility → counts remain unchanged and filtering metadata is public.
- **Recall:** a hard embedding threshold could erase novel vocabulary → conservative threshold plus two-result floor.
- **Latency/cost:** a 90 MB model in serverless would threaten cold starts → deterministic local scoring, no network or model dependency.
- **Gaming:** descriptions can keyword-stuff → titles carry 70% of the score.
- **Overclaiming:** this is not claimed as >=85% precision until blinded gold-set review is performed.

## Verification
TypeScript clean; full suite green including 3 new relevance tests; production Next.js build clean.

## Honest launch state
Public research beta remains shippable. Commercial launch remains blocked on operator-owned Redis, issuer trust, healthy demand/supply credentials, key rotation, blinded calibration, and a consented pilot.
