// Saturday Dynasty Football — browser commerce routing bridge.
// The shared game bundle contains Android Google Play UI. Browser builds must route
// all paid entry points through the Stripe/Supabase account-commerce layer instead.
(()=>{
  'use strict';

  const SHOP_SELECTORS='#sdfStartupShopBtn,#sdfSponsorShopBtn,#sdfMobileShopBtn';
  const $=s=>document.querySelector(s);
  let currentProfilePlayerId=null;

  const style=document.createElement('style');
  style.id='sdf-browser-commerce-bridge-style';
  style.textContent=`
    #sdfPlayShop,#sdfAndroidPlayerEditorBtn,#sdfAndroidTeamEditorBtn{display:none!important}
  `;
  document.head.appendChild(style);

  const commerce=()=>window.SDF_COMMERCE||null;
  const openWebShop=()=>{
    const c=commerce();
    if(c?.openShop){c.openShop();return true}
    console.error('Saturday Dynasty browser commerce is unavailable.');
    return false;
  };

  function patchAndroidFacade(){
    const a=window.SDF_ANDROID_COMMERCE;
    if(!a)return;
    a.openShop=()=>openWebShop();
    a.closeShop=()=>commerce()?.closeShop?.();
    a.refresh=()=>commerce()?.refreshEntitlements?.(true);
    a.owns=k=>!!commerce()?.owns?.(k);
    a.purchase=()=>openWebShop();
  }

  function closeAndroidShop(){
    const p=$('#sdfPlayShop');
    if(!p)return;
    p.classList.remove('open');
    p.setAttribute('aria-hidden','true');
  }

  function wrapPlayerProfileTracker(){
    const base=window.openPlayerProfile;
    if(typeof base!=='function'||base.__sdfBrowserProfileTracker)return;
    const wrapped=function(id,...args){
      if(id!==undefined&&id!==null&&id!=='')currentProfilePlayerId=id;
      const out=base.apply(this,[id,...args]);
      queueMicrotask(syncProfileButton);
      return out;
    };
    Object.defineProperty(wrapped,'__sdfBrowserProfileTracker',{value:true});
    Object.defineProperty(wrapped,'__sdfBrowserProfileBase',{value:base});
    window.openPlayerProfile=wrapped;
  }

  function syncProfileButton(){
    const b=$('#sdfProfilePlayerEditorBtn');
    if(!b||currentProfilePlayerId===null)return;
    b.dataset.playerId=String(currentProfilePlayerId);
    b.dataset.sdfBrowserPlayerEditor='1';
  }

  function routeVisibleButtons(){
    document.querySelectorAll(SHOP_SELECTORS).forEach(b=>{
      b.dataset.sdfBrowserCommerce='1';
      b.onclick=e=>{e?.preventDefault?.();openWebShop()};
    });
    wrapPlayerProfileTracker();
    syncProfileButton();
    patchAndroidFacade();
    closeAndroidShop();
  }

  // Capture before the Android module's existing onclick closures can run.
  document.addEventListener('click',e=>{
    const target=e.target?.closest?.(SHOP_SELECTORS);
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openWebShop();
  },true);

  // Android and browser layers share the player-profile editor button. Keep the
  // browser commissioner editor authoritative and preserve the player being viewed.
  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('#sdfProfilePlayerEditorBtn');
    if(!target)return;
    const editor=window.SDF_COMMISSIONER?.openPlayerEditor;
    if(typeof editor!=='function')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const id=target.dataset.playerId||currentProfilePlayerId||null;
    editor(id);
  },true);

  // Roster-level browser editor fallback. This keeps the paid tool functional even
  // if a shared render replaces the browser editor button's direct onclick handler.
  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('#sdfPlayerEditorBtn');
    if(!target)return;
    const editor=window.SDF_COMMISSIONER?.openPlayerEditor;
    if(typeof editor!=='function')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    editor();
  },true);

  window.addEventListener('sdf:entitlements',()=>{
    patchAndroidFacade();
    routeVisibleButtons();
  });

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;routeVisibleButtons()});
  });

  const init=()=>{
    routeVisibleButtons();
    observer.observe(document.body,{childList:true,subtree:true});
    // Force one account entitlement refresh after all browser layers are present.
    commerce()?.refreshEntitlements?.(true);
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();

  window.SDF_BROWSER_COMMERCE_BRIDGE={
    version:2,
    openShop:openWebShop,
    refresh:()=>commerce()?.refreshEntitlements?.(true),
    owns:k=>!!commerce()?.owns?.(k),
    currentProfilePlayerId:()=>currentProfilePlayerId
  };
})();
