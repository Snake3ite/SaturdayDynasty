// Saturday Dynasty Football — browser large-save bridge.
// The shared runtime uses synchronous localStorage save APIs. Browser dynasties can now
// exceed practical localStorage quota, so primary slot keys are virtualized in memory and
// durably mirrored to the existing account-scoped IndexedDB save store.
(()=>{
 'use strict';
 const PREFIX='SaturdayDynastyFootballAndroidV1';
 const DB_NAME='SaturdayDynastyWeb';
 const DB_VERSION=1;
 const STORE='saves';
 const SLOT_RE=new RegExp(`^${PREFIX}_slot([123])$`);
 const cache=new Map();
 const pending=new Map();
 const rawGet=Storage.prototype.getItem;
 const rawSet=Storage.prototype.setItem;
 const rawRemove=Storage.prototype.removeItem;
 const isLocal=self=>self===localStorage;
 const slotFrom=key=>String(key||'').match(SLOT_RE)?.[1]||null;
 const savedAt=raw=>{try{return Number(JSON.parse(raw||'null')?._release?.savedAt||0)}catch{return 0}};

 function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'slot'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function idbGet(slot){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(String(slot));r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}finally{db.close()}}
 async function idbPut(slot,raw){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({slot:String(slot),raw:String(raw),updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'))})}finally{db.close()}}
 async function idbDelete(slot){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(String(slot));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
 function reportFailure(error){console.error('Browser save persistence failed',error);const el=document.getElementById('autosaveStatus');if(el){el.className='autosave-status error';const t=el.querySelector('span:last-child');if(t)t.textContent='Save failed'}window.toast?.('Browser save could not be written. Export a backup before leaving this page.','error')}
 function queuePut(slot,raw){const prior=pending.get(slot)||Promise.resolve();const next=prior.catch(()=>{}).then(()=>idbPut(slot,raw)).then(()=>{const key=`${PREFIX}_slot${slot}`;try{rawRemove.call(localStorage,key)}catch{}}).catch(reportFailure);pending.set(slot,next);return next}

 // Seed synchronously so the game can read existing saves immediately while IndexedDB opens.
 for(const slot of ['1','2','3']){const key=`${PREFIX}_slot${slot}`;try{const raw=rawGet.call(localStorage,key);if(raw)cache.set(key,raw)}catch{}}

 Storage.prototype.getItem=function(key){const slot=isLocal(this)?slotFrom(key):null;if(slot){const k=String(key);if(cache.has(k))return cache.get(k);return rawGet.call(this,k)}return rawGet.call(this,key)};
 Storage.prototype.setItem=function(key,value){const slot=isLocal(this)?slotFrom(key):null;if(slot){const k=String(key),raw=String(value);cache.set(k,raw);queuePut(slot,raw);return}return rawSet.call(this,key,value)};
 Storage.prototype.removeItem=function(key){const slot=isLocal(this)?slotFrom(key):null;if(slot){const k=String(key);cache.delete(k);try{rawRemove.call(this,k)}catch{};idbDelete(slot).catch(reportFailure);return}return rawRemove.call(this,key)};

 async function hydrate(){
  for(const slot of ['1','2','3']){
   const key=`${PREFIX}_slot${slot}`,local=cache.get(key)||null;
   try{
    const stored=await idbGet(slot),idbRaw=stored?.raw||null;
    if(idbRaw&&(!local||savedAt(idbRaw)>savedAt(local)))cache.set(key,idbRaw);
    else if(local)await idbPut(slot,local);
    if(cache.has(key))try{rawRemove.call(localStorage,key)}catch{}
   }catch(error){console.warn(`Browser save slot ${slot} migration deferred`,error)}
  }
  try{window.SDF_RELEASE_TEST?.renderSaveManager?.()}catch{}
 }
 const ready=hydrate();
 window.SDF_BROWSER_SAVE_BRIDGE={version:1,ready,usesIndexedDb:true,getSlot:slot=>cache.get(`${PREFIX}_slot${slot}`)||null,flush:()=>Promise.allSettled([...pending.values()])};
})();
