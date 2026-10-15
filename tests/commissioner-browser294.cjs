const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),bundle=fs.readFileSync(path.join(root,'dist/app-bundle.js'),'utf8');
test('Browser uses current shared Commissioner API instead of replacing it with legacy editors',()=>{
 const hooks={},api={hasCommissioner:()=>true,openConferenceManager(){},refreshButtons(){this.refreshed=true},openPlayerEditor(){},openTeamEditor(){}};
 const box={window:{SDF_COMMISSIONER:api,addEventListener:(name,fn)=>hooks[name]=fn,SDF_LEAGUE292:{inject(){}}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'browser-editors.js'),'utf8'),box);hooks['sdf:entitlements']();assert.equal(box.window.SDF_COMMISSIONER,api);assert.equal(api.refreshed,true);assert.equal(api.hasCommissioner(),true);assert.equal(typeof api.openConferenceManager,'function');
 vm.runInNewContext(fs.readFileSync(path.join(root,'browser-team-editor-v195.js'),'utf8'),box);assert.equal(box.window.SDF_COMMISSIONER,api);
 const bridge=fs.readFileSync(path.join(root,'browser-commerce-bridge.js'),'utf8');assert(!bridge.includes("if(androidEditor)androidEditor.remove()"));assert(!bridge.includes('#sdfPlayShop,#sdfAndroidEditor'));assert(bundle.includes('hasCommissioner:()=>owns(\'commissioner_mode\')'));
});
test('Shared editor ownership follows browser account purchases and changes without native purchases',()=>{
 const start=bundle.indexOf('function owns(k){if(window.SDF_COMMERCE?.owns)'),end=bundle.indexOf('\nfunction price(',start);assert(start>0&&end>start);
 let purchased=new Set();const box={window:{SDF_COMMERCE:{owns:k=>purchased.has(k)}},ownedSet:()=>new Set(['commissioner_mode']),ALL_ACCESS_INCLUDED:new Set(),COMMISSIONER_INCLUDED:new Set()};vm.createContext(box);vm.runInContext(bundle.slice(start,end),box);
 assert.equal(box.owns('commissioner_mode'),false);purchased.add('commissioner_mode');assert.equal(box.owns('commissioner_mode'),true);purchased.clear();assert.equal(box.owns('commissioner_mode'),false);
});
test('Shared locked checkout routes to browser checkout while editor DOM remains usable',()=>{
 const start=bundle.indexOf('function openShop(focus=null){if(window.SDF_COMMERCE?.openShop)'),end=bundle.indexOf('\n',start);assert(start>0);let opened=0;const box={window:{SDF_COMMERCE:{openShop:()=>++opened}}};vm.createContext(box);vm.runInContext(bundle.slice(start,end),box);box.openShop('commissioner_mode');assert.equal(opened,1);
 const boot=fs.readFileSync(path.join(root,'browser-bootstrap.js'),'utf8');assert(boot.includes("script.dataset.sdfPaidEditors='1'"));assert(boot.includes("script.src=src+'?v='+build"));assert(bundle.includes("&&!window.SDF_BROWSER_SAVE_BRIDGE&&!!window.indexedDB"));
});
