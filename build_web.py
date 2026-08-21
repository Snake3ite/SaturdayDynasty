from pathlib import Path
import base64
import hashlib
import json
import re
import runpy
import zlib

# Build 201 layers the new shared gameplay runtime over the proven Build 198
# browser build. The Build 197/198 browser pipeline continues to own Supabase
# saves, Stripe entitlements, browser editors/feedback, PWA behavior, and logos.
runpy.run_path("build_web_197.py", run_name="__main__")

OUTPUT = Path("dist")
PATCH_198 = Path(".web198")
PATCH_201 = Path(".web201")
BUILD_198_APP_SHA256 = "e1befc1e6996e24e4e6a38baa7391bca66570c6b8a9f221a64fe668e5c5dae6e"
TARGET_APP_SHA256 = "dff5f266c0a3975e04d777ac257f06c7777c32124cf83d9f2efa2bb9d9b81305"
BASE_BROWSER_STYLES_SHA256 = "ede4cca4f7ca3c724f925d5f091fd8119f4fb639a70165c7e81f73aa051f91f9"


def payload(prefix: str, patch_dir: Path) -> str:
    parts = sorted(patch_dir.glob(f"{prefix}_*.txt"))
    if not parts:
        raise SystemExit(f"Missing {prefix} web payload in {patch_dir}/")
    return "".join(p.read_text(encoding="utf-8").strip() for p in parts)


def inflate(prefix: str, patch_dir: Path):
    try:
        packed = base64.b64decode(payload(prefix, patch_dir), validate=True)
        return json.loads(zlib.decompress(packed).decode("utf-8"))
    except Exception as exc:
        raise SystemExit(f"Could not decode {prefix} web payload from {patch_dir}: {exc}") from exc


def apply_line_patch(path: Path, prefix: str, patch_dir: Path) -> None:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    for i1, i2, replacement in reversed(inflate(prefix, patch_dir)):
        lines[i1:i2] = [replacement] if replacement else []
    path.write_text("".join(lines), encoding="utf-8")


app_path = OUTPUT / "app-bundle.js"
styles_path = OUTPUT / "styles.css"
index_path = OUTPUT / "index.html"
web_shell = OUTPUT / "web-shell.js"

# Reproduce the exact Build 198 shared runtime first, then advance it to Build 201.
apply_line_patch(app_path, "app", PATCH_198)
base_198_hash = hashlib.sha256(app_path.read_bytes()).hexdigest()
if base_198_hash != BUILD_198_APP_SHA256:
    raise SystemExit(f"Build 198 browser base validation failed: {base_198_hash}")
apply_line_patch(app_path, "app", PATCH_201)

html = index_path.read_text(encoding="utf-8")
for old in (
    "Android V27.4.6 · AI World Parity",
    "Web V27.4.6 · AI World Parity",
    "Android V27.4.7 · Portal & Roster Management V2",
    "Web V27.4.7 · Portal & Roster Management V2",
):
    html = html.replace(old, "Web V27.4.8 · AI Coaching World & Recruiting Balance")
html = html.replace("?v=197", "?v=201").replace("?v=198", "?v=201")
html = html.replace("Build 197", "Build 201").replace("Build 198", "Build 201")
index_path.write_text(html, encoding="utf-8")

if web_shell.exists():
    shell = web_shell.read_text(encoding="utf-8")
    shell = re.sub(r"app_version:'web-v[^']+'", "app_version:'web-v27.4.8-build-201'", shell)
    web_shell.write_text(shell, encoding="utf-8")

(OUTPUT / "sw.js").write_text(
    """const CACHE='sdf-web-v27-4-8-build-201';
const CORE=['./','./index.html','./styles.css','./app-bundle.js','./ad-config.js','./cloud-config.js','./web-shell.js','./browser-save-bridge.js','./browser-editors.js','./browser-commerce-bridge.js','./browser-team-editor-v195.js','./browser-feedback.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));});
""",
    encoding="utf-8",
)

app_hash = hashlib.sha256(app_path.read_bytes()).hexdigest()
styles_hash = hashlib.sha256(styles_path.read_bytes()).hexdigest()
if app_hash != TARGET_APP_SHA256:
    raise SystemExit(f"Build 201 app-bundle validation failed: {app_hash}")
if styles_hash != BASE_BROWSER_STYLES_SHA256:
    raise SystemExit(f"Build 201 browser stylesheet changed unexpectedly: {styles_hash}")

app_text = app_path.read_text(encoding="utf-8")
html = index_path.read_text(encoding="utf-8")
shell = web_shell.read_text(encoding="utf-8") if web_shell.exists() else ""
sw = (OUTPUT / "sw.js").read_text(encoding="utf-8")

for marker in (
    "SDF_V198",
    "SDF_V201",
    "beginWorldSimulationCycle",
    "processAiCoachSeason",
    "processUserCoordinatorSeason",
    "recruitingRatingForTeam",
    "Contact Hrs Left",
    "prepareAiTransfers",
    "evaluateRealignment",
):
    if marker not in app_text:
        raise SystemExit(f"Build 201 shared runtime is missing: {marker}")

if "Web V27.4.8 · AI Coaching World & Recruiting Balance" not in html:
    raise SystemExit("Build 201 browser release label is missing.")
for script in (
    "app-bundle.js?v=201",
    "cloud-config.js?v=201",
    "web-shell.js?v=201",
    "browser-save-bridge.js?v=201",
    "browser-editors.js?v=201",
    "browser-commerce-bridge.js?v=201",
    "browser-team-editor-v195.js?v=201",
    "browser-feedback.js?v=201",
):
    if script not in html:
        raise SystemExit(f"Build 201 browser runtime/cache buster is missing: {script}")

if "web-v27.4.8-build-201" not in shell:
    raise SystemExit("Build 201 browser save metadata is missing.")
if "sdf-web-v27-4-8-build-201" not in sw:
    raise SystemExit("Build 201 service-worker cache key is missing.")

required_browser_files = (
    "cloud-config.js",
    "browser-save-bridge.js",
    "browser-editors.js",
    "browser-commerce-bridge.js",
    "browser-team-editor-v195.js",
    "browser-feedback.js",
)
missing = [name for name in required_browser_files if not (OUTPUT / name).exists()]
if missing:
    raise SystemExit("Build 201 browser-only runtime missing: " + ", ".join(missing))

print("Build 201 browser validation passed")
print("app-bundle SHA-256:", app_hash)
print("styles SHA-256:", styles_hash)
