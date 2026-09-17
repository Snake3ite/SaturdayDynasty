# Saturday Dynasty Football — Build 238 / 27.4.37

- Start any free challenge directly from Explore Free Challenges on the Dynasty Menu.
- Team selection shows only eligible programs. Rebuild in Three shows nine starting teams with prestige 55 or lower. Homegrown and Rivalry apply their home-state/rival rules. Search and normal filters still work.
- The selected challenge appears in coach setup and starts automatically when the career is created. Back to Teams preserves it; Dynasty Menu or Play without a challenge clears it. Selecting a challenge alone never changes a save.
- Completing each challenge unlocks its named achievement and a gold trophy on the completed run and challenge card. Previously completed saves get the achievement when loaded.
- Achievements travel with dynasty saves. Menu badges are also remembered locally per browser account or Android installation; loading a completed save restores its badge. These are not a separate cloud achievement service.
- Includes all Build 237 features and the corrected version-aware Android build scripts.

## Android

Run SYNC_ANDROID.bat, then build/sign in Studio with your existing configuration. Confirm versionCode 238 and versionName 27.4.37. Run node VERIFY_CURRENT_BUILD.js for verification only.

No APK compiled or signed. The native recap-image destination picker still needs a device check. Signing keys, local SDK settings, dependencies and QA saves are excluded.

## Validation

69 checks pass, including 12 story/challenge tests for eligibility, startup selection, cancellation, progress, deadlines, achievements, completion backfill and account-separated trophies. 172 public assets match across www, preview and Android. Browser checks create a real new QA challenge dynasty and use a dedicated completed-run fixture to inspect achievements and trophies. Six browser-save/account scenarios and five reporting backend checks also pass.
