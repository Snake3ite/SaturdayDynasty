# Web235 desktop synchronization

This branch brings the Build235 app UI, game runtime, and soundtrack into the browser build. Run `python build_web.py` to generate `dist/` for the existing Cloudflare Worker.

The browser overlay retains Supabase account/cloud-save support, browser purchases, feedback, and PWA support. Shared app assets live in `shared-app/`; the builder adapts DOM-ready hooks for asynchronous browser save hydration.

Verified locally: build succeeds with 184 asset hashes; desktop startup, saved-dynasty reload, live simulation and save/exit, recruiting screen, and account dialog were exercised.

Release checks still pending: recovery-backup persistence after the storage changes, account switching/isolation, final responsive browser checks, and production deployment verification. This is not yet a published release.

The configured Supabase project hostname failed DNS resolution during investigation. Its dashboard status and feedback/cloud service availability still require verification.
