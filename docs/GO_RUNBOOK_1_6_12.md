# From research beta to an evidence-backed GO

**No launch approval yet.** Code is ready for an operator-controlled verification increment; production/business evidence is not available in the agent environment. Never paste secrets in chat or reuse exposed credentials. Connected GitHub is sufficient for source delivery; deployment configuration needs an authenticated project connection/operator.

## Operator sequence — do not skip or fake

1. Rotate/revoke exposed GitHub/Melious credentials in their respective accounts; use least privilege. Do not record values in git, logs, screenshots, receipts or commands. Confirm revocation with operator evidence.
2. Authorize the correct Vercel project through its official connection, or configure it in the account's deployment settings. Agent OAuth attempts did not produce a durable successful result; access must not be assumed.
3. Provision managed Redis REST over TLS with suitable ACL/commands, capacity and no eviction/deletion of active quota debt. Set endpoint/token as secret environment variables; use matched namespace/policies across replicas. After a controlled rollout set REQUIRE_DISTRIBUTED_LIMITS=true. A local Redis drill is not a cloud acceptance test.
4. Create an operator-owned Ed25519 signer without printing its private key. Store it only in secret deployment configuration. Publish the public pin separately through a trusted operator-controlled channel and configure the matching verification pin/keyring. Never make a random/self-issued key “trusted” merely to green a test. A malformed signer must503, not downgrade.
5. Obtain approved GitHub/OpenAlex/Reddit access and verify actual source policies, credentials, account/egress quotas and privacy terms. Resolve partial/CAPTCHA/degraded-source behavior without treating mirrors as primary or disabling the strict healthy-source requirement. Current provider-ID Redis buckets are not account-wide quotas across independent deployments; Algolia supply/demand IDs are separate.
6. Deploy the merged exact source SHA. Check `/api/ready`200 and run `node scripts/release-gate.mjs https://<target> --strict --expected-sha <fullSHA> --output <evidencefile>`. This includes a fresh scan and tamper rejection. Keep failed reports.
7. Independently exercise target replicas/ingress, bounded load, managed-store outages/recovery, quota debt, provider-required waits, kill switch, rollback and alert/on-call ownership. Preapprove spend and traffic; do not stress public services unboundedly. Restore after the drill and bind evidence to deployed SHA/config/time.
8. Optional AI stays off until approved funded/rotated credentials, actual catalog/model IDs and useful completions are verified. Test all requested models,429/5xx/timeouts/usage/unknown cancellation and required waits with bounded approved spend. Report failover dispatch and completion separately. Reconcile actual account billing; estimates are not invoices.
9. Freeze the current method and a genuinely held-out independent relevance/role/identity evaluation before testing it. Use two real reviewers, preserve disagreements/unknowns and intervals, do not tune on the held-out set. Existing author gold labels are not independent validation.
10. Run the existing consented analyst decision-replay protocol. Observe actual baseline, supported incremental decision outcomes and voluntary new tasks; record negative/inconclusive results. The council's proposed≥3/5 utility/repeat thresholds are not measured outcomes or PMF. Confirm real buyer authority/commitments before commercial scope.

## Allowed decision categories

- **Implementation acceptance:** local tested repair, not cloud/customer proof.
- **Supervised artifact pilot:** conditional on consent, manual evidence review, safe generation and agreed owner/caps; no pilot has been performed here.
- **Production service GO:** actual operational/source/semantic gates on exact deployment, approved privacy/terms and accountable operator.
- **Paid GO:** production prerequisites plus real utility/repeat/buyer evidence and the lifecycle features actually promised. Do not claim existing billing, alerts or durable accounts.

All1,201 research and608 repository-doc source occurrences remain traceable in the previous raw ledgers. The42 canonical criteria and28 proposed semantic cases are in `GO_ACCEPTANCE_1_6_12.csv`; source occurrences are not1,809 unique implemented feature tasks. No requirement is marked completed solely because it was extracted, proposed or discussed by an AI agent.
