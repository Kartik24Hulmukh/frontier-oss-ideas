# Production gates — 1.2.3

This is a hardened public beta, not a fully provisioned commercial SaaS. Do not claim production readiness from a green build alone.

## Executable canary (1.2.3)
Run `node scripts/release-gate.mjs https://frontier-oss-ideas.vercel.app --strict --output gate.json`. Manual Actions workflow retains the result. This is not automatically enforced promotion protection, load testing or commercial approval. Read [release scope and remaining work](RELEASE_1_2_3.md).

## Configure before promotion
1. Rotate the GitHub credential shared in chat. Never deploy that broad personal token as GITHUB_TOKEN. Use a dedicated, least-privilege read-only token for searches.
2. In Vercel set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN; then REQUIRE_DISTRIBUTED_LIMITS=true. The proxy applies atomic per-client (80 work units/10m) and global (400/10m) budgets across search, compare, cohort, MCP, badges, shared pages/images and Pulse. Additional search quota is 20/10m per process. Redis outage fails closed. Without Redis, fallback limits are per instance and do not constitute a global production quota.
3. Self-hosted reverse proxies must overwrite forwarded IP headers; direct untrusted forwarded headers are not identity. Vercel uses x-vercel-forwarded-for. Quotas are abuse controls, not authentication.
4. Provision Reddit OAuth and OpenAlex credentials under approved provider terms; inspect coverage. A credential does not guarantee access. Never call discussion heat verified buyer demand.
5. Generate an Ed25519 key offline, store the private PEM only in deployment secrets. Publish/pin the corresponding RECEIPT_PUBLIC_KEY independently. Verify issuerTrusted; signatureValid alone accepts self-signed keys. Old hash-only receipts are not issuer-authenticated. Key-rotation history is not implemented.
6. Add external uptime checks, source-coverage and latency alerts; test Redis outage and concurrent traffic in staging. Tune work-unit budgets with real provider quotas before increasing traffic. Current limits are conservative defaults, not load-test capacity claims.

## 1.2.2 status (verified by this release)
- [x] GitHub 401 no longer silently removes a source: anonymous fallback + `notice`. Operators must still rotate `GITHUB_TOKEN` (anonymous quota is ~10 search req/min) — check `/api/health` `credentials.github` and logs for `GITHUB_TOKEN rejected`.
- [x] Agent config templates published at `/agents` (Cursor, Claude Code, Windsurf, goose, OpenHands, stdio). Registry submissions and real-client integration tests remain open.
- [ ] Redis, independent calibration, billing, durable watchlists/webhooks, pilot contract — still open (unchanged, see below).

## Reproduction
- `pnpm install --frozen-lockfile`
- `pnpm audit --audit-level high`
- `pnpm typecheck && pnpm test && pnpm build`
- `pnpm start` then `node scripts/production-smoke.mjs http://localhost:3000`

## Rollback
Revert the release PR and redeploy the preceding known-good commit if functional regression occurs. Do not downgrade vulnerable dependencies as a routine mitigation; prefer disable scan ingress temporarily or fix forward. Confirm `/api/health`, a real scan, MCP initialize/tool call and malformed-input behavior after every rollout.

## Remaining product gates
- Independent human evaluation: 40–60 held-out lanes, at least two reviewers, pairwise agreement, confidence intervals and documented disagreements. Existing 20 labels are author estimates, not expert validation.
- Demand trend requires stored, comparable time windows; disabled as unknown until then.
- Durable watchlists, email authentication, consent/unsubscribe, billing, entitlements, webhooks and deletion are not implemented. Local watchlists are browser-only.
- Paid pricing is proposal-only. Cohort demo is capped at 25; 200–500-item background jobs are not shipped.
- Shared pages re-run scans; immutable timestamped artifact hosting remains a future feature.
- Cohort ranking is a crowding proxy, not novelty or investment advice. Evidence can overlap and source counts are not unique teams.
- No traction, paid-customer, independent calibration or load-capacity numbers are established by this release.
