from pathlib import Path
import base64
import hashlib
import json
import shutil
import zipfile
import zlib

ZIP_NAME = "SaturdayDynasty_Web_Beta_Configured.zip"
ARCHIVE_ROOT = "SaturdayDynasty_Web_Beta"
OUTPUT = Path("dist")
PATCH_187 = Path(".web187")
PATCH_188 = Path(".web188")
APP_SHA256 = "f7c4202f486a8549b544fefa73a80f3b8651850f6b2ca5acfd6151f958f44057"


def payload(prefix: str, patch_dir: Path) -> str:
    parts = sorted(patch_dir.glob(f"{prefix}_*.txt"))
    if not parts:
        raise SystemExit(f"Missing {prefix} web payload in {patch_dir}/")
    return "".join(p.read_text(encoding="utf-8").strip() for p in parts)


def inflate(prefix: str, patch_dir: Path):
    try:
        return zlib.decompress(base64.b64decode(payload(prefix, patch_dir))).decode("utf-8")
    except Exception as exc:
        raise SystemExit(f"Could not decode {prefix} web payload from {patch_dir}: {exc}") from exc


def apply_line_patch(path: Path, prefix: str, patch_dir: Path) -> None:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    ops = json.loads(inflate(prefix, patch_dir))
    for i1, i2, replacement in reversed(ops):
        lines[i1:i2] = [replacement] if replacement else []
    path.write_text("".join(lines), encoding="utf-8")


zip_path = Path(ZIP_NAME)
if not zip_path.exists():
    raise SystemExit(f"Missing {ZIP_NAME}. Upload the configured web package to the repository root.")

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
OUTPUT.mkdir(parents=True)

staging = Path(".web-build")
if staging.exists():
    shutil.rmtree(staging)
staging.mkdir(parents=True)

with zipfile.ZipFile(zip_path) as archive:
    archive.extractall(staging)

source = staging / ARCHIVE_ROOT
if not source.exists():
    raise SystemExit(f"Expected {ARCHIVE_ROOT}/ inside {ZIP_NAME}")

for item in source.iterdir():
    destination = OUTPUT / item.name
    if item.is_dir():
        shutil.copytree(item, destination)
    else:
        shutil.copy2(item, destination)

# Stage 1: reconstruct the proven browser-specific Build 187 package.
apply_line_patch(OUTPUT / "app-bundle.js", "app", PATCH_187)
apply_line_patch(OUTPUT / "styles.css", "csspatch", PATCH_187)
(OUTPUT / "index.html").write_text(inflate("index", PATCH_187), encoding="utf-8")

# Stage 2: advance the shared game runtime to Build 188 without duplicating
# another full browser patch. The app delta is 187 -> 188 and the new UI CSS
# is additive, preserving cloud-save/PWA/browser-only shell behavior.
apply_line_patch(OUTPUT / "app-bundle.js", "app", PATCH_188)
style_additions = (PATCH_188 / "styles-additions.css").read_text(encoding="utf-8")
styles_path = OUTPUT / "styles.css"
styles = styles_path.read_text(encoding="utf-8")
if "V27.3.7 Build 188 — Promises, Trust & Culture" not in styles:
    styles_path.write_text(styles.rstrip() + "\n\n" + style_additions.rstrip() + "\n", encoding="utf-8")

index_path = OUTPUT / "index.html"
html = index_path.read_text(encoding="utf-8")
html = html.replace("Android V27.3.6 · Coach Tree V2", "Android V27.3.7 · Promises, Trust & Culture")
html = html.replace("Web V27.3.6", "Web V27.3.7")
html = html.replace("?v=187", "?v=188")
html = html.replace("Build 187", "Build 188")
index_path.write_text(html, encoding="utf-8")

# Keep the browser-safe Supabase config editable in GitHub.
repo_cloud_config = Path("cloud-config.js")
if repo_cloud_config.exists():
    shutil.copy2(repo_cloud_config, OUTPUT / "cloud-config.js")

# Preserve the stable save key while recording the actual browser build in
# cloud-save metadata.
web_shell = OUTPUT / "web-shell.js"
if web_shell.exists():
    shell = web_shell.read_text(encoding="utf-8")
    shell = shell.replace("app_version:'web-v26-beta'", "app_version:'web-v27.3.7-build-188'")
    shell = shell.replace("app_version:'web-v27.3.6-build-187'", "app_version:'web-v27.3.7-build-188'")
    web_shell.write_text(shell, encoding="utf-8")

# Force PWA clients onto Build 188.
(OUTPUT / "sw.js").write_text(
    """const CACHE='sdf-web-v27-3-7-build-188';
const CORE=['./','./index.html','./styles.css','./app-bundle.js','./ad-config.js','./cloud-config.js','./web-shell.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));});
""",
    encoding="utf-8",
)

for name in ("_redirects", "supabase.sql"):
    candidate = OUTPUT / name
    if candidate.exists():
        candidate.unlink()

required = [
    "index.html", "app-bundle.js", "styles.css", "web-shell.js",
    "cloud-config.js", "manifest.webmanifest", "icon.svg", "sw.js"
]
missing = [name for name in required if not (OUTPUT / name).exists()]
if missing:
    raise SystemExit("Web build is missing: " + ", ".join(missing))

app_hash = hashlib.sha256((OUTPUT / "app-bundle.js").read_bytes()).hexdigest()
if app_hash != APP_SHA256:
    raise SystemExit(f"Build 188 app-bundle validation failed: {app_hash}")

html = (OUTPUT / "index.html").read_text(encoding="utf-8")
css = (OUTPUT / "styles.css").read_text(encoding="utf-8")
shell = (OUTPUT / "web-shell.js").read_text(encoding="utf-8")
if "Promises, Trust & Culture" not in html or "Web V27.3.7" not in html:
    raise SystemExit("Build 188 index content validation failed.")
if "app-bundle.js?v=188" not in html or "cloud-config.js?v=188" not in html or "web-shell.js?v=188" not in html:
    raise SystemExit("Build 188 browser cache busters are missing.")
if "V27.3.7 Build 188 — Promises, Trust & Culture" not in css or ".depth-promise-flag" not in css:
    raise SystemExit("Build 188 promise/trust/depth-chart styles are missing.")
if "app_version:'web-v27.3.7-build-188'" not in shell:
    raise SystemExit("Build 188 web-shell metadata validation failed.")
if "sdf-web-v27-3-7-build-188" not in (OUTPUT / "sw.js").read_text(encoding="utf-8"):
    raise SystemExit("Build 188 service-worker cache validation failed.")

print("Validated Saturday Dynasty Football Web V27.3.7 / Build 188")
print(f"app-bundle sha256: {app_hash}")
print(f"styles sha256: {hashlib.sha256((OUTPUT / 'styles.css').read_bytes()).hexdigest()}")
print(f"index sha256: {hashlib.sha256((OUTPUT / 'index.html').read_bytes()).hexdigest()}")
print(f"Web build ready in {OUTPUT.resolve()}")
