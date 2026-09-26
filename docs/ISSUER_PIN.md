# Receipt issuer pin (PM3)

A Simultaneity receipt proves two different things, and we keep them separate on purpose:

| Claim | Mechanism | What it does NOT prove |
|---|---|---|
| The capsule was not edited after issue | SHA-256 digest over canonical JSON | who issued it |
| The capsule came from **this** issuer | Ed25519 signature over the digest, verified against a **deployment-pinned** public key (`RECEIPT_PUBLIC_KEY`) | that the evidence is correct |

`/api/verify` returns `issuerTrusted: true` only when the receipt signature verifies against the
key pinned in the deployment environment - never against the key carried inside the receipt.
A receipt that ships its own key is self-signed and is reported as `signatureValid` but
`issuerTrusted: false`.

## Published key

`docs/evidence/receipt-public-key.pem` is the committed public half, published in the repo so a
third party can pin it out-of-band (repo history + deployment env must agree).

Verify the fingerprint yourself:

```
npm run keys:check
# algorithm:   ed25519
# fingerprint: 50a0d302f344490ec6b45f4631aca11ba44282602d2d84ba289550db9009e6f2
```

**Operator action required before production pinning.** The committed pair was generated inside an
ephemeral build sandbox, so its private half must be treated as compromised by construction. Before
the Sept-Oct 2026 launch the operator must run:

```
node scripts/receipt-keygen.mjs --out docs/evidence/receipt-public-key.pem
```

store the printed `RECEIPT_PRIVATE_KEY` in the deployment secret store only, commit the regenerated
public PEM, and announce the new fingerprint. Until that happens the release gate keeps
`issuer-trust: no` and the product does not claim verifiable issuer identity. We would rather ship a
red gate than a signature nobody should trust.
