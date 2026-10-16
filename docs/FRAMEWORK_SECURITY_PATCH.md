# Next.js security patch — 16.3.8

[VF] Fresh registry audit on the existing 16.3.6 lockfile reports six Next.js advisories: one high, four moderate, one low. Upgrading only the pinned framework to 16.3.8 and synchronizing npm/pnpm lockfiles removes all six from this audit. This is dependency remediation, not a penetration test or production GO.

## What / why

- `package.json`: `next` 16.3.6 → 16.3.8. React and unrelated dependencies unchanged.
- Both lockfiles updated for the corresponding Next.js/env/SWC artifacts. Frozen pnpm installation succeeds.
- High advisory: https://github.com/advisories/GHSA-cjq9-62q9-8jv4 (image optimization SSRF).
- Other audited advisories: GHSA-3w37-wq28-93x7, GHSA-4jqv-mc3x-m676, GHSA-39w2-rjm5-chcv, GHSA-f87g-xv8r-7p7x, GHSA-mcj8-r9mp-w47p.

## Verification

[VF] Isolated branch based on `dd9c315901e4c0c1772f021b501478b2bc20555f`, without the concurrent router repair.

- `pnpm install --frozen-lockfile`: passed.
- `pnpm audit --json`: zero info/low/moderate/high/critical findings at execution time; raw before/after reports in `docs/evidence/framework-security/`.
- `REDIS_TEST_PORT=6391 REDIS_CLI=<local-test-cli> npm run verify`: typecheck/build pass; 1,692/1,692 TypeScript tests and 14/14 JavaScript tests pass, zero skips. Redis 7.4.6 is a separate loopback-only process built for this test, not a managed cloud service.
- No new credential use or environment/deployment configuration changes. Do not treat a preview or build as an exact-SHA production acceptance receipt.

## Premortem / state-map delta

Newly disclosed dependency flaw → unchanged version passes old tests but fresh audit/CI fails → pin the minimal patched release and preserve both lockfiles → clean audit plus full tests/build. Package and lockfile rows remain 🟡 Partial for overall production acceptance; dependency-only repair is locally verified. No blanket whole-repository security-audit claim is made.

## Release boundary

Merge this dependency repair before the router PR; then update/retest that branch on patched main. Do not bypass a failing required audit check. Deployment strict canary, managed Redis/trusted signer, primary-source access, semantic evaluation, funded rotated Melious and real customer utility remain separate gates.
