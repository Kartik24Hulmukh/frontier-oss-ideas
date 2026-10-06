/** Real Redis, two independent processes. Test transport only; never cloud approval. */
import { createServer } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline'
import assert from 'node:assert/strict'
const exec=promisify(execFile)
async function main(){
 const redis=async(args:string[])=>JSON.parse((await exec(process.env.REDIS_CLI||'/data/redis-test-host/redis-7.4.6/src/redis-cli',['-h','127.0.0.1','-p','6389','-n','13','--json',...args],{maxBuffer:1_048_576})).stdout)
 assert.equal(await redis(['PING']),'PONG')
 let outage=false
 const server=createServer(async(req,res)=>{try{
  if(outage){res.writeHead(503).end();return}
  if(req.headers.authorization!=='Bearer snapshot-drill-only')throw Error()
  let body='';for await(const chunk of req){body+=chunk;if(body.length>524288)throw Error()}
  const args=JSON.parse(body);if(!['SET','GET'].includes(args[0])||!/^si:snapshot:v1:[a-f0-9]{64}$/.test(args[1]))throw Error()
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result:await redis(args.map(String))}))
 }catch{res.writeHead(503).end()}})
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${(server.address() as any).port}`
 const workers=[0,1].map(()=>{const p=spawn(process.execPath,['--import','tsx','scripts/snapshot-redis-worker.ts'],{env:{PATH:process.env.PATH,HOME:'/data',NODE_ENV:'test',ALLOW_LOOPBACK_REDIS:'true',UPSTASH_REDIS_REST_URL:url,UPSTASH_REDIS_REST_TOKEN:'snapshot-drill-only'},stdio:['pipe','pipe','inherit']});let seq=0;const pending=new Map<number,(v:any)=>void>();createInterface({input:p.stdout}).on('line',line=>{const v=JSON.parse(line);pending.get(v.id)?.(v);pending.delete(v.id)});return{pid:p.pid,close:()=>p.kill(),run:(v:object)=>new Promise<any>(resolve=>{const id=++seq;pending.set(id,resolve);p.stdin.write(JSON.stringify({id,...v})+'\n')})}})
 const keys:string[]=[]
 try{
  assert.notEqual(workers[0].pid,workers[1].pid)
  const saved=(await workers[0].run({op:'save',query:'cross instance snapshot'})).result;const snapshotId=saved.receipt.digest;keys.push('si:snapshot:v1:'+snapshotId)
  const loaded=await workers[1].run({op:'load',snapshotId,receipt:saved.receipt});assert.deepEqual(loaded.result,saved)
  assert.equal((await workers[1].run({op:'load',snapshotId,receipt:{...saved.receipt,algorithm:'ed25519+sha256'}})).result,null)
  assert.ok(await redis(['TTL',keys[0]])>1100)
  outage=true;assert.equal((await workers[1].run({op:'load',snapshotId,receipt:saved.receipt})).error,'store unavailable')
  outage=false;assert.deepEqual((await workers[1].run({op:'load',snapshotId,receipt:saved.receipt})).result,saved)
  console.log(JSON.stringify({passed:true,scope:'local real Redis DB13, not managed deployment',pids:workers.map(w=>w.pid),cases:['independent process retrieval','receipt mismatch rejected','bounded TTL','store outage fails closed','recovery same snapshot']},null,2))
 }finally{workers.forEach(w=>w.close());if(keys.length)await redis(['DEL',...keys]);await new Promise<void>(r=>server.close(()=>r()))}
}
main().then(()=>process.exit(0)).catch(()=>{console.error('Snapshot Redis drill failed');process.exit(1)})
