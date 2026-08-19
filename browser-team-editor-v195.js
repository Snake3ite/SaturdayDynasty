// Saturday Dynasty Football — Build 195 browser league-wide Team Editor.
// Keeps the browser commissioner UI authoritative while delegating all identity
// persistence and league synchronization to the shared Build 195 runtime.
(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  let work=null,activeTeamId=null,pendingTeamLogo=null;

  const rel=()=>window.SDF_RELEASE_TEST;
  const api=()=>window.SDF_V195;
  const commerce=()=>window.SDF_COMMERCE;
  const owns=()=>!!(window.SDF_COMMISSIONER?.hasTeamEditor?.()||commerce()?.owns?.('team_editor')||commerce()?.owns?.('commissioner_mode'));

  async function ensureOwned(){
    if(owns())return true;
    await commerce()?.refreshEntitlements?.(true);
    if(owns())return true;
    commerce()?.openShop?.();
    return false;
  }
  function begin(){work=rel()?.compactState?.()||null;return work}
  function current(){return work}
  function commit(reason){
    if(!work||!rel()?.hydrateState||!rel()?.saveNow)return false;
    rel().hydrateState(work);
    work=null;
    window.renderAll?.();
    rel().saveNow(reason,true,true);
    window.dispatchEvent(new CustomEvent('sdf:editor-saved',{detail:{reason}}));
    return true;
  }
  function overlay(){return $('#sdfEditorOverlay')}
  function makeOverlay(){
    window.SDF_BROWSER_COMMERCE_BRIDGE?.removeAndroidEditor?.();
    if(overlay())return overlay();
    const e=document.createElement('div');e.id='sdfEditorOverlay';
    e.innerHTML=`<section id="sdfEditorBox" role="dialog" aria-modal="true"><header class="sdf-ed-head"><div><div class="sdf-ed-ey">COMMISSIONER TOOLS</div><h2 id="sdfEditorTitle"></h2><p id="sdfEditorSubtitle"></p></div><button class="sdf-ed-close">×</button></header><div class="sdf-ed-body"><div id="sdfEditorToast"></div><div id="sdfEditorContent"></div></div></section>`;
    document.body.append(e);$('.sdf-ed-close',e).onclick=()=>e.classList.remove('open');e.onclick=x=>{if(x.target===e)e.classList.remove('open')};return e;
  }
  function show(title,sub,html){
    const e=makeOverlay();
    $('#sdfEditorTitle',e).textContent=title;$('#sdfEditorSubtitle',e).textContent=sub;$('#sdfEditorContent',e).innerHTML=html;
    const t=$('#sdfEditorToast',e);t.textContent='';t.className='';e.classList.add('open');
  }
  function toast(text,bad=false){const t=$('#sdfEditorToast',overlay());if(!t)return;t.textContent=text;t.className=bad?'bad':'good';clearTimeout(toast.t);toast.t=setTimeout(()=>{if(t)t.className=''},2600)}
  function teams(s){return api()?.teamList?.(s)||[s.school]}
  function team(s,id){return api()?.resolvedTeam?.(s,id)||s.school}
  function root(){return overlay()||document}

  function formHtml(s,id){
    const c=team(s,id),t=c.stadium||{},confs=api()?.conferences?.()||[];
    return `<section id="sdfTeamForm" class="sdf-ed-panel sdf-team-editor-v195"><div class="sdf-form">
      <div class="sdf-team-brand-row-v195"><img id="teLogoPreview" class="sdf-team-logo-preview-v195" src="${esc(c.logo||'icon.svg')}" alt=""><div><b>${esc(c.name)}</b><div class="sub">${esc(c.conference)} · Program ID ${c.id}</div></div></div>
      <label class="wide">PROGRAM NAME<input id="teName" maxlength="38" value="${esc(c.name)}"></label>
      <label>ABBREVIATION<input id="teAbbr" maxlength="5" value="${esc(c.abbr||'')}"></label>
      <label>CONFERENCE<select id="teConference">${confs.map(x=>`<option ${x===c.conference?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <label>CITY<input id="teCity" maxlength="28" value="${esc(c.city||'')}"></label><label>STATE<input id="teState" maxlength="3" value="${esc(c.state||'')}"></label>
      <div class="sdf-form-section">BRANDING</div>
      <label>PRIMARY COLOR<input id="tePrimary" type="color" value="${esc(c.primary||'#2563eb')}"></label><label>SECONDARY COLOR<input id="teSecondary" type="color" value="${esc(c.secondary||'#22d3ee')}"></label><label>ACCENT COLOR<input id="teAccent" type="color" value="${esc(c.accent||'#ffffff')}"></label>
      <label>TEAM LOGO<input id="teLogo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label>
      <div class="sdf-team-editor-note-v195">Custom logos are resized into this dynasty save and follow the save across Android and web. Conference edits change league alignment; already-played games stay on the current season schedule.</div>
      <div class="sdf-form-section">PROGRAM RATINGS</div>
      <label>PRESTIGE<input id="tePrestige" type="number" min="20" max="99" value="${clamp(c.prestige,20,99)}"></label><label>RECENT SUCCESS<input id="teRecent" type="number" min="20" max="99" value="${clamp(c.recent,20,99)}"></label><label>FACILITIES REPUTATION<input id="teFacilities" type="number" min="20" max="99" value="${clamp(c.facilities,20,99)}"></label><label>PRO PIPELINE<input id="tePro" type="number" min="20" max="99" value="${clamp(c.pro,20,99)}"></label><label>NIL REPUTATION<input id="teNil" type="number" min="20" max="99" value="${clamp(c.nil,20,99)}"></label><label>ACADEMICS<input id="teAcademics" type="number" min="20" max="99" value="${clamp(c.academics,20,99)}"></label>
      <div class="sdf-form-section">STADIUM</div><label>STADIUM NAME<input id="teStadium" maxlength="40" value="${esc(t.name||'Memorial Stadium')}"></label><label>CAPACITY<input id="teCapacity" type="number" min="10000" max="150000" step="500" value="${clamp(t.capacity||55000,10000,150000)}"></label>
      </div><div class="sdf-ed-actions"><button id="teResetLogo" class="sdf-secondary">Reset Logo</button><button id="teSave" class="sdf-save">Save Program</button></div></section>`;
  }
  function bindForm(){
    const r=root();pendingTeamLogo=null;
    const input=$('#teLogo',r);if(input)input.onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{pendingTeamLogo=await api()?.readLogoFile?.(f);if(pendingTeamLogo)$('#teLogoPreview',r).src=pendingTeamLogo}catch(err){toast(err?.message||'Could not load logo.',true)}};
    const reset=$('#teResetLogo',r);if(reset)reset.onclick=()=>{pendingTeamLogo='__RESET__';const img=$('#teLogoPreview',r);if(img)img.src=api()?.defaultLogo?.(activeTeamId)||'icon.svg'};
    const save=$('#teSave',r);if(save)save.onclick=saveTeam;
  }
  function renderForm(){const s=current(),host=$('#sdfTeamForm',root());if(!s||!host)return;const tmp=document.createElement('div');tmp.innerHTML=formHtml(s,activeTeamId);host.replaceWith(tmp.firstElementChild);bindForm()}
  function saveTeam(){
    const s=current(),r=root(),v195=api();if(!s?.school||!activeTeamId||!v195?.applyTeamEdit)return toast('Build 195 Team Editor runtime is unavailable.',true);
    const changes={name:$('#teName',r)?.value,abbr:$('#teAbbr',r)?.value,conference:$('#teConference',r)?.value,city:$('#teCity',r)?.value,state:$('#teState',r)?.value,primary:$('#tePrimary',r)?.value,secondary:$('#teSecondary',r)?.value,accent:$('#teAccent',r)?.value,prestige:$('#tePrestige',r)?.value,recent:$('#teRecent',r)?.value,facilities:$('#teFacilities',r)?.value,pro:$('#tePro',r)?.value,nil:$('#teNil',r)?.value,academics:$('#teAcademics',r)?.value,stadiumName:$('#teStadium',r)?.value,stadiumCapacity:$('#teCapacity',r)?.value};
    if(pendingTeamLogo)changes.logoData=pendingTeamLogo;
    v195.applyTeamEdit(s,activeTeamId,changes);
    const edited=v195.resolvedTeam(s,activeTeamId),id=activeTeamId,name=edited.name;
    if(commit(`League Team Editor: ${name}`)){openLeagueTeamEditor(id,true);setTimeout(()=>toast(`${name} saved.`),0)}
  }
  async function openLeagueTeamEditor(id=null,skip=false){
    if(typeof id==='boolean'){skip=id;id=null}
    if(!skip&&!(await ensureOwned()))return;
    const s=begin();if(!s?.school){work=null;return alert('Load a dynasty before opening Team Editor.')}
    if(!api()?.teamList){work=null;return alert('Build 195 league editor runtime is unavailable.')}
    const list=teams(s);activeTeamId=id&&list.some(t=>Number(t.id)===Number(id))?Number(id):Number(s.school.id);
    show('League Team Editor','Commissioner Mode · edit identity, branding, conference, ratings and stadium for all 128 programs',`<div class="sdf-ed-grid"><aside class="sdf-ed-panel"><h3>All Programs</h3><input id="teSearch" class="sdf-ed-search" type="search" placeholder="Search team or conference"><div class="sdf-player-list">${list.map(t=>`<button class="sdf-player-row ${Number(t.id)===Number(activeTeamId)?'active':''}" data-id="${t.id}" data-q="${esc(`${t.name} ${t.abbr||''} ${t.conference} ${t.city||''} ${t.state||''}`.toLowerCase())}"><span><b>${esc(t.name)}</b><br><small>${esc(t.conference)} · ${esc(t.abbr||'')}</small></span><img src="${esc(t.logo||'icon.svg')}" alt="" style="width:30px;height:30px;object-fit:contain"></button>`).join('')}</div></aside>${formHtml(s,activeTeamId)}</div>`);
    const r=root();$('#teSearch',r).oninput=e=>$$('.sdf-player-row',r).forEach(b=>b.hidden=!b.dataset.q.includes(e.target.value.trim().toLowerCase()));$$('.sdf-player-row',r).forEach(b=>b.onclick=()=>{activeTeamId=Number(b.dataset.id);$$('.sdf-player-row',r).forEach(x=>x.classList.toggle('active',x===b));renderForm()});bindForm();
  }

  function install(){
    window.SDF_BROWSER_COMMERCE_BRIDGE?.removeAndroidEditor?.();
    if(window.SDF_COMMISSIONER){window.SDF_COMMISSIONER.openTeamEditor=openLeagueTeamEditor;window.SDF_COMMISSIONER.openLeagueTeamEditor=openLeagueTeamEditor}
    const b=$('#sdfTeamEditorBtn');if(b){b.dataset.sdfLeagueTeamEditor='195';b.onclick=e=>{e?.preventDefault?.();openLeagueTeamEditor()}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#sdfTeamEditorBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.SDF_BROWSER_COMMERCE_BRIDGE?.removeAndroidEditor?.();openLeagueTeamEditor()},true);
  window.addEventListener('sdf:entitlements',install);
  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;install()})});
  const init=()=>{install();observer.observe(document.body,{childList:true,subtree:true});};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  window.SDF_BROWSER_TEAM_EDITOR_V195={version:195,open:openLeagueTeamEditor};
})();
