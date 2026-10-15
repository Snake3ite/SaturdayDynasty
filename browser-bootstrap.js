// Save hydration remains mandatory; optional acquisition UI never gates it.
(async()=>{
 'use strict';
 // Keep help available through Page guide / Guide my first week. First-time
 // browser play should not be interrupted by automatic full-screen guides.
 // Preserve any preference the player has already chosen.
 try{if(localStorage.getItem('SDF_CONTEXT_HELP_AUTO_TIPS')===null)localStorage.setItem('SDF_CONTEXT_HELP_AUTO_TIPS','0')}catch{}
 const build=document.getElementById('releaseLabel')?.textContent.match(/\bBuild\s+(\d+)/)?.[1]||'current';
 const phases=[];
 const phase=name=>{phases.push(name);window.dispatchEvent(new CustomEvent('sdf:boot-phase',{detail:{phase:name}}))};
 window.SDF_BROWSER_BOOT={phases};
 const load=(src,{optional=false}={})=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src+'?v='+build;
  if(src==='browser-editors.js')script.dataset.sdfPaidEditors='1';
  if(src==='browser-feedback.js')script.dataset.sdfFeedback='1';
  let settled=false;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timeout);if(error){script.remove();reject(error)}else resolve()};
  const timeout=setTimeout(()=>finish(new Error('Loading timed out: '+src)),optional?3000:20000);
  script.onload=()=>finish();script.onerror=()=>finish(new Error('Could not load '+src));document.body.append(script);
 });
 const optional=async src=>{try{await load(src,{optional:true})}catch{console.warn('Optional browser module unavailable:',src)}};
 // Deliberately not awaited by core startup, including requests that never settle.
 void (async()=>{await optional('browser-community-config.js');await optional('browser-growth-analytics.js');await optional('browser-growth.js')})();
 let slowNotice=null;
 const slowTimer=setTimeout(()=>{
  slowNotice=document.createElement('p');slowNotice.id='sdfBrowserSlowBoot';slowNotice.setAttribute('role','status');slowNotice.className='web-cloud-note';
  slowNotice.textContent='Still preparing your saved dynasties. Check your connection or browser storage permissions if this continues. Please do not clear site data: that can remove local saves.';
  document.body.prepend(slowNotice);
 },20000);
 try{
  phase('save_scope');await load('cloud-account-scope.js');phase('save_bridge');await load('browser-save-bridge.js');
  phase('save_hydrating');await window.SDF_BROWSER_SAVE_BRIDGE.ready;phase('save_ready');
  window.SDF_ANDROID_FEEDBACK={open:()=>window.SDF_FEEDBACK?.open(),close:()=>window.SDF_FEEDBACK?.close()};
  await load('ad-config.js');phase('core_loading');await load('app-bundle.js');phase('core_loaded');
  // Current browser account entitlements remain authoritative.
  for(const src of ['browser-editors.js','browser-feedback.js','cloud-config.js','web-shell.js','browser-commerce-bridge.js','browser-team-editor-v195.js'])await optional(src);
  phase('game_ready');window.SDF_BROWSER_BOOT.ready=true;window.dispatchEvent(new Event('sdf:web-ready'));
 }catch(error){
  phase('failed');console.error(error);const notice=document.createElement('p');notice.setAttribute('role','alert');
  notice.textContent='The game could not finish loading. Please reload this page. Do not clear site data; your saved dynasties may still be stored here.';document.body.prepend(notice);
 }finally{clearTimeout(slowTimer);slowNotice?.remove()}
})();

