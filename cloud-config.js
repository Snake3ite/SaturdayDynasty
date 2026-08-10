// Safe to commit: Supabase publishable keys are client-side keys.
// NEVER put a service_role / sb_secret key in this file.
window.SDF_CLOUD_CONFIG={
  enabled:true,
  supabaseUrl:"https://fwnvwkffxazwsmaiqayj.supabase.co",
  publishableKey:"sb_publishable_MeNnZ-PoF0cKlhfcvcL6Rg_xIJajlhW"
};

// Browser-only UI. This file is overlaid by build_web.py and is not used by Android.
(()=>{
  document.documentElement.classList.add('sdf-browser-build');
  const s=document.createElement('style');
  s.id='sdf-browser-overrides';
  s.textContent=`
#recruitingTab .desktop-data-table{display:none!important}#recruitingTab #recruitCardList{display:grid!important;align-items:start;gap:14px}#recruitingTab #highSchoolRecruitingBoard{overflow:visible}
#recruitingTab .recruit-toolbar{background:#07151f;border:1px solid #203d52;border-radius:10px;padding:10px;margin:14px 0 10px;box-shadow:0 10px 28px #0003}#recruitingTab .recruit-toolbar input,#recruitingTab .recruit-toolbar select{min-height:42px;border-radius:7px}
#recruitingTab #recruitCardList .mobile-data-card{min-width:0;padding:15px;border:1px solid #23445a;border-radius:10px;background:#091a27;box-shadow:0 10px 30px #0003,inset 3px 0 0 color-mix(in srgb,var(--team-primary,#2563eb) 72%,transparent)}#recruitingTab #recruitCardList .mobile-data-card:hover{transform:translateY(-1px);border-color:#32637f}#recruitingTab #recruitCardList .mobile-data-card.recruit-blocked{opacity:.76;box-shadow:inset 3px 0 0 #7f1d2d}
#recruitingTab #recruitCardList .mobile-data-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:9px 0}#recruitingTab #recruitCardList .mobile-data-grid>div{min-width:0;padding:8px 5px;border:1px solid #ffffff0e;border-radius:6px;background:#06131e}#recruitingTab #recruitCardList .mobile-data-grid small{font-size:.52rem;white-space:nowrap}#recruitingTab #recruitCardList .mobile-data-grid b{display:block;margin-top:3px;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#recruitingTab #recruitCardList .mobile-race-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:9px 0}#recruitingTab #recruitCardList .mobile-race-list .race-mini-row{min-width:0;margin:0;border:1px solid #ffffff10;border-radius:6px;padding:7px;background:#081725}#recruitingTab #recruitCardList .mobile-race-list .race-mini-row:nth-child(n+4){display:none}
#recruitingTab #recruitCardList .mobile-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}#recruitingTab #recruitCardList .mobile-actions .btn{width:100%;min-width:0;min-height:38px;margin:0;padding:7px 6px;font-size:.63rem}
@media(min-width:1180px){#recruitingTab #recruitCardList{grid-template-columns:repeat(2,minmax(0,1fr))}#recruitingTab .recruit-toolbar{display:grid;grid-template-columns:minmax(260px,1.8fr) repeat(5,minmax(120px,1fr)) auto;gap:8px;align-items:center}#recruitingTab .recruit-toolbar>*{min-width:0;width:100%}}
@media(min-width:1600px){#recruitingTab #recruitCardList{grid-template-columns:repeat(3,minmax(0,1fr))}#recruitingTab #recruitCardList .mobile-data-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){#recruitingTab #recruitCardList{grid-template-columns:1fr;gap:10px}#recruitingTab #recruitCardList .mobile-data-grid{grid-template-columns:repeat(3,minmax(0,1fr))}#recruitingTab #recruitCardList .mobile-race-list{grid-template-columns:1fr}#recruitingTab #recruitCardList .mobile-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
  document.head.appendChild(s);
})();

// Browser-only Stripe/Supabase storefront. Entitlements live in Supabase, not the dynasty save.
// Important: the existing web game owns auth and stores its session in SDF_SUPABASE_SESSION.
(()=>{
 const P=[
  ['commissioner_mode','Commissioner Mode','$9.99','No ads, Player Editor, Team Editor, plus future commissioner tools.','BEST VALUE'],
  ['remove_ads','Remove Ads','$4.99','Permanently removes browser display and forced ads from your account.',''],
  ['player_editor','Player Editor','$4.99','Unlock player editing tools for your dynasties.',''],
  ['team_editor','Team Editor','$4.99','Unlock team and program customization tools.','']
 ];
 const SESSION_KEY='SDF_SUPABASE_SESSION';
 let E=null;
 const css=`#sdfShopBtn{position:fixed;left:14px;bottom:16px;z-index:8000;width:176px;border:1px solid #31d5b573;border-radius:8px;background:linear-gradient(135deg,#0c2631,#0a1823);color:#eafcff;padding:10px 12px;text-align:left;box-shadow:0 12px 34px #0005;cursor:pointer;font:700 11px/1.25 system-ui;letter-spacing:.04em}#sdfShopBtn small{display:block;margin-top:3px;color:#57e2ca;font-size:8px}#sdfShop{position:fixed;inset:0;z-index:20000;display:none;align-items:center;justify-content:center;padding:22px;background:#01080dc7;backdrop-filter:blur(7px)}#sdfShop.open{display:flex}#sdfShopBox{width:min(940px,96vw);max-height:90vh;overflow:auto;border:1px solid #23495d;border-radius:14px;background:#071722;color:#eef9ff;box-shadow:0 28px 90px #0009;font-family:system-ui}.sdfSH{display:flex;justify-content:space-between;gap:20px;padding:22px 24px 15px;border-bottom:1px solid #ffffff14}.sdfSH h2{margin:4px 0 5px;font-size:25px}.sdfEy{color:#f3cb55;font-size:10px;font-weight:900;letter-spacing:.16em}.sdfSub{margin:0;color:#8da7b6;font-size:12px}.sdfClose{border:0;background:#102735;color:#dceef7;border-radius:7px;width:36px;height:36px;cursor:pointer;font-size:20px}#sdfStatus{margin:14px 24px 0;padding:10px 12px;border:1px solid #204256;border-radius:8px;background:#0a1c28;color:#9fb6c4;font-size:12px}#sdfStatus.good{border-color:#226b57;color:#79e6c8}#sdfStatus.bad{border-color:#7b3541;color:#ff9cac}#sdfProducts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px 24px 24px}.sdfProd{position:relative;border:1px solid #1c3a4d;border-radius:11px;background:#0b1f2c;padding:17px}.sdfProd.featured{border-color:#b59537;background:linear-gradient(145deg,#b5953722,#0b1f2c 48%)}.sdfProd h3{margin:0 0 4px;font-size:17px}.sdfProd p{min-height:34px;margin:6px 0 14px;color:#8fa8b8;font-size:11px;line-height:1.45}.sdfPrice{font-size:22px;font-weight:900}.sdfOnce{font-size:9px;color:#6f8999}.sdfBuy{width:100%;margin-top:13px;min-height:40px;border:0;border-radius:7px;background:#1c8c78;color:#fff;font-weight:900;font-size:11px;cursor:pointer}.sdfBuy:disabled{background:#183844;color:#77a098}.sdfBadge{position:absolute;right:13px;top:13px;border-radius:999px;background:#b9922f;color:#081014;padding:4px 7px;font-size:8px;font-weight:900}.sdfOwned{color:#64dfbf;font-size:10px;font-weight:900;margin-top:7px}@media(max-width:760px){#sdfShopBtn{left:auto;right:12px;bottom:12px;width:auto}#sdfShopBtn small{display:none}#sdfShop{padding:10px}#sdfProducts{grid-template-columns:1fr;padding:12px}.sdfSH{padding:17px}.sdfProd p{min-height:0}#sdfStatus{margin:10px 12px 0}}`;
 function status(t,c=''){const x=document.querySelector('#sdfStatus');if(x){x.textContent=t;x.className=c?`sdfStatus ${c}`:'sdfStatus'}}
 function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
 function writeSession(s){if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)}
 async function liveSession(force=false){
  let s=readSession();
  if(!s?.refresh_token||!s?.user?.id)return null;
  const expires=Number(s.expires_at||0)*1000;
  if(force||!expires||expires<Date.now()+60000){
   try{
    const c=window.SDF_CLOUD_CONFIG;
    const r=await fetch(`${c.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
    if(r.ok){s=await r.json();writeSession(s)}
    else if(r.status===400||r.status===401){writeSession(null);return null}
   }catch(err){console.warn('Shop session refresh failed',err)}
  }
  return s;
 }
 async function authedFetch(path,options={},retry=true){
  const c=window.SDF_CLOUD_CONFIG,s=await liveSession(false);
  if(!s?.access_token)throw new Error('NOT_SIGNED_IN');
  const headers={apikey:c.publishableKey,Authorization:`Bearer ${s.access_token}`,...(options.headers||{})};
  let r=await fetch(`${c.supabaseUrl}${path}`,{...options,headers});
  if(r.status===401&&retry){const fresh=await liveSession(true);if(fresh?.access_token){headers.Authorization=`Bearer ${fresh.access_token}`;r=await fetch(`${c.supabaseUrl}${path}`,{...options,headers})}}
  return r;
 }
 function own(e,k){return !!(e&&(e.commissioner_mode||e[k]))}
 function render(e){E=e;document.querySelectorAll('.sdfProd').forEach(x=>{const k=x.dataset.k,b=x.querySelector('.sdfBuy'),o=own(e,k);b.disabled=o;b.textContent=o?'OWNED':`BUY ${x.dataset.p}`;let q=x.querySelector('.sdfOwned');if(o&&!q){q=document.createElement('div');q.className='sdfOwned';q.textContent='✓ Permanent account unlock';x.append(q)}if(!o&&q)q.remove()});window.dispatchEvent(new CustomEvent('sdf:entitlements',{detail:e||{}}))}
 async function refresh(q=false){
  try{
   const s=await liveSession(false);
   if(!s?.user?.id){render(null);if(!q)status('Sign in to your Saturday Dynasty account to purchase or restore upgrades.');return null}
   const path=`/rest/v1/user_entitlements?user_id=eq.${encodeURIComponent(s.user.id)}&select=remove_ads,player_editor,team_editor,commissioner_mode&limit=1`;
   const r=await authedFetch(path,{headers:{Accept:'application/json'}});
   if(!r.ok)throw new Error(`Entitlements request failed (${r.status})`);
   const rows=await r.json(),e=rows[0]||{remove_ads:false,player_editor:false,team_editor:false,commissioner_mode:false};
   render(e);if(!q)status(e.commissioner_mode?'Commissioner Mode is active on this account.':'Account connected. Purchases are permanent and sync across devices.','good');return e
  }catch(x){console.error(x);if(!q)status(x?.message==='NOT_SIGNED_IN'?'Sign in to your Saturday Dynasty account to purchase or restore upgrades.':'Could not load account purchases. Try again in a moment.','bad');return null}
 }
 async function buy(k,b){
  try{
   const s=await liveSession(false);
   if(!s?.user?.id)return status('Sign in before purchasing an account upgrade.','bad');
   if(own(E,k))return status('Your account already owns that upgrade.','good');
   b.disabled=true;b.textContent='OPENING STRIPE…';status('Opening secure Stripe Sandbox checkout…');
   const r=await authedFetch('/functions/v1/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productKey:k})});
   let data=null;try{data=await r.json()}catch{}
   if(!r.ok)throw new Error(data?.error||data?.message||`Checkout request failed (${r.status})`);
   if(!data?.url)throw new Error('Checkout URL missing.');
   location.assign(data.url)
  }catch(x){console.error(x);b.disabled=false;b.textContent=`BUY ${b.closest('.sdfProd').dataset.p}`;status(`Checkout failed: ${x?.message==='NOT_SIGNED_IN'?'sign in required':x?.message||'Unknown error'}`,'bad')}
 }
 function make(){if(document.querySelector('#sdfShop'))return;const st=document.createElement('style');st.textContent=css;document.head.append(st);const a=document.createElement('button');a.id='sdfShopBtn';a.innerHTML='★ DYNASTY SHOP<small>COMMISSIONER MODE & UPGRADES</small>';a.onclick=open;document.body.append(a);const o=document.createElement('div');o.id='sdfShop';o.innerHTML='<section id="sdfShopBox" role="dialog" aria-modal="true"><header class="sdfSH"><div><div class="sdfEy">SATURDAY DYNASTY FOOTBALL</div><h2>Dynasty Shop</h2><p class="sdfSub">Permanent browser account upgrades · Stripe secure checkout</p></div><button class="sdfClose">×</button></header><div id="sdfStatus">Checking your account…</div><div id="sdfProducts"></div></section>';document.body.append(o);const g=o.querySelector('#sdfProducts');P.forEach(([k,n,p,d,z])=>{const x=document.createElement('article');x.className='sdfProd'+(k==='commissioner_mode'?' featured':'');x.dataset.k=k;x.dataset.p=p;x.innerHTML=`${z?`<span class="sdfBadge">${z}</span>`:''}<h3>${n}</h3><div><span class="sdfPrice">${p}</span> <span class="sdfOnce">ONE-TIME</span></div><p>${d}</p><button class="sdfBuy">BUY ${p}</button>`;x.querySelector('.sdfBuy').onclick=e=>buy(k,e.currentTarget);g.append(x)});o.querySelector('.sdfClose').onclick=close;o.onclick=e=>{if(e.target===o)close()}}
 async function open(){make();document.querySelector('#sdfShop').classList.add('open');await refresh()}
 function close(){document.querySelector('#sdfShop')?.classList.remove('open')}
 async function ret(){const u=new URL(location.href),v=u.searchParams.get('purchase');if(!v)return;open();if(v==='cancelled')status('Checkout cancelled — nothing was charged.');else{status('Payment completed. Confirming your permanent unlock…');let e;for(let i=0;i<10;i++){e=await refresh(true);if(e&&Object.values(e).some(Boolean))break;await new Promise(r=>setTimeout(r,800))}render(e);if(e&&Object.values(e).some(Boolean))status('Purchase confirmed. Your account upgrade is active and syncs across devices.','good');else status('Payment returned successfully. Stripe is still confirming the entitlement; reopen the shop in a moment.')}u.searchParams.delete('purchase');u.searchParams.delete('session_id');history.replaceState({},'',u.pathname+(u.searchParams.size?'?'+u.searchParams:'')+u.hash)}
 window.SDF_COMMERCE={openShop:open,closeShop:close,refreshEntitlements:refresh,getEntitlements:()=>E,owns:k=>own(E,k)};
 const init=()=>{make();ret();refresh(true)};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
