# Build 236 — Coach Journey and usage reports

Includes the optional first-week action guide, factual weekly coach briefing, isolated Commissioner preview, and home-team midfield branding in Game Center. Shared gameplay and save/billing ownership rules are retained.

Optional usage reporting is off until a player allows it. Android and browser report separately: sessions, first reporting launches, new dynasties, completed user-team games, finished seasons, ad impressions, shop/preview visits, checkout outcomes and client-confirmed purchases. Reopening screens and restoring ownership without a checkout do not count as purchases.

Reports go to ctoolis@gmail.com at 8 AM America/New_York, showing a rolling 24-hour window and lifetime counters since reporting began. Raw events expire after 35 days; aggregated lifetime counters remain. QA activity is excluded. Event IDs deduplicate offline retries. The receiving function hashes random device IDs and permits no public access to database counters. Report email uses a server-only token and the existing Resend secret.

Supabase migration: `supabase/migrations/20260917080000_usage_reporting.sql`; function `usage-reporting`; schedule `supabase/usage-schedule.sql`. These are installed in project fwnvwkffxazwsmaiqayj. JWT verification is off only for this public ingestion function; its report action requires a private token. A test report was accepted by Resend on September 17, 2026. Table access, deduplication, 24h windows, lifetime retention and QA exclusion passed transactional checks.

These metrics are opt-in estimates, not confirmed Google Play installs, verified revenue, unique people or an AdMob payout report. First reporting launch may be an existing player updating, a reinstall or a storage reset. Games are final user-team results, including quick simulations. A finished season is the season-review transition, not starting the next season. Late offline events update lifetime totals but already-sent snapshots remain unchanged.

Validation: browser save migration, 6 MB primary/recovery persistence, queued-write deletion, guest-to-account migration and account isolation tests pass. Usage unit tests cover consent, retries and validation. `usage-privacy.html` explains the new collection. Update Play Console Data Safety for optional app interactions, purchase history and device identifiers used for analytics before publishing Android Build236; do not change unrelated existing declarations blindly. Native ad/billing callbacks still require Android device testing. No APK is compiled or signed by this web build.
