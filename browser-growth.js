// Browser-only, non-blocking onboarding and community discovery.
// Does not start a dynasty, alter saves, change paid features or block gameplay.
(()=>{
  'use strict';
  if(window.SDF_GROWTH_QA)return;

  const GAME_URL='https://saturdaydynasty.ctoolis.workers.dev/';
  const APP_URL='https://play.google.com/store/apps/details?id=com.coreytoolis.saturdaydynastyfootball';
  const params=new URLSearchParams(location.search);
  const debug=params.get('sdf_growth_debug')==='1';
  const trace=[];
  const start=typeof performance!=='undefined'?performance.now():0;
  const once=new Set();
  let started=false;

  function note(name, dedupe=false){
    if(!debug)return;
    const safe=String(name).slice(0,64).replace(/[^A-Za-z0-9_:-]/g,'_');
    if(dedupe&&once.has(safe))return;
    if(dedupe)once.add(safe);
    trace.push({ms:Math.round((typeof performance!=='undefined'?performance.now():0)-start),stage:safe});
    if(trace.length>100)trace.shift();
    renderDebug();
  }

  function secureUrl(raw,channel){
    if(typeof raw!=='string'||!raw.trim())return null;
    try{
      const u=new URL(raw);
      if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
      const host=u.hostname.toLowerCase();
      if(channel==='discord'&&!['discord.gg','discord.com','www.discord.com'].includes(host))return null;
      if(channel==='discord'&&host!=='discord.gg'&&!u.pathname.startsWith('/invite/'))return null;
      if(channel==='facebook'&&!['facebook.com','www.facebook.com','m.facebook.com'].includes(host))return null;
      if(u.pathname==='/'||u.pathname.length<=1)return null;
      return u.href;
    }catch{return null}
  }

  function link(label,href,extraClass){
    const a=document.createElement('a');
    a.className='sdf-growth-action'+(extraClass?' '+extraClass:'');
    a.textContent=label;
    a.href=href;
    a.target='_blank';
    a.rel='noopener noreferrer';
    return a;
  }

  async function shareGame(button){
    note('share_action');
    const payload={title:'Saturday Dynasty Football',text:'Build a college football dynasty — recruit, develop, and compete.',url:GAME_URL};
    if(typeof navigator.share==='function'){
      try{await navigator.share(payload);return}
      catch(e){if(e?.name==='AbortError')return}
    }
    try{
      if(!navigator.clipboard?.writeText)throw new Error('No clipboard');
      await navigator.clipboard.writeText(GAME_URL);
      const before=button.textContent;button.textContent='✓ Game link copied!';
      setTimeout(()=>{button.textContent=before},2000);
    }catch{
      // A selectable URL is still useful when clipboard permissions are denied.
      window.prompt?.('Copy the browser game link:',GAME_URL);
    }
  }

  function shareButton(){
    const b=document.createElement('button');
    b.type='button';
    b.className='sdf-growth-action sdf-growth-share';
    b.textContent='↗ Share the game';
    b.addEventListener('click',()=>shareGame(b));
    return b;
  }

  function communityRow(){
    const cfg=window.SDF_COMMUNITY_LINKS||{};
    const result=document.createElement('div');
    result.className='sdf-growth-links';
    const discord=secureUrl(cfg.discord,'discord');
    const facebook=secureUrl(cfg.facebook,'facebook');
    if(discord){
      const a=link('💬 Join our Discord',discord);
      a.addEventListener('click',()=>{note('discord_click');try{window.SDF_JOURNEY?.record?.('community_opened','discord')}catch{}});
      result.appendChild(a);
    }
    if(facebook){
      const a=link('📘 Follow on Facebook',facebook);
      a.addEventListener('click',()=>{note('facebook_click');try{window.SDF_JOURNEY?.record?.('community_opened','facebook')}catch{}});
      result.appendChild(a);
    }
    result.appendChild(shareButton());
    return result;
  }

  function onboarding(){
    const screen=document.querySelector('#schoolScreen');
    if(!screen||document.querySelector('#sdf-growth-start'))return;
    const guide=document.createElement('section');
    guide.id='sdf-growth-start';
    guide.className='sdf-growth-card';
    guide.setAttribute('aria-label','How to start your first dynasty');
    const kicker=document.createElement('p');
    kicker.className='sdf-growth-kicker';kicker.textContent='FIRST TIME PLAYING?';
    const heading=document.createElement('h3');heading.textContent='Your first season starts here.';
    const info=document.createElement('p');
    info.textContent='1. Pick a program below.  2. Scout and recruit players.  3. Advance the week and watch your first game.';
    const find=document.createElement('button');
    find.type='button';find.className='sdf-growth-find';
    find.textContent='🏈 Find a team to rebuild ↓';
    find.addEventListener('click',()=>{
      note('find_team_click');
      const target=document.querySelector('#teamSearch')||document.querySelector('#schoolGrid');
      target?.scrollIntoView?.({behavior:'smooth',block:'center'});
      if(target?.id==='teamSearch')try{target.focus({preventScroll:true})}catch{target.focus()}
    });
    guide.append(kicker,heading,info,find,communityRow());
    const hero=screen.querySelector('.launch-brand');
    if(hero)hero.insertAdjacentElement('afterend',guide);
    else screen.prepend(guide);
    note('onboarding_ready',true);
  }

  function dashboardCommunity(){
    const dash=document.querySelector('#dashboardTab');
    if(!dash||document.querySelector('#sdf-growth-dynasty'))return;
    const card=document.createElement('section');
    card.id='sdf-growth-dynasty';
    card.className='sdf-growth-card sdf-growth-dashboard';
    const heading=document.createElement('h3');
    heading.textContent='How is your rebuild going?';
    const p=document.createElement('p');
    p.textContent='Tell the community your record, best recruit, and biggest upset. A screenshot makes it even better.';
    card.append(heading,p,communityRow());
    const stack=dash.querySelector('.dashboard-layout .stack');
    if(stack)stack.appendChild(card);
    else dash.appendChild(card);
    note('dashboard_community_ready',true);
  }

  function mountStyle(){
    if(document.getElementById('sdf-growth-style'))return;
    const style=document.createElement('style');style.id='sdf-growth-style';
    style.textContent=`
.sdf-growth-card{background:linear-gradient(132deg,#103044,#0b1d29);border:1px solid #345b70;border-radius:12px;padding:18px 20px;margin:16px 0 24px;color:#eef7fd;box-shadow:0 12px 22px #0002}
.sdf-growth-card h3{margin:0 0 6px;font-size:clamp(16px,2vw,20px)}
.sdf-growth-card p{color:#b8d0dc;font-size:13px;margin:4px 0 13px;line-height:1.6}
.sdf-growth-card .sdf-growth-kicker{font-size:10px;font-weight:900;letter-spacing:.15em;color:#74e1bb;margin-bottom:5px}
.sdf-growth-find{border:0;border-radius:8px;background:#5fe2ac;color:#051d18;padding:11px 17px;min-height:44px;font-weight:900;cursor:pointer;margin-bottom:11px}
.sdf-growth-links{display:flex;gap:9px;flex-wrap:wrap}
.sdf-growth-action{display:inline-flex;align-items:center;justify-content:center;background:#0a2736;color:#ecf7fa;border:1px solid #3c6a81;border-radius:8px;padding:9px 13px;min-height:40px;text-decoration:none;font:700 12px/1.3 system-ui;cursor:pointer}
.sdf-growth-action:hover,.sdf-growth-action:focus-visible{border-color:#65e4b7}
.sdf-growth-find:focus-visible,.sdf-growth-action:focus-visible{outline:3px solid #f2cf55;outline-offset:2px}
.sdf-growth-dashboard{margin:16px 0}
#sdf-growth-qa{position:fixed;left:12px;top:11px;z-index:30000;max-width:min(400px,95vw);border:1px solid #64dab0;background:#0b2130;color:#e3fff6;border-radius:9px;box-shadow:0 10px 26px #0008;padding:8px 11px;font:12px/1.35 system-ui}
#sdf-growth-qa button{margin-left:8px;padding:4px 7px;background:#65e4b7;color:#081b19;border:0;border-radius:4px;font-weight:800;cursor:pointer}
@media(max-width:720px){.sdf-growth-card{padding:14px}.sdf-growth-links{flex-direction:column}.sdf-growth-action,.sdf-growth-find{width:100%}}
`;
    document.head.appendChild(style);
  }

  function snapshot(){
    const s=document.getElementById('schoolScreen'),g=document.getElementById('gameScreen');
    const links=window.SDF_COMMUNITY_LINKS||{};
    return {
      debugEnabled:debug,
      browserBuildReady:!!window.SDF_WEB,
      schoolScreenVisible:s?!s.classList.contains('hidden'):null,
      gameScreenVisible:g?!g.classList.contains('hidden'):null,
      startGuideMounted:!!document.getElementById('sdf-growth-start'),
      dashboardCommunityMounted:!!document.getElementById('sdf-growth-dynasty'),
      verifiedDiscordLinkConfigured:!!secureUrl(links.discord,'discord'),
      verifiedFacebookLinkConfigured:!!secureUrl(links.facebook,'facebook'),
      stages:trace.slice()
    };
  }

  function renderDebug(){
    if(!debug)return;
    let box=document.getElementById('sdf-growth-qa');
    if(!box){
      box=document.createElement('aside');
      box.id='sdf-growth-qa';
      box.setAttribute('aria-live','polite');
      const title=document.createElement('span');title.id='sdf-growth-qa-title';
      const copy=document.createElement('button');
      copy.type='button';copy.textContent='Copy QA';
      copy.addEventListener('click',async()=>{
        const data=JSON.stringify(snapshot(),null,2);
        try{await navigator.clipboard.writeText(data);copy.textContent='Copied'}
        catch{window.prompt?.('Copy this QA summary:',data)}
        setTimeout(()=>copy.textContent='Copy QA',2000);
      });
      box.append(title,copy);document.body.appendChild(box);
    }
    const summary=trace.at(-1)?.stage||'booting';
    box.querySelector('#sdf-growth-qa-title').textContent='🧪 Browser QA: '+summary;
  }

  function installJourneyProbe(){
    if(!debug)return;
    const tracker=window.SDF_JOURNEY;
    if(!tracker||typeof tracker.record!=='function'||tracker.record.__sdfGrowthProbed){
      note(tracker?'journey_unavailable_or_probed':'journey_missing',true);return;
    }
    const base=tracker.record;
    const allow=new Set(['dynasty_started','first_recruit','first_game','game_completed','season_completed','session']);
    const wrapped=function(...args){
      if(allow.has(args[0]))note('telemetry_'+args[0]);
      return base.apply(this,args);
    };
    wrapped.__sdfGrowthProbed=true;
    tracker.record=wrapped;
    note('journey_probe_attached',true);
  }

  function initialize(){
    if(started)return;
    const screen=document.getElementById('schoolScreen');
    if(!screen)return;
    started=true;
    mountStyle();onboarding();dashboardCommunity();
    if(debug){
      document.addEventListener('click',e=>{
        const id=e.target?.closest?.('button')?.id;
        if(['newDynastyBtn','loadSelectedSaveBtn','advanceWeekBtn','watchLiveDashboardBtn','mobileAdvance','recruitAdvanceBtn','closeGameResult'].includes(id))note('clicked_'+id);
      },true);
      const g=document.getElementById('gameScreen');
      if(g&&typeof MutationObserver!=='undefined'){
        const watch=new MutationObserver(()=>{if(!g.classList.contains('hidden'))note('game_screen_visible',true)});
        watch.observe(g,{attributes:true,attributeFilter:['class']});
      }
      installJourneyProbe();renderDebug();
    }
  }

  window.addEventListener('sdf:boot-phase',e=>note('boot_'+String(e.detail?.phase||'unknown')));
  window.addEventListener('sdf:web-ready',()=>{note('boot_game_ready',true);initialize()});
  if(debug){
    window.addEventListener('error',()=>note('runtime_error'));
    window.addEventListener('unhandledrejection',()=>note('unhandled_rejection'));
    renderDebug();
  }
  window.SDF_GROWTH_QA={snapshot,installJourneyProbe,phase:note,secureUrl};
  if(window.SDF_WEB)initialize();
})();
