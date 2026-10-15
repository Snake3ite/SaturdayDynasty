const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const code=stripTypeScriptTypes(fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/usage-reporting/index.ts'),'utf8'));
function setup(){let handler;const calls=[];const c={Deno:{serve:f=>handler=f,env:{get:k=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-secret',RESEND_API_KEY:'email-secret'}[k])}},Request,Response,Set,Date,JSON,TextEncoder,Uint8Array,crypto:require('node:crypto').webcrypto,fetch:async(url,opts)=>{calls.push({url,opts});return Response.json({ok:true})}};vm.runInNewContext(code,c);return{handler,calls,c}}

test('The complete current product catalog is accepted together with ad impressions',async()=>{
 const h=setup(),products=['all_access_pass','scenario_impossible_rebuilds','scenario_championship_pressure','scenario_recruiting_nightmares','recruiting_boost','program_rescue','season_booster','supporter_rookie','supporter_all_american','supporter_legend'];
 const events=products.map(product=>({id:crypto.randomUUID(),event:'purchase_confirmed',product,at:new Date().toISOString()}));events.push({id:crypto.randomUUID(),event:'reward_impression',placement:'reward_budget',at:new Date().toISOString()});
 const r=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'events',platform:'android',events})}));assert.equal(r.status,200);assert.equal(JSON.parse(h.calls[0].opts.body).p_events.length,11);
});
test('Public events validate allowlist, hash device, omit arbitrary user data',async()=>{
 const h=setup(),device=crypto.randomUUID();const r=await h.handler(new Request('https://test.invalid',{method:'POST',headers:{origin:'https://saturdaydynasty.ctoolis.workers.dev'},body:JSON.stringify({action:'events',device,platform:'android',events:[{id:crypto.randomUUID(),event:'game_completed',at:new Date().toISOString(),save:'never upload this'}]})}));assert.equal(r.status,200);const body=JSON.parse(h.calls[0].opts.body);assert.match(body.p_device,/^[a-f0-9]{64}$/);assert.notEqual(body.p_device,device);assert.equal(body.p_events[0].save,undefined);assert.equal(body.p_events[0].event,'game_completed');
});
test('Disallowed origin, malformed events and unauthenticated report cannot trigger mail',async()=>{
 const h=setup();for(const [p,origin,status] of [[{action:'report'},'',401],[{action:'events'},'https://bad.invalid',403],[{action:'events',device:crypto.randomUUID(),platform:'browser',events:[{event:'full_save'}]},'',400]]){const r=await h.handler(new Request('https://test.invalid',{method:'POST',headers:{origin},body:JSON.stringify(p)}));assert.equal(r.status,status)}assert.equal(h.calls.length,0);
});
test('Email totals separate 24h/all-time, platforms, ad impressions and products',()=>{
 const h=setup(),now=new Date().toISOString();h.c.fixture={key:'test',test:true,from:now,to:now,started_at:now,devices:[],active:[],last24:[{platform:'android',event:'game_completed',total:3},{platform:'browser',event:'purchase_confirmed',product:'commissioner_mode',total:1}],alltime:[{platform:'android',event:'game_completed',total:70},{platform:'android',event:'reward_shown',total:2},{platform:'android',event:'interstitial_shown',total:5}]};const report=vm.runInNewContext('formatReport(fixture)',h.c);assert.match(report.text,/Games completed: 3 \| 70/);assert.match(report.text,/Full-screen ad presentations: 0 \| 7/);assert.match(report.text,/commissioner_mode purchase callbacks \(unverified\): 1 \| 0/);assert.deepEqual(Array.from(report.to),['ctoolis@gmail.com']);assert.match(report.text,/not Google Play install totals/);
});

test('Basic events omit device identity while preserving deduplication IDs',async()=>{
 const h=setup(),id=crypto.randomUUID();const r=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'events',platform:'browser',events:[{id,event:'reporting_started',at:new Date().toISOString()}]})}));assert.equal(r.status,200);const body=JSON.parse(h.calls[0].opts.body);assert.equal(body.p_device,null);assert.equal(body.p_events[0].id,id);
});
test('Malformed supplied device ID is rejected instead of treated as basic',async()=>{
 const h=setup();for(const device of ['',123,'not-a-uuid']){const r=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'events',device,platform:'browser',events:[{id:crypto.randomUUID(),event:'session',at:new Date().toISOString()}]})}));assert.equal(r.status,400)}assert.equal(h.calls.length,0);
});

test('Scenario milestones are accepted as basic events without a tracking identifier',async()=>{const h=setup();const r=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'events',platform:'android',events:['scenario_started','scenario_completed','scenario_ended','first_season_finished','first_game_under_5m','first_game_under_15m','first_game_over_15m'].map(event=>({id:crypto.randomUUID(),event,at:new Date().toISOString()}))})}));assert.equal(r.status,200);assert.equal(JSON.parse(h.calls[0].opts.body).p_device,null)});
test('Retention email uses mature cohort denominators and does not divide zero',()=>{const h=setup(),now=new Date().toISOString();h.c.fixture={from:now,to:now,started_at:now,devices:[],active:[],last24:[],alltime:[],retention:[{platform:'android',eligible1:10,returned1:3,eligible7:0,returned7:0}]};const report=vm.runInNewContext('formatReport(fixture)',h.c);assert.match(report.text,/3\/10 \(30.0%\)/);assert.match(report.text,/Not enough elapsed time/);assert.match(report.text,/not all installs/);assert.doesNotMatch(report.text,/NaN|Infinity/)});

test('SDK impression totals remain separate from presentations and retain placement detail',()=>{
 const h=setup(),now=new Date().toISOString();h.c.fixture={key:'test',test:true,from:now,to:now,started_at:now,devices:[],active:[],last24:[
  {platform:'android',event:'reward_shown',placement:'reward_hours',total:4},{platform:'android',event:'interstitial_shown',placement:'season_end',total:1},
  {platform:'android',event:'reward_impression',placement:'reward_hours',total:3},{platform:'android',event:'reward_impression',placement:'reward_nil',total:2},{platform:'android',event:'interstitial_impression',placement:'season_end',total:1}
 ],alltime:[
  {platform:'android',event:'reward_shown',placement:'reward_hours',total:8},{platform:'android',event:'reward_shown',placement:'reward_nil',total:6},{platform:'android',event:'reward_shown',placement:'reward_budget',total:5},{platform:'android',event:'interstitial_shown',placement:'season_end',total:4},
  {platform:'android',event:'reward_impression',placement:'reward_hours',total:7},{platform:'android',event:'reward_impression',placement:'reward_nil',total:9},{platform:'android',event:'reward_impression',placement:'reward_budget',total:6},{platform:'android',event:'interstitial_impression',placement:'season_end',total:3}
 ]};
 const report=vm.runInNewContext('formatReport(fixture)',h.c);assert.match(report.text,/Full-screen ad presentations: 5 \| 23/);assert.match(report.text,/Rewarded video presentations: 4 \| 19/);assert.match(report.text,/Ad impressions recorded by Google SDK: 6 \| 25/);assert.match(report.text,/Recruiting-hours ad impressions: 3 \| 7/);assert.match(report.text,/NIL ad impressions: 2 \| 9/);assert.match(report.text,/Athletics Budget ad impressions: 0 \| 6/);assert.match(report.text,/Season-end interstitial impressions: 1 \| 3/);assert.match(report.text,/exact reporting window/);
});
test('Impression ingestion validates event-to-placement mapping and accepts old presentation queues',async()=>{
 const h=setup(),now=new Date().toISOString();const events=[
  {event:'reward_impression',placement:'reward_hours'},{event:'interstitial_impression',placement:'season_end'},{event:'reward_shown'},{event:'interstitial_shown'}
 ].map(e=>({id:crypto.randomUUID(),at:now,...e}));
 const r=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'events',platform:'android',events})}));assert.equal(r.status,200);const clean=JSON.parse(h.calls[0].opts.body).p_events;assert.deepEqual(clean.map(e=>e.placement),['reward_hours','season_end','unattributed','unattributed']);
 const bad=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'events',platform:'android',events:[{id:crypto.randomUUID(),event:'reward_impression',placement:'season_end',at:now}]})}));assert.equal(bad.status,400);assert.equal(h.calls.length,1);
});

test('Successful email bookkeeping accepts an empty HTTP 204 database reply',async()=>{
 const h=setup(),now=new Date().toISOString();let n=0;
 h.c.fetch=async()=>{n++;if(n===1)return Response.json({key:'delivery-test',test:true,from:now,to:now,started_at:now,last24:[],alltime:[],devices:[],active:[]});if(n===2)return Response.json({id:'email-id'});return new Response(null,{status:204})};
 const r=await h.handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({action:'report',token:'a'.repeat(72),test:true})}));assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,sent:true});assert.equal(n,3);
});

test('Calendar-day email names the completed AdMob day and preserves per-placement and lifetime counts',()=>{
 const h=setup();h.c.fixture={key:'daily-calendar-Detroit-2026-10-07',test:false,period_mode:'calendar_day',report_timezone:'America/Detroit',from:'2026-10-07T04:00:00Z',to:'2026-10-08T04:00:00Z',started_at:'2026-09-17T19:42:00Z',devices:[],active:[],last24:[{platform:'android',event:'reward_impression',placement:'reward_budget',total:6}],alltime:[{platform:'android',event:'reward_impression',placement:'reward_budget',total:30}]};
 const report=vm.runInNewContext('formatReport(fixture)',h.c);
 assert.match(report.subject,/daily & all-time report · Oct 7, 2026$/);assert.ok(report.text.includes('Reporting day: Oct 7, 2026 (midnight to midnight, America/Detroit)'));
 assert.ok(report.html.includes('<th>Reporting day</th>'));assert.ok(report.text.includes('Athletics Budget ad impressions: 6 | 30'));assert.match(report.text,/Delivery remains at 8 AM Eastern/);assert.doesNotMatch(report.text,/Last 24 hours:/);
});
test('Calendar-day labels remain correct on the 23-hour spring and 25-hour fall reporting days',()=>{
 for(const [from,to,day,hours] of [['2026-03-08T05:00:00Z','2026-03-09T04:00:00Z','Mar 8, 2026',23],['2026-11-01T04:00:00Z','2026-11-02T05:00:00Z','Nov 1, 2026',25]]){
  const h=setup();h.c.fixture={test:false,period_mode:'calendar_day',report_timezone:'America/Detroit',from,to,started_at:from,devices:[],active:[],last24:[],alltime:[]};const report=vm.runInNewContext('formatReport(fixture)',h.c);
  assert.equal((Date.parse(to)-Date.parse(from))/3600000,hours);assert.ok(report.subject.endsWith(day));assert.ok(report.text.includes('Reporting day: '+day));assert.doesNotMatch(report.text,/Last 24 hours:/);
 }
});

 test('Purchase rows clearly distinguish app callbacks from verified sales',()=>{const h=setup(),now=new Date().toISOString();h.c.fixture={from:now,to:now,started_at:now,devices:[],active:[],last24:[{platform:'android',event:'purchase_confirmed',product:'all_access_pass',total:2}],alltime:[]};const r=vm.runInNewContext('formatReport(fixture)',h.c);assert.match(r.text,/all_access_pass purchase callbacks \(unverified\): 2/);assert.match(r.text,/Older purchase totals may contain false positives/);assert.match(r.html,/not settled Google Play sales or revenue/)});

test('Email explains the actual season boundary and older-build counting limits',()=>{
 const h=setup(),now=new Date().toISOString();h.c.fixture={key:'test',test:true,from:now,to:now,started_at:now,last24:[],alltime:[],devices:[],active:[]};
 const report=vm.runInNewContext('formatReport(fixture)',h.c);assert.match(report.text,/once per dynasty year/);assert.match(report.text,/Signing Day opens, before postseason games/);assert.match(report.text,/Build 285 added direct final-score and postseason-game reporting/);assert.doesNotMatch(report.text,/Seasons count when the season review is reached/);
});
