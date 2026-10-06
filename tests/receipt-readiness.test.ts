import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { receiptReadiness, issueReceipt } from '../lib/scoring/receipt'
import { computeCrowding } from '../lib/scoring/score'
const pem = () => {const keys=generateKeyPairSync('ed25519');return {privateKey:keys.privateKey.export({type:'pkcs8',format:'pem'}).toString(),publicKey:keys.publicKey.export({type:'spki',format:'pem'}).toString()}}
test('actual Ed25519 signer readiness requires a matching independently configured pin',()=>{
 const a=pem(),b=pem()
 assert.equal(receiptReadiness(a.privateKey,a.publicKey,'').ready,true)
 assert.equal(receiptReadiness(a.privateKey,b.publicKey,'').ready,false)
 assert.equal(receiptReadiness('malformed',a.publicKey,'').signer,'invalid')
 assert.equal(receiptReadiness('',a.publicKey,'').signer,'missing')
 assert.equal(receiptReadiness(a.privateKey,'','[]').ready,false)
})
test('invalid configured signer never downgrades silently to an unsigned hash',()=>{
 const c=computeCrowding('test idea',[]).capsule
 assert.throws(()=>issueReceipt(c,'malformed'),/signer configuration/)
 const rsa=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}).toString()
 assert.throws(()=>issueReceipt(c,rsa),/signer configuration/)
})
