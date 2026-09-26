// Generate an Ed25519 receipt keypair for Simultaneity Index.
// Run: node scripts/receipt-keygen.mjs
// Store the PRIVATE key in Vercel as RECEIPT_PRIVATE_KEY; publish the
// PUBLIC key independently and pin it as RECEIPT_PUBLIC_KEY so verifiers
// bind to your issuer identity, not to a key supplied inside a receipt.
import { generateKeyPairSync, createHash } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' })
const pubPem = publicKey.export({ type: 'spki', format: 'pem' })
const fingerprint = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex')

console.log('=== Simultaneity Index receipt keypair (Ed25519) ===')
console.log()
console.log('Fingerprint (SHA-256 of SPKI DER):')
console.log('  ' + fingerprint)
console.log()
console.log('RECEIPT_PRIVATE_KEY (secret — deployment env only, never commit):')
console.log(privPem.split('
').join('\n'))
console.log()
console.log('RECEIPT_PUBLIC_KEY (publish + pin independently):')
console.log(pubPem)
