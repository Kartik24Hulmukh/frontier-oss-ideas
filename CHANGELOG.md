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
