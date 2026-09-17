// Hydrate existing browser saves before the shared game reads its startup slots.
(async()=>{
 'use strict';
 const load=src=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src+'?v=236';
  if(src==='browser-editors.js')script.dataset.sdfPaidEditors='1';
  if(src==='browser-feedback.js')script.dataset.sdfFeedback='1';
  script.onload=resolve;script.onerror=()=>reject(new Error('Could not load '+src));document.body.append(script);
 });
 try{
  await load('cloud-account-scope.js');
  await load('browser-save-bridge.js');
  await window.SDF_BROWSER_SAVE_BRIDGE.ready;
  window.SDF_ANDROID_FEEDBACK={open:()=>window.SDF_FEEDBACK?.open(),close:()=>window.SDF_FEEDBACK?.close()};
  await load('ad-config.js');
  await load('app-bundle.js');
  // Register local assets before cloud-config's optional legacy CDN loaders run.
  await load('browser-editors.js');
  await load('browser-feedback.js');
  await load('cloud-config.js');
  await load('web-shell.js');
  await load('browser-commerce-bridge.js');
  await load('browser-team-editor-v195.js');
  window.dispatchEvent(new Event('sdf:web-ready'));
 }catch(error){
  console.error(error);
  const notice=document.createElement('p');notice.setAttribute('role','alert');
  notice.textContent='The game could not finish loading. Please reload this page. Your saved dynasties have not been deleted.';
  document.body.prepend(notice);
 }
})();
