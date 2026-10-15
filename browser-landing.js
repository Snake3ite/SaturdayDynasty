(()=>{
 'use strict';const api=window.SDF_BROWSER_ANALYTICS;if(!api)return;
 const box=document.getElementById('visitAnalytics');if(box){box.checked=api.permitted();box.disabled=navigator.globalPrivacyControl===true;box.onchange=()=>{api.setConsent(box.checked);if(box.checked)api.record('landing_view',{context:'landing'})}}
 api.record('landing_view',{context:'landing'});
 document.querySelectorAll('[data-play-link]').forEach(link=>link.addEventListener('click',()=>api.record('play_click',{context:'landing'})));
})();
