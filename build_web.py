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
PATCH_DIR = Path(".web187")
APP_SHA256 = "07440693ba264ca6fc20c4bc7a1c4dc54d0a8b613cf09e1e5dd3b7ebf6bc8fcc"
CSS_SHA256 = "3f551c1032edd85e85eb4d82ea54795ea6c594c6d7645dc2d6713e4436767895"
INDEX_SHA256 = "d97609267af9669db2d82d6795f8617d818b14c9a044085c7cb1724d2bad7966"


def payload(prefix: str) -> str:
    parts = sorted(PATCH_DIR.glob(f"{prefix}_*.txt"))
    if not parts:
        raise SystemExit(f"Missing {prefix} web payload in {PATCH_DIR}/")
    return "".join(p.read_text(encoding="utf-8").strip() for p in parts)


def inflate(prefix: str) -> str:
    try:
        return zlib.decompress(base64.b64decode(payload(prefix))).decode("utf-8")
    except Exception as exc:
        raise SystemExit(f"Could not decode {prefix} web payload: {exc}") from exc


def apply_line_patch(path: Path, prefix: str) -> None:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    ops = json.loads(inflate(prefix))
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

# Reconstruct the exact Build 187 shared game bundle and the browser-specific
# merged stylesheet/index from the proven configured web shell.
apply_line_patch(OUTPUT / "app-bundle.js", "app")
apply_line_patch(OUTPUT / "styles.css", "csspatch")
(OUTPUT / "index.html").write_text(inflate("index"), encoding="utf-8")

# Keep the browser-safe Supabase config editable in GitHub.
repo_cloud_config = Path("cloud-config.js")
if repo_cloud_config.exists():
    shutil.copy2(repo_cloud_config, OUTPUT / "cloud-config.js")

# Preserve the stable save key, but make cloud-save metadata identify this
# actual browser build rather than the original beta shell version.
web_shell = OUTPUT / "web-shell.js"
if web_shell.exists():
    shell = web_shell.read_text(encoding="utf-8")
    shell = shell.replace("app_version:'web-v26-beta'", "app_version:'web-v27.3.6-build-187'")
    web_shell.write_text(shell, encoding="utf-8")

# Force all PWA clients onto Build 187 assets instead of an older cache.
(OUTPUT / "sw.js").write_text(
    """const CACHE='sdf-web-v27-3-6-build-187';
const CORE=['./','./index.html','./styles.css','./app-bundle.js','./ad-config.js','./cloud-config.js','./web-shell.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));});
""",
    encoding="utf-8",
)

# Cloudflare static-assets mode does not need the old SPA redirect and SQL is
# an admin/setup artifact, not a public browser asset.
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
css_hash = hashlib.sha256((OUTPUT / "styles.css").read_bytes()).hexdigest()
index_hash = hashlib.sha256((OUTPUT / "index.html").read_bytes()).hexdigest()
if app_hash != APP_SHA256:
    raise SystemExit(f"Build 187 app-bundle validation failed: {app_hash}")
if css_hash != CSS_SHA256:
    raise SystemExit(f"Build 187 stylesheet validation failed: {css_hash}")
if index_hash != INDEX_SHA256:
    raise SystemExit(f"Build 187 index validation failed: {index_hash}")

html = (OUTPUT / "index.html").read_text(encoding="utf-8")
if "Coach Tree V2" not in html or "Web V27.3.6" not in html:
    raise SystemExit("Build 187 index content validation failed.")
if "cloud-config.js?v=187" not in html or "web-shell.js?v=187" not in html:
    raise SystemExit("Build 187 browser shell scripts are missing.")
if "app_version:'web-v27.3.6-build-187'" not in (OUTPUT / "web-shell.js").read_text(encoding="utf-8"):
    raise SystemExit("Build 187 web-shell metadata validation failed.")

print("Validated Saturday Dynasty Football Web V27.3.6 / Build 187")
print(f"app-bundle sha256: {app_hash}")
print(f"styles sha256: {css_hash}")
print(f"index sha256: {index_hash}")
print(f"Web build ready in {OUTPUT.resolve()}")
