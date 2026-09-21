# Build 243 — 27.4.42

Includes all Build 242 bug fixes plus:
- New seasons: 12 games across 14 weeks, with league bye weeks at Weeks 5 and 10. Existing 12-week seasons stay intact until the next year. No games, wins/losses, national-game stats or games-missed counts are added on a bye. Recruiting and injury recovery continue.
- Advancing overlay acknowledges the click before processing, prevents double advancement, then confirms the new stage. Regular season and transfer portal show week/total progress. Guided offseason preparation and new-year confirmation remain included.
- Database-managed system messages on app and browser. Corey's full thank-you is published and bundled for offline launch. Messages are dismissed once per installation/browser account, not synchronized across devices. See SYSTEM_MESSAGES_GUIDE.md.
- Postseason resume, duplicate-result protection and recoverable inflated records; ordinary scenario settings; recruiting card stability and hours feedback; navigation scroll resets; explicit practice selection/automatic-application confirmation.

Validation: 82 release checks, 172 public assets verified in three copies. Full weakest-team runtime test completed 12 games, two byes, offseason and Year 2 save/reload without recorded runtime errors. Additional tests cover playoff win/loss/bowl progression, duplicate results, bye recovery, repeated advance clicks, messages and practice persistence. Phone-width browser checks confirmed the full welcome, acknowledgement after reload, proper bye card and Week 5-to-6 advancement with unchanged record.

Known limits: no actual reporter save or physical-phone QA was supplied. Historical inflated player statistics cannot be reconstructed from missing game history. Current bye weeks are league-wide; custom/staggered schedule editing remains roadmap work. Recruiting balance is unchanged. Real store purchase/ad/update flows need device testing.

Run SYNC_ANDROID.bat in C:\SDFNewUI1, then build/sign the production AAB in Android Studio. The included APK is for debug testing, not Play publication.
