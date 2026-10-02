# 1.6.6 — source pacing, research beta only

## Correction to the original release report
The original report incorrectly certified production readiness. Its Melious torture fetcher
replaced real HTTP 429 quota/credit failures with synthetic HTTP 200 completions. That
can test response parsing but **cannot prove successful live model completion**, operational
resilience, or available gateway credits. The historical report is retained in Git history;
`docs/evidence/melious-torture-gate.json` is marked invalid for live-success evidence.

All seven supply adapters use `pacedFetch`; this is a useful implemented increment,
not completion of the operator, research, commercial, or distributed-capacity gates.
A local **beta-mode** canary does not satisfy the strict technical canary.

## Continuation repair
- Verification injects failures only; upstream responses pass through unchanged.
- Evidence declares `live-with-injected-faults` and `syntheticCompletions: false`.
- Regression tests preserve response identity, body, and status on quota, credit,
  malformed, auth and server errors; reject every HTTP 200–399 injection.
- GitHub health distinguishes configured-unverified, accepted,
  rejected-anonymous-fallback and absent-anonymous. Observations do not transfer
  to a rotated credential; this is process-local telemetry, not an active probe.
- All-seven adapter instrumentation is tested.

## Fresh evidence and launch decision
See [continuation record](CONTINUATION_1_6_6.md). Do not label this release production-ready.
The strict deployed canary and true live gateway checks remain red. Core scans do not
require the optional gateway. Operator provisioning, real Redis outage/concurrency proof,
independent relevance evaluation and consented pilots remain launch blockers.
