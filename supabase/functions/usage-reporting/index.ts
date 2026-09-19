// Server-side only. No database credentials or email API keys enter the game bundle.
const SITE='https://saturdaydynasty.ctoolis.workers.dev';
const EVENTS=new Set(['reporting_started','session','dynasty_started','game_completed','season_completed','first_recruit','practice_chosen','first_game','second_season','guide_started','guide_dismissed','guide_completed','shop_opened','preview_opened','checkout_started','checkout_canceled','checkout_failed','checkout_pending','purchase_confirmed','reward_shown','reward_earned','reward_failed','interstitial_shown','scenario_started','scenario_completed','scenario_ended','first_season_finished','first_game_under_5m','first_game_under_15m','first_game_over_15m']);
const PRODUCTS=new Set(['','commissioner_mode','remove_ads','player_editor','team_editor']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function rpc(name:string,args:unknown){
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const r=await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(args)});
 if(!r.ok)throw new Error('Database operation failed');return await r.json();
}
function formatReport(p:any){
 const names=[['First basic reporting launches',['reporting_started']],['New ID-enabled devices',['first_launch']],['Active ID-enabled devices',['active']],['Sessions',['session']],['New dynasties',['dynasty_started']],['Games completed',['game_completed']],['Seasons finished',['season_completed']],['Ads shown',['reward_shown','interstitial_shown']],['Sponsor videos shown',['reward_shown']],['Season ads shown',['interstitial_shown']],['Sponsor rewards earned',['reward_earned']],['Purchases confirmed (client reported)',['purchase_confirmed']],['Shop visits',['shop_opened']],['Commissioner previews',['preview_opened']],['Checkouts started',['checkout_started']],['Checkouts canceled',['checkout_canceled']],['Checkouts failed',['checkout_failed']],['Checkouts pending',['checkout_pending']],['Sponsor reward failures',['reward_failed']],['Guides started',['guide_started']],['Guides dismissed',['guide_dismissed']],['Guides completed',['guide_completed']],['First recruits',['first_recruit']],['Practice choices',['practice_chosen']],['First games',['first_game']],['Second seasons reached',['second_season']],['First seasons finished',['first_season_finished']],['Scenario runs started',['scenario_started']],['Scenario runs completed',['scenario_completed']],['Scenario runs ended without completion',['scenario_ended']],['First game within 5 minutes',['first_game_under_5m']],['First game in 5–15 minutes',['first_game_under_15m']],['First game after 15 minutes',['first_game_over_15m']]];
 const sum=(rows:any[],platform:string,events:string[])=>rows.filter(x=>x.platform===platform&&events.includes(x.event)).reduce((n,x)=>n+Number(x.total),0);
 const count=(platform:string,events:string[],all:boolean)=>events[0]==='first_launch'?(all?sum(p.alltime,platform,events):Number(p.devices.find((x:any)=>x.platform===platform)?.new24||0)):events[0]==='active'?(all?sum(p.alltime,platform,['first_launch']):Number(p.active.find((x:any)=>x.platform===platform)?.total||0)):sum(all?p.alltime:p.last24,platform,events);
 const date=(v:string)=>new Date(v).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'});
 const intro=`${p.test?'TEST REPORT — ':''}Saturday Dynasty Football\nLast 24 hours: ${date(p.from)} – ${date(p.to)} Eastern\nAll-time totals since reporting began ${date(p.started_at)}.\n`;
 let text=intro,html=`<h2>${p.test?'TEST — ':''}Saturday Dynasty Football</h2><p>Last 24 hours: ${date(p.from)} – ${date(p.to)} Eastern</p><p>All-time tracking began ${date(p.started_at)}.</p>`;
 for(const platform of ['android','browser']){
  text+=`\n${platform.toUpperCase()} — Last 24h | All time\n`;html+=`<h3>${platform==='android'?'Android':'Browser'}</h3><table cellpadding="7" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:650px"><tr style="background:#e8f2f6"><th align="left">Metric</th><th>Last 24h</th><th>All time</th></tr>`;
  for(const [label,events] of names as [string,string[]][]){const a=count(platform,events,false),b=count(platform,events,true);text+=`${label}: ${a} | ${b}\n`;html+=`<tr><td style="border-bottom:1px solid #ddd">${label}</td><td align="center">${a}</td><td align="center">${b}</td></tr>`}
  for(const product of ['commissioner_mode','remove_ads','player_editor','team_editor']){const a=sum(p.last24.filter((r:any)=>r.product===product),platform,['purchase_confirmed']),b=sum(p.alltime.filter((r:any)=>r.product===product),platform,['purchase_confirmed']);text+=`  ${product} purchases: ${a} | ${b}\n`;html+=`<tr><td>${product.replaceAll('_',' ')} purchases</td><td align="center">${a}</td><td align="center">${b}</td></tr>`}
  html+='</table>';
  const retention=(p.retention||[]).find((x:any)=>x.platform===platform);
  if(retention){for(const day of [1,7]){const eligible=Number(retention['eligible'+day]||0),returned=Number(retention['returned'+day]||0),label=`Day ${day} return (ID opt-in cohorts)`,value=eligible?`${returned}/${eligible} (${(100*returned/eligible).toFixed(1)}%)`:'Not enough elapsed time';text+=`${label}: ${value}\n`;html+=`<p><b>${label}:</b> ${value}</p>`}}

 }
 const note='Retention covers new ID-enabled devices enrolled after Build 241 reporting began; day 1 means activity 24–48 hours after enrollment, day 7 means 168–192 hours. Only fully elapsed windows enter the denominator. These are observed opt-in cohorts, not all installs. First-game timing is wall-clock time from creating a new dynasty, including time away. Funnel rows are event counts, not same-cohort conversion percentages. These are game activity counts, not Google Play install totals, verified sales or ad revenue. Basic totals include activity without a persistent ID. Unique-device figures cover only ID-enabled players, not everyone. First basic reporting launches count locally once when basic reporting starts; they include existing players updating and storage resets. Linked reporting before this update did not emit that metric. All-time active ID-enabled devices means all devices registered, not currently active players. Players can turn basic reporting off in Settings. Games include watch and quick sim of the user team, not background AI games. Seasons count when the season review is reached. Purchases restored without a new checkout are excluded. Offline events can arrive late; all-time totals include events received when this report was generated. QA activity is excluded. Zero means no reported events, not necessarily no players.';
 return {from:'Saturday Dynasty Reports <onboarding@resend.dev>',to:['ctoolis@gmail.com'],subject:`${p.test?'[TEST] ':''}Saturday Dynasty · 24-hour & all-time report · ${date(p.to)}`,text:text+'\n'+note,html:html+`<p style="color:#586775;font-size:12px">${note}</p>`};
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 const allowed=!origin||origin===SITE||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
 const headers={'Access-Control-Allow-Origin':allowed?(origin||SITE):SITE,'Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(!allowed)return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>16000)return reply({error:'Batch too large'},413);
  const raw=await req.text();if(raw.length>16000)return reply({error:'Batch too large'},413);
  const p=JSON.parse(raw);
  if(p.action==='report'){
   if(typeof p.token!=='string'||p.token.length!==72)return reply({error:'Unauthorized'},401);
   const report=await rpc('sdf_usage_report',{p_token:p.token,p_test:p.test===true});
   if(report.skip)return reply({ok:true,skipped:true});
   // Frozen database snapshot makes retries identical; Resend deduplicates the send.
   const emailKey=Deno.env.get('RESEND_API_KEY');if(!emailKey)return reply({error:'Email service not configured'},503);
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${emailKey}`,'Content-Type':'application/json','Idempotency-Key':`sdf-usage-${report.key}`},body:JSON.stringify(formatReport(report))});
   if(!sent.ok)return reply({error:'Email provider rejected delivery'},502);
   await rpc('sdf_usage_report_sent',{p_token:p.token,p_key:report.key});return reply({ok:true,sent:true});
  }
  if(p.action!=='events'||(p.device!=null&&!UUID.test(p.device))||!['android','browser'].includes(p.platform)||!Array.isArray(p.events)||!p.events.length||p.events.length>40)return reply({error:'Invalid batch'},400);
  const clean=[];
  for(const e of p.events){if(!UUID.test(e.id||'')||!EVENTS.has(e.event)||!PRODUCTS.has(e.product||'')||!Number.isFinite(Date.parse(e.at)))return reply({error:'Invalid event'},400);clean.push({id:e.id,event:e.event,product:e.product||'',at:e.at})}
  let device:string|null=null;
  if(p.device!=null){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p.device));device=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
  await rpc('sdf_usage_ingest',{p_device:device,p_platform:p.platform,p_qa:p.qa===true,p_events:clean});return reply({ok:true});
 }catch{return reply({error:'Reporting temporarily unavailable'},503)}
});
