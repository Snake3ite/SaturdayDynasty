# Saturday Dynasty Football: itch.io, Game Jolt and CrazyGames pack

Everything here is ready to paste or upload. Corey creates the accounts and signs in; nothing in this pack needs a password from anyone else.

## Files in this folder

| File | Use |
| --- | --- |
| `saturday-dynasty-itchio-html5.zip` | itch.io upload (HTML5, played in browser) |
| `saturday-dynasty-gamejolt-html5.zip` | Game Jolt browser build |
| `itch-cover-630x500.png` | itch.io cover image |
| `thumbnail-1280x720.png` | Game Jolt thumbnail; also fine as an extra itch screenshot |
| `gamejolt-header-2400x600.png` | Game Jolt header/banner |
| `screenshots/` | 3 desktop (1280x720) + 2 phone (780x1688) screenshots |

How the zips work: each one is a tiny page that runs the live game from saturdaydynasty.dynastysportsstudios.com. Every website update reaches itch.io and Game Jolt instantly, with no re-uploads. Visits are tagged `utm_source=itchio` / `gamejolt`, `utm_medium=referral`.

Before going public, the website deploy that makes supporter-pack checkout open in a new tab when the game is embedded must be live. Stripe won't run inside another site's frame. It's on a preview now and needs Corey's go-ahead.

## Shared copy

**Title:** Saturday Dynasty Football

**Short description / tagline (under 100 characters):**
Build a college football dynasty: recruit, develop players and chase national titles. Free.

**Long description:**

> Take over a college football program and turn it into a dynasty.
>
> Saturday Dynasty Football is a deep, free college football management game you play right in your browser. Win recruiting battles all season long, survive Signing Day, work the transfer portal and NIL, develop your players and keep the boosters happy before the hot seat gets too warm.
>
> **What you do**
> - Recruit from a class of 3,000 prospects every year, with visits, pitches and commitments
> - Develop players, set your depth chart and manage scholarships
> - Play every game live with play-by-play, or sim ahead
> - Watch 128 programs rise and fall over the seasons
> - Upgrade facilities, hire staff and manage your athletics budget
> - Commissioner Mode, custom leagues and 32 scenarios to play
>
> **Plays anywhere:** desktop, iPhone and Android browsers. Your dynasty saves on your device. Want it on your phone's home screen? Visit saturdaydynasty.dynastysportsstudios.com/install/
>
> Also on Google Play: search "Saturday Dynasty Football".
>
> Made by Dynasty Sports Studios, a one-person indie studio. Bug reports and ideas: dynastysportsstudios@gmail.com or More → Report Bug / Feedback in the game.
>
> All teams, players and conferences are fictional. Not affiliated with the NCAA or any school.

**Tags (itch.io allows up to 10):** football, american-football, college-football, sports, management, simulation, recruiting, dynasty, singleplayer, browser

## itch.io: what Corey does

1. Sign up / sign in at itch.io, then **Dashboard → Create new project**.
2. Fill in:
   - **Title:** Saturday Dynasty Football. **Project URL:** saturday-dynasty-football
   - **Short description:** the tagline above
   - **Classification:** Games. **Kind of project:** HTML
   - **Release status:** Released
   - **Pricing:** No payments. Optional: "Donations" if you want tips.
3. **Uploads → Upload files** → `saturday-dynasty-itchio-html5.zip` → tick **This file will be played in the browser**.
4. **Embed options:**
   - Viewport: **1280 × 720**
   - Tick **Mobile friendly**, orientation **Portrait**
   - Tick **Fullscreen button**
   - Leave **Automatically start on page load** off (players click Run game)
5. **Details:** paste the long description. Genre **Simulation**. Paste the tags.
6. **Cover image:** `itch-cover-630x500.png`. **Screenshots:** the 5 files in `screenshots/`.
7. Save as **Draft**, open the page and click Run game to check it, then set **Visibility: Public**.

## Game Jolt: what Corey does

1. Sign up / sign in at gamejolt.com → **Dashboard → Add game**.
2. Fill in:
   - **Title:** Saturday Dynasty Football
   - **Description:** the long description above
   - Category **Sports** (or Strategy/Sim)
   - Engine **HTML5**
   - Maturity: everyone. Status: complete / released.
3. **Thumbnail:** `thumbnail-1280x720.png`. **Header:** `gamejolt-header-2400x600.png`. **Media:** the screenshots.
4. **Packages → Add package → New release → Upload browser build** → `saturday-dynasty-gamejolt-html5.zip`. Pick **fit to screen** if offered, otherwise 1280 × 720.
5. **Tags:** the same tags as itch.
6. Preview it, then **Publish**.

## Links to use when posting about these pages

- itch.io page link to share: `https://<itch-username>.itch.io/saturday-dynasty-football`
- Links *from* the listing text back to the site should use `?utm_source=itchio&utm_medium=referral` or `?utm_source=gamejolt&utm_medium=referral`. The description above uses the plain install URL, which is fine. Embedded play is already tagged.

## CrazyGames (and Poki): scoping, not ready to submit

Portal sites like CrazyGames host your files themselves and review the game before listing. Their rules (check their current developer docs before starting) generally mean:

| Their requirement | What it means for us | Work |
| --- | --- | --- |
| Use their SDK for ads only | Our game has no web ads today. Optional: midgame ads between games via their SDK | Small |
| No outside purchases or store links | Hide the Dynasty Shop, supporter packs, Google Play and website links in a "portal edition" | Medium: a build flag in build_web.py |
| No login walls or external accounts | Hide sign-in and cloud sync. Saves stay on the device or use their SDK's data module | Medium |
| Game files hosted by them, size limits | Ship our built game files (about 215 files) instead of the launcher | Small |
| Limited external requests | Turn off announcements, usage stats and feedback calls to Supabase in the portal edition | Small |
| Loading and gameplay events | Call their SDK when loading starts/finishes and when a game starts/stops | Small |

**Estimate:** about 1–2 days for a separate "portal edition" build plus their review. **Recommendation:** list on itch.io and Game Jolt now (zero extra work, all features kept). Do the CrazyGames portal edition after the December production launch, when the game is frozen and their review won't chase weekly updates.
