import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { issueReceipt } from '../lib/scoring/receipt'
import { loadShare, saveShare, shareToken, validShareToken } from '../lib/shares'
import type { EvidenceCapsule } from '../lib/types'
const capsule: EvidenceCapsule={version:'1.2',query:'private local agents',score:42,confidence:88,verdict:'Early movers',searchedAt:'2026-09-27T00:00:00.000Z',evidenceLinks:[],disclaimer:'test'}
test('immutable shares require a pinned issuer and are idempotent',async()=>{
 const old={...process.env}; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; (process.env as Record<string, string | undefined>).NODE_ENV='test'
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'); const priv=privateKey.export({type:'pkcs8',format:'pem'}).toString(), pub=publicKey.export({type:'spki',format:'pem'}).toString(); process.env.RECEIPT_PUBLIC_KEY=pub
 try { const receipt=issueReceipt(capsule,priv); const first=await saveShare(capsule,receipt), second=await saveShare(capsule,receipt); assert.equal(first.created,true); assert.equal(second.created,false); assert.equal(first.token,shareToken(capsule)); assert.equal(validShareToken(first.token),true); assert.deepEqual((await loadShare(first.token))?.capsule,capsule) } finally { process.env=old }
})
test('hash-only and self-signed shares are rejected',async()=>{ const old={...process.env}; (process.env as Record<string, string | undefined>).NODE_ENV='test'; delete process.env.RECEIPT_PUBLIC_KEY; try { await assert.rejects(saveShare(capsule,issueReceipt(capsule)),/UNTRUSTED/) } finally { process.env=old } })
