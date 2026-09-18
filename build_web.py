from pathlib import Path
import shutil,json,re,hashlib
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'shared-app';OUT=ROOT/'dist'
# Rebuild only the generated output directory inside this repository.
if OUT.exists():
 if OUT.resolve().parent!=ROOT:raise SystemExit('Unsafe output directory')
 shutil.rmtree(OUT)
shutil.copytree(SOURCE,OUT)
BROWSER=['cloud-config.js','web-shell.js','browser-save-bridge.js','browser-editors.js','browser-commerce-bridge.js','browser-team-editor-v195.js','browser-feedback.js','browser-shell.css','browser-bootstrap.js','ad-config.js','_headers','icon.svg','manifest.webmanifest']
for f in BROWSER:shutil.copy2(ROOT/f,OUT/f)
# A hydrated browser launch can occur after DOMContentLoaded; honor older shared hooks.
shared=(SOURCE/'app-bundle.js').read_text(encoding='utf-8')
web_bundle="function sdfWebOnReady(target,listener,options){if(document.readyState==='loading')target.addEventListener('DOMContentLoaded',listener,options);else queueMicrotask(()=>listener.call(target,new Event('DOMContentLoaded')))}\n"+shared
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
html=html.replace('Android V27.4.38','Web V27.4.38').replace('href="manifest.json"','href="manifest.webmanifest"')
html=re.sub(r'<script src="(?:ad-config|app-bundle)\.js[^\"]*"></script>','',html)
html=html.replace('</head>','<link rel="stylesheet" href="browser-shell.css?v=239">\n</head>')
html=html.replace('</body>','<script src="browser-bootstrap.js?v=239"></script>\n</body>')
(OUT/'index.html').write_text(html,encoding='utf-8',newline='')
(OUT/'app-ads.txt').write_text('google.com, pub-9690546015672361, DIRECT, f08c47fec0942fa0\n',encoding='utf-8',newline='')
manifest=json.loads((OUT/'manifest.webmanifest').read_text());manifest['icons']=[{'src':'icon-192.png','sizes':'192x192','type':'image/png'},{'src':'icon-512.png','sizes':'512x512','type':'image/png'}]
(OUT/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2),encoding='utf-8',newline='')
core=['./','./index.html','./manifest.webmanifest']+['./'+p.name for p in OUT.iterdir() if p.suffix in {'.js','.css','.png','.svg'} and p.name!='sw.js']
sw="""const CACHE='sdf-web-build239';
const CORE=__CORE__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sdf-web-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('range'))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}return response}).catch(async()=>{
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;
  if(request.mode==='navigate')return caches.match('./index.html');
  return Response.error();
 }));
});
""".replace('__CORE__',json.dumps(core))
(OUT/'sw.js').write_text(sw,encoding='utf-8',newline='')
# The native manifest covers native assets; generate a separate web asset manifest.
(OUT/'ANDROID_BUILD_VERIFICATION.json').unlink(missing_ok=True)
checks=[]
for p in sorted(OUT.rglob('*')):
 if p.is_file():checks.append({'path':p.relative_to(OUT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert (OUT/'app-bundle.js').read_text(encoding='utf-8')==web_bundle
for f in re.findall(r'(?:src|href)="([^"?#]+)',html):
 if '://' not in f and not f.startswith('#'):assert (OUT/f).exists(),f
(OUT/'WEB_BUILD_VERIFICATION.json').write_text(json.dumps({'versionCode':239,'version':'27.4.38','files':checks},indent=2),encoding='utf-8',newline='')
print('Built Web239: shared runtime preserved, browser integrations included,',len(checks),'assets verified.')
