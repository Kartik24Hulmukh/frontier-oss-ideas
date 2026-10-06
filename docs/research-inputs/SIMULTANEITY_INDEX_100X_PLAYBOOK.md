# Simultaneity Index — 100× Product & GTM Playbook

## Founder + investor premortem for the September–October 2026 launch window

**Source:** Full audit of github.com/Kartik24Hulmukh/frontier-oss-ideas (README, POSITIONING, METHODOLOGY, ARCHITECTURE, RESEARCH, ROADMAP, council verdicts, scoring engine, all seven source adapters, UI), metadata + README analysis of 33 reference open-source repos from repos.md, and validated research on grants, VCs, accelerators, launch benchmarks and comparable products.

**Prepared:** 2026-09-26. Note: you are already inside the stated launch window. Treat every grant deadline, accelerator batch date and external benchmark below as needing a final re-check on the official page before you submit — programs move without notice.

---

## 0. Verdict (30-second read)

**GO. Keep the name.** "Simultaneity Index" — and the category line *crowding intelligence for builders and agents* — is the strongest single asset in the repository. Do not rebrand to something generic like ValidateAI, IdeaProof or DimeADozen copycat. You are not building another AI idea validator; you are building the supply-side simultaneity detector for the agentic-coding era. The AI Council verdict captured in docs/COUNCIL_VERDICT.md was directionally right, but it under-weighted three things this playbook fixes: the demand-side blind spot, the retention gap, and the B2B revenue wedge.

The three changes that unlock the 100×, in priority order:

1. **Fix accuracy and close the demand blind spot (weeks 1–3).** Keyword-only matching produces false positives/negatives ("AI code review agent" != "automated PR reviewer"), and a pure supply-side score cannot tell an *open lane* from a *dead lane nobody wants*. Add semantic query expansion + near-duplicate deduplication, plus two or three cheap demand adapters (Product Hunt launches, Reddit discussions, Indie Hackers builds). Collapse everything into a new **2D Supply × Demand matrix** with four quadrants: Blue Ocean (low supply, rising demand), Gold Rush (high supply, high demand), Ghost Town (low supply, no demand), Bloodbath (high supply, falling demand). This single output becomes your marketing hook and your defensibility story. Competitors show a score; you show the battlefield geometry.

2. **Add a retention surface (weeks 3–6).** Stateless scans are one-and-done — there is currently nothing that brings a user back except raw utility. Free magic-link accounts give scan history, watchlists ("notify me when this lane's crowding moves 20 points"), and a public weekly **Simultaneity Pulse** page. Habit formation, long-tail SEO and shareability in one feature.

3. **Monetize the B2B wedge first (months 2–4).** Individual founders pay little; funds and accelerators pay a lot. Sell **cohort screening** — screen 200–500 applicant ideas per batch, flag collisions, rank novelty, deliver a white-label brief — at $2,000–$10,000 per year contracts. Twenty customers is $40K–$200K ARR with near-zero marginal cost and it gives you enterprise logos before you raise. The MCP/agent-native play (`crowding.check(query)` as the pre-scaffold tool) remains the decade-scale distribution bet.

**Funding + launch mix for this window:**

- Non-dilutive: **NLnet Foundation** — €5,000–€50,000, next deadline **3 November 2026, 12:00 CET** (deadlines fall on the first day of every even-numbered month). Angle: open, verifiable, agent-readable market-intelligence infrastructure under an MIT licence. Also monitor Mozilla MOSS (currently closed — watch for reopen), Chan Zuckerberg Initiative EOSS (~$50K per grant, science-OSS fit only), and Germany/EU Sovereign Tech Fund (rolling investments in essential open-source components).
- VC (pre-seed): **OSS Capital** (the only early-stage VC dedicated exclusively to commercial open-source software, JJ Wiertz) as the top fit; then Boldstart Ventures (devtools pre-seed specialist, early in Snyk), Prospective Technologies VC ($100–500K checks, devtools/open-source), Golden Sparrow ($300–400K, idea-to-revenue, devtools/AI infra), Grayscale Ventures ($300K–$1M, leads, AI infra/devtools), Bek Ventures ($500K–$10M, devtools, CEE).
- Accelerators: **Y Combinator S28 batch** (deadline typically late December — build the metric story now), a16z Speedrun, Sequoia Arc, Alchemist Accelerator (for the B2B fund-screening wedge).
- Launch: Product Hunt (Tuesday, 12:01am PT) + Show HN (Wednesday 8:30–9am ET) the same week, backed by a pre-built email list, five case studies and a seeded supporter cohort.

**North-star metric:** weekly verified decision scans (a scan after which the user kills, pivots or doubles down) — not pageviews, not MAU. Keep the council's four kill criteria word-for-word; they are the reason this product survives instead of dissolving into generic validation soup.

---

## 1. What you actually built — honest audit

### 1.1 Identity

A Next.js 16 / React 19 stateless scanner that fans one idea phrase out to seven live sources (GitHub, Hacker News, arXiv, OpenAlex, npm, PyPI, Hugging Face) via `Promise.allSettled`, normalizes results through an adapter contract, computes a 0–100 heuristic crowding score (`0.65 × weighted mean + 0.35 × peak channel`, so one hot channel can't be diluted away), maps it to four verdict bands, attaches a confidence percentage and coverage fraction, generates evidence-grounded wedges, and exports a verifiable JSON evidence capsule. Roughly 1,000 lines of TypeScript. Adapter pattern. No database required for alpha. MIT licence.

### 1.2 Strengths — ship these forward untouched

| Strength | Why it matters in late 2026 |
|---|---|
| Live multi-source evidence, always URL-linked | Beats pure LLM validators that hallucinate competitors; buyers now reward source-linked claims over AI essays |
| Sharp single question | Category-defining focus versus bloated "AI co-founder" viability suites |
| Academic framing (simultaneous invention / idea twins) | Defensible narrative moat; press-friendly and researcher-friendly |
| Adapter architecture + graceful degradation | New sources cost hours not weeks; partial failure lowers confidence instead of fabricating data |
| Wedge engine v1 | Turns a demotivating number into action — genuinely rare in this category |
| Lightweight, serverless, deploys in minutes | Fast iteration cadence; near-zero burn |

### 1.3 Weaknesses — fix or die

| Weakness | Impact | Priority |
|---|---|---|
| Keyword-only matching | False positives/negatives; semantic clones missed. Single biggest accuracy risk. | P0 |
| Scoring never calibrated against a gold set | Score feels arbitrary; hard to trust or pitch to skeptical funds | P0 |
| Pure supply-side: zero demand signal | Cannot separate "genuinely open" from "nobody wants this" — the number-one user-complaint risk | P0 |
| Recency windows arbitrary (18-month GitHub, 24-month academic) | Famous old repos decay incorrectly; stale launches over-count | P1 |
| Confidence = coverage × sub-score agreement | Garbage in, garbage agreement — weak statistical proxy | P1 |
| Unauthenticated GitHub in default deploy docs | Hits secondary rate limits in production → silently low confidence | P0 |
| Stateless: no history, watchlist or alerts | No retention hook; one-and-done usage | P1 |
| Generic wedge templates | Same eight templates for every lane; not sharp enough to change decisions | P2 |
| `ignoreBuildErrors: true` plus a thin test suite | Ships broken types; scoring can regress unnoticed | P0 |
| No authority artifact | A scan is not yet something you'd staple into an investment-committee memo or grant application | P2 |

### 1.4 Kill criteria (keep these from ROADMAP.md verbatim — review day 90)

1. Gold-set ordinal accuracy < 60% versus expert ranking → pivot or stop.
2. No measurable decision-change in at least 15 user interviews → pivot or stop.
3. Scope drift into a generic validation suite → kill the offending features.
4. Reliability < 90% successful scans (at least 3 sources OK) → fix infrastructure before any growth spend.

Add one more: **fewer than 20% of weekly scanners return within 7 days** → the retention surface is missing and must become the next sprint.

---

## 2. Open-source leverage map — what to reuse, what to ignore

Full machine-readable detail lives in the companion file `LEVERAGE_MAP.csv`. The governing rule from your own LEVERAGE_REPOS.md still holds: absorb thin adapters and battle-tested primitives; never fork-and-forget; never rebuild what has a mature public API.

### 2.1 Agent orchestration — the decade distribution bet (MCP / agent-native)

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| aaif-goose/goose | 54,665 | MCP extension + custom distro pattern | goose ships desktop + CLI + API, speaks to 15+ model providers via ACP, and connects to **70+ extensions through the Model Context Protocol**. Build the `crowding.check(query)` MCP server against this exact contract, and ship a "founder distro" pre-wired with our scanner, a browser driver and citation tooling. This puts you inside an agent founders already run daily. |
| camel-ai/owl | 20,148 | Multi-agent role patterns; optional "council mode" backend | OWL is a general multi-agent collaboration framework with a Playwright MCP service and cron-style scheduling. Model your future multi-agent lane-dissection feature on its role/communication design. |
| camel-ai/camel | 17,775 | Role-based agents with stateful memory | Reference for the premium "council meeting on a crowded lane" report: specialist agents (competitor analyst, wedge finder, academic translator) debate over your evidence capsule. |
| FoundationAgents/OpenManus | 58,414 | CLI/API ergonomics benchmark | Too heavy to depend on; treat as a UX/codegen benchmark for CLI and API conventions. |
| OpenHands/OpenHands | 89,200 | Tool-registration conventions | Study how it registers and surfaces tools to agents; skim its queue/job subsystem. |

### 2.2 Browser automation — deep-source crawls (paid-tier signal)

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| browser-use/browser-use | 116,358 | Optional heavy-crawl worker | Agents that use the browser, MIT licence. Deploy behind the paid tier to extract live pricing, tech stack, hiring signals and team size from the top five competitor sites per lane — converts a free scan into a $49 intelligence brief. |
| Skyvern-AI/skyvern | 23,074 | Cache + scoring patterns | Playwright-compatible SDK with LLM + computer vision and built-in caching. Reuse its cache-key design for repeat crawls. Note: AGPL-3.0 — run as a separate service, do not link statically. |
| getmaxun/maxun | 17,568 | Structured extraction + partner-funding template | "Turn any website into a structured API." Notice its affiliate/proxy partnerships (Webshare, Byteful, Thordata, Mango, Nodemaven): a template for subsidising your crawl infra via complementary vendors instead of paying cash. |

### 2.3 RAG / OCR / documents — patents, grants, PDF parsing adapters

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| infiniflow/ragflow | 91,326 | Ingestion/parsing orchestration patterns | Leading OSS RAG engine. Study its pipeline when you add patent and grant PDFs as sources. Apache-2.0. |
| lumina-ai-inc/chunkr | 4,152 | Production PDF parsing — buy, don't build | Open-source AGPL document-intelligence API; the cloud runs proprietary models with higher accuracy. For the patents/grants adapter, call the hosted API rather than rebuilding OCR. Explicitly note the licence split (OSS != cloud). |
| allenai/olmocr | 19,661 | PDF linearisation for LLM consumption | AI2's toolkit for turning PDFs into LLM-ready text. Reference implementation if you later self-host patent parsing. |
| paperless-ngx/paperless-ngx | 46,039 | Cron-queued document processing | Document management system with scheduled consumption queues — the pattern for a background ingestion pipeline. GPL-3.0. |

### 2.4 Dev sandboxes — safe execution and evaluation

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| daytonaio/daytona | 71,715 | Ephemeral sandbox runtime | Secure, elastic sandbox infrastructure: isolated "full composable computers" that spin up in under 90ms. Reuse if you add a premium "evaluate this repo safely" capability (clone, run its tests, measure real activity signals). |
| devspace-sh/devspace | 5,192 | Dev-environment orchestration | Lighter alternative; read for workflow patterns only. |

### 2.5 Security / scanning — the "trust score" premium signal

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| github/codeql | 10,127 | Packaged static-analysis queries | The standard CodeQL libraries and queries. Package queries that flag secrets and unsafe patterns in candidate repos → a maintenance/hygiene score layered onto crowding. MIT. |
| returntocorp/semgrep | n/a (metadata incomplete) | Fast pattern-based scanning | Same angle: lightweight rules to assess code quality of competing repos. Verify licence (LGPL/GPL family) before integrating. |
| gitleaks/gitleaks | 29,492 | Secret detection as a signal | Go CLI for finding leaked secrets in git history → a lane-hygiene indicator in the evidence sidebar. MIT. |

### 2.6 Testing / reliability — eat your own dogfood

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| grafana/k6 | 31,612 | Load-test your adapters | Go engine with JavaScript scripts and Grafana integration. Write k6 scenarios that hammer each adapter; put "≥90% success under N req/s" in CI as a gate, because reliability < 90% is an explicit kill criterion. AGPL-3.0. |
| vitest / node:test | — | Already your stack | Extend the existing scoring and adapter contract tests to include a regression gold set (see P0 below). |

### 2.7 UI / builders — internal tools at speed

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| refinedev/refine | 35,729 | Ops/admin dashboard for calibration | React meta-framework for CRUD-heavy internal tools. Build the calibration/admin panel (flag wrong scans, tune source weights, manage beta users, view funnels) in days not weeks. MIT. |
| colinhacks/zod | 44,019 | Schema validation at adapter boundaries | You already depend on schema validation. Extend it to every adapter response so a upstream API change fails loudly at the boundary instead of corrupting the score. |
| wasp-lang/open-saas | 16,015 | Billing + auth boilerplate | Free modern JS SaaS starter (React + Node, built-in cron jobs, Product Hunt badge examples embedded). Consider as the shell once you add Stripe billing, magic-link auth and background jobs. |

### 2.8 Distribution / ecosystem

| Repo | Stars | Reuse target | Concrete action |
|---|---:|---|---|
| screenpipe/screenpipe | 21,715 | MCP-skill publishing + installer pattern | Ships an MCP server and a skills installer that injects config into "every supported agent" on the machine. Replicate that installer pattern so the Simultaneity Index MCP tool lands inside Cursor, Claude Desktop, Windsurf and Goose automatically. |
| posthog/posthog | — | Self-hosted product analytics | Track the scan→decision funnel without vendor lock-in; self-host to match the privacy posture your developer audience expects. |

### 2.9 Explicitly do NOT leverage as core

- Full multi-agent frameworks as the scan engine (heavy, slow, wrong job).
- Scrapers that violate Terms of Service as the primary path (legal exposure and perpetual breakage).
- Closed datasets such as CB Insights (cost and lock-in without defensibility).
- Heavy vector databases until a corpus product genuinely exists.
- AppSumo-style unlimited lifetime usage (usage scales with users → negative unit economics for a data-heavy tool).

---

## 3. The 100× product roadmap — concrete, code-aware

### P0a — Trust and accuracy (weeks 1–3)

**P0-1 Semantic expansion + near-duplicate dedup.** Keyword matching is your biggest accuracy leak. Add a lightweight embedding pass (sentence-transformers `all-MiniLM-L6-v2` via ONNX runtime for a cold local model, or the free tier of Hugging Face Inference API) that: (a) expands the query with related terms pulled from OpenAlex concepts and npm/PyPI keyword fields before fanning out to sources; (b) clusters returned evidence items by cosine similarity and labels near-clones as "semantic duplicates" instead of counting them three times. Keep it behind a flag so the fast path stays fast. This alone can raise perceived accuracy two to three times and gives you a story VCs understand.

**P0-2 Traction-weighted scoring.** Replace the naive additive formulas with decaying velocity signals. Concretely in `lib/scoring/score.ts`: GitHub signal becomes a function of `stars × recency-decay × push-recency`; Hacker News becomes points-per-day velocity not raw points; HF/npm/PyPI become download velocity over 30/90 days; arXiv/OpenAlex weight by citation velocity and venue tier. Publish the exact formula on the methodology page — radical transparency converts sceptics into advocates.

**P0-3 Gold-set calibration harness.** Build a fixture of 40–60 known lanes (e.g. "AI code review agent" = crowded, "local-first AI agent OS" = early movers, plus deliberately obscure ideas = open) with expert ordinal rankings. Add a `pnpm calibrate` script that scores the set, reports ordinal accuracy and per-source drift, and gates CI. Your council set a kill line at 60%; ship when you're at 70%+ and display "Calibrated to X% ordinal accuracy vs expert ranking" as a trust badge next to every score. This is marketing copy that no ValidatorAI clone can match.

**P0-4 Authenticated GitHub by default + build hygiene.** Remove `ignoreBuildErrors`, enforce TypeScript strictness in CI, expand tests so `pnpm verify` covers adapters + scoring + calibration. Surface a visible warning when a source ran unauthenticated or rate-limited.

### P0b — Demand-side signal and the 2D matrix (weeks 2–4)

Your score currently answers "how many are building" but not "does anyone want this." Add three low-friction adapters:

| Adapter | Signal | Implementation note |
|---|---|---|
| Product Hunt | Launch density, upvote velocity, comment heat | Public API v2 / GraphQL with app token; top launches per week carry most weight. |
| Reddit | Discussion volume, sentiment direction | Search via official JSON endpoints (careful ToS) or a search-proxy; weight r/SaaS, r/startups, r/programming. |
| Indie Hackers | Founder-build chatter | Light scrape or RSS where available; lower weight, zero cost. |

Then replace the single verdict band with the **Crowding Matrix**: supply crowding (your existing seven sources) on the X axis, demand heat (the three new sources) on the Y axis, producing four named quadrants:

| Quadrant | Meaning | Default advice |
|---|---|---|
| Blue Ocean | Low supply, rising demand | Move fast — collect proof of demand before the simultaneous wave arrives. |
| Gold Rush | High supply, high demand | Compete only on a non-copyable asset: distribution, workflow depth, data or ICP focus. |
| Ghost Town | Low supply, no demand | Danger zone: probably nobody wants this. Validate pain before writing code. |
| Bloodbath | High supply, falling demand | Kill or reframe hard; undifferentiated entry is a time sink. |

This reframes your entire product from "scary number" to "decision geometry" and gives you the cleanest demo in the category: one scan, four outcomes, each with a different action. It also quietly answers the deepest objection to pure-crowding tools: that empty means unloved, not novel.

### P1 — Retention, virality and distribution surface (weeks 3–6)

**P1-1 Accounts (magic link, no social OAuth).** History, watchlists, alerts. Postgres or even SQLite at first — you do not need complexity. A user who watches five lanes returns weekly; a stateless user never comes back.

**P1-2 Shareable result pages + OG cards.** `/s/<id>` pages with a static OG image: "Crowding 73 — Crowded — 7 live sources — 2 wedges". Every shared scan is a landing page that itself offers an instant rescan. Add UTM capture and a "related lanes" module below the evidence.

**P1-3 Weekly Simultaneity Pulse.** A public page ranking the most-simultaneous idea phrases of the week (aggregate and anonymised — never expose private queries by default; make opt-in explicit with a clear value exchange). Academics cite it; builders share their rank; press writes about it; Google indexes hundreds of long-tail pages. This is your compounding SEO engine and costs almost nothing given caching.

**P1-4 MCP server + agent examples.** `crowding.check(query)` exposing the full capsule. Publish to Smithery, MCP.so and glama directories; ship ready-made examples for Cursor (tools.md), Claude Desktop (mcp.json), Windsurf, and a goose distro. Every agent scaffold asking "is this crowded?" before writing code is a distribution node you do not have to pay for.

**P1-5 Weekly "lane just got crowded" email alerts.** The single strongest retention hook: users save lanes, you re-scan weekly, and a one-line email says "your lane moved 72 → 84, two new 50+-star repos appeared." This is why watchlists exist.

### P2 — Moat and monetisation features (months 2–4)

**P2-1 Deep intel brief ($49/report, automated).** Trigger browser-use/Skyvern crawls on the top competitors: extract pricing pages, tech stack, team/hiring signals, last release cadence. Assemble a three-page PDF with charts. Human-in-the-loop optional at first.

**P2-2 Patents + grants landscape adapter.** PatentsView public API (free) + USPTO ODP for true invention multiples; chunkr/olmocr for PDF parsing. Position for research-commercialisation offices and SBIR applicants.

**P2-3 Cohort screening dashboard (B2B).** Upload 300 applicant one-liners → collision map, novelty ranking, shortlist. White-label report with the fund's logo. This is the feature that funds $5K–$10K/year contracts on.

**P2-4 API tiers.** Free: 100 scans/month. Pro API: $99/month for 5,000 calls. Team: custom for cohort screening. Documented OpenAPI spec, versioned, with a public status page.

### What to deliberately NOT build (scope-kill list)

Full financial modelling, auto-generated pitch decks, social auth/teams/SSO, private-data scraping, replacing customer interviews, becoming a full viability suite. When a user needs those, link out to partners (Preuve for interviews, patent attorneys for IP). Integration beats imitation.

---

## 4. Website overhaul — the pre-launch conversion rebuild

The current homepage is clean and on-brand but reads like a promise. In late-2026 devtools, proof above the fold beats prose. Rebuild the landing experience in this order:

### 4.1 Above-the-fold changes

1. **Show a live result, not a promise.** Auto-run one exemplar scan on page load (e.g. "AI code review agent") so the first paint within three seconds shows a real score, pulsing source chips and evidence. Let visitors type over it immediately. Proof before input.

2. **Instrument-panel social proof.** Below the "7 live sources" badge, add a live counter: "N ideas scanned this week · M builders returned within 7 days". Once you have beta users, add logos/names of accelerators, university labs or known builders (with permission). Never fake these.

3. **Clickable source status chips.** Replace the static "7 live sources" text with chips showing each ecosystem, what it checks in one line, and a green/red status dot from the last health check (`/api/health`). The instrument-panel aesthetic you already have is exactly right — push it further.

4. **60-second demo video next to the hero.** Devtool buyers watch before they type. A silent, captioned Loom walking one scan end-to-end lifts conversion materially.

5. **Two CTAs, not one.** Primary: "Scan your idea — free, no login". Secondary: "Get the weekly Pulse" (email capture). The secondary builds your launch list from day one.

### 4.2 Trust architecture

- **FAQ that pre-empts objections** (each answer links to methodology): "Is this legal and ToS-compliant?", "Why trust a heuristic instead of an analyst?", "How is this different from ValidatorAI / Preuve?", "What does 'open lane' actually mean?", "Do you store my queries?".
- **Methodology page that publishes the formula**, the gold-set accuracy number, known false-positive classes, and the exact rate-limit/coverage behaviour. Link it from every score card.
- **Changelog + public roadmap** (build in public → trust + a reason to return).
- **"Not investment advice; not a legal novelty opinion" disclaimer remains visible** — keep the honest tone, it differentiates you from hype-bro validators.

### 4.3 Funnel pages

- **Pricing page** (see section 5) — even pre-launch, show it. It forces you to decide who pays.
- **Programmatic SEO pages:** `/crowding/<slug>` for the top 200 searched lanes, each a cached live result with unique title/meta, refreshed weekly. "crowding of AI code review agent" starts ranking while you sleep. Near-zero marginal cost given your cache.
- **Case-study page:** five short stories, each with a before/after decision: "This scan killed my weekend build", "This scan found my wedge → shipped → $X MRR", "How an accelerator screens 300 applications in 20 minutes". Real ones; start collecting them in week 1 of beta.
- **For funds & accelerators page:** the B2B wedge — cohort screening, white-label briefs, API, security posture. With a "Book a cohort pilot" CTA and named pilot customers as soon as you have one.

### 4.4 Shared-card landing experience

Anyone arriving from a shared `/s/<id>` card must land on (a) the full result, (b) a giant rescan button with related-query suggestions, and (c) the weekly-Pulse email capture. Do not waste shared traffic on a generic homepage.

---

## 5. Monetisation and pricing — how to earn maximum at launch

### 5.1 Pricing architecture (launch configuration)

| Tier | Price | What's inside | Target |
|---|---:|---|---|
| Free | $0 | 3 scans/day, all 7 sources (+ demand adapters when live), JSON capsule, method visibility | Every builder; top of funnel |
| Pro | $19/month or $189/year | Unlimited scans, 2D Crowding Matrix, watchlists + alerts, compare up to 5 lanes, PDF one-pager export, weekly history |
| Team / API | $99/month (5,000 API calls) then usage | Everything in Pro + API access, webhook alerts, SSO on request |
| Intelligence Brief | $49/report (à la carte, no subscription) | Deep crawl of top competitors: pricing, stack, hiring, traction signals |
| Cohort Screening | $2,000–$10,000/year | White-label batch screening of 200–500 applications, collision map, novelty ranking, quarterly tune | Accelerators, pre-seed funds, corporate venture |

**Launch pricing tactic:** grandfather the first 500 Pro subscribers at **40% off annual forever**. This creates urgency ("charter rate") without the valuation-killing mess of unlimited lifetime deals. AppSumo-style lifetime deals are explicitly NOT recommended: your API costs scale with usage, bargain-hunter users churn hard, and recurring ARR is what raises your pre-seed multiple. If you want a cash burst, cap the charter at 500 seats and close it publicly.

Why this mix maximises launch earnings:

- The à la carte $49 brief monetises curiosity without a paywall on the core scanner (so virality stays intact).
- Cohort screening contracts signed at launch ($2K–$10K each, 5–10 pilots) give you $10K–$100K in committed ARR before you ask VCs for money — and enterprise logos change the fundraising conversation entirely.
- Annual-first with monthly escape hatch improves cash flow and retention; the grandfather discount converts fence-sitters on launch week.

### 5.2 Launch-week revenue plays

1. **Cohort pilot outreach (start 3 weeks pre-launch):** pitch 30 accelerators/pre-seed funds with a free mini-screening of their last cohort. Close 5–10 pilots at $2K each for year-one. Template offer: "Send me 50 applicant one-liners; I'll return a collision map in 48 hours, free."
2. **Charter Pro wave:** email the waitlist 24 hours before Product Hunt with the grandfather link. Goal: 200–500 annual charters × ~$120 = $24K–$60K collected in launch week.
3. **Affiliate programme (performance-based distribution):** 30% recurring commission for creators/newsletters referring Pro. Zero upfront cost, scales with results. Recruit indie-dev YouTubers and Substack writers whose audiences are exactly your ICP.
4. **Avoid:** paid ads at launch (you lack the conversion data), AppSumo (unit economics), and enterprise custom builds (distraction).

### 5.3 The raise narrative (when you fundraise)

"We own the pre-flight layer for agentic software development. Building is free; the question became 'is the lane already full of simultaneous builders?' We fuse seven live ecosystems with calibrated scoring into the only supply-side crowding graph no single platform (GitHub, Hugging Face, arXiv) can replicate. Land with the free scanner; expand through Pro API usage and intelligence briefs; anchor with fund/accelerator cohort contracts. Every free scan improves the embedding clusters that make us more accurate than any point-source competitor — the classic bottoms-up data flywheel."

Key metrics to have by the time you pitch: weekly decision scans, 7-day return rate, gold-set accuracy %, number of paying funds/accelerators, and scans processed per dollar of infra. Those five numbers de-risk the round.

---

## 6. Non-dilutive funding — apply in this order

Re-verify every amount, deadline and eligibility on the official page before submitting. Programmes move without notice.

| Programme | Amount | Deadline / cadence | Fit for Simultaneity Index | Action before launch |
|---|---:|---|---|---|
| **NLnet Foundation** (Netherlands) | €5,000–€50,000 | First day of every even-numbered month; next confirmed deadline **3 Nov 2026, 12:00 CET** | Strong. NLnet funds open, standards-based internet infrastructure. MIT licence qualifies; your open evidence-capsule format + public MCP spec is a clean fit. Frame as "verifiable, agent-readable market-intelligence infrastructure that counters AI hallucination in founder decisions." | Submit before 3 Nov 2026. Lead with the open protocol, not the SaaS. |
| **Mozilla Foundation / MOSS** (USA, global projects) | Historically $5K–$300K+ | Currently closed — monitor reopen | Medium-good. Mission alignment around a healthy internet and countering opaque AI claims. | Add to CRM with a monthly check; when it reopens, lead with "transparency tooling against hallucinated market claims." |
| **Chan Zuckerberg Initiative — EOSS** (USA) | Up to ~$50K per grant | Cycle-based; watch for calls | Weak unless repositioned. EOSS funds software essential to scientific research. Viable only if you build the academic idea-twin export format and partner with a strategy scholar. | Optional: build the research export (section 3 P2) and co-author a methods note with an academic; then apply. |
| **Sovereign Tech Fund** (Germany/EU) | Rolling, case-by-case (often €100K+) | Open / rolling | Good for the core OSS components. Invests globally in open software components underpinning European competitiveness. Strongest if you have an EU entity or partner. | Prepare a component-level proposal (the adapter framework + capsule spec as essential OSS infrastructure). |
| **SBIR / STTR** (US agencies: NSF, DOE, NASA, NIH, EPA, USDA NIFA, NOAA) | Phase I typically ~$50K–$275K | Agency-specific rolling windows | Stretch. Requires framing as dual-use tech-forecasting / duplicate-R&D detection for agency innovation pipelines ("automated detection of redundant R&D and emerging technology races"). Only if US-incorporated and willing to write a real proposal. | If US-based, map one topic per quarter; NSF Small Business is the broadest entry point. Do not let this distract from the launch. |
| **GitCoin Grants rounds** | Community-matched, typically $1K–$50K equivalent | Quarterly rounds | Visibility more than money. Quadratic-funding exposure to the OSS/crypto-builder audience. | Participate once for awareness; do not rely on proceeds. |
| **Google Summer of Code / Outreachy** | Contributor stipends paid by programme | Annual cycles | Talent pipeline, not revenue. Funds contributors to harden adapters/tests. | List 4–6 well-scoped issues for GSoC 2027; cheap way to grow committers. |

Also set up **GitHub Sponsors** and **Open Collective** for the open scanner itself. Realistic outcome at meaningful popularity: $500–$5,000/month in community support — helpful infra offset, not a funding strategy.

### The Polsia signal — what the market is rewarding right now

Polsia (founder Ben Cera, Paris) raised **$30M at a $250M valuation in May 2026 with zero employees**, reporting roughly $10M ARR run rate at 14 months. Investors: Sound Ventures, True Ventures, Offline Ventures, Adjacent, Tekton Ventures, Drysdale Ventures, Vaynerfund plus angels. The company runs business operations autonomously and even ran much of the fundraise itself via a live public dashboard on X. Why this matters to you: investors are actively paying premium valuations for solo/AI-native companies that (a) show a live public metric, (b) grow with almost no headcount, and (c) have a crisp category story. Your weekly public Simultaneity Pulse is exactly that kind of asset — treat it as a fundraising instrument, not just content.

---

## 7. Venture targets — pre-seed, fit-ranked

Raise $750K–$1.5M on seed traction (or a larger round if the cohort-screening pipeline converts fast). The list below is ordered by strategic fit, with verified check sizes and the angle that wins each.

| Fund | Check size | Why they're a fit | Your angle |
|---|---:|---|---|
| **OSS Capital** | Early-stage COSS, global | The only early-stage VC dedicated exclusively to commercial open-source software since 2018 (JJ Wiertz). This is your top-fit fund — category creation under an MIT licence with a usage-based API is precisely their thesis. | "We're building the default crowding layer for the agentic stack — COSS, open protocol, proprietary fused dataset." |
| **Boldstart Ventures** | Pre-seed/seed devtools | Devtools specialist, bottoms-up PLG pattern-matching; early in Snyk. | Free scanner → Pro API flywheel; developer-led growth metrics. |
| **Prospective Technologies VC** | $100K–$500K | Explicitly invests in devtools, SDLC, no-code and open-source at prototype/early-revenue stage. | Check-friendly first institutional money. |
| **Golden Sparrow** | $300K–$400K | DevTools / AI infra / DeepTech, idea-to-early-revenue, global network. | Solo-founder, agent-native story. |
| **Grayscale Ventures** | $300K–$1M (leads) | AI infra + devtools, India–US cross-border, willing at idea stage. | Lead candidate for a pre-seed you control. |
| **Bek Ventures** | $500K–$10M | AI, devtools, infrastructure software; Central/Eastern Europe focus. | If you have CEE ties or incorporate there. |
| **RTP Global** | $1M–$15M | Needs early revenue ($300K–$1M+ ARR); devtools/infra/AI. | Approach once cohort screening is paying. |
| **OpenVC platform investors** | Various | 800+ devtools pre-seed investors catalogued on Signal NFX; searchable, warm-intro friendly. | Build a 50-fund pipeline on OpenVC; track every intro. |
| **a16z Infra / a16z Speedrun** | Speedrun = accelerator | a16z Infra backs the infrastructure layer beneath AI's computing shift; Speedrun is the founder programme. | "Pre-flight infra for agentic coding." |
| **Sequoia Arc** | Accelerator | Founder programme with mentorship and follow-on path. | Apply in parallel with YC. |
| **Alchemist Accelerator** | B2B focus | 6-month B2B/enterprise accelerator — the right home for the fund/accelerator screening wedge. | Lead with cohort-screening contracts as proof of B2B pull. |
| **TinySeed** | Revenue-based | Bootstrapper-friendly, remote-first. | Fallback if you want to stay equity-light while growing ARR. |
| **Y Combinator (S28)** | Standard terms ($125K for 7% + $375K on MFN) | The strongest brand for devtool GTM; funded GitHub, Stripe, Vercel; 481 devtools companies in their directory. Deadline typically late December for the S batch — prepare now. | Metric story: weekly decision scans, 7-day return rate, gold-set accuracy, paying funds. Apply as a solo founder with public traction (Pulse page + case studies). |

Fundraising collateral to prepare in October:

1. One-page memo with the 2D matrix visual and three example scans.
2. Live deck: problem (shipping is free, crowding is the risk), why now (agents scaffold in seconds), solution demo video, traction slide, business model, go-to-market, ask.
3. Data room: calibration methodology + gold-set results, 12-month roadmap, security/ToS compliance summary, pipeline of cohort pilots.
4. A running public changelog so diligence can see velocity.

---

## 8. Launch plan for September–October 2026

You are already inside the window. Assume a four-week runway to a Tuesday Product Hunt + Wednesday Show HN double-launch.

### 8.1 Benchmarks that anchor the plan (all researched, verify before acting)

- **Product Hunt:** Tuesday carries the highest average upvotes; launch day resets at 12:01am PT, so schedule your campaign for then. Data analyses of PH launches consistently show Tuesday outperforming other weekdays.
- **Show HN:** A post at 9am ET needs its first ~15–20 organic upvotes by about 9:30am ET to break onto the front page while the score is young. Best days: Tuesday–Thursday, 7–9am ET.
- **Reality check:** one analysis of 500 SaaS Product Hunt launches found roughly 487 effectively "dead" afterwards — a launch burst without pre-built audience, retention or monetisation produces upvotes not revenue. opensaas.sh launched six times on PH, won #1 and #5 product-of-the-day awards and accumulated 2,000+ upvotes; the difference was repeat launches plus real follow-through. Treat launch as day zero of distribution, not the goal.
- **Comparable pricing anchor:** Preuve AI charges $29 one-time for an 18-section validation report and $499 for an Investor Package — useful reference for à la carte willingness-to-pay, but note they sell static reports while you sell live intelligence.

### 8.2 Four weeks out (week -4 → -1)

| Week | Actions |
|---|---|
| -4 | Lock the 2D matrix + semantic-dedup P0 work. Open the waitlist page with the weekly-Pulse lead magnet. Start posting one Pulse-style insight per week on X/LinkedIn (e.g. "the most simultaneous idea phrases this week"). |
| -3 | Recruit 20 beta users from r/SaaS, Indie Hackers build-in-public threads, YC co-founder matching, and two university entrepreneurship clubs (Stanford MS&E, MIT Media Lab / Sloan). Give each a personal API key and ask for one decision-changed testimonial. Seed 30–50 micro-influencers (5K–50K followers in indie-dev/AI) with personalised outreach: "I ran your current idea through the scanner — here's your card, no ask." |
| -2 | Write 5 case studies (kill/wedge/double-down). Build the pricing, changelog, FAQ, methodology and For Funds pages. Record the 60-second demo. Prepare OG images and 10 social posts. Draft the Product Hunt listing (tagline, thumbnail, maker comment telling the solo-founder + idea-twins story). |
| -1 | Submit Product Hunt (review takes up to a week — do this early). Line up newsletter placements: Ben's Bites, TLDR, Hacker Newsletter, Starter Story, The Rundown AI, Superhuman ecosystem newsletters. Confirm 100+ supporters ready to vote/comment in the first two hours (hidden-upvote window). Build the charter discount link. |

### 8.3 Launch week

**Tuesday 12:01am PT — Product Hunt.** Pin the maker comment with the story. Reply to every single comment same-day. Post the link to your email list at 9am PT. Tweet the five most surprising scans as a thread. Update the homepage banner to "Today on Product Hunt — your support decides whether we stay free."

**Wednesday 8:30am ET — Show HN.** Title: "Show HN: Simultaneity Index – live crowding radar across GitHub, HN, arXiv, npm, PyPI, HF and OpenAlex". Lead with the honest technical postmortem (what broke, what the calibration taught you) — HN rewards craft and humility more than polish. Be present in the comments all morning.

**Wednesday–Friday — community cascade.** Indie Hackers launch post with milestone revenue/user numbers. Reddit: r/SaaS and r/indiehacker (value-first posts with screenshots and learnings; respect each sub's self-promo rules), r/programming only if framed as a technical write-up. LinkedIn founder post tagging builders featured in case studies.

**Weekend — follow-up.** Thank-you post with the final numbers. Email the waitlist the launch recap + charter offer (still live for 72 hours).

### 8.4 After launch (weeks +1 to +8)

- Publish the **Simultaneity Pulse** every Monday — non-negotiable content engine.
- One **Lane of the Week** deep-dive article (dissect one crowded lane: who's building, where the wedge hides).
- Apply to the **Product Hunt Golden Kitty Awards** (devtools category; nomination windows typically open October — submit early).
- Get listed on BetaList and relevant AI/devtool directories (There's An AI For That, FutureTools, tool aggregates). Low effort, compounding long-tail.
- Convert the best 10 beta users into the first cohort pilots with a direct calendar ask.

### 8.5 Where to launch — priority order

1. Product Hunt (primary devtool audience; Golden Kitty path).
2. Show HN (highest-quality builder word-of-mouth).
3. Indie Hackers + r/SaaS + r/indiehacker (founder ICP directly).
4. X/Twitter builder community + LinkedIn (founders, VCs, accelerators; Polsia-style public dashboard narrative).
5. Newsletters: Ben's Bites, TLDR, Hacker Newsletter, Starter Story, The Rundown AI.
6. Direct B2B: 100 accelerators/pre-seed funds with the free mini-screening offer.
7. MCP/tool directories: Smithery, MCP.so, glama (agent distribution).
8. Explicitly skip: AppSumo (usage-cost economics), generic paid ads pre-data.

---

## 9. Permutations, moats and upside paths

### 9.1 The data flywheel (your real moat)

Free scans → anonymised query→evidence graph (opt-in by default, explicit value exchange: "let us use your scan to improve scores") → better semantic clustering and calibration → sharper scores and wedges → more users and more trust. The defensible asset is not any single API you call (anyone can hit GitHub or arXiv); it is the **fused, calibrated, timestamped cross-ecosystem graph of what the world is building**, which no single ecosystem holder can replicate because they only see their own walled garden. Articulate this in every investor conversation.

### 9.2 "Crowding Index" as a published metric

Become the NPS or credit-score of startup lanes: media cites "the Simultaneity Index for agentic coding hit 94 this month", academics cite your Pulse in papers on simultaneous invention, and funds reference it in memos. Owning the metric name is a brand moat competitors cannot buy. Publish a monthly methodology note and invite replication — confidence beats defensiveness.

### 9.3 Agent infrastructure (the decade bet)

- Now: MCP server + `crowding.check(query)` + examples for Cursor, Claude Desktop, Windsurf, goose distro.
- Next: a pre-commit / CI hook that verifies novelty claims in READMEs ("this repo claims to be first — run simidx verify").
- Then: LangChain / LlamaIndex callbacks and an OpenHands skill, so agent frameworks bake you into the scaffold path. Whoever becomes the default pre-flight crowding check owns a new layer of the builder stack — "linters for market reality", exactly as the council framed it.

### 9.4 B2B wedge — fund and accelerator cohort screening

This is the fastest path to serious revenue. Accelerators and pre-seed funds screen hundreds of applicant one-liners manually; collisions go unnoticed; novelty is guessed. Your batch API ranks 300 ideas in minutes with a collision map and a white-label brief they can circulate internally. $2K–$10K/year contracts. Twenty customers = $40K–$200K ARR at near-zero marginal cost, plus the enterprise logos that make your seed round trivial. Start selling this three weeks before launch (free mini-screen in exchange for a public testimonial).

### 9.5 Academic / research track

Formalise the idea-twin harvesting toolkit for strategy scholars: export scans in Bikard-compatible format, publish a methods paper with a professor, release the gold set as open data. Revenue here is small but the credibility, press ("MIT study uses Simultaneity Index to map parallel invention") and CZI EOSS eligibility are disproportionate. Low cost; run it in parallel.

### 9.6 Endgame options (write these down so you choose deliberately later)

| Path | Likely acquirer / outcome | Notes |
|---|---|---|
| Bolt-on acquisition | GitHub (Copilot Insights), GitLab, JetBrains, Replit | You are the "market-reality layer" for AI coding assistants. |
| Data acquisition | PitchBook, CB Insights, Crunchbase, Gartner | They lack real-time builder-side signal; your fused graph fills the gap. |
| Independent profitable company | Cash-flow positive at ~$50K MRR | TinySeed/revenue-based path; no dilution. |
| Strategic partnership | Exa/Firecrawl/Tavily as bundled intelligence source | Co-sell; lower ceiling but fast. |
| Token/protocol play | Not recommended | Distracts from the B2B narrative, reputational cost with enterprise buyers, adds regulatory surface. Skip unless your thesis fundamentally shifts. |

---

## 10. Premortem — how this fails, and the specific prevention for each failure mode

| Failure mode | Why it happens | Prevention (concrete) |
|---|---|---|
| **Accuracy distrust** — scores look wrong, users never return | Keyword false positives; uncalibrated weights; stale evidence | Publish gold-set accuracy % on every result; show confidence prominently; add a "this scan looks wrong" flag that feeds a human-reviewed correction queue (→ training data); re-run top-50 queries nightly with deep verification. |
| **Category confusion** — mistaken for another ValidatorAI clone, ignored | The validation category is noisy and buyers are fatigued | Ruthless messaging: headline = "Who is already inventing your idea?", subhead = "Not validation — crowding. We don't tell you if it's good; we tell you who's already building it." Lead every demo with the 2D matrix visual, which no clone has. |
| **Rate limits / reliability collapse in production** | Unauthenticated GitHub + seven parallel upstream calls per scan | Auth tokens by default; Redis cache keyed on normalized query hash (TTL 6–24h); background re-validation so popular queries stay fresh; graceful degradation that lowers confidence instead of returning garbage; k6 load gate in CI (kill criterion: <90% success). |
| **No retention** — one-and-done scans | Stateless by design; nothing to come back to | Watchlists + lane-change alerts + account history + Monday Pulse (P1, non-negotiable). Measure 7-day return; if <20%, it becomes the next all-hands priority. |
| **API/embedding cost blowout at scale** | Per-request embeddings + uncached crawls | Cache aggressively; compute embeddings nightly for popular queries, not per-request; tiered rate limits; bring-your-own-API-key option for heavy users. |
| **Legal / ToS breakage** | Aggressive scraping of ecosystems | Official APIs only for the free tier; published ToS-compliance summary; optional user-provided keys for heavy crawling; legal review before the deep-crawl brief ships. |
| **Scope creep into generic validation suite** | "Just one more feature" syndrome | The kill list stays pinned in the repo README; every new feature must answer "does this change a kill/wedge/double-down decision?" If not, it does not ship — partner/integrate out instead. |
| **Launch flop — no traffic, upvotes but no trials** | No pre-built audience; launch treated as the goal | Build the email list for 4 weeks first; personalise 50 influencer outreaches with their own scan card; five real case studies; launch on two channels the same week; affiliate programme live on day one. |
| **Wrong revenue model** — lifetime deals drown unit economics | Bargain users + usage that scales per scan | No AppSumo; charter annual discount capped at 500 seats; à la carte briefs and B2B contracts carry the margin. |
| **Founder runs out of runway / motivation** | Solo build, slow monetisation | Week-3 revenue target: 5 cohort pilots at $2K or $10K committed. Cash + logos fund the next six months and de-risk the raise. |

The single point of maximum leverage: **accuracy trust.** Everything else compounds from users believing the number. Invest disproportionally in P0 calibration and transparency.

---

## 11. The 90-day action calendar (from today, 2026-09-26)

### Weeks 1–2 (by Oct 10)
- Ship P0-1 semantic expansion/dedup behind a flag; P0-4 auth-by-default + remove `ignoreBuildErrors`; extend adapter + scoring tests.
- Open waitlist + Pulse lead magnet; post first two Pulse insights on X/LinkedIn.
- Recruit 20 beta users; give API keys; request one decision-changed testimonial each.
- Draft NLnet proposal; submit before 3 Nov 2026.
- Build pricing, FAQ, methodology, For Funds pages; record 60-second demo.

### Weeks 3–4 (by Oct 24)
- Ship P0-2 demand adapters (Product Hunt minimum viable; Reddit/Indie Hackers if ToS-clean) + the 2D Crowding Matrix UI.
- Ship P0-3 gold-set calibration harness; publish accuracy badge.
- Finalise Product Hunt submission and newsletter placements.
- Send 30 accelerator/fund pilot pitches with free mini-screen offer.
- Seed 50 influencers with personalised scan cards.

### Weeks 5–6 (by Nov 7)
- Launch week: Product Hunt Tuesday 12:01am PT + Show HN Wednesday 8:30am ET + community cascade.
- Charter annual Pro wave to waitlist (40% off, first 500).
- Affiliate programme live.
- Close 5–10 cohort pilots at $2K each.

### Weeks 7–12 (by Dec 19)
- Ship P1 retention surface (accounts, watchlists, alerts, share pages).
- Publish the Pulse every Monday without fail; publish one Lane-of-the-Week article every fortnight.
- Golden Kitty Awards nomination (watch October window).
- Submit YC S28 application (deadline typically late December) + a16z Speedrun + Sequoia Arc.
- Begin P2 deep-intel brief MVP with browser-use worker; sign 2–3 annual B2B contracts at $5K+.
- Raise prep: one-pager, deck, data room (calibration results, security/ToS summary, pilot pipeline).

### Day-90 review (Dec 19) — apply the kill criteria
1. Gold-set ordinal accuracy ≥60%? 2. ≥15 user interviews showing decision-change? 3. Scope still crowding-only? 4. Scan reliability ≥90%? Plus the added fifth: 7-day return ≥20%?

If four of five pass, raise the seed. If fewer, fix the failing dimension for 30 more days before spending on growth.

---

## Appendix A — Validated sources behind this playbook

**Product audit:** github.com/Kartik24Hulmukh/frontier-oss-ideas — README.md, docs/ (POSITIONING, METHODOLOGY, ARCHITECTURE, RESEARCH, ROADMAP, COUNCIL_VERDICT, VERDICT_SUMMARY, LEVERAGE_REPOS), lib/sources/* (seven adapters), lib/scoring/*, app/page.tsx, components/*.tsx.

**Reference repo metadata + capability mining (September 2026):** 33 repos from repos.md fetched via GitHub REST API (stars, forks, language, licence, description, topics) with README extraction — incl. goose (54,665☆, MCP/70+ extensions/ACP/15+ providers/custom distros), browser-use (116,358☆), OpenHands (89,200☆), ragflow (91,326☆), daytona (71,715☆, sandboxes <90ms), openinterpreter (68,450☆), paperless-ngx (46,039☆), colinhacks/zod (44,019☆), refinedev (35,729☆, CRUD meta-framework), grafana/k6 (31,612☆), gitleaks (29,492☆), Skyvern (23,074☆), screenpipe (21,715☆, MCP skills), camel/owl (20,148☆), olmocr (19,661☆), camel/camel (17,775☆), maxun (17,568☆, structured API extraction + proxy partners), open-saas (16,015☆, cron jobs/PH badges), chunkr (AGPL OSS vs cloud API split, localhost:8000 API).

**Grants & non-dilutive:** NLnet Foundation propose page (deadline 3 Nov 2026, 12:00 CET; €5K–€50K; first day of even months) — nlnet.nl/propose and nlnet.nl/news/2026/20260903-call.html; Finta.ai "Non-Dilutive Funding Sources for Startups (2026)" — SBIR/STTR agencies (NSF, DOE, NASA, NIH, EPA, NOAA, USDA NIFA), EIC Accelerator, AFWERX AFVentures, ARPA-E; Chan Zuckerberg Initiative EOSS page (cycle-based, ~$50K grants) — chanzuckerberg.com/eoss/proposals; Mozilla MOSS page (currently closed) — mozilla.org/en-US/moss; Sovereign Tech Fund — sovereign.tech; oss.fund/guides/open-source-grants-2026.

**VC / investors:** OSS Capital homepage (first VC exclusively for COSS since 2018) — oss.capital; OpenVC developer-tools investor list — openvc.app/investor-lists/developer-tools-investors (Prospective Technologies $100–500K, Golden Sparrow $300–400K, Grayscale $300K–$1M leads, Bek $500K–$10M, RTP Global $1–15M); Signal NFX "Top Developer Tools Pre-Seed Investors" (818 investors); vcboom devtools-investors-2026 (Boldstart, early in Snyk).

**Launch benchmarks:** flowjam.com "How to Get on the Front Page of Hacker News in 2025" (9am ET post needs ~15–20 votes by 9:30am); flexprice.io (Tuesday highest average PH upvotes); opensaas.sh blog "You should still launch on PH" (6 launches, #1/#5 of day, 2,000+ upvotes); Reddit r/SaaS "I analyzed 500 Product Hunt SaaS launches — 487 are dead"; smollaunch.com PH Launch Guide 2026.

**Comparables & pricing:** Preuve AI pricing page ($29 one-time report, $499 Investor Package, bundles 5/$95 and 10/$159) — preuve.ai/pricing; dimeadozen.ai/best-startup-idea-validation-tools-2026; preuve.ai/compare (ValidatorAI, DimeADozen, IdeaProof, Gaplyze, WorthBuild, GoNoGo); harmonic.ai competitive-intelligence landscape; ideaproof.io/versus (65 comparisons).

**Market signal case study:** Polsia — $30M at $250M valuation, 0 employees, ~$10M ARR at 14 months, May 2026, investors Sound Ventures/True Ventures/Offline Ventures/Adjacent/Tekton/Drysdale/Vaynerfund, founder Ben Cera — pulse2.com, fundraiseinsider.com, gtmnow.com/gtm-192.

**Academic foundation:** Michaël Bikard (2020), "Idea Twins: Simultaneous Discoveries as a Research Tool", Strategic Management Journal 41(8):1528–1543 (~45 citations) — sms.onlinelibrary.wiley.com/doi/abs/10.1002/smj.3162, INSEAD faculty page, five.dartmouth.edu (FIVES data). Merton (1963/1973) on multiples; Ogburn & Thomas (1922).

**Caveat:** All external amounts, deadlines, check sizes and benchmarks reflect the cited pages as of 2026-09-26. Re-verify on official pages immediately before any submission, pitch or spend. This playbook is strategic analysis, not legal, tax or investment advice.
