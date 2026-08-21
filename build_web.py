from pathlib import Path
import base64
import hashlib
import json
import re
import runpy
import zlib

# Build 203 layers the shared Open Testing stabilization delta over the proven
# Build 201 browser runtime. Historical browser builders continue to own
# Supabase saves, Stripe entitlements, browser editors/feedback, PWA behavior,
# the browser stylesheet and canonical team-logo restoration.
runpy.run_path("build_web_197.py", run_name="__main__")

OUTPUT = Path("dist")
PATCH_198 = Path(".web198")
PATCH_201 = Path(".web201")
PATCH_203 = Path(".web203")
BUILD_198_APP_SHA256 = "e1befc1e6996e24e4e6a38baa7391bca66570c6b8a9f221a64fe668e5c5dae6e"
BUILD_201_APP_SHA256 = "dff5f266c0a3975e04d777ac257f06c7777c32124cf83d9f2efa2bb9d9b81305"
TARGET_APP_SHA256 = "81a7b416c843caf0a9152c4d8946fc8496e6f04a363c96179f939997bf3349f3"
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

# Reproduce exact historical shared runtimes, then advance 201 -> 203.
apply_line_patch(app_path, "app", PATCH_198)
base_198_hash = hashlib.sha256(app_path.read_bytes()).hexdigest()
if base_198_hash != BUILD_198_APP_SHA256:
    raise SystemExit(f"Build 198 browser base validation failed: {base_198_hash}")
apply_line_patch(app_path, "app", PATCH_201)
base_201_hash = hashlib.sha256(app_path.read_bytes()).hexdigest()
if base_201_hash != BUILD_201_APP_SHA256:
    raise SystemExit(f"Build 201 browser base validation failed: {base_201_hash}")
apply_line_patch(app_path, "app", PATCH_203)

html = index_path.read_text(encoding="utf-8")
for old in (
    "Android V27.4.6 · AI World Parity",
    "Web V27.4.6 · AI World Parity",
    "Android V27.4.7 · Portal & Roster Management V2",
    "Web V27.4.7 · Portal & Roster Management V2",
    "Android V27.4.8 · AI Coaching World & Recruiting Balance",
    "Web V27.4.8 · AI Coaching World & Recruiting Balance",
):
    html = html.replace(old, "Web V27.4.9 · Build 203 · Open Testing Stabilization")
for old in ("?v=197", "?v=198", "?v=201"):
    html = html.replace(old, "?v=203")

# Build 203 makes staff a first-class Coach screen system. Preserve the browser
# shell and inject only the shared Coach staff surface when it is not present.
if 'id="coachStaffManagement"' not in html:
    needle = '''  <section class="surface">\n    <div class="section-head"><div><span class="eyebrow">TEAM MANAGEMENT</span><h2>Captains, Discipline & Academics</h2></div></div>\n    <div id="leadershipPanel"></div>\n  </section>'''
    staff = '''  <section class="surface">\n    <div class="section-head">\n      <div><span class="eyebrow">COACHING STAFF</span><h2>Coordinators & Staff Management</h2><p class="muted">Manage your offensive and defensive coordinators here alongside the Head Coach tree. Coordinator Level and XP progression is shown on each staff profile.</p></div>\n    </div>\n    <div id="coachStaffManagement" class="coach-grid"></div>\n    <div class="section-head staff-coach-assignment-head"><div><span class="eyebrow">RECRUITING RESPONSIBILITIES</span><h3>Staff Recruiting Assignments</h3></div></div>\n    <div id="coachStaffAssignments" class="assignment-grid"></div>\n  </section>\n'''
    if needle not in html:
        raise SystemExit("Build 203 Coach staff insertion point is missing from browser index.")
    html = html.replace(needle, staff + needle, 1)
index_path.write_text(html, encoding="utf-8")

if web_shell.exists():
    shell = web_shell.read_text(encoding="utf-8")
    shell = re.sub(r"app_version:'web-v[^']+'", "app_version:'web-v27.4.9-build-203'", shell)
    web_shell.write_text(shell, encoding="utf-8")

(OUTPUT / "sw.js").write_text(
    """const CACHE='sdf-web-v27-4-9-build-203';
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
    raise SystemExit(f"Build 203 app-bundle validation failed: {app_hash}")
if styles_hash != BASE_BROWSER_STYLES_SHA256:
    raise SystemExit(f"Build 203 browser stylesheet changed unexpectedly: {styles_hash}")

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
    "hrs remaining",
    "coachStaffManagement",
    "prepareAiTransfers",
    "evaluateRealignment",
):
    if marker not in app_text:
        raise SystemExit(f"Build 203 shared runtime is missing: {marker}")

if "Web V27.4.9 · Build 203 · Open Testing Stabilization" not in html:
    raise SystemExit("Build 203 browser release label is missing.")
if 'id="coachStaffManagement"' not in html or 'id="coachStaffAssignments"' not in html:
    raise SystemExit("Build 203 Coach staff UI is missing from browser index.")
for script in (
    "app-bundle.js?v=203",
    "cloud-config.js?v=203",
    "web-shell.js?v=203",
    "browser-save-bridge.js?v=203",
    "browser-editors.js?v=203",
    "browser-commerce-bridge.js?v=203",
    "browser-team-editor-v195.js?v=203",
    "browser-feedback.js?v=203",
):
    if script not in html:
        raise SystemExit(f"Build 203 browser runtime/cache buster is missing: {script}")

if "web-v27.4.9-build-203" not in shell:
    raise SystemExit("Build 203 browser save metadata is missing.")
if "sdf-web-v27-4-9-build-203" not in sw:
    raise SystemExit("Build 203 service-worker cache key is missing.")

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
    raise SystemExit("Build 203 browser-only runtime missing: " + ", ".join(missing))

print("Build 203 browser validation passed")
print("app-bundle SHA-256:", app_hash)
print("styles SHA-256:", styles_hash)
