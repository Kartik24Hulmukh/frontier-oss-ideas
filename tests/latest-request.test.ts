import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LatestRequest } from '../lib/core/latest-request'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
test('latest wins even when old transport ignores cancellation', () => {
  const requests = new LatestRequest(); const old = requests.begin(); const current = requests.begin()
  assert.equal(old.signal.aborted, true); assert.equal(old.isCurrent(), false); assert.equal(current.isCurrent(), true)
  old.finish(); assert.equal(current.signal.aborted,false); current.finish()
})
test('explicit cancellation invalidates responses and aborts transport', () => {
  const requests = new LatestRequest(); const request = requests.begin(); requests.cancel()
  assert.equal(request.isCurrent(),false); assert.equal(request.signal.aborted,true); request.finish()
})
test('timeout aborts transport while retaining authority to show an error', async () => {
  const requests = new LatestRequest(); const request = requests.begin(5); await sleep(20)
  assert.equal(request.signal.aborted,true); assert.equal(request.isCurrent(),true); assert.match(request.signal.reason.message,/timed out/); request.finish()
})
test('finished request cancels timer without aborting successful data', async () => {
  const request = new LatestRequest().begin(5); request.finish(); await sleep(20); assert.equal(request.signal.aborted,false)
})
test('cancelled old timer cannot abort a new request', async () => {
  const requests = new LatestRequest(); requests.begin(5); const current = requests.begin(1000); await sleep(20)
  assert.equal(current.signal.aborted,false); current.finish()
})
test('scan change invalidates dependent analyst and proof channels', () => {
  const analyst = new LatestRequest(); const proof = new LatestRequest(); const a=analyst.begin(); const p=proof.begin()
  analyst.cancel(); proof.cancel(); assert.equal(a.isCurrent(),false); assert.equal(p.isCurrent(),false)
})

test('late success from an abort-ignoring transport cannot commit after deadline', async () => {
  const request=new LatestRequest().begin(5); await sleep(20)
  assert.equal(request.isCurrent(),true); assert.equal(request.canCommit(),false); request.finish()
})
