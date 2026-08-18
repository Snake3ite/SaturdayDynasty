// Saturday Dynasty Football — browser save storage bridge.
// Dynasty account saves live in Supabase. This layer removes the three large save slots
// from localStorage's small quota while preserving the synchronous Storage API expected
// by the shared game/runtime and web-shell cloud sync.
(()=>{
  'use strict';

  const PREFIX='SaturdayDynastyFootballAndroidV1';
  const SESSION_KEY='SDF_SUPABASE_SESSION';
  const DB_NAME='SaturdayDynastyWeb';
  const STORE='saves';
  const SLOT_RE=new RegExp(`^${PREFIX}_slot([123])$`);
  const virtual=new Map();

  const previousGet=Storage.prototype.getItem;
  const previousSet=Storage.prototype.setItem;
  const previousRemove=Storage.prototype.removeItem;

  const uidFrom=raw=>{try{return JSON.parse(raw||'null')?.user?.id||null}catch{return null}};
  const accountUid=()=>uidFrom(previousGet.call(localStorage,SESSION_KEY));
  let activeUid=accountUid();

  const parseSlot=key=>{
    const match=String(key||'').match(SLOT_RE);
    return match?match[1]:null;
  };

  function openDb(){
    if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB unavailable'));
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'slot'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
    });
  }

  async function idbPut(slot,raw){
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put({slot:String(slot),raw:String(raw),updatedAt:Date.now()});
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('IndexedDB save failed'));
        tx.onabort=()=>reject(tx.error||new Error('IndexedDB save aborted'));
      });
      db.close();
      window.dispatchEvent(new CustomEvent('sdf:web-idb-saved',{detail:{slot:String(slot)}}));
      return true;
    }catch(error){
      console.warn('Browser IndexedDB save failed',error);
      return false;
    }
  }

  async function idbDelete(slot){
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).delete(String(slot));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('IndexedDB delete failed'));
      });
      db.close();
    }catch(error){console.warn('Browser IndexedDB delete failed',error)}
  }

  // Seed the synchronous virtual slots from any legacy physical localStorage copies.
  for(const slot of ['1','2','3']){
    const key=`${PREFIX}_slot${slot}`;
    const raw=previousGet.call(localStorage,key);
    if(raw)virtual.set(key,raw);
  }

  Storage.prototype.getItem=function(key){
    if(this===localStorage&&parseSlot(key)){
      const k=String(key);
      if(virtual.has(k))return virtual.get(k);
    }
    return previousGet.call(this,key);
  };

  Storage.prototype.setItem=function(key,value){
    const slot=this===localStorage?parseSlot(key):null;
    if(slot){
      const k=String(key),raw=String(value);
      // Synchronous compatibility for the shared runtime; durable local persistence is IDB.
      virtual.set(k,raw);
      idbPut(slot,raw);
      window.dispatchEvent(new CustomEvent('sdf:web-save-staged',{detail:{slot}}));
      return;
    }

    if(this===localStorage&&String(key)===SESSION_KEY){
      const before=activeUid;
      const result=previousSet.call(this,key,value);
      activeUid=accountUid();
      if(before&&activeUid!==before)virtual.clear();
      return result;
    }
    return previousSet.call(this,key,value);
  };

  Storage.prototype.removeItem=function(key){
    const slot=this===localStorage?parseSlot(key):null;
    if(slot){
      virtual.delete(String(key));
      try{previousRemove.call(this,key)}catch{}
      idbDelete(slot);
      return;
    }
    return previousRemove.call(this,key);
  };

  // After a verified IDB copy exists, free legacy physical localStorage space. The virtual
  // slot remains readable synchronously, and future reloads are restored from IndexedDB.
  (async()=>{
    for(const slot of ['1','2','3']){
      const key=`${PREFIX}_slot${slot}`,raw=virtual.get(key);
      if(!raw)continue;
      if(await idbPut(slot,raw)){
        try{if(previousGet.call(localStorage,key)===raw)previousRemove.call(localStorage,key)}catch{}
      }
    }
  })();

  window.SDF_BROWSER_SAVE_STORAGE={
    mode:'supabase-account-plus-indexeddb-cache',
    hasVirtualSlot:slot=>virtual.has(`${PREFIX}_slot${slot}`),
    getVirtualSlot:slot=>virtual.get(`${PREFIX}_slot${slot}`)||null
  };
})();