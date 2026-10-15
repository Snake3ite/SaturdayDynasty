const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../browser-bootstrap.js'),'utf8');
function boot({hungOptional=false,hydrate=Promise.resolve(),failCore=false}={}){
 const scripts=[],events=[],timers=new Map();let timerId=0;
 const c={window:{SDF_BROWSER_SAVE_BRIDGE:{ready:hydrate},dispatchEvent:e=>events.push(e.type)},document:{getElementById:()=>({textContent:'Web V27.4.97 · Build 298 · Test'}),createElement:()=>({dataset:{},setAttribute(){},remove(){}}),body:{append:s=>{const file=s.src.split('?')[0];scripts.push(file);if(hungOptional&&file==='browser-community-config.js')return;queueMicrotask(()=>failCore&&file==='app-bundle.js'?s.onerror():s.onload())},prepend(){}}},console:{warn(){},error(){}},Event,CustomEvent,setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(code,c);return{c,scripts,events,timers};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('A never-resolving optional module cannot block core startup',async()=>{const h=boot({hungOptional:true});await settle();assert(h.scripts.includes('app-bundle.js'));assert.equal(h.c.window.SDF_BROWSER_BOOT.ready,true);assert(h.events.includes('sdf:web-ready'))});
test('Slow save hydration is never bypassed to improve apparent startup',async()=>{let ready;const h=boot({hydrate:new Promise(r=>ready=r)});await settle();assert(!h.scripts.includes('app-bundle.js'));assert(h.c.window.SDF_BROWSER_BOOT.phases.includes('save_hydrating'));ready();await settle();assert(h.scripts.includes('app-bundle.js'));assert.equal(h.c.window.SDF_BROWSER_BOOT.ready,true)});
test('Core script failure is distinct from an optional module failure',async()=>{const h=boot({failCore:true});await settle();assert(h.c.window.SDF_BROWSER_BOOT.phases.includes('failed'));assert(!h.events.includes('sdf:web-ready'))});
