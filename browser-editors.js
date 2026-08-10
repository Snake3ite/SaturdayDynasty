// Saturday Dynasty Football - browser-only paid editor tools.
// Loaded only by the web build. Android remains unchanged.
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const POSITIONS = ['QB','RB','WR','TE','OT','IOL','EDGE','DL','LB','CB','S','K','P'];
  const ARCH = {
    QB:['Field General','Improviser','Scrambler'], RB:['Power Back','Elusive Back','Receiving Back'],
    WR:['Deep Threat','Route Runner','Physical'], TE:['Vertical Threat','Blocking','Possession'],
    OT:['Pass Protector','Power'], IOL:['Power','Agile'], EDGE:['Speed Rusher','Power Rusher','Run Stopper'],
    DL:['Run Stopper','Power Rusher'], LB:['Field General','Coverage','Run Stopper'],
    CB:['Man Cover','Zone Cover','Slot'], S:['Zone','Hybrid','Run Support'], K:['Accurate','Power'],
    P:['Directional','Power','Coffin Corner']
  };
  const DEV = ['Normal','Impact','Star','Elite'];
  let activePlayerId = null;
  let activeMode = null;

  function release() { return window.SDF_RELEASE_TEST; }
  function state() { return release()?.getState?.() || null; }
  function entitlements() { return window.SDF_COMMERCE?.getEntitlements?.() || null; }
  function owns(key) {
    const e = entitlements();
    return !!(e && (e.commissioner_mode || e[key]));
  }
  async function ensureOwned(key) {
    if (owns(key)) return true;
    await window.SDF_COMMERCE?.refreshEntitlements?.(true);
    if (owns(key)) return true;
    window.SDF_COMMERCE?.openShop?.();
    return false;
  }
  function save(reason) {
    window.renderAll?.();
    release()?.saveNow?.(reason, true, true);
    window.dispatchEvent(new CustomEvent('sdf:editor-saved', { detail: { reason } }));
  }
  function toast(text, bad = false) {
    let t = $('#sdfEditorToast');
    if (!t) return;
    t.textContent = text;
    t.className = bad ? 'bad' : 'good';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { if (t) t.className = ''; }, 2600);
  }

  const style = document.createElement('style');
  style.id = 'sdf-paid-editors-style';
  style.textContent = `
    .sdf-paid-tool{display:inline-flex;align-items:center;gap:7px;border:1px solid #b4943f;border-radius:7px;background:#171e25;color:#f7d873;padding:9px 12px;font-size:.68rem;font-weight:900;letter-spacing:.04em;cursor:pointer}
    .sdf-paid-tool.locked{border-color:#314656;color:#8ba0ad;background:#0b1922}
    #sdfEditorOverlay{position:fixed;inset:0;z-index:24000;display:none;align-items:center;justify-content:center;padding:18px;background:#02080dcc;backdrop-filter:blur(7px)}
    #sdfEditorOverlay.open{display:flex}#sdfEditorBox{width:min(1060px,97vw);max-height:93vh;overflow:auto;border:1px solid #315268;border-radius:14px;background:#071722;color:#edf8ff;box-shadow:0 30px 100px #000a;font-family:system-ui}
    .sdf-ed-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:20px 22px 14px;border-bottom:1px solid #ffffff12}.sdf-ed-head h2{margin:3px 0 4px;font-size:24px}.sdf-ed-head p{margin:0;color:#8fa6b4;font-size:12px}.sdf-ed-ey{font-size:9px;font-weight:900;letter-spacing:.16em;color:#f1c95c}.sdf-ed-close{border:0;border-radius:7px;background:#112b3a;color:#eef7fb;width:36px;height:36px;font-size:20px;cursor:pointer}
    .sdf-ed-body{padding:16px 22px 22px}.sdf-ed-grid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:15px}.sdf-ed-panel{border:1px solid #1d3a4c;border-radius:10px;background:#0a1d29;padding:14px}.sdf-ed-panel h3{margin:0 0 10px;font-size:14px}.sdf-ed-search{width:100%;box-sizing:border-box;margin-bottom:8px;min-height:40px;border:1px solid #284b60;border-radius:6px;background:#06131c;color:#eff9ff;padding:8px 10px}.sdf-player-list{display:grid;gap:5px;max-height:58vh;overflow:auto}.sdf-player-row{display:flex;justify-content:space-between;gap:10px;text-align:left;border:1px solid #173445;border-radius:7px;background:#071722;color:#dcebf3;padding:8px 9px;cursor:pointer}.sdf-player-row.active{border-color:#d0aa44;background:#18232b}.sdf-player-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sdf-player-row small{color:#809aa9}.sdf-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.sdf-form label{display:grid;gap:5px;color:#90a9b7;font-size:10px;font-weight:800;letter-spacing:.03em}.sdf-form input,.sdf-form select{box-sizing:border-box;width:100%;min-height:40px;border:1px solid #284b60;border-radius:6px;background:#06131c;color:#eff9ff;padding:8px 9px}.sdf-form .wide{grid-column:1/-1}.sdf-form-section{grid-column:1/-1;margin-top:4px;padding-top:10px;border-top:1px solid #ffffff0e;color:#e5f2f8;font-size:11px;font-weight:900;letter-spacing:.08em}.sdf-ed-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:15px}.sdf-ed-actions button{min-height:40px;border:0;border-radius:7px;padding:8px 13px;font-weight:900;cursor:pointer}.sdf-save{background:#188875;color:#fff}.sdf-secondary{background:#183343;color:#cce2ed}.sdf-danger{background:#552733;color:#ffd6dd}#sdfEditorToast{min-height:18px;margin:0 0 10px;font-size:11px;color:#91a9b6}#sdfEditorToast.good{color:#6fe0c1}#sdfEditorToast.bad{color:#ff9aaa}.sdf-lock-note{border:1px solid #4b3f20;border-radius:8px;background:#32281466;color:#efd879;padding:12px;font-size:12px}
    @media(max-width:760px){#sdfEditorOverlay{padding:7px}.sdf-ed-body{padding:12px}.sdf-ed-grid{grid-template-columns:1fr}.sdf-player-list{max-height:220px}.sdf-form{grid-template-columns:1fr}.sdf-form .wide,.sdf-form-section{grid-column:1}.sdf-ed-head{padding:15px}.sdf-paid-tool{min-height:42px}}
  `;
  document.head.appendChild(style);

  function makeOverlay() {
    if ($('#sdfEditorOverlay')) return;
    const el = document.createElement('div');
    el.id = 'sdfEditorOverlay';
    el.innerHTML = `<section id="sdfEditorBox" role="dialog" aria-modal="true"><header class="sdf-ed-head"><div><div class="sdf-ed-ey">COMMISSIONER TOOLS</div><h2 id="sdfEditorTitle">Editor</h2><p id="sdfEditorSubtitle"></p></div><button class="sdf-ed-close" aria-label="Close">×</button></header><div class="sdf-ed-body"><div id="sdfEditorToast"></div><div id="sdfEditorContent"></div></div></section>`;
    document.body.appendChild(el);
    $('.sdf-ed-close', el).onclick = close;
    el.onclick = e => { if (e.target === el) close(); };
  }
  function close() { $('#sdfEditorOverlay')?.classList.remove('open'); }
  function show(title, subtitle, html) {
    makeOverlay();
    $('#sdfEditorTitle').textContent = title;
    $('#sdfEditorSubtitle').textContent = subtitle;
    $('#sdfEditorContent').innerHTML = html;
    $('#sdfEditorToast').textContent = '';
    $('#sdfEditorToast').className = '';
    $('#sdfEditorOverlay').classList.add('open');
  }

  function playerSnapshot(id) { return state()?.roster?.find(p => String(p.id) === String(id)); }
  function playerOptions(pos, current) {
    return (ARCH[pos] || []).map(a => `<option ${a === current ? 'selected' : ''}>${esc(a)}</option>`).join('');
  }
  function renderPlayerForm() {
    const p = playerSnapshot(activePlayerId);
    const host = $('#sdfPlayerForm');
    if (!host || !p) return;
    const attrs = p.attrs || {};
    host.innerHTML = `
      <div class="sdf-form">
        <label class="wide">PLAYER NAME<input id="sdfPeName" maxlength="32" value="${esc(p.name)}"></label>
        <label>POSITION<select id="sdfPePos">${POSITIONS.map(x => `<option value="${x}" ${x === p.pos ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>ARCHETYPE<select id="sdfPeArch">${playerOptions(p.pos, p.arch)}</select></label>
        <label>CLASS / YEAR<select id="sdfPeYear">${[1,2,3,4].map(y => `<option value="${y}" ${Number(p.year) === y ? 'selected' : ''}>Year ${y}</option>`).join('')}</select></label>
        <label>DEVELOPMENT<select id="sdfPeDev">${DEV.map(d => `<option ${d === p.dev ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label>OVERALL<input id="sdfPeOvr" type="number" min="40" max="99" value="${clamp(p.ovr,40,99)}"></label>
        <label>POTENTIAL<input id="sdfPePot" type="number" min="40" max="99" value="${clamp(p.pot,40,99)}"></label>
        <label>MORALE<input id="sdfPeMorale" type="number" min="0" max="99" value="${clamp(p.morale,0,99)}"></label>
        <label>HOMETOWN<input id="sdfPeHome" maxlength="42" value="${esc(p.hometown || '')}"></label>
        <div class="sdf-form-section">CORE ATTRIBUTES</div>
        <label>SPEED<input id="sdfPeSpeed" type="number" min="35" max="99" value="${clamp(attrs.speed ?? p.ovr,35,99)}"></label>
        <label>STRENGTH<input id="sdfPeStrength" type="number" min="35" max="99" value="${clamp(attrs.strength ?? p.ovr,35,99)}"></label>
        <label>SKILL<input id="sdfPeSkill" type="number" min="35" max="99" value="${clamp(attrs.skill ?? p.ovr,35,99)}"></label>
        <label>AWARENESS<input id="sdfPeAwareness" type="number" min="35" max="99" value="${clamp(attrs.awareness ?? p.ovr,35,99)}"></label>
      </div>
      <div class="sdf-ed-actions"><button id="sdfPeHeal" class="sdf-secondary">Heal Injury</button><button id="sdfPeSave" class="sdf-save">Save Player</button></div>`;
    $('#sdfPePos').onchange = e => { const arch = $('#sdfPeArch'); arch.innerHTML = playerOptions(e.target.value, ''); };
    $('#sdfPeHeal').onclick = () => {
      const live = playerSnapshot(activePlayerId); if (!live) return;
      live.injury = null; save(`Commissioner healed ${live.name}`); toast(`${live.name} is healthy.`);
    };
    $('#sdfPeSave').onclick = savePlayer;
  }
  function filterPlayers() {
    const q = ($('#sdfPeSearch')?.value || '').trim().toLowerCase();
    $$('.sdf-player-row').forEach(b => { b.hidden = !!q && !b.dataset.search.includes(q); });
  }
  function savePlayer() {
    const s = state(), p = playerSnapshot(activePlayerId); if (!s || !p) return;
    const oldPos = p.pos;
    const name = ($('#sdfPeName').value || '').trim();
    if (!name) return toast('Player name is required.', true);
    p.name = name.slice(0, 32);
    p.pos = $('#sdfPePos').value;
    p.arch = $('#sdfPeArch').value || (ARCH[p.pos] || ['Balanced'])[0];
    p.year = clamp($('#sdfPeYear').value, 1, 4);
    p.dev = $('#sdfPeDev').value;
    p.ovr = clamp($('#sdfPeOvr').value, 40, 99);
    p.pot = Math.max(p.ovr, clamp($('#sdfPePot').value, 40, 99));
    p.morale = clamp($('#sdfPeMorale').value, 0, 99);
    p.hometown = ($('#sdfPeHome').value || '').trim().slice(0, 42);
    p.attrs = p.attrs || {};
    p.attrs.speed = clamp($('#sdfPeSpeed').value, 35, 99);
    p.attrs.strength = clamp($('#sdfPeStrength').value, 35, 99);
    p.attrs.skill = clamp($('#sdfPeSkill').value, 35, 99);
    p.attrs.awareness = clamp($('#sdfPeAwareness').value, 35, 99);
    if (oldPos !== p.pos) { p.starter = false; s.depthChart = {}; }
    s.news = s.news || [];
    s.news.push(`Commissioner Mode edited ${p.name}: ${p.pos}, ${p.ovr} OVR, ${p.pot} potential.`);
    save(`Player Editor: ${p.name}`);
    openPlayerEditor(p.id, true);
    toast(`${p.name} saved.`);
  }

  async function openPlayerEditor(id = null, skipCheck = false) {
    if (!skipCheck && !(await ensureOwned('player_editor'))) return;
    const s = state();
    if (!s?.school || !Array.isArray(s.roster)) return alert('Load a dynasty before opening Player Editor.');
    activeMode = 'player';
    const players = s.roster.slice().sort((a,b) => POSITIONS.indexOf(a.pos)-POSITIONS.indexOf(b.pos) || Number(b.ovr)-Number(a.ovr));
    activePlayerId = id && players.some(p => String(p.id) === String(id)) ? id : (activePlayerId && players.some(p => String(p.id) === String(activePlayerId)) ? activePlayerId : players[0]?.id);
    show('Player Editor', `${s.school.name} · edit roster identity, ratings and development`, `
      <div class="sdf-ed-grid"><aside class="sdf-ed-panel"><h3>Roster</h3><input id="sdfPeSearch" class="sdf-ed-search" type="search" placeholder="Search player or position"><div class="sdf-player-list">${players.map(p => `<button class="sdf-player-row ${String(p.id)===String(activePlayerId)?'active':''}" data-id="${esc(p.id)}" data-search="${esc(`${p.name} ${p.pos} ${p.hometown||''}`.toLowerCase())}"><span><b>${esc(p.name)}</b><br><small>${p.pos} · Year ${p.year}</small></span><strong>${p.ovr}</strong></button>`).join('')}</div></aside><section id="sdfPlayerForm" class="sdf-ed-panel"></section></div>`);
    $('#sdfPeSearch').oninput = filterPlayers;
    $$('.sdf-player-row').forEach(b => b.onclick = () => { activePlayerId = b.dataset.id; $$('.sdf-player-row').forEach(x => x.classList.toggle('active', x === b)); renderPlayerForm(); });
    renderPlayerForm();
  }

  function teamForm(s) {
    const sc = s.school, st = s.stadium || {}, brand = s.browserTeamBranding || {};
    return `
      <div class="sdf-form">
        <label class="wide">PROGRAM NAME<input id="sdfTeName" maxlength="38" value="${esc(sc.name)}"></label>
        <label>CITY<input id="sdfTeCity" maxlength="28" value="${esc(sc.city || '')}"></label>
        <label>STATE<input id="sdfTeState" maxlength="3" value="${esc(sc.state || '')}"></label>
        <div class="sdf-form-section">PROGRAM RATINGS</div>
        <label>PRESTIGE<input id="sdfTePrestige" type="number" min="20" max="99" value="${clamp(sc.prestige,20,99)}"></label>
        <label>RECENT SUCCESS<input id="sdfTeRecent" type="number" min="20" max="99" value="${clamp(sc.recent,20,99)}"></label>
        <label>FACILITIES REPUTATION<input id="sdfTeFacilities" type="number" min="20" max="99" value="${clamp(sc.facilities,20,99)}"></label>
        <label>PRO PIPELINE<input id="sdfTePro" type="number" min="20" max="99" value="${clamp(sc.pro,20,99)}"></label>
        <label>NIL REPUTATION<input id="sdfTeNil" type="number" min="20" max="99" value="${clamp(sc.nil,20,99)}"></label>
        <label>ACADEMICS<input id="sdfTeAcademics" type="number" min="20" max="99" value="${clamp(sc.academics,20,99)}"></label>
        <div class="sdf-form-section">STADIUM & RESOURCES</div>
        <label>STADIUM NAME<input id="sdfTeStadium" maxlength="40" value="${esc(st.name || 'Memorial Stadium')}"></label>
        <label>CAPACITY<input id="sdfTeCapacity" type="number" min="10000" max="150000" step="500" value="${clamp(st.capacity || 55000,10000,150000)}"></label>
        <label>PROGRAM FUNDS ($)<input id="sdfTeBudget" type="number" min="0" max="100000000" step="10000" value="${Math.max(0,Math.round(Number(s.budget)||0))}"></label>
        <label>RECRUITING NIL POOL ($)<input id="sdfTeNilBudget" type="number" min="0" max="100000000" step="1000" value="${Math.max(0,Math.round(Number(s.nilBudget)||0))}"></label>
        <div class="sdf-form-section">BROWSER TEAM COLORS</div>
        <label>PRIMARY COLOR<input id="sdfTePrimary" type="color" value="${esc(brand.primary || '#2563eb')}"></label>
        <label>SECONDARY COLOR<input id="sdfTeSecondary" type="color" value="${esc(brand.secondary || '#22d3ee')}"></label>
      </div>
      <div class="sdf-ed-actions"><button id="sdfTeSave" class="sdf-save">Save Team</button></div>`;
  }
  function applyCustomBranding() {
    const s = state(), b = s?.browserTeamBranding;
    if (!b) return;
    if (b.primary) document.documentElement.style.setProperty('--team-primary', b.primary);
    if (b.secondary) document.documentElement.style.setProperty('--team-secondary', b.secondary);
  }
  function saveTeam() {
    const s = state(); if (!s?.school) return;
    const sc = s.school;
    const oldName = sc.name;
    sc.name = ($('#sdfTeName').value || oldName).trim().slice(0,38) || oldName;
    sc.city = ($('#sdfTeCity').value || sc.city || '').trim().slice(0,28);
    sc.state = ($('#sdfTeState').value || sc.state || '').trim().toUpperCase().slice(0,3);
    sc.prestige = clamp($('#sdfTePrestige').value,20,99);
    sc.recent = clamp($('#sdfTeRecent').value,20,99);
    sc.facilities = clamp($('#sdfTeFacilities').value,20,99);
    sc.pro = clamp($('#sdfTePro').value,20,99);
    sc.nil = clamp($('#sdfTeNil').value,20,99);
    sc.academics = clamp($('#sdfTeAcademics').value,20,99);
    s.stadium = s.stadium || {};
    s.stadium.name = ($('#sdfTeStadium').value || 'Memorial Stadium').trim().slice(0,40);
    s.stadium.capacity = clamp($('#sdfTeCapacity').value,10000,150000);
    s.budget = clamp($('#sdfTeBudget').value,0,100000000);
    s.nilBudget = clamp($('#sdfTeNilBudget').value,0,100000000);
    s.browserTeamBranding = { primary: $('#sdfTePrimary').value, secondary: $('#sdfTeSecondary').value };
    const syncTeam = t => { if (!t || Number(t.id) !== Number(sc.id)) return; Object.assign(t,{name:sc.name,conference:sc.conference,prestige:sc.prestige,recent:sc.recent}); };
    (s.world || []).forEach(syncTeam); (s.rankings || []).forEach(syncTeam); (s.standings || []).forEach(syncTeam);
    s.news = s.news || [];
    s.news.push(`Commissioner Mode updated ${sc.name}'s program profile.`);
    save(`Team Editor: ${sc.name}`);
    applyCustomBranding();
    openTeamEditor(true);
    toast(`${sc.name} saved.`);
  }
  async function openTeamEditor(skipCheck = false) {
    if (!skipCheck && !(await ensureOwned('team_editor'))) return;
    const s = state(); if (!s?.school) return alert('Load a dynasty before opening Team Editor.');
    activeMode = 'team';
    show('Team Editor', `${s.school.name} · customize program ratings, resources and browser colors`, `<section class="sdf-ed-panel">${teamForm(s)}</section>`);
    $('#sdfTeSave').onclick = saveTeam;
  }

  function injectButtons() {
    const rosterHead = $('#rosterTab .surface .section-head .actions');
    if (rosterHead && !$('#sdfPlayerEditorBtn')) {
      const b = document.createElement('button'); b.id='sdfPlayerEditorBtn'; b.className='sdf-paid-tool'; b.type='button'; b.onclick=()=>openPlayerEditor(); rosterHead.appendChild(b);
    }
    const teamHead = $('#teamTab .surface .section-head');
    if (teamHead && !$('#sdfTeamEditorBtn')) {
      const b = document.createElement('button'); b.id='sdfTeamEditorBtn'; b.className='sdf-paid-tool'; b.type='button'; b.onclick=()=>openTeamEditor(); teamHead.appendChild(b);
    }
    updateButtons();
  }
  function updateButtons() {
    const p = $('#sdfPlayerEditorBtn'), t = $('#sdfTeamEditorBtn');
    if (p) { const ok=owns('player_editor'); p.classList.toggle('locked',!ok); p.textContent=ok?'✦ PLAYER EDITOR':'🔒 PLAYER EDITOR'; }
    if (t) { const ok=owns('team_editor'); t.classList.toggle('locked',!ok); t.textContent=ok?'✦ TEAM EDITOR':'🔒 TEAM EDITOR'; }
    const noAds = owns('remove_ads');
    document.documentElement.classList.toggle('sdf-no-ads', noAds);
    $$('[data-sdf-forced-ad],.sdf-forced-ad').forEach(el => { el.hidden = noAds; });
  }

  window.SDF_COMMISSIONER = {
    openPlayerEditor,
    openTeamEditor,
    applyCustomBranding,
    hasPlayerEditor: () => owns('player_editor'),
    hasTeamEditor: () => owns('team_editor'),
    removeAds: () => owns('remove_ads')
  };
  window.SDF_AD_POLICY = {
    shouldShowForcedAds: () => !owns('remove_ads'),
    mayOfferRewardedAds: () => true
  };

  window.addEventListener('sdf:entitlements', () => { injectButtons(); updateButtons(); });
  const priorRender = window.renderAll;
  if (typeof priorRender === 'function') window.renderAll = function(...args) { const out=priorRender.apply(this,args); injectButtons(); applyCustomBranding(); return out; };
  const init = () => { makeOverlay(); injectButtons(); applyCustomBranding(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
