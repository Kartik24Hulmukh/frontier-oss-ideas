import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retainScanSnapshot, lookupScanSnapshot } from '../lib/core/scan-snapshots'
import { computeCrowding } from '../lib/scoring/score'
import { issueReceipt } from '../lib/scoring/receipt'
const fixture=(query:string)=>{const r=computeCrowding(query,[]);r.receipt=issueReceipt(r.capsule);return r}
test('degraded and superseded snapshots retained immutably; exact receipt required; no provider calls',async()=>{
 const original=globalThis.fetch;let calls=0
 globalThis.fetch=(async()=>{calls++;throw new Error('network must not be called')}) as typeof fetch
 try {
  const a=fixture('snapshot old'),b=fixture('snapshot newer');const receipt={...a.receipt!}
  await retainScanSnapshot(a);await retainScanSnapshot(b)
  a.query='caller mutation';a.capsule.query='caller mutation'
  const first=await lookupScanSnapshot(receipt.digest,receipt)
  assert.equal(first?.query,'snapshot old');first!.query='second mutation'
  assert.equal((await lookupScanSnapshot(receipt.digest,receipt))?.query,'snapshot old')
  assert.equal(await lookupScanSnapshot(receipt.digest,{...receipt,signature:'forged'}),null)
  assert.equal(await lookupScanSnapshot(receipt.digest,{...receipt,extra:'unexpected'}),null)
  assert.equal(await lookupScanSnapshot('a'.repeat(64),receipt),null)
  assert.equal(calls,0)
 }finally{globalThis.fetch=original}
})
test('expired issued snapshot rejects even when a retained record still exists',async()=>{
 const r=fixture('expired snapshot');r.capsule.searchedAt=new Date(Date.now()-1_200_001).toISOString();r.receipt=issueReceipt(r.capsule)
 await retainScanSnapshot(r);assert.equal(await lookupScanSnapshot(r.receipt.digest,r.receipt),null)
})
test('partially configured distributed store fails closed instead of memory fallback',async()=>{
 const before=process.env.UPSTASH_REDIS_REST_URL
 process.env.UPSTASH_REDIS_REST_URL='https://redis.invalid'
 try {await assert.rejects(lookupScanSnapshot('a'.repeat(64),{digest:'a'.repeat(64)}),/STORE_UNAVAILABLE/)}finally{if(before===undefined)delete process.env.UPSTASH_REDIS_REST_URL;else process.env.UPSTASH_REDIS_REST_URL=before}
})
