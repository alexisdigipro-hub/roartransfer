# RoarTransfer

roartransfer.com: send files up to 3 GB with a link anyone can download for 3 days. By The Mad Lions.

- One plain page (`index.html`), served by GitHub Pages at roartransfer.com (`CNAME`). No build step.
- Sign in with a RoarMe account (Supabase project RoarMe). Files go straight from the browser to Cloudflare R2
  (bucket `roartransfer`, `free/<account>/…`, deleted by R2 after 3 days; `pro/` after 30, for later) in 16 MB pieces.
- The Edge Function `roartransfer-r2` (in alexisdigipro-hub/roarme, `supabase/functions/`) holds the R2 keys, signs
  each piece and makes the link; `roar-transfer-get` turns a link (`?t=…`) into a download.
- Tabs: Send, My transfers, Admin (only for RoarMe's admins). Database: `supabase/transfer-panel.sql` in roarme.
