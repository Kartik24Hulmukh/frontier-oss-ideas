# AI Council Meeting — Final Verdict

**Session:** Simultaneity Index 100× Strategy  
**Date:** 2026-07-17  
**Format:** Six specialist agents + chair synthesis  
**Input:** Baseline prototype audit, competitive research, leverage map, product options

---

## Council roster

| Agent | Mandate |
|-------|---------|
| **A1 — Category Strategist** | Positioning, category ownership, naming |
| **A2 — Product Minimalist** | Simplicity, kill scope, JTBD |
| **A3 — Growth / Traction** | Virality, loops, distribution, metrics |
| **A4 — Technical Architect** | Lightweight architecture, leverage repos |
| **A5 — Research Scientist** | Idea-twins validity, methodology rigor |
| **A6 — Adversarial Critic** | Kill the project if weak; red-team claims |
| **Chair** | Final verdict, non-negotiables, roadmap lock |

---

## Round 1 — Independent positions

### A1 — Category Strategist
**Vote: BUILD (strong)**

The market is flooded with “AI idea validators.” Almost all of them are either:
1. LLM opinion with a vanity score, or  
2. Heavy paid viability reports.

Nobody owns **supply-side crowding / simultaneous invention** as a daily habit product.  
Name **Simultaneity Index** is a gift — keep it. Do not rebrand to generic “ValidateAI.”

**Category line:**  
> *Crowding intelligence for builders and agents.*

**Enemy:** Vague AI yes-men.  
**Ally:** Pain tools (PainMap) and full viability suites (Preuve) — we sit *before* them in the funnel.

### A2 — Product Minimalist
**Vote: BUILD, but amputate**

100× is not more features. 100× is:
- Better signal quality  
- One unforgettable output (score + wedge + evidence)  
- Zero enterprise cosplay  

**Ship only:**
1. Multi-source live scan  
2. Calibrated score + confidence  
3. Wedge hints  
4. Shareable evidence capsule  
5. Compare two ideas  
6. Agent/API endpoint  

**Do not ship (P0):** accounts, teams, billing complexity, browser agents, full RAG, patent deep-dive UI, social login.

### A3 — Growth / Traction
**Vote: BUILD with distribution plan**

Loops that work:
1. **Share card** — “Crowding 73 · Crowded · 12 evidence links” → Twitter/HN/LinkedIn  
2. **Agent default** — MCP/tool: `crowding.check(idea)` before scaffold  
3. **Weekly “most simultaneous ideas”** public leaderboard (aggregate, not private queries)  
4. **Example lanes** on homepage that always re-scan live  

Traction north star: **weekly decision scans**, not MAU vanity.

First 90-day channels: Show HN, Indie Hackers, Twitter builders, Cursor/Claude plugin directories, university research labs (idea-twins angle).

### A4 — Technical Architect
**Vote: BUILD (architecture is right-sized)**

Keep Next.js app. Core design:

```
Query → Source Adapters (parallel) → Normalizer → Scorer → Wedge → Capsule
```

Adapters are pure functions. Fail soft. Cache by normalized query hash (TTL 6–24h).

Leverage, don’t rebuild: Octokit, OpenAlex, HF Hub API, PyPI/npm search, HN Algolia.

Optional later: embeddings only for *clustering evidence items*, not for inventing market claims.

### A5 — Research Scientist
**Vote: BUILD with methodological humility**

Bikard’s idea-twins work shows simultaneous discovery is measurable and consequential.  
**Warning:** keyword search ≠ true independent invention. Label scores as **crowding heuristics**, not scientific proof of multiples.

Publish methodology page. Track false-positive rates with a gold set of known crowded vs open lanes. Add confidence when sources disagree or fail.

Long-term research product: harvestable “idea twin packages” for strategy research — academic distribution moat.

### A6 — Adversarial Critic
**Vote: CONDITIONAL BUILD**

Kill criteria if any of these fail in 90 days:
1. Users do not change a build decision after a scan (no behavior change)  
2. Score disagrees with expert judgment on a 20-idea gold set >40% of the time  
3. You expand into “full validation suite” and become another IdeaProof clone  
4. Unauthenticated GitHub makes the product unreliable in production  

Also: “once in a decade startup” language is dangerous. The *category* can be decade-scale; the company is not automatic. Earn it with retention and agent distribution.

---

## Round 2 — Debate highlights

| Motion | Outcome |
|--------|---------|
| Rebrand away from Simultaneity Index? | **Rejected** — name is the moat |
| Add LLM narrative summary? | **Optional only**, always below evidence; never invent competitors |
| Compete with Preuve on viability? | **Rejected** — stay crowding-only |
| Add Reddit pain mining P0? | **Deferred P2** — different job |
| Become agent infrastructure? | **Accepted** as primary decade bet |
| Patents in P0? | **Deferred** — high value, high complexity |
| Keep prototype UI aesthetic? | **Accepted** — instrument/radar feel fits brand |

---

## Round 3 — Roadmap lock

### P0 (this package + 2 weeks)
- Source adapter interface  
- GitHub (auth token), HN, arXiv, npm, **PyPI**, **Hugging Face**, **OpenAlex**  
- Confidence + coverage  
- Wedge engine v1  
- Scoring tests + methodology doc  
- Compare API  
- Shareable JSON evidence capsule  

### P1 (30 days)
- Query cache  
- Share pages / OG cards  
- Public API key tier  
- MCP/tool schema for agents  
- Gold-set calibration  
- Product Hunt adapter (if key)  

### P2 (90 days)
- Semantic clustering of competitors  
- Portfolio mode (many ideas)  
- Weekly public simultaneity report  
- Optional patents adapter  
- Research export for academics  

---

## FINAL VERDICT (Chair)

### Decision: **GO — build Simultaneity Index as a focused crowding-intelligence product**

### Confidence: **High on category; Medium on company outcome** (as it should be)

### Why this can be 100× vs the attached prototype
1. **Category clarity** — own crowding, not “validation soup”  
2. **Evidence quality** — more ecosystems + confidence  
3. **Actionable output** — wedge, not just doom score  
4. **Distribution** — agents + share cards  
5. **Intellectual spine** — idea-twins research narrative  
6. **Ruthless simplicity** — still one page, still light  

### What “once in a decade” actually means here
If agentic coding becomes default, **every scaffold will need a pre-flight crowding check**.  
Whoever becomes that default infrastructure owns a new layer of the builder stack — analogous to “linters for market reality.”

That is the bet. Not another SaaS report mill.

### Co-founder commitments
1. We never ship a score without linked evidence.  
2. We never invent competitors via LLM.  
3. We measure decision-change, not vibes.  
4. We kill the project if gold-set accuracy and behavior change fail.  
5. We stay lightweight until pull, not push, forces complexity.  

**Signed:** AI Council Chair — 2026-07-17  
**Package status:** FINALIZED for build
