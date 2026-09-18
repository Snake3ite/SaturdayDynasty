# Saturday Dynasty Football — Build 240 / 27.4.39

- 14 free scenarios with a main-menu introduction, direct start buttons and eligible-school filtering.
- Worst to First: take the lowest-prestige school to a national championship within eight seasons. Build a Dynasty allows ten seasons.
- Authored weak, young, contender and portal-rescue starting rosters. One-, two- and three-star recruiting restrictions include transfers and automatic signings; players can develop normally.
- One school per active scenario. Success earns a saved achievement and trophy badge. Success, failure and ending a run show a result screen and allow normal dynasty continuation with restrictions lifted.
- Commissioner edits end an active scenario's trophy eligibility. Existing saves remain supported.
- Shared challenge seeds are a future feature; these scenarios do not promise identical random worlds.

## Android
Version code 240, version name 27.4.39. Run SYNC_ANDROID.bat and build/sign in Android Studio. No APK was compiled or signed here.
This release adds Google Play immediate-update checks at app launch/resume. A confirmed available update blocks continuation until updated; an unavailable/offline initial check does not. Older installed builds cannot acquire this check until updated once. The native update flow still needs compilation and testing through Google Play.

## Validation
72 release checks pass; 172 public assets match across web source, preview and Android assets. Tests cover scenario rules, eligible schools, progression/deadlines, trophies, recruiting/transfer caps, save reloads and school locks. Browser QA covers scenario discovery, restricted school selection, new one-star career creation, its prospect filter, and deadline failure with normal dynasty continuation. QA uses disposable saves.

Browser deployment uses the same scenario runtime with account commerce and saves. Native update handling applies only to Android.
