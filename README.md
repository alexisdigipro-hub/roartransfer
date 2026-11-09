# RoarTransfer

roartransfer.com: send files up to 5 GB free with one short link anyone can download. By The Mad Lions.

- `llms.txt` describes the service in plain text for AI assistants; `robots.txt` names the AI crawlers as welcome.

- One plain page (`index.html`), served by GitHub Pages at roartransfer.com (`CNAME`). No build step.
- Sign in with a RoarMe account (Supabase project RoarMe).
  Sign in with Roar Account (3 Nov 2026, Alex: one sign-in for every Roar app) is the main button above the email
  sign-in: the page asks the Edge Function `roar-connect` (RoarMe's project, verify_jwt off) for a code, opens
  themadlions.com/account/?connect=CODE in a new tab and shows a waiting card (the code, Open the page again, Cancel);
  every 2 s it polls, and once Allow is pressed there it trades the one-time `token_hash` for its own session
  (`verifyOtp` magiclink). An account with two-step verification (a verified authenticator) types its 6-digit code
  before the page goes on (`afterIn`, `mfaVerify`); the email sign-in goes through the same step. The email way stays. Files go straight from the browser to Cloudflare R2
  (bucket `roartransfer`, `free/<account>/…`, deleted by R2 after 3 days; `pro/` after 30, for later) in 16 MB pieces.
- The Edge Function `roartransfer-r2` (in alexisdigipro-hub/roarme, `supabase/functions/`) holds the R2 keys, signs
  each piece and makes the link; `roar-transfer-get` turns a link (`?t=…`) into a download.
- Tabs: Send, My transfers, Admin (only for RoarMe's admins). Database: `supabase/transfer-panel.sql` in roarme.
- Link previews (25 Oct 2026): when a link is pasted in WhatsApp, Messenger, iMessage, Slack…, it shows a frame of the
  first video (with a round play sign) or the first picture, who sent it, how big and until when. The page makes the
  picture (1200x630, `makeCover` in index.html: the 20th frame, about 0.8 s in, or further on at 2, 4, 8 s when that one is black) and sends it with the link; `roartransfer-r2` keeps it as `og/<token>.jpg`
  in R2 (never for a transfer with a password) and the hourly sweep deletes it with the link. The apps never run
  JavaScript, so `cloudflare/worker.js` (a Cloudflare Worker on the route `roartransfer.com/*`, the DNS records proxied)
  puts the tags in the link's page from `roar-transfer-get ?meta=1` and serves `/og/<token>.jpg` from `?og=1`.
- Pro (25 Oct 2026): for a Pro account the tab and title say My Pro transfers, with a Pro card on top (until when, what
  it includes, Receive files). Admin > Pro: make an account Pro by email (or Make Pro on an account row) for 1 month,
  1 year or always, Remove, Give again. Edge Function `roartransfer-pro` (in roarme) answers `me`, `list`, `grant`,
  `revoke` (the last three only for an admin); admins are always Pro.
- Pro, more (25 Oct 2026): 1/3/7/30 days (since 26 Oct the shorter, the bigger: 1 day 50 GB, 3 days 40, 7 days 30, 30 days 20; `PRO_GB` here and in roartransfer-r2, a later new expiry kept within it by roartransfer-pro), unlimited downloads (files under `pro/<id>/`); Your brand in
  My Pro transfers (name, logo, up to 8 backgrounds, bucket `roartransfer-brand/<id>/`) shown on the Pro's download
  pages and Receive-files page; Details on each of their links (change expiry up to what storage keeps, set or remove
  the password, every open and download with when, country and device from `roar_transfer_events`); uploads resume
  from the last piece after a lost connection or a reload (localStorage `rt-up:*`, 20 hours). "Lifetime" instead of
  "Always". SQL: `supabase/transfer-pro-plus.sql` in roarme.
- Admin > Backgrounds (25 Oct 2026): the pictures behind every page (`roar_transfer_backgrounds`, files in
  `roartransfer-brand/site/`), one at random per visit; `stills/` only if the list cannot be read. Pictures up to 10 MB, made
  2560 px WebP 0.86 before upload (`shrink`); older heavy ones are made light once when Admin opens (`slimBgs`).
- Admin > Website (25 Oct 2026): roartransfer.com's own visitor numbers, no cookies and no addresses. Every page sends
  one hit (`roar_site_hit`: a random id in localStorage `rt-vid`, the page, the referring site's name, the language;
  country from Cloudflare, device from the user agent; robots and the admins' own browsers left out). Admin shows
  visitors, views, today, right now, visitors per day, countries, where they came from, pages, devices, languages for
  7/30/90 days (`roar_site_stats`). SQL: `supabase/site-stats.sql` in roarme. The Privacy page says so.
- Motion (25 Oct 2026, Alex: "smoother and fresher, like RoarMe; it jolts when I change page"): pages cross-fade
  (`@view-transition`, every page), the background is one picture for the whole visit (sessionStorage `rt-bg`, the list
  kept in localStorage `rt-bgs` so it shows at once), cards come in soft with their parts one after another, the chosen
  tab or option is a sliding sheet of glass (`lens()`, as RoarMe's Lens), buttons give under a press. A PRO mark on the
  account at the top for Pro accounts.
- Tabs (26 Oct 2026, Alex: "tidy Admin and My transfers into tabs, nice buttons, smooth"): Admin is Overview ·
  Transfers · Accounts · Pro · Backgrounds · Website, My Pro transfers is Sent · Received · Pro (others see only what
  they sent). One pane at a time (`panes()`): the shown one fades away, the title fades over, the chosen one rises in;
  counts sit on the tabs; the wide pages stay at the top so nothing jumps.
- One last download (26 Oct 2026, Alex: "when a link I sent has expired, if they sign up they can open it one last
  time"; narrowed the same day): only links from a Free account (files under free/<id>/ or week/<id>/; not Pro, not
  FastTransfer). Their files stay 3 days past the link's end, quietly (roartransfer-r2's sweep; R2's lifecycle rule on
  free/ 6 days). In those 3 days the expired page offers "One last download" with Sign up free (no Sign in): an account
  made after the link ended gets every file once (one download each, `roar_transfer_claims`), an account that already
  existed gets neither the offer nor the files. The page never says how long. The page keeps the link in localStorage
  `rt-grace` and comes back to it after sign-up. SQL: `supabase/transfer-grace.sql` in roarme.
- View as (26 Oct 2026, Alex: "view as Free user & view as Pro user"): Admin > Overview has View as Free user / View
  as Pro user. The page starts again as that user would see it (no Admin tab, Free or Pro limits, PRO mark or not),
  in that browser tab only (sessionStorage `rt-as`), with a bar at the bottom: Back to Admin. Sent as Free, an upload is
  a real Free one (roartransfer-r2 takes `as: 'free'`, which can only lower, never raise).
- Free accounts send up to 15 GB a day (26 Oct 2026, Alex): roartransfer-r2 counts the last 24 hours of an account's
  Free files (`FREE_PER_DAY`, checked when a file starts and when it finishes); past it the page says so and stops
  there (`daily`). Pro and the admins have no daily limit.
- Security check (26 Oct 2026, Alex: "check roartransfer for security holes", then "fix them all"): a transfer's
  password locks for 15 minutes after 10 wrong tries from one address or 50 from anywhere (`roar_transfer_pw_fails`,
  page `gSlow`); an account emails at most 50 people a day (Pro 200); a file with a download limit has no full preview
  (the preview is the whole file); an upload is aborted when its pieces pass the sender's largest size; R2 downloads are
  counted only by roar-transfer-get; site visits cannot be flooded; brand pictures are never SVG; Stop works on 7-day
  links; the Worker treats `$` in a title as text. SQL: `supabase/transfer-security.sql` in roarme (applied).
- Download all as one .zip (1 Nov 2026, Alex: "many files: show each one, but Download all as a zip"): a link with more
  than one file still lists every file with its own download button; Download all (.zip) gives one zip named after the
  transfer's title. `zip.js` writes it (files stored as they are, no compression, CRC worked out as they pass, zip64
  only past 4 GB, the same name twice becomes "name (2)"). `zip-sw.js`, a service worker with scope `/__zip/` only,
  streams it from R2 straight to the disk at any size with the browser's own progress (the page pings it every 10 s
  and shows "Zipping… N%" on the button). Safari, or a browser without service workers: made in memory up to 2 GB
  (1 GB on iPhone); past that, or if it fails, the files come one by one as before. No server or database change.
  Each file is read through roartransfer.com itself (`cloudflare/worker.js` `/__dl/<token>`: asks roar-transfer-get,
  counted there, and passes R2's bytes on), since R2 refuses a page after the link's redirect ("Load failed", 1 Nov);
  only roar-transfer-get to R2, no open proxy. If the Worker does not answer, the file's own address is tried.
- Pro Trial (2 Nov 2026, Alex): Admin > Accounts has Pro Trial next to Make Pro on each account that is not Pro;
  one press makes it Pro for three months (roartransfer-pro `grant`, months 3, i.e. 90 days). Admin > Pro still gives
  1 month, 1 year or Lifetime by email.
  Pro Trial also emails the person (roartransfer-pro `grant` with `trial: true`, `sendTrial`/`trialMail` in roarme):
  "A gift: 3 months of RoarTransfer Pro, free", a thank-you, the date it ends and every Pro feature, signed With love,
  The Mad Lions. Make Pro sends nothing. If the email fails, the page says so.
- Select (2 Nov 2026, Alex): My transfers > Sent has Select next to the search; the rows become round checks (only live
  links can be picked), a red bar says how many, Select all / Clear, Cancel, Delete (n), one confirm, then each link
  ends as its own Delete does (`stopOne`). Admin > Accounts rows and the Pro card's perks are no longer chips (2 Nov):
  the name with PRO / Not confirmed tags, the numbers in one line, the dates quiet below; the perks as tiles with a red check.
- Admins open every link (2 Nov 2026, Alex: "any link users send, even past the download limit, while its time runs;
  above all the Free ones"): roar-transfer-get (in roarme) sees an admin signed in on the download page and skips the
  password and the download limit; each file's address carries an admin ticket (&c=, an HMAC of the token and a 6-hour
  slot) so the download is not counted and Download all (.zip) works through the Worker. Never past the link's end.

## RoarTransfer Studio (studio.roartransfer.com; called RoarStudio until 7 Nov 2026)

The music cloud, a branch of RoarTransfer (Alex, 7 Nov 2026), in `studio/` (served at roartransfer.com/studio/;
studio.roartransfer.com is sent there by `cloudflare/worker.js`). Plain page, no build step: `studio/index.html`,
`studio/app.js`, `studio/audio.js`, `studio/style.css`.

- Sign in with the Roar account (Sign in with Roar Account first, email below, two-step code when the account has one);
  same session as RoarTransfer on roartransfer.com.
- Projects hold tracks, each track a stack of versions. Dropping files on a project makes tracks; New version on a track
  adds v2, v3… Files go straight from the browser to R2 (bucket `roartransfer`, under `studio/<project>/`) in 16 MB pieces,
  four at a time, through the Edge Function `roarstudio` (in alexisdigipro-hub/roarme). Up to 10 GB a file.
- Before a file goes up, `studio/audio.js` reads it in the browser: the waveform (1000 points), the integrated loudness
  (ITU-R BS.1770-4, checked against the EBU reference by `node studio/test-audio.js`), the sample peak, the length and the
  file's own sample rate.
- The player: versions as pills (switching keeps the position, so versions can be compared), the waveform with each note
  as a pin, Level match (every version played at −14 LUFS), space to play or pause.
- Notes on the second (or on the whole version), replies, Done, delete; they arrive live (Supabase realtime).
- Approve a version (owner and editors, or a share link that allows it), Download.
- People: add someone by the email of their Roar account as Can upload and edit / Can listen and comment / Can listen.
- Share: a link (`?s=<token>`) for the whole project or one track, for people without an account: comments, approve and
  download each on or off, an end (never, 1, 7, 30 days) and a password. Guests type their name once.
- Video and pictures (Alex, 7 Nov): a video plays as a video on its page (with its sound's waveform when the browser can
  read it), a picture shows as a picture; the page makes a small JPEG of a video's frame or a picture (`thumb`) and keeps
  its size. Up to 20 GB a file.
- Make it final (Alex, 7 Nov): any version of any file (audio, video, picture) goes into the project's **Finals** folder
  (`#f/<project>`), with Download all and **Share the Finals**: one link (`kind: 'finals'`) where anyone can look, listen
  and download the final files, without an account; files made final later show up in it too.
- Look (Alex, 7 Nov): liquid-glass buttons and cards, a mixing desk in the dark behind everything at 15% (`studio/bg.webp`,
  Higgsfield Soul 2).
- Round 3 (Alex, 7 Nov, from mixup.media's pages):
  - **+ New**: New file, New playlist (audio or video, in order, played one after the other, with its own link
    `kind: 'playlist'`), New folder (files move between folders from their page's ⋯).
  - **Cover**: a project's picture, picked and cropped in the page (zoom, drag, pinch, turn) to a square JPEG.
  - Projects as big tiles, small tiles or a list (kept per browser), each with a delete icon for its owner.
  - Inside a project: tabs All / Audio / Video / Pictures; All groups them, each kind with its colour.
  - A file's page: drag on the waveform to scrub, the time under the pointer, zoom, back to the start, speed, loop,
    picture in picture, full screen, the video's size and bitrate on it, Levels (every version's LUFS and peak),
    search and filters on the notes, a private Notepad (roarstudio_notepads).
  - **The bar at the foot**: what plays keeps playing (a video keeps its picture) while you go elsewhere.
  - **Settings** (`#settings`): your studio (name, square logo, wide banner, a background for the pages you send),
    defaults for invitations and links, Hide version numbers on links, Theme (Dark / Light / System, per device),
    Upload naming, the emails (notes, versions, approvals, shared with me, once a day), a button to the Roar account.
  - **Storage** (`#storage`): what each project takes and what kind of files.
  - **The bell**: My projects / Shared with me, filters for comments, approvals, downloads, plays, views, uploads.
  - **Emails**: pg_cron `roarstudio-notify` every 5 minutes calls the Edge Function's notify-sweep, which groups what
    happened per person (Resend, noreply@themadlions.com).
  - **Finals** as a gold room; **Download all** makes one .zip (../zip.js and ../zip-sw.js, as RoarTransfer).
  - Files load with `?v=<release>` in index.html, so a release shows at once (bump it with every change).
  - Database: `supabase/studio-more.sql` in roarme.
- RoarStudio 2 (Alex, 7 Nov): a delivery tool for audio, video and pictures. Glassmorphism with neumorphism (raised
  buttons and cards, fields pressed into the surface), dark purple as the accent (logo too), Sora for headings, a fine
  technical grid behind, the mixing desk recoloured purple, 1340 px wide (100 more). **Credits** on the Finals
  (`projects.credits`): templates Music (with lyrics), Video, Photo, Custom; Copy; shown on the Finals link.
- Database: `supabase/studio.sql` in roarme (roarstudio_* tables with RLS, roarstudio_people, roarstudio_invite).
- Pricing (Alex, 8 Nov 2026), public since 8 Nov: roartransfer.com/pricing/ (Free / Pro, 7 € a month or 70 € a year) and
  roartransfer.com/studio/pricing/ (Studio Free / Studio Pro, 15 € a month or 150 € a year, RoarTransfer Pro included),
  both EN/GR, linked from the footers and in the sitemap. Paying is not open: Pro says Coming soon, with **Reserve my
  spot** under it (an email goes to `roarstudio_waitlist` through the roarstudio function, action `waitlist`, with the
  plan and monthly or yearly). Built by a script from one template (both pages share the CSS and the toggle code).
- Admin > Studio Pro (Alex, 8 Nov 2026): make an account Studio Pro by email for 1 month, 1 year or always; take it away
  or give it again from the list. Studio Pro gives RoarTransfer Pro to the same date (a longer RoarTransfer Pro the
  person already has stays), and taking Studio Pro away ends only the RoarTransfer Pro it gave. Admins are always Pro.
  Admin > Waiting list shows who reserved a spot, with Copy emails. Database: `supabase/studio-pro.sql` in roarme
  (roarstudio_pro, roarstudio_waitlist, roarstudio_user_by_email); the function's actions pro-list, pro-grant,
  pro-revoke, waitlist-list (admins only) and pro-me.
- From Frame.io (Alex, 8 Nov 2026): **Compare** has three ways, Wipe, Fade and Difference (Difference draws both frames on
  a canvas with the difference blend, so only what changed is bright), for video and for Before / after on pictures
  (`cmpModes`, `rs-cmpm`). **Social guides** in Frame masks: Instagram Reels, TikTok, YouTube Shorts (the 9:16 frame,
  the app's buttons and captions in red, the safe box for text; `SOCIAL`). **Search everything** (the magnifier in the
  top bar, `/` or Cmd+K): projects, files and notes across every project you are in; a note opens at its moment
  (`searchBox`, `pendingNote`).
- Review tools from Frame.io, part 2 (Alex, 8 Nov 2026): **reactions** on notes (👍 ❤️ 🔥 😂 👀 ✅, roarstudio_reactions), a
  **picture with a note** (studio/<project>/att/, at most 1600 px, 25 MB), **@names** in notes (emailed once, `mention`),
  the **viewer's name** over video and pictures on review links (Settings > Viewer's name on links, studios.watermark_viewer),
  and **Views**: who played each version, how much and how far (roarstudio_watch, the Views tab for editors).
  Database: supabase/studio-review.sql in roarme.
- Pictures (Alex, 8 Nov): a click opens the picture big (100% on click, drag); a note on a spot only with **Pin a note**.
- Security check (8 Nov 2026): picture addresses only from our own storage (CHECK constraints + `cssu()`), members update
  only the columns the page needs, notes stay in their project (trigger), deletes only inside a project's own folder,
  a limit on wrong link passwords, limits on link uploads, mentions and the waiting list; RoarTransfer's delete checks
  its path. Database: supabase/studio-hardening.sql in roarme. RoarTransfer's hourly sweep never touches studio/ (it
  deleted every Studio file older than six hours until 8 Nov).
- Speed (8 Nov 2026): stills and backgrounds re-encoded (about 1.5 MB less), the lower pictures of the pages load when
  near, supabase-js served from /supabase-2.45.4.js (jsDelivr as a fallback; not /vendor/, which Cloudflare had cached as missing), i18n.js only for Greek, no redraws while nothing plays (`frameLater`).
- Speed, part 2 (8 Nov 2026): the home page's styles and script are their own files (home.css, home.js; index.html went
  from 244 KB to 38 KB and browsers keep the rest), the other pages share pages.css (el/, about/) and guide.css (iphone/,
  wetransfer-alternative/, EN and EL). A file's ?v= is a hash of its content; edit home.css/home.js and change it.
  studio/style.css lost 205 declarations that a later rule with the same selector always overrode (same look, checked
  by comparing screenshots).
- Any file (Alex, 9 Nov 2026): MIDI, PDF, sessions and anything else upload as files (kind 'file': a card with Download,
  notes without a time); the Files tab in a project. Inside a song, **Stems & files**: playable stems (in step by
  nudging the speed of a stem that drifts, never jumping, and all waiting together when one runs out of sound) and,
  below, MIDI and other files; each can be downloaded, a picked few, or all as one .zip (`zipAll`, `saveUrl`).
- From Suno (Alex, 9 Nov 2026): + New > From Suno, or a track's ⋯ > New version from Suno: the song's link becomes a
  version with mime `application/x-suno;id=<song id>` and plays in Suno's own embedded player (suno.com/embed/<id>);
  Suno does not allow taking the audio file, so it is not copied. Edge Function `roarstudio-import` in roarme.
- Plays and views (Alex, 9 Nov 2026): each file shows how many times it was played (roarstudio_watch, not your own plays)
  and opened through a link (stream events, last 30 days), on its row and under the player, for editors. **Stats**
  (Studio Pro; others see what it is and a link to the pricing): link opens, plays, people, downloads, 14 days, the files,
  the latest visits (statsBox, projStats). A Pro also gets each link visit on the bell (Visits).
- Not your own (Alex, 9 Nov): your plays and visits never count, on your account or on your own links (signed in, the
  function knows you are a member: roarstudio v14); a mini Stats card under the notes (plays, views, people, downloads,
  watched on average, the last visit, All stats); the facts line as wide as the player; the background at 16%.
- Right click (Alex, 9 Nov; a long press on a phone): a project: Open, Edit, Change cover, Move (start, back, forward,
  end; one's own order, rs-porder, also by dragging a project onto another), Delete; a file in a project: Open, Rename,
  Download, Move up / down / to the top, Move out of or into a folder, to a new folder, Delete (ctxMenu, projCtx,
  fileCtx). A project's Edit and Delete sit at the right end of its bar, not on the picture.
