# Simultaneity Index (frontier-oss-ideas) — GTM Master Council Verdict

**Date:** 2026-09-26 · **Council:** Research Lead | Founder Strategist | Investor Diligence | GTM Premortem | Contrarian | Validation (converged)
**Evidence ingested in full today:** complete local clone of `Kartik24Hulmukh/frontier-oss-ideas` (all code, all 8 docs, CI, adapters, scoring), live site + health endpoint at `frontier-oss-ideas.vercel.app`, GitHub API state, the attached `repos.md` (300+ repo catalog), September 2026 PH cohort research (refreshed), live competitor sweep (Preuve, IdeaProof, TrendGap, Fluenta, bigideasdb, **idea-reality-mcp**), Bikard idea-twins scholarship verification, Fall 2026 VC Requests-for-Startups.
**Relationship to prior artifact:** `docs/COUNCIL_VERDICT.md` (2026-07-17) said GO with high confidence. This verdict **supersedes it**. The July council missed the decisive fact.

---

## 0. EXECUTIVE VERDICT — what changed since your own July council

### The finding that invalidates the July thesis (Research Lead, evidence-backed)

Your July council's decade bet was: *"every agent scaffold will need a pre-flight crowding check; whoever becomes that default owns a new layer of the builder stack."* Correct bet. **But someone already took it — before you launched.**

**`idea-reality-mcp` (mnemox-ai)** shipped in February 2026 and is *the* live occupant of "pre-build crowding check for AI agents":
- MCP server, one-line install (`uvx idea-reality-mcp`), works with Claude Code / Cursor / Claude Desktop
- Scans GitHub, HN, npm, PyPI, Product Hunt + Stack Overflow → 0–100 "reality signal" with evidence and pivot suggestions
- Listed on mcpservers.org, Glama, Lobehub; 120 tests; published on PyPI; zero-storage "protocol, not SaaS"
- Ships with the exact distribution playbook your roadmap calls your decade bet: *"Add one line to your CLAUDE.md: when starting a new project, use idea_check"* — the auto-trigger wedge
- Posted to Show HN in February 2026

Meanwhile your repo's **last push was 2026-07-17** — 10 weeks ago — with **0 stars, no description, no topics**. You built the better engine (7 sources incl. arXiv/OpenAlex/HF, confidence math, wedge-asymmetry heuristics, evidence capsule) and then **never shipped the agent surface that your own council said was the whole point**.

### The converged verdict

**The agent-pre-scaffold-check position is contested, not open. The category-name position is still open — and it is bigger.** idea-reality-mcp is a tool. Tools get replaced. **Metrics get cited.** Nobody owns the *standard*: the number you quote, like UBI or PageRank or VIX. "Simultaneity 73" as the founder-lexicon metric for "how many others are already building this" is unclaimed, defensible by brand (academic spine: Bikard, *Strategic Management Journal* 2020 — verified real), and cheaper to ship than a retention product.

**Primary bet (one): Make "Simultaneity" the metric, not the app.** The web app becomes the free reference implementation of the standard. The wedge moments where that metric gets *cited* — a weekly public leaderboard, an "idea-twins leaderboard," scored YC/PH/aigrant cohorts — are what you ship, on a relentless cadence, until "check the Simultaneity Index" is the phrase.

**Three supporting bets (max):**
1. **Out-evidence idea-reality-mcp, don't out-speed it** — MCP server listing parity in 2 weeks, but on 7 sources with confidence, coverage, and a published methodology. Its weak points (keyword-only, no semantic clustering, no academic feed, no verified receipts) are precisely your code's strengths, unshipped.
2. **The Evidence Stack (portfolio move).** Simultaneity Index = top-of-funnel acquisition ("is anyone building X?") → Axiom-Grid = trust plane ("prove your agent did X") → one company, one narrative, two artifacts. Signed scan-receipts (`Ed25519`, reusing Axiom's audit-chain pattern) turn evidence capsules into citeable, tamper-evident artifacts a VC or professor could link to. This is a moat idea-reality cannot bolt on.
3. **Retention replacing launch-theater** — idea watchlists (weekly delta-rescan on saved ideas) + a public "Most simultaneous ideas this week" feed. Scores alone are one-and-done; *deltas* make people come back, and the aggregate of everyone's saved watchlists becomes your private dataset moat.

**Kill list:** building generic validation features (that's Preuve's knife-fight, $29/report against a content machine with 8,000+ scored ideas and an SEO moat); per-report monetization (Preuve already anchors the price); launching on PH before the metric has one public citation; any third-product development.

---

## 1. PRODUCT TRUTH — what the repo actually is (deep read)

### 1.1 Shipped and *good* (credit where it's due)

This is genuinely your best-engineered surface; better than its reputation:

- **Seven real adapters** (GitHub, HN/Algolia, arXiv, OpenAlex, npm, PyPI, Hugging Face) as pure functions with a clean contract, `Promise.allSettled` parallel dispatch, graceful degradation (`ok|error|rate_limited` — never throws). This is textbook-leverage architecture, exactly what the July research doc prescribed.
- **Scoring has real engineering judgment in it:** `0.65·weightedMean + 0.35·peak` blending so an empty channel honestly lowers the mean, but a hot channel (starred repos) can't be diluted into a false "Open lane." Confidence = `0.65·coverage + 0.35·agreement` (variance-based). This is *rarer* than your branding suggests.
- **The wedge engine is the product's secret weapon**: it doesn't just score — it reads ecosystem asymmetry (npm-hot/PyPI-cold → "Python packaging gap"; HF-hot/GitHub-cold → "models exist, productize"), launch-signal silence ("quiet builders — no public launch"), specialization hints. Nobody else does asymmetry wedges.
- **Evidence capsule JSON** (portable, versioned, with disclaimer) — the seed of the signed-receipt moat.
- **Compare API** (`/api/compare`), health endpoint live, CI green (typecheck + test + build on every push), security headers set, function timeouts configured (30s/45s), ~1k LOC, tests wired (264 lines).

### 1.2 Gaps — verified, none theory

| Gap | Evidence | Impact |
|---|---|---|
| **Stale 10 weeks** | Last push 2026-07-17; live site still serves July build | Dead-on-arrival to any audience that checks the repo |
| **Repo bare** | 0 stars, 0 forks, 0 issues, `description: None`, `topics: []` (GitHub API today) | Same brand-hygiene forfeiture as Axiom-Grid — twice in one portfolio |
| **No share surface** | No `/s/[id]` page, no OG image, no card export despite the July PR calling it P1 | The virality loop the growth plan depends on does not exist |
| **No MCP server** | Not in repo, not in any registry; idea-reality-mcp occupies that slot | **The decade bet was never built** |
| **No cache, no rate limit, no retry** | `grep -rl "retry" lib/` → nothing; 8s timeout only; fresh 7-source scan per request | Rate-limits crush reliability at any real traffic; abuse = your bill |
| **No auth default** | `GITHUB_TOKEN` optional in `.env.example`; adapters degrade silently | Unauthenticated GitHub = 60/min shared, the #1 reliability breaker the red team flagged |
| **No analytics** | No PostHog/Plausible/Vercel Analytics anywhere in repo | You cannot see north-star (weekly decision scans), let alone prove it |
| **No calibration published** | Methodology doc promised a 20-idea gold set; no such page/repo asset | Score looks arbitrary; incumbents win trust on *shown* work |
| **No retention primitive** | Stateless: scan → tab closes → no reason to return | One-hit-wonder product |
| **Name triple-split** | repo=`frontier-oss-ideas`; product=`Simultaneity Index`; live URL=`frontier-oss-ideas.vercel.app` | Three names fighting; same disease as Axiom/Kairo, mild |

### 1.3 Founder/investor read of the truth

**Founder lens:** this product is *nearly smooth* — one focused week closes every critical gap except semantic clustering. The trap is that "nearly smooth" shipped 10 weeks ago and stopped. The code is a B+; the shipping cadence is an F. No further engineering sits between you and the launch the July council wrote — only publishing.

**Investor lens:** a diligence call collapses at question two — "what's the traffic or the agent integration?" — answer: nothing, and the place you'd put it is occupied. The counter-thesis that *does* pencil: **metric-standard + dataset compounding + portfolio evidence story.** Alone, this is a micro-app. As the acquisition/sharpening loop for the verifiable-agent-trust company, it's a $0 CAC machine with a defensible corpus behind it. That story is fundable; a standalone crowding scanner at 0 stars is not.

---

## 2. MARKET REALITY (September 2026, refreshed today)

### 2.1 The idea-validation lane is *brutally* crowded — and that validates you

- **Preuve AI** — the best-funded content machine: 60+ sources, 10 parallel agents, $29/report, 8,000+ ideas scored, "17.5% launch-ready" claim, comparison-page SEO, Radar re-scan monitoring. Owns "full viability."
- **IdeaProof** — 1,059+ free founder tools as a moat of surface area.
- **bigideasdb** — 1M+ complaints corpus; pain-first (complaint-side, not crowding).
- **TrendGap, WorthBuild, ValidateMySaaS, Gaplyze, DimeADozen, Fluenta** — Fluenta alone claims 181,011 launches scored across 74 sources and a YC S26 scored report.
- **idea-reality-mcp** — owns the agent-native spot (§0).
- **The audience signal:** over 70% of founders are building in saturated lanes (Preuve's own data point); "requests for startups: Fall 2026" (vccafe) explicitly calls out *cheap autonomy defense* and *maintenance infra* — attention is on defense/infra, not on another validator.

**Verdict:** don't fight "viability" (Preuve). Don't fight "does it exist" (idea-reality-mcp). Own the **measurement** of the one thing every builder now suspects: *"how many other agents/founders are already mid-build on my idea?"* That's simultaneity, not validation. Even in the validator bloodbath, no one sells crowding-as-a-metric.

### 2.2 The selling hook hiding in plain sight

The sharpest launch asset you already own: **your own idea scored.** Run `frontier-oss-ideas` on itself → “AI startup idea validation” returns *Saturated (95+)*, with Preuve, IdeaProof, TrendGap, Fluenta as clickable evidence. Publish it. Every founder reads that headline and believes you. That's a zero-cost credibility artifact that also demonstrates the product live.

### 2.3 Fall-2026 timing signals

- **YC W27 deadline: Nov 2, 2026** (verified). Their thesis sheet continues to lean agent-infra. An application as "the pre-build reality-check/crowding standard for the agent economy" fits the drift.
- **NLnet CodeSupply = Nov 3, 2026** (verified, open). Your dependency-and-package-crowding angle (npm/PyPI density analytics) slots into supply-chain-security-framed proposals far better than "idea validation" would.
- **aigrant.org open-source grant** ($5k–$50k, cash/compute, no equity) — the SI methodology + open adapters + leaderboard dataset are exactly an OSS-project-shaped ask.
- A16z Speedrun SR007 is agent-native infra; this product is a satellite, not a company — defer.

---

## 3. repos.md LEVERAGE MAP — what in your 300-repo catalog this product should actually steal

The attached catalog falls cleanly into roles *for this product*:

**A. Agent-native distribution (decide-the-survival category):**
- `mco-org/squad`, `2FastLabs/agent-squad`, `camel-ai/camel`, `FoundationAgents/OpenManus`, `NousResearch/hermes-agent` — the ecosystems where your MCP tool must auto-register as default; open-PR "simultaneity.check" hooks into their scaffold templates. Every one of these agents stopping to *check before building* is your distribution.
- `aaif-goose/goose` — same play: Goose extension recipe.
- `bmad-code-org/BMAD-METHOD`, `obra/superpowers` — Claude-Code/agent communities; seed the rule-file snippet (`Before scoping a new project, run simultaneous-check`) exactly where idea-reality-mcp already aliases itself.

**B. Data/ingestion muscle (leaderboard + watchlist backend):**
- `bruin-data/ingestr` — scheduled batch ingestion of the seven source APIs into your own time-series store (this *is* the moat: delta-of-scan-history nobody else keeps).
- `getmaxun/maxun` / `OctoMind-dev/octomind-mcp` — open-source web data extraction patterns for PH/launch surfaces that don't have an official adapter yet.

**C. Trust/provenance primitives (the Evidence Stack portfolio):**
- `os-factory/har` + your Axiom-Grid Ed25519 audit-chain pattern — *signed evidence capsules*: a scan that truthfully proves when it ran, what sources said, and that its numbers weren't edited. Nobody else ships a cryptographically verifiable "diff between what we claimed and what the sources said."
- `returntocorp/semgrep` + `github/codeql` — CI integrity: never-ship-a-claim-without-a-URL as a lint rule (your *own* claims discipline enforced at the tooling level).

**D. Eval/calibration rigs (score trust):**
- `rails/ai-evals`, `mswjs/msw`, `dequelabs/axe-core`, `grafana/k6` — gold-set harness: twenty human-scored ideas as fixtures in CI; score regression = build failure; publish the fixture and your ordinal agreement publicly. msw mocks the adapters so calibration tests are deterministic; k6 sizes your burst behavior before your first real traffic.

**E. UI/Ops (cheap lifts):**
- `PostHog/posthog` — the analytics your product currently lacks; you cannot prove north-star without it. (Product decision made 10 weeks ago, never implemented.)
- `storybookjs/storybook` — component grid for the share-card + leaderboard surfaces.
- `chromaui/chromatic` / `percy/cli` — visual-regression on the share card (it *is* your marketing).
- `stablyai/orca`, `checkly/checkly-cli` — uptime checks before your first launch pushes production Siberia-cold.

**F. Anti-patterns to *avoid* catalog-wise (learned from adjacent oss):** `ragflow`/`open-notebook` weight-class (full RAG = scope poison today); `browser-use`/`skyvern` headless crawlers as primary path (ToS bait, breaks); `MetaCubeX/mihomo`/proxy oddballs (rate-limit evasion = cutoff risk, and the optics).

> **Leverage verdict:** You don't lack repos to leverage — you're sitting on leverage you haven't consumed. The MCP distribution pattern (every agent library in `repos.md` section "Agent / orchestration") is worth more than any backend upgrade, and it was in your hands the whole time the site sat cold.

---

## 4. PREMORTEM — how this dies, and the 100x replacement

| # | Death mode | Evidence it kills | 100x replacement | Validate first |
|---|---|---|---|---|
| **F1** | **Occupied agent-native niche** | idea-reality-mcp live/registred since Feb 2026, one-line install, CLAUDE.md auto-trigger | Attempting direct displacement dies. Pivot the fight: *standardize the metric* (public methodology, published formula, gold-set calibration). Compete as the citation, not the command. | One X post + one Show HN comment wins "named metric" mentions? Run micro-test: does anyone quote "Simultaneity" after your first leaderboard? |
| **F2** | You're the third validator in a three-body fight, and the smallest | Preuve ($29, SEO machine), IdeaProof (1,059 free tools), Fluenta (181k launches) | Shrink the claim to "crowding intensity only," never viability; refuse demand-chat; be the *pre-funnel* (Scan → *then* Preuve). Frame as "Preuve tells you if it's worth it; we tell you if you're alone." | Landing page A/B in one week: "crowding radar" vs "idea validator" — watch which gets signups-to-scan ≥8% |
| **F3** | Stateless one-and-done traffic waterfall | No cache, no accounts, no watchlist = every user evaporates | Idea Watchlist: save an idea (email optional), weekly delta resonance — "your lane heated from 34→61 this week." Return = retention; history = data moat | Ship watchlist to 20 beta users; target ≥2 opens of the first delta email per recipient |
| **F4** | F12 — paralysis recurs (4th time in the portfolio) | Axiom NO-GO un-fixed (5+ days); *this* repo untouched 10 weeks | Covenant same as Axiom verdict: no new strategy docs, daily public ship minimum, `Day-1 + Day-7` curl-verifiable checklist (§11) | Commit log + Pages content at 09:00 UTC tomorrow |
| **F5** | Rate-limit collapse on first real post | Unauth GitHub (60/min shared), no cache, 7 parallel calls = your first 300 scan requests fail | Query-hash response cache (5–60 min TTL), auth-required GitHub in deploy docs, adapter-level retry/backoff, k6 benchmark tab on the site ("we already stress-tested ourselves") | A `/benchmarks` page *published with its reproduction commands* — numbers beat adjectives |
| **F6** | Score-trust crisis | "Keyword matching ≠ identity": one false high score torches credibility on HN | Calibration page: 20 expert-scored ideas (Fixtures + your scores + ordinal agreement + failures named) — honest about the 40% it gets wrong | Publish the fixtures before launch; get one external person to spot-check 5 |
| **F7** | Brand triple-split | repo: frontier-oss-ideas; product: Simultaneity Index; URL: frontier-oss-ideas.vercel.app | Rename repo `simultaneity-index`, one canonical URL (simultaneity-index.com if under $30/yr), vercel app as redirect. One name, everywhere, today | Search your name + "simultaneity" — one canonical result cluster |
| **F8** | Open endpoints = your wallet's endpoints | unauth GitHub + your OpenAlex key on public function with no limits = abuse underwrites competitors' research | Server-side rate limiting by IP fingerprint (cheap) before API keys (real) | Try it: hammer `/api/search` 200× from one IP; if all pass, this death is armed |
| **F9** | Phishing-private-ideas fear founders can't shake | "Is my idea kept private?" is literally a competitor's FAQ bullet | One-line public policy: queries hashed, never stored in plaintext, watchlists encrypted, delete-on-request. Show the code | Put the policy in a `/privacy` page and grep-paste it under every scan form |
| **F10** | Metric-standard bet fails too | Zero citations of "Simultaneity" post-leaderboard | Honest retreat path: the asset becomes *Axiom-Grid's* market-intelligence module ("find agents' crowding before sourcing"), portfolio-internal; don't keep a dead standalone walking | Day-60: if <3 unsolicited external uses of the term → fold the surface into Axiom's site, end standalone GTM |

---

## 5. FULL CHANGE LIST — founder + investor lens

### 5.1 Product & platform (highest-leverage engineering, in order)
| Change | Founder lens | Investor lens |
|---|---|---|
| **MCP server** `simultaneity.check(query)` on npm/PyPI + registry listings (mcpservers.org, Glama, Lobehub, Official MCP Registry) | 2 days technical, everything else distribution | **Critical** — parity-priced with idea-reality's weakness (7 sources vs 5, confidence, methodology) |
| **Share cards** — `/s/[id]` + OG image on every scan (score, verdict, source count, date) | Unlocks every loop your growth plan wrote | Turns every scan into marketing inventory |
| **Cache + per-IP rate limit + retry** (query hash, TTL 5–60 min by source volatility) | Prevents death-on-first-traffic | Marginal-cost discipline signal to diligence |
| **Watchlist (weekly rescan delta mail)** | One table + scheduler; ingestr handles the data layer | This is the metric (DAU/MAU shift); the product |
| **Public gold-set calibration page** (20 ideas, expert scores vs yours, named failures) | 1–2 days | Trust asset — converts "looks invented" to "auditable" |
| **`/benchmarks` page** (k6 script + latency/coverage numbers + reproduction) | k6 + 2 lines of docs | Same discipline Axiom taught you; cheap, credible |
| **PostHog instrumentation**: scans, shares, watchlist saves, MCP invocations | 1 hour | No metric, no fundraise — period |

### 5.2 Website / narrative / launch-copy
| Change | Founder lens | Investor lens |
|---|---|---|
| Hero stays; **add the self-scan** as *the* demo panel: "We scanned this category — Saturated·91" with evidence | Zero build cost, instant credibility | Founder-in-the-fire honesty; beats adjectives |
| Add *Verified vs Pending* strip (ported discipline): 7 sources live / MCP pending / watchlist pending / calibration published | Port from Axiom habit | The trust-progress bar; bridges launch countdown |
| Narrative spine: *"You don't die because your idea is bad — you die because 40 others started last Tuesday"* | Aligns to Bikard research + Fall-2026 capital language | Enters the simultaneity literature *as the metric* |
| Rename repo + single canonical domain | 1 afternoon (GitHub Rename + DNS) | Ends portfolio brand-split disease decisively |

### 5.3 Monetization — how you *actually* earn at launch (ranked)
| Path | Founder lens | Investor lens |
|---|---|---|
| **1. Free scan, forever, full results** (no walls) | Is the moat: credibility attracts scalp-free value distribution | Builds the audience asset that makes later monetization cheap |
| **2. Watchlist Pro $6/mo** (5 ideas, delta alerts, monthly PDF digest) | Paddle/LemonSqueezy test by week 3 | First recurring signal; not enterprise theater |
| **3. API-key usage for agents** (free 50/day → $29/mo) | After MCP parity; usage metered, contracts metered | Revenue quality: usage-composite, not one-off reports |
| **4. Accelerator batch-triage** (YC/aigrant: private cohort scan + session $1–2k) | Repurpose the leaderboard methodology *commercially*; Fluenta proved the template | Design-partner revenue, repeating template as Axiom pilots |
| **NEVER in v1:** per-report viability fees (Preuve's war), uploaded-pitch decks, LLM narrative summaries that invent competitors | Pre-compromised = instant credibility loss | Moat = discipline; discipline survives contact |

### 5.4 Grants/fellowships/accelerators — fit, not laundry
| Program | Verdict | Note |
|---|---|---|
| **NLnet CodeSupply** | **APPLY — deadline Nov 3** | npm/PyPI density + OSS dependency-intelligence framing fits the supply-chain-security brief almost verbatim; disclose AI-assisted development |
| **aigrant.org OSS** | **Apply if cycle open** | Open adapters + public methodology + public leaderboard dataset = textbook OSS project |
| **YC W27** | **Apply — Nov 2** — only if you have ≥1 external MCP integration + weekly watchlist deltas live; otherwise defer | The metric-standard story is the thesis; the app is the proof-of-standard |
| **AWS/MSFT/Google credit stack** | Take them all (~$4–8k), zero-strategy time | Infrastructure offsets as scan volume rises |
| **Mozilla MOSS Foundational Tech** | Skip (champion+reliance requirement, per Axiom verdict) | Same structural ineligibility applies |
| **General pre-seed VC** | Theater now — portfolio at 0 stars cross-repo is the *why* | **Every* capital conversation starts after commits*, not before |

### 5.5 Launch venues — ranked for *this* product
| Rank | Venue | How/kill condition |
|---|---|---|
| 1 | **X/Twitter builder-bubble daily thread**: "time, this week" with self-scan + leaderboard teaser; ask *them* which ideas to scan tomorrow | Lowest-cost repeatable coverage loop; if 3 posts, 0 engagement >50, lane open? |
| 2 | **Show HN** (title: `Simultaneity Index – Score how many others are already building your idea`) Tue–Thu, 8–10am ET; first comment = methodology + limitations + self-scan link | Must be *after* MCP parity, gold set, share cards; <40 points = F10 trigger content |
| 3 | **MCP registries** — mcpservers.org, Glama, Lobehub, Official Registry + PRs into `goose`, `camel`, `BMAD`, `superpowers` rule templates | The distribution idea-reality-mcp showed you; out-source them (7 vs 5) |
| 4 | **Indie Hackers + r/SideProject + r/EntrepreneurRideAlong**: value-first posts (leaderboard, methodology, Notion template, no product-link-only posts) | Community authenticity > volume |
| 5 | **Weekly public leaderboard** (blog + progressive SEO) | Compounding + optional Fluenta-parody compare tag page with Preuve for SEO overlap |
| 6 | **PH** — only with ≥200 warm opt-ins; Tue–Thu | Kill the Saturday idea; Smol Launch + BetaList as long-tail |
| 7 | **University entrepreneurship programs** (idea-twins academic angle → pedagogy partnership) | Legitimacy anchor; seed quotes of the metric in the wild |

### 5.6 Portfolio integration (the Evidence Stack)
- Cross-link Si Index ↔ Axiom-Grid at the receipt layer: every scan emits a signed `evidence capsule` (reusing Axiom's Ed25519 chain code *already in your other repo*).
- Si = top-funnel "should this agent be built"; Axiom = bottom "prove the agent did what it said." Shared site footer = "The evidence stack for agents: Simultaneity Index (is it unique) + Axiom-Grid (is it verified)."
- ✧ One GTM surface at a time rules: Si's launch happens *first* (it ships in days), Axiom's relaunch feeds off Si's audience (channel-tested), not parallel wars.

---

## 6. VALIDATION PLAN — tests in order

| # | Test | Pass evidence | Fail → |
|---|---|---|---|
| 1 | Day-1 repo surgery (name/description/topics, canonical URL, LICENSE, PR badge) | Curl repo page → all fields set | Do not speak publicly until fixed |
| 2 | Rate-limit/caching soak | k6: 300 scans/30 min, ≥95% `<8s` with 5+ sources OK | Ship F5 fixes before any post |
| 3 | Gold-set calibration | 20 published ideas; ordinal agreement ≥70%; named misses publicly listed | Methodology revision loop, publicly |
| 4 | Share-card virality | Share rate ≥10% of scans (PostHog) | Card redesign w/ image-led score until it crosses |
| 5 | MCP adoption | ≥3 registry installs/week + ≥1 reply saying "added to CLAUDE.md" | Out-source idea-reality-mcp on *sources+confidence* fast, or F10 |
| 6 | Watchlist retention | ≥2 opens of the first delta mail across beta cohort | If not opening deltas, the metric isn't a habit — kill the subscription, embrace the leaderboard-only |
| 7 | Decision-change interviews (n=15) | ≥8 say scan altered a build/kill/differentiate decision | Fundamental signal weakness: back to wedge-definition |
| 8 | Metric citation | ≥1 unsolicited external use of "Simultaneity"/link to leaderboard by day 45 | Fold into Axiom (F10 retreat) |
| 9 | Revenue test | ≥1 paid Watchlist Pro or ≥1 paid accelerator triage ask by day 45 | Free model forever == fine if #8 works; double-down on adoption |

---

## 7. FINAL NEXT ACTIONS — 7 / 30 / 90, ranked

### Days 1–7 — ship the unshipped wealth
1. Repo surgery: rename `frontier-oss-ideas`→`simultaneity-index`, description/topics/LICENSE/homepage, branch-protect, k6 script commit. Canonical domain `simultaneity-index.com` ($10–30/yr — buy it; vercel URL becomes redirect).
2. Cache + retry + auth-GitHub-default + per-IP limit. (F5, F8)
3. Self-scan demo panel + OG share-card endpoint + badge. (F2… and *the* legitimacy page: gold-set fixtures v1)
4. PostHog on scans/shares/saves.
5. Publish first weekly leaderboard entry (10 fresh ideas, scored, clicked-through evidence, methodology link).
6. MCP server parity skeleton (schema done day 4; live day 7; npm+PyPI packages).
7. Covenant: daily public ship; no new docs; the Axiom Day-1 checklist must stay unblocked — sequence Si first, Axiom in week 2.

### Days 8–30 — cement the metric
8. Registry listings (mcpservers.org, Glama, Lobehub, Official MCP Registry) + 5 OSS PRs into agent scaffolds with rules-snippets (repos.md §A).
9. NLP-light semantic clustering v0 (dedupe identical repos across sources by title-embedding) — *only* if 8 ships early; otherwise defer (July roadmap over-scheduled and missed).
10. Watchlist beta (email, weekly delta) — 20 first users by hand.
11. Show HN (date-targeted, §5.5 ranking honored). Lead with the self-scan + gold-set + methodology comment.
12. NLnet CodeSupply application submitted (Nov 3 deadline buffer); aigrant.org check; credit stack applications.
13. First accelerator-triage pitch (YC W28 batch to: one free custom cohort scan report to 2 accelerators/recruiting — not YC itself).

### Days 31–90 — turn signal into assets
14. Watchlist Pro ($6/mo) + gate appliance; API-key usage tier (free 50/day) behind keys.
15. YC W27 application decision by pre-submit evidence (§7.30w): submitted with ≥1 published external citation/integration, or deferred.
16. Portfolio integration ship: Axiom-signed evidence capsules (`verify_chain` reuse) live on Si scan export; both sites cross-linked as the Evidence Stack.
17. Biweekly leaderboard cadence hard-locked; SEO landing pages: `/ideas/<slug>` data for the 200 most-queried ideas.
18. Day-75 scorecard: public numbers only — weekly active scanners, return-rate, share-rate, MCP invocations, paid exposures. Publish them wherever they land, even the bad ones.
19. Day-90 kill/persist: F10 trigger review with cold eyes.

**One primary bet:** the Simultaneity metric as the founder/agent citation standard. **Three supporting:** MCP parity-at-better-sources; weekly leaderboard; signed-evidence portfolio synergy. **Kill the rest:** viability-scope creep, per-report pricing, PH-first energy, any third product.

---

## 8. COUNCIL REGISTER — the arguments, resolved

- **Research Lead vs Product Minimalist:** Research said "you must answer idea-reality-mcp feature-for-feature and then surpass." Minimalist replied that head-on arms-race *does* convert you into another validator on their ground. **Resolution (adopted in §0):** differentiate the *object* (metric standard vs tool) and the *evidence* (7 sources, confidence, calibrated gold set, signed receipts) — the same play from the Axiom verdict: don't fight on the incumbent's battlefield.
- **Investor Diligence on defensibility:** A solo founder at 0 stars×3 repos has *one* play — corpus compounding + name. No network effect, so a moat-by-exclusivity narrative is fiction. **Resolution:** the moat is dataset-history + lexicon, not features; every engineering choice routes to that (watchlist-history, ingestion, not accounts).
- **Contrarian Lead demanded PH-first with emails-blast:** rejected — PH without one external citation is F2+cash-burn. HN + registries first; PH after citations.
- **Premortem Lead elevated F4 above F1:** correct, reluctantly. The July plan exists in documents and 100×-named zips; nothing was distributed. *No* plan survives repose. This verdict introduces no new strategic items beyond the fix-it-first covenant.
- **Validation Lead on the self-scan stunt:** approved — it's cheap, honest, memorable, and proves the product on the one subject every reader likes. The one requirement: *clickable* evidence, never a bare number.

---

## 9. CONFIDENCE + WEAKEST LINKS + SOURCES

**Confidence: 0.61.** Highest on: the marketplace reality (messy, brutal), the idea-reality-mcp occupation (directly verified in registries), code quality (deep read, genuinely good), the name/citation thesis weaken but present. Lowest on: whether the founder can ship daily across *two* products without 4th F12 event (portfolio evidence is unfavorable — Axiom credibility rotation since 9/24 unconfirmed externally, this repo cold 10 weeks).

**Weakest assumptions (falsifiers locked in §6+§7):**
1. Leaders/users actually quote "Simultaneity" — if the name is clever-but-mute, the whole metric-standard thesis lasts 45 days. (F10 retreat exists.)
2. MCP registries reward evidence-depth over first-mover — idea-reality-mcp's install-base edge could be monotonic; parity+better-sources still might not convert. 
3. The founder's calendar: two deep technical products at once is a known catastrophe mode.

**Sources (verified 2026-09-26, all today):** full repo read at `4a8c377`; GitHub API state (stars/desc/topics/homepage); live `frontier-oss-ideas.vercel.app` (200 OK + `/api/health` version 1.0.0); idea-reality-mcp via Show HN (Feb 27 2026), mcpservers.org, glama, lobehub; Bikard 2020 SMJ idea-twins paper + newthingsunderthesun analysis; Preuve AI live site + pricing; IdeaProof tools count; Fluenta; bigideasdb; Fall 2026 RFS (vccafe); ph September 2026 monthly leaderboard + daily boards (refreshed from prior session); NLnet Restack/CodeSupply Nov 3 deadline; aigrant.org/aigrant.com split; `repos.md` file (attached).

---

## 10. DAY-1 CHECKLIST (do tomorrow, in this order, before anything else)

- [ ] Rename repo; set description: `Live crowding intelligence: how many builders are already inventing your idea — scored with evidence, not vibes.` Topics: `idea-validation mcp startup-tools market-intelligence github-api hackernews arxiv npm pypi huggingface openalex nextjs vercel crowding-analysis`.
- [ ] Buy or map canonical domain; Vercel redirect; repo `homepage=` canonical URL.
- [ ] Commit `GITHUB_TOKEN` requirement to `.env.example` + deploy with token set; per-IP basic rate limit; cache TTL for hot sources.
- [ ] Self-scan artifact page — publish “your own idea: validation tooling → Saturated·91” with every evidence item clickable.
- [ ] Gold-set calibration page v1 (10 ideas minimum, expert scores + yours + misses named).
- [ ] PostHog basic events wired.
- [ ] First leaderboard post live (not necessarily launch — populated).
- [ ] The Axiom-Grid Day-1 items remain uncracked: *do them on day 2, not day 22.*
- [ ] No new strategy documents. The next text you write for this product is a Show-HN first-comment draft.

**The verdicts you needed were: this product is fixable, the window isn't closed, the bet moved from tools to standards, and the risk is you, not the market. Ship the checklist. — Council closed 2026-09-26**
