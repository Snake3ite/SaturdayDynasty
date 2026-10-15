# Issue 39 — current development integration

Prepared October 15, 2026. **Local implementation only: no push, merge or deployment.**

## Integration basis

Read issue #39, its linked issues #36/#37, and both draft PRs #35/#38, including their comments and changes. GitHub main is Build 270; the deployed browser was verified as **295 / 27.4.94**. The current shared/native development project is **298 / 27.4.97**. Neither draft's old bundle was substituted for current development.

The local branch `codex/issue39-current-browser` reconciles both drafts with the tested Build 298 shared assets and the actual deployed browser account/save/commerce integrations. The older dirty checkout was left untouched. Pushing this repository can trigger a Cloudflare preview deployment, so even a push is held for approval.

## Implemented

| Area | Result and relevant files |
| --- | --- |
| Current runtime | `build_web.py` verifies shared asset hashes, reads current release metadata and rejects pre-298 snapshots. `shared-app/` contains current development assets, preserving recruiting, editors, community imports, ads and remote-only announcements. |
| Browser startup | `browser-bootstrap.js` lets optional growth scripts fail open, preserves mandatory account-scoped save hydration, reports slow hydration without advising data deletion, and leaves manual guides available while avoiding automatic first-visit page tours. |
| First-game friction | Browser announcements wait until after a completed game and until actual dialogs close. Final-score ARIA dialogs now count as occupied. Returning players get a collapsed community entry rather than a guide above their Continue action. |
| Landing/discovery | `/play/`, crawlable game metadata, canonical/social tags, real fictional-team gameplay image, prominent browser/Android choices and clear iPhone wording. Navy/gold styling. |
| Attribution | `browser-growth-analytics.js` links validated source/medium/campaign across landing, Play, startup, dynasty, first recruiting activity, completed games and returns, only with existing analytics consent. Random cohort/tab-session identifiers; no save/account/name/email/token payloads. |
| Community | Verified owner Facebook and Discord URLs in `browser-community-config.js`; startup/dashboard/season-recap entries; preview before intentional sharing; safe Close/Escape/focus restoration; no automatic social posting. Summary uses season record, top signing position/stars and a recorded ranked win when available. |
| Save continuity | Preserved current IndexedDB/local/cloud account separation and backup mechanisms; `web-shell.js` derives current cloud-save version instead of a stale constant. |
| Landscape | `browser-shell.css` hides floating feedback/shop controls on narrow OR short screens, retaining normal menu access. |
| Shared Game Center | Fixed a reproducible stale scroll handler after Game Center is replaced/closed. It now checks whether its feed/button still exists and detaches. Applied to the authoritative native source and regenerated all three shared targets before integration. |
| New backend, pending | Bounded consent-only ingest handler, server-side hashing/validation, QA exclusion, deduplicated SQL storage, restricted RPC, retention and linked-session reporting query. **Migration/function have not been applied or deployed.** |
| Community drafts | `marketing/COMMUNITY_4_WEEK_KIT.md` contains four weeks of drafts, challenge/showcase prompts, outreach copy and tracking guidance. Nothing posted or sent. |

## Executed verification

- Python compilation and browser assembly passed; generated browser manifest verifies **196 assets**.
- `npm ci` passed using the lockfile. **49 node:test cases, six save persistence checks, and both landing/growth script checks pass**, including account/cloud isolation, 6 MB save and recovery cases, commerce authority, current usage edge/reporting checks, consent/attribution/queue validation, ingest validation, optional module failure, popup gates, detached scroll callbacks, sharing privacy and offline route logic. `.gitattributes` preserves exact shared snapshot bytes so checkout normalization cannot invalidate release hashes in CI.
- `C:/SDFNewUI1/VERIFY_CURRENT_BUILD.js` passed again after the shared scroll fix: gameplay/recruiting/editors/saves/ads/audio/reporting checks, 77-module syntax validation, Build 298 metadata and www/preview/Android asset parity.
- Actual UI: created a new fictional Akron career, scouted/contacted a recruit, completed three games, refreshed and loaded saves, and saved/exited at halftime then resumed the same score/clock before finishing. Recap/final-score ordering and intentional share-preview cancellation tested.
- Also played a game with an isolated exact copy of the deployed Build 295 client. All **189 published asset hashes matched** before testing. Its saved Week 2 career was visible after full reload.
- Existing production reporting accepted all four controlled game completions with `qa=true`; verified in the private database. Thus completion reporting works in these controlled paths. This does not establish that every player/game path is covered or that low reported activity has a single cause.
- Phone portrait, phone landscape and desktop UI observed. Latest landing verified at 390 px; landscape gameplay/dashboard at 844×390; desktop landing at 1280 px. No document horizontal overflow in these observed checks. Floating controls verified hidden at landscape height.
- Opted-in landing-to-game source continuity validated through the new real ingest handler running locally with a mock database RPC. This is **not** a claim that the new production endpoint/database is live.

## Limits and required next checks

1. No physical iPhone Safari or Android Chrome browser was available. Phone viewport testing is not a substitute for those device engines, storage limits or native ad playback.
2. The new SQL has been reviewed but not executed against PostgreSQL; its migration/RPC and deployed edge function need a controlled smoke test after deployment approval.
3. PWA offline routing is covered by service-worker tests. An installed-device offline session has not been tested.
4. Remote-browser controls became unavailable late in the audit, preventing completion of detailed AdMob report segmentation and the final new-sharing UI rerun. Existing screenshots predate the last small summary enhancement; the enhancement has a focused data/privacy regression test.
5. Existing saves were never deleted, overwritten by test fixtures or migrated on the production origin. Local QA dynasties used separate localhost origins.
6. No new production announcement has been published. The prior prepared announcement remains a draft.

## Review / release order

Review this local branch plus the original drafts [#35](https://github.com/Snake3ite/SaturdayDynasty/pull/35) and [#38](https://github.com/Snake3ite/SaturdayDynasty/pull/38). The browser assembly is ready for review, not represented as deployed. Obtain owner approval before pushing (preview deployment), merging, applying the migration or deploying. After approval, validate the new backend first, publish the browser build, verify live manifest/routes/saves/events, then use the community campaign links. Native Build 298 remains the existing pending development release; this work did not upload a build.

Private telemetry, AdMob evidence, screenshots and test logs are outside this repository in the workspace `outputs/issue39/` folder.

## Competitor-informed follow-up, October 15

- Shared native/browser first-week guide now highlights one next action with a progress bar and an expandable full checklist. Recruiting, deliberate practice selection (including Balanced), and first-game completion remain the existing milestones; no new save structure or resource changes.
- Practice navigation explicitly supports both the mobile Navigation select and the section buttons.
- Browser first-start community links now sit in an expandable section, keeping team creation prominent.
- Native All Access copy explicitly excludes repeatable resource boosts, matching existing entitlement behavior. No prices or purchase grants changed.
- Actual local browser test at 390×844: created fictional Akron career, added a recruit, selected Balanced, reloaded with 2/3 progress intact, opened Game Day, simulated to final, returned to dynasty, and confirmed the completed guide was removed. Portrait and 844×390 landscape document width did not overflow.
- Screenshots: `outputs/issue39/next-move-phone298.png` and `next-move-game298.png` in the outer workspace. This is browser viewport testing, not a physical Android ad test.
- Full Build 298 verifier and browser suite passed. After the final shop-copy edit, focused journey/purchase tests passed (16 tests), shared assets were regenerated, and the browser build verified 196 assets. New native regression file: `tests/journey-next298.test.cjs`.
- Existing weekly briefings, season highlights, editor previews and reward tracking were retained. Marketing experiments, new analytics backend rollout and live campaign changes remain separate approval-gated work; they are not represented as completed here.
