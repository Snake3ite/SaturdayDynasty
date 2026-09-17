# Saturday Dynasty Football — Web Beta

Browser/PWA edition of Saturday Dynasty Football for desktop and mobile browsers. The web build keeps the same dynasty/recruiting/game engine as the Android app, adds browser-specific responsive polish, local autosaves, offline/PWA support, and optional Supabase cloud syncing between PC and phone.

## Cloudflare Pages

The repository uses `build_web.py` to assemble the Build235 assets in `shared-app/` with browser-specific integrations into `dist/`. The existing `wrangler.jsonc` serves that output through the Saturday Dynasty Cloudflare Worker.

Cloudflare settings:

- Production branch: `main`
- Framework preset: None
- Build command: `python3 build_web.py`
- Build output directory: `dist`
- Root directory: leave blank / repository root

Run `python build_web.py` to build. Run `npm ci` and `npm test` for browser-save regression tests. The old configured ZIP and delta builders are retained as historical sources; they are no longer inputs to the active builder.

## Supabase

`supabase.sql` contains the cloud-save schema and Row Level Security policies. `cloud-config.js` contains only browser-safe Supabase connection values; never commit a `service_role` or `sb_secret_...` key.
