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
PATCH_189 = Path(".web189")
PATCH_190 = Path(".web190")
PATCH_191 = Path(".web191")
APP_SHA256 = "c84a49d62c1ed3e70583db779ff960c298003c0e3510e37ae09a45b845dd4f0c"
BROWSER_FILES = [
    "browser-save-bridge.js",
    "browser-editors.js",
    "browser-commerce-bridge.js",
    "browser-feedback.js",
]


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


def append_css_once(styles_path: Path, patch_dir: Path, marker: str) -> None:
    addition = (patch_dir / "styles-additions.css").read_text(encoding="utf-8")
    styles = styles_path.read_text(encoding="utf-8")
    if marker not in styles:
        styles_path.write_text(styles.rstrip() + "\n\n" + addition.rstrip() + "\n", encoding="utf-8")


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
apply_line_patch(OUTPUT / "index.html", "index", PATCH_187)

# Stage 2: Build 188 — Promises, Trust & Culture.
apply_line_patch(OUTPUT / "app-bundle.js", "app", PATCH_188)
styles_path = OUTPUT / "styles.css"
append_css_once(styles_path, PATCH_188, "V27.3.7 Build 188 — Promises, Trust & Culture")
index_path = OUTPUT / "index.html"
html = index_path.read_text(encoding="utf-8")
html = html.replace("Android V27.3.6 · Coach Tree V2", "Android V27.3.7 · Promises, Trust & Culture")
html = html.replace("Web V27.3.6 · Coach Tree V2", "Web V27.3.7 · Promises, Trust & Culture")
html = html.replace("?v=187", "?v=188")
html = html.replace("Build 187", "Build 188")
index_path.write_text(html, encoding="utf-8")

# Stage 3: Build 189 — Staff Overhaul.
apply_line_patch(OUTPUT / "app-bundle.js", "app", PATCH_189)
append_css_once(styles_path, PATCH_189, "V27.3.8 Build 189 — Staff Overhaul")
html = index_path.read_text(encoding="utf-8")
html = html.replace("Android V27.3.7 · Promises, Trust & Culture", "Android V27.3.8 · Staff Overhaul")
html = html.replace("Web V27.3.7 · Promises, Trust & Culture", "Web V27.3.8 · Staff Overhaul")
html = html.replace("?v=188", "?v=189")
html = html.replace("Build 188", "Build 189")
index_path.write_text(html, encoding="utf-8")

# Stage 4: Build 190 — Program Identity & Traditions.
apply_line_patch(OUTPUT / "app-bundle.js", "app", PATCH_190)
append_css_once(styles_path, PATCH_190, "V27.3.9 Build 190 — Program Identity & Traditions")
html = index_path.read_text(encoding="utf-8")
html = html.replace("Android V27.3.8 · Staff Overhaul", "Android V27.3.9 · Program Identity & Traditions")
html = html.replace("Web V27.3.8 · Staff Overhaul", "Web V27.3.9 · Program Identity & Traditions")
html = html.replace("?v=189", "?v=190")
html = html.replace("Build 189", "Build 190")
index_path.write_text(html, encoding="utf-8")

# Stage 5: Build 191 — Rivalries & World.
apply_line_patch(OUTPUT / "app-bundle.js", "app", PATCH_191)
append_css_once(styles_path, PATCH_191, "V27.4.0 Build 191 — Rivalries & World")
html = index_path.read_text(encoding="utf-8")
html = html.replace("Android V27.3.9 · Program Identity & Traditions", "Android V27.4.0 · Rivalries & World")
html = html.replace("Web V27.3.9 · Program Identity & Traditions", "Web V27.4.0 · Rivalries & World")
html = html.replace("?v=190", "?v=191")
html = html.replace("Build 190", "Build 191")
index_path.write_text(html, encoding="utf-8")

# Browser-owned account, cloud-save, commerce and feedback layers are mandatory.
repo_cloud_config = Path("cloud-config.js")
if not repo_cloud_config.exists():
    raise SystemExit("Missing browser-only runtime: cloud-config.js")
shutil.copy2(repo_cloud_config, OUTPUT / "cloud-config.js")

for name in BROWSER_FILES:
    src = Path(name)
    if not src.exists():
        raise SystemExit(f"Missing browser-only runtime: {name}")
    shutil.copy2(src, OUTPUT / name)

# The shared bundle owns Android billing. Browser layers load afterwards and make
# Supabase account saves + Stripe/Supabase entitlements authoritative on web.
html = index_path.read_text(encoding="utf-8")
anchor = '<script src="web-shell.js?v=191"></script>'
browser_scripts = (
    '<script src="browser-save-bridge.js?v=191"></script>\n'
    '<script data-sdf-paid-editors="1" src="browser-editors.js?v=191"></script>\n'
    '<script src="browser-commerce-bridge.js?v=191"></script>\n'
    '<script data-sdf-feedback="1" src="browser-feedback.js?v=191"></script>'
)
if 'browser-save-bridge.js?v=191' not in html:
    if anchor not in html:
        raise SystemExit("Could not locate Build 191 web-shell script anchor.")
    html = html.replace(anchor, anchor + "\n" + browser_scripts)
    index_path.write_text(html, encoding="utf-8")

# Preserve the stable dynasty save key while advancing browser build metadata.
web_shell = OUTPUT / "web-shell.js"
if web_shell.exists():
    shell = web_shell.read_text(encoding="utf-8")
    for old in (
        "web-v26-beta",
        "web-v27.3.6-build-187",
        "web-v27.3.7-build-188",
        "web-v27.3.8-build-189",
        "web-v27.3.9-build-190",
    ):
        shell = shell.replace(f"app_version:'{old}'", "app_version:'web-v27.4.0-build-191'")
    web_shell.write_text(shell, encoding="utf-8")

# Force PWA clients onto Build 191, including browser save/billing hotfix layers.
(OUTPUT / "sw.js").write_text(
    """const CACHE='sdf-web-v27-4-0-build-191';
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
    "index.html",
    "app-bundle.js",
    "styles.css",
    "web-shell.js",
    "cloud-config.js",
    "browser-save-bridge.js",
    "browser-editors.js",
    "browser-commerce-bridge.js",
    "browser-feedback.js",
    "manifest.webmanifest",
    "icon.svg",
    "sw.js",
]
missing = [name for name in required if not (OUTPUT / name).exists()]
if missing:
    raise SystemExit("Web build is missing: " + ", ".join(missing))

app_hash = hashlib.sha256((OUTPUT / "app-bundle.js").read_bytes()).hexdigest()
if app_hash != APP_SHA256:
    raise SystemExit(f"Build 191 app-bundle validation failed: {app_hash}")

html = (OUTPUT / "index.html").read_text(encoding="utf-8")
css = (OUTPUT / "styles.css").read_text(encoding="utf-8")
shell = (OUTPUT / "web-shell.js").read_text(encoding="utf-8")
cloud = (OUTPUT / "cloud-config.js").read_text(encoding="utf-8")
save_bridge = (OUTPUT / "browser-save-bridge.js").read_text(encoding="utf-8")
editors = (OUTPUT / "browser-editors.js").read_text(encoding="utf-8")
commerce_bridge = (OUTPUT / "browser-commerce-bridge.js").read_text(encoding="utf-8")

if "Web V27.4.0 · Rivalries & World" not in html:
    raise SystemExit("Build 191 index content validation failed.")
for script in (
    "app-bundle.js?v=191",
    "cloud-config.js?v=191",
    "web-shell.js?v=191",
    "browser-save-bridge.js?v=191",
    "browser-editors.js?v=191",
    "browser-commerce-bridge.js?v=191",
    "browser-feedback.js?v=191",
):
    if script not in html:
        raise SystemExit(f"Build 191 browser runtime/cache buster is missing: {script}")

if "Browser-only Stripe/Supabase storefront" not in cloud or "user_entitlements" not in cloud or "SDF_COMMERCE" not in cloud:
    raise SystemExit("Build 191 browser Stripe/Supabase commerce adapter is missing.")
if "SDF_BROWSER_SAVE_BRIDGE" not in save_bridge or "indexedDB" not in save_bridge or "usesIndexedDb:true" not in save_bridge:
    raise SystemExit("Build 191 browser account-save bridge is missing.")
if "SDF_COMMERCE" not in editors or "sdf:entitlements" not in editors:
    raise SystemExit("Build 191 browser entitlement-aware editor layer is missing.")
if "SDF_BROWSER_COMMERCE_BRIDGE" not in commerce_bridge or "#sdfPlayShop" not in commerce_bridge or "SHOP_SELECTORS" not in commerce_bridge:
    raise SystemExit("Build 191 browser commerce routing bridge is missing.")
if "V27.4.0 Build 191 — Rivalries & World" not in css or ".rivalry-network-v191" not in css or ".world-pulse-v191" not in css:
    raise SystemExit("Build 191 Rivalries & World styles are missing.")
if "app_version:'web-v27.4.0-build-191'" not in shell:
    raise SystemExit("Build 191 web-shell metadata validation failed.")
if "sdf-web-v27-4-0-build-191" not in (OUTPUT / "sw.js").read_text(encoding="utf-8"):
    raise SystemExit("Build 191 service-worker cache validation failed.")

print("Validated Saturday Dynasty Football Web V27.4.0 / Build 191")
print(f"app-bundle sha256: {app_hash}")
print(f"styles sha256: {hashlib.sha256((OUTPUT / 'styles.css').read_bytes()).hexdigest()}")
print(f"index sha256: {hashlib.sha256((OUTPUT / 'index.html').read_bytes()).hexdigest()}")
print("browser saves: Supabase account sync + IndexedDB large-save cache")
print("browser commerce: Stripe/Supabase entitlement layer")
print(f"Web build ready in {OUTPUT.resolve()}")
