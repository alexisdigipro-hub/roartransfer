# RoarTransfer

roartransfer.com: send files up to 5 GB free with one short link anyone can download. By The Mad Lions.

- `llms.txt` describes the service in plain text for AI assistants; `robots.txt` names the AI crawlers as welcome.

- One plain page (`index.html`), served by GitHub Pages at roartransfer.com (`CNAME`). No build step.
- Sign in with a RoarMe account (Supabase project RoarMe). Files go straight from the browser to Cloudflare R2
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
- Pro, more (25 Oct 2026): up to 20 GB, 1/3/7/30 days, unlimited downloads (files under `pro/<id>/`); Your brand in
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
  time"): for 5 days after a link sent from an account ends (not stopped by the sender, not FastTransfer; the page never
  says how long), its page says "One last download" with Sign up free / Sign in; signed in, the person gets every file once more (one download
  each, `roar_transfer_claims`), with a line saying so. The page keeps the link in localStorage `rt-grace` and comes
  back to it after sign-in. roar-transfer-get checks the file is still in R2; every file stays in R2 5 days past its
  link's end, quietly (Alex, 26 Oct: roartransfer-r2's sweep; R2's lifecycle rules free/ 8 days, pro/ 35). SQL: `supabase/transfer-grace.sql` in roarme.
- View as (26 Oct 2026, Alex: "view as Free user & view as Pro user"): Admin > Overview has View as Free user / View
  as Pro user. The page starts again as that user would see it (no Admin tab, Free or Pro limits, PRO mark or not),
  in that browser tab only (sessionStorage `rt-as`), with a bar at the bottom: Back to Admin. Sent as Free, an upload is
  a real Free one (roartransfer-r2 takes `as: 'free'`, which can only lower, never raise).
