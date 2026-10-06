# Opportunity Brief

## AI code review agent

Snapshot: 2026-10-06T16:18:50\.036Z · Model: crowding-1\.4

> Public-source heuristic, not a market-size estimate, unique-team count, probability of success, or investment advice. Discussion heat is not verified buyer demand.

## Evidence snapshot

- Crowding: **55/100 — Crowded**
- Source coverage: **100%**; confidence proxy: 88% (not a calibrated probability).
- Demand heat: unknown; demand coverage: 0%.
- Query variants actually searched: AI code review agent; ai pull request review agent

All supply adapters responded; this does not establish complete market coverage.

## Source accountability

| Source | Status | Match count (not unique teams) | Operator notice |
| --- | --- | ---: | --- |
| GitHub Repositories | ok | 5359 |  |
| Hacker News | ok | 514 |  |
| arXiv Papers | ok | 1 |  |
| OpenAlex Works | ok | 350116 |  |
| npm Packages | ok | 2056456 |  |
| PyPI Packages | ok | 1 | PyPI search unavailable or challenged; exact-name evidence only, not ecosystem-wide search\. |
| Hugging Face Hub | ok | 0 |  |
| crates\.io \(Rust\) | ok | 2298 |  |

## Demand accountability

| Source | Status | Provenance | Match count | Operator notice |
| --- | --- | --- | ---: | --- |
| Reddit discussions | error | not recorded | unknown | Reddit blocks anonymous server traffic — set REDDIT\_CLIENT\_ID/REDDIT\_CLIENT\_SECRET\. Mirror fallback also failed: PullPush archive mirror returned 403\. |
| Stack Overflow questions | ok | primary | 2 |  |
| Ask HN \+ comment pull | ok | primary | 1406 |  |

Discussion heat is not buyer demand. Mirror data is degraded even when all adapters return results.

## Why this score?

| Source | Included | Weight | Subscore | Signal |
| --- | --- | ---: | ---: | --- |
| GitHub Repositories | yes | 0.28 | 16 | 1 repo\(s\) with 50\+ stars in top results; 5,359 total matches; 1 created in last 18 months\. Scored on 1/15 sampled items above relevance threshold 0\.18; the 5,359 raw match count is shown for audit only\. |
| Hacker News | yes | 0.18 | 100 | 7 Show HN launch signal\(s\); 0 stories with 50\+ points\. Scored on 12/14 sampled items above relevance threshold 0\.18; the 514 raw match count is shown for audit only\. |
| arXiv Papers | yes | 0.1 | 6 | 1 works; 1 in last 2 years — modest academic interest\. Scored on 1/1 sampled items above relevance threshold 0\.18; the 1 raw match count is shown for audit only\. |
| OpenAlex Works | yes | 0.1 | 66 | 350,116 works; 5 in last 2 years — active academic heat\. Scored on 6/7 sampled items above relevance threshold 0\.18; the 350,116 raw match count is shown for audit only\. |
| npm Packages | yes | 0.08 | 0 | No matching packages found\. Scored on 0/10 sampled items above relevance threshold 0\.18; the 2,056,456 raw match count is shown for audit only\. |
| PyPI Packages | yes | 0.08 | 8 | 1 package signals; 1 recently maintained among top hits\. Scored on 1/1 sampled items above relevance threshold 0\.18; the 1 raw match count is shown for audit only\. |
| Hugging Face Hub | yes | 0.14 | 0 | No Hugging Face models/datasets matched\. |
| crates\.io \(Rust\) | yes | 0.04 | 9 | 2,298 package signals; 1 recently maintained among top hits\. Scored on 1/10 sampled items above relevance threshold 0\.18; the 2,298 raw match count is shown for audit only\. |

## Evidence to inspect

- [Gentleman-Programming/gentle-ai](<https://github.com/Gentleman-Programming/gentle-ai>) — github
- [Show HN: Autofix Bot – Hybrid static analysis and AI code review agent](<https://news.ycombinator.com/item?id=46237358>) — hackernews
- [I built an AI code review agent in a few hours, here's what I learned](<https://www.sourcebot.dev/blog/review-agent-learnings>) — hackernews
- [Show HN: Open-source AI code review agent that's aware of your entire codebase](<https://docs.sourcebot.dev/docs/agents/review-agent>) — hackernews
- [I built a zero-noise AI code review agent using Claude Code](<https://medium.com/riskified-technology/lgtm-2-0-zero-noise-ai-code-review-agents-857441ec4f1a>) — hackernews
- [Show HN: AgentCheck – Local AI-powered code review agents for Claude Code](<https://github.com/devlyai/AgentCheck>) — hackernews
- [CR-Bench: Evaluating the Real-World Utility of AI Code Review Agents](<http://arxiv.org/abs/2603.11078v1>) — arxiv
- [Human-AI Synergy in Agentic Code Review](<http://arxiv.org/abs/2603.15911>) — openalex
- [Rethinking Code Review in the Age of AI: A Vision for Agentic Code Review](<https://arxiv.org/abs/2605.17548>) — openalex
- [An Agentic-AI Solution for Intelligent Code Review](<https://doi.org/10.1109/slaai-icai68534.2025.11318443>) — openalex
- [Using Agentic AI for contextualized and multifaceted code review at Ericsson](<https://arxiv.org/abs/2609.15877>) — openalex
- [AGENTCODE INSPECTOR: AN AGENTIC AI-BASED AUTONOMOUS CODE REVIEW SYSTEM](<https://doi.org/10.5281/zenodo.20093791>) — openalex
- [ai-code-review-agent](<https://pypi.org/project/ai-code-review-agent/>) — pypi
- [cora-code](<https://crates.io/crates/cora-code>) — crates

## Differentiation hypotheses — recommendations, not findings

### Neutral layer above the lane

Many related public artifacts were observed; verify which are direct competitors\. Prefer infrastructure, aggregation, evaluation, or interoperability over another vertical app\.

## Decision worksheet — complete with a human reviewer

- Target buyer / workflow: [not yet validated]
- Closest competing evidence and important differences: [review links above]
- Disconfirming evidence: [what would invalidate this opportunity?]
- Fastest falsification experiment: interview 5 target users about their last actual occurrence; request a concrete pilot commitment, not an opinion.
- Proposed kill criterion: no recent costly problem and no pilot commitment after 5 qualified interviews. Adjust and preregister before interviews.
- Decision: [build / specialize / investigate / stop]
- Owner / review date / observed outcome: [complete]

## Verification and handling

Receipt algorithm: sha256
Capsule digest: a358eb169cf0dbfd3efc4c2f6a1026cc91dd6a557e5c850fd672766d3a4b3e72

Download the companion evidence JSON and POST { capsule, receipt } to /api/verify. Require digestMatches; require issuerTrusted for issuer authentication. A hash alone is not proof of origin. The receipt covers the capsule, not this editable worksheet or its recommendations.

This file is a local snapshot, not a hosted immutable archive. Sharing it may reveal your idea. Evidence links and source content can change.
