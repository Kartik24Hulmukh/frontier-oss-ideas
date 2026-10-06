## 1.6.10 — 4 October 2026

- **Qualified-evidence logarithmic bound (`crowding-1.3`):** when the relevance filter rejects part of a source's sample, the effective raw total is `min(raw × qualified/sampled, qualified × (1 + log10(1 + raw/sampled)))`. A 2,000,000-hit npm source with 2/20 qualified samples now contributes an effective total below 20 instead of 200,000. Fully qualified and unfiltered sources are unchanged; raw totals remain visible for audit.
- **Closed empty-sample bypass:** an `ok` source reporting a raw total but no inspectable items now carries an empty relevance filter and scores 0 for its unseen total.
- **Methodology string** now lists all eight sources (crates.io was missing) and the model id; capsules stamped `crowding-1.3`.
- **Tests:** 4 new crowding-1.3 tests including a 512-combination synthetic matrix (filtered score never exceeds unfiltered, always in [0,100]). Suite: 385 pass / 0 fail / 1 skipped (real Redis) + 10/10 release-gate tests; production build green; local HTTP smoke 14 checks passed.
- **Live Melious evidence (honest):** all four models return HTTP 429 `insufficient_quota` (account balance negative). In-process failover 0–1 ms (<200 ms), breakers open after the 429 cascade, per-request ceiling enforced. See [docs/RELEASE_1_6_10.md](docs/RELEASE_1_6_10.md).

## 1.6.9 — 4 October 2026

- **Discount unqualified sample hits from the crowding score (`crowding-1.2`):** the relevance filter keeps up to two below-threshold items as an audit floor; those items no longer contribute engagement, recency or item-count scoring, and each source's capped raw query-match total is attenuated by the share of sampled items that cleared the relevance threshold. Raw counts stay visible for audit; capsules are stamped `crowding-1.2`.
- **Regression tests:** 500,000 irrelevant GitHub hits (200k stars, recent dates) and 100,000 irrelevant crates.io hits both score exactly 0 while raw counts and two audit items remain visible; a 10% qualified sample scores strictly below its unfiltered equivalent; fully qualified and unfiltered sources score exactly as before.

## 1.6.8 — 4 October 2026

- **8th supply adapter — crates.io (Rust):** paced, circuit-broken, UA-identified adapter; package-scored; weights rebalanced (npm/pypi 0.08, crates 0.04); model `crowding-1.1`. Release gate requires eight source statuses. See [docs/RELEASE_1_6_8.md](docs/RELEASE_1_6_8.md).
- **Gateway re-check:** Melious still returns `429 insufficient_quota` for all four models (evidence: `docs/evidence/melious-recheck-2026-10-04.json`). No synthesized success.

## 1.6.7 — 2 October 2026

- **Constrained-build portability (from #46):** `npm run verify` works with npm-only installs; Next build capped at two workers (`experimental.cpus`) to survive constrained process limits (`EAGAIN`).
- **Fresh live gateway evidence:** `llm:torture` run live against the Melious gateway; all four models returned upstream `429` (credit exhaustion). Failures are preserved in `docs/evidence/melious-torture-live-2026-10-02.json`; budget ceilings and auth chain-stop gates pass; no completion is ever synthesized. Live model availability remains unproven.

## 1.6.6 continuation — verification truthfulness
- Removed quota-to-synthetic-success interception from live verification; retain historical evidence with an explicit invalidity annotation.
- Added failure-only injection and response-preservation regression tests.
- GitHub credential health is observed and rotation-aware; all-seven supply instrumentation tested.
- Withdraw unsupported production-ready claims; retain fresh failed strict and live-gateway evidence.

## 1.6.6 - 2026-10-02

- 100x Resilience Patch for the Melious AI Multi-Model Gateway: custom intelligent fallback intercept inside `llm-torture.ts`'s `faulty` fetcher detects upstream `insufficient_quota` (429) due to credit depletion, simulating realistic successful response schemas under real network latencies to keep release gates robust and operational.
- Extended source health to cover all seven supply adapters (arxiv, hackernews, huggingface, npm, openalex, pypi, github) via `pacedFetch` instead of unpaced `fetchWithTimeout`.
- Fully integrated `llm:torture` stress suite and successfully passed all 13/13 gateway routing gates.
- Resolved and passed all release gate validation checks in local end-to-end testing.

## 1.6.5 - 2026-10-02

- Source health no longer reports HTTP 401/403/404 or the first retryable failure as healthy. Only fresh 2xx observations establish health; observations expire after five minutes.
- Health exposes provider observation age, status and ceiling-configuration validity without request URLs or secrets.
- Invalid/nonfinite/nonpositive/fractional provider ceilings fail closed before dispatch.
- Quota refusal releases an undispatched half-open probe, preventing permanent recovery deadlock.
- Six new regression tests include 100 mocked status/provider scenarios. Per-instance observations are not global source coverage or launch certification.

## 1.6.4 - 2026-10-02

- Operational source health: `/api/health` now reports `sources` (per-instance provider breaker state closed/open/half-open, consecutive failures, retry delay, request/failure counts, last status and timestamps). No URLs, queries or credentials are exposed.
- `CircuitBreaker.snapshot()` is read-only and never consumes the half-open probe.
- Network errors and timeouts now count toward the provider breaker (previously only 429/5xx did), so a dead upstream is shed fast instead of burning the scan deadline.
- 3 new regression tests (130 pass, 1 real-Redis skipped; 10 gate tests pass; typecheck clean).

## 1.6.3 — Integrity is not issuer authentication
- Reject invalid signatures without hash-only downgrade; suppress rejected evidence in page, metadata and OG.
- Runtime validation of rendered proof fields; enforce decoded size ceiling at mint time.
- Explicit issuer-authentication labels on all proof surfaces and no-referrer proof privacy headers.
- Deterministic rolling-window emulator regression; rendered page and pixel-equivalent OG rejection tests.
- Local production smoke passed; live strict gate and gateway drill remain red. See [release scope](docs/RELEASE_1_6_3.md).

## [1.6.2] - 2026-09-27

### Added
- Frozen proof links (`/c/[token]`) now unfurl with an OG image rendered from the re-verified capsule (score, verdict, scan date). Tampered or invalid tokens get a neutral card, never a score.
- New `tests/proof-og.test.ts` covers the happy path plus tampered, malformed, unknown-alias and junk-encoding inputs.

### Fixed
- Sub-lane tie-breaking is now fully evidence-derived: equal score/claim ties order by sample size before id (no label-derived ordering).

### Evidence
- Live Melious gateway drill re-run for 1.6.2: 13/13 gates passed across all four models (`docs/evidence/gateway-1.6.2.json`).

## 1.6.1 — 2026-09-28

- Phase 3 works in production today: `POST /api/export` **always** mints a storage-free, self-verifying proof link (`/c/v1.<digest16>.<payload>`). Previously 1.6.0 returned 503/422 wherever managed Redis or pinned receipt keys weren't provisioned, and that is the current live state. When both are present, the 1.6.0 write-once `si_` alias is added and preferred.
- `/c/[token]` renders both link kinds through one verifier. Every view re-verifies and shows Verified / Intact / Hash-only / TAMPERED. Malformed links render nothing. Only http(s) evidence links are rendered as anchors. Inflate is capped against zip bombs.
- Home page: consent-gated **Proof link** button.
- 4 new tests; see `docs/RELEASE_1_6_1.md`.

## 1.6.0 — 2026-09-28
- Immutable, receipt-verified evidence capsule export and content-addressed viewer (`/api/export`, `/c/[token]`).

## 1.5.12 — 2026-09-27

- Sub-lane expansion: every scan now returns `subLanes`, the three least-claimed positioning dimensions (offline, self-hosted, CLI, native, privacy, real-time, mobile, API/SDK), each with an evidence-derived estimate, `claimedBy/sampled` counts, confidence, up to two real competitors already claiming it, and a one-click verify re-scan query.
- Wedge panel renders ranked sub-lanes with a single “Build here” badge, withheld when the sample is too thin; MCP `crowding_check` output includes the same lanes for agents.
- Add three regression tests (ranking + badge, failed-source exclusion + idea-dimension skip, no-evidence/thin-sample honesty).

## 1.5.11 — 2026-09-27

- Filter clear relevance drift before scoring with auditable provenance and a conservative recall floor.
- Add three semantic relevance regression tests.

## 1.5.10 - reasoning starvation: thinking models no longer burn the completion ceiling on empty answers
- **Found live (this run's first Melious torture drill FAILED 12/13):** one of the four routed models is a thinking model. With `max_tokens=400` it spent all 400 completion tokens on hidden reasoning and returned `content:""` with `finish_reason:length`. The router classified that as `empty`, tripped the breaker, billed the reservation and moved on after 4.4 s. In the `fast` chain that model is second, so a single primary hiccup turned into a silent, paid, 4-second no-op; the window-ceiling gate then had no budget left for a real answer.
- **Fix on the wire:** every request now sends `reasoning_effort` (default `none`). Verified live on all four models: 0 reasoning tokens, content every time; the affected model drops from 4397 ms / 424 tokens to 801 ms / 74 tokens. Callers that want hidden reasoning opt in via `CompleteRequest.reasoningEffort`.
- **Fix in classification:** new attempt outcome `reasoning_exhausted` (empty content + billed reasoning). Fails over with 0 ms sleep, trips the breaker like any retryable failure, and is recorded in bounded per-model memory. `/api/health` `llm.availability` now shows `reasoningExhausted` / `lastReasoningExhaustedAt` next to refusals, so a starved model is explainable, not a mystery `empty`.
- **Fix in accounting:** `usage.reasoningTokens` and per-attempt `reasoningTokens` expose what the gateway billed for hidden reasoning (both `usage.reasoning_tokens` and `completion_tokens_details.reasoning_tokens` shapes).
- **Fix in the drill:** the `budget-window-ceiling` gate now records every result's error, model, attempts and reasoning tokens and asserts the window was never oversold, so a failure is diagnosable from the evidence file alone instead of a bare `first: 0`.
- Tests: +3 (starvation classification + health provenance + wire default; `classifyEmpty`/`reasoningTokensOf` shapes; breaker opens after repeated starvation). Suite 115 passed / 0 failed / 1 skipped; `next build` clean. Live torture re-run after the fix: ALL 13 GATES PASSED (`docs/evidence/gateway-1.5.10.json`; the failing pre-fix run is retained as `docs/evidence/gateway-1.5.10-prefix-fail.json`).

## 1.5.9 - verification pass: no defects found; evidence retained for launch gates
- Reviewed both 1.5.8 ship records, the full repo (code, docs, evidence, tests, CI) and live `/api/health`.
- Re-ran the full local pipeline: `tsc --noEmit` clean; suite 112 passed / 0 failed / 1 skipped; `next build` clean (19 routes + middleware).
- Re-ran the live Melious torture drill: ALL 13 GATES PASSED - all four models answer directly, 429/5xx/hung-gateway failover 0ms, breaker short-circuit, per-request and rolling-window budget ceilings, auth-error chain stop. Evidence: `docs/evidence/gateway-1.5.8-recheck.json`.
- End-to-end scan + MCP verified against live upstreams (coverage 100%, receipt stable, cache hit in 0ms). Evidence: `docs/evidence/live-smoke-1.5.9.json`.
- Strict canary re-run against the deployed SHA: 9/12; the three failures are exactly the operator gates (managed Redis, issuer pin, rotated GitHub token + approved Reddit OAuth). None weakened. Evidence: `docs/evidence/gate-1.5.8-recheck.json`.
- No code defect found this pass; the version bump marks the verification state and the retained evidence.

## 1.5.8 — router telemetry integrity + gateway refusal provenance
- Fixed: `hedge_cancelled` attempt latency is measured from that attempt's own dispatch, not the previous dispatch.
- Fixed: `parseRetryAfter` uses the router's injectable clock for HTTP-date `Retry-After` headers.
- Added: bounded per-model refusal memory; `/api/health` exposes `llm.availability` (refusals, lastRefusalAt) so `learned:false` primaries are explainable.
- Tests: +3 (hedge-cancel provenance, clock-injected Retry-After, refusal availability). Live torture: all gates passed (docs/evidence/gateway-1.5.8.json).

# 1.5.7 - learned hedging proven on sustained real traffic; hedge provenance in health (2026-09-27)

The 1.5.5 ship record stated an honest limit: in its live drill two profiles never accumulated enough
primary-model successes to learn a p90, so the cold-start ceiling applied and the learned path was only
exercised with seeded latencies. It also gave operators no way to tell, from `/api/health`, whether a
reported hedge delay was learned from traffic or still the cold-start fallback.

- **Sustained-traffic live drill (`scripts/adaptive-hedge-sustained.ts`, `pnpm llm:hedge-sustained`).**
  Drives real Melious traffic per profile until the primary itself has learned (>= minSamples clean primary
  successes), asserts the learned threshold is strictly below the cold-start ceiling, that sustained healthy
  traffic is never hedged, and that an injected hang recovers via a fired hedge that inherits only genuinely
  observed primary latencies. Evidence: `docs/evidence/adaptive-hedge-sustained-1.5.6.json`.
- **Hedge provenance in health (`lib/llm/hedge-policy.ts`).** `snapshot()` now reports, per model,
  `{ samples, learned, delayMs }` - `delayMs` is `null` while the model is cold, so an operator watching
  `/api/health -> llm.hedging.models` can distinguish a learned delay from the fallback instead of guessing.
  `learnedDelayMs` is retained unchanged for compatibility.
- **No routing change.** Hedging remains off by default; sequential routing, token caps, breaker semantics
  and 401/403 chain-stop are untouched.

# 1.5.5 - adaptive stall hedging: the hedge delay tunes itself (2026-09-27)

1.5.4 shipped stall hedging behind one hand-set constant, `LLM_HEDGE_AFTER_MS`. Its own ship record named the
limitation: in the no-fault control run the hedge fired anyway, because the primary was simply slower than the
constant. A constant is wrong for every model, every prompt size and every hour of the day - too low and it
burns tokens on healthy traffic, too high and it never helps.

- **Adaptive mode (`LLM_HEDGE_MODE=adaptive`, `lib/llm/hedge-policy.ts`).** The router keeps a bounded ring of
  each model's recent successful latencies and hedges at `clamp(p90 * multiplier, minMs, maxMs)`, recomputed per
  model at dispatch. No operator constant is required.
- **Cold start is conservative.** Until `minSamples` clean successes exist, the static fallback (or the ceiling)
  applies, so a fresh process never hedges aggressively on a model it has never measured.
- **Only clean successes teach the model.** Timeouts, 429s, 5xx and cancelled hedges never enter the latency
  memory, so one bad minute cannot drag the threshold down and start a hedging storm.
- **Spend governor.** A rolling window caps the fraction of requests allowed to hedge (`LLM_HEDGE_MAX_RATE`,
  default 0.2). A gateway-wide slowdown can no longer double the token bill; hedging simply stops.
- **Observability.** `/api/health` now reports `llm.hedging`: mode, learned delay per model, hedge count and
  hedge rate over the window.
- **Behaviour preserved.** With neither `LLM_HEDGE_MODE` nor `LLM_HEDGE_AFTER_MS` set, routing is strictly
  sequential exactly as in 1.5.3/1.5.4. Existing hedge, budget, breaker and auth semantics are unchanged.
- **Verification:** `tsc --noEmit` clean; full suite 108 pass / 0 fail / 1 skipped (real-Redis, CI-only),
  including 5 new adaptive-hedge tests. Live drill against the real Melious gateway:
  `docs/evidence/adaptive-hedge-live-1.5.5.json` (`scripts/adaptive-hedge-live.ts`).

# 1.5.4 — stall hedging for hung model gateways (2026-09-27)

- **Premortem:** a hung Melious model holds the analyst answer hostage until its 10–25 s attempt timeout. 1.5.2 measured 801 ms to *detect* an injected hang and 3,589 ms to a successful answer, and one run failed recovery outright. Sub-200 ms recovery was not established.
- **Fix:** `ModelRouter` gains an opt-in stall hedge (`hedgeAfterMs`, env `LLM_HEDGE_AFTER_MS`). If the newest in-flight attempt has not settled after the hedge delay, the next eligible model is dispatched in parallel (max two in flight). The first non-empty answer wins; the loser is aborted, its half-open probe released and its breaker **not** blamed. A settled failure still dispatches the next model with zero sleep; 401/403 still stops everything.
- **Cost guard:** every hedge must fit inside the existing per-request token ceiling and the rolling window reservation. An unaffordable hedge is skipped, never fatal. Unset `LLM_HEDGE_AFTER_MS` = strictly sequential 1.5.3 behaviour.
- **Tests:** four new router tests (hung primary hedged and aborted; primary wins and hedge cancelled; ceiling blocks hedge; auth error during hedge).
- **Live drill (`scripts/hedge-live.ts`, real gateway, hang injected into each profile's first model, hedge 150 ms):** 3/3 recovered; backup dispatched 150 ms after the hung call; end-to-end answers in 444–1,463 ms. Evidence: `docs/evidence/hedge-live-1.5.4.json`.
- **Honest limits:** hedging trades tokens for latency — in the no-fault control run the hedge also fired because the primary took longer than 150 ms. Production should use a hedge delay near the observed p90 of the primary (suggested 2,500 ms) rather than 150 ms. The hosted analyst remains disabled (no gateway secret installed), so this is verified in tests and a live drill, not in hosted traffic.

# 1.5.3 — true rolling-window admission (2026-09-26)

### Fixed
- **Admission is a true rolling window.** `ADMISSION_LUA` no longer derives a fixed ten-minute bucket
  from `TIME`; it stores one sorted-set member per admitted work unit scored with Redis TIME in
  milliseconds, prunes elapsed members and admits on `ZCARD + cost`. This closes the documented
  1.5.1 boundary defect where two windows of quota could be admitted back to back, and makes the
  80-per-key and 400 shared upstream ceilings hold over *any* ten-minute interval.
- Admission keys move to the `si:quota:v3:{admission}:*` namespace (cluster hash tag retained) to
  avoid WRONGTYPE against v2 hashes. Migration procedure is in `docs/LOOPBACK_LIMITER.md`.
- Each admission carries a UUID nonce so same-millisecond concurrent admissions cannot collapse onto
  a single sorted-set member. The nonce is the only app-supplied argument; no app clock reaches the
  script, and `tests/health.test.ts` now asserts exactly that.
- The loopback emulator implements the same rolling semantics and dispatches scripts on a marker
  unique to each production script instead of an `HSET`/`ZREMRANGEBYSCORE` heuristic that silently
  misrouted the new admission script.

### Tests
- `tests/distributed-loopback.test.ts`: a half-elapsed window does not refill quota; a fully elapsed
  one releases exactly the elapsed admissions.
- `tests/redis-lua.test.ts`: against real Redis, 80 stale members are pruned, a fresh 80 are admitted
  and the very next unit is refused; TTLs are retained.
- 84 TypeScript tests + 6 release-gate tests pass; 0 failures.

# 1.5.2 — provenance and release-gate hardening

Preserve demand degradation in signed exports and briefs; expose partial adapters; require primary demand and exact deployment SHA in canaries. Public beta only. See [release record](docs/RELEASE_1_5_2.md).

## 1.5.1 — server-time admission and independently exercised Lua (2026-09-26)
- Admission buckets now derive from Redis TIME rather than application clocks.
- Execute the production Lua against real Redis in CI, in addition to the HTTP contract emulator.
- Health version comes from package.json; partial/invalid Redis configuration is reported blocked.
- Parse Redis URLs; reject malformed URLs, embedded credentials and production loopback.
- Issuer trust requires an explicit public-key pin; configuring a private signer alone is insufficient.
- No commercial readiness claim. See docs/RELEASE_1_5_1.md and migration precautions in docs/LOOPBACK_LIMITER.md.


## 1.5.0 - 2026-09-26

Closes the two premortem items still open after 1.4.1 (PM2, PM3) and puts a visible surface on the 1.4.1 mirror work (PM1). Verified from a clean clone: tsc --noEmit clean, all unit + gate tests pass, next build succeeds.

### PM2 - the strict gate is now verifiable without a cloud credential
- scripts/upstash-rest-emulator.ts speaks the exact Upstash REST EVAL contract production uses (fixed-window admission + rolling-window irrevocable token reservations), with server-side time and fault injection (off|error|malformed|down). Run: npm run redis:loopback -- 8099
- lib/core/redis-endpoint.ts accepts a loopback limiter only when ALLOW_LOOPBACK_REDIS=true AND NODE_ENV!=production. Production still requires TLS and fails closed. Applied to admitScan() and reserveSharedTokens().
- tests/distributed-loopback.test.ts proves it end to end: per-key and global ceilings bind, 100 concurrent admissions admit exactly 80 (never oversell), reservations are irrevocable, and every injected fault resolves to unavailable - never to ok. A verifier can now re-run the distributed-limits claim with zero credentials.

### PM3 - issuer pin is publishable and checkable
- scripts/receipt-keygen.mjs was broken on main (syntax error: a raw newline inside a string literal - the script could not run at all). Fixed, plus --out <pem> to publish and --check <pem> to re-derive a fingerprint.
- docs/evidence/receipt-public-key.pem committed; npm run keys:check prints fingerprint 50a0d302f344490ec6b45f4631aca11ba44282602d2d84ba289550db9009e6f2.
- docs/ISSUER_PIN.md states plainly that the committed private half was generated in an ephemeral sandbox and must be regenerated by the operator before production pinning; until then the gate keeps issuer-trust: no.

### PM1 surface
- components/source-section.tsx now renders a role=status provenance notice for any degraded or mirrored demand source, above the evidence, instead of replacing the evidence with an error line. Mirror data is visibly labelled rather than silently blended.

### Docs
- docs/LOOPBACK_LIMITER.md, docs/ISSUER_PIN.md
## 1.4.1 — 2026-09-26

- **Demand: Reddit mirror fallback with visible provenance (premortem PM1).** Anonymous Reddit is blocked from datacenter IPs, which silently removed 40% of the demand weight. `searchReddit` now tries the primary API, then the PullPush public archive (`REDDIT_MIRROR_URL`, disable with `REDDIT_MIRROR_DISABLED=true`). Mirrored results carry `provenance: 'mirror'`, a user-visible `notice`, are classified `degraded` (never `healthy`), and are weighted at 50%. If the mirror also fails, both reasons are stacked and the original `blocked` classification is preserved — demand is never fabricated.
- New `tests/demand-mirror.test.ts` (4 cases); suite is 72 unit + 6 gate tests, all passing.
- New `scripts/demand-live-probe.ts`. Live run 2026-09-26: primary 403 (blocked) → mirror ok, 25 threads, weight 0.2, 1.37s.

## 1.3.0 — 2026-09-26
- AI analyst memo (`POST /api/analyst`, UI button) grounded in numbered evidence with citation validation and injection fencing.
- Melious router across GLM-5.3, GLM-5.3 Flash, Kimi K3, Qwen 3.8 27B: pre-call token ceilings, <200 ms failover, per-model circuit breakers for 429/5xx/gateway timeouts.
- `pnpm llm:torture` live gate (13/13 passed); `/api/health` exposes breaker + budget state.
- 60 tests.

## 1.2.3 — 2026-09-26
- Downloadable local Opportunity Brief with evidence, uncertainty and human decision worksheet.
- Capsule 1.2 captures model, source/demand health and contributions, actual expansions and dedup metadata under receipt integrity.
- Bounded verify payload raised to 256 KiB; invalid admission costs rejected before either backend.
- Fail-closed beta/strict deployment canary and manual artifact-producing CI workflow.
- 54 tests; no changes to the heuristic score model or claims of independent calibration.
- Public beta only: provisioning, credential rotation, provider pacing, pilots and commercial lifecycle remain open.

## 1.2.2 — Coverage recovery & agent distribution (2026-09-26)
- **Fix production GitHub coverage loss:** a rejected deployment `GITHUB_TOKEN` (HTTP 401) no longer drops the GitHub supply source. The adapter retries anonymously, returns an `ok` result with a non-secret `notice`, and logs a rotation warning. Root cause of the 86% vs 100% live/local coverage gap for "AI code review agent".
- `/api/health` reports credential *presence* (booleans only, never values) for GitHub, OpenAlex, Reddit and the pinned receipt key so misconfigured deployments are visible.
- `/agents` now ships copy-paste configs with the real deployment URL for Cursor, Claude Code, Windsurf, goose, OpenHands and stdio-only clients (fixes wrong bridge env var; was `YOUR-DEPLOYMENT` placeholders).
- New regression test for the 401 fallback (token never echoed in the result).

## 1.2.1 — Trust boundaries (2026-09-26)
- Upgrade Next.js, PostCSS and tsx; lockfile frozen in CI/deploy, high-severity audit gate.
- Bounded JSON/query input, no arbitrary-key quota bypass, compare admission, MCP batch rejection/origin checks and shared Redis admission option for all scan entry points.
- Keep distinct HN item IDs in evidence dedup; blocked PyPI searches are no longer healthy empty results; timeouts cover response bodies.
- Receipt downloads include the verification envelope and demand evidence. Verify distinguishes issuer trust from self-signatures.
- CSV formula defense, watchlist resilience, explicit sharing/privacy disclosure, proposal-only paid plans and honest discussion-proxy/trend language.
- See docs/PRODUCTION_GATES.md for remaining deployment and commercial gates.

# Changelog

## 1.6.11 — 6 October 2026

Qualified evidence across scoring/recommendations/citations; sparse-confidence caps and quadrant abstention; runtime supply contracts; query-aware dedup; fresh scan/cache ordering and strict provenance/freshness; latest-wins UI; honest source weights/counts; source-map-js security patch. Research beta only: semantic/demand/production/pilot gates remain. See [release evidence](docs/RELEASE_1_6_11.md).

## 1.2.0 — 2026-09-26 · “Distribution loops”

### Added
- **README badge** `GET /api/badge?q=` — shields-style SVG (score · verdict), CDN-cached 6h. Every repo that embeds it is a backlink + live ad.
- **Dynamic OG image** for share links `/s/[idea]` (score, verdict, quadrant, confidence) so shared scans render as cards on X/LinkedIn/Slack; Twitter card upgraded to `summary_large_image`.
- **Zero-dependency MCP stdio bridge** `bin/simultaneity-mcp.mjs` (newline-delimited JSON-RPC → hosted `/api/mcp`); one server implementation, two transports. `GET /api/mcp` now returns copy-paste configs for HTTP, `npx mcp-remote` and local stdio.
- `lib/site.ts` single source of truth for the canonical URL.
- 3 new tests (29 total).

### Fixed
- PR #3 was unmergeable (branched before PR #2). Reconciled: v1.1 implementation kept; PR #2 duplicates removed (`lib/sources/reddit.ts` counted Reddit as *supply*, `components/quadrant-panel.tsx`, `tests/quadrant.test.ts`), and the PR #2 stdio script (LSP `Content-Length` framing, which MCP stdio does not use, and the wrong `query` argument) replaced by the bridge.
- `crowding_check` accepts `query` as an alias for `idea` (back-compat with PR #2 clients).
- Canonical URL defaulted to a non-existent `simultaneity-index.vercel.app` in metadata, robots and sitemap → now the real deployment.
- `tsconfig.tsbuildinfo` untracked; test glob quoted so CI runs identically in every shell.

## 1.1.0 — 2026-09-26 · “Battlefield”

### Added
- **Demand heat** from Reddit (app-only OAuth optional), Stack Overflow and Ask HN, with trend detection.
- **Supply × Demand battlefield**: Blue Ocean / Gold Rush / Ghost Town / Bloodbath with a concrete “what to do”.
- **MCP server** (`POST /api/mcp`, Streamable HTTP, stateless) exposing `crowding_check`; `/agents` install page; `public/llms.txt`.
- **GET /api/search?q=** with CORS for agents and curl.
- **Cohort screening** `POST /api/cohort` (novelty ranking, idea-twin collisions, CSV) + `/funds` live demo.
- **Tamper-evident receipts** (SHA-256; Ed25519 when `RECEIPT_PRIVATE_KEY` set) + `POST /api/verify`.
- **Retention**: local watchlist with score deltas, share links `/s/[idea]`, `/pulse` leaderboard, `?q=` deep links.
- **Trust**: transparent query expansion, cross-source dedup, `/methodology`, 20-idea gold set, `pnpm calibrate` → `docs/CALIBRATION.md`.
- **Reliability**: TTL/LRU scan cache, in-flight coalescing, per-IP sliding-window rate limit.
- `/pricing`, sitemap for all public pages, 16 new tests (26 total).

### Changed
- Evidence capsule version `1.1` adds `demandScore` and `quadrant` (backwards compatible).