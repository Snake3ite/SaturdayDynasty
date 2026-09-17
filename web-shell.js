(()=>{
'use strict';
const PREFIX='SaturdayDynastyFootballAndroidV1';
const DB_NAME='SaturdayDynastyWeb';
const DB_VERSION=1;
const STORE='saves';
const SESSION_KEY='SDF_SUPABASE_SESSION';
const DELETED_KEY='SDF_CLOUD_DELETED_SLOTS';
const cfg=()=>window.SDF_CLOUD_CONFIG||{};
let dbPromise=null;let dbScope=null;
let session=null;
let cloudBusy=false;
let cloudTimer=null;

function openDb(){
 const scope=window.SDF_ACCOUNT_SCOPE?.databaseName()||DB_NAME;
 if(dbPromise&&dbScope===scope)return dbPromise;
 dbScope=scope;
 dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(scope,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'slot'})};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 return dbPromise;
}
async function idbPut(slot,raw){try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({slot:String(slot),raw,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch(e){console.warn('IndexedDB mirror failed',e)}}
async function idbGet(slot){try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(String(slot));r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return null}}
async function restoreLocalMirrors(){for(const slot of ['1','2','3']){const key=`${PREFIX}_slot${slot}`;if(localStorage.getItem(key))continue;const copy=await idbGet(slot);if(copy?.raw){try{JSON.parse(copy.raw);localStorage.setItem(key,copy.raw)}catch{}}}try{window.SDF_RELEASE_TEST?.renderSaveManager?.()}catch{}}

function getLocal(slot){const raw=localStorage.getItem(`${PREFIX}_slot${slot}`);if(!raw)return null;try{const data=JSON.parse(raw);return{raw,data,savedAt:Number(data?._release?.savedAt||0)}}catch{return null}}
function cloudReady(){return !!(cfg().enabled&&cfg().supabaseUrl&&cfg().publishableKey)}
function rawApi(path,options={}){
 const headers={apikey:cfg().publishableKey,'Content-Type':'application/json',...(options.headers||{})};
 if(session?.access_token&&!options.skipAuth)headers.Authorization=`Bearer ${session.access_token}`;
 const request={...options,headers};delete request.skipAuth;
 return fetch(`${cfg().supabaseUrl}${path}`,request);
}
async function refreshSession(force=false){
 if(!session?.refresh_token)return false;
 const expiresAt=Number(session.expires_at||0)*1000;
 if(!force&&expiresAt&&expiresAt-Date.now()>60000)return true;
 try{const r=await rawApi('/auth/v1/token?grant_type=refresh_token',{method:'POST',skipAuth:true,body:JSON.stringify({refresh_token:session.refresh_token})});if(!r.ok){saveSession(null);return false}saveSession(await r.json());return true}catch{return false}
}
function assertAccount(){if(window.SDF_ACCOUNT_SCOPE?.switching)throw new Error('Account changed; reloading saved dynasties.')}
async function api(path,options={}){
 assertAccount();
 if(session?.refresh_token&&!path.startsWith('/auth/v1/'))await refreshSession(false);
 assertAccount();
 let r=await rawApi(path,options);
 if(r.status===401&&session?.refresh_token&&!path.startsWith('/auth/v1/')){if(await refreshSession(true))r=await rawApi(path,options)}
 return r;
}
function saveSession(next){session=next||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);renderCloudBar()}
async function restoreSession(){try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{session=null}if(!session?.refresh_token)return;await refreshSession(true)}
async function signUp(email,password){const r=await rawApi('/auth/v1/signup',{method:'POST',skipAuth:true,body:JSON.stringify({email,password})});const data=await r.json();if(!r.ok)throw new Error(data?.msg||data?.message||'Could not create account');if(data?.access_token){saveSession(data);await syncAllSlots()}return data}
async function signIn(email,password){const r=await rawApi('/auth/v1/token?grant_type=password',{method:'POST',skipAuth:true,body:JSON.stringify({email,password})});const data=await r.json();if(!r.ok)throw new Error(data?.error_description||data?.msg||data?.message||'Could not sign in');saveSession(data);await syncAllSlots();return data}
function signOut(){saveSession(null)}

function readDeletedMap(){try{return JSON.parse(localStorage.getItem(DELETED_KEY)||'{}')}catch{return {}}}
function tombstone(slot){const uid=session?.user?.id;if(!uid)return 0;return Number(readDeletedMap()?.[uid]?.[String(slot)]||0)}
function markDeleted(slot){const uid=session?.user?.id;if(!uid)return;const map=readDeletedMap();map[uid]=map[uid]||{};map[uid][String(slot)]=Date.now();localStorage.setItem(DELETED_KEY,JSON.stringify(map))}
function clearDeleted(slot){const uid=session?.user?.id;if(!uid)return;const map=readDeletedMap();if(map[uid]){delete map[uid][String(slot)];if(!Object.keys(map[uid]).length)delete map[uid];localStorage.setItem(DELETED_KEY,JSON.stringify(map))}}
async function getCloudSlot(slot){if(!session?.user?.id)return null;const r=await api(`/rest/v1/dynasty_saves?user_id=eq.${encodeURIComponent(session.user.id)}&slot=eq.${slot}&select=slot,save_data,saved_at,updated_at&limit=1`);if(!r.ok)throw new Error(`Cloud save could not be read (${r.status})`);const rows=await r.json();return rows[0]||null}
async function deleteCloudSlot(slot){if(!session?.user?.id)return;const r=await api(`/rest/v1/dynasty_saves?user_id=eq.${encodeURIComponent(session.user.id)}&slot=eq.${slot}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});if(!r.ok)throw new Error(`Cloud delete failed (${r.status})`);clearDeleted(slot)}
async function putCloudSlot(slot,local){if(!session?.user?.id||!local)return;const body={user_id:session.user.id,slot:Number(slot),save_data:local.data,saved_at:local.savedAt||Date.now(),app_version:'web-v27.4.34-build-235',device_name:navigator.userAgentData?.mobile?'Web Phone':'Web Browser'};const r=await api('/rest/v1/dynasty_saves?on_conflict=user_id,slot',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`Cloud save failed (${r.status})`);clearDeleted(slot)}
let cloudReloadNeeded=false;
async function applyCloudSlot(slot,row){const raw=JSON.stringify(row.save_data);localStorage.setItem(`${PREFIX}_slot${slot}`,raw);await idbPut(slot,raw);clearDeleted(slot);try{window.SDF_RELEASE_TEST?.renderSaveManager?.()}catch{}if(typeof state!=='undefined'&&state?.school&&String(state.saveSlot||'1')===String(slot))cloudReloadNeeded=true}
async function syncSlot(slot,{preferLocal=false}={}){
 assertAccount();
 if(!session?.user?.id)return;
 const local=getLocal(slot),remote=await getCloudSlot(slot),localTime=Number(local?.savedAt||0),remoteTime=Number(remote?.saved_at||0),deletedAt=tombstone(slot);
 assertAccount();
 if(deletedAt){if(!remote){clearDeleted(slot);return}if(deletedAt>=remoteTime){await deleteCloudSlot(slot);return}clearDeleted(slot)}
 if(local&&!remote)return putCloudSlot(slot,local);
 if(!local&&remote)return applyCloudSlot(slot,remote);
 if(!local&&!remote)return;
 if(preferLocal||localTime>=remoteTime)return putCloudSlot(slot,local);
 return applyCloudSlot(slot,remote);
}
async function syncAllSlots(){if(!cloudReady()||!session?.user?.id||cloudBusy||!navigator.onLine)return;cloudBusy=true;cloudReloadNeeded=false;renderCloudBar();try{for(const slot of ['1','2','3'])await syncSlot(slot);cloudStatus('Synced just now');if(cloudReloadNeeded){cloudStatus('Newer cloud save loaded · refreshing…');setTimeout(()=>location.reload(),250)}}catch(e){console.warn(e);cloudStatus('Sync needs attention',true)}finally{cloudBusy=false;renderCloudBar()}}
function queueCloudSave(slot){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>syncSlot(String(slot),{preferLocal:true}).then(()=>{cloudStatus('Synced just now');renderCloudBar()}).catch(e=>{console.warn(e);cloudStatus('Saved locally · cloud pending',true);renderCloudBar()}),800)}

let statusOverride='';
function cloudStatus(text,error=false){statusOverride=text;const el=document.querySelector('#webCloudStatus');if(el){el.textContent=text;el.classList.toggle('web-offline-badge',error)}}
function injectCloudBar(){if(document.querySelector('#webCloudBar'))return;const bar=document.createElement('div');bar.id='webCloudBar';bar.className='web-cloud-bar';bar.innerHTML='<div class="web-cloud-pill"><span id="webCloudStatus">Local autosave ready</span><button id="webCloudAction" class="btn neutral small" type="button">Cloud Sync</button></div>';document.querySelector('.topbar')?.insertAdjacentElement('afterend',bar);document.querySelector('#webCloudAction')?.addEventListener('click',openCloudDialog)}
function renderCloudBar(){injectCloudBar();const status=document.querySelector('#webCloudStatus'),button=document.querySelector('#webCloudAction');if(!status||!button)return;
 if(!navigator.onLine){status.textContent='Offline · saving on this device';status.classList.add('web-offline-badge');button.textContent=session?'Account':'Cloud Sync';return}
 status.classList.remove('web-offline-badge');
 if(statusOverride){status.textContent=statusOverride;statusOverride=''}
 else if(!cloudReady())status.textContent='Local save · cloud setup pending';
 else if(!session)status.textContent='Local save · sign in to sync';
 else status.textContent=cloudBusy?'Syncing…':`Cloud sync · ${session.user?.email||'signed in'}`;
 button.textContent=session?'Account':'Sign In';
}
function openCloudDialog(){
 const body=document.getElementById('modalBody'),modal=document.getElementById('modal');if(!body||!modal)return;
 if(!cloudReady()){
  body.innerHTML='<span class="eyebrow">WEB CLOUD SAVE</span><h2>Finish Supabase Setup</h2><p class="web-cloud-note">Local browser autosaves are already active. To sync dynasties between PC and phone, add your Supabase Project URL and publishable key to <b>cloud-config.js</b>, then redeploy.</p><p class="muted">Never put a service_role or secret key in browser code.</p>';
 }else if(session){
  body.innerHTML=`<span class="eyebrow">WEB CLOUD SAVE</span><h2>Account</h2><p>Signed in as <b>${escapeHtml(session.user?.email||'player')}</b>.</p><p class="web-cloud-note">Your three dynasty slots remain saved locally and are mirrored to your account. The newer copy wins when you sign in on another device.</p><div class="web-auth-actions"><button id="webSyncNow" class="btn primary">Sync Now</button><button id="webSignOut" class="btn danger">Sign Out</button></div>`;
  setTimeout(()=>{document.getElementById('webSyncNow')?.addEventListener('click',async()=>{await syncAllSlots();window.toast?.('Cloud saves synced.')});document.getElementById('webSignOut')?.addEventListener('click',()=>{signOut();modal.classList.add('hidden');window.toast?.('Signed out. Local saves remain on this device.')})},0);
 }else{
  body.innerHTML='<span class="eyebrow">WEB CLOUD SAVE</span><h2>Sync Your Dynasty</h2><p class="web-cloud-note">Use the same account on PC and phone. Your local save remains available even when you are offline.</p><div class="web-auth-grid"><label>Email<input id="webAuthEmail" type="email" autocomplete="email"></label><label>Password<input id="webAuthPassword" type="password" autocomplete="current-password" minlength="6"></label></div><div class="web-auth-actions"><button id="webSignIn" class="btn primary">Sign In</button><button id="webSignUp" class="btn neutral">Create Account</button></div><p id="webAuthMessage" class="muted"></p>';
  const submit=async mode=>{const email=document.getElementById('webAuthEmail')?.value.trim(),password=document.getElementById('webAuthPassword')?.value||'',msg=document.getElementById('webAuthMessage');if(!email||password.length<6){msg.textContent='Enter an email and a password of at least 6 characters.';return}msg.textContent=mode==='in'?'Signing in…':'Creating account…';try{const data=mode==='in'?await signIn(email,password):await signUp(email,password);if(mode==='up'&&!data?.access_token){msg.textContent='Account created. Check your email to confirm it, then sign in.';return}modal.classList.add('hidden');window.toast?.('Cloud sync connected.');renderCloudBar()}catch(e){msg.textContent=e.message}};
  setTimeout(()=>{document.getElementById('webSignIn')?.addEventListener('click',()=>submit('in'));document.getElementById('webSignUp')?.addEventListener('click',()=>submit('up'))},0);
 }
 modal.classList.remove('hidden');
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function installSaveHooks(){const api=window.SDF_RELEASE_TEST;if(!api?.saveNow)return;const localSave=api.saveNow.bind(api);api.saveNow=function(reason,manual,backup){const ok=localSave(reason,manual,backup);if(ok){const slot=String(state?.saveSlot||'1'),raw=localStorage.getItem(`${PREFIX}_slot${slot}`);clearDeleted(slot);if(raw)idbPut(slot,raw);if(session&&navigator.onLine)queueCloudSave(slot)}return ok};window.save=()=>api.saveNow('Manual save',true,true)}
function installDeleteHooks(){const api=window.SDF_RELEASE_TEST;if(!api?.deleteSlotCompletely)return;
 const remove=slot=>{if(session?.user?.id)markDeleted(slot);return api.deleteSlotCompletely(String(slot))};
 const selected=document.getElementById('deleteSelectedSaveBtn');if(selected)selected.onclick=()=>{const slot=String(document.getElementById('saveSlotPicker')?.value||'1'),info=api.readSlotSummary?.(slot);if(info?.empty)return;if(confirm(`Delete ${info?.name||'the dynasty'} from Slot ${slot}?`)){if(remove(slot)){api.renderSaveManager?.();window.toast?.(`Slot ${slot} deleted.`);if(session&&navigator.onLine)syncSlot(slot).catch(console.warn)}else window.toast?.(`Slot ${slot} could not be deleted.`,'error')}};
 const reset=document.getElementById('resetBtn');if(reset)reset.onclick=()=>{const slot=String(state?.saveSlot||document.getElementById('saveSlotPicker')?.value||'1');if(confirm(`Permanently delete the dynasty in Slot ${slot}? This cannot be undone unless you exported a backup.`)){if(remove(slot)){if(session&&navigator.onLine)syncSlot(slot).catch(console.warn);location.reload()}else window.toast?.(`Slot ${slot} could not be deleted.`,'error')}}
}
function replaceLogoPaths(){try{if(typeof TEAM_BRANDING==='undefined')return;for(const b of Object.values(TEAM_BRANDING)){const p=b.primary||'#2563eb',s=b.secondary||'#22d3ee',abbr=b.abbr||'SD';const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${p}"/><circle cx="64" cy="64" r="43" fill="${s}" opacity=".23"/><text x="64" y="75" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="34" fill="white">${abbr}</text></svg>`;b.logo='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}}catch(e){console.warn('Web logo fallback failed',e)}}
function installPwa(){if(!('serviceWorker' in navigator)||!location.protocol.startsWith('http'))return;const register=()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('PWA worker failed',e));if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true})}

window.addEventListener('online',()=>{renderCloudBar();syncAllSlots()});window.addEventListener('offline',renderCloudBar);
replaceLogoPaths();installSaveHooks();installDeleteHooks();installPwa();injectCloudBar();restoreLocalMirrors().then(async()=>{await restoreSession();renderCloudBar();if(session&&navigator.onLine)syncAllSlots()});
window.SDF_WEB={syncAllSlots,openCloudDialog,idbGet,restoreLocalMirrors};
})();
