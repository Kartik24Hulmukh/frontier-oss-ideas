# Roadmap — Simultaneity Index 100×

## Principles
1. One job: crowding intelligence  
2. Evidence-linked or it does not ship  
3. Lightweight until retention forces weight  
4. Kill features that do not change decisions  

## P0 — Foundation (now → 2 weeks) ✅ in this package
- [x] Research + council verdict  
- [x] Adapter architecture  
- [x] Sources: GitHub, HN, arXiv, npm, PyPI, Hugging Face, OpenAlex  
- [x] Score + confidence + coverage  
- [x] Wedge engine v1  
- [x] Compare endpoint  
- [x] Evidence capsule JSON  
- [x] Unit tests for scoring  
- [x] Methodology + leverage docs  

**Acceptance:** Scan “AI code review agent” returns multi-source evidence, score, confidence, wedge, no invented competitors.

## P1 — Traction surface (weeks 2–6)
- [ ] Authenticated GitHub by default in deploy docs  
- [x] Response cache (query hash, TTL) — in-memory 10-minute TTL cache in `lib/core/cache.ts`, wired into `/api/search`  
- [ ] Share page `/s/[id]` + OG image  
- [ ] Public rate-limited API  
- [x] MCP tool schema `crowding_check` — zero-dependency stdio server in `scripts/mcp-server.mjs`, published as `npx simultaneity-mcp`  
- [ ] 20-idea gold set calibration  
- [ ] Product Hunt adapter (optional key)  
- [x] Reddit demand-side adapter + Supply x Demand 2D quadrant (Blue Ocean / Gold Rush / Ghost Town / Bloodbath) — closes the demand-blind-spot gap identified in the GTM Master Council Verdict (2026-09-26)  

**Acceptance:** 500 weekly scans; ≥30% return within 7 days; share rate ≥10% of scans.

### Next up (highest leverage, in order)
1. Ship the MCP server to the goose "founder distro" and mcpservers.org / Glama / Lobehub listings — idea-reality-mcp already occupies this wedge; the differentiated pitch is the Supply x Demand quadrant + 8-source evidence capsule, not just a score.
2. Gold-set calibration (40–60 ideas, human-ranked) with a published ordinal-accuracy badge — moves the score from "heuristic" to "measured."
3. Magic-link accounts + watchlists + weekly "Simultaneity Pulse" public page for retention, SEO, and shareability.
4. B2B cohort-screening wedge (accelerators/funds, $2–10k/yr) once the free product has traction data to sell against.

## P2 — Category ownership (months 2–3)
- [ ] Semantic clustering of near-duplicate competitors  
- [ ] Portfolio / multi-idea board  
- [ ] Weekly public “simultaneity pulse”  
- [ ] PatentsView adapter (opt-in)  
- [ ] Academic export format (idea-twin packages)  
- [ ] Agent SDK examples (Cursor, Claude, OpenAI tools)  

**Acceptance:** External agent products call the API; one research cite or partnership.

## Explicit non-goals (90 days)
- Full financial modeling  
- Auto-generated pitch decks  
- Social auth / teams / SSO  
- Scraping private data  
- Replacing customer interviews  

## Kill criteria (review day 90)
Stop or hard pivot if:
1. Gold-set ordinal accuracy < 60% vs expert ranking  
2. No measurable decision-change in user interviews (n≥15)  
3. Scope has drifted into generic validation suite  
4. Reliability < 90% successful scans (at least 3 sources ok)  
