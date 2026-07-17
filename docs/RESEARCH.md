# Deep Research Report — Simultaneity Index (July 2026)

**Subject:** Attached prototype `frontier-oss-ideas` → productized as **Simultaneity Index**  
**Date:** 2026-07-17  
**Mode:** Co-founder research + competitive intelligence + leverage map

---

## 1. What you already built (baseline audit)

### Product identity (as shipped)
- **Name:** Simultaneity Index  
- **Promise:** “How many teams are already building your idea?”  
- **Sources (live):** GitHub repos, Hacker News, arXiv, npm  
- **Output:** 0–100 crowding score + verdict bands + evidence lists  
- **Stack:** Next.js 16, React 19, SWR mutation, Tailwind/shadcn, stateless demo

### Strengths (keep)
| Strength | Why it matters in 2026 |
|----------|------------------------|
| Live multi-source scan | Beats pure LLM validators that invent competitors |
| Clickable evidence | Market now rewards source-linked claims |
| Sharp single question | Category-defining focus vs bloated “AI co-founder” suites |
| Academic framing (simultaneity) | Differentiated brand; defensible narrative |
| Lightweight prototype | Fast to ship, easy to understand |

### Weaknesses (fix or die)
| Weakness | Impact |
|----------|--------|
| Keyword-only matching | False positives/negatives; “AI code review” ≠ same product |
| Heuristic scoring uncalibrated | Score feels arbitrary; hard to trust |
| No confidence / coverage metric | Silent failure when sources rate-limit |
| Only 4 sources; JS-centric (npm) | Misses PyPI, HF models, patents, launches |
| No “open wedge” | Crowded score without *where to attack* is demotivating |
| Stateless, no shareable report | Weak virality & retention |
| Unauthenticated GitHub | Hits rate limits fast |
| `ignoreBuildErrors: true` | Ships broken types |
| No tests | Scoring can regress unnoticed |

### Code surface (LOC order)
~1k TS/TSX lines. Core intelligence lives in `lib/scoring.ts` + `lib/sources.ts`. This is a **feature, not a bug** — keep the surface area tiny.

---

## 2. Market reality (July 2026)

### Category map

```
                    LIVE EVIDENCE
                         ▲
                         │
   Pain discovery        │         Full viability suites
   (PainMap, Reddit) ────┼──── (Preuve, IdeaProof, DimeADozen)
                         │
                         │
              ★ SIMULTANEITY INDEX
              (crowding / idea-twins radar)
                         │
                         ▼
                 LLM OPINION ONLY
              (ValidatorAI, raw ChatGPT)
```

### What buyers actually want
From 2026 tool roundups (Preuve, Trend Seeker, LaunchList, WorthBuild comparisons):

1. **Sourced evidence** you can click  
2. **Named competitors**, not “you will face competition”  
3. **Demand/pain signals** from real communities  
4. Speed (minutes, not weeks)  
5. Honesty — AI-opinion tools systematically lean optimistic  

### Critical insight
> Building has never been faster. The question stopped being “can you make it?” and became “should you — and is the lane already full of simultaneous builders?”

CB Insights-style failure narratives still cite poor product-market fit. Weekend MVPs make **crowding detection** more valuable than code generation.

### Competitive gap you can own
| Player type | What they answer | What they miss |
|-------------|------------------|----------------|
| AI opinion validators | “Does this sound good?” | Reality check |
| Pain miners | “Is the problem real?” | Supply-side crowding |
| Full viability suites | “Is this a business?” | Heavy, paid, slow; not free daily habit |
| **Simultaneity Index** | **“Who is already inventing this independently?”** | Not full TAM/pricing (by design) |

**Do not compete with Preuve on 150-page reports.** Be the free, daily, 10-second crowding radar that those tools cannot be (too heavy).

---

## 3. Intellectual foundation (your moat narrative)

### Multiple discovery / idea twins
- **Merton (1963):** simultaneous discovery as strategic research site  
- **Bikard (2020), SMJ — “Idea Twins”:** method to harvest simultaneous discoveries; identical ideas meet different fates by context  
- **Ogburn & Thomas (1922):** classic multiples list  

**Product translation:**  
If independent invention is common, founders need a **simultaneity detector** more than an “idea generator.” Your brand is not “AI says your idea is good” — it is **“the field is inventing this in parallel; here is the evidence.”**

This is a once-in-a-decade narrative fit for the agent/vibe-coding era.

---

## 4. Leverage tech (July 2026) — what to absorb, not rebuild

### Tier A — ship in P0/P1 (public, free-ish, high signal)
| Source | Why | Notes |
|--------|-----|-------|
| **GitHub REST/GraphQL + Octokit** | Strongest “someone is building this” signal | Authenticate; handle secondary rate limits |
| **HN Algolia** | Launch signals (Show HN), discourse heat | Already in prototype |
| **arXiv API** | Academic heat | Keep exact-phrase + broaden |
| **OpenAlex** | Broader scholarly graph than arXiv alone | Free key; polite mailto; coverage 2× legacy indexes |
| **npm registry search** | JS ecosystem packages | Already in prototype |
| **PyPI** | Python ML/data packages | Critical for AI ideas |
| **Hugging Face Hub API** | Models/datasets/spaces = AI product supply | Differentiator vs 2024 tools |
| **crates.io / lib.rs** | Rust systems lane | Optional P1 |

### Tier B — P1/P2 with keys or careful ToS
| Source | Why | Risk |
|--------|-----|------|
| Product Hunt GraphQL | Consumer launch density | Auth, API churn |
| PatentsView / USPTO ODP | True invention multiples | Heavier UX; registration changes 2026 |
| Reddit | Demand/pain | API friction; better as optional later |
| Exa / Tavily / Firecrawl | Semantic web search | Cost; don’t depend for free tier |

### Tier C — infrastructure leverage (do not invent)
| Tool | Use |
|------|-----|
| Octokit.js | GitHub client best practices |
| Vercel KV / SQLite / Upstash | Scan cache, shareable report IDs |
| Faiss / local embeddings (optional) | Semantic clustering of competitors |
| Qdrant/Weaviate | Only if you build a corpus product later |
| n8n / workflow agents | Internal data ops, not core product |

### Anti-patterns (do not build)
- Another generic multi-agent “AI co-founder”  
- Full CB Insights clone  
- Scraping that violates ToS as core path  
- Heavy RAG stack before product-market proof  
- Bloated auth/enterprise before 1k weekly active scanners  

---

## 5. 100× product definition

### One-sentence product
**A free, live, source-linked crowding radar that measures how many independent teams are already inventing your idea — and where the open wedge remains.**

### Jobs to be done
1. Before a weekend build: kill or commit in 60 seconds  
2. Before a pivot: compare two lanes side-by-side  
3. Before a grant/pitch: show evidence of novelty *or* of a race  
4. For researchers: harvest idea-twin style evidence packages  

### North-star metric
**Weekly verified scans that produce a decision** (kill / wedge / double-down) — not vanity pageviews.

### 100× levers (ordered)
1. **Semantic relevance filter** — stop scoring keyword junk  
2. **More ecosystems** — HF + PyPI + OpenAlex  
3. **Confidence + coverage** — trust when partial  
4. **Wedge engine** — open sub-lanes from evidence  
5. **Shareable evidence capsules** — viral loop  
6. **Compare mode** — multi-idea portfolio  
7. **API for agents** — every coding agent asks “is this crowded?” before scaffolding  

#7 is the decade-scale bet: **become the default crowding MCP/tool for agentic builders.**

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Score gamed / wrong | Publish methodology; confidence bands; human-readable signals |
| Rate limits | Tokens, cache, graceful degrade |
| Category confusion with validators | Ruthless positioning copy |
| ToS / API breakage | Adapter pattern; contract tests |
| Scope creep into full viability | Kill list in roadmap |
| Solo founder bandwidth | Ship thin vertical; refuse enterprise features |

---

## 7. Research conclusion

The attached prototype is **already pointing at a real, under-owned category**: supply-side simultaneity, not demand-side pain mining and not LLM viability theater.

**100× path is not “add more AI.”**  
**100× path is: sharper evidence, more ecosystems, calibrated score, wedge, shareability, and become infrastructure for agents.**

See `COUNCIL_VERDICT.md` for adversarial validation of this thesis.
