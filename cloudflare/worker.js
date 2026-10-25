// RoarTransfer's link previews (Alex, 25 Oct 2026: "when I send a RoarTransfer link, make Open Graph with a picture
// from the video or the picture"). roartransfer.com is GitHub Pages, which has no page for roartransfer.com/<token>
// (404.html sends it on with JavaScript), and WhatsApp, Messenger, iMessage, Slack… never run JavaScript. This Worker sits
// in front of roartransfer.com on Cloudflare (route roartransfer.com/*): everything goes to GitHub Pages as before; only a
// link's page gets its own title, description and picture in Open Graph tags, with status 200 so the apps show it.
//   /<token>        404.html from GitHub Pages + the link's tags (from roar-transfer-get ?meta=1)
//   /og/<token>.jpg the link's picture (roar-transfer-get ?og=1: og/<token>.jpg in R2, made by the page when it was sent)
// A transfer with a password shows only who sent it, how many files and until when; no names, no picture.
// It holds no key: roar-transfer-get is public and answers only what the link itself would show.
// Paste this whole file in Cloudflare > Workers & Pages > roartransfer-og > Edit code.
const FN = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co/functions/v1/roar-transfer-get'
const SITE = 'https://roartransfer.com'

export default {
  async fetch(req) {
    const url = new URL(req.url)
    if (req.method !== 'GET' && req.method !== 'HEAD') return fetch(req)
    const pic = url.pathname.match(/^\/og\/([A-Za-z0-9]{6,32})\.jpg$/)
    if (pic) {
      const r = await fetch(`${FN}?og=1&t=${pic[1]}`, { cf: { cacheTtl: 3600, cacheEverything: true } })
      if (!r.ok) return Response.redirect(`${SITE}/og.jpg`, 302)
      return new Response(r.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' } })
    }
    const m = url.pathname.match(/^\/([A-Za-z0-9]{6,32})\/?$/)
    const page = await fetch(req)
    // a real page (about, privacy, terms…) or anything that is not a link: as it is
    if (!m || page.status !== 404) return page
    let meta = {}
    try { meta = await (await fetch(`${FN}?meta=1&t=${m[1]}`, { cf: { cacheTtl: 60 } })).json() } catch (e) {}
    const html = (await page.text()).replace(/<title>[^<]*<\/title>/, tags(m[1], meta))
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } })
  },
}

function tags(token, d) {
  const what = d.count === 1 && d.names && d.names[0] ? d.names[0] : d.count > 1 ? `${d.count} files` : 'files'
  const kind = d.kind === 'video' ? (d.count > 1 ? 'videos' : 'a video') : d.kind === 'image' ? (d.count > 1 ? 'pictures' : 'a picture') : d.count > 1 ? 'files' : 'a file'
  const until = d.expires ? new Date(d.expires).toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Athens' }) : ''
  let title, desc
  if (d.gone || !d.count) {
    title = 'This transfer has expired'
    desc = 'Files on RoarTransfer are kept 1 to 7 days. Ask for it to be sent again.'
  } else if (d.locked) {
    title = `${d.from || 'Someone'} sent you ${kind}`
    desc = [`${d.count} ${d.count === 1 ? 'file' : 'files'}`, size(d.size), until && `until ${until}`, 'protected with a password'].filter(Boolean).join(' · ')
  } else {
    title = d.title || what
    desc = [d.from ? `${d.from} sent you ${d.title ? what : kind}` : `Sent with RoarTransfer: ${d.title ? what : kind}`, size(d.size), until && `download until ${until}`].filter(Boolean).join(' · ')
  }
  const img = d.cover ? `${SITE}/og/${token}.jpg` : `${SITE}/og.jpg`
  const link = `${SITE}/${token}`
  return [
    `<title>${esc(title)} · RoarTransfer</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="RoarTransfer">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${link}">`,
    `<meta property="og:image" content="${img}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(title)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${img}">`,
  ].join('\n')
}
const size = (n) => (!n ? '' : n > 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB')
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
