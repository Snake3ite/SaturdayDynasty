// Linked browser funnel is strictly opt-in. Basic gameplay totals stay separate.
// Never collect account IDs, saves, names, email, tokens or complete URLs.
(()=>{
 'use strict';if(window.SDF_BROWSER_ANALYTICS)return;
 const PREF='SDF_USAGE_V236',KEY='SDF_BROWSER_FUNNEL_V1',SESSION='SDF_BROWSER_FUNNEL_SESSION_V1';
 const ENDPOINT='https://fwnvwkffxazwsmaiqayj.supabase.co/functions/v1/browser-growth-ingest';
 const EVENTS=new Set(['landing_view','play_click','game_ready','dynasty_created','first_recruit','game_completed','return','community_shown','community_opened','share_opened','share_completed']);
 const CONTEXTS=new Set(['landing','startup','dashboard','season_recap','discord','facebook']);
 const SOURCES=new Set(['facebook','facebook_personal','discord','youtube','google','direct','other']);
 const MEDIUMS=new Set(['organic_social','community','organic_video','paid_social','cpc','referral','direct','other']);
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 let data=null,session=null,busy=false,timer=null,active=null;
 const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null')}catch{return null}};
 function permitted(){const s=window.SDF_USAGE?.status?.()||read(localStorage,PREF);return s?.basic===true&&s?.consent===true&&navigator.globalPrivacyControl!==true}
 function purge(){active?.abort();data=null;session=null;clearTimeout(timer);timer=null;try{localStorage.removeItem(KEY);sessionStorage.removeItem(SESSION)}catch{}}
 function attribution(search=location.search){const q=new URLSearchParams(search),source=q.get('utm_source')?.toLowerCase(),medium=q.get('utm_medium')?.toLowerCase(),campaign=q.get('utm_campaign')?.toLowerCase();return{utm_source:SOURCES.has(source)?source:'direct',utm_medium:MEDIUMS.has(medium)?medium:'direct',utm_campaign:/^[a-z0-9_-]{1,48}$/.test(campaign||'')?campaign:''}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));sessionStorage.setItem(SESSION,JSON.stringify(session))}catch{}}
 function safeEvent(e){
  if(!e||!EVENTS.has(e.event)||!UUID.test(e.id||'')||!UUID.test(e.cohort||'')||!UUID.test(e.session||''))return null;
  const at=Date.parse(e.at),age=Date.now()-at;if(!Number.isFinite(at)||age>604800000||age< -300000)return null;
  const item={id:e.id,event:e.event,at:new Date(Math.floor(at/60000)*60000).toISOString(),cohort:e.cohort,session:e.session,utm_source:SOURCES.has(e.utm_source)?e.utm_source:'direct',utm_medium:MEDIUMS.has(e.utm_medium)?e.utm_medium:'direct',utm_campaign:/^[a-z0-9_-]{0,48}$/.test(e.utm_campaign||'')?e.utm_campaign:''};
  if(CONTEXTS.has(e.context))item.context=e.context;return item;
 }
 function context(){
  if(!permitted()){purge();return null}
  const now=Date.now(),day=new Date(now).toISOString().slice(0,10);data ||= read(localStorage,KEY);
  if(!data||!Array.isArray(data.queue)||!UUID.test(data.cohort||''))data={cohort:crypto.randomUUID(),firstDay:day,queue:[]};
  data.queue=data.queue.map(safeEvent).filter(Boolean).slice(-100);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.firstDay||''))data.firstDay=day;
  session ||= read(sessionStorage,SESSION);
  if(!session||!UUID.test(session.id||'')||!Array.isArray(session.seen)||!session.source||now-Number(session.touched||0)>1800000)session={id:crypto.randomUUID(),touched:now,source:attribution(),seen:[]};
  session.touched=now;persist();return{day};
 }
 function record(event,details={}){
  if(!EVENTS.has(event)||!context())return false;
  const unique=['landing_view','play_click','game_ready','dynasty_created','first_recruit','return'].includes(event);
  if(unique&&session.seen.includes(event))return false;if(unique)session.seen.push(event);
  const item={id:crypto.randomUUID(),event,at:new Date(Math.floor(Date.now()/60000)*60000).toISOString(),cohort:data.cohort,session:session.id,...session.source};
  if(CONTEXTS.has(details.context))item.context=details.context;
  data.queue.push(item);data.queue=data.queue.slice(-100);persist();schedule();return true;
 }
 function schedule(){if(!timer&&data?.queue.length)timer=setTimeout(()=>{timer=null;void flush()},1500)}
 async function flush(){
  if(!permitted()){purge();return false}if(busy||navigator.onLine===false||!context()||!data.queue.length)return false;
  const batch=data.queue.slice(0,25);busy=true;active=new AbortController();const controller=active,timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,body:JSON.stringify({consent:true,qa:location.hostname!=='saturdaydynasty.ctoolis.workers.dev',events:batch})});
   if(!response.ok||(await response.json()).ok!==true)return false;if(!permitted()){purge();return false}
   const ids=new Set(batch.map(e=>e.id));data.queue=data.queue.filter(e=>!ids.has(e.id));persist();return true;
  }catch{return false}finally{clearTimeout(timeout);active=null;busy=false}
 }
 function sync(){if(!permitted()){purge();return}const c=context();if(c.day!==data.firstDay)record('return');schedule()}
 function setConsent(enabled){
  if(window.SDF_USAGE){if(enabled)window.SDF_USAGE.chooseBasic(true);window.SDF_USAGE.choose(enabled)}
  else {const p=read(localStorage,PREF)||{schema:2,queue:[]};p.basic=enabled?true:p.basic===true;p.consent=enabled===true;if(!enabled){delete p.id;p.queue=(p.queue||[]).map(({trackingId,...e})=>e)}try{localStorage.setItem(PREF,JSON.stringify(p))}catch{}}
  if(!enabled)purge();else sync();window.dispatchEvent(new Event('sdf:analytics-consent'));
 }
 window.SDF_BROWSER_ANALYTICS={record,flush,permitted,setConsent,attribution,sync};
 window.addEventListener('sdf:analytics-consent',sync);window.addEventListener('online',()=>void flush());window.addEventListener('storage',sync);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();void flush()}});sync();
})();
