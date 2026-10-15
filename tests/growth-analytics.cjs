const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../browser-growth-analytics.js'),'utf8');
function boot({local=new Map(),tab=new Map(),consent=true,fail=false,search='?utm_source=discord&utm_medium=community&utm_campaign=rebuild&email=secret',gpc=false,clock={now:Date.now()}}={}){
 if(!local.has('SDF_USAGE_V236'))local.set('SDF_USAGE_V236',JSON.stringify({schema:2,basic:consent,consent,queue:[]}));
 class DateNow extends Date{static now(){return clock.now}}
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}),calls=[],hooks={};
 const c={window:{addEventListener:(e,f)=>hooks[e]=f,dispatchEvent:e=>hooks[e.type]?.()},document:{hidden:false,addEventListener:(e,f)=>hooks[e]=f},localStorage:storage(local),sessionStorage:storage(tab),crypto:require('node:crypto').webcrypto,navigator:{onLine:true,globalPrivacyControl:gpc},location:{hostname:'localhost',search},Date:DateNow,URLSearchParams,Set,JSON,AbortController,Event,setTimeout(){return 1},clearTimeout(){},fetch:async(u,o)=>{calls.push({u,o,payload:JSON.parse(o.body)});if(fail)throw Error('offline');return{ok:true,json:async()=>({ok:true})}}};
 vm.runInNewContext(code,c);return{api:c.window.SDF_BROWSER_ANALYTICS,local,tab,c,calls,clock};
}
test('Explicit consent is required and arbitrary private metadata never reaches transport',async()=>{
 const no=boot({consent:false});assert.equal(no.api.record('landing_view'),false);await no.api.flush();assert.equal(no.calls.length,0);assert.equal(no.local.has('SDF_BROWSER_FUNNEL_V1'),false);
 const yes=boot();yes.api.record('landing_view',{context:'landing',email:'private',token:'secret',save:'data'});await yes.api.flush();const event=yes.calls[0].payload.events[0];assert.equal(event.email,undefined);assert.equal(event.token,undefined);assert.equal(event.save,undefined);assert.equal(event.utm_source,'discord');assert.equal(yes.calls[0].o.credentials,'omit');assert.equal(yes.calls[0].o.referrerPolicy,'no-referrer');assert.equal(yes.calls[0].payload.qa,true);
});
test('Landing, click, gameplay and reload preserve one session/source with stable event IDs',async()=>{
 const h=boot();h.api.record('landing_view');h.api.record('play_click');await h.api.flush();
 const resumed=boot({local:h.local,tab:h.tab,search:''});resumed.api.record('game_ready');resumed.api.record('dynasty_created');resumed.api.record('first_recruit');resumed.api.record('game_completed');await resumed.api.flush();
 const events=[...h.calls[0].payload.events,...resumed.calls[0].payload.events];assert.equal(new Set(events.map(e=>e.session)).size,1);assert.equal(new Set(events.map(e=>e.cohort)).size,1);assert(events.every(e=>e.utm_source==='discord'));assert.equal(resumed.api.record('game_ready'),false);
});
test('Thirty minutes inactivity starts a new session without changing the consented cohort',async()=>{
 const h=boot();h.api.record('game_ready');await h.api.flush();h.clock.now+=1800001;const r=boot({local:h.local,tab:h.tab,search:'',clock:h.clock});r.api.record('game_ready');await r.api.flush();assert.notEqual(h.calls[0].payload.events[0].session,r.calls[0].payload.events[0].session);assert.equal(h.calls[0].payload.events[0].cohort,r.calls[0].payload.events[0].cohort);assert.equal(r.calls[0].payload.events[0].utm_source,'direct');
});
test('Offline retry preserves IDs and queue is bounded',async()=>{
 const h=boot({fail:true});for(let i=0;i<130;i++)h.api.record('game_completed');await h.api.flush();const stored=JSON.parse(h.local.get('SDF_BROWSER_FUNNEL_V1'));assert.equal(stored.queue.length,100);
 const r=boot({local:h.local,tab:h.tab});await r.api.flush();assert.deepEqual(r.calls[0].payload.events.map(e=>e.id),h.calls[0].payload.events.map(e=>e.id));
});
test('Revocation clears pending identifiers and prevents later delivery or retroactive attribution',async()=>{
 const h=boot();h.api.record('landing_view');const old=JSON.parse(h.local.get('SDF_BROWSER_FUNNEL_V1')).cohort;h.api.setConsent(false);await h.api.flush();assert.equal(h.calls.length,0);assert.equal(h.local.has('SDF_BROWSER_FUNNEL_V1'),false);assert.equal(h.tab.has('SDF_BROWSER_FUNNEL_SESSION_V1'),false);
 h.api.setConsent(true);h.api.record('game_ready');await h.api.flush();assert.notEqual(old,h.calls[0].payload.events[0].cohort);assert.deepEqual(h.calls[0].payload.events.map(e=>e.event),['game_ready']);
});
test('Global Privacy Control prevents linked collection even with an old opt-in',async()=>{const h=boot({gpc:true});assert.equal(h.api.record('game_ready'),false);await h.api.flush();assert.equal(h.calls.length,0)});
test('UTM validation rejects arbitrary query data, unknown sources and unsafe campaigns',()=>{const h=boot();const a=h.api.attribution('?utm_source=private@example.com&utm_medium=hack&utm_campaign=private%40example.com&access_token=secret');assert.deepEqual(JSON.parse(JSON.stringify(a)),{utm_source:'direct',utm_medium:'direct',utm_campaign:''})});
test('A return event requires a later UTC day and is emitted once in a session',async()=>{const h=boot();h.api.record('game_ready');await h.api.flush();h.clock.now+=86400000;const r=boot({local:h.local,tab:h.tab,clock:h.clock});r.api.sync();r.api.sync();await r.api.flush();assert.equal(r.calls[0].payload.events.filter(e=>e.event==='return').length,1)});
test('Stale or damaged queue entries cannot block fresh events or transmit extra stored data',async()=>{const h=boot();h.api.record('game_ready');const saved=JSON.parse(h.local.get('SDF_BROWSER_FUNNEL_V1'));saved.queue[0].save='private';saved.queue.push({...saved.queue[0],id:crypto.randomUUID(),at:'2000-01-01'});saved.queue.push({event:'game_completed',token:'secret'});h.local.set('SDF_BROWSER_FUNNEL_V1',JSON.stringify(saved));const r=boot({local:h.local,tab:h.tab});r.api.record('game_completed');await r.api.flush();assert.equal(r.calls[0].payload.events.length,2);assert(r.calls[0].payload.events.every(e=>!('save' in e)&&!('token' in e)))});
