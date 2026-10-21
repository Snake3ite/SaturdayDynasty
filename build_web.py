from pathlib import Path
import shutil,json,re,hashlib
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'shared-app';OUT=ROOT/'dist'
# The shared game is authoritative. Never label an old bundle as a new release.
native_manifest=json.loads((SOURCE/'ANDROID_BUILD_VERIFICATION.json').read_text(encoding='utf-8'))
BUILD=int(native_manifest['versionCode']);VERSION=native_manifest['version']
assert BUILD>=298, 'Refusing to regress below the current development game (Build 298).'
for entry in native_manifest['files']:
 target=(SOURCE/entry['path']).resolve()
 assert target.is_relative_to(SOURCE.resolve()), 'Unsafe shared asset path'
 raw=target.read_bytes()
 assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256'], 'Shared asset hash mismatch: '+entry['path']
# Rebuild only the generated output directory inside this repository.
if OUT.exists():
 if OUT.resolve().parent!=ROOT:raise SystemExit('Unsafe output directory')
 shutil.rmtree(OUT)
shutil.copytree(SOURCE,OUT)
shutil.copytree(ROOT/'play',OUT/'play')
shutil.copytree(ROOT/'s',OUT/'s')
BROWSER=['cloud-config.js','web-shell.js','browser-save-bridge.js','browser-editors.js','browser-commerce-bridge.js','browser-team-editor-v195.js','browser-feedback.js','browser-shell.css','browser-bootstrap.js','browser-community-config.js','browser-growth.js','browser-growth-analytics.js','browser-landing.js','ad-config.js','_headers','icon.svg','manifest.webmanifest']
for f in BROWSER:shutil.copy2(ROOT/f,OUT/f)
shutil.copy2(ROOT/'browser-usage-privacy.html',OUT/'usage-privacy.html')
# A hydrated browser launch can occur after DOMContentLoaded; honor older shared hooks.
shared=(SOURCE/'app-bundle.js').read_text(encoding='utf-8')
web_bundle="function sdfWebOnReady(target,listener,options){if(document.readyState==='loading')target.addEventListener('DOMContentLoaded',listener,options);else queueMicrotask(()=>listener.call(target,new Event('DOMContentLoaded')))}\n"+shared
web_bundle=web_bundle.replace(f'Android V{VERSION} · Build {BUILD}',f'Web V{VERSION} · Build {BUILD}')
# Observe ACCEPTED gameplay events at the actual reporter, including its lexical
# final-score paths. Probing SDF_JOURNEY alone misses completed games.
event_anchor='if(data.queue.length>=500)dropped++;data.queue.push(item);data.queue=data.queue.slice(-500);save();schedule();'
assert web_bundle.count(event_anchor)==1, 'Usage event hook anchor changed'
web_bundle=web_bundle.replace(event_anchor,event_anchor+"try{window.dispatchEvent(new CustomEvent('sdf:usage-event',{detail:{event}}))}catch{}")
# New browser visitors should reach their first game before announcement modals.
# Remote copy and dismissal semantics stay unchanged; native is untouched.
message_gate="function occupied(){return [...document.querySelectorAll('dialog[open],.modal:not(.hidden)')]"
assert web_bundle.count(message_gate)==1, 'Announcement gate anchor changed'
web_bundle=web_bundle.replace(message_gate,"function occupied(){if(typeof state==='undefined'||!state?.school||document.getElementById('gameScreen')?.classList.contains('hidden')||!(Number(state.year)>1||(state.schedule||[]).some(g=>g.result)))return true;return [...document.querySelectorAll('dialog[open],.modal:not(.hidden),[role=dialog],[aria-modal=true]')]")
# The published browser already virtualizes saves in an account-scoped IndexedDB
# mirror. Keep that path so the cloud shell sees each save and cloud restore.
# Android's standalone browser fallback must not create a competing save store.
web_bundle=web_bundle.replace("const enabled=typeof window.SDFNative?.writeSlot!=='function'&&!!window.indexedDB;", "const enabled=typeof window.SDFNative?.writeSlot!=='function'&&!window.SDF_BROWSER_SAVE_BRIDGE&&!!window.indexedDB;")
# Keep shared Commissioner tools; browser account purchases remain authoritative.
assert 'function owns(k){const o=ownedSet();' in web_bundle
web_bundle=web_bundle.replace('function owns(k){const o=ownedSet();',"function owns(k){if(window.SDF_COMMERCE?.owns)return !!window.SDF_COMMERCE.owns(k);const o=ownedSet();",1)
assert 'function openShop(focus=null){shopFocus=' in web_bundle
web_bundle=web_bundle.replace('function openShop(focus=null){shopFocus=',"function openShop(focus=null){if(window.SDF_COMMERCE?.openShop)return window.SDF_COMMERCE.openShop();shopFocus=",1)
for target in ['window','document']:
 web_bundle=web_bundle.replace(target+".addEventListener('DOMContentLoaded',",'sdfWebOnReady('+target+',')
# Do not rewrite the helper itself.
web_bundle=web_bundle.replace("target.addEventListener('DOMContentLoaded',listener,options)","target.addEventListener('DOMContentLoaded',listener,options)")
(OUT/'app-bundle.js').write_text(web_bundle,encoding='utf-8',newline='')
# Install account scoping before any IndexedDB reads.
config=(ROOT/'cloud-config.js').read_text(encoding='utf-8')
account_scope, browser_config=config.split('// Browser-only UI.',1)
(OUT/'cloud-account-scope.js').write_text(account_scope,encoding='utf-8',newline='')
(OUT/'cloud-config.js').write_text('// Browser-only UI.'+browser_config,encoding='utf-8',newline='')
html=(OUT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'Android V[0-9.]+',f'Web V{VERSION}',html).replace('href="manifest.json"','href="manifest.webmanifest"')
html=re.sub(r'<title>[^<]+</title>','<title>Saturday Dynasty Football | Play College Football Dynasty Online</title>',html,count=1)
seo='''<meta name="description" content="Recruit, develop players and rebuild a fictional college football program. Play Saturday Dynasty Football on desktop, iPhone or Android browsers.">
<link rel="canonical" href="https://saturdaydynasty.ctoolis.workers.dev/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Saturday Dynasty Football">
<meta property="og:title" content="Saturday Dynasty Football | Build Your Dynasty">
<meta property="og:description" content="Recruit, develop and compete in a college football management simulation. Play free in your browser.">
<meta property="og:url" content="https://saturdaydynasty.ctoolis.workers.dev/">
<meta property="og:image" content="https://saturdaydynasty.ctoolis.workers.dev/icon-512.png">
<meta property="og:image:alt" content="Saturday Dynasty Football logo">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Saturday Dynasty Football | Build Your Dynasty">
<meta name="twitter:description" content="Recruit, develop and rebuild your college football program.">
<meta name="twitter:image" content="https://saturdaydynasty.ctoolis.workers.dev/icon-512.png">'''
html=html.replace('</head>',seo+'\n</head>')
html=re.sub(r'<script src="(?:ad-config|app-bundle)\.js[^\"]*"></script>','',html)
html=html.replace('</head>',f'<link rel="stylesheet" href="browser-shell.css?v={BUILD}">\n</head>')
html=html.replace('</body>',f'<script src="browser-bootstrap.js?v={BUILD}"></script>\n</body>')
(OUT/'index.html').write_text(html,encoding='utf-8',newline='')
(OUT/'app-ads.txt').write_text('google.com, pub-9690546015672361, DIRECT, f08c47fec0942fa0\nvungle.com, 6ad810575f9902f697752bfd, DIRECT, c107d686becd2d77\n',encoding='utf-8',newline='')
manifest=json.loads((OUT/'manifest.webmanifest').read_text());manifest['icons']=[{'src':'icon-192.png','sizes':'192x192','type':'image/png'},{'src':'icon-512.png','sizes':'512x512','type':'image/png'}]
(OUT/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2),encoding='utf-8',newline='')
core=['./','./index.html','./play/','./play/index.html','./play/gameplay-phone.jpg','./manifest.webmanifest']+['./'+p.name for p in OUT.iterdir() if p.suffix in {'.js','.css','.png','.svg'} and p.name!='sw.js']
sw="""const CACHE='sdf-web-build__BUILD__-growth39';
const CORE=__CORE__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sdf-web-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('range'))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}return response}).catch(async()=>{
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;
  if(request.mode==='navigate'&&(url.pathname==='/play'||url.pathname==='/play/'))return caches.match('./play/index.html');
  if(request.mode==='navigate')return caches.match('./index.html');
  return Response.error();
 }));
});
""".replace('__CORE__',json.dumps(core)).replace('__BUILD__',str(BUILD))
(OUT/'sw.js').write_text(sw,encoding='utf-8',newline='')
# The native manifest covers native assets; generate a separate web asset manifest.
(OUT/'ANDROID_BUILD_VERIFICATION.json').unlink(missing_ok=True)
checks=[]
for p in sorted(OUT.rglob('*')):
 if p.is_file():checks.append({'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert (OUT/'app-bundle.js').read_text(encoding='utf-8')==web_bundle
for f in re.findall(r'(?:src|href)="([^"?#]+)',html):
 if '://' not in f and not f.startswith('#'):assert (OUT/f).exists(),f
(OUT/'WEB_BUILD_VERIFICATION.json').write_text(json.dumps({'versionCode':BUILD,'version':VERSION,'files':checks},indent=2),encoding='utf-8',newline='')
print(f'Built Web{BUILD}: current shared runtime preserved, browser integrations included, {len(checks)} assets verified.')
