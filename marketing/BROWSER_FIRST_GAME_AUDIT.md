 > Current integration note (October 15): this is the original draft handoff. Its implementation-status statements are superseded by ISSUE39_INTEGRATION.md and marketing/BROWSER_GROWTH_MEASUREMENT.md. Current runtime is Build 298; canonical community URLs are verified. A separate consent-only funnel endpoint/migration is prepared but NOT deployed. The diagnostic hook now observes accepted core usage events, rather than wrapping journey methods. See marketing/COMMUNITY_4_WEEK_KIT.md for the updated four-week drafts.

# Browser first-game & community audit — October 14, 2026

## Why this is priority zero

The Oct 13 internal daily report suggests the browser edition receives some traffic but reports very few dynasty starts and no games. **This is not proof of a gameplay bug**: the report counts reporting events, not verified full-population unique visitors; collection can be limited. Our first objective is to separate an actual first-session obstacle from missing/incomplete event tracking.

## Implemented in this draft branch

1. An optional, non-modal **Your first season starts here** panel on the program-selection screen. It explains the three steps and scrolls/focuses the existing school search. It does **not** create a dynasty, bypass tutorials or change gameplay.
2. A lightweight dashboard prompt inviting players to tell their season story and a share button (Web Share API when available; clipboard/prompt fallback).
3. Discord and Facebook CTAs only if verified URLs are supplied in `browser-community-config.js`. Invalid/blank links render no external button. No user-supplied destinations are hard-coded.
4. Opt-in browser diagnostic trace: `?sdf_growth_debug=1`. Shows major bootstrap phases, limited navigation clicks, dashboard ready, and a small allowlist of existing `SDF_JOURNEY.record()` event names. **No new reporting endpoint or background network calls.** Exported QA snapshot intentionally omits player data, save content, email, and auth tokens.
5. A 20-second non-blocking startup notice if hydration/startup stalls, explicitly warning against clearing browser site data (which might contain saves).
6. Both marketing modules fail open in the browser bootstrap: script-loading failure logs a warning and the core game still loads normally.

## Manual smoke test required before merging/deploying

Use staging on a **fresh test profile**; do not erase anybody's production saves. Check Chrome desktop, Safari iPhone, and Chrome Android web.

1. Open `https://<staging-domain>/?sdf_growth_debug=1`, with browser console visible. The small QA chip should appear early. Confirm no fatal loader errors.
2. If boot stage remains **boot_save_hydrating** longer than 20 seconds, check browser permissions, IndexedDB and failed script requests; report this as a boot failure, NOT low conversion.
3. Confirm the first-time guide appears above school selection. Press **Find a team**; the school search should receive focus without selecting a program or erasing existing saves.
4. Choose any fictional school to start a new TEST dynasty. Confirm the game screen opens and the dashboard community prompt is visible.
5. Recruit one player, advance to the first game and complete a watched or simulated game. Copy the QA snapshot via the chip and note its stage list.
6. Expected production-game events should include (when implemented in this runtime): `dynasty_started`, `first_recruit`, `first_game`, `game_completed`. The opt-in probe watches only the existing `SDF_JOURNEY.record()` method. It may miss events emitted before the probe attaches or by a different reporting function; **absence of a probed event alone does not prove a bug.**
7. Reload and verify the TEST dynasty remains intact. If using cloud saves, test separate account only using test credentials and verify no cross-account leakage. **Do not clear browser storage.**
8. Share the game via device share sheet or clipboard fallback. Confirm no hidden/private parameters in the shared URL. If verified Discord and Facebook links have been configured, both must open correct destinations in a separate browser tab.
9. Validate the backend browser report now contains a controlled `dynasty_started` and `game_completed` test (or trace separately in a QA-only cohort). Compare with Google Analytics/Cloudflare entry counts only once the session link is instrumented, not from raw visit totals.
10. Confirm the optional browser module can be omitted/blocked in staging without blocking normal game startup. Confirm mobile labels and buttons do not overlay game controls.

## If controlled game completion works but browser reporting remains zero

Investigate the existing SDF reporting source/transport in the shared game bundle and Supabase ingestion/aggregation. Do not “fix” missing telemetry by fabricating gameplay events from mere button clicks. Distinguish:
- `game_started` (user opened game viewer)
- `game_completed` (simulation successfully completed)
- `first_game` (first completed or started depending on authoritative implementation)
- `dynasty_started` (user completed actual new-dynasty creation)
- reporting not initialized, disabled by player, blocked by network, or delayed.

## Funnel to measure after verification

landing viewed → Play clicked → game bootstrap complete → team selection seen → dynasty started → first recruit → first game completed → day-1 return.

Report absolute counts and step-to-step rates for **one consistently identified opt-in cohort**. Do not divide unrelated event totals.

## Remaining blockers
- Need the exact owned Facebook Page and currently-valid Discord invite URLs; keep config blank until verified.
- Could not interact with the live Cloudflare game via the research environment; no live browser playthrough or SDK/backend data changes were performed.
- This repository's builder currently identifies Web270. Confirm production release alignment before merging/deploying.
- Full `python3 build_web.py` and `npm test` need to run in a checkout with the real game assets and dev dependencies. Source-level syntax/integration checks alone are not a production test.

## Scope / safety

Changes are limited to **browser-only UX/diagnostic modules and their loader/build registration**. Native Android, game simulation, existing cloud save rules, Stripe/payment flows, AdMob settings, and main branch are unchanged. The draft PR must be reviewed and merged by the owner, and deployed separately.
