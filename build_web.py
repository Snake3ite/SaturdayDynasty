from pathlib import Path
import base64
import hashlib
import json
import re
import shutil
import zipfile
import zlib

ZIP_NAME = "SaturdayDynasty_Web_Beta_Configured.zip"
ARCHIVE_ROOT = "SaturdayDynasty_Web_Beta"
OUTPUT = Path("dist")
CURRENT = Path(".web194")
APP_SHA256 = "70711efa6d85594f0ce26a2a74f12e0bbbf362df148e45aae997ca26b7048986"
STYLES_SHA256 = "4f3225bdf09ff9740276974e4e339d6070935f921453f362bcb01892ae5ed6e9"
BROWSER_FILES = [
    "browser-save-bridge.js",
    "browser-editors.js",
    "browser-commerce-bridge.js",
    "browser-feedback.js",
]

# App/index browser reconstruction. CSS is intentionally NOT reconstructed through
# historical additions anymore; Build 194 uses one exact current stylesheet snapshot.
STAGES = [
    (188, Path(".web188"),
     "Android V27.3.6 · Coach Tree V2", "Android V27.3.7 · Promises, Trust & Culture",
     "Web V27.3.6 · Coach Tree V2", "Web V27.3.7 · Promises, Trust & Culture"),
    (189, Path(".web189"),
     "Android V27.3.7 · Promises, Trust & Culture", "Android V27.3.8 · Staff Overhaul",
     "Web V27.3.7 · Promises, Trust & Culture", "Web V27.3.8 · Staff Overhaul"),
    (190, Path(".web190"),
     "Android V27.3.8 · Staff Overhaul", "Android V27.3.9 · Program Identity & Traditions",
     "Web V27.3.8 · Staff Overhaul", "Web V27.3.9 · Program Identity & Traditions"),
    (191, Path(".web191"),
     "Android V27.3.9 · Program Identity & Traditions", "Android V27.4.0 · Rivalries & World",
     "Web V27.3.9 · Program Identity & Traditions", "Web V27.4.0 · Rivalries & World"),
    (192, Path(".web192"),
     "Android V27.4.0 · Rivalries & World", "Android V27.4.1 · Players Become People",
     "Web V27.4.0 · Rivalries & World", "Web V27.4.1 · Players Become People"),
    (193, Path(".web193"),
     "Android V27.4.1 · Players Become People", "Android V27.4.2 · Stakeholders & Administration",
     "Web V27.4.1 · Players Become People", "Web V27.4.2 · Stakeholders & Administration"),
    (194, Path(".web194"),
     "Android V27.4.2 · Stakeholders & Administration", "Android V27.4.3 · Coaching Reputation & Career Identity",
     "Web V27.4.2 · Stakeholders & Administration", "Web V27.4.3 · Coaching Reputation & Career Identity"),
]


def payload(prefix: str, patch_dir: Path) -> str:
    parts = sorted(patch_dir.glob(f"{prefix}_*.txt"))
    if not parts:
        raise SystemExit(f"Missing {prefix} web payload in {patch_dir}/")
    return "".join(p.read_text(encoding="utf-8").strip() for p in parts)


def inflate(prefix: str, patch_dir: Path) -> str:
    try:
        packed = base64.b64decode(payload(prefix, patch_dir), validate=True)
        return zlib.decompress(packed).decode("utf-8")
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
    bad = archive.testzip()
    if bad:
        raise SystemExit(f"Configured web package failed ZIP integrity at: {bad}")
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

# Build 187 proven browser app/index reconstruction.
patch_187 = Path(".web187")
apply_line_patch(OUTPUT / "app-bundle.js", "app", patch_187)
apply_line_patch(OUTPUT / "index.html", "index", patch_187)

index_path = OUTPUT / "index.html"
previous_build = 187
for build, patch_dir, android_old, android_new, web_old, web_new in STAGES:
    apply_line_patch(OUTPUT / "app-bundle.js", "app", patch_dir)
    html = index_path.read_text(encoding="utf-8")
    html = html.replace(android_old, android_new)
    html = html.replace(web_old, web_new)
    html = html.replace(f"?v={previous_build}", f"?v={build}")
    html = html.replace(f"Build {previous_build}", f"Build {build}")
    index_path.write_text(html, encoding="utf-8")
    previous_build = build

# Exact Build 194 stylesheet snapshot. This deliberately replaces the old
# 187->194 CSS append chain, whose historical whitespace caused deployment drift.
styles_path = OUTPUT / "styles.css"
styles_path.write_text(inflate("styles_current", CURRENT), encoding="utf-8")

# Browser-owned account, save, commerce, paid-editor and feedback layers.
repo_cloud_config = Path("cloud-config.js")
if not repo_cloud_config.exists():
    raise SystemExit("Missing browser-only runtime: cloud-config.js")
shutil.copy2(repo_cloud_config, OUTPUT / "cloud-config.js")
for name in BROWSER_FILES:
    src = Path(name)
    if not src.exists():
        raise SystemExit(f"Missing browser-only runtime: {name}")
    shutil.copy2(src, OUTPUT / name)

html = index_path.read_text(encoding="utf-8")
anchor = '<script src="web-shell.js?v=194"></script>'
browser_scripts = (
    '<script src="browser-save-bridge.js?v=194"></script>\n'
    '<script data-sdf-paid-editors="1" src="browser-editors.js?v=194"></script>\n'
    '<script src="browser-commerce-bridge.js?v=194"></script>\n'
    '<script data-sdf-feedback="1" src="browser-feedback.js?v=194"></script>'
)
if "browser-save-bridge.js?v=194" not in html:
    if anchor not in html:
        raise SystemExit("Could not locate Build 194 web-shell script anchor.")
    html = html.replace(anchor, anchor + "\n" + browser_scripts)
index_path.write_text(html, encoding="utf-8")

web_shell = OUTPUT / "web-shell.js"
if web_shell.exists():
    shell = web_shell.read_text(encoding="utf-8")
    shell = re.sub(r"app_version:'web-v[^']+'", "app_version:'web-v27.4.3-build-194'", shell)
    web_shell.write_text(shell, encoding="utf-8")

(OUTPUT / "sw.js").write_text(
    """const CACHE='sdf-web-v27-4-3-build-194';
const CORE=['./','./index.html','./styles.css','./app-bundle.js','./ad-config.js','./cloud-config.js','./web-shell.js','./browser-save-bridge.js','./browser-editors.js','./browser-commerce-bridge.js','./browser-feedback.js','./manifest.webmanifest','./icon.svg'];
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
    "index.html", "app-bundle.js", "styles.css", "web-shell.js", "cloud-config.js",
    "browser-save-bridge.js", "browser-editors.js", "browser-commerce-bridge.js",
    "browser-feedback.js", "manifest.webmanifest", "icon.svg", "sw.js",
]
missing = [name for name in required if not (OUTPUT / name).exists()]
if missing:
    raise SystemExit("Web build is missing: " + ", ".join(missing))

app_hash = hashlib.sha256((OUTPUT / "app-bundle.js").read_bytes()).hexdigest()
styles_hash = hashlib.sha256(styles_path.read_bytes()).hexdigest()
if app_hash != APP_SHA256:
    raise SystemExit(f"Build 194 app-bundle validation failed: {app_hash}")
if styles_hash != STYLES_SHA256:
    raise SystemExit(f"Build 194 stylesheet snapshot validation failed: {styles_hash}")

html = index_path.read_text(encoding="utf-8")
css = styles_path.read_text(encoding="utf-8")
shell = web_shell.read_text(encoding="utf-8")
cloud = (OUTPUT / "cloud-config.js").read_text(encoding="utf-8")
save_bridge = (OUTPUT / "browser-save-bridge.js").read_text(encoding="utf-8")
editors = (OUTPUT / "browser-editors.js").read_text(encoding="utf-8")
commerce_bridge = (OUTPUT / "browser-commerce-bridge.js").read_text(encoding="utf-8")

if "Web V27.4.3 · Coaching Reputation & Career Identity" not in html:
    raise SystemExit("Build 194 index content validation failed.")
for script in (
    "app-bundle.js?v=194", "cloud-config.js?v=194", "web-shell.js?v=194",
    "browser-save-bridge.js?v=194", "browser-editors.js?v=194",
    "browser-commerce-bridge.js?v=194", "browser-feedback.js?v=194",
):
    if script not in html:
        raise SystemExit(f"Build 194 browser runtime/cache buster is missing: {script}")

if "Browser-only Stripe/Supabase storefront" not in cloud or "user_entitlements" not in cloud or "SDF_COMMERCE" not in cloud:
    raise SystemExit("Build 194 browser Stripe/Supabase commerce adapter is missing.")
if "SDF_BROWSER_SAVE_BRIDGE" not in save_bridge or "indexedDB" not in save_bridge or "usesIndexedDb:true" not in save_bridge:
    raise SystemExit("Build 194 browser account-save bridge is missing.")
if "SDF_COMMERCE" not in editors or "sdf:entitlements" not in editors:
    raise SystemExit("Build 194 browser entitlement-aware editor layer is missing.")
if (
    "SDF_BROWSER_COMMERCE_BRIDGE" not in commerce_bridge
    or "SHOP_SELECTORS" not in commerce_bridge
    or "removeAndroidEditor" not in commerce_bridge
    or "#sdfAndroidEditor" not in commerce_bridge
):
    raise SystemExit("Build 194 browser commerce/player-editor routing bridge is missing or stale.")
if (
    "V27.4.3 Build 194 — Coaching Reputation & Career Identity" not in css
    or ".coach-reputation-v194" not in css
    or ".coach-story-v194" not in css
):
    raise SystemExit("Build 194 Coaching Reputation & Career Identity styles are missing.")
if "app_version:'web-v27.4.3-build-194'" not in shell:
    raise SystemExit("Build 194 web-shell metadata validation failed.")
if "sdf-web-v27-4-3-build-194" not in (OUTPUT / "sw.js").read_text(encoding="utf-8"):
    raise SystemExit("Build 194 service-worker cache validation failed.")

print("Validated Saturday Dynasty Football Web V27.4.3 / Build 194")
print(f"app-bundle sha256: {app_hash}")
print(f"styles sha256: {styles_hash} (exact current snapshot)")
print(f"index sha256: {hashlib.sha256(index_path.read_bytes()).hexdigest()}")
print("browser saves: Supabase account sync + IndexedDB large-save cache")
print("browser commerce: Stripe/Supabase entitlement layer")
print("browser player editor: Android DOM collision guard active")
print(f"Web build ready in {OUTPUT.resolve()}")
