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

## RoarStudio (studio.roartransfer.com)

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
