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
  picture (1200x630, `makeCover` in index.html) and sends it with the link; `roartransfer-r2` keeps it as `og/<token>.jpg`
  in R2 (never for a transfer with a password) and the hourly sweep deletes it with the link. The apps never run
  JavaScript, so `cloudflare/worker.js` (a Cloudflare Worker on the route `roartransfer.com/*`, the DNS records proxied)
  puts the tags in the link's page from `roar-transfer-get ?meta=1` and serves `/og/<token>.jpg` from `?og=1`.
