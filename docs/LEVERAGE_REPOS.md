# Leverage Repos & APIs — July 2026

Study these. Integrate via thin adapters. Do not fork-and-forget.

---

## A. Core signal sources (product)

| Asset | URL / entry | How we use it | Build vs leverage |
|-------|-------------|----------------|-------------------|
| GitHub REST Search | `api.github.com/search/repositories` | Builder density, stars, recency | Leverage + Octokit |
| Octokit.js | github.com/octokit/octokit.js | Auth, retries, best practices | Leverage |
| HN Algolia | `hn.algolia.com/api/v1/search` | Show HN launches, discourse | Leverage |
| arXiv API | `export.arxiv.org/api/query` | Academic phrase heat | Leverage |
| OpenAlex | developers.openalex.org | Broader scholarly graph | Leverage (mailto/key) |
| Semantic Scholar API | semanticscholar.org/product/api | Alt/enrich papers, embeddings | Optional P1 |
| npm search | `registry.npmjs.org/-/v1/search` | JS package supply | Leverage |
| PyPI | warehouse search / JSON API | Python/ML package supply | Leverage |
| Hugging Face Hub | `huggingface.co/api/models` etc. | Models/datasets/spaces | Leverage |
| crates.io | crates.io API | Rust systems supply | Optional P1 |
| Product Hunt API v2 | api.producthunt.com | Consumer launches | Optional key |
| PatentsView / USPTO ODP | data.uspto.gov | True invention multiples | P2 |

---

## B. Infrastructure leverage

| Asset | Why |
|-------|-----|
| Next.js | Already in prototype; keep |
| Native React state/fetch | Zero-dependency client request lifecycle |
| Vercel Functions | Server-side source aggregation |
| Upstash Redis / Vercel KV | Optional future scan cache and share IDs |
| zod | Request validation |
| vitest / node:test | Scoring tests |

---

## C. Agent / retrieval ecosystem (distribution, not core UI)

| Asset | Role |
|-------|------|
| Exa / Tavily / Firecrawl | Optional deep web pass for paid tier |
| MCP servers pattern | Expose `crowding.check` to coding agents |
| OpenClaw / OpenHands / Browser-Use | Study agent UX; do not depend |
| n8n | Internal ops only |

---

## D. Research / narrative leverage

| Work | Use |
|------|-----|
| Bikard (2020) Idea Twins, SMJ | Methodology narrative, academic GTM |
| Merton multiple discovery | Category education content |
| Ogburn & Thomas multiples | Historical storytelling |

---

## E. Competitor products to track (not copy)

- Preuve AI — full viability, source-linked  
- IdeaProof, ValidatorAI, DimeADozen — AI validators  
- PainMap, Trend Seeker, WorthBuild — pain/demand  
- validationly.com — rough validation scores  
- exploreyc, kill-switch, swarmie — niche validators  

**Rule:** Steal *evidence standards*, not feature laundry lists.

---

## F. What NOT to leverage as core

- Scrapers that break ToS as primary path  
- Closed CB Insights datasets (cost, lock-in)  
- Heavy multi-agent frameworks for a 60s scan  
- Full vector DB until corpus product is real  
