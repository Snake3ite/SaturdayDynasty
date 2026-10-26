const SITE='https://saturdaydynasty.dynastysportsstudios.com',SITES=['https://saturdaydynasty.dynastysportsstudios.com','https://saturdaydynasty.ctoolis.workers.dev'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTS=new Set(['landing_view','play_click','game_ready','dynasty_created','first_recruit','game_completed','return','community_shown','community_opened','share_opened','share_completed']);
const SOURCES=new Set(['facebook','facebook_personal','discord','youtube','google','reddit','operation_sports','tiktok','instagram','itchio','gamejolt','studio_site','share','direct','other']);
const MEDIUMS=new Set(['organic_social','community','organic_video','paid_social','cpc','referral','direct','other']);
const CONTEXTS=new Set(['','landing','startup','dashboard','season_recap','discord','facebook']);
export function createGrowthHandler({env,fetcher=fetch,now=()=>Date.now()}){
 return async req=>{
  const origin=req.headers.get('origin')||'',local=/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers={'Access-Control-Allow-Origin':SITES.includes(origin)||local?origin:SITE,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const reply=(body,status=200)=>Response.json(body,{status,headers});
  if(!SITES.includes(origin)&&!local)return reply({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'POST required'},405);
  try{
   const raw=await req.text();if(raw.length>16000)return reply({error:'Batch too large'},413);
   const p=JSON.parse(raw);if(p.consent!==true||!Array.isArray(p.events)||!p.events.length||p.events.length>25)return reply({error:'Invalid consent or batch'},400);
   const clean=[];
   const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
   for(const e of p.events){
    const at=Date.parse(e.at),age=now()-at;
    if(!UUID.test(e.id||'')||!UUID.test(e.cohort||'')||!UUID.test(e.session||'')||!EVENTS.has(e.event)||!Number.isFinite(at)||age< -300000||age>604800000||!SOURCES.has(e.utm_source)||!MEDIUMS.has(e.utm_medium)||!/^[a-z0-9_-]{0,48}$/.test(e.utm_campaign||'')||!CONTEXTS.has(e.context||''))return reply({error:'Invalid event'},400);
    clean.push({id:e.id,event:e.event,at:new Date(Math.floor(at/60000)*60000).toISOString(),cohort:await hash(e.cohort),session:await hash(e.session),utm_source:e.utm_source,utm_medium:e.utm_medium,utm_campaign:e.utm_campaign||'',context:e.context||''});
   }
   const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return reply({error:'Reporting unavailable'},503);
   const result=await fetcher(url+'/rest/v1/rpc/sdf_browser_growth_ingest',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_qa:local||p.qa===true,p_events:clean})});
   if(!result.ok)return reply({error:'Reporting unavailable'},503);
   return reply({ok:true});
  }catch{return reply({error:'Reporting unavailable'},503)}
 };
}
