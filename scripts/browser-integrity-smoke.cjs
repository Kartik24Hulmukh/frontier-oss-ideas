const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert/strict');
const base=process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const out=process.env.SMOKE_OUT || 'docs/evidence/continuation-1.6.11';
fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(); const checks=[];
 const check=(name,kind='real-browser')=>checks.push({name,passed:true,kind});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(base); await page.getByLabel('Describe your idea').fill('AI code review agent'); await page.getByRole('button',{name:'Run scan',exact:true}).click();
  await page.locator('[aria-label="Crowding score"]').waitFor({timeout:65000}); check('real scan renders score and eight supply sources');
  const response=await context.request.post(base+'/api/search',{data:{query:'AI code review agent'}}); const scan=await response.json();
  assert.equal(scan.sources.length,8); assert.equal(scan.capsule.modelVersion,'crowding-1.3');
  const text=await page.locator('body').innerText(); assert.ok(text.toLowerCase().includes('8 supply + 3 demand adapters')); assert.ok(!text.toLowerCase().includes('build here')); check('actual source-count and investigate-first copy');
  await page.screenshot({path:out+'/browser-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'☆ Watch this lane',exact:true}).click(); await page.locator('[aria-label="Watchlist"]').waitFor(); check('watchlist saves successful scan');
  await page.reload(); await page.locator('[aria-label="Watchlist"]').waitFor(); check('watchlist persists across reload');
  await page.getByRole('button',{name:'Re-scan',exact:true}).click(); await page.locator('[aria-label="Crowding score"]').waitFor({timeout:65000}); check('saved lane rescans');
  for (const [label,file] of [['Download evidence','download-evidence.json'],['Download decision brief','download-brief.md']]) {
   const promise=page.waitForEvent('download'); await page.getByRole('button',{name:label,exact:true}).click(); const download=await promise; await download.saveAs(out+'/'+file);
   assert.ok(fs.statSync(out+'/'+file).size>100);check(label);
  }
  const evidence=JSON.parse(fs.readFileSync(out+'/download-evidence.json','utf8'));
  const verified=await context.request.post(base+'/api/verify',{data:evidence});assert.equal((await verified.json()).digestMatches,true);check('downloaded receipt verifies over HTTP');
  await page.getByRole('button',{name:'AI analyst memo',exact:true}).click();await page.getByText('AI analyst not configured',{exact:false}).waitFor({timeout:65000}).catch(async()=>{await page.locator('[aria-label="AI analyst memo"]').waitFor({timeout:65000})});
  assert.ok((await page.locator('[aria-label="AI analyst memo"]').innerText()).toLowerCase().includes('not configured'));check('unconfigured analyst degrades visibly without losing deterministic scan');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/browser-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));check('mobile viewport has no horizontal overflow');
  await page.goto(base+'/methodology');assert.ok((await page.locator('body').innerText()).includes('crates.io 0.04'));check('methodology publishes exact weights');
  await page.setViewportSize({width:1280,height:900});
  // Synthetic request-order/failure scenarios. They prove UI handling, not provider truth.
  const fake=(query)=>({...scan,query,normalizedQuery:query,capsule:{...scan.capsule,query},wedges:[{title:'Synthetic scenario',rationale:'Browser regression only',priority:'low'}]});
  await page.goto(base);await page.evaluate(()=>localStorage.setItem('simultaneity.watchlist.v1',JSON.stringify(['slow old scan','fast latest scan','failing scan'].map(query=>({query,points:[]})))));await page.reload();
  let phase='race'; await page.route('**/api/search',async route=>{
   const query=route.request().postDataJSON().query;
   if(query==='slow old scan') await new Promise(r=>setTimeout(r,500));
   try {await route.fulfill({status:query==='failing scan'?500:200,contentType:'application/json',body:JSON.stringify(query==='failing scan'?{error:'Synthetic scan failure'}:fake(query))})} catch{}
  });
  const rescan=(q)=>page.locator('[aria-label="Watchlist"] li').filter({hasText:q}).getByRole('button',{name:'Re-scan',exact:true}).click();
  await rescan('slow old scan');await rescan('fast latest scan');await page.locator('[aria-label="Crowding score"]').waitFor();await page.waitForTimeout(700);
  assert.ok((await page.locator('[aria-label="Crowding score"]').innerText()).toLowerCase().includes('fast latest scan'));check('late older scan cannot overwrite newer result','synthetic-browser');
  await rescan('failing scan');await page.getByRole('alert').filter({hasText:'Synthetic scan failure'}).waitFor();assert.equal(await page.locator('[aria-label="Crowding score"]').count(),0);check('failed scan clears previous decision evidence','synthetic-browser');
  await rescan('fast latest scan');await page.locator('[aria-label="Crowding score"]').waitFor();
  await page.route('**/api/analyst',async route=>{await new Promise(r=>setTimeout(r,500));try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({memo:'OBSOLETE ANALYST SENTINEL',route:{model:'synthetic',attempts:[]}})})}catch{}});
  await page.getByRole('button',{name:'AI analyst memo',exact:true}).click();await rescan('slow old scan');await page.locator('[aria-label="Crowding score"]').waitFor();await page.waitForTimeout(700);
  assert.ok(!(await page.locator('body').innerText()).includes('OBSOLETE ANALYST SENTINEL'));check('old analyst memo cannot attach to a new idea','synthetic-browser');
  assert.deepEqual(errors,[]);check('no uncaught page errors across tested journey');
  fs.writeFileSync(out+'/browser.json',JSON.stringify({passed:true,at:new Date().toISOString(),checks,limitations:'Real Chromium against local production build; three synthetic races/failures labelled. Not consented customer research, external accessibility certification or target deployment proof.'},null,2));
  console.log(JSON.stringify({passed:true,checks:checks.length}));
 } catch(e){fs.writeFileSync(out+'/browser.json',JSON.stringify({passed:false,error:e.message,checks,errors},null,2));throw e}
 finally {await browser.close()}
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)});
