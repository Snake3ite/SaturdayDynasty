# Saturday Dynasty Football — Build 237 / 27.4.36

- Three free challenges: Rebuild in Three (eight wins in a season within three years with a 55-prestige-or-lower program), Homegrown Class (five home-state recruits confirmed at Signing Day), and Rivalry Run (three rivalry wins in three seasons).
- Explore challenges from the Dynasty Menu; accept one in a fresh Year 1, Week 1 dynasty before any games. Progress saves with that dynasty. Existing careers continue normally.
- Recruiting feedback records actual interest changes, hours spent and score components after contacts and weekly updates. Profile → Recruiting explains pitch fit and interest caps.
- Dynasty story on Home includes player journeys, season leaders and saved season recaps. Export recaps as PNG images. Archives begin with seasons completed on this build; earlier seasons are not invented.
- Updated help topic and keyboard navigation for story tabs.
- Includes Build 236’s first-week guide, weekly briefing, Commissioner sample, home-team midfield logo and usage reporting. No new forced ads or prices.

## Android source companion

Complete source package; public assets are synced into Android. No APK has been compiled or signed. Extract into a fresh folder, install dependencies with npm ci if needed, open android in Android Studio and build/sign using your existing setup. Version code 237, version name 27.4.36.

Browser recap PNG download and gameplay UI were checked. The new Android image destination picker still needs an Android device check; Android SDK access was unavailable in this environment. Existing native billing and ad callbacks should receive your normal release smoke test.

## Validation

Run node VERIFY_BUILD237.js. All 68 checks pass, covering module syntax, challenge eligibility/progress/reloads/deadlines/Signing Day, recruiting action costs and feedback, season archive preservation, audio and save/runtime regressions. 172 asset hashes match www, preview and Android public. Website tests additionally cover six browser-save/account scenarios and five reporting backend tests.

Review screenshots and an exported recap are in the adjacent Review folder. Basic reporting and optional persistent ID choices remain as delivered in Build 236. Daily reports remain scheduled for 8 AM Eastern, covering the last 24 hours and all time since reporting began. First launches are not confirmed Play Store installs.
