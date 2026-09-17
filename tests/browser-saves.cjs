const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const {IDBFactory}=require('fake-indexeddb');
const root=path.resolve(__dirname,'..');
const account=fs.readFileSync(path.join(root,'cloud-config.js'),'utf8').split('// Browser-only UI.')[0];
const bridge=fs.readFileSync(path.join(root,'browser-save-bridge.js'),'utf8');
const key='SaturdayDynastyFootballAndroidV1_slot1',session='SDF_SUPABASE_SESSION';
const json=(name,t=1)=>JSON.stringify({name,_release:{savedAt:t}});
function environment(){const data=new Map(),factory=new IDBFactory();return{data,factory}}
async function boot(env){
 class Storage{getItem(k){return env.data.get(k)??null}setItem(k,v){if(String(v).length>4000000)throw new Error('QuotaExceededError');env.data.set(k,String(v))}removeItem(k){env.data.delete(k)}}
 class IndexedDB{open(...a){return env.factory.open(...a)}}
 const c={Storage,localStorage:new Storage(),indexedDB:new IndexedDB(),console,Map,Promise,Date,JSON,String,Number,setTimeout,addEventListener:()=>{},document:{getElementById:()=>null},location:{reload:()=>{c.reloaded=true}}};c.window=c;
 vm.createContext(c);vm.runInContext(account,c);vm.runInContext(bridge,c);await c.SDF_BROWSER_SAVE_BRIDGE.ready;return c;
}
(async()=>{
 let e=environment();e.data.set(key,json('legacy',2));let c=await boot(e);assert.equal(c.localStorage.getItem(key),json('legacy',2));
 c=await boot(e);assert.equal(c.localStorage.getItem(key),json('legacy',2));console.log('PASS existing local save migration and reload');
 const large=json('x'.repeat(6000000),3);
 for(const k of [key,key+'_backup','sdf-v170-recovery-1'])c.localStorage.setItem(k,large);
 await c.SDF_BROWSER_SAVE_BRIDGE.flush();c=await boot(e);
 for(const k of [key,key+'_backup','sdf-v170-recovery-1'])assert.equal(c.localStorage.getItem(k),large);
 console.log('PASS 6MB primary, backup, and recovery persistence');
 c.localStorage.setItem(key,json('queued'));c.localStorage.removeItem(key);await c.SDF_BROWSER_SAVE_BRIDGE.flush();c=await boot(e);assert.equal(c.localStorage.getItem(key),null);console.log('PASS queued write then delete does not resurrect');
 c.localStorage.setItem(key,json('guest'));c.localStorage.setItem(session,JSON.stringify({user:{id:'A'}}));await c.SDF_BROWSER_SAVE_BRIDGE.flush();c=await boot(e);assert.equal(c.localStorage.getItem(key),json('guest'));assert.equal(c.localStorage.getItem('sdf-v170-recovery-1'),large);console.log('PASS first sign-in preserves guest dynasty and recovery');
 c.localStorage.setItem(key,json('account A',5));c.localStorage.setItem(session,JSON.stringify({user:{id:'B'}}));assert.equal(c.localStorage.getItem(key),null);c.localStorage.setItem(key,json('stale write'));await c.SDF_BROWSER_SAVE_BRIDGE.flush();
 c=await boot(e);assert.equal(c.localStorage.getItem(key),null);assert.equal(c.localStorage.getItem(key+'_backup'),null);assert.equal(c.localStorage.getItem('sdf-v170-recovery-1'),null);c.localStorage.setItem(key,json('account B',6));await c.SDF_BROWSER_SAVE_BRIDGE.flush();
 c.localStorage.setItem(session,JSON.stringify({user:{id:'A'}}));await c.SDF_BROWSER_SAVE_BRIDGE.flush();c=await boot(e);assert.equal(c.localStorage.getItem(key),json('account A',5));console.log('PASS account switch isolates queued writes and backups');
 c.localStorage.setItem(session,JSON.stringify({user:{id:'A'},refresh_token:'test-only'}));assert.equal(c.SDF_ACCOUNT_SCOPE.switching,false);assert.equal(c.localStorage.getItem(key),json('account A',5));console.log('PASS same-account session refresh preserves save');
})().catch(e=>{console.error(e);process.exitCode=1});
