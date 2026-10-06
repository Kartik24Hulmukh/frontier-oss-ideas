import { createInterface } from 'node:readline'
import { retainScanSnapshot, lookupScanSnapshot } from '../lib/core/scan-snapshots'
import { computeCrowding } from '../lib/scoring/score'
import { issueReceipt } from '../lib/scoring/receipt'
createInterface({input:process.stdin}).on('line',async line=>{const {id,op,query,snapshotId,receipt}=JSON.parse(line);try{
 let result
 if(op==='save'){result=computeCrowding(query,[]);result.receipt=issueReceipt(result.capsule);await retainScanSnapshot(result)}
 else result=await lookupScanSnapshot(snapshotId,receipt)
 console.log(JSON.stringify({id,result}))
}catch{console.log(JSON.stringify({id,error:'store unavailable'}))}})
