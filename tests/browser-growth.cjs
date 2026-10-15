'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const browser=file('browser-growth.js');
const boot=file('browser-bootstrap.js');
const config=file('browser-community-config.js');
const build=file('build_web.py');
assert.doesNotThrow(()=>new vm.Script(browser));
assert.doesNotThrow(()=>new vm.Script(boot));
assert.match(build, /'browser-growth\.js'/);
assert.match(build, /'browser-community-config\.js'/);
assert.match(boot, /void \(async/);
assert.match(boot, /Optional browser module unavailable/);
assert.match(boot, /await window\.SDF_BROWSER_SAVE_BRIDGE\.ready/,'Never bypass save hydration to improve startup time.');
assert.match(boot, /sdf:boot-phase/);

const events={};
const context={
  window:{
    addEventListener:(k,fn)=>{events[k]=fn;},
    SDF_COMMUNITY_LINKS:{discord:'',facebook:''}
  },
  document:{getElementById:()=>null},
  location:{search:''},
  URL,
  URLSearchParams,
  navigator:{},
  performance:{now:()=>1000},
  console
};
vm.runInNewContext(config,context,{filename:'browser-community-config.js'});
vm.runInNewContext(browser,context,{filename:'browser-growth.js'});
const qa=context.window.SDF_GROWTH_QA;
assert.ok(qa&&typeof qa.secureUrl==='function','Growth QA probe must be available for validation.');

for(const [channel,url] of [
  ['discord','https://discord.gg/AbC123'],
  ['discord','https://discord.com/invite/AbC123'],
  ['facebook','https://www.facebook.com/example.page'],
  ['facebook','https://facebook.com/groups/example123']
]){
  assert.equal(qa.secureUrl(url,channel),url);
}
for(const [channel,url] of [
  ['discord','http://discord.gg/AbC123'],
  ['discord','https://notdiscord.gg/x'],
  ['discord','https://discord.com/channels/x'],
  ['discord','https://discord.gg/'],
  ['discord','https://someone:password@discord.gg/abcd'],
  ['facebook','https://notfacebook.com/sdf'],
  ['facebook','https://facebook.com/'],
  ['facebook','javascript:alert(1)'],
  ['facebook','https://www.facebook.com:8443/sdf']
]){
  assert.equal(qa.secureUrl(url,channel),null,'Unsafe/non-community URL was incorrectly accepted: '+url);
}
assert.equal(qa.snapshot().verifiedDiscordLinkConfigured,true);
assert.equal(qa.snapshot().verifiedFacebookLinkConfigured,true);
assert.ok(!context.window.SDF_GROWTH_QA.snapshot().debugEnabled,'QA should be opt-in.');

console.log('Browser growth check passed: optional modules, safe URLs, opt-in diagnostics, save-safe boot.');

context.window.SDF_COMMUNITY_LINKS={discord:'',facebook:''};assert.equal(qa.snapshot().verifiedDiscordLinkConfigured,false);assert.equal(qa.snapshot().verifiedFacebookLinkConfigured,false);
