from pathlib import Path
import shutil
import zipfile

ZIP_NAME = "SaturdayDynasty_Web_Beta_Configured.zip"
ARCHIVE_ROOT = "SaturdayDynasty_Web_Beta"
OUTPUT = Path("dist")

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

# Keep the browser-safe Supabase config editable in GitHub without rebuilding the ZIP.
repo_cloud_config = Path("cloud-config.js")
if repo_cloud_config.exists():
    shutil.copy2(repo_cloud_config, OUTPUT / "cloud-config.js")

# Cloudflare Workers static-assets mode rejects our old SPA catch-all redirect:
#   /* /index.html 200
# It is unnecessary for Saturday Dynasty because the game boots from index.html and
# does not use pathname-based client routes. Remove it from the deployed output.
redirects = OUTPUT / "_redirects"
if redirects.exists():
    redirects.unlink()

# Database setup belongs in the repository/admin workflow, not in public web assets.
public_sql = OUTPUT / "supabase.sql"
if public_sql.exists():
    public_sql.unlink()

required = ["index.html", "app-bundle.js", "styles.css", "web-shell.js", "cloud-config.js"]
missing = [name for name in required if not (OUTPUT / name).exists()]
if missing:
    raise SystemExit("Web build is missing: " + ", ".join(missing))

print(f"Saturday Dynasty web build ready in {OUTPUT.resolve()}")
