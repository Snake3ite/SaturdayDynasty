# Saturday Dynasty Football — Web Beta

Browser/PWA edition of Saturday Dynasty Football for desktop and mobile browsers. The web build keeps the same dynasty/recruiting/game engine as the Android app, adds browser-specific responsive polish, local autosaves, offline/PWA support, and optional Supabase cloud syncing between PC and phone.

## Cloudflare Pages

The repository uses `build_web.py` to unpack the configured browser package into `dist/` for Cloudflare Pages.

Cloudflare settings:

- Production branch: `main`
- Framework preset: None
- Build command: `python3 build_web.py`
- Build output directory: `dist`
- Root directory: leave blank / repository root

The configured browser package must be uploaded to the repository root with this exact filename:

`SaturdayDynasty_Web_Beta_Configured.zip`

## Supabase

`supabase.sql` contains the cloud-save schema and Row Level Security policies. `cloud-config.js` contains only browser-safe Supabase connection values; never commit a `service_role` or `sb_secret_...` key.
