# Browser funnel implementation and boundaries

Linked browser funnel is optional and uses the existing basic-reporting + ID
tracking choices. Neither basic totals alone nor URL parameters count as consent.
Global Privacy Control prevents linked collection. No new popup asks for consent.
The landing page has an optional checkbox and a privacy-details link.

Session: random tab session, shared across same-origin `/play/` → `/` navigation
and reloads, renewed after 30 minutes of inactivity. Cohort: separate random
browser ID while permission remains enabled. Both are hashed by the server.
Campaign tags are fixed for a session. A fresh direct session is direct, not
silently credited to an old campaign. New tabs start separate sessions.

Events: landing_view, play_click, game_ready, dynasty_created, first_recruit,
game_completed, return, community_shown, community_opened, share_opened,
share_completed. First-recruit uses the existing journey milestone: first board
activity/commit, not a claim that a prospect has signed. Game-completed uses the
authoritative usage reporter at the actual final-score boundary; opening Game
Center or reaching halftime never emits it. Reloading results does not backfill.

Only validated utm_source / utm_medium / utm_campaign are retained. No raw URL,
account/coach/player identifiers, email, password, token, save or device fingerprint
is collected. An outbound Android CTA uses an encoded Play `referrer`; it does not
prove an install attribution unless Play reporting confirms that separately.

Counts linked to a cohort represent consenting browser profiles, not people or
all installs. Return means activity on a later UTC day, once per session. This is
not a mature D1/D7 retention metric. A separate 28-day session/source query is in
`supabase/browser-growth-report.sql`; it excludes QA and uses one session tuple
for every step. Never divide unrelated basic event totals for conversion rates.

Pending endpoint `browser-growth-ingest` accepts only valid, bounded batches with
explicit consent. It hashes IDs, strips extra fields, enforces allowed origins,
and forces local tests into QA. The database is not browser-readable/writeable;
only the server role may execute its insertion RPC. Event IDs deduplicate retries.
Server rows expire after 90 days; device queues are capped at 100 and intake rejects
events older than seven days. Disabling tracking clears local queue and IDs and
aborts in-flight requests; already received events cannot be retracted locally.

## Deployment dependencies — NOT applied

1. Owner reviews the local integration/diff and privacy copy.
2. Apply the new SQL migration and deploy only the reviewed growth endpoint.
3. Test a controlled QA session through the live endpoint/database.
4. Approve/deploy the coordinated browser build, then verify `/play/`, cache/offline
   routing, checkout/entitlements and an actual new-player flow.

No step here authorizes a merge or deployment. Existing basic gameplay telemetry
continues through the separate, already-deployed usage-reporting service.
