// Generate an Ed25519 receipt keypair for Simultaneity Index.
// Run: node scripts/receipt-keygen.mjs [--out docs/evidence/receipt-public-key.pem]
// Store the PRIVATE key in Vercel as RECEIPT_PRIVATE_KEY; publish the
// PUBLIC key independently and pin it as RECEIPT_PUBLIC_KEY so verifiers
// bind to your issuer identity, not to a key supplied inside a receipt.
//
// PM3 fix: the public half is committed to docs/evidence so a third party can
// verify an issuer pin without trusting anything this service hands them, and
// --check <pem> re-derives the fingerprint of an existing published key.
import { generateKeyPairSync, createHash, createPublicKey } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

const fingerprintOf = (key) =>
  createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex')

const check = flag('--check')
if (check) {
  const pem = readFileSync(check, 'utf8')
  const key = createPublicKey(pem)
  if (key.asymmetricKeyType !== 'ed25519') {
    console.error('NOT ED25519: ' + check)
    process.exit(1)
  }
  console.log('file:        ' + check)
  console.log('algorithm:   ed25519')
  console.log('fingerprint: ' + fingerprintOf(key))
  process.exit(0)
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
const fingerprint = fingerprintOf(publicKey)

const out = flag('--out')
if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, pubPem)
}

console.log('=== Simultaneity Index receipt keypair (Ed25519) ===')
console.log()
console.log('Fingerprint (SHA-256 of SPKI DER):')
console.log('  ' + fingerprint)
console.log()
console.log('RECEIPT_PRIVATE_KEY (secret - deployment env only, never commit):')
console.log(JSON.stringify(privPem).slice(1, -1))
console.log()
console.log('RECEIPT_PUBLIC_KEY (publish + pin independently):')
console.log(pubPem)
if (out) console.log('public key written to ' + out)
