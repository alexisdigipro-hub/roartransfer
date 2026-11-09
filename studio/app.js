// RoarTransfer Studio (Alex, 7 Nov 2026): the music cloud, a branch of RoarTransfer. One page, no build step.
// Members sign in with their Roar account (the same session as RoarTransfer on roartransfer.com) and read and write the
// roarstudio_* tables under RLS (supabase/studio.sql in roarme); files go to R2 through the Edge Function roarstudio.
// People without an account open ?s=<token>: everything they see and do goes through that function.
// Routes: #/ projects · #p/<project> · #t/<track>   (with ?s=<token> the same views of one share link)
(function () {
  'use strict'
  var URL_ = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co'
  var KEY = 'sb_publishable_7mQ3e0NH5lCmdoIKx2-FUA_EgCoXx9X'
  var FN = URL_ + '/functions/v1/roarstudio'
  var PART = 16 * 1024 * 1024
  var TARGET = -14 // level matching plays every version at -14 LUFS
  var sb = window.supabase.createClient(URL_, KEY, { auth: { storageKey: 'roarme-auth-2', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })

  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var store = { get: function (k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set: function (k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }

  // ---- the theme (Alex, 7 Nov): Dark, Light or System, kept on this device ----
  function wearTheme() {
    var t = store.get('rs-theme') || 'dark'
    var light = t === 'light' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches)
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark')
    var mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = light ? '#ebe8f3' : '#0d0b14'
  }
  wearTheme()
  // the picture behind everything (Alex, 7 Nov: new high-tech backgrounds, Nano Banana, at 25%), chosen in Settings, kept per device
  var BGS = [{ id: 'waves', name: 'Waves' }, { id: 'city', name: 'Spectrum' }, { id: 'fibre', name: 'Fibre' }, { id: 'studio', name: 'Studio' }, { id: 'desk', name: 'Desk' }, { id: 'none', name: 'None' }]
  function wearBg() {
    var b = store.get('rs-bg') || 'waves'
    document.documentElement.style.setProperty('--bgimg', b === 'none' ? 'none' : "url('" + (b === 'desk' ? 'bg.webp' : 'bg-' + b + '.webp') + "')")
  }
  wearBg()
  if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', wearTheme)

  // ---- line icons ----
  var P = {
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', down: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    share: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.3 3.2-5 6-5s5.2 1.7 6 5M16 5.5a3 3 0 0 1 0 5.6M18 14c1.6.6 2.6 2.2 3 4.5"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>', pen: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', back: '<path d="M15 5l-7 7 7 7"/>',
    dots: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
    reply: '<path d="M10 8L5 12l5 4M5 12h9a5 5 0 0 1 5 5v1"/>', out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>', copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    cam: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.4"/>',
    fprev: '<path d="M15 6l-6 6 6 6"/><path d="M7 6v12"/>', fnext: '<path d="M9 6l6 6-6 6"/><path d="M17 6v12"/>',
    mask: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M3 15h18"/>', split: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 3v18"/>',
    arrow: '<path d="M5 19L19 5M10 5h9v9"/>', circle: '<circle cx="12" cy="12" r="7.5"/>', undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>', mark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3"/>', range: '<path d="M4 7v10M20 7v10M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    stems: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="15" cy="12" r="1.6" fill="currentColor"/><circle cx="11" cy="17" r="1.6" fill="currentColor"/>', wave: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>', loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M8 10.5h5M10.5 8v5"/>', pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    chev: '<path d="M6 9l6 6 6-6"/>', scope: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M6 15c2-6 4-6 6 0s4 6 6 0"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4-2.5z" fill="currentColor"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9.2 9.8h.01M14.8 9.8h.01"/>',
    chart: '<path d="M5 19.5V11M10 19.5V5M15 19.5v-6M20 19.5V8.5M3.5 19.5h17"/>',
    star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    zin: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5"/>', zout: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5h5"/>',
    big: '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
    small: '<rect x="4" y="4" width="4" height="4" rx="1"/><rect x="10" y="4" width="4" height="4" rx="1"/><rect x="16" y="4" width="4" height="4" rx="1"/><rect x="4" y="10" width="4" height="4" rx="1"/><rect x="10" y="10" width="4" height="4" rx="1"/><rect x="16" y="10" width="4" height="4" rx="1"/><rect x="4" y="16" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/><rect x="16" y="16" width="4" height="4" rx="1"/>',
    rows: '<rect x="4" y="5" width="4" height="4" rx="1"/><path d="M11 7h9"/><rect x="4" y="15" width="4" height="4" rx="1"/><path d="M11 17h9"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2.2 2.2 0 0 0 4 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6"/>',
    disk: '<ellipse cx="12" cy="6.5" rx="7.5" ry="2.8"/><path d="M4.5 6.5v11c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-11M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    list: '<path d="M4 6.5h11M4 11.5h11M4 16.5h7M17 14v6M14 17h6"/>',
    fplus: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2zM12 10.5v5M9.5 13h5"/>',
    file: '<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5M12.75 11v6M9.75 14h6"/>',
    rot: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
    loop: '<path d="M17 4l3 3-3 3M4 11V9.5A2.5 2.5 0 0 1 6.5 7H20M7 20l-3-3 3-3M20 13v1.5a2.5 2.5 0 0 1-2.5 2.5H4"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    pip: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><rect x="12" y="12" width="6" height="4.5" rx="1" fill="currentColor"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    pad: '<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14.5a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19.5V5A1.5 1.5 0 0 1 7 3.5zM9 8h6M9 12h6M9 16h4"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    up2: '<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/>', dn2: '<path d="M12 5v13M6.5 12.5L12 18l5.5-5.5"/>',
    prev: '<path d="M7 5v14M18 5.5l-9 6.5 9 6.5z" fill="currentColor"/>', nextt: '<path d="M17 5v14M6 5.5l9 6.5-9 6.5z" fill="currentColor"/>'
  }
  var ic = function (n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>' }

  // ---- little helpers ----
  function mmss(s) { if (!isFinite(s) || s < 0) s = 0; var m = Math.floor(s / 60), x = Math.floor(s % 60); return m + ':' + (x < 10 ? '0' : '') + x }
  function size(b) { b = Number(b) || 0; return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB' }
  function ago(t) { var s = (Date.now() - new Date(t)) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : s < 604800 ? Math.floor(s / 86400) + ' d ago' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  function hue(id) { var h = 0; id = String(id || ''); for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h }
  function initials(n) { n = String(n || '?').trim(); var p = n.split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase() }
  function avatar(name, url, id) { return '<span class="av" style="' + (url ? "background-image:url('" + esc(url) + "')" : 'background:hsl(' + hue(id || name) + ',55%,42%)') + '">' + (url ? '' : esc(initials(name))) + '</span>' }
  function lufsText(v) { return v == null ? '' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' LUFS' }
  function toast(t) { var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove() }, 2800) }
  // picture addresses from the database go into the page only from our own storage or as inline pictures (security check, 8 Nov)
  function cssu(u) { u = String(u || ''); return /^(https:\/\/bzmjhbnwhdwmncxkqkdl\.supabase\.co\/storage\/v1\/object\/public\/|data:image\/(jpeg|png|webp);base64,|blob:https:\/\/roartransfer\.com\/)/.test(u) ? u.replace(/["'()\\\s<>]/g, function (c) { return encodeURIComponent(c) }) : '' }
  function coverStyle(id) { var h = hue(id); return 'background:radial-gradient(120% 90% at 80% 10%,hsl(' + ((h + 40) % 360) + ',70%,45%) 0%,transparent 55%),linear-gradient(160deg,hsl(' + h + ',55%,22%),hsl(' + ((h + 320) % 360) + ',70%,30%))' }
  function lens(g) { var on = $('button.on', g), l = $('.lens', g); if (on && l) { l.style.left = on.offsetLeft + 'px'; l.style.width = on.offsetWidth + 'px' } }

  // ---- the shared window ----
  function modal(html, onReady) {
    close()
    var m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="sheet-card" role="dialog" aria-modal="true">' + html + '</div>'
    m.addEventListener('mousedown', function (e) { if (e.target === m) close() })
    $('#layer').appendChild(m)
    $$('[data-x]', m).forEach(function (b) { b.onclick = close })
    if (onReady) onReady($('.sheet-card', m))
    var f = $('input, textarea', m); if (f) setTimeout(function () { f.focus() }, 50)
    return m
  }
  function close() { $('#layer').innerHTML = ''; if (typeof pvAudio !== 'undefined' && pvAudio) { pvAudio.pause(); pvAudio = null } }
  function confirmBox(title, text, yes, fn) {
    modal('<div class="spread"><h2>' + esc(title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><p class="muted" style="margin:0">' + esc(text) + '</p><div class="row end"><button class="btn" data-x>Cancel</button><button class="btn main" id="cf-yes">' + esc(yes) + '</button></div>', function (c) {
      $('#cf-yes', c).onclick = function () { this.disabled = true; Promise.resolve(fn()).then(close, close) }
    })
  }
  function prompt1(title, label, value, yes, fn) {
    modal('<div class="spread"><h2>' + esc(title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><form id="p1" style="display:grid;gap:14px"><div class="field"><label for="p1-v">' + esc(label) + '</label><input class="in" id="p1-v" maxlength="200" value="' + esc(value || '') + '"></div><div class="row end"><button type="button" class="btn" data-x>Cancel</button><button class="btn main">' + esc(yes) + '</button></div></form>', function (c) {
      $('#p1', c).onsubmit = function (e) { e.preventDefault(); var v = $('#p1-v', c).value.trim(); if (!v) return; Promise.resolve(fn(v)).then(close) }
    })
  }

  // ---- the function, as the member or as the share link ----
  var session = null, me = null, share = null // share: { token, password, data }
  function copyText(t, ok) {
    var done = false
    try { var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, t.length); done = document.execCommand('copy'); ta.remove() } catch (e) {}
    if (done) { toast(ok || 'Copied'); return }
    var p = navigator.clipboard && navigator.clipboard.writeText(t)
    if (p) p.then(function () { toast(ok || 'Copied') }, function () { toast('Could not copy: select the link and copy it') }); else toast('Could not copy: select the link and copy it')
  }
  function api(action, body) {
    body = Object.assign({ action: action }, body || {})
    var h = { apikey: KEY, 'Content-Type': 'application/json' }
    if (share && /^share-/.test(action) && action !== 'share-create') { body.token = share.token; body.password = share.password; if (!body.name) body.name = store.get('rs-guest') || '' }
    else if (session) h.Authorization = 'Bearer ' + session.access_token
    return fetch(FN, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) {
      return r.json().catch(function () { return { error: 'Error ' + r.status } }).then(function (d) { if (!r.ok && !d.error) d.error = 'Error ' + r.status; d._status = r.status; return d })
    })
  }

  // ---- what a file is: sound, picture in motion, or a still ----
  function kindOf(v) {
    var m = String((v && v.mime) || ''), n = String((v && (v.file_name || v.name)) || '').toLowerCase()
    if (/^application\/x-suno/.test(m)) return 'suno'
    if (/^video\//.test(m) || /\.(mp4|mov|m4v|webm|mkv|avi|mxf)$/.test(n)) return 'video'
    if (/^image\//.test(m) || /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|avif|psd|svg)$/.test(n)) return 'image'
    // sound the browser can play; MIDI, PDFs, sessions and everything else are kept and downloaded as files
    if (/\.(midi?|kar)$/.test(n) || /midi/.test(m)) return 'file'
    if (/^audio\//.test(m) || /\.(wav|wave|aif|aiff|aifc|flac|mp3|m4a|aac|ogg|oga|opus|wma|caf|alac|w64|bwf)$/.test(n)) return 'audio'
    return 'file'
  }
  var KIND_WORD = { audio: 'Audio', video: 'Video', image: 'Picture', file: 'File', suno: 'Suno' }
  // a song from Suno (Alex, 9 Nov): a link, played in Suno's own player (roarstudio-import)
  function sunoOf(v) { return (String((v && v.mime) || '').match(/id=([0-9a-f-]{36})/) || [])[1] || '' }
  function addSuno(project, track, folder, then) {
    prompt1(track ? 'A new version from Suno' : 'Add a song from Suno', 'Paste the song’s link from Suno (Share, Copy link). The song must be public on Suno; it plays here in Suno’s player.', '', 'Add', function (url) {
      var h = { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }
      return fetch(URL_ + '/functions/v1/roarstudio-import', { method: 'POST', headers: h, body: JSON.stringify({ action: 'suno', project: project, track: track || null, folder: folder || null, url: url }) })
        .then(function (r) { return r.json() }).then(function (d) { if (d.error) throw new Error(d.error); toast('“' + (d.title || 'Suno song') + '” added'); if (then) then(d) })
        .catch(function (e) { toast(e.message); return new Promise(function () {}) })
    })
  }
  function fileType(v) { var e = (String((v && (v.file_name || v.name)) || '').split('.').pop() || '').toLowerCase(); return /^(mid|midi|kar)$/.test(e) ? 'MIDI file' : e && e.length <= 6 ? e.toUpperCase() + ' file' : 'File' }
  function hideV() { var st = share ? share.data && share.data.studio : null; return !!(st && st.hide_versions) }
  function vname(v) {
    if (!v) return ''
    if (hideV()) return v.label || new Date(v.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return 'v' + v.n + (v.label ? ' · ' + v.label : '')
  }

  // ---- the player: an audio element with a gain for level matching, a video element for pictures in motion ----
  var audEl = new Audio(); audEl.preload = 'auto'; audEl.crossOrigin = 'anonymous'
  var vidEl = document.createElement('video'); vidEl.preload = 'metadata'; vidEl.crossOrigin = 'anonymous'; vidEl.playsInline = true; vidEl.setAttribute('playsinline', ''); vidEl.className = 'vid'
  var audio = audEl // whichever is playing now
  // the screen redraws 60 times a second only while something plays; paused, 4 times a second is plenty (Alex, 8 Nov: faster)
  function frameLater(fn) { if (audio.paused) setTimeout(fn, 250); else requestAnimationFrame(fn) }
  // a file whose copy in the cloud is gone (Alex, 8 Nov: a cleanup job deleted the Studio's files): say so plainly
  ;[audEl, vidEl].forEach(function (el) { el.addEventListener('error', function () { if (el.src && /r2\.cloudflarestorage/.test(el.src) && el.error && el.error.code !== 1) fileLost() }) })
  // the file's copy in the cloud is gone (the 8 Nov cleanup bug): a clear panel on the player with Upload again (Alex, 8 Nov)
  function fileLost() {
    var box = $('#media'); if (!box || $('.lost', box)) return
    var up = $('#nvf'), d = document.createElement('div'); d.className = 'lost'
    d.innerHTML = '<b>This file is no longer in storage</b><span>It was lost on 8 November in a storage cleanup that has been fixed. Upload the same file again and its notes stay.</span>' + (up ? '<button class="btn main" type="button">' + ic('up') + ' Upload again</button>' : '<span>Ask the owner to upload it again.</span>')
    box.hidden = false; box.appendChild(d)
    var b = $('button', d); if (b) b.onclick = function () { up.click() }
  }
  var anNode = null
  var actx = null, gainNode = null, matched = store.get('rs-match') !== '0'
  var cur = { version: null, url: '', gain: 1 }
  function ensureGraph() {
    if (actx || !(window.AudioContext || window.webkitAudioContext)) return
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); var src = actx.createMediaElementSource(audEl); gainNode = actx.createGain(); src.connect(gainNode).connect(actx.destination); anNode = actx.createAnalyser(); anNode.fftSize = 8192; anNode.smoothingTimeConstant = 0.72; anNode.minDecibels = -100; anNode.maxDecibels = -10; src.connect(anNode) } catch (e) { actx = null; gainNode = null }
  }
  function applyGain() {
    var v = cur.version, g = 1
    if (matched && v && v.lufs != null) g = Math.pow(10, Math.max(-24, Math.min(12, TARGET - v.lufs)) / 20)
    cur.gain = g
    if (audio === audEl && gainNode) { gainNode.gain.value = g; audEl.volume = 1 } else audio.volume = Math.min(1, g)
  }
  var urlCache = {}
  function urlFor(v) {
    var c = urlCache[v.id]; if (c && c.until > Date.now()) return Promise.resolve(c.url)
    return (share ? api('share-url', { version: v.id }) : api('url', { version: v.id })).then(function (d) {
      if (!d.url) throw new Error(d.error || 'no url')
      urlCache[v.id] = { url: d.url, until: Date.now() + 5 * 3600e3 }; return d.url
    })
  }
  function load(v, keepTime, autoplay) {
    var t = keepTime ? audio.currentTime : 0, was = !audio.paused
    var el = kindOf(v) === 'video' ? vidEl : audEl
    if (el !== audio) { audio.pause(); audio = el; cur.url = '' }
    cur.version = v; applyGain()
    var tk = ctx && ctx.tracks ? ctx.tracks.filter(function (t) { return t.id === v.track_id })[0] : null
    cur.meta = { title: tk ? tk.title : v.file_name, project: ctx && ctx.project ? ctx.project.title : '', cover: v.thumb || (ctx && ctx.project && ctx.project.cover) || null, track: v.track_id, coverStyle: ctx && ctx.project ? coverAttr(ctx.project) : '', shareToken: share ? share.token : null }
    if (kindOf(v) === 'image' || kindOf(v) === 'file' || kindOf(v) === 'suno') { audio.pause(); return Promise.resolve() }
    return urlFor(v).then(function (u) {
      if (cur.version !== v) return
      if (cur.url !== u) { cur.url = u; audio.src = u; audio.load() }
      var go = function () { try { audio.currentTime = Math.min(t, (v.duration || audio.duration || t)) } catch (e) {} if (autoplay || (keepTime && was)) play() }
      if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true })
    })
  }
  function play() { if (audio === audEl) { ensureGraph(); if (actx && actx.state === 'suspended') actx.resume() } applyGain(); var p = audio.play(); if (p && p.catch) p.catch(function () {}) }
  function download(v) {
    if (kindOf(v) === 'suno') { window.open('https://suno.com/song/' + sunoOf(v), '_blank', 'noopener'); return }
    (share ? api('share-url', { version: v.id, download: true }) : api('url', { version: v.id, download: true })).then(function (d) {
      if (!d.url) { toast(d.error || 'Could not download'); return }
      var a = document.createElement('a'); a.href = d.url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove()
    })
  }

  // ---- routing ----
  var qs = new URLSearchParams(location.search)
  var shareToken = qs.get('s')
  function route() {
    if (location.hash === '#settings') return { kind: 'settings' }
    if (location.hash === '#storage') return { kind: 'storage' }
    if (location.hash === '#admin') return { kind: 'admin' }
    var m = location.hash.match(/^#([ptfdl])\/([0-9a-f-]{36})/); return m ? { kind: m[1], id: m[2] } : { kind: 'home' }
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h }
  window.addEventListener('hashchange', function () { render() })
  $('#home').onclick = function () { go(share ? '#/' : '#/') }

  var live = null // realtime channel of the open project
  function unlisten() { if (live) { sb.removeChannel(live); live = null } }

  // ===== Search everything (Alex, 8 Nov, from Frame.io): projects, files and notes in every project you are in =====
  function searchBox() {
    if (!session || $('#sr-q')) return
    var m = modal('<div class="srbox"><div class="srin"><span class="sri">' + ic('loupe') + '</span><input class="in" id="sr-q" placeholder="Search projects, files and notes" autocomplete="off" spellcheck="false"><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="srres" id="sr-r"><p class="muted srhint">Type at least two letters. Notes jump to their exact moment.</p></div></div>')
    var card = $('.sheet-card', m); card.classList.add('wide', 'srcard')
    var q = $('#sr-q', m), box = $('#sr-r', m), seq = 0, tmr = null
    setTimeout(function () { q.focus() }, 30)
    var mark = function (t, w) { var i = String(t || '').toLowerCase().indexOf(w.toLowerCase()); if (i < 0) return esc(t); return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + w.length)) + '</mark>' + esc(t.slice(i + w.length)) }
    var cut = function (t, w) { t = String(t || ''); var i = t.toLowerCase().indexOf(w.toLowerCase()); if (i > 60) t = '…' + t.slice(i - 40); return t.slice(0, 160) }
    var run = function () {
      var w = q.value.trim(), my = ++seq
      if (w.length < 2) { box.innerHTML = '<p class="muted srhint">Type at least two letters. Notes jump to their exact moment.</p>'; return }
      var like = '%' + w.replace(/[%_\\]/g, function (c) { return '\\' + c }) + '%', safe = w.replace(/[,()%*]/g, ' ')
      box.innerHTML = '<div class="spin"></div>'
      Promise.all([
        sb.from('roarstudio_projects').select('id, title, artist, cover').or('title.ilike.*' + safe + '*,artist.ilike.*' + safe + '*').limit(8),
        sb.from('roarstudio_tracks').select('id, title, project_id').ilike('title', like).limit(15),
        sb.from('roarstudio_versions').select('id, track_id, project_id, file_name, n, label, mime').ilike('file_name', like).limit(15),
        sb.from('roarstudio_comments').select('id, body, at_sec, version_id, project_id, guest_name, author').ilike('body', like).order('created_at', { ascending: false }).limit(20),
        sb.from('roarstudio_projects').select('id, title')
      ]).then(function (r) {
        if (my !== seq) return
        var pt = {}; (r[4].data || []).forEach(function (p) { pt[p.id] = p.title })
        var vids = (r[3].data || []).map(function (c) { return c.version_id })
        return (vids.length ? sb.from('roarstudio_versions').select('id, track_id, n, mime').in('id', vids) : Promise.resolve({ data: [] })).then(function (vv) {
          var tids = (vv.data || []).map(function (v) { return v.track_id }).concat((r[2].data || []).map(function (v) { return v.track_id }))
          return (tids.length ? sb.from('roarstudio_tracks').select('id, title').in('id', tids) : Promise.resolve({ data: [] })).then(function (tt) {
            if (my !== seq) return
            var tn = {}; (tt.data || []).forEach(function (t) { tn[t.id] = t.title })
            var vt = {}; (vv.data || []).forEach(function (v) { vt[v.id] = v })
            var files = (r[1].data || []).map(function (t) { return { t: t.id, title: t.title, sub: pt[t.project_id] || '' } })
            ;(r[2].data || []).forEach(function (v) { if (!files.some(function (f) { return f.t === v.track_id })) files.push({ t: v.track_id, title: tn[v.track_id] || v.file_name, sub: (pt[v.project_id] || '') + ' · ' + v.file_name }) })
            var html = ''
            if ((r[0].data || []).length) html += '<h3>Projects</h3>' + r[0].data.map(function (p) { return '<button class="srrow" data-sp="' + p.id + '"><span class="ico sm">' + ic('folder') + '</span><span class="nm"><b>' + mark(p.title, w) + '</b><small>' + mark(p.artist || '', w) + '</small></span></button>' }).join('')
            if (files.length) html += '<h3>Files</h3>' + files.slice(0, 15).map(function (f) { return '<button class="srrow" data-st="' + f.t + '"><span class="ico sm">' + ic('music') + '</span><span class="nm"><b>' + mark(f.title, w) + '</b><small>' + mark(f.sub, w) + '</small></span></button>' }).join('')
            var notes = (r[3].data || []).filter(function (c) { return vt[c.version_id] })
            if (notes.length) html += '<h3>Notes</h3>' + notes.map(function (c) { var v = vt[c.version_id]; return '<button class="srrow" data-sn="' + c.id + '" data-tk="' + v.track_id + '"><span class="ico sm">' + ic('reply') + '</span><span class="nm"><b>' + mark(cut(c.body, w), w) + '</b><small>' + esc((tn[v.track_id] || '') + ' · v' + v.n + (c.at_sec != null ? ' · ' + mmss(c.at_sec) : '') + ' · ' + (pt[c.project_id] || '')) + '</small></span></button>' }).join('')
            box.innerHTML = html || '<p class="muted srhint">Nothing found for “' + esc(w) + '”.</p>'
            $$('[data-sp]', box).forEach(function (b) { b.onclick = function () { m.remove(); go('#p/' + b.dataset.sp) } })
            $$('[data-st]', box).forEach(function (b) { b.onclick = function () { m.remove(); go('#t/' + b.dataset.st) } })
            $$('[data-sn]', box).forEach(function (b) { b.onclick = function () { m.remove(); pendingNote = b.dataset.sn; go('#t/' + b.dataset.tk) } })
          })
        })
      }).catch(function (e) { box.innerHTML = '<p class="muted srhint">' + esc(e.message) + '</p>' })
    }
    q.oninput = function () { clearTimeout(tmr); tmr = setTimeout(run, 220) }
    q.onkeydown = function (e) { if (e.key === 'Enter') { var f = $('.srrow', box); if (f) f.click() } }
  }
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (!typing && e.key === '/')) { if (session && !share) { e.preventDefault(); searchBox() } }
  })
  function langBtn() { var el = window.RSLang && RSLang.lang === 'el'; return '<button class="langb" id="langb" data-notr title="' + (el ? 'Switch to English' : 'Ελληνικά') + '">' + (el ? 'EN' : 'ΕΛ') + '</button>' }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#langb'); if (b && window.RSLang) RSLang.set(RSLang.lang === 'el' ? 'en' : 'el') })
  function paintMe() {
    var b = $('#me-btn'); if (!b || !session) return
    var name = (me && me.name) || (session.user.email || '').split('@')[0]
    b.style.cssText = me && me.avatar ? "background-image:url('" + String(me.avatar).replace(/'/g, '%27') + "')" : 'background:hsl(' + hue(session.user.id) + ',55%,40%)'
    b.textContent = me && me.avatar ? '' : initials(name)
  }
  // a new picture for the Roar Account, from the Studio: it changes in every Roar app (roar-avatars/<id>/…, roar_profiles.avatar_url)
  function changePhoto() {
    cropBox({ title: 'Your picture', w: 400, h: 400, current: me && me.avatar, onDone: function (url) {
      return fetch(url).then(function (r) { return r.blob() }).then(function (blob) {
        var path = session.user.id + '/studio-' + Date.now() + '.jpg'
        return sb.storage.from('roar-avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false }).then(function (u) {
          if (u.error) throw new Error(u.error.message)
          var pub = sb.storage.from('roar-avatars').getPublicUrl(path).data.publicUrl
          return sb.from('roar_profiles').update({ avatar_url: pub }).eq('id', session.user.id).then(function (q) {
            if (q.error) throw new Error(q.error.message)
            me.avatar = pub; paintMe(); toast('Picture saved')
          })
        })
      }).catch(function (e) { toast(e.message) })
    } })
  }
  function setTop(crumbs) {
    $('#crumbs').innerHTML = (crumbs || []).map(function (c, i) { return '<span class="sep">/</span><span>' + esc(c) + '</span>' }).join('')
    var r = $('#right')
    if (share) {
      var st = share.data && share.data.studio
      r.innerHTML = langBtn() + (st && (st.logo || st.name) ? '<span class="brand" data-notr>' + (st.logo ? '<img src="' + esc(cssu(st.logo)) + '" alt="">' : '') + (st.name ? '<b>' + esc(st.name) + '</b>' : '') + '</span>' : (session ? '' : '<a class="btn sm" href="./">Sign in</a>'))
      return
    }
    if (!session) { r.innerHTML = langBtn() + '<a class="btn sm rtlink about" href="https://themadlions.com/lab/roarstudio/" target="_blank" rel="noopener" title="About RoarTransfer Studio">' + ic('people') + '<span>About</span></a>'; return }
    var name = (me && me.name) || (session.user.email || '').split('@')[0]
    r.innerHTML = langBtn() + '<a class="btn sm rtlink about" href="https://themadlions.com/lab/roarstudio/" target="_blank" rel="noopener" title="About RoarTransfer Studio">' + ic('people') + '<span>About</span></a>' + '<a class="btn sm rtlink" href="../" title="Send files with RoarTransfer">' + ic('out') + '<span>RoarTransfer</span></a><button class="ico srch" id="srch-b" aria-label="Search" title="Search everything (/)">' + ic('loupe') + '</button><button class="ico bell" id="bell" aria-label="Notifications">' + ic('bell') + '<b id="bell-n" hidden></b></button><button class="me" id="me-btn" aria-label="Account" style="' + (me && me.avatar ? "background-image:url('" + esc(me.avatar) + "')" : 'background:hsl(' + hue(session.user.id) + ',55%,40%)') + '">' + (me && me.avatar ? '' : esc(initials(name))) + '</button>'
    $('#me-btn').onclick = function (e) {
      e.stopPropagation()
      var old = $('.menu'); if (old) { old.remove(); return }
      var m = document.createElement('div'); m.className = 'menu'
      var br = this.getBoundingClientRect(); m.style.position = 'fixed'; m.style.top = Math.round(br.bottom + 8) + 'px'; m.style.right = Math.max(8, Math.round(window.innerWidth - br.right)) + 'px'; m.style.left = 'auto'
      m.innerHTML = '<div class="who">' + esc(session.user.email || '') + '</div><button id="mn-pic">' + ic('image') + ' Change picture</button><button id="mn-set">' + ic('gear') + ' Settings</button><button id="mn-sto">' + ic('disk') + ' Storage</button>' + (me && me.admin ? '<button id="mn-adm">' + ic('gear') + ' Admin</button>' : '') + '<button id="mn-acc">' + ic('people') + ' My Roar account</button><button id="mn-rt">' + ic('out') + ' Open RoarTransfer</button><button id="mn-about" class="mn-about">' + ic('people') + ' About</button><button id="mn-out">' + ic('back') + ' Sign out</button>'
      document.body.appendChild(m)
      $('#mn-set').onclick = function () { m.remove(); go('#settings') }
      $('#mn-pic').onclick = function () { m.remove(); changePhoto() }
      $('#mn-about').onclick = function () { m.remove(); window.open('https://themadlions.com/lab/roarstudio/', '_blank', 'noopener') }
      $('#mn-sto').onclick = function () { m.remove(); go('#storage') }
      if ($('#mn-adm')) $('#mn-adm').onclick = function () { m.remove(); go('#admin') }
      $('#mn-acc').onclick = function () { m.remove(); window.open('https://themadlions.com/account/', '_blank') }
      $('#mn-rt').onclick = function () { location.href = '../' }
      $('#mn-out').onclick = function () { m.remove(); sb.auth.signOut() }
      setTimeout(function () { document.addEventListener('click', function f() { m.remove(); document.removeEventListener('click', f) }) })
    }
    $('#bell').onclick = function () { activityPanel() }
    $('#srch-b').onclick = searchBox
    bellCount()
  }

  function render() {
    var view = $('#view')
    if (vidEl.parentNode && !vidEl.paused) { var mv = $('#mini-v'); if (mv) mv.appendChild(vidEl) }
    view.classList.remove('enter', 'lux'); void view.offsetWidth; view.classList.add('enter')
    unlisten(); close()
    if (share) return renderShare()
    if (!session) { setTop([]); return renderSignedOut(view) }
    var r = route()
    if (r.kind === 'p') return renderProject(r.id)
    if (r.kind === 't') return renderTrack(r.id)
    if (r.kind === 'f') return renderFinals(r.id)
    if (r.kind === 'd') return renderFolder(r.id)
    if (r.kind === 'l') return renderPlaylist(r.id)
    if (r.kind === 'settings') return renderSettings()
    if (r.kind === 'storage') return renderStorage()
    if (r.kind === 'admin') return renderAdmin()
    return renderProjects()
  }

  // =====================================================================================================
  // signed out: what it is, and the sign-in (Roar Account first, email below, as RoarTransfer)
  // =====================================================================================================
  function renderSignedOut(view) {
    view.innerHTML = '<section class="hello">' +
      '<div><h1>Review and <em>deliver</em> audio, video and pictures.</h1>' +
      '<p>Upload every version, get notes on the exact second or frame, have it approved, and send the client one beautiful Finals folder with the files, the credits and your brand.</p>' +
      '<ul><li>Versions, notes and approvals for audio, video and pictures</li><li>Level matching for mixes, frame-accurate notes for picture</li><li>Finals: one branded link, Download all as .zip, credits and lyrics</li><li>Playlists, folders, people with roles</li><li>Stored safely, with your Roar account</li></ul></div>' +
      '<form class="card glass" id="in" novalidate>' +
      '<div id="in-main" style="display:grid;gap:14px"><h2 id="in-h">Sign in</h2>' +
      '<button type="button" class="btn main" id="rc-go" style="height:46px">Sign in with Roar Account</button>' +
      '<div class="or">or with email</div>' +
      '<div class="field" id="nm-f" hidden><label for="nm">Your name</label><input class="in" id="nm" autocomplete="name"></div>' +
      '<div class="field"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="email" required></div>' +
      '<div class="field"><label for="pw">Password</label><input class="in" id="pw" type="password" autocomplete="current-password" required></div>' +
      '<p class="err" id="in-err" hidden></p><p class="ok" id="in-ok" hidden></p>' +
      '<button class="btn" id="in-go" style="height:46px">Sign in</button>' +
      '<div class="row" style="justify-content:space-between"><button type="button" class="btn sm" id="in-sw">Create an account</button><button type="button" class="btn sm" id="in-forgot">Forgot password</button></div></div>' +
      '<div id="rc-wait" hidden style="display:grid;gap:12px"><h2>Allow it on your Roar account</h2><p class="muted" style="margin:0">A tab opened on themadlions.com. Check the code is the same there and press Allow.</p><div class="code" id="rc-code">······</div><p class="err" id="rc-err" hidden></p><div class="row"><button type="button" class="btn" id="rc-again">Open the page again</button><button type="button" class="btn" id="rc-x">Cancel</button></div></div>' +
      '<div id="mfa" hidden style="display:grid;gap:12px"><h2>Two-step verification</h2><p class="muted" style="margin:0">Type the 6-digit code from your authenticator app.</p><input class="in mono" id="mfa-c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="text-align:center;letter-spacing:.3em;font-size:20px"><p class="err" id="mfa-err" hidden></p><div class="row"><button class="btn main" id="mfa-go">Verify</button><button type="button" class="btn" id="mfa-x">Cancel</button></div></div>' +
      '</form></section>'
    var up = false, form = $('#in')
    var err = function (t) { var e = $('#in-err'); e.textContent = t; e.hidden = !t; $('#in-ok').hidden = true }
    var paint = function () { $('#in-h').textContent = up ? 'Create your Roar account' : 'Sign in'; $('#in-go').textContent = up ? 'Create account' : 'Sign in'; $('#in-sw').textContent = up ? 'I have an account' : 'Create an account'; $('#nm-f').hidden = !up; $('#in-forgot').hidden = up; $('#pw').autocomplete = up ? 'new-password' : 'current-password' }
    var mode = function (w) { $('#in-main').hidden = !!w; $('#rc-wait').hidden = w !== 'wait'; $('#mfa').hidden = w !== 'mfa' }
    $('#in-sw').onclick = function () { up = !up; err(''); paint() }
    var authFn = function (b) { return fetch(URL_ + '/functions/v1/roartransfer-auth', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json().catch(function () { return { error: 'Error ' + r.status } }) }) }
    $('#in-forgot').onclick = function () {
      var email = $('#em').value.trim()
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { err('Type your email first, then press Forgot password.'); $('#em').focus(); return }
      authFn({ action: 'reset', email: email }).then(function (d) { if (d.ok) { err(''); var o = $('#in-ok'); o.textContent = 'We sent you an email to set a new password.'; o.hidden = false } else err(d.error === 'wait' ? 'Wait a minute and try again.' : 'Could not reach the server. Check your connection.') })
    }
    form.onsubmit = function (e) {
      e.preventDefault()
      if (!$('#mfa').hidden) return mfaVerify()
      var email = $('#em').value.trim(), pass = $('#pw').value
      if (!email || !pass) { err('Type your email and password.'); return }
      if (up && pass.length < 6) { err('The password needs at least 6 characters.'); return }
      $('#in-go').disabled = true; err('')
      var p = up
        ? authFn({ action: 'signup', email: email, password: pass, name: $('#nm').value }).then(function (d) {
            if (!d.ok) throw new Error(d.error === 'taken' ? 'This email already has an account. Sign in instead.' : d.error === 'wait' ? 'Wait a minute and try again.' : d.error === 'email' ? 'This email does not look right.' : d.error || 'Could not create the account.')
            var o = $('#in-ok'); o.textContent = 'Check your email and press the link to confirm your account, then sign in here.'; o.hidden = false; up = false; paint()
          })
        : sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
            if (r.error) throw new Error(/invalid/i.test(r.error.message) ? 'The email or password is not right.' : /confirm/i.test(r.error.message) ? 'Confirm your email first: press the link we sent you.' : r.error.message)
            return afterIn()
          })
      p.catch(function (x) { err(x.message || 'Could not reach the server. Check your connection.') }).then(function () { $('#in-go').disabled = false })
    }
    // Sign in with Roar Account (roar-connect, as RoarTransfer): a code, Allow on themadlions.com, then this page's session
    var RC = URL_ + '/functions/v1/roar-connect', rc = null
    var rcCall = function (b) { return fetch(RC, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json().catch(function () { return {} }) }) }
    var rcStop = function () { if (rc) { clearTimeout(rc.timer); rc.stopped = true } rc = null }
    $('#rc-go').onclick = function () {
      if (rc) return
      var tw = null; try { tw = window.open('', '_blank') } catch (e) {}
      var me1 = rc = { stopped: false }
      rcCall({ do: 'start', app: 'roartransfer' }).then(function (d) {
        if (me1.stopped) { if (tw) tw.close(); return }
        if (!d || !d.code || !d.url) { if (tw) tw.close(); rcStop(); err(d && d.error ? String(d.error) : 'Could not reach the server.'); return }
        me1.code = d.code; me1.secret = d.secret; me1.url = d.url; me1.until = Date.now() + (d.expires_in || 600) * 1000
        if (tw) { try { tw.location.href = d.url } catch (e) { tw = null } }
        $('#rc-code').textContent = d.code; $('#rc-err').hidden = !!tw; $('#rc-err').textContent = 'Your browser blocked the new tab. Press Open the page again.'
        mode('wait'); me1.timer = setTimeout(poll, 2000)
      })
      function poll() {
        if (me1.stopped) return
        if (Date.now() > me1.until) { rcStop(); mode(); err('The code ran out. Try again.'); return }
        rcCall({ do: 'poll', code: me1.code, secret: me1.secret }).then(function (d) {
          if (me1.stopped) return
          if (d && d.token_hash) { rcStop(); sb.auth.verifyOtp({ type: 'magiclink', token_hash: d.token_hash }).then(function (r) { if (r.error) { mode(); err(r.error.message) } else afterIn() }); return }
          if (d && d.expired) { rcStop(); mode(); err('The code ran out. Try again.'); return }
          me1.timer = setTimeout(poll, 2000)
        }).catch(function () { if (!me1.stopped) me1.timer = setTimeout(poll, 2000) })
      }
    }
    $('#rc-again').onclick = function () { if (rc && rc.url) { var t = null; try { t = window.open(rc.url, '_blank') } catch (e) {} $('#rc-err').hidden = !!t } }
    $('#rc-x').onclick = function () { var c = rc; rcStop(); mode(); if (c && c.code) rcCall({ do: 'deny', code: c.code }) }
    // the session itself comes through onAuthStateChange (onSession), which asks for the 6 digits when the account needs them
    function afterIn() { return Promise.resolve() }
    function mfaVerify() {
      var c = $('#mfa-c').value.replace(/\D/g, ''), e = $('#mfa-err'); e.hidden = true
      if (c.length !== 6) { e.textContent = 'The code has 6 digits.'; e.hidden = false; return }
      sb.auth.mfa.listFactors().then(function (f) {
        var t = ((f.data && f.data.totp) || []).filter(function (x) { return x.status === 'verified' })[0]
        if (!t) { needMfa = false; refreshSession(); return }
        return sb.auth.mfa.challengeAndVerify({ factorId: t.id, code: c }).then(function (r) {
          if (r.error) { e.textContent = 'That code is not right, or it changed. Try the new one.'; e.hidden = false; return }
          needMfa = false; refreshSession()
        })
      })
    }
    $('#mfa-x').onclick = function () { needMfa = false; mode(); sb.auth.signOut() }
    paint()
    if (needMfa) { mode('mfa'); setTimeout(function () { $('#mfa-c').focus() }, 30) }
  }

  // =====================================================================================================
  // projects
  // =====================================================================================================
  // covers saved by the old cropper can carry black bands (Alex, 8 Nov): find the picture inside them, crop it square
  // again and save it back once, so every cover fills its square
  var coverChecked = {}
  function fixCover(pr, then) {
    if (!pr || !pr.cover || coverChecked[pr.id] || !/^data:image\//.test(pr.cover)) return
    coverChecked[pr.id] = true
    var im = new Image()
    im.onload = function () {
      var W = im.naturalWidth, H = im.naturalHeight; if (!W || !H) return
      var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d'); g.drawImage(im, 0, 0)
      var px; try { px = g.getImageData(0, 0, W, H).data } catch (e) { return }
      var dark = function (i) { return px[i] + px[i + 1] + px[i + 2] < 42 }
      var rowDark = function (y) { var n = 0; for (var x = 0; x < W; x += 2) if (dark((y * W + x) * 4)) n++; return n / Math.ceil(W / 2) > 0.985 }
      var colDark = function (x) { var n = 0; for (var y = 0; y < H; y += 2) if (dark((y * W + x) * 4)) n++; return n / Math.ceil(H / 2) > 0.985 }
      var t = 0, b = H - 1, l = 0, r = W - 1
      while (t < H / 2 && rowDark(t)) t++
      while (b > H / 2 && rowDark(b)) b--
      while (l < W / 2 && colDark(l)) l++
      while (r > W / 2 && colDark(r)) r--
      var cw = r - l + 1, ch = b - t + 1
      // letterbox bands are even: top like bottom, left like right; anything else is the photo's own darkness
      if (Math.abs(t - (H - 1 - b)) > H * 0.03 + 2) { t = 0; b = H - 1 }
      if (Math.abs(l - (W - 1 - r)) > W * 0.03 + 2) { l = 0; r = W - 1 }
      cw = r - l + 1; ch = b - t + 1
      if (cw >= W - 4 && ch >= H - 4) return
      if (cw < W * 0.3 || ch < H * 0.3) return
      var side = Math.min(cw, ch), sx = l + (cw - side) / 2, sy = t + (ch - side) / 2
      var o = document.createElement('canvas'); o.width = 800; o.height = 800; o.getContext('2d').drawImage(c, sx, sy, side, side, 0, 0, 800, 800)
      var url = o.toDataURL('image/jpeg', 0.86)
      pr.cover = url
      if (then) then(url)
      if (!share && session) sb.from('roarstudio_projects').update({ cover: url }).eq('id', pr.id).then(function () {})
    }
    im.src = pr.cover
  }
  function renderProjects() {
    setTop([])
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    Promise.all([
      sb.from('roarstudio_projects').select('id, title, artist, owner, cover, updated_at, created_at').order('updated_at', { ascending: false }),
      sb.from('roarstudio_tracks').select('id, project_id'),
      api('usage')
    ]).then(function (r) {
      if (r[0].error) { view.innerHTML = errorBox(r[0].error.message); return }
      var ps = r[0].data || [], counts = {}
      ;(r[1].data || []).forEach(function (t) { counts[t.project_id] = (counts[t.project_id] || 0) + 1 })
      view.innerHTML = '<div class="head"><div><h1>Projects</h1><div class="sub">' + ps.length + ' project' + (ps.length === 1 ? '' : 's') + (r[2] && r[2].bytes ? ' · ' + size(r[2].bytes) + ' stored' : '') + '</div><p class="pdesc">Your workspace for sound, video and pictures: upload every version, collect notes on the exact second or spot, approve, and deliver the finals in one link.</p></div><div class="tools">' + (ps.length ? '<div class="lens-group vmode" id="vmode"><span class="lens"></span><button data-m="big" aria-label="Big tiles" title="Big tiles">' + ic('big') + '</button><button data-m="small" aria-label="Small tiles" title="Small tiles">' + ic('small') + '</button><button data-m="list" aria-label="List" title="List">' + ic('rows') + '</button></div>' : '') + '<button class="btn main" id="np">' + ic('plus') + ' New project</button></div></div>' +
        (ps.length ? '<div class="grid g-' + (store.get('rs-view') || 'big') + '" id="pgrid">' + ps.map(function (p) {
          return '<div class="proj glass" role="button" tabindex="0" data-p="' + p.id + '"><div class="cover" style="' + (p.cover ? "background:#000 url('" + cssu(p.cover) + "') center/cover" : coverStyle(p.id)) + '">' + (p.owner === session.user.id ? '<button class="ico sm danger pdel" data-pdel="' + p.id + '" aria-label="Delete ' + esc(p.title) + '">' + ic('trash') + '</button>' : '') + '</div><div class="pinfo"><b>' + esc(p.title) + '</b><span>' + esc(p.artist || (p.owner === session.user.id ? 'Yours' : 'Shared with you')) + ' · ' + (counts[p.id] || 0) + ' file' + (counts[p.id] === 1 ? '' : 's') + '</span><span class="when">' + ago(p.updated_at) + '</span></div></div>'
        }).join('') + '<button class="proj new-proj" id="np2"><span class="ico">' + ic('plus') + '</span>New project</button></div>'
        : '<div class="empty glass"><span class="ico" style="width:64px;height:64px">' + ic('music') + '</span><h2>Start your first project</h2><p>A project is an album, a single or a film score. Put tracks in it, upload versions, and invite the people you work with.</p><button class="btn main" id="np2">' + ic('plus') + ' New project</button></div>')
      ps.forEach(function (p) { fixCover(p, function (u) { var el = $('[data-p="' + p.id + '"] .cover'); if (el) el.style.background = "#000 url('" + u + "') center/cover" }) })
      $$('[data-p]').forEach(function (b) { b.onclick = function (e) { if (e.target.closest('[data-pdel]')) return; go('#p/' + b.dataset.p) }; b.onkeydown = function (e) { if (e.key === 'Enter') go('#p/' + b.dataset.p) } })
      $$('[data-pdel]').forEach(function (b) { b.onclick = function (e) {
        e.stopPropagation(); var pj = ps.filter(function (x) { return x.id === b.dataset.pdel })[0]
        confirmBox('Delete “' + pj.title + '”?', 'Every file, version and note in it is deleted, and the files leave the cloud. This cannot be undone.', 'Delete', function () { return api('delete-project', { project: pj.id }).then(function (d) { if (d.ok) { toast('Project deleted'); renderProjects() } else toast(d.error) }) })
      } })
      ;['#np', '#np2'].forEach(function (s) { var b = $(s); if (b) b.onclick = newProject })
      var vm = $('#vmode')
      if (vm) {
        var mode = store.get('rs-view') || 'big'
        $$('button', vm).forEach(function (b) { b.classList.toggle('on', b.dataset.m === mode) }); setTimeout(function () { lens(vm) }, 30)
        vm.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; store.set('rs-view', b.dataset.m); $$('button', vm).forEach(function (x) { x.classList.toggle('on', x === b) }); lens(vm); var g = $('#pgrid'); g.className = 'grid g-' + b.dataset.m; g.classList.add('swap'); setTimeout(function () { g.classList.remove('swap') }, 400) }
      }
    })
  }
  function newProject() {
    modal('<div class="spread"><h2>New project</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><form id="npf" style="display:grid;gap:14px"><div class="field"><label for="np-t">Title</label><input class="in" id="np-t" maxlength="120" placeholder="Night Ferry (single)"></div><div class="field"><label for="np-a">Artist</label><input class="in" id="np-a" maxlength="120" placeholder="Who it is for"></div><p class="err" id="np-e" hidden></p><div class="row end"><button type="button" class="btn" data-x>Cancel</button><button class="btn main">Create</button></div></form>', function (c) {
      $('#npf', c).onsubmit = function (e) {
        e.preventDefault()
        var t = $('#np-t', c).value.trim() || 'Untitled'
        sb.from('roarstudio_projects').insert({ owner: session.user.id, title: t, artist: $('#np-a', c).value.trim() }).select('id').single().then(function (r) {
          if (r.error) { var x = $('#np-e', c); x.textContent = r.error.message; x.hidden = false; return }
          close(); go('#p/' + r.data.id)
        })
      }
    })
  }
  function errorBox(m) { return '<div class="empty glass"><h2>Something went wrong</h2><p>' + esc(m) + '</p><button class="btn" onclick="location.reload()">Try again</button></div>' }

  // =====================================================================================================
  // a project: its tracks (members) or the share link's tracks (guests)
  // =====================================================================================================
  var ctx = null // { project, role, tracks, versions, comments, people:{id:{name,avatar}} }
  function loadProject(id) {
    return Promise.all([
      sb.from('roarstudio_projects').select('*').eq('id', id).maybeSingle(),
      sb.from('roarstudio_tracks').select('*').eq('project_id', id).order('position').order('created_at'),
      sb.from('roarstudio_versions').select('*').eq('project_id', id).order('n'),
      sb.from('roarstudio_comments').select('id, version_id, done, parent_id').eq('project_id', id),
      sb.rpc('roarstudio_people', { p: id }),
      sb.rpc('roarstudio_role', { p: id }),
      sb.from('roarstudio_folders').select('*').eq('project_id', id).order('position').order('created_at'),
      sb.from('roarstudio_playlists').select('*').eq('project_id', id).order('created_at'),
      sb.from('roarstudio_picks').select('track_id, user_id, guest_name, created_at').eq('project_id', id)
    ]).then(function (r) {
      if (!r[0].data) throw new Error('This project does not exist, or you are not in it.')
      var people = {}
      ;(r[4].data || []).forEach(function (x) { people[x.user_id] = { name: x.name, avatar: x.avatar, role: x.role, email: x.email } })
      ctx = { project: r[0].data, tracks: r[1].data || [], versions: r[2].data || [], comments: r[3].data || [], people: people, peopleList: r[4].data || [], role: r[5].data || 'listener', folders: r[6].data || [], playlists: r[7].data || [], studio: null, picks: (r[8].data || []).map(function (k) { return { track_id: k.track_id, user_id: k.user_id, by: k.user_id ? (people[k.user_id] ? people[k.user_id].name : 'Member') : (k.guest_name || 'Guest') } }) }
      return sb.from('roarstudio_studios').select('*').eq('owner', r[0].data.owner).maybeSingle().then(function (q) { ctx.studio = q.data || null; return ctx })
    })
  }
  var RANK = ['listener', 'commenter', 'editor', 'owner']
  var canDo = function (need) { return share ? (need === 'commenter' ? share.data.can.comment : need === 'approve' ? share.data.can.approve : need === 'download' ? share.data.can.download : false) : RANK.indexOf(ctx.role) >= RANK.indexOf(need === 'approve' ? 'editor' : need === 'download' ? 'listener' : need) }

  function renderProject(id) {
    curFolder = null
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    var p = share ? Promise.resolve(ctx) : loadProject(id)
    p.then(function (c) { drawProject(c) }).catch(function (e) { setTop([]); view.innerHTML = errorBox(e.message) })
  }
  function latest(trackId) { var vs = ctx.versions.filter(function (v) { return v.track_id === trackId }); return vs[vs.length - 1] }
  var curFolder = null // the folder open in a project, null for its top
  var kindTab = store.get('rs-kind') || 'all' // All / Audio / Video / Pictures in a project
  var KIND_PLURAL = { audio: 'Audio', video: 'Video', image: 'Pictures', file: 'Files', suno: 'Suno' }
  function coverAttr(pr) { return pr.cover ? "background:#000 url('" + cssu(pr.cover) + "') center/cover" : coverStyle(pr.id) }
  // ===== picture tools (Alex, 8 Nov): picks, the watermark on links =====
  var pickOnly = false
  function myPick(tid) { var me = share ? (store.get('rs-guest') || '').toLowerCase() : session && session.user.id; return (ctx.picks || []).some(function (k) { return k.track_id === tid && (share ? !k.user_id && String(k.by).toLowerCase() === me : k.user_id === me) }) }
  function pickCount(tid) { return (ctx.picks || []).filter(function (k) { return k.track_id === tid }).length }
  function pickBy(tid) { return (ctx.picks || []).filter(function (k) { return k.track_id === tid }).map(function (k) { return k.by }) }
  function heartBtn(tid) { var n = pickCount(tid), on = myPick(tid); return '<button class="heart' + (on ? ' on' : '') + '" data-pick="' + tid + '" title="' + (n ? 'Picked by ' + esc(pickBy(tid).join(', ')) : 'Pick this picture') + '" aria-label="Pick">' + ic('heart') + (n ? '<b>' + n + '</b>' : '') + '</button>' }
  function togglePick(tid, then) {
    if (share && share.data.kind === 'finals') return
    if (share && !store.get('rs-guest')) { prompt1('Your name', 'So the studio knows whose picks these are', '', 'Continue', function (v) { store.set('rs-guest', String(v).slice(0, 60)); togglePick(tid, then) }); return }
    api(share ? 'share-pick' : 'pick', { track: tid }).then(function (d) {
      if (d.error) { toast(d.error); return }
      ctx.picks = (d.picks || []).map(function (k) { return { track_id: k.track_id, user_id: k.user_id, by: k.by } })
      if (then) then(d.picked)
    }).catch(function (e) { toast(e.message) })
  }
  function wmText() {
    var st = share && share.data && share.data.studio; if (!st || share.data.kind === 'finals') return ''
    var parts = []
    if (st.watermark) parts.push(st.name || (share.data.project && share.data.project.owner_name) || 'RoarTransfer Studio')
    if (st.watermark_viewer) parts.push(viewerTag())
    return parts.join(' · ')
  }
  // Alex, 8 Nov (from Frame.io): whoever opens a review link sees their own name and the day over the video and pictures
  function viewerTag() { return (store.get('rs-guest') || 'Guest') + ' · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  function viewerWm() { var st = share && share.data && share.data.studio; return !!(st && st.watermark_viewer && share.data.kind !== 'finals') }
  setInterval(function () { $$('.wmtag').forEach(function (t) { t.style.left = (8 + Math.random() * 62) + '%'; t.style.top = (8 + Math.random() * 74) + '%' }) }, 6000)
  function wmLayer() {
    var t = wmText(); if (!t) return ''
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><text x="160" y="96" fill="rgba(255,255,255,0.32)" font-family="Helvetica,Arial,sans-serif" font-size="22" font-weight="700" text-anchor="middle" transform="rotate(-24 160 90)">' + esc(t) + '</text></svg>'
    return '<i class="wmark" aria-hidden="true" style="background-image:url(&quot;data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/'/g, '%27') + '&quot;)"></i>' + (viewerWm() ? '<b class="wmtag" aria-hidden="true" style="left:' + Math.round(10 + Math.random() * 60) + '%;top:' + Math.round(10 + Math.random() * 70) + '%">' + esc(viewerTag()) + '</b>' : '')
  }
  function brandBanner() { var st = share && share.data && share.data.studio; return st && st.banner ? '<div class="banner" style="background-image:url(' + cssu(st.banner) + ')"></div>' : '' }
  function drawProject(c) {
    var view = $('#view'), pr = c.project, edit = canDo('editor')
    var folder = !share && curFolder ? (c.folders || []).filter(function (f) { return f.id === curFolder })[0] : null
    if (!folder) curFolder = null
    setTop(folder ? [pr.title, folder.name] : [pr.title])
    var openNotes = function (tid) { var ids = c.versions.filter(function (v) { return v.track_id === tid }).map(function (v) { return v.id }); return c.comments.filter(function (n) { return ids.indexOf(n.version_id) >= 0 && !n.done && !n.parent_id }).length }
    var here = c.tracks.filter(function (t) { return share ? true : folder ? t.folder_id === folder.id : !t.folder_id })
    var kOf = function (t) { var v = latest(t.id); return v ? kindOf(v) : 'audio' }
    var counts = { audio: 0, video: 0, image: 0, file: 0, suno: 0 }; here.forEach(function (t) { counts[kOf(t)]++ })
    var kinds = ['audio', 'suno', 'video', 'image', 'file'].filter(function (k) { return counts[k] })
    if (kinds.indexOf(kindTab) < 0) kindTab = 'all'
    var shown = kindTab === 'all' ? here : here.filter(function (t) { return kOf(t) === kindTab })
    var pickedHere = here.filter(function (t) { return kOf(t) === 'image' && pickCount(t.id) })
    if (pickOnly && !pickedHere.length) pickOnly = false
    if (pickOnly) shown = shown.filter(function (t) { return kOf(t) === 'image' && pickCount(t.id) })
    var pickBar = counts.image && !(share && share.data.kind === 'finals') ? '<div class="pickbar"><button class="chip-b' + (pickOnly ? ' on' : '') + '" id="pk-only"' + (pickedHere.length ? '' : ' disabled') + '>' + ic('heart') + ' Picked <b>' + pickedHere.length + '</b></button>' + (pickedHere.length ? '<button class="chip-b" id="pk-copy" title="The picked file names, ready for Lightroom\'s Library Filter (Text > Filename > Contains)">' + ic('copy') + ' Copy names for Lightroom</button>' : '') + '</div>' : ''
    var head = folder
      ? '<button class="ico" id="fback" aria-label="Back to ' + esc(pr.title) + '">' + ic('back') + '</button><span class="fi" style="background:linear-gradient(160deg,#8fb8ff,#5b6cff);color:#0b1640">' + ic('folder') + '</span><div style="min-width:0"><h1>' + esc(folder.name) + '</h1><div class="sub">' + esc(pr.title) + ' · ' + here.length + ' file' + (here.length === 1 ? '' : 's') + '</div></div>'
      : '<button class="pcover' + (edit && !share ? ' edit' : '') + '" id="pcover" style="' + coverAttr(pr) + '" aria-label="' + (edit && !share ? 'Change the cover' : esc(pr.title)) + '">' + (edit && !share ? '<i>' + ic('image') + '</i>' : '') + '</button><div style="min-width:0"><h1>' + esc(pr.title) + '</h1><div class="sub">' + esc(pr.artist || '') + (pr.artist ? ' · ' : '') + c.tracks.length + ' file' + (c.tracks.length === 1 ? '' : 's') + (share ? (share.data.project.owner_name ? ' · shared by ' + esc(share.data.project.owner_name) : '') : '') + '</div></div>'
    var tools = share ? '' : (edit ? '<button class="btn main" id="new-btn">' + ic('plus') + ' New</button>' : '') +
      (edit && !folder ? '<button class="btn" id="sh-btn">' + ic('share') + ' Share</button>' : '') +
      (!folder ? '<button class="btn" id="pp-btn">' + ic('people') + ' People</button>' : '') +
      (edit && !folder ? '<button class="btn" id="st-btn" title="Who opened, played and downloaded (Studio Pro)">' + ic('chart') + ' Stats' + (me && me.pro ? '' : ' <span class="probadge">PRO</span>') + '</button>' : '') +
      (edit ? '<button class="ico" id="pm-btn" aria-label="More">' + ic('dots') + '</button>' : '')
    var extra = '', extraTop = ''
    if (!share && !folder) {
      var f = c.versions.filter(function (v) { return v.final_at })
      var tiles = ''
      if (f.length) {
        var fk = { audio: 0, video: 0, image: 0, file: 0, suno: 0 }; f.forEach(function (v) { fk[kindOf(v)]++ })
        extraTop = '<button class="finbar" id="fin-btn"><span class="fb-ic">' + ic('star') + '</span><span class="nm"><small>Delivery</small><b>Finals</b></span><span class="fb-k">' + ['audio', 'video', 'image', 'file'].filter(function (k) { return fk[k] }).map(function (k) { return '<span><i class="kdot k-' + k + '"></i>' + fk[k] + ' ' + KIND_PLURAL[k] + '</span>' }).join('') + '</span><span class="fb-size">' + f.length + ' file' + (f.length === 1 ? '' : 's') + ' · ' + size(f.reduce(function (a, v) { return a + Number(v.size || 0) }, 0)) + '</span><span class="fb-go">' + ic('next') + '</span></button>'
      }
      ;(c.playlists || []).forEach(function (pl) { tiles += '<button class="tile glass" data-pl="' + pl.id + '"><span class="fi" style="background:linear-gradient(160deg,#c4b5fd,#6d28d9);color:#fff">' + ic('list') + '</span><span class="nm"><b>' + esc(pl.title) + '</b><span>Playlist · ' + (pl.items || []).length + ' file' + ((pl.items || []).length === 1 ? '' : 's') + '</span></span></button>' })
      ;(c.folders || []).forEach(function (fd) { var n = c.tracks.filter(function (t) { return t.folder_id === fd.id }).length; tiles += '<button class="tile glass" data-fd="' + fd.id + '"><span class="fi" style="background:linear-gradient(160deg,#8fb8ff,#5b6cff);color:#0b1640">' + ic('folder') + '</span><span class="nm"><b>' + esc(fd.name) + '</b><span>' + n + ' file' + (n === 1 ? '' : 's') + '</span></span></button>' })
      extra = extraTop + (tiles ? '<div class="tiles">' + tiles + '</div>' : '')
    }
    function row(t) {
        var v = latest(t.id); if (!v) return ''
        var n = c.versions.filter(function (x) { return x.track_id === t.id }).length, notes = openNotes(t.id)
        var k = kindOf(v), hasFinal = c.versions.some(function (x) { return x.track_id === t.id && x.final_at })
        void k
        var lead = v.thumb ? '<button class="th" data-play="' + t.id + '" style="background-image:url(' + cssu(v.thumb) + ')" aria-label="Open ' + esc(t.title) + '">' + (k === 'video' ? '<i>' + ic('play') + '</i>' : '') + '</button>'
          : k === 'suno' ? '<button class="th sth" data-play="' + t.id + '" aria-label="Open ' + esc(t.title) + '"><i>' + ic('music') + '</i></button>'
          : k === 'file' ? '<button class="th fth" data-play="' + t.id + '" aria-label="Open ' + esc(t.title) + '"><i>' + ic(fileType(v) === 'MIDI file' ? 'music' : 'file') + '</i></button>'
          : k === 'image' ? '<button class="th" data-play="' + t.id + '" aria-label="Open ' + esc(t.title) + '"><i>' + ic('image') + '</i></button>'
          : '<button class="th au" data-play="' + t.id + '" style="' + coverAttr(c.project) + '" aria-label="Play ' + esc(t.title) + '"><i>' + ic('play') + '</i></button>'
        var heart = k === 'image' && !(share && share.data.kind === 'finals') ? heartBtn(t.id) : ''
        var mid = k === 'audio' ? '<canvas data-wave="' + v.id + '"></canvas>' : k === 'file' ? '<span class="kind">' + ic('file') + ' ' + esc(fileType(v)) + '</span>' : k === 'suno' ? '<span class="kind">' + ic('out') + ' Suno link</span>' : '<span class="kind">' + ic(k === 'video' ? 'film' : 'image') + ' ' + KIND_WORD[k] + (v.width ? ' · ' + v.width + '×' + v.height : '') + '</span>'
        return '<div class="trk glass k-' + k + '" data-t="' + t.id + '">' + lead + '<div class="nm"><b>' + esc(t.title) + '</b><span>' + esc(vname(v)) + ' · ' + n + ' version' + (n === 1 ? '' : 's') + (notes ? ' · ' + notes + ' open note' + (notes === 1 ? '' : 's') : '') + '</span></div>' + mid + heart + '<span class="cnt">' + (hasFinal ? '<span class="chip fin">Final</span>' : v.approved_at ? '<span class="chip ok">Approved</span>' : notes ? '<span class="chip warn">In review</span>' : '<span class="chip">New</span>') + '</span><span class="t">' + (k === 'image' || k === 'file' ? size(v.size) : mmss(v.duration)) + '</span></div>'
    }
    fixCover(pr, function (u) { var el = $('#pcover'); if (el) el.style.background = "#000 url('" + u + "') center/cover" })
    view.innerHTML = brandBanner() + '<div class="head">' + head + '<div class="tools">' + tools + '</div></div>' + extra +
      (kinds.length > 1 ? '<div class="lens-group ktabs" id="ktabs"><span class="lens"></span><button data-k="all"' + (kindTab === 'all' ? ' class="on"' : '') + '>All <small>' + here.length + '</small></button>' + kinds.map(function (k) { return '<button data-k="' + k + '"' + (kindTab === k ? ' class="on"' : '') + '><i class="kdot k-' + k + '"></i>' + KIND_PLURAL[k] + ' <small>' + counts[k] + '</small></button>' }).join('') + '</div>' : '') +
      pickBar + '<div class="tracks" id="tracks">' + (function () {
        // in All, the files go in groups by kind, each under its own line
        var order = kindTab === 'all' && kinds.length > 1 ? kinds : [null]
        return order.map(function (k) {
          var list = k ? shown.filter(function (t) { return kOf(t) === k }) : shown
          return (k ? '<div class="kgroup"><i class="kdot k-' + k + '"></i>' + KIND_PLURAL[k] + '<span>' + list.length + '</span></div>' : '') + list.map(row).join('')
        }).join('')
      })() + '</div>' +
      (edit && !share ? '<label class="drop" id="drop"><input type="file" id="files" multiple hidden><span class="ico" style="width:50px;height:50px">' + ic('up') + '</span><b>' + (here.length ? 'Drop more files here' : folder ? 'Drop files into this folder' : 'Drop your first files here') + '</b><span>Audio, video, pictures, MIDI or any other file, up to 20 GB each. Each file gets its own page, with versions and notes.</span></label><div class="ups" id="ups"></div>'
        : (!here.length ? '<div class="empty glass"><h2>Nothing here yet</h2><p>When someone uploads a file it shows up here.</p></div>' : ''))
    $$('canvas[data-wave]').forEach(function (cv) { var v = c.versions.filter(function (x) { return x.id === cv.dataset.wave })[0]; drawMini(cv, v && v.peaks) })
    $$('.trk').forEach(function (r) { r.onclick = function (e) { if (e.target.closest('[data-play]')) return; go('#t/' + r.dataset.t) } })
    // plays and views on each file (Alex, 9 Nov), for the people who can edit
    if (!share && canDo('editor')) projStats(c.project.id).then(function (st) {
      $$('.trk[data-t]').forEach(function (r) {
        var tid = r.dataset.t, vids = c.versions.filter(function (v) { return v.track_id === tid }).map(function (v) { return v.id }), k = trackCounts(st, tid, vids), sp = $('.nm span', r)
        if (sp && (k.plays || k.views) && !$('.pv', sp)) sp.insertAdjacentHTML('beforeend', '<em class="pv">▸ ' + esc(countsText(k)) + '</em>')
      })
    }).catch(function () {})
    $$('[data-play]').forEach(function (b) { b.onclick = function () { pendingPlay = true; go('#t/' + b.dataset.play) } })
    $$('#tracks [data-pick]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); togglePick(b.dataset.pick, function () { drawProject(c) }) } })
    if ($('#pk-only')) $('#pk-only').onclick = function () { pickOnly = !pickOnly; drawProject(c) }
    if ($('#pk-copy')) $('#pk-copy').onclick = function () {
      var names = pickedHere.map(function (t) { var v = latest(t.id); return String((v && v.file_name) || t.title).replace(/\.[a-z0-9]{2,5}$/i, '') })
      copyText(names.join(' '), names.length + ' name' + (names.length === 1 ? '' : 's') + ' copied: paste them in Lightroom, Library Filter > Text > Filename > Contains')
    }
    if ($('#fin-btn')) $('#fin-btn').onclick = function () { go('#f/' + pr.id) }
    if ($('#ktabs')) { var kt = $('#ktabs'); setTimeout(function () { lens(kt) }, 30); kt.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; kindTab = b.dataset.k; store.set('rs-kind', kindTab); drawProject(c) } }
    $$('[data-pl]').forEach(function (b) { b.onclick = function () { go('#l/' + b.dataset.pl) } })
    $$('[data-fd]').forEach(function (b) { b.onclick = function () { go('#d/' + b.dataset.fd) } })
    if ($('#fback')) $('#fback').onclick = function () { go('#p/' + pr.id) }
    if (!share) {
      if ($('#pp-btn')) $('#pp-btn').onclick = function () { peopleBox(c) }
      if ($('#st-btn')) $('#st-btn').onclick = function () { statsBox(c) }
      if ($('#sh-btn')) $('#sh-btn').onclick = function () { shareBox(c, null) }
      if ($('#new-btn')) $('#new-btn').onclick = function () { newBox(c, folder) }
      if ($('#pm-btn')) $('#pm-btn').onclick = function () { folder ? folderMenu(c, folder) : projectMenu(c) }
      if ($('#pcover') && edit) $('#pcover').onclick = function () { coverBox(c) }
      if (edit) wireDrop($('#drop'), $('#files'), function (files) { startUploads(files, { project: pr.id, folder: folder ? folder.id : null }) })
      listen(pr.id)
    }
  }
  // plays and views (Alex, 9 Nov): views are the times a file was opened through a link (one an hour per person), plays
  // the times anyone played it (roarstudio_watch, the people of the project included, not you); last 30 days for views
  function projStats(pid) {
    var since = new Date(Date.now() - 30 * 864e5).toISOString()
    return Promise.all([
      sb.from('roarstudio_events').select('kind, track_id, version_id, actor, actor_name, created_at').eq('project_id', pid).in('kind', ['view', 'stream', 'download']).gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
      sb.from('roarstudio_watch').select('version_id, viewer, name, user_id, plays, seen, furthest, duration, updated_at').eq('project_id', pid)
    ]).then(function (r) { return { ev: r[0].data || [], w: (r[1].data || []).filter(function (x) { return x.user_id !== session.user.id }) } })
  }
  function trackCounts(st, tid, vids) {
    var views = st.ev.filter(function (e) { return e.kind === 'stream' && e.track_id === tid }).length
    var ws = st.w.filter(function (x) { return vids.indexOf(x.version_id) >= 0 })
    return { views: views, plays: ws.reduce(function (a, x) { return a + (x.plays || 0) }, 0), people: ws.map(function (x) { return x.viewer }).filter(function (x, i, a) { return a.indexOf(x) === i }).length, dl: st.ev.filter(function (e) { return e.kind === 'download' && e.track_id === tid }).length }
  }
  function countsText(c) { return (c.plays ? c.plays + ' play' + (c.plays === 1 ? '' : 's') : '') + (c.plays && c.views ? ' · ' : '') + (c.views ? c.views + ' view' + (c.views === 1 ? '' : 's') : '') }
  function statsBox(c) {
    if (!(me && me.pro)) {
      modal('<div class="spread"><h2>Stats</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><p class="muted" style="margin:0">Who opened your links, what they played and for how long, what they downloaded, day by day. Stats are part of <b>Studio Pro</b>.</p><div class="row end"><a class="btn main" href="pricing/" target="_blank" rel="noopener">' + ic('star') + ' See Studio Pro</a></div>')
      return
    }
    var m = modal('<div class="spread"><h2>Stats · ' + esc(c.project.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div id="stx"><div class="spin"></div></div>')
    $('.sheet-card', m).classList.add('wide')
    projStats(c.project.id).then(function (st) {
      var box = $('#stx', m); if (!box) return
      var opens = st.ev.filter(function (e) { return e.kind === 'view' }), streams = st.ev.filter(function (e) { return e.kind === 'stream' }), dls = st.ev.filter(function (e) { return e.kind === 'download' })
      var plays = st.w.reduce(function (a, x) { return a + (x.plays || 0) }, 0)
      var people = st.w.map(function (x) { return x.viewer }).concat(opens.map(function (e) { return e.actor || 'g:' + String(e.actor_name || '').toLowerCase() })).filter(function (x, i, a) { return x && a.indexOf(x) === i }).length
      var days = []; for (var i = 13; i >= 0; i--) { var dd = new Date(Date.now() - i * 864e5); days.push({ key: dd.toISOString().slice(0, 10), label: dd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), o: 0, p: 0 }) }
      st.ev.forEach(function (e) { var k = String(e.created_at).slice(0, 10), dd = days.filter(function (x) { return x.key === k })[0]; if (dd) { if (e.kind === 'view') dd.o++; else if (e.kind === 'stream') dd.p++ } })
      var top = Math.max(1, days.reduce(function (a, x) { return Math.max(a, x.o + x.p) }, 0))
      var files = c.tracks.map(function (t) { var vids = c.versions.filter(function (v) { return v.track_id === t.id }).map(function (v) { return v.id }); var k = trackCounts(st, t.id, vids); var ws = st.w.filter(function (x) { return vids.indexOf(x.version_id) >= 0 && x.duration }); k.avg = ws.length ? Math.round(ws.reduce(function (a, x) { return a + Math.min(1, x.seen / Math.max(1, Math.floor(x.duration))) }, 0) / ws.length * 100) : null; k.t = t; return k })
        .filter(function (k) { return k.views || k.plays || k.dl }).sort(function (a, b) { return (b.plays + b.views) - (a.plays + a.views) }).slice(0, 8)
      var tt = {}; c.tracks.forEach(function (t) { tt[t.id] = t.title })
      var recent = st.ev.slice(0, 12)
      var kpi = function (n, l) { return '<div class="kpi glass"><b>' + n + '</b><span>' + l + '</span></div>' }
      box.innerHTML = '<div class="kpis sk">' + kpi(opens.length, 'Link opens') + kpi(plays, 'Plays') + kpi(people, 'People') + kpi(dls.length, 'Downloads') + '</div>' +
        '<h3 class="sth3">Last 14 days</h3><div class="chart sch" role="img" aria-label="Opens and plays per day">' + days.map(function (x) { return '<div class="col" title="' + x.label + ': ' + x.o + ' opens, ' + x.p + ' plays"><i class="u" style="height:' + (x.o / top * 100) + '%"></i><i class="n" style="height:' + (x.p / top * 100) + '%"></i></div>' }).join('') + '</div><div class="klegend"><span><i style="background:#a78bfa"></i>Opens</span><span><i style="background:#22d3ee"></i>Plays</span></div>' +
        '<h3 class="sth3">Files</h3>' + (files.length ? files.map(function (k) { return '<div class="srow"><div><b>' + esc(k.t.title) + '</b><small>' + [k.plays + ' play' + (k.plays === 1 ? '' : 's'), k.views + ' view' + (k.views === 1 ? '' : 's'), k.people ? k.people + ' ' + (k.people === 1 ? 'person' : 'people') : '', k.avg != null ? k.avg + '% watched on average' : '', k.dl ? k.dl + ' download' + (k.dl === 1 ? '' : 's') : ''].filter(Boolean).join(' · ') + '</small></div></div>' }).join('') : '<p class="muted">Nothing yet. Share a link and it shows here.</p>') +
        '<h3 class="sth3">Latest visits</h3>' + (recent.length ? recent.map(function (e) { var who = e.actor_name || (c.people[e.actor] && c.people[e.actor].name) || 'Someone'; var what = e.kind === 'view' ? 'opened the project' : e.kind === 'stream' ? 'opened ' + (tt[e.track_id] || 'a file') : 'downloaded ' + (tt[e.track_id] || 'a file'); return '<div class="srow"><div><b>' + esc(who) + '</b><small>' + esc(what) + '</small></div><small class="muted">' + ago(e.created_at) + '</small></div>' }).join('') : '<p class="muted">No visits in the last 30 days.</p>')
    })
  }
  // + New (Alex, 7 Nov, as mixup): a file, a playlist (audio or video) or a folder
  function newBox(c, folder) {
    modal('<div class="spread"><h2>Create a new item</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="newgrid">' +
      '<button class="newcard glass" id="nb-f"><span>' + ic('file') + '</span><b>New file</b><small>Audio, video, a picture, MIDI or any file</small></button>' +
      '<button class="newcard glass" id="nb-s"><span>' + ic('music') + '</span><b>From Suno</b><small>Paste a song’s link: it plays here</small></button>' +
      (folder ? '' : '<button class="newcard glass" id="nb-p"><span>' + ic('list') + '</span><b>New playlist</b><small>Audio or video, in order</small></button>' +
      '<button class="newcard glass" id="nb-d"><span>' + ic('fplus') + '</span><b>New folder</b><small>Keep files together</small></button>') + '</div>', function (m) {
      $('#nb-f', m).onclick = function () { close(); $('#files').click() }
      $('#nb-s', m).onclick = function () { close(); addSuno(c.project.id, null, folder ? folder.id : null, function (d) { go('#t/' + d.track) }) }
      if ($('#nb-p', m)) $('#nb-p', m).onclick = function () { prompt1('New playlist', 'Name', '', 'Create', function (v) { return sb.from('roarstudio_playlists').insert({ project_id: c.project.id, title: v, created_by: session.user.id }).select('id').single().then(function (r) { if (r.error) { toast(r.error.message); return } go('#l/' + r.data.id) }) }) }
      if ($('#nb-d', m)) $('#nb-d', m).onclick = function () { prompt1('New folder', 'Name', '', 'Create', function (v) { return sb.from('roarstudio_folders').insert({ project_id: c.project.id, name: v, position: (c.folders || []).length, created_by: session.user.id }).select('id').single().then(function (r) { if (r.error) { toast(r.error.message); return } go('#d/' + r.data.id) }) }) }
    })
  }
  function renderFolder(fid) {
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    sb.from('roarstudio_folders').select('project_id').eq('id', fid).maybeSingle().then(function (r) {
      if (!r.data) throw new Error('This folder is no longer here.')
      curFolder = fid; return loadProject(r.data.project_id)
    }).then(drawProject).catch(function (e) { setTop([]); view.innerHTML = errorBox(e.message) })
  }
  function folderMenu(c, folder) {
    modal('<div class="spread"><h2>' + esc(folder.name) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="fm-r">' + ic('pen') + ' Rename folder</button><button class="btn danger" id="fm-d">' + ic('trash') + ' Delete folder</button></div>', function (m) {
      $('#fm-r', m).onclick = function () { prompt1('Rename folder', 'Name', folder.name, 'Save', function (v) { return sb.from('roarstudio_folders').update({ name: v }).eq('id', folder.id).then(function () { render() }) }) }
      $('#fm-d', m).onclick = function () { confirmBox('Delete the folder “' + folder.name + '”?', 'Only the folder goes: the files in it move back to the top of the project.', 'Delete folder', function () { return sb.from('roarstudio_folders').delete().eq('id', folder.id).then(function () { go('#p/' + c.project.id) }) }) }
    })
  }
  // the cover: pick a photo, then zoom, move, turn and crop it to a square
  function coverBox(c) {
    cropBox({ title: 'Project cover', w: 800, h: 800, current: c.project.cover, onRemove: c.project.cover ? function () { return sb.from('roarstudio_projects').update({ cover: null }).eq('id', c.project.id).then(function () { render() }) } : null, onDone: function (url) {
      return sb.from('roarstudio_projects').update({ cover: url }).eq('id', c.project.id).then(function (r) { if (r.error) toast(r.error.message); else { toast('Cover saved'); render() } })
    } })
  }
  function projectMenu(c) {
    var owner = c.role === 'owner'
    modal('<div class="spread"><h2>' + esc(c.project.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="pm-r">' + ic('pen') + ' Rename</button>' + (owner ? '<button class="btn danger" id="pm-d">' + ic('trash') + ' Delete project</button>' : '') + '</div>', function (m) {
      $('#pm-r', m).onclick = function () {
        modal('<div class="spread"><h2>Rename</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><form id="rf" style="display:grid;gap:14px"><div class="field"><label for="rf-t">Title</label><input class="in" id="rf-t" value="' + esc(c.project.title) + '"></div><div class="field"><label for="rf-a">Artist</label><input class="in" id="rf-a" value="' + esc(c.project.artist) + '"></div><div class="row end"><button type="button" class="btn" data-x>Cancel</button><button class="btn main">Save</button></div></form>', function (k) {
          $('#rf', k).onsubmit = function (e) { e.preventDefault(); sb.from('roarstudio_projects').update({ title: $('#rf-t', k).value.trim() || 'Untitled', artist: $('#rf-a', k).value.trim() }).eq('id', c.project.id).then(function () { close(); render() }) }
        })
      }
      if (owner) $('#pm-d', m).onclick = function () { confirmBox('Delete this project?', 'Every track, version and note in “' + c.project.title + '” is deleted, and the files leave the cloud. This cannot be undone.', 'Delete', function () { return api('delete-project', { project: c.project.id }).then(function (d) { if (d.ok) { toast('Project deleted'); go('#/') } else toast(d.error) }) }) }
    })
  }

  function drawMini(cv, peaks) {
    var r = cv.getBoundingClientRect(), d = devicePixelRatio || 1
    if (!r.width) return
    cv.width = r.width * d; cv.height = r.height * d
    var x = cv.getContext('2d'), w = cv.width, h = cv.height
    x.fillStyle = 'rgba(214,220,228,.38)'
    if (!peaks || !peaks.length) { x.fillRect(0, h / 2 - d / 2, w, d); return }
    var bars = Math.floor(w / (3 * d)), per = peaks.length / bars
    for (var i = 0; i < bars; i++) { var m = 0; for (var j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) m = Math.max(m, peaks[j] || 0); var bh = Math.max(d, m * h * .9); x.fillRect(i * 3 * d, (h - bh) / 2, 2 * d, bh) }
  }

  // ---- uploads: read the sound, then 16 MB pieces straight to R2, four at a time ----
  function wireDrop(drop, input, fn) {
    input.onchange = function () { fn(Array.prototype.slice.call(input.files)); input.value = '' }
    ;['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over') }) })
    ;['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over') }) })
    drop.addEventListener('drop', function (e) { fn(Array.prototype.slice.call(e.dataTransfer.files || [])) })
  }
  var uploading = 0
  // Upload naming (Settings): a title for each new file, or a name for a new version, before it goes up
  function startUploads(files, opt) {
    files = files.filter(Boolean)
    if (!files.length) return
    if (!(me && me.prefs && me.prefs.upload_naming)) { files.forEach(function (f) { uploadFile(f, opt) }); return }
    var ver = !!opt.track
    modal('<div class="spread"><h2>' + (ver ? 'Name this version' : 'Name ' + (files.length === 1 ? 'the file' : 'the files')) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><form id="un" style="display:grid;gap:12px">' +
      files.map(function (f, i) { return '<div class="field"><label for="un-' + i + '">' + esc(f.name) + ' · ' + size(f.size) + '</label><input class="in" id="un-' + i + '" maxlength="' + (ver ? 80 : 200) + '" value="' + esc(ver ? '' : f.name.replace(/\.[a-z0-9]{2,5}$/i, '')) + '" placeholder="' + (ver ? 'For example: mix 2, master, radio edit' : 'Title') + '"></div>' }).join('') +
      '<div class="row end"><button type="button" class="btn" data-x>Cancel</button><button class="btn main">Upload</button></div></form>', function (m) {
      $('#un', m).onsubmit = function (e) {
        e.preventDefault()
        var vals = files.map(function (f, i) { return $('#un-' + i, m).value.trim() })
        close()
        files.forEach(function (f, i) { uploadFile(f, Object.assign({}, opt, ver ? { label: vals[i] } : { title: vals[i] || null })) })
      }
    })
  }
  // what the page reads from a file before it goes up: sound (waveform, loudness), a picture's or a video's size and a small JPEG
  function analyseAny(file) {
    var k = kindOf({ mime: file.type, file_name: file.name })
    if (k === 'file') return Promise.resolve(null)
    if (k === 'image') return imageMeta(file)
    if (k === 'video') return videoMeta(file).then(function (vm) {
      if (file.size > 400 * 1024 * 1024) return vm
      return RSAudio.analyse(file).then(function (am) { return Object.assign({}, am || {}, vm || {}) })
    })
    return RSAudio.analyse(file)
  }
  function shrink(src, w, h) {
    var s = Math.min(1, 480 / Math.max(w, h)), c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s))
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
    try { return c.toDataURL('image/jpeg', 0.72) } catch (e) { return null }
  }
  function imageMeta(file) {
    return new Promise(function (ok) {
      var u = URL.createObjectURL(file), img = new Image()
      img.onload = function () { var r = { width: img.naturalWidth, height: img.naturalHeight, thumb: shrink(img, img.naturalWidth, img.naturalHeight) }; URL.revokeObjectURL(u); ok(r) }
      img.onerror = function () { URL.revokeObjectURL(u); ok(null) }
      img.src = u
    })
  }
  function videoMeta(file) {
    return new Promise(function (ok) {
      var u = URL.createObjectURL(file), v = document.createElement('video'), done = false
      var end = function (r) { if (done) return; done = true; URL.revokeObjectURL(u); ok(r) }
      v.muted = true; v.playsInline = true; v.preload = 'auto'
      v.onloadedmetadata = function () { try { v.currentTime = Math.min(1.5, (v.duration || 0) * 0.1) } catch (e) { end({ duration: v.duration }) } }
      v.onseeked = function () { end({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: v.videoWidth ? shrink(v, v.videoWidth, v.videoHeight) : null }) }
      v.onerror = function () { end(null) }
      setTimeout(function () { end(v.duration ? { duration: v.duration, width: v.videoWidth, height: v.videoHeight } : null) }, 10000)
      v.src = u
    })
  }
  window.addEventListener('beforeunload', function (e) { if (uploading) { e.preventDefault(); e.returnValue = '' } })
  function uploadFile(file, opt) {
    var box = document.createElement('div'); box.className = 'up glass'
    box.innerHTML = '<div class="spread"><span><b>' + esc(file.name) + '</b> <span class="muted">' + size(file.size) + '</span></span><span class="muted st">Reading the sound…</span></div><div class="bar"><i></i></div>'
    var list = $('#ups'); if (list) list.appendChild(box)
    var st = function (t) { $('.st', box).textContent = t }, bar = function (p) { $('.bar i', box).style.width = Math.round(p * 100) + '%' }
    uploading++
    var meta = null
    return (opt.stemOf ? Promise.resolve(null) : analyseAny(file)).then(function (m) {
      meta = m; st('Starting…')
      return api('upload-create', { project: opt.project, name: file.name, size: file.size, type: file.type || 'application/octet-stream' })
    }).then(function (made) {
      if (!made.key) throw new Error(made.error || 'Could not start the upload')
      var n = Math.ceil(file.size / PART), etags = {}, urls = {}, loaded = {}, next = 1
      var sum = function () { var s = 0; for (var k in loaded) s += loaded[k]; return s }
      var sign = function (from) {
        var want = []; for (var k = from; k <= Math.min(n, from + 19); k++) if (!urls[k]) want.push(k)
        return want.length ? api('upload-sign', { project: opt.project, key: made.key, uploadId: made.uploadId, parts: want }).then(function (d) { if (!d.urls) throw new Error(d.error || 'Could not sign'); for (var k in d.urls) urls[k] = d.urls[k] }) : Promise.resolve()
      }
      var putPart = function (i, tries) {
        return sign(i).then(function () {
          return new Promise(function (ok, no) {
            var piece = file.slice((i - 1) * PART, Math.min(file.size, i * PART)), x = new XMLHttpRequest()
            x.open('PUT', urls[i]); x.upload.onprogress = function (e) { loaded[i] = e.loaded; bar(sum() / file.size) }
            x.onload = function () { if (x.status >= 200 && x.status < 300) { etags[i] = x.getResponseHeader('ETag') || ''; loaded[i] = piece.size; ok() } else no(new Error('R2 ' + x.status)) }
            x.onerror = function () { no(new Error('network')) }
            x.send(piece)
          })
        }).catch(function (e) { delete urls[i]; if (tries < 4) return new Promise(function (r) { setTimeout(r, 1500 * (tries + 1)) }).then(function () { return putPart(i, tries + 1) }); throw e })
      }
      var worker = function () { if (next > n) return Promise.resolve(); var i = next++; return putPart(i, 0).then(worker) }
      st('Uploading…')
      return Promise.all([worker(), worker(), worker(), worker()]).then(function () {
        st('Finishing…')
        var parts = Object.keys(etags).map(function (k) { return { n: +k, etag: etags[k] } })
        return api('upload-complete', { project: opt.project, key: made.key, uploadId: made.uploadId, parts: parts, name: file.name, size: file.size, type: file.type, track: opt.track || null, title: opt.title || null, stem_of: opt.stemOf || null, folder: opt.folder || null, label: opt.label || '', meta: meta || {} })
      }).catch(function (e) { api('upload-abort', { project: opt.project, key: made.key, uploadId: made.uploadId }); throw e })
    }).then(function (d) {
      if (!d.version && !d.stem) throw new Error(d.error || 'Could not finish the upload')
      bar(1); st(meta && meta.lufs != null ? 'Done · ' + lufsText(meta.lufs) : 'Done'); uploading--
      setTimeout(function () { box.remove() }, 2500)
      if (opt.onDone) opt.onDone(d.version); else if (!uploading) render()
      return d.version
    }).catch(function (e) { uploading--; st(''); box.querySelector('.st').innerHTML = '<span class="err">' + esc(e.message === 'network' ? 'The connection dropped. Try again.' : e.message) + '</span>' })
  }

  // realtime: a note or a version from someone else shows without a reload
  var reloadSoon = null
  function listen(projectId, onChange) {
    unlisten()
    live = sb.channel('rs-' + projectId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roarstudio_comments', filter: 'project_id=eq.' + projectId }, function () { clearTimeout(reloadSoon); reloadSoon = setTimeout(onChange || function () { if (!uploading) render() }, 400) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roarstudio_versions', filter: 'project_id=eq.' + projectId }, function () { clearTimeout(reloadSoon); reloadSoon = setTimeout(onChange || function () { if (!uploading) render() }, 400) })
      .subscribe()
  }

  // =====================================================================================================
  // a track: the player, its versions and the notes
  // =====================================================================================================
  var pendingPlay = false, pendingNote = null, tview = null
  function renderTrack(id) {
    var view = $('#view')
    var p
    if (share) p = Promise.resolve(ctx)
    else {
      var keep = ctx && ctx.tracks.some(function (t) { return t.id === id }) ? ctx.project.id : null
      p = keep ? loadProject(keep) : sb.from('roarstudio_tracks').select('project_id').eq('id', id).maybeSingle().then(function (r) { if (!r.data) throw new Error('This track does not exist, or you are not in its project.'); return loadProject(r.data.project_id) })
    }
    if (!tview || tview.track !== id) view.innerHTML = '<div class="spin"></div>'
    p.then(function () { return loadNotes(id) }).then(function (notes) { drawTrack(id, notes) }).catch(function (e) { setTop([]); view.innerHTML = errorBox(e.message) })
  }
  function loadNotes(trackId) {
    var ids = ctx.versions.filter(function (v) { return v.track_id === trackId }).map(function (v) { return v.id })
    if (share) return Promise.resolve(share.data.comments.filter(function (c) { return ids.indexOf(c.version_id) >= 0 }))
    if (!ids.length) return Promise.resolve([])
    return sb.from('roarstudio_comments').select('*').in('version_id', ids).order('created_at').then(function (r) { return r.data || [] })
  }
  function nameOf(c) {
    if (c.guest_name) return { name: c.guest_name + ' (guest)', short: c.guest_name, avatar: null, id: c.guest_name }
    var p = share ? { name: share.data.names[c.author] } : ctx.people[c.author]
    return { name: (p && p.name) || 'Former member', avatar: p && p.avatar, id: c.author }
  }

  function drawTrack(id, notes) {
    var view = $('#view'), track = ctx.tracks.filter(function (t) { return t.id === id })[0]
    if (!track) { view.innerHTML = errorBox('This track is no longer here.'); return }
    var versions = ctx.versions.filter(function (v) { return v.track_id === id })
    if (!versions.length) { view.innerHTML = errorBox('This track has no versions yet.'); return }
    var prev = tview && tview.track === id ? tview.version : null, fresh = !prev
    var v = versions.filter(function (x) { return x.id === prev })[0] || versions[versions.length - 1]
    if (tview && tview.wtimer) { clearInterval(tview.wtimer); if (tview.wflush) tview.wflush() }
    tview = { track: id, version: v.id, notes: notes, at: true, reacts: share ? (share.data.reactions || []) : [], attUrl: {} }
    if (!share) sb.from('roarstudio_reactions').select('comment_id, user_id, guest_name, emoji').eq('project_id', ctx.project.id).then(function (r) { if (!tview || tview.track !== id) return; tview.reacts = r.data || []; if ($('#nlist')) paintNotes() })
    setTop([ctx.project.title, track.title])
    var edit = canDo('editor')

    var firstV = versions[0], byName = share ? share.data.names[firstV.uploaded_by] : ctx.people[firstV.uploaded_by] && ctx.people[firstV.uploaded_by].name
    view.innerHTML = '<div class="head"><button class="ico" id="back" aria-label="Back to the project">' + ic('back') + '</button><span class="pcover sm" style="' + coverAttr(ctx.project) + '"></span><div style="min-width:0"><h1>' + esc(track.title) + '</h1><div class="sub">' + esc(ctx.project.title) + (byName ? ' · by ' + esc(byName) : '') + ' · ' + new Date(firstV.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</div></div><div class="tools">' +
      (kindOf(versions[versions.length - 1]) === 'audio' && versions.some(function (q) { return q.lufs != null }) ? '<button class="btn" id="lvl">' + ic('disk').replace('disk', '') + 'Levels</button>' : '') +
      '<button class="btn" id="abtn" hidden title="A/B: Space switches between two versions at the same point">A/B</button><button class="btn" id="strm" hidden title="How Spotify, Apple Music and YouTube will play it">' + ic('wave') + ' Streaming</button><button class="btn" id="stems" hidden title="The parts of this version, with mute and solo">' + ic('stems') + ' Stems</button>' +
      (edit && !share ? '<button class="btn main" id="nv">' + ic('up') + ' New version</button><button class="btn" id="tsh">' + ic('share') + ' Share</button><button class="ico" id="tm" aria-label="More">' + ic('dots') + '</button>' : '') + '</div></div>' +
      '<div class="player"><section class="stage glass">' +
      '<div class="vers" id="vers"></div>' +
      '<div class="media" id="media"></div>' +
      '<div class="wave" id="wave"><canvas id="wv"></canvas><div class="pins" id="pins"></div><span class="hover-t" id="hover-t" hidden></span></div>' +
      '<div class="ctl" id="ctl"><button class="ico sm" id="rew" aria-label="Back to the start" title="Back to the start">' + ic('prev') + '</button><button class="ico sm fstep" id="fprev" hidden aria-label="One frame back" title="One frame back (←)">' + ic('fprev') + '</button><button class="play" id="pb" aria-label="Play">' + ic('play') + '</button><button class="ico sm fstep" id="fnext" hidden aria-label="One frame on" title="One frame on (→)">' + ic('fnext') + '</button><span class="time" id="tm-t">0:00 <span>/ 0:00</span></span>' +
      '<span class="pt"><label class="zoom zs" title="Zoom the waveform (double-click for all of it)">' + ic('zin') + '<input type="range" id="zr" min="0" max="100" step="1" value="0" aria-label="Zoom"><b class="mono" id="zl">1×</b></label><i class="pt-sep"></i><button class="ico sm" id="vmask" hidden aria-label="Frame masks" title="Frame masks: 2.39, 1.85, 9:16, 4:5, safe areas">' + ic('mask') + '</button><button class="ico sm" id="vdraw" hidden aria-label="Draw on the frame" title="Draw on the frame, then write the note">' + ic('pen') + '</button><button class="ico sm" id="vcmp" hidden aria-label="Compare two versions" title="Compare two versions: wipe, fade or difference">' + ic('split') + '</button><button class="ico sm" id="spd" aria-label="Speed" title="Speed"><b class="mono" style="font-size:11px">1×</b></button><button class="ico sm" id="lp" aria-label="Loop" title="Loop">' + ic('loop') + '</button><button class="ico sm" id="pip" aria-label="Picture in picture" title="Picture in picture" hidden>' + ic('pip') + '</button><button class="ico sm" id="fs" aria-label="Full screen" title="Full screen" hidden>' + ic('full') + '</button></span><button class="btn sm grab" id="grab" hidden title="Save this frame as a picture, with its time on it">' + ic('cam') + '<span>Grab still</span></button>' +
      '<span class="lm">Level match <button class="sw" id="lm" aria-pressed="' + matched + '" aria-label="Level match"></button><span class="lufs" id="lufs"></span></span></div>' +
      '<div class="facts" id="facts"></div><section class="stemp" id="stemp" hidden></section>' +
      '<div class="appr" id="appr"></div>' +
      (edit && !share ? '<input type="file" id="nvf" hidden><div class="ups" id="ups"></div>' : '') +
      '</section><section class="extras glass" id="extras"><div class="ex-h"><b>' + ic('scope') + ' <span id="ex-title">Analyzer</span></b><span class="muted" id="ex-sub"></span><span class="grow"></span><div class="lens-group" id="ex-tabs" hidden><span class="lens"></span><button data-sc="wave" class="on">Waveform</button><button data-sc="parade">RGB parade</button></div><button class="ico sm" id="ex-tg" aria-label="Show or hide the analyzer">' + ic('chev') + '</button></div><div class="ex-b" id="ex-b"></div></section>' + (function () {
        var k = kindOf(versions[versions.length - 1]), out = ''
        if (k === 'audio' && store.get('rs-hint-ab') !== '0') out += '<div class="hint" data-hint="ab">' + ic('wave') + '<span><b>A/B</b> · press A/B at the top, then <kbd>Space</kbd>: you hear the next version (A → B → C) from the same second, without stopping.</span><button class="ico sm" aria-label="Hide this tip">' + ic('x') + '</button></div>'
        if (k !== 'image' && canDo('commenter') && store.get('rs-hint-rng') !== '0') out += '<div class="hint" data-hint="rng">' + ic('range') + '<span><b>A stretch</b> · hold <kbd>Shift</kbd> and drag on the waveform to pick a part (0:42 to 0:58): the note you write covers all of it.</span><button class="ico sm" aria-label="Hide this tip">' + ic('x') + '</button></div>'
        return out ? '<div class="hints">' + out + '</div>' : ''
      })() + '<aside class="notes glass"><header>' + '<div class="lens-group" id="ntab"><span class="lens"></span><button class="on" data-tab="n">Notes</button>' + (share ? '' : '<button data-tab="p">Notepad</button>') + '<button data-tab="s" hidden>Stills</button>' + (!share && canDo('editor') ? '<button data-tab="w">Views</button>' : '') + '</div>' + '<span class="muted" id="ncount"></span>' + (share ? '' : '<button class="ico sm" id="nexp" hidden aria-label="Notes as markers for the edit" title="Notes as markers for the edit (Resolve, Premiere)">' + ic('mark') + '</button>') + '</header>' +
      '<div class="nfilter" id="nfilter"><label class="nsearch">' + ic('search') + '<input id="nq" placeholder="Search notes" aria-label="Search notes"></label><div class="chips" id="nchips"><button class="on" data-f="all">All</button><button data-f="open">Open</button><button data-f="done">Done</button>' + (share ? '' : '<button data-f="mine">Mine</button>') + '</div></div>' +
      '<div class="nlist" id="nlist"></div><div class="stills" id="stills" hidden></div><div class="views" id="views" hidden></div>' + (share ? '' : '<div class="npad" id="npad" hidden><textarea class="in" id="npad-t"></textarea><span class="muted" id="npad-s" style="font-size:12px"></span></div>') +
      (canDo('commenter') ? '<form class="compose" id="cmp">' + (share && !store.get('rs-guest') ? '<input class="in" id="g-name" maxlength="60" placeholder="Your name" required>' : '') +
        '<div class="cmp-sk" id="cmp-pos" hidden>' + ic('pin') + '<span>On the spot you clicked</span><button type="button" class="ico sm" id="cmp-pos-x" aria-label="No spot">' + ic('x') + '</button></div><div class="cmp-sk" id="cmp-sk" hidden>' + ic('pen') + '<span>Drawing goes with this note</span><button type="button" class="ico sm" id="cmp-sk-x" aria-label="Remove the drawing">' + ic('x') + '</button></div><div class="cmp-sk" id="cmp-attc" hidden>' + ic('image') + '<span>A picture goes with this note</span><button type="button" class="ico sm" id="cmp-attc-x" aria-label="Remove the picture">' + ic('x') + '</button></div><div class="mwrap"><textarea class="in" id="cmp-t" rows="2" maxlength="4000" placeholder="Write a note · @ to mention someone"></textarea><div class="mpop" id="mpop" hidden></div></div><div class="spread"><label class="attime"><input type="checkbox" id="cmp-at" checked> at <b class="mono" id="cmp-time">0:00</b></label><button type="button" class="ico sm rbtn" id="cmp-rng" title="A note over a stretch: press at the start, press again at the end (or Shift and drag on the waveform)" aria-label="A note over a stretch">' + ic('range') + '</button><span class="grow"></span><button type="button" class="ico sm" id="cmp-att" title="Attach a picture (a reference, a screenshot)" aria-label="Attach a picture">' + ic('image') + '</button><input type="file" id="cmp-attf" accept="image/*" hidden><button type="button" class="ico sm mic" id="cmp-mic" title="Hold to speak a note, or click to start and click to stop" aria-label="Speak a note">' + ic('mic') + '<b class="mono" id="cmp-mic-t"></b></button><button class="btn main sm" id="cmp-go">Post</button></div></form>' : '') +
      '</aside></div>'

    $('#back').onclick = function () { go(share && share.data.tracks.length === 1 && share.data.project ? '#t/' + id : '#p/' + ctx.project.id) }

    function paintVersions() {
      $('#vers').innerHTML = versions.map(function (x) { return '<button class="v' + (x.id === tview.version ? ' on' : '') + '" data-v="' + x.id + '">' + esc(vname(x)) + (x.final_at ? ' <span class="tick">★</span>' : x.approved_at ? ' <span class="tick">✓</span>' : '') + '</button>' }).join('')
      $$('#vers [data-v]').forEach(function (b) { b.onclick = function () { setVersion(b.dataset.v, true) } })
      paintAB()
    }
    function curV() { return versions.filter(function (x) { return x.id === tview.version })[0] || versions[versions.length - 1] }
    // the picture: the video element for a video, the still for a picture, nothing for sound
    function paintMedia() {
      var x = curV(), k = kindOf(x), box = $('#media')
      var still = k === 'image' || k === 'file' || k === 'suno'
      $('#wave').hidden = still || (k === 'video' && !(x.peaks && x.peaks.length))
      $('#ctl').hidden = still
      $('.lm').hidden = k !== 'audio'
      if ($('#cmp-at')) $('.attime').hidden = still
      if ($('#fs')) { $('#fs').hidden = k !== 'video'; $('#pip').hidden = k !== 'video' || !document.pictureInPictureEnabled }
      if ($('#grab')) $('#grab').hidden = k !== 'video' || (share && !share.data.can.comment)
      setTimeout(paintExtras)
      if ($('#strm')) $('#strm').hidden = k !== 'audio' || x.lufs == null
      if ($('#stems')) $('#stems').hidden = k !== 'audio'
      if ($('#abtn')) $('#abtn').hidden = k !== 'audio' || audVersions().length < 2
      if ($('#cmp-rng')) $('#cmp-rng').hidden = still
      if (k !== 'audio' && ab) { ab = null; paintAB() }
      if ($('#stemp') && !$('#stemp').hidden && stemSt.v !== x.id) loadStems()
      ;['#fprev', '#fnext', '#vmask'].forEach(function (q) { if ($(q)) $(q).hidden = k !== 'video' })
      if ($('#vdraw')) $('#vdraw').hidden = k !== 'video' || !canDo('commenter')
      if ($('#vcmp')) $('#vcmp').hidden = k !== 'video' || vidVersions().length < 2
      if ($('#nexp')) $('#nexp').hidden = k !== 'video'
      if ($('#vmask')) $('#vmask').classList.toggle('on', !!(vs.mask || vs.safe))
      if (k !== 'video') { compareOff(); drawMode(false) } else if (vs.cmp && vs.cmp.v.id === x.id) compareOff()
      if (k === 'video') measureFps(x).then(function (f) { if (f && tview.stills && $('#stills') && !$('#stills').hidden) paintStills() })
      var wtb = $('#ntab [data-tab="w"]'); if (wtb) { wtb.hidden = still; if (wtb.classList.contains('on')) { if (still) $('#ntab [data-tab="n"]').click(); else loadViews() } }
      var stb = $('#ntab [data-tab="s"]')
      if (stb) { stb.hidden = k !== 'video'; if (k !== 'video' && stb.classList.contains('on')) $('#ntab [data-tab="n"]').click(); else if (stb.classList.contains('on')) loadStills(); setTimeout(function () { if ($('#ntab')) lens($('#ntab')) }, 30) }
      // a video gets a lower waveform, a strip to scrub (Alex, 7 Nov)
      var stg = $('.stage'); if (stg) stg.classList.toggle('is-video', k === 'video')
      if (k === 'video') {
        if (vidEl.parentNode !== box) { box.innerHTML = ''; box.appendChild(vidEl); var vi = document.createElement('span'); vi.className = 'vinfo'; box.appendChild(vi) }
        if (wmText() && !$('.wmark', box)) box.insertAdjacentHTML('beforeend', wmLayer())
        var info = $('.vinfo', box); if (info) info.textContent = [x.width ? x.width + '×' + x.height : '', size(x.size), x.duration ? (x.size * 8 / x.duration / 1e6).toFixed(1) + ' Mbps' : ''].filter(Boolean).join(' · ')
        if (x.thumb && !vidEl.src) vidEl.poster = x.thumb
        vidEl.onclick = function () { pb.click() }
        setupOverlay(box); setTimeout(paintOv, 60)
        box.hidden = false
      } else if (k === 'image') {
        box.hidden = false
        box.innerHTML = '<div class="still"' + (x.thumb ? ' style="background-image:url(' + cssu(x.thumb) + ')"' : '') + '><span class="pwrap" id="pwrap"><img id="still" alt="' + esc(x.file_name) + '">' + wmLayer() + '<span class="ppins" id="ppins"></span><span class="loupe" id="loupe" hidden></span></span></div>' +
          '<div class="ptools">' + (!(share && share.data.kind === 'finals') ? heartBtn(x.track_id) : '') + '<span class="grow"></span>' + (imgVersions().length > 1 ? '<button class="btn sm" id="pcmp">' + ic('split') + ' Before / after</button>' : '') + '<button class="btn sm" id="ploupe" title="See the picture at 100% under the pointer">' + ic('loupe') + ' 100%</button>' + '<button class="btn sm" id="pview" title="Open the picture big (or click it)">' + ic('full') + ' View</button>' + (canDo('commenter') ? '<button class="btn sm" id="ppinb" title="Then click the spot the note is about">' + ic('pin') + ' Pin a note</button>' : '') + '</div>'
        urlFor(x).then(function (u) { var im = $('#still'); if (im && curV() === x) { im.crossOrigin = 'anonymous'; im.onload = function () { im.classList.add('on'); paintPPins(); ex.lastT = -3 }; im.onerror = fileLost; im.src = u } }).catch(function () {})
        setupPicture(x)
      } else if (k === 'suno') {
        box.hidden = false
        var sid = sunoOf(x)
        box.innerHTML = '<div class="sunobox"><iframe src="https://suno.com/embed/' + sid + '" title="' + esc(x.file_name) + ' on Suno" allow="autoplay; encrypted-media; fullscreen" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="sunobar"><span>' + ic('music') + ' Played by Suno · notes here are about the whole song</span><a class="btn sm" href="https://suno.com/song/' + sid + '" target="_blank" rel="noopener">' + ic('out') + ' Open on Suno</a></div></div>'
      } else if (k === 'file') {
        box.hidden = false
        var canDl = !share || (share.data.can && share.data.can.download) || share.data.kind === 'finals'
        box.innerHTML = '<div class="fcardx"><span class="fbig">' + ic(fileType(x) === 'MIDI file' ? 'music' : 'file') + '</span><b>' + esc(x.file_name) + '</b><small>' + esc(fileType(x)) + ' · ' + size(x.size) + '</small>' + (canDl ? '<button class="btn main" id="fdl" type="button">' + ic('down') + ' Download</button>' : '<small>Downloads are off on this link.</small>') + '</div>'
        if ($('#fdl')) $('#fdl').onclick = function () { download(x) }
      } else { box.innerHTML = ''; box.hidden = true }
    }
    function setVersion(vid, keep) {
      tview.version = vid; var x = curV()
      paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr(); drawWave()
      load(x, keep, false).catch(function (e) { toast(e.message) })
    }
    if (!share && canDo('editor')) projStats(ctx.project.id).then(function (st) { if (!tview || tview.track !== id) return; tview.counts = trackCounts(st, id, versions.map(function (v) { return v.id })); paintFacts() }).catch(function () {})
    function paintFacts() {
      var x = curV()
      $('#lufs').textContent = x.lufs == null ? 'not measured' : (matched ? lufsText(TARGET) + ' (' + lufsText(x.lufs) + ')' : lufsText(x.lufs))
      var f = [KIND_WORD[kindOf(x)]]
      if (x.width) f.push(x.width + '×' + x.height)
      if (kindOf(x) !== 'image' && x.duration) f.push(mmss(x.duration))
      if (x.sample_rate) f.push((x.sample_rate / 1000).toString().replace(/\.0$/, '') + ' kHz')
      if (x.channels) f.push(x.channels === 1 ? 'mono' : x.channels === 2 ? 'stereo' : x.channels === 6 ? '5.1' : x.channels + ' ch')
      if (x.peak_db != null) f.push('peak ' + (x.peak_db < 0 ? '−' : '') + Math.abs(x.peak_db).toFixed(1) + ' dBFS')
      if (x.size) f.push(size(x.size))
      var who = share ? share.data.names[x.uploaded_by] : ctx.people[x.uploaded_by] && ctx.people[x.uploaded_by].name
      f.push((who ? who + ', ' : '') + ago(x.created_at))
      if (tview && tview.counts && (tview.counts.plays || tview.counts.views)) f.push(countsText(tview.counts))
      $('#facts').innerHTML = f.map(function (t) { return '<span>' + esc(t) + '</span>' }).join('')
      $('#facts').title = x.file_name
    }
    function paintAppr() {
      var x = curV(), a = $('#appr'), h = ''
      h += '<span class="state">' + (x.final_at ? '<b class="fin">★ Final</b> · ' + esc(x.final_by || '') + ', ' + ago(x.final_at) : x.approved_at ? '<b>✓ Approved</b> by ' + esc(x.approved_by || '') + ', ' + ago(x.approved_at) : esc(vname(x)) + ' is waiting for approval') + '</span>'
      if (edit && !share) h += x.final_at ? '<button class="btn sm fin-on" id="fin-un" title="Take it out of Finals">' + ic('star') + ' Final</button>' : '<button class="btn sm fin-btn" id="fin">' + ic('star') + ' Make it final</button>'
      if (canDo('download')) h += '<button class="btn sm" id="dl">' + ic('down') + ' Download</button>'
      if (canDo('approve')) h += x.approved_at ? (share ? '' : '<button class="btn sm" id="ap-un">Undo approval</button>') : '<button class="btn sm main" id="ap">' + ic('check') + ' Approve ' + (hideV() ? '' : 'v' + x.n) + '</button>'
      if (edit && !share) h += '<button class="ico sm" id="vm" aria-label="This version">' + ic('dots') + '</button>'
      a.innerHTML = h
      if ($('#dl')) $('#dl').onclick = function () { download(x) }
      if ($('#fin')) $('#fin').onclick = function () { api('final', { version: x.id }).then(function (d) { if (d.error) { toast(d.error); return } x.final_at = d.final_at; x.final_by = d.final_by; paintAppr(); paintVersions(); toast('In Finals') }) }
      if ($('#fin-un')) $('#fin-un').onclick = function () { confirmBox('Take it out of Finals?', 'v' + x.n + ' stays here with its notes; it only leaves the Finals folder and its links.', 'Take it out', function () { return api('final', { version: x.id, undo: true }).then(function () { x.final_at = null; x.final_by = null; paintAppr(); paintVersions() }) }) }
      if ($('#ap')) $('#ap').onclick = function () {
        var doIt = function () { (share ? api('share-approve', { version: x.id, name: store.get('rs-guest') }) : api('approve', { version: x.id })).then(function (d) { if (d.error) { toast(d.error); return } x.approved_at = d.approved_at; x.approved_by = d.approved_by; paintAppr(); paintVersions(); toast('v' + x.n + ' approved') }) }
        if (share && !store.get('rs-guest')) askName(doIt); else doIt()
      }
      if ($('#ap-un')) $('#ap-un').onclick = function () { api('approve', { version: x.id, undo: true }).then(function (d) { x.approved_at = null; x.approved_by = null; paintAppr(); paintVersions() }) }
      if ($('#vm')) $('#vm').onclick = function () { versionMenu(x) }
    }
    function versionMenu(x) {
      modal('<div class="spread"><h2>v' + x.n + (x.label ? ' · ' + esc(x.label) : '') + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="vm-l">' + ic('pen') + ' Name this version</button><button class="btn danger" id="vm-d">' + ic('trash') + ' Delete this version</button></div>', function (m) {
        $('#vm-l', m).onclick = function () { prompt1('Name v' + x.n, 'For example: rough mix, master, radio edit', x.label, 'Save', function (val) { return sb.from('roarstudio_versions').update({ label: val.slice(0, 80) }).eq('id', x.id).then(function () { x.label = val; paintVersions() }) }) }
        $('#vm-d', m).onclick = function () { confirmBox('Delete v' + x.n + '?', 'The file and its notes are deleted. This cannot be undone.', 'Delete', function () { return api('delete-version', { version: x.id }).then(function (d) { if (d.error) { toast(d.error); return } toast('Version deleted'); tview = null; audio.pause(); if (d.trackGone) go('#p/' + ctx.project.id); else render() }) }) }
      })
    }

    // the waveform (Alex, 7 Nov: "a better answer when I move on the waveform"): press and drag to scrub, the sound
    // follows at once; the time under the pointer; zoom in to work on a few seconds, the view follows the playhead
    var wv = $('#wv'), wave = $('#wave'), hoverX = -1, zw = { z: 1, start: 0 }, scrub = null
    function span(dur) { return dur / zw.z }
    function tAt(clientX) { var r = wave.getBoundingClientRect(), x = curV(), dur = x.duration || audio.duration || 0; return Math.max(0, Math.min(dur, zw.start + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * span(dur))) }
    function nowT() { return cur.version === curV() ? (scrub ? scrub.t : audio.currentTime) : 0 }
    function drawWave() {
      var x = curV(), r = wv.getBoundingClientRect(), d = devicePixelRatio || 1
      if (!r.width) return
      if (wv.width !== Math.round(r.width * d)) { wv.width = Math.round(r.width * d); wv.height = Math.round(r.height * d) }
      var g = wv.getContext('2d'), w = wv.width, h = wv.height, dur = x.duration || audio.duration || 0, t = nowT()
      var sp = span(dur) || 1
      if (zw.z > 1 && !scrub && (t < zw.start || t > zw.start + sp * 0.92)) zw.start = Math.max(0, Math.min(dur - sp, t - sp * 0.1))
      if (zw.z === 1) zw.start = 0
      var pos = dur ? (t - zw.start) / sp * w : 0
      g.clearRect(0, 0, w, h)
      var pk = x.peaks || [], bars = Math.floor(w / (3 * d))
      var amp = matched && x.lufs != null ? Math.min(1.6, Math.max(.4, cur.gain)) : 1
      for (var i = 0; i < bars; i++) {
        var m = 0
        if (pk.length && dur) {
          var a = Math.floor((zw.start + i / bars * sp) / dur * pk.length), b = Math.max(a + 1, Math.floor((zw.start + (i + 1) / bars * sp) / dur * pk.length))
          for (var j = a; j < b && j < pk.length; j++) m = Math.max(m, pk[j] || 0)
        } else m = .04
        var bh = Math.max(2 * d, Math.min(1, m * amp) * h * .86), bx = i * 3 * d
        g.fillStyle = bx < pos ? '#a78bfa' : hoverX >= 0 && bx < hoverX ? 'rgba(255,255,255,.55)' : 'rgba(214,220,228,.36)'
        g.fillRect(bx, (h - bh) / 2, 2 * d, bh)
      }
      var band = function (a, b, col, edge) { var x1 = (a - zw.start) / sp * w, x2 = (b - zw.start) / sp * w; if (x2 < 0 || x1 > w) return; g.fillStyle = col; g.fillRect(Math.max(0, x1), 0, Math.min(w, x2) - Math.max(0, x1), h); if (edge) { g.fillStyle = edge; g.fillRect(x1, 0, d, h); g.fillRect(x2 - d, 0, d, h) } }
      if (typeof topNotes === 'function') topNotes().forEach(function (c) { if (c.at_sec != null && c.end_sec != null) band(c.at_sec, c.end_sec, 'rgba(250,204,21,.09)') })
      if (tview.range) { var ra = tview.range.a, rb = tview.range.b != null ? tview.range.b : t; band(Math.min(ra, rb), Math.max(ra, rb), 'rgba(250,204,21,.2)', 'rgba(250,204,21,.85)') }
      g.fillStyle = '#fff'; g.fillRect(pos - d, 0, 2 * d, h)
      // pins follow the zoom
      $$('#pins .pin').forEach(function (p) { var at = +p.dataset.at, l = (at - zw.start) / sp * 100; p.style.left = l + '%'; p.hidden = l < -1 || l > 101 })
    }
    function seekNow(tt) {
      var x = curV()
      if (!cur.url || cur.version !== x) { load(x, false, false).then(function () { audio.currentTime = tt }) ; return }
      try { if (audio.fastSeek && scrub) audio.fastSeek(tt); else audio.currentTime = tt } catch (e) { audio.currentTime = tt }
    }
    var scrubFrame = 0
    var rsel = false
    wave.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin')) return
      if (e.shiftKey && canDo('commenter') && kindOf(curV()) !== 'image') { wave.setPointerCapture(e.pointerId); rsel = true; var t0 = tAt(e.clientX); tview.range = { a: t0, b: t0 }; drawWave(); return }
      wave.setPointerCapture(e.pointerId)
      scrub = { t: tAt(e.clientX), was: !audio.paused }
      seekNow(scrub.t); drawWave()
    })
    wave.addEventListener('pointermove', function (e) {
      var r = wave.getBoundingClientRect(), d = devicePixelRatio || 1
      hoverX = (e.clientX - r.left) * d
      var ht = $('#hover-t'); ht.hidden = false; ht.style.left = (e.clientX - r.left) + 'px'; ht.textContent = mmss(tAt(e.clientX))
      if (rsel) { tview.range.b = tAt(e.clientX) }
      if (scrub) { scrub.t = tAt(e.clientX); if (!scrubFrame) scrubFrame = requestAnimationFrame(function () { scrubFrame = 0; if (scrub) seekNow(scrub.t) }) }
      drawWave()
    })
    var endScrub = function () {
      if (rsel) { rsel = false; var rr = tview.range; if (!rr || Math.abs(rr.b - rr.a) < 0.3) tview.range = null; else { if (rr.b < rr.a) { var tmp = rr.a; rr.a = rr.b; rr.b = tmp } seekNow(rr.a) } paintRange(); drawWave(); return }
      if (!scrub) return; var tt = scrub.t; scrub = null; try { audio.currentTime = tt } catch (e) {} drawWave() }
    wave.addEventListener('pointerup', endScrub); wave.addEventListener('pointercancel', endScrub)
    wave.addEventListener('pointerleave', function () { hoverX = -1; $('#hover-t').hidden = true; drawWave() })
    wave.addEventListener('wheel', function (e) { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setZoom(zw.z * (e.deltaY < 0 ? 1.25 : 0.8), tAt(e.clientX)) }, { passive: false })
    function setZoom(z, around) {
      var x = curV(), dur = x.duration || audio.duration || 0
      zw.z = Math.max(1, Math.min(32, z)); var sp = span(dur)
      zw.start = Math.max(0, Math.min(dur - sp, (around == null ? nowT() : around) - sp / 2))
      $('#zl').textContent = (zw.z < 10 ? Math.round(zw.z * 10) / 10 : Math.round(zw.z)) + '×'
      var zr = $('#zr'); if (zr) { var v = Math.round(Math.log(zw.z) / Math.log(32) * 100); if (document.activeElement !== zr) zr.value = v; zr.style.setProperty('--zv', v + '%') }
      drawWave()
    }

    var nf = { q: '', f: 'all' }
    function topNotes() { return tview.notes.filter(function (c) {
      if (c.version_id !== tview.version || c.parent_id) return false
      if (nf.f === 'open' && c.done) return false
      if (nf.f === 'done' && !c.done) return false
      if (nf.f === 'mine' && !(session && c.author === session.user.id)) return false
      if (nf.q && (c.body + ' ' + nameOf(c).name).toLowerCase().indexOf(nf.q) < 0) return false
      return true
    }).sort(function (a, b) { return (a.at_sec == null ? 1e9 : a.at_sec) - (b.at_sec == null ? 1e9 : b.at_sec) || new Date(a.created_at) - new Date(b.created_at) }) }
    // Views (Alex, 8 Nov, from Frame.io): every second played is counted once; sent every 10 s, at a pause and on leaving
    var W = null
    var wflush = function () {
      if (!W || !W.dirty) return
      W.dirty = false
      var body = { action: share ? 'share-watch' : 'watch', version: W.v, sec: W.max, seen: W.n, dur: W.dur, start: W.start, name: store.get('rs-guest') || '' }
      W.start = false; W.sent = Date.now()
      var h = { apikey: KEY, 'Content-Type': 'application/json' }
      if (share) { body.token = share.token; body.password = share.password } else if (session) h.Authorization = 'Bearer ' + session.access_token
      try { fetch(FN, { method: 'POST', headers: h, body: JSON.stringify(body), keepalive: true }).catch(function () {}) } catch (e) {}
    }
    tview.wflush = wflush
    tview.wtimer = setInterval(function () {
      if (!document.body.contains(vidEl) && !$('#wave')) { clearInterval(tview.wtimer); wflush(); return }
      var x = curV(); if (!x || kindOf(x) === 'image' || cur.version !== x) return
      if (!W || W.v !== x.id) { wflush(); W = { v: x.id, set: {}, n: 0, max: 0, dur: x.duration || audio.duration || null, start: true, dirty: false, sent: Date.now() } }
      if (!audio.paused) { var t = Math.floor(audio.currentTime); if (!W.set[t]) { W.set[t] = 1; W.n++; W.dirty = true } W.max = Math.max(W.max, audio.currentTime); if (!W.dur && audio.duration) W.dur = audio.duration }
      if (W.dirty && (audio.paused || Date.now() - W.sent > 10000)) wflush()
    }, 1000)
    window.addEventListener('pagehide', function () { if (tview && tview.wflush) tview.wflush() })
    function loadViews() {
      var x = curV(), box = $('#views'); if (!box || share) return
      box.innerHTML = '<div class="spin"></div>'
      sb.from('roarstudio_watch').select('*').eq('version_id', x.id).order('updated_at', { ascending: false }).then(function (r) {
        if (curV() !== x) return
        var rows = r.data || [], dur = x.duration || 0
        box.innerHTML = '<p class="muted vhead">Who played ' + esc(vname(x)) + ', how much of it and how far. Every second is counted once.</p>' + (rows.length ? rows.map(function (w) {
          var nm = w.user_id ? ((ctx.people[w.user_id] && ctx.people[w.user_id].name) || 'Member') : (w.name || 'Someone with the link'), D = w.duration || dur || 0
          var pc = D ? Math.min(100, Math.round(w.seen / Math.max(1, Math.floor(D)) * 100)) : 0
          return '<div class="vrow">' + avatar(nm, w.user_id && ctx.people[w.user_id] && ctx.people[w.user_id].avatar, w.user_id || nm) + '<div class="vnm"><div class="spread"><b>' + esc(nm) + (w.user_id ? '' : ' <small class="muted">(link)</small>') + '</b><span class="mono vpc">' + pc + '%</span></div><span class="pbar"><i style="width:' + Math.max(2, pc) + '%"></i></span><small class="muted">Up to ' + mmss(w.furthest) + (D ? ' of ' + mmss(D) : '') + ' · ' + w.plays + ' play' + (w.plays === 1 ? '' : 's') + ' · ' + ago(w.updated_at) + '</small></div></div>'
        }).join('') : '<p class="muted" style="padding:6px 8px">Nobody has played this version yet.</p>')
      })
    }
    function paintNotes() {
      var top = topNotes(), x = curV(), dur = x.duration || 0
      var all = tview.notes.filter(function (c) { return c.version_id === tview.version && !c.parent_id })
      var open = all.filter(function (c) { return !c.done }).length
      $('#ncount').textContent = all.length ? open + ' open · ' + all.length + ' in all' : ''
      setTimeout(drawWave)
      $('#nfilter').hidden = all.length < 2
      $('#pins').innerHTML = dur ? top.filter(function (c) { return c.at_sec != null }).map(function (c) { var n = nameOf(c); return '<button class="pin' + (c.done ? ' done' : '') + '" data-c="' + c.id + '" data-at="' + c.at_sec + '" style="left:' + (c.at_sec / dur * 100) + '%" aria-label="Note at ' + mmss(c.at_sec) + ' by ' + esc(n.name) + '"><span>' + esc(initials(n.name)[0]) + '</span><em class="pin-tip"><b>' + esc(n.name) + ' · ' + mmss(c.at_sec) + '</b>' + esc((c.body || '').slice(0, 140)) + '</em></button>' }).join('') : ''
      // a pin plays from its second and brings its note into view (Alex, 7 Nov: "when you press them, something should happen")
      $$('#pins .pin').forEach(function (p) { p.addEventListener('pointerdown', function (e) { e.stopPropagation() }); p.onclick = function (e) { e.stopPropagation(); var c = tview.notes.filter(function (z) { return z.id === p.dataset.c })[0]; jump(c, true) } })
      var one = function (c, reply) {
        var n = nameOf(c), mine = !share && session && c.author === session.user.id
        var reps = tview.notes.filter(function (z) { return z.parent_id === c.id })
        return '<div class="note' + (c.done ? ' done' : '') + '" data-n="' + c.id + '">' + avatar(n.short || n.name, n.avatar, n.id) + '<div style="min-width:0"><div class="who"><b>' + esc(n.name) + '</b>' + (c.at_sec != null && !reply ? '<button class="at" data-at="' + c.id + '">' + (kindOf(curV()) === 'video' ? tcf(c.at_sec, +store.get('rs-fps-' + curV().id)) : mmss(c.at_sec)) + (c.end_sec != null ? '–' + (kindOf(curV()) === 'video' ? tcf(c.end_sec, +store.get('rs-fps-' + curV().id)) : mmss(c.end_sec)) : '') + '</button>' : '') + '<span>' + ago(c.created_at) + '</span></div>' + (c.at_sec != null && !reply && kindOf(curV()) === 'video' ? '<button class="nframe" data-fr="' + c.id + '" data-t="' + c.at_sec + '" aria-label="Play from ' + mmss(c.at_sec) + '"><canvas width="320" height="180"></canvas><i>' + tcf(c.at_sec, +store.get('rs-fps-' + curV().id)) + '</i></button>' : '') + (c.body ? '<div class="body">' + mentionHtml(c.body) + '</div>' : '') + (c.attach ? '<button class="natt" data-att="' + c.id + '" aria-label="Open the picture"><img alt="" data-attimg="' + c.id + '"></button>' : '') + (c.voice || c.voice_sec != null ? '<button class="vnote" data-vo="' + c.id + '">' + ic('play') + '<span>Spoken note</span><b class="mono">' + mmss(c.voice_sec || 0) + '</b></button>' : '') +
          reactRow(c) + (reply ? '' : '<div class="acts">' + (canDo('commenter') ? '<button class="ico sm" data-rep="' + c.id + '" aria-label="Reply">' + ic('reply') + '</button>' : '') + (!share && (canDo('editor') || mine) ? '<button class="ico sm" data-done="' + c.id + '" aria-label="' + (c.done ? 'Open again' : 'Mark as done') + '" title="' + (c.done ? 'Open again' : 'Done') + '">' + ic('check') + '</button>' : '') + (mine || (!share && ctx.role === 'owner') ? '<button class="ico sm danger" data-del="' + c.id + '" aria-label="Delete note">' + ic('trash') + '</button>' : '') + '</div>') +
          (reps.length ? '<div class="replies">' + reps.map(function (r) { return one(r, true) }).join('') + '</div>' : '') + '</div></div>'
      }
      $('#nlist').innerHTML = top.length ? top.map(function (c) { return one(c) }).join('') : '<p class="muted" style="padding:10px 8px;margin:0;font-size:14px">' + (all.length ? 'No notes match.' : canDo('commenter') ? 'No notes on this version yet. Play it, pause where something needs work and write below.' : 'No notes on this version yet.') + '</p>'
      setTimeout(paintPPins)
      $$('#nlist [data-vo]').forEach(function (b) { b.onclick = function () { playVoice(b) } })
      $$('#nlist [data-rx]').forEach(function (b) { b.onclick = function () { react(b.dataset.rc, b.dataset.rx) } })
      $$('#nlist [data-radd]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); reactPick(b) } })
      $$('#nlist [data-attimg]').forEach(function (im) { attUrl(im.dataset.attimg).then(function (u) { if (u) im.src = u }) })
      $$('#nlist [data-att]').forEach(function (b) { b.onclick = function () { attUrl(b.dataset.att).then(function (u) { if (u) window.open(u, '_blank', 'noopener') }) } })
      $$('#nlist [data-fr]').forEach(function (b) { b.onclick = function () { jump(tview.notes.filter(function (z) { return z.id === b.dataset.fr })[0], true) } })
      fillFrames()
      $$('#nlist [data-at]').forEach(function (b) { b.onclick = function () { jump(tview.notes.filter(function (z) { return z.id === b.dataset.at })[0]) } })
      $$('[data-rep]').forEach(function (b) { b.onclick = function () { replyTo = b.dataset.rep; var t = $('#cmp-t'); if (t) { t.placeholder = 'Reply to ' + nameOf(tview.notes.filter(function (z) { return z.id === replyTo })[0]).name + '…'; t.focus() } } })
      $$('[data-done]').forEach(function (b) { b.onclick = function () { var c = tview.notes.filter(function (z) { return z.id === b.dataset.done })[0]; c.done = !c.done; sb.from('roarstudio_comments').update({ done: c.done }).eq('id', c.id).then(function () {}); paintNotes() } })
      $$('[data-del]').forEach(function (b) { b.onclick = function () { var cid = b.dataset.del; sb.from('roarstudio_comments').delete().eq('id', cid).then(function () {}); tview.notes = tview.notes.filter(function (z) { return z.id !== cid && z.parent_id !== cid }); paintNotes() } })
      activeNote()
    }
    // reactions on notes (Alex, 8 Nov, from Frame.io): one of six, one each, the same press takes it off
    var EMO = ['👍', '❤️', '🔥', '😂', '👀', '✅']
    function meKey(r) { return share ? (!r.user_id && String(r.guest_name || '').toLowerCase() === String(store.get('rs-guest') || '').toLowerCase()) : r.user_id === session.user.id }
    function reactRow(c) {
      var rs = (tview.reacts || []).filter(function (r) { return r.comment_id === c.id }), by = {}
      rs.forEach(function (r) { (by[r.emoji] = by[r.emoji] || []).push(r) })
      var who = function (list) { return list.map(function (r) { return r.user_id ? ((share ? share.data.names[r.user_id] : ctx.people[r.user_id] && ctx.people[r.user_id].name) || 'Member') : (r.guest_name || 'Guest') }).join(', ') }
      var chips = EMO.filter(function (e) { return by[e] }).map(function (e) { var mine = by[e].some(meKey); return '<button class="rchip' + (mine ? ' on' : '') + '" data-rx="' + e + '" data-rc="' + c.id + '" title="' + esc(who(by[e])) + '">' + e + '<b>' + by[e].length + '</b></button>' }).join('')
      return '<div class="reacts">' + chips + '<button class="rchip radd" data-radd="' + c.id + '" aria-label="React" title="React">' + ic('smile') + '</button></div>'
    }
    function reactPick(btn) {
      var old = $('.rpick'); if (old) { old.remove(); if (old.dataset.c === btn.dataset.radd) return }
      var p = document.createElement('div'); p.className = 'rpick glass'; p.dataset.c = btn.dataset.radd
      p.innerHTML = EMO.map(function (e) { return '<button data-e="' + e + '">' + e + '</button>' }).join('')
      btn.parentNode.appendChild(p)
      p.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); p.remove(); react(btn.dataset.radd, b.dataset.e) }
      setTimeout(function () { document.addEventListener('click', function away(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', away) } }) })
    }
    function react(cid, emo) {
      if (share && !store.get('rs-guest')) { prompt1('Your name', 'So everyone knows who reacted', '', 'Continue', function (v) { store.set('rs-guest', String(v).slice(0, 60)); react(cid, emo) }); return }
      var had = (tview.reacts || []).filter(function (r) { return r.comment_id === cid && r.emoji === emo && meKey(r) })[0]
      if (share) {
        api('share-react', { comment: cid, emoji: emo, name: store.get('rs-guest') }).then(function (d) { if (d.error) { toast(d.error); return } tview.reacts = (tview.reacts || []).filter(function (r) { return r.comment_id !== cid }).concat(d.reactions || []); share.data.reactions = tview.reacts; paintNotes() })
        return
      }
      if (had) { tview.reacts = tview.reacts.filter(function (r) { return r !== had }); sb.from('roarstudio_reactions').delete().eq('comment_id', cid).eq('user_id', session.user.id).eq('emoji', emo).then(function () {}) }
      else { var row = { comment_id: cid, project_id: ctx.project.id, user_id: session.user.id, emoji: emo }; tview.reacts.push(row); sb.from('roarstudio_reactions').insert(row).then(function (r) { if (r.error) toast(r.error.message) }) }
      paintNotes()
    }
    function attUrl(cid) {
      if (tview.attUrl[cid]) return Promise.resolve(tview.attUrl[cid])
      return api(share ? 'share-att-url' : 'att-url', { comment: cid }).then(function (d) { if (d.url) tview.attUrl[cid] = d.url; return d.url || '' })
    }
    // @names in a note: the people of the project (and, on a link, the names it shows)
    function mentionPeople() {
      var out = []
      if (share) Object.keys(share.data.names || {}).forEach(function (k) { if (share.data.names[k]) out.push({ id: k, name: share.data.names[k] }) })
      else (ctx.peopleList || []).forEach(function (p) { if (p.user_id !== session.user.id && p.name) out.push({ id: p.user_id, name: p.name }) })
      return out
    }
    function mentionHtml(body) {
      var h = esc(body), names = mentionPeople().concat(share ? [] : [{ name: (me && me.name) || '' }]).map(function (p) { return p.name }).filter(Boolean).sort(function (a, b) { return b.length - a.length })
      names.forEach(function (n) { var e = esc('@' + n); h = h.split(e).join('<b class="ment">' + e + '</b>') })
      return h
    }

    var frameCache = {}, frameQ = [], frameBusy = false, fv = null
    function drawFrame(cv, src) { var g = cv.getContext('2d'), w = cv.width, h = cv.height, sw = src.videoWidth || src.width, sh = src.videoHeight || src.height; g.fillStyle = '#0b0910'; g.fillRect(0, 0, w, h); if (!sw) return; var sc = Math.min(w / sw, h / sh), dw = sw * sc, dh = sh * sc; g.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh) }
    function containRect(w, h, ar) { var cw = w, ch = w / ar; if (ch > h) { ch = h; cw = h * ar } return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch } }
    function vAr() { var x = curV(); return vidEl.videoWidth ? vidEl.videoWidth / vidEl.videoHeight : x && x.width && x.height ? x.width / x.height : 16 / 9 }
    function drawSketch(g, sk, r, k) {
      if (!sk || !sk.length) return
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#facc15'; g.lineWidth = Math.max(2, r.w / 200) * (k || 1); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 4 * (k || 1)
      sk.forEach(function (st) {
        var P = st.p.map(function (q) { return [r.x + q[0] * r.w, r.y + q[1] * r.h] }), a = P[0], z = P[P.length - 1]
        g.beginPath()
        if (st.t === 'pen') { g.moveTo(a[0], a[1]); P.forEach(function (q) { g.lineTo(q[0], q[1]) }) }
        else if (st.t === 'arrow') { var an = Math.atan2(z[1] - a[1], z[0] - a[0]), hl = Math.max(10, r.w / 40) * (k || 1); g.moveTo(a[0], a[1]); g.lineTo(z[0], z[1]); g.moveTo(z[0], z[1]); g.lineTo(z[0] - hl * Math.cos(an - .5), z[1] - hl * Math.sin(an - .5)); g.moveTo(z[0], z[1]); g.lineTo(z[0] - hl * Math.cos(an + .5), z[1] - hl * Math.sin(an + .5)) }
        else if (st.t === 'circle') { var cx = (a[0] + z[0]) / 2, cy = (a[1] + z[1]) / 2, rx = Math.abs(z[0] - a[0]) / 2, ry = Math.abs(z[1] - a[1]) / 2; if (g.ellipse) g.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2); else g.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2) }
        g.stroke()
      })
      g.restore()
    }
    function sketchOnThumb(b) {
      var c = tview.notes.filter(function (z) { return z.id === b.dataset.fr })[0]; if (!c || !c.sketch) return
      var cv = $('canvas', b); drawSketch(cv.getContext('2d'), c.sketch, containRect(cv.width, cv.height, vAr()), cv.width / 320)
    }
    function fillFrames() {
      var x = curV(); if (kindOf(x) !== 'video') return
      $$('#nlist .nframe').forEach(function (b) {
        var key = x.id + '@' + b.dataset.t, cv = $('canvas', b)
        if (frameCache[key]) { drawFrame(cv, frameCache[key]); sketchOnThumb(b); b.classList.add('on') } else if (!frameQ.some(function (q) { return q.key === key })) frameQ.push({ key: key, t: +b.dataset.t, v: x })
      })
      nextFrame()
    }
    // is a drawn frame only black? (a frame not decoded yet draws black, mostly in Safari)
    function isBlack(c) { try { var px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, lit = 0; for (var i = 0; i < px.length; i += 64) if (px[i] + px[i + 1] + px[i + 2] > 24) lit++; return lit < 3 } catch (e) { return false } }
    function putFrame(key, c) {
      frameCache[key] = c
      $$('#nlist .nframe').forEach(function (b) { if (curV() && curV().id + '@' + b.dataset.t === key) { drawFrame($('canvas', b), c); sketchOnThumb(b); b.classList.add('on') } })
    }
    function nextFrame() {
      if (frameBusy || !frameQ.length) return
      var q = frameQ.shift(); frameBusy = true
      var done = function () { frameBusy = false; setTimeout(nextFrame) }
      if (!fv) {
        // kept in the page (out of sight): Safari decodes no pictures for a video that is not in the page
        fv = document.createElement('video'); fv.crossOrigin = 'anonymous'; fv.muted = true; fv.preload = 'auto'; fv.playsInline = true; fv.setAttribute('playsinline', ''); fv.setAttribute('aria-hidden', 'true')
        fv.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:180px;opacity:0;pointer-events:none'
        document.body.appendChild(fv)
      }
      urlFor(q.v).then(function (u) {
        var tries = 0
        var grab = function () {
          var c = document.createElement('canvas'); c.width = 320; c.height = 180; drawFrame(c, fv)
          if (isBlack(c) && tries++ < 4) { setTimeout(grab, 250); return }
          putFrame(q.key, c); done()
        }
        var ready = function () { if (fv.requestVideoFrameCallback) { var fired = false; fv.requestVideoFrameCallback(function () { fired = true; grab() }); setTimeout(function () { if (!fired) grab() }, 600) } else setTimeout(grab, 120) }
        var seek = function () {
          var to = setTimeout(done, 10000)
          fv.addEventListener('seeked', function () { clearTimeout(to); if (fv.readyState >= 2) ready(); else fv.addEventListener('loadeddata', ready, { once: true }) }, { once: true })
          try { fv.currentTime = Math.max(0.04, q.t) } catch (e) { clearTimeout(to); done() }
        }
        if (fv.dataset.v !== q.v.id) { fv.dataset.v = q.v.id; fv.src = u; fv.addEventListener('loadeddata', seek, { once: true }); fv.load() } else if (fv.readyState >= 2) seek(); else fv.addEventListener('loadeddata', seek, { once: true })
      }).catch(done)
    }
    // Stills (Alex, 7 Nov): Grab still saves the frame, its time on it, into the Stills tab for everyone; download from there
    function loadStills() {
      var x = curV(); if (kindOf(x) !== 'video') return
      var box = $('#stills'); if (!box) return
      if (!tview.stills || tview.stillsV !== x.id) box.innerHTML = '<div class="spin"></div>'
      api(share ? 'share-stills' : 'stills', { version: x.id }).then(function (d) { if (curV() !== x) return; tview.stills = d.stills || []; tview.stillsV = x.id; paintStills() }).catch(function () {})
    }
    function paintStills() {
      var box = $('#stills'); if (!box) return
      var list = tview.stills || [], me = session && session.user.id
      box.innerHTML = list.length ? '<div class="sgrid">' + list.map(function (st) {
        var mine = !share && (st.author === me || canDo('editor'))
        return '<figure class="still-c"><button class="still-i" data-sj="' + st.at_sec + '" aria-label="Play from ' + mmss(st.at_sec) + '"><img src="' + st.url + '" alt="" loading="lazy"><i>' + tcf(st.at_sec, +store.get('rs-fps-' + st.version_id)) + '</i></button>' +
          '<figcaption><span>' + esc(st.by) + '</span><a class="ico sm" href="' + st.dl + '" download aria-label="Download this still" title="Download">' + ic('down') + '</a>' + (mine ? '<button class="ico sm danger" data-sdel="' + st.id + '" aria-label="Delete this still" title="Delete">' + ic('trash') + '</button>' : '') + '</figcaption></figure>'
      }).join('') + '</div>' : '<p class="muted" style="padding:10px 8px;margin:0;font-size:14px">No stills yet. Pause on a frame and press Grab still.</p>'
      $$('[data-sj]', box).forEach(function (b) { b.onclick = function () { jump({ id: '', at_sec: +b.dataset.sj }, false) } })
      $$('[data-sdel]', box).forEach(function (b) { b.onclick = function () { var sid = b.dataset.sdel; tview.stills = tview.stills.filter(function (z) { return z.id !== sid }); paintStills(); api('still-delete', { still: sid }).then(function (d) { if (d.error) toast(d.error) }) } })
    }
    // Grab still: the frame on screen at full size, its time written on it, saved as a PNG (Alex, 7 Nov)
    function tc(t) { var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = Math.floor(t % 60), ms = Math.round((t % 1) * 1000); if (ms === 1000) { ms = 0; sec++ } var p2 = function (n) { return (n < 10 ? '0' : '') + n }; return p2(h) + ':' + p2(m) + ':' + p2(sec) + '.' + ('00' + ms).slice(-3) }
    var FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60]
    function snapFps(f) { var best = FPS[0]; FPS.forEach(function (x) { if (Math.abs(x - f) < Math.abs(best - f)) best = x }); return Math.abs(best - f) / best < 0.04 ? best : Math.round(f * 100) / 100 }
    var fpsWait = {}
    function boxes(dv, from, to, cb) { var o = from; while (o + 8 <= to) { var sz = dv.getUint32(o), ty = String.fromCharCode(dv.getUint8(o + 4), dv.getUint8(o + 5), dv.getUint8(o + 6), dv.getUint8(o + 7)), hd = 8; if (sz === 1) { sz = dv.getUint32(o + 8) * 4294967296 + dv.getUint32(o + 12); hd = 16 } else if (sz === 0) sz = to - o; if (sz < hd) break; if (cb(ty, o + hd, Math.min(o + sz, to), o, sz) === false) return; o += sz } }
    function fpsFromMoov(dv, a, b) {
      var out = 0
      boxes(dv, a, b, function (ty, s0, e0) {
        if (ty !== 'trak') return
        var vide = false, ts = 0, best = 0, bestN = 0
        boxes(dv, s0, e0, function (t1, s1, e1) {
          if (t1 !== 'mdia') return
          boxes(dv, s1, e1, function (t2, s2, e2) {
            if (t2 === 'hdlr') vide = String.fromCharCode(dv.getUint8(s2 + 8), dv.getUint8(s2 + 9), dv.getUint8(s2 + 10), dv.getUint8(s2 + 11)) === 'vide'
            if (t2 === 'mdhd') ts = dv.getUint8(s2) === 1 ? dv.getUint32(s2 + 20) : dv.getUint32(s2 + 12)
            if (t2 === 'minf') boxes(dv, s2, e2, function (t3, s3, e3) { if (t3 === 'stbl') boxes(dv, s3, e3, function (t4, s4) { if (t4 === 'stts') { var n = dv.getUint32(s4 + 4); for (var i = 0; i < Math.min(n, 4096); i++) { var c = dv.getUint32(s4 + 8 + i * 8), dl = dv.getUint32(s4 + 12 + i * 8); if (c > bestN) { bestN = c; best = dl } } } }) })
          })
        })
        if (vide && ts && best) { out = snapFps(ts / best); return false }
      })
      return out
    }
    function fileFps(u) {
      var get = function (a, b) { return fetch(u, { headers: { Range: 'bytes=' + a + '-' + b } }).then(function (r) { if (!r.ok && r.status !== 206) throw new Error('range'); return r.arrayBuffer() }) }
      return get(0, 1048575).then(function (buf) {
        var dv = new DataView(buf), moov = null
        boxes(dv, 0, buf.byteLength, function (ty, s0, e0, o, sz) { if (ty === 'moov') { moov = { o: o, sz: sz, inside: o + sz <= buf.byteLength, s0: s0 }; return false } })
        if (moov && moov.inside) return fpsFromMoov(dv, moov.s0, moov.o + moov.sz)
        if (moov) return get(moov.o, moov.o + moov.sz - 1).then(function (b2) { return fpsFromMoov(new DataView(b2), 8, b2.byteLength) })
        // moov after the media data: walk the top boxes by their sizes to find it
        var o = 0, last = null
        boxes(dv, 0, buf.byteLength, function (ty, s0, e0, oo, sz) { last = { o: oo, sz: sz } })
        if (!last) return 0
        o = last.o + last.sz
        var hop = function (at, n) { if (n > 8) return 0; return get(at, at + 15).then(function (h) { var hv = new DataView(h); if (h.byteLength < 8) return 0; var sz = hv.getUint32(0), ty = String.fromCharCode(hv.getUint8(4), hv.getUint8(5), hv.getUint8(6), hv.getUint8(7)); if (sz === 1) sz = hv.getUint32(8) * 4294967296 + hv.getUint32(12); if (ty === 'moov') return get(at, at + sz - 1).then(function (b2) { return fpsFromMoov(new DataView(b2), 8, b2.byteLength) }); return sz > 8 ? hop(at + sz, n + 1) : 0 }) }
        return hop(o, 0)
      }).catch(function () { return 0 })
    }
    function measureFps(x) {
      var key = 'rs-fps-' + x.id, had = +store.get(key); if (had) return Promise.resolve(had)
      if (fpsWait[x.id]) return fpsWait[x.id]
      return (fpsWait[x.id] = urlFor(x).then(function (u) {
        return fileFps(u).then(function (ff) { if (ff) { store.set(key, String(ff)); return ff } return playFps(u, key) })
      }).catch(function () { return 0 }))
    }
    function playFps(u, key) {
        return new Promise(function (res) {
          var m = document.createElement('video'); m.muted = true; m.playsInline = true; m.setAttribute('playsinline', ''); m.crossOrigin = 'anonymous'; m.preload = 'auto'
          m.style.cssText = 'position:fixed;left:-9999px;top:0;width:160px;height:90px;opacity:0;pointer-events:none'; document.body.appendChild(m)
          var times = [], fin = function (f) { try { m.pause(); m.removeAttribute('src'); m.load(); m.remove() } catch (e) {} if (f) store.set(key, String(f)); res(f || 0) }
          var stop = setTimeout(function () { fin(calc()) }, 6000)
          var calc = function () { if (times.length < 6) return 0; var ds = []; for (var i = 1; i < times.length; i++) { var dd = times[i] - times[i - 1]; if (dd > 0.004 && dd < 0.1) ds.push(dd) } if (ds.length < 4) return 0; ds.sort(function (a, b) { return a - b }); return snapFps(1 / ds[Math.floor(ds.length / 5)]) }
          if (!m.requestVideoFrameCallback) { clearTimeout(stop); fin(0); return }
          var tick = function (now, md) { times.push(md.mediaTime); if (times.length >= 16) { clearTimeout(stop); fin(calc()) } else m.requestVideoFrameCallback(tick) }
          m.requestVideoFrameCallback(tick)
          m.src = u; m.addEventListener('loadeddata', function () { var pr = m.play(); if (pr && pr.catch) pr.catch(function () { clearTimeout(stop); fin(0) }) }, { once: true })
        })
    }
    function tcf(t, fps) {
      if (!fps) return tc(t)
      var nom = Math.round(fps), fr = Math.floor(t * fps + 1e-4), ff = fr % nom, all = Math.floor(fr / nom)
      var p2 = function (n) { return (n < 10 ? '0' : '') + n }
      return p2(Math.floor(all / 3600)) + ':' + p2(Math.floor(all % 3600 / 60)) + ':' + p2(all % 60) + ':' + p2(ff)
    }
    function fpsLabel(f) { return f ? (f % 1 ? f.toFixed(3).replace(/0+$/, '') : f) + ' fps' : '' }
    function grabStill() {
      var x = curV(); if (kindOf(x) !== 'video' || !vidEl.videoWidth) { toast('Play the video once, then grab'); return }
      var w = vidEl.videoWidth, h = vidEl.videoHeight, c = document.createElement('canvas'); c.width = w; c.height = h
      var g = c.getContext('2d'); g.drawImage(vidEl, 0, 0, w, h)
      var atNow = vidEl.currentTime
      measureFps(x).then(function (fps) { stampStill(x, c, g, w, h, atNow, fps) })
    }
    function stampStill(x, c, g, w, h, atNow, fps) {
      var t = tcf(atNow, fps) + (fps ? '  ·  ' + fpsLabel(fps) : ''), fs = Math.max(16, Math.round(h / 26)), pad = Math.round(fs * .7)
      g.font = '600 ' + fs + 'px "JetBrains Mono", ui-monospace, Menlo, monospace'
      var tw = g.measureText(t).width, bw = tw + pad * 2, bh = fs + pad * 1.2, bx = pad, by = h - bh - pad
      g.fillStyle = 'rgba(10,8,16,.72)'; if (g.roundRect) { g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2.6); g.fill() } else g.fillRect(bx, by, bw, bh)
      g.fillStyle = '#fcd34d'; g.textBaseline = 'middle'; g.fillText(t, bx + pad, by + bh / 2 + 1)
      var atSec = Math.round(atNow * 1000) / 1000, gb = $('#grab'); if (gb) gb.disabled = true
      var fail = function (m) { toast(m || 'Could not save the still'); if (gb) gb.disabled = false }
      try {
        c.toBlob(function (bl) {
          if (!bl) { fail('This video does not allow a still here'); return }
          api(share ? 'share-still-add' : 'still-add', { version: x.id, at_sec: atSec, width: w, height: h, size: bl.size }).then(function (d) {
            if (!d.put) throw new Error(d.error || 'no address')
            return fetch(d.put, { method: 'PUT', body: bl }).then(function (r) { if (!r.ok) { if (!share) api('still-delete', { still: d.id }); throw new Error('Upload failed (' + r.status + ')') } })
          }).then(function () {
            if (gb) gb.disabled = false
            toast('Still saved in Stills · ' + t)
            var stb = $('#ntab [data-tab="s"]'); if (stb && !stb.classList.contains('on')) stb.click(); else loadStills()
          }).catch(function (e) { fail(e.message) })
        }, 'image/jpeg', 0.93)
      } catch (e) { fail('This video does not allow a still here') }
    }
    // ===== video tools (Alex, 7 Nov): frame steps, masks, drawing, compare, markers =====
    var vs = { mask: store.get('rs-mask') || '', safe: store.get('rs-safe') === '1', social: store.get('rs-social') || '', drawing: [], show: null, draw: false, tool: 'circle', cmp: null }
    // where each app's buttons and captions sit on a vertical video, as parts of the 9:16 frame (top, bottom, left, right)
    var SOCIAL = { reels: ['Instagram Reels', 0.14, 0.35, 0.06, 0.06], tiktok: ['TikTok', 0.08, 0.23, 0.06, 0.13], shorts: ['YouTube Shorts', 0.12, 0.25, 0.06, 0.12] }
    var MASKS = [['', 'None'], ['2.39', '2.39:1'], ['1.85', '1.85:1'], ['1', '1:1'], ['0.8', '4:5'], ['0.5625', '9:16']]
    function fpsNow() { var x = curV(); return +store.get('rs-fps-' + x.id) || 25 }
    function stepFrame(dir) {
      var x = curV(); if (kindOf(x) !== 'video' || audio !== vidEl) return
      audio.pause(); var f = fpsNow(), idx = Math.round(audio.currentTime * f) + dir, dur = audio.duration || x.duration || 0
      audio.currentTime = Math.max(0, Math.min(dur - 0.001, idx / f + 0.001)); vs.show = null; paintOv(); drawWave()
    }
    vstep = stepFrame
    function vrect() {
      var box = $('#media'); if (!box || !vidEl.parentNode) return null
      var b = box.getBoundingClientRect(), e = vidEl.getBoundingClientRect(), ar = vAr(), r = containRect(e.width, e.height, ar)
      return { x: e.left - b.left + r.x, y: e.top - b.top + r.y, w: r.w, h: r.h, bw: b.width, bh: b.height }
    }
    function paintOv() {
      var cv = $('#vov'); if (!cv) return
      var r = vrect(); if (!r) return
      var dp = devicePixelRatio || 1; cv.width = r.bw * dp; cv.height = r.bh * dp
      var g = cv.getContext('2d'); g.setTransform(dp, 0, 0, dp, 0, 0); g.clearRect(0, 0, r.bw, r.bh)
      var a = +vs.mask
      if (a) {
        var va = r.w / r.h, mw = r.w, mh = r.h
        if (a > va) mh = r.w / a; else mw = r.h * a
        var mx = r.x + (r.w - mw) / 2, my = r.y + (r.h - mh) / 2
        g.fillStyle = 'rgba(0,0,0,.72)'
        g.fillRect(r.x, r.y, r.w, my - r.y); g.fillRect(r.x, my + mh, r.w, r.y + r.h - my - mh); g.fillRect(r.x, my, mx - r.x, mh); g.fillRect(mx + mw, my, r.x + r.w - mx - mw, mh)
        g.strokeStyle = 'rgba(250,204,21,.7)'; g.lineWidth = 1; g.strokeRect(mx + .5, my + .5, mw - 1, mh - 1)
        g.font = '600 11px ui-monospace, Menlo, monospace'; g.fillStyle = '#fcd34d'; g.fillText((MASKS.filter(function (m) { return m[0] === vs.mask })[0] || ['', ''])[1], mx + 8, my + 16)
      }
      if (vs.safe) {
        g.setLineDash([5, 4]); g.lineWidth = 1
        ;[[0.93, 'rgba(255,255,255,.55)'], [0.9, 'rgba(250,204,21,.65)']].forEach(function (q) { var w = r.w * q[0], h = r.h * q[0]; g.strokeStyle = q[1]; g.strokeRect(r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h) })
        g.setLineDash([]); g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(r.x + r.w / 2 - 10, r.y + r.h / 2); g.lineTo(r.x + r.w / 2 + 10, r.y + r.h / 2); g.moveTo(r.x + r.w / 2, r.y + r.h / 2 - 10); g.lineTo(r.x + r.w / 2, r.y + r.h / 2 + 10); g.stroke()
      }
      // social guides (Alex, 8 Nov): the 9:16 frame and, in red, where the app's buttons and captions cover the picture
      if (SOCIAL[vs.social]) {
        var S = SOCIAL[vs.social], fw = r.w, fh = r.h
        if (fw / fh > 0.5625) fw = fh * 0.5625; else fh = fw / 0.5625
        var fx = r.x + (r.w - fw) / 2, fy = r.y + (r.h - fh) / 2
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(r.x, r.y, fx - r.x, r.h); g.fillRect(fx + fw, r.y, r.x + r.w - fx - fw, r.h); g.fillRect(fx, r.y, fw, fy - r.y); g.fillRect(fx, fy + fh, fw, r.y + r.h - fy - fh)
        var t = fh * S[1], bo = fh * S[2], l = fw * S[3], rt = fw * S[4]
        g.fillStyle = 'rgba(239,68,68,.28)'
        g.fillRect(fx, fy, fw, t); g.fillRect(fx, fy + fh - bo, fw, bo); g.fillRect(fx, fy + t, l, fh - t - bo); g.fillRect(fx + fw - rt, fy + t, rt, fh - t - bo)
        g.setLineDash([5, 4]); g.strokeStyle = 'rgba(74,222,128,.9)'; g.lineWidth = 1.5; g.strokeRect(fx + l, fy + t, fw - l - rt, fh - t - bo); g.setLineDash([])
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(fx + .5, fy + .5, fw - 1, fh - 1)
        g.font = '600 11px ui-monospace, Menlo, monospace'; g.fillStyle = '#fecaca'; g.fillText(S[0], fx + 8, fy + 16)
        g.fillStyle = '#bbf7d0'; g.fillText('safe for text', fx + l + 6, fy + t + 16)
      }
      drawSketch(g, vs.draw || vs.drawing.length ? vs.drawing : vs.show, r, 1)
      // compare: the second picture covers the right side from the handle on
      if (vs.cmp) {
        var ce = vs.cmp.el, e = vidEl.getBoundingClientRect(), bx = $('#media').getBoundingClientRect()
        ce.style.left = (e.left - bx.left) + 'px'; ce.style.top = (e.top - bx.top) + 'px'; ce.style.width = e.width + 'px'; ce.style.height = e.height + 'px'
        var px = r.x + r.w * vs.cmp.at - (e.left - bx.left), md = cmpMode()
        ce.style.clipPath = md === 'wipe' ? 'inset(0 0 0 ' + Math.max(0, px) + 'px)' : 'none'
        ce.style.opacity = md === 'fade' ? String(vs.cmp.at) : md === 'diff' ? '0' : '1'
        // Difference: both frames drawn on a canvas with the difference blend (CSS blending between two videos is unreliable)
        if (md === 'diff') {
          if (!vs.cmp.cv) { vs.cmp.cv = document.createElement('canvas'); vs.cmp.cv.className = 'cmpc'; $('#media').insertBefore(vs.cmp.cv, vs.cmp.handle) }
          var cv2 = vs.cmp.cv; cv2.hidden = false; cv2.style.left = (r.x) + 'px'; cv2.style.top = r.y + 'px'; cv2.style.width = r.w + 'px'; cv2.style.height = r.h + 'px'
          if (!vs.cmp.raf) { var loop = function () { if (!vs.cmp || cmpMode() !== 'diff') { if (vs.cmp) vs.cmp.raf = 0; return } var c2 = vs.cmp.cv, w2 = Math.round(c2.clientWidth * (devicePixelRatio || 1)), h2 = Math.round(c2.clientHeight * (devicePixelRatio || 1)); if (c2.width !== w2 || c2.height !== h2) { c2.width = w2; c2.height = h2 } var g2 = c2.getContext('2d'); g2.globalCompositeOperation = 'source-over'; try { g2.drawImage(vidEl, 0, 0, w2, h2); g2.globalCompositeOperation = 'difference'; g2.drawImage(vs.cmp.el, 0, 0, w2, h2) } catch (e) {} vs.cmp.raf = requestAnimationFrame(loop) }; vs.cmp.raf = requestAnimationFrame(loop) }
        } else if (vs.cmp.cv) vs.cmp.cv.hidden = true
        var hd = vs.cmp.handle; hd.hidden = md === 'diff'; hd.style.left = (r.x + r.w * vs.cmp.at) + 'px'; hd.style.top = r.y + 'px'; hd.style.height = r.h + 'px'
        vs.cmp.bar.style.left = (r.x + r.w / 2) + 'px'; vs.cmp.bar.style.top = (r.y + r.h - 46) + 'px'
        vs.cmp.la.style.left = (r.x + 10) + 'px'; vs.cmp.la.style.top = (r.y + 10) + 'px'; vs.cmp.lb.style.right = (r.bw - r.x - r.w + 10) + 'px'; vs.cmp.lb.style.top = (r.y + 10) + 'px'
      }
    }
    function drawMode(on) {
      vs.draw = on; var cv = $('#vov'); if (cv) cv.classList.toggle('drawing', on)
      var t = $('#vdt'); if (t) t.hidden = !on
      if ($('#vdraw')) $('#vdraw').classList.toggle('on', on)
      if (on) { audio.pause(); vs.show = null }
      if ($('#cmp-sk')) $('#cmp-sk').hidden = !vs.drawing.length
      paintOv()
    }
    function setupOverlay(box) {
      if ($('#vov', box)) return
      var cv = document.createElement('canvas'); cv.id = 'vov'; cv.className = 'vov'; box.appendChild(cv)
      var bar = document.createElement('div'); bar.id = 'vdt'; bar.className = 'vdt'; bar.hidden = true
      bar.innerHTML = '<button class="ico sm" data-tool="circle" aria-label="Circle" title="Circle">' + ic('circle') + '</button><button class="ico sm" data-tool="arrow" aria-label="Arrow" title="Arrow">' + ic('arrow') + '</button><button class="ico sm" data-tool="pen" aria-label="Pen" title="Pen">' + ic('pen') + '</button><i></i><button class="ico sm" data-do="undo" aria-label="Undo" title="Undo">' + ic('undo') + '</button><button class="ico sm" data-do="clear" aria-label="Clear" title="Clear">' + ic('trash') + '</button><button class="btn sm main" data-do="done">Done</button>'
      box.appendChild(bar)
      var tools = function () { $$('[data-tool]', bar).forEach(function (b) { b.classList.toggle('on', b.dataset.tool === vs.tool) }) }; tools()
      bar.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return
        if (b.dataset.tool) { vs.tool = b.dataset.tool; tools() }
        if (b.dataset.do === 'undo') vs.drawing.pop()
        if (b.dataset.do === 'clear') vs.drawing = []
        if (b.dataset.do === 'done') { drawMode(false); if ($('#cmp-t')) $('#cmp-t').focus() }
        if ($('#cmp-sk')) $('#cmp-sk').hidden = !vs.drawing.length
        paintOv()
      }
      var cur2 = null
      var norm = function (e) { var r = vrect(), b = $('#media').getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - b.left - r.x) / r.w)), Math.max(0, Math.min(1, (e.clientY - b.top - r.y) / r.h))] }
      cv.addEventListener('pointerdown', function (e) { if (!vs.draw) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); var q = norm(e); cur2 = { t: vs.tool, p: [q, q] }; vs.drawing.push(cur2); paintOv() })
      cv.addEventListener('pointermove', function (e) { if (!cur2) return; var q = norm(e); if (cur2.t === 'pen') { var l = cur2.p[cur2.p.length - 1]; if (Math.abs(l[0] - q[0]) + Math.abs(l[1] - q[1]) > 0.004 && cur2.p.length < 400) cur2.p.push(q) } else cur2.p[1] = q; paintOv() })
      var up = function () { if (!cur2) return; if (cur2.t === 'pen' && cur2.p.length > 2) cur2.p.shift(); cur2 = null; if ($('#cmp-sk')) $('#cmp-sk').hidden = !vs.drawing.length }
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up)
      cv.addEventListener('click', function () { if (!vs.draw) pb.click() })
      if ('ResizeObserver' in window) new ResizeObserver(function () { paintOv() }).observe(box)
      vidEl.addEventListener('loadedmetadata', paintOv)
      vidEl.addEventListener('play', function () { if (vs.show) { vs.show = null; paintOv() } })
    }
    function maskMenu(btn) {
      var old = $('.vpop'); if (old) { old.remove(); return }
      var pop = document.createElement('div'); pop.className = 'vpop glass'
      pop.innerHTML = MASKS.map(function (m) { return '<button class="' + (vs.mask === m[0] ? 'on' : '') + '" data-m="' + m[0] + '">' + m[1] + '</button>' }).join('') + '<i></i><button class="' + (vs.safe ? 'on' : '') + '" data-safe>Safe areas</button><i></i>' + Object.keys(SOCIAL).map(function (k) { return '<button class="' + (vs.social === k ? 'on' : '') + '" data-soc="' + k + '">' + SOCIAL[k][0] + '</button>' }).join('')
      btn.parentNode.appendChild(pop)
      pop.style.left = (btn.offsetLeft + btn.offsetWidth / 2) + 'px'
      pop.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return
        if (b.hasAttribute('data-safe')) { vs.safe = !vs.safe; store.set('rs-safe', vs.safe ? '1' : '0') } else if (b.dataset.soc) { vs.social = vs.social === b.dataset.soc ? '' : b.dataset.soc; store.set('rs-social', vs.social) } else { vs.mask = b.dataset.m; store.set('rs-mask', vs.mask) }
        btn.classList.toggle('on', !!(vs.mask || vs.safe || vs.social)); pop.remove(); paintOv()
      }
      setTimeout(function () { document.addEventListener('click', function away(e) { if (!pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { pop.remove(); document.removeEventListener('click', away) } }) })
    }
    function cmpMode() { var m = store.get('rs-cmpm'); return m === 'diff' || m === 'fade' ? m : 'wipe' }
    function cmpModes(after) {
      var bar = document.createElement('div'); bar.className = 'cmpm'
      var M = [['wipe', 'Wipe', 'Drag the line to show one version on each side'], ['fade', 'Fade', 'Drag the line to fade from one version to the other'], ['diff', 'Difference', 'Only what changed between the versions shows bright']]
      bar.innerHTML = M.map(function (m) { return '<button type="button" data-cm="' + m[0] + '" title="' + m[2] + '"' + (cmpMode() === m[0] ? ' class="on"' : '') + '>' + m[1] + '</button>' }).join('')
      bar.addEventListener('pointerdown', function (e) { e.stopPropagation() })
      bar.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); store.set('rs-cmpm', b.dataset.cm); $$('button', bar).forEach(function (x) { x.classList.toggle('on', x === b) }); after() }
      return bar
    }
    function vidVersions() { return versions.filter(function (q) { return kindOf(q) === 'video' }) }
    function compareOff() {
      if (!vs.cmp) return
      try { vs.cmp.el.pause(); vs.cmp.el.removeAttribute('src'); vs.cmp.el.load() } catch (e) {}
      if (vs.cmp.raf) cancelAnimationFrame(vs.cmp.raf)
      ;[vs.cmp.el, vs.cmp.handle, vs.cmp.la, vs.cmp.lb, vs.cmp.bar, vs.cmp.cv].forEach(function (n) { if (n) n.remove() }); vs.cmp = null
      if ($('#media')) $('#media').classList.remove('cmp-on')
      if ($('#vcmp')) $('#vcmp').classList.remove('on'); paintOv()
    }
    function compareOn(otherId) {
      compareOff()
      var x = curV(), list = vidVersions().filter(function (q) { return q.id !== x.id }); if (!list.length) return
      var other = list.filter(function (q) { return q.id === otherId })[0] || list.filter(function (q) { return q.n < x.n }).pop() || list[0]
      var box = $('#media'), el = document.createElement('video'); el.className = 'cmpv'; el.muted = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.crossOrigin = 'anonymous'; el.preload = 'auto'
      var handle = document.createElement('div'); handle.className = 'cmph'; handle.innerHTML = '<span>' + ic('split') + '</span>'
      var la = document.createElement('b'); la.className = 'cmpl'; la.textContent = vname(x)
      var lb = document.createElement('button'); lb.className = 'cmpl r'; lb.title = 'Pick the version on the right'; lb.textContent = vname(other) + (list.length > 1 ? ' ▾' : '')
      var bar = cmpModes(function () { paintOv() })
      box.appendChild(el); box.appendChild(handle); box.appendChild(la); box.appendChild(lb); box.appendChild(bar)
      vs.cmp = { el: el, handle: handle, la: la, lb: lb, bar: bar, at: 0.5, v: other }
      box.classList.add('cmp-on')
      lb.onclick = function () { var i = list.indexOf(other); compareOn(list[(i + 1) % list.length].id) }
      handle.addEventListener('pointerdown', function (e) {
        e.preventDefault(); handle.setPointerCapture(e.pointerId)
        var mv = function (ev) { var r = vrect(), b = box.getBoundingClientRect(); vs.cmp.at = Math.max(0.02, Math.min(0.98, (ev.clientX - b.left - r.x) / r.w)); paintOv() }
        var en = function () { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', en) }
        handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', en)
      })
      urlFor(other).then(function (u) { if (!vs.cmp || vs.cmp.el !== el) return; el.src = u; el.addEventListener('loadeddata', function () { el.currentTime = vidEl.currentTime; paintOv() }, { once: true }) })
      if ($('#vcmp')) $('#vcmp').classList.add('on'); paintOv()
    }
    function syncCompare() {
      if (!vs.cmp) return
      var el = vs.cmp.el; if (el.readyState < 1) return
      if (Math.abs(el.currentTime - vidEl.currentTime) > (vidEl.paused ? 0.02 : 0.12)) { try { el.currentTime = vidEl.currentTime } catch (e) {} }
      if (el.playbackRate !== vidEl.playbackRate) el.playbackRate = vidEl.playbackRate
      if (vidEl.paused && !el.paused) el.pause(); else if (!vidEl.paused && el.paused) { var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}) }
    }
    // the notes as markers for the edit: Resolve (EDL), Premiere (XML), a spreadsheet (CSV)
    function exportMarkers() {
      var x = curV(), list = tview.notes.filter(function (c) { return c.version_id === x.id && !c.parent_id && c.at_sec != null }).sort(function (a, b) { return a.at_sec - b.at_sec })
      if (!list.length) { toast('No notes with a time on this version yet'); return }
      measureFps(x).then(function (f0) {
        var f = f0 || 25, nom = Math.round(f), ntsc = Math.abs(f - nom) > 0.01, title = (track.title + ' ' + vname(x)).replace(/[^\w .-]+/g, '').trim() || 'Notes'
        var one = function (c) { var n = nameOf(c); return (n.name + ': ' + c.body).replace(/[\r\n|]+/g, ' ').slice(0, 250) }
        var hour = 3600 * nom
        var fr = function (t) { return Math.floor(t * f + 1e-4) }
        var tcOf = function (frames) { var p2 = function (v) { return (v < 10 ? '0' : '') + v }, ff = frames % nom, all = Math.floor(frames / nom); return p2(Math.floor(all / 3600)) + ':' + p2(Math.floor(all % 3600 / 60)) + ':' + p2(all % 60) + ':' + p2(ff) }
        var edl = 'TITLE: ' + title + '\nFCM: NON-DROP FRAME\n\n' + list.map(function (c, i) { var a = tcOf(hour + fr(c.at_sec)), b = tcOf(hour + fr(c.at_sec) + 1), no = ('00' + (i + 1)).slice(-3); return no + '  001      V     C        ' + a + ' ' + b + ' ' + a + ' ' + b + '\n |C:ResolveColor' + (c.done ? 'Green' : 'Yellow') + ' |M:' + one(c) + ' |D:1\n' }).join('\n')
        var xe = function (v) { return String(v).replace(/[<>&"]/g, function (ch) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch] }) }
        var rate = '<rate><timebase>' + nom + '</timebase><ntsc>' + (ntsc ? 'TRUE' : 'FALSE') + '</ntsc></rate>'
        var dur = Math.ceil((x.duration || audio.duration || 60) * f)
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="rts-notes"><name>' + xe(title) + '</name><duration>' + dur + '</duration>' + rate + '<timecode>' + rate + '<string>01:00:00:00</string><frame>' + hour + '</frame><displayformat>NDF</displayformat></timecode><media><video><format><samplecharacteristics>' + rate + '<width>' + (x.width || 1920) + '</width><height>' + (x.height || 1080) + '</height></samplecharacteristics></format><track></track></video></media>' +
          list.map(function (c) { var n = nameOf(c); return '<marker><name>' + xe(n.name) + '</name><comment>' + xe(c.body) + '</comment><in>' + fr(c.at_sec) + '</in><out>-1</out></marker>' }).join('') + '</sequence></xmeml>\n'
        var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"' }
        var csv = 'Timecode,Seconds,Author,Note,Status\n' + list.map(function (c) { return [tcOf(fr(c.at_sec)), c.at_sec, nameOf(c).name, c.body, c.done ? 'Done' : 'Open'].map(q).join(',') }).join('\n') + '\n'
        var save = function (txt, name, type) { var u = URL.createObjectURL(new Blob([txt], { type: type })), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u) }, 4000) }
        modal('<div class="spread"><h2>Markers for the edit</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><p class="muted" style="margin:0">' + list.length + ' note' + (list.length === 1 ? '' : 's') + ' at ' + fpsLabel(f) + (f0 ? '' : ' (taken as 25)') + ', timeline starting at 01:00:00:00.</p><div class="opts"><button class="btn" id="mk-edl">' + ic('down') + ' DaVinci Resolve (.edl)</button><button class="btn" id="mk-xml">' + ic('down') + ' Premiere Pro (.xml)</button><button class="btn" id="mk-csv">' + ic('down') + ' Spreadsheet (.csv)</button></div><p class="muted" style="margin:0;font-size:12.5px">Resolve: right-click the timeline > Timelines > Import > Timeline Markers from EDL. Premiere: File > Import the .xml, the markers come on a new sequence.</p>', function (m) {
          $('#mk-edl', m).onclick = function () { save(edl, title + ' markers.edl', 'text/plain') }
          $('#mk-xml', m).onclick = function () { save(xml, title + ' markers.xml', 'application/xml') }
          $('#mk-csv', m).onclick = function () { save(csv, title + ' notes.csv', 'text/csv') }
        })
      })
    }
    // ===== sound tools (Alex, 8 Nov): A/B, a note over a stretch, the streaming check, spoken notes, stems =====
    var ab = null, abWarm = {}
    function audVersions() { return versions.filter(function (q) { return kindOf(q) === 'audio' }) }
    function warm(id) { var v = versions.filter(function (q) { return q.id === id })[0]; if (!v || abWarm[id]) return; urlFor(v).then(function (u) { var w = new Audio(); w.preload = 'auto'; w.crossOrigin = 'anonymous'; w.muted = true; w.src = u; abWarm[id] = w }) }
    function paintAB() {
      if ($('#abtn')) $('#abtn').classList.toggle('on', !!ab)
      $$('#vers [data-v]').forEach(function (b) { var i = ab ? ab.list.indexOf(b.dataset.v) : -1; b.dataset.ab = i >= 0 ? 'ABCDEFGH'[i] || '' : '' })
    }
    function abToggle() {
      if (ab) { ab = null; paintAB(); return }
      var list = audVersions().map(function (q) { return q.id }); if (list.length < 2) return
      ab = { list: list, a: list[0], b: list[1] }; list.forEach(warm); paintAB()
      toast('A/B on · Space goes ' + audVersions().map(function (q, i) { return 'ABCDEFGH'[i] }).join(' → ') + ' at the same point')
    }
    vspace = function () {
      if (!ab || !document.body.contains(wv)) return false
      var i = ab.list.indexOf(tview.version); setVersion(ab.list[(i + 1) % ab.list.length], true); paintAB(); return true
    }
    function paintRange() {
      var b = $('#cmp-rng'); if (!b) return
      b.classList.toggle('on', !!tview.range); b.classList.toggle('live', !!(tview.range && tview.range.b == null))
    }
    // the streaming check: what each service does to this mix, and whether the true peak is safe for encoding
    var PLAT = [['Spotify', -14, 'up'], ['Apple Music', -16, 'up'], ['YouTube', -14, 'down'], ['Tidal', -14, 'down'], ['Amazon Music', -14, 'down']]
    function getTP(x) {
      if (x.true_peak != null) return Promise.resolve(x.true_peak)
      var k = 'rs-tp-' + x.id, had = store.get(k); if (had) return Promise.resolve(+had)
      if (x.size > 600 * 1024 * 1024 || !window.RSAudio || !RSAudio.truePeak) return Promise.resolve(null)
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return Promise.resolve(null)
      return urlFor(x).then(function (u) { return fetch(u) }).then(function (r) { return r.arrayBuffer() }).then(function (buf) {
        var c2 = new AC()
        return new Promise(function (ok, no) { c2.decodeAudioData(buf, ok, no) }).then(function (abuf) {
          var ch = []; for (var i = 0; i < abuf.numberOfChannels; i++) ch.push(abuf.getChannelData(i))
          var tp = RSAudio.truePeak(ch); try { c2.close() } catch (e) {} if (tp != null) store.set(k, String(tp)); return tp
        })
      }).catch(function () { return null })
    }
    function streamCheck() {
      var x = curV()
      var m = modal('<div class="spread"><h2>Streaming check</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div id="sc-b"><div class="spin"></div><p class="muted" style="text-align:center;margin:0">Measuring the true peak…</p></div>')
      getTP(x).then(function (tp) {
        var box = $('#sc-b', m); if (!box) return
        var L = x.lufs
        if (L == null) { box.innerHTML = '<p class="muted">This version has no loudness reading yet.</p>'; return }
        var f1 = function (v) { return (v > 0 ? '+' : '') + v.toFixed(1) }
        var rows = PLAT.map(function (pl) {
          var diff = pl[1] - L, say, cls
          if (diff < -0.05) { say = 'Turned down ' + Math.abs(diff).toFixed(1) + ' dB'; cls = 'dn' }
          else if (diff > 0.05) {
            if (pl[2] === 'up' && tp != null) { var room = Math.max(0, -1 - tp), up = Math.min(diff, room); say = up > 0.05 ? 'Turned up ' + up.toFixed(1) + ' dB' + (up < diff - 0.05 ? ' (held back by the peak)' : '') : 'Plays as it is (no room to turn it up)'; cls = up > 0.05 ? 'up' : 'eq' }
            else { say = 'Plays as it is, ' + diff.toFixed(1) + ' dB quieter than the rest'; cls = 'eq' }
          } else { say = 'Plays as it is'; cls = 'eq' }
          return '<div class="sc-row"><b>' + pl[0] + '</b><span class="muted mono">' + pl[1] + ' LUFS</span><span class="sc-' + cls + '">' + say + '</span></div>'
        }).join('')
        var tpLine = tp == null ? '<div class="sc-tp"><span class="muted">True peak could not be measured here; sample peak ' + (x.peak_db != null ? x.peak_db.toFixed(1) + ' dBFS' : '–') + '.</span></div>'
          : tp > -1 ? '<div class="sc-tp bad">' + ic('x') + '<span><b>True peak ' + f1(tp) + ' dBTP</b> · over −1 dBTP: it can distort when it is encoded for streaming. Lower the limiter ceiling to −1.</span></div>'
          : '<div class="sc-tp ok">' + ic('check') + '<span><b>True peak ' + f1(tp) + ' dBTP</b> · safe for encoding (−1 dBTP or lower).</span></div>'
        box.innerHTML = '<div class="sc-head"><div><small>Loudness</small><b class="mono">' + L.toFixed(1) + ' LUFS</b></div><div><small>True peak</small><b class="mono">' + (tp == null ? '–' : f1(tp) + ' dBTP') + '</b></div><div><small>Version</small><b>' + esc(vname(x)) + '</b></div></div>' + tpLine + '<div class="sc-rows">' + rows + '</div><p class="muted" style="margin:0;font-size:12px">Each service turns songs to its own loudness. Apple Music and Spotify may turn a quiet song up only as far as its peak allows; YouTube, Tidal and Amazon only turn loud songs down.</p>'
      })
    }
    // spoken notes: hold the microphone (or click to start and to stop)
    var rec = null, vAudio = null, vBtn = null
    function micPaint() {
      var b = $('#cmp-mic'); if (!b) return
      b.classList.toggle('rec', !!rec); $('#cmp-mic-t').textContent = rec ? mmss((Date.now() - rec.t0) / 1000) : ''
    }
    function micStart(atv) {
      if (rec) return
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { toast('This browser cannot record sound'); return }
      rec = { pending: true, t0: Date.now(), at: atv }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        if (!rec) { stream.getTracks().forEach(function (t) { t.stop() }); return }
        var mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].filter(function (q) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(q) })[0] || ''
        var mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined), chunks = []
        rec.mr = mr; rec.stream = stream; rec.pending = false; rec.t0 = Date.now()
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data) }
        mr.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop() })
          var sec = (Date.now() - rec.t0) / 1000, at0 = rec.at, type = mr.mimeType || mt || 'audio/webm'; clearInterval(rec.timer); rec = null; micPaint()
          if (sec < 0.7) { toast('Too short: hold the microphone while you speak'); return }
          sendVoice(new Blob(chunks, { type: type }), sec, at0)
        }
        if (!audio.paused) audio.pause()
        mr.start(250); rec.timer = setInterval(micPaint, 250); rec.max = setTimeout(micStop, 180000); micPaint()
        if (rec.stopAsked) micStop()
      }).catch(function () { rec = null; micPaint(); toast('The microphone is not allowed in this browser') })
    }
    function micStop() { if (!rec) return; if (rec.pending) { rec.stopAsked = true; return } if (rec.stopping) return; rec.stopping = true; clearTimeout(rec.max); try { rec.mr.stop() } catch (e) {} }
    function sendVoice(blob, sec, atv) {
      if (share && !store.get('rs-guest')) { askName(function () { sendVoice(blob, sec, atv) }); return }
      var x = curV(), body = ($('#cmp-t') ? $('#cmp-t').value.trim() : '')
      toast('Sending the spoken note…')
      api(share ? 'share-voice-add' : 'voice-add', { version: x.id, type: blob.type }).then(function (d) {
        if (!d.put) throw new Error(d.error || 'no address')
        return fetch(d.put, { method: 'PUT', body: blob }).then(function (r) { if (!r.ok) throw new Error('Upload failed (' + r.status + ')'); return d.key })
      }).then(function (key) {
        var row = { version: x.id, body: body, at_sec: atv, voice: key, voice_sec: Math.round(sec * 10) / 10 }
        return share ? api('share-comment', Object.assign({ name: store.get('rs-guest') }, row)).then(function (d) { if (d.error) throw new Error(d.error); share.data.comments.push(d.comment); return d.comment })
          : sb.from('roarstudio_comments').insert({ version_id: x.id, project_id: ctx.project.id, body: body, at_sec: atv, author: session.user.id, voice: key, voice_sec: row.voice_sec }).select().single().then(function (r) { if (r.error) throw new Error(r.error.message); return r.data })
      }).then(function (c) { tview.notes.push(c); if ($('#cmp-t')) $('#cmp-t').value = ''; paintNotes(); toast('Spoken note posted') }).catch(function (e) { toast(e.message) })
    }
    function playVoice(b) {
      if (vBtn === b && vAudio && !vAudio.paused) { vAudio.pause(); return }
      if (!vAudio) { vAudio = new Audio(); vAudio.onplay = vAudio.onpause = vAudio.onended = function () { $$('#nlist .vnote').forEach(function (q) { q.classList.toggle('on', q === vBtn && !vAudio.paused); q.querySelector('svg').outerHTML = ic(q === vBtn && !vAudio.paused ? 'pause' : 'play') }) } }
      vBtn = b
      api(share ? 'share-voice-url' : 'voice-url', { comment: b.dataset.vo }).then(function (d) { if (!d.url) throw new Error(d.error || 'not found'); if (!audio.paused) audio.pause(); vAudio.src = d.url; return vAudio.play() }).catch(function (e) { toast(e.message || 'Could not play it') })
    }
    // stems: the parts of the version played together, each with mute, solo and its own level
    var stemSt = { list: null, v: null, els: [], timer: null, mute: {}, solo: {}, vol: {} }
    function stemsStop() { stemSt.wait = false; stemSt.els.forEach(function (el) { try { el.pause(); el.playbackRate = 1 } catch (e) {} }); if ($('#stem-tm')) $('#stem-tm').classList.remove('buf'); clearInterval(stemSt.timer); stemSt.timer = null; var pp = $('#stem-pp'); if (pp) pp.innerHTML = ic('play') }
    function stemsDrop() { stemsStop(); stemSt.els.forEach(function (el) { el.removeAttribute('src'); try { el.load() } catch (e) {} }); stemSt.els = []; stemSt.list = null }
    function stemsToggle() {
      var pn = $('#stemp'); pn.hidden = !pn.hidden; $('#stems').classList.toggle('on', !pn.hidden)
      if (!pn.hidden) loadStems(); else stemsStop()
    }
    function loadStems() {
      var x = curV(), pn = $('#stemp'); if (!pn) return
      if (stemSt.v !== x.id) { stemsDrop(); stemSt.v = x.id }
      pn.innerHTML = '<div class="spin"></div>'
      api(share ? 'share-stems' : 'stems', { version: x.id }).then(function (d) { if (curV() !== x) return; stemSt.list = d.stems || []; paintStems() }).catch(function (e) { pn.innerHTML = '<p class="muted">' + esc(e.message) + '</p>' })
    }
    function stemMix() {
      var anySolo = Object.keys(stemSt.solo).some(function (k) { return stemSt.solo[k] })
      ;(stemSt.play || []).forEach(function (st, i) { var el = stemSt.els[i]; if (!el) return; el.muted = anySolo ? !stemSt.solo[st.id] : !!stemSt.mute[st.id]; el.volume = stemSt.vol[st.id] == null ? 1 : stemSt.vol[st.id] })
    }
    // stems and the song's other files (Alex, 9 Nov): the playable ones play together; MIDI and anything else is kept for
    // download; any of them can be downloaded alone, a chosen few, or all as one .zip
    function stemExt(st) { try { return (decodeURIComponent(new URL(st.url).pathname).match(/\.[a-z0-9]{2,5}$/i) || [''])[0].toLowerCase() } catch (e) { return '' } }
    function stemPlays(st) { var e = stemExt(st), m = String(st.mime || ''); return !/mid/.test(m) && !/^\.(mid|midi|kar)$/.test(e) && (/^audio\//.test(m) || /^\.(wav|wave|aif|aiff|flac|mp3|m4a|aac|ogg|opus)$/.test(e)) }
    function saveUrl(url, name) {
      return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('Could not download (' + r.status + ')'); return r.blob() }).then(function (b) {
        var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u) }, 4000)
      }).catch(function (e) { toast(e.message) })
    }
    function paintStems() {
      var pn = $('#stemp'), x = curV(), all = stemSt.list || [], ed = edit && !share
      var list = stemSt.play = all.filter(stemPlays), other = all.filter(function (st) { return !stemPlays(st) })
      stemSt.pick = stemSt.pick || {}
      var row = function (st, playable) {
        return '<div class="stem' + (playable ? '' : ' sfile') + '"><label class="spick" title="Pick for download"><input type="checkbox" data-pk="' + st.id + '"' + (stemSt.pick[st.id] ? ' checked' : '') + '><i></i></label>' +
          (playable ? '' : '<span class="sft">' + ic(/mid/.test(stemExt(st)) ? 'music' : 'file') + '</span>') + '<span class="nm" title="' + esc(st.name) + '">' + esc(st.name) + (playable ? '' : ' <small>' + esc((stemExt(st).slice(1) || 'file').toUpperCase()) + ' · ' + size(st.size) + '</small>') + '</span>' +
          (playable ? '<button class="ms' + (stemSt.mute[st.id] ? ' on' : '') + '" data-mu="' + st.id + '" title="Mute">M</button><button class="ms so' + (stemSt.solo[st.id] ? ' on' : '') + '" data-so="' + st.id + '" title="Solo">S</button><input type="range" min="0" max="1" step="0.01" value="' + (stemSt.vol[st.id] == null ? 1 : stemSt.vol[st.id]) + '" data-vol="' + st.id + '" aria-label="Level of ' + esc(st.name) + '">' : '<span class="grow"></span>') +
          '<button class="ico sm" data-sdl="' + st.id + '" aria-label="Download ' + esc(st.name) + '" title="Download">' + ic('down') + '</button>' +
          (ed ? '<button class="ico sm danger" data-sd="' + st.id + '" aria-label="Delete ' + esc(st.name) + '">' + ic('trash') + '</button>' : '') + '</div>'
      }
      var picked = all.filter(function (st) { return stemSt.pick[st.id] })
      pn.innerHTML = '<div class="stem-h"><b>' + ic('stems') + ' Stems &amp; files</b><span class="muted">' + esc(vname(x)) + ' · ' + all.length + '</span><span class="grow"></span>' +
        (all.length ? '<button class="btn sm" id="stem-dlp"' + (picked.length ? '' : ' hidden') + '>' + ic('down') + ' Download ' + picked.length + '</button><button class="btn sm" id="stem-dla">' + ic('down') + ' Download all</button>' : '') +
        (ed ? '<button class="btn sm" id="stem-add">' + ic('plus') + ' Add stems or files</button><input type="file" id="stem-f" multiple hidden>' : '') + '</div>' +
        (list.length ? '<div class="stem-t"><button class="play" id="stem-pp" aria-label="Play the stems">' + ic('play') + '</button><div class="stem-bar" id="stem-bar"><i></i></div><span class="mono" id="stem-tm">0:00</span></div>' +
          '<div class="stem-list">' + list.map(function (st) { return row(st, true) }).join('') + '</div>' : '') +
        (other.length ? '<div class="stem-sub">MIDI and other files</div><div class="stem-list">' + other.map(function (st) { return row(st, false) }).join('') + '</div>' : '') +
        (!all.length ? '<p class="muted" style="margin:0;font-size:13.5px">No stems yet.' + (ed ? ' Add vocals, drums, bass and the rest (they play together, each with mute and solo), and the MIDI or any other file of the song.' : '') + '</p>' : '')
      if (ed) { $('#stem-add').onclick = function () { $('#stem-f').click() }; $('#stem-f').onchange = function () { var fs = [].slice.call(this.files); this.value = ''; fs.forEach(function (f) { uploadFile(f, { project: ctx.project.id, stemOf: x.id, title: f.name, onDone: function () { loadStems() } }) }) } }
      var nameOf2 = function (st) { return (st.name || 'stem').replace(/[\\/:*?"<>|]/g, ' ').trim() + stemExt(st) }
      var asFiles = function (arr) { return arr.map(function (st, k) { return { url: st.url, file_name: nameOf2(st), size: st.size, n: k + 1, label: '', name: st.name } }) }
      var zipName = (ctx.project.title + ' - ' + (track.title || '') + ' - ' + vname(x) + ' stems').trim()
      $$('[data-pk]', pn).forEach(function (c) { c.onchange = function () { stemSt.pick[c.dataset.pk] = c.checked; var n = all.filter(function (st) { return stemSt.pick[st.id] }).length, b = $('#stem-dlp', pn); b.hidden = !n; b.innerHTML = ic('down') + ' Download ' + n } })
      $$('[data-sdl]', pn).forEach(function (b) { b.onclick = function () { var st = all.filter(function (q) { return q.id === b.dataset.sdl })[0]; if (st) saveUrl(st.url, nameOf2(st)) } })
      if ($('#stem-dla', pn)) $('#stem-dla', pn).onclick = function () { zipAll(asFiles(all), function (v) { return v.name }, zipName, this) }
      if ($('#stem-dlp', pn)) $('#stem-dlp', pn).onclick = function () { zipAll(asFiles(all.filter(function (st) { return stemSt.pick[st.id] })), function (v) { return v.name }, zipName, this) }
      $$('[data-mu]', pn).forEach(function (b) { b.onclick = function () { stemSt.mute[b.dataset.mu] = !stemSt.mute[b.dataset.mu]; b.classList.toggle('on'); stemMix() } })
      $$('[data-so]', pn).forEach(function (b) { b.onclick = function () { stemSt.solo[b.dataset.so] = !stemSt.solo[b.dataset.so]; b.classList.toggle('on'); stemMix() } })
      $$('[data-vol]', pn).forEach(function (r) { r.oninput = function () { stemSt.vol[r.dataset.vol] = +r.value; stemMix() } })
      $$('[data-sd]', pn).forEach(function (b) { b.onclick = function () { confirmBox('Delete this stem?', 'It leaves the version for everyone.', 'Delete', function () { stemsDrop(); return api('stem-delete', { stem: b.dataset.sd }).then(function () { loadStems() }) }) } })
      if (!list.length) return
      var ensure = function () {
        if (stemSt.els.length === list.length) return
        stemSt.els = list.map(function (st) { var el = new Audio(); el.crossOrigin = 'anonymous'; el.preload = 'auto'; el.src = st.url; return el })
        stemMix()
      }
      // in step without jumps: a stem a little ahead or behind plays a touch slower or faster until it is back (a jump made
      // it load again, which was the sticking); only a stem far out is moved. If one runs out of sound, all wait for it.
      var allReady = function () { return stemSt.els.every(function (el) { return el.readyState >= 3 }) }
      var tickS = function () {
        var m = stemSt.els[0]; if (!m || !$('#stem-bar')) { stemsStop(); return }
        if (stemSt.wait) {
          if (allReady()) { stemSt.wait = false; var t1 = m.currentTime; stemSt.els.forEach(function (el) { if (Math.abs(el.currentTime - t1) > 0.05) { try { el.currentTime = t1 } catch (e) {} } var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}) }); $('#stem-tm').classList.remove('buf') }
          return
        }
        if (stemSt.els.some(function (el) { return el.readyState < 3 && !el.ended })) { stemSt.wait = true; stemSt.els.forEach(function (el) { el.pause() }); $('#stem-tm').classList.add('buf'); return }
        stemSt.els.forEach(function (el, i) {
          if (!i) return
          var dr = el.currentTime - m.currentTime
          if (Math.abs(dr) > 0.4) { try { el.currentTime = m.currentTime + 0.02 } catch (e) {} el.playbackRate = 1 }
          else if (Math.abs(dr) > 0.012) el.playbackRate = Math.max(0.95, Math.min(1.05, 1 - dr * 1.5))
          else if (el.playbackRate !== 1) el.playbackRate = 1
        })
        var dur = m.duration || 0; $('#stem-bar i').style.width = (dur ? m.currentTime / dur * 100 : 0) + '%'; $('#stem-tm').textContent = mmss(m.currentTime)
        if (m.ended) stemsStop()
      }
      $('#stem-pp').onclick = function () {
        ensure()
        if (stemSt.timer) { stemsStop(); return }
        if (!audio.paused) audio.pause()
        var t0 = stemSt.els[0].currentTime || 0
        stemSt.els.forEach(function (el) { el.playbackRate = 1; try { el.currentTime = t0 } catch (e) {} })
        // start only when every stem has sound ready, all at once
        stemSt.wait = true; $('#stem-tm').classList.add('buf')
        stemSt.timer = setInterval(tickS, 100); this.innerHTML = ic('pause'); tickS()
      }
      $('#stem-bar').onclick = function (e) {
        ensure(); var r = this.getBoundingClientRect(), m = stemSt.els[0], go = function () { var tt = (e.clientX - r.left) / r.width * (m.duration || 0); stemSt.els.forEach(function (el) { try { el.currentTime = tt } catch (x2) {} }); tickS() }
        if (m.readyState >= 1) go(); else m.addEventListener('loadedmetadata', go, { once: true })
      }
    }
    // ===== picture tools (Alex, 8 Nov) =====
    function imgVersions() { return versions.filter(function (q) { return kindOf(q) === 'image' }) }
    function paintPPins() {
      var box = $('#ppins'); if (!box) return
      var list = topNotes().filter(function (c) { return c.pos }), n = 0
      box.innerHTML = list.map(function (c) { n++; return '<button class="ppin" data-pp="' + c.id + '" style="left:' + (c.pos.x * 100) + '%;top:' + (c.pos.y * 100) + '%" title="' + esc(nameOf(c).name + ': ' + (c.body || '')) + '"><span>' + n + '</span></button>' }).join('') +
        (tview.ppos ? '<span class="ppin new" style="left:' + (tview.ppos.x * 100) + '%;top:' + (tview.ppos.y * 100) + '%"><span>+</span></span>' : '')
      $$('[data-pp]', box).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var el = $('#nlist > [data-n="' + b.dataset.pp + '"]'); $$('#nlist > .note').forEach(function (q) { q.classList.toggle('on', q === el) }); if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash') } $$('.ppin', box).forEach(function (q) { q.classList.toggle('on', q === b) }) } })
      // the note's number beside its name
      var k = 0; list.forEach(function (c) { k++; var el = $('#nlist > [data-n="' + c.id + '"] .who'); if (el && !el.querySelector('.pnum')) el.insertAdjacentHTML('afterbegin', '<span class="pnum">' + k + '</span>') })
    }
    var loupeOn = false, pcmp = null, pinMode = false
    function setPin(on) { pinMode = on; var b = $('#ppinb'); if (b) b.classList.toggle('on', on); var w = $('#pwrap'); if (w) w.classList.toggle('pinning', on); if (on) toast('Click the spot the note is about') }
    // the picture big: fit to the screen, a click for 100% (drag to look around), its notes as pins, Pin a note from here too
    function picView(x) {
      var im0 = $('#still'); if (!im0 || !im0.src) return
      var o = document.createElement('div'); o.className = 'plb'
      o.innerHTML = '<div class="plb-bar"><b>' + esc(vname(x)) + '</b><span class="grow"></span>' + (canDo('commenter') ? '<button class="btn sm" id="plb-pin">' + ic('pin') + ' Pin a note</button>' : '') + '<button class="btn sm" id="plb-z">' + ic('loupe') + ' 100%</button><button class="ico sm" id="plb-x" aria-label="Close">' + ic('x') + '</button></div><div class="plb-st" id="plb-st"><span class="plb-w" id="plb-w"><img id="plb-i" alt=""><span class="plb-pins" id="plb-pins"></span></span></div>'
      document.body.appendChild(o); document.body.classList.add('noscroll')
      var st = $('#plb-st', o), w = $('#plb-w', o), img = $('#plb-i', o), zoom = false, pin = false
      img.src = im0.src
      var pins = function () { $('#plb-pins', o).innerHTML = tview.notes.filter(function (c) { return c.version_id === x.id && c.pos && !c.parent_id }).map(function (c, i) { return '<i class="ppin" style="left:' + (c.pos.x * 100) + '%;top:' + (c.pos.y * 100) + '%" title="' + esc(nameOf(c).name + ': ' + (c.body || '')) + '">' + (i + 1) + '</i>' }).join('') }
      img.onload = pins; pins()
      var close = function () { o.remove(); document.body.classList.remove('noscroll'); document.removeEventListener('keydown', key) }
      var key = function (e) { if (e.key === 'Escape') close() }
      document.addEventListener('keydown', key)
      var setZoom = function (z, fx, fy) {
        zoom = z; o.classList.toggle('zoomed', z); $('#plb-z', o).classList.toggle('on', z)
        if (z && fx != null) requestAnimationFrame(function () { st.scrollLeft = fx * w.scrollWidth - st.clientWidth / 2; st.scrollTop = fy * w.scrollHeight - st.clientHeight / 2 })
      }
      var setP = function (on) { pin = on; o.classList.toggle('pinning', on); var b = $('#plb-pin', o); if (b) b.classList.toggle('on', on) }
      $('#plb-x', o).onclick = close
      $('#plb-z', o).onclick = function () { setZoom(!zoom, 0.5, 0.5) }
      if ($('#plb-pin', o)) $('#plb-pin', o).onclick = function () { setP(!pin) }
      var drag = null
      st.addEventListener('pointerdown', function (e) { if (!zoom || pin) return; drag = { x: e.clientX, y: e.clientY, l: st.scrollLeft, t: st.scrollTop, moved: false } })
      st.addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; st.scrollLeft = drag.l - dx; st.scrollTop = drag.t - dy })
      st.addEventListener('pointerup', function () { setTimeout(function () { drag = null }) })
      img.onclick = function (e) {
        var r = img.getBoundingClientRect(), fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
        if (pin) { tview.ppos = { x: fx, y: fy }; close(); paintPPins(); if ($('#cmp-pos')) $('#cmp-pos').hidden = false; if ($('#cmp-t')) $('#cmp-t').focus(); return }
        if (drag && drag.moved) return
        setZoom(!zoom, fx, fy)
      }
      st.onclick = function (e) { if (e.target === st && !zoom) close() }
    }
    function setupPicture(x) {
      var wrap = $('#pwrap'), im = $('#still'); if (!wrap) return
      if ($('#pview')) $('#pview').onclick = function () { picView(x) }
      if ($('#ppinb')) $('#ppinb').onclick = function () { setPin(!pinMode) }
      wrap.onclick = function (e) {
        if (loupeOn || pcmp || e.target.closest('.ppin') || e.target.closest('.cmpm')) return
        if (!pinMode || !canDo('commenter')) { picView(x); return }
        setPin(false)
        var r = im.getBoundingClientRect(); if (!r.width) return
        tview.ppos = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }
        paintPPins(); if ($('#cmp-pos')) $('#cmp-pos').hidden = false; if ($('#cmp-t')) $('#cmp-t').focus()
      }
      var hb = $('.ptools [data-pick]'); if (hb) hb.onclick = function () { togglePick(x.track_id, function () { hb.outerHTML = heartBtn(x.track_id); setupPicture(x) }) }
      var lb = $('#ploupe'), lp = $('#loupe')
      if (lb) lb.onclick = function () { loupeOn = !loupeOn; lb.classList.toggle('on', loupeOn); wrap.classList.toggle('looking', loupeOn); if (!loupeOn) lp.hidden = true }
      wrap.onmousemove = function (e) {
        if (!loupeOn || !im.naturalWidth) return
        var r = im.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
        if (fx < 0 || fy < 0 || fx > 1 || fy > 1) { lp.hidden = true; return }
        var sz = 220, sc = Math.max(1, im.naturalWidth / r.width)
        lp.hidden = false; lp.style.left = (e.clientX - r.left - sz / 2) + 'px'; lp.style.top = (e.clientY - r.top - sz / 2) + 'px'
        lp.style.backgroundImage = 'url(' + im.src + ')'; lp.style.backgroundSize = im.naturalWidth + 'px ' + im.naturalHeight + 'px'
        lp.style.backgroundPosition = (-(fx * im.naturalWidth - sz / 2)) + 'px ' + (-(fy * im.naturalHeight - sz / 2)) + 'px'
        lp.dataset.z = Math.round(sc * 100) + '%'
      }
      wrap.onmouseleave = function () { if (lp) lp.hidden = true }
      var cb = $('#pcmp')
      if (cb) cb.onclick = function () {
        if (pcmp) { pcmp.forEach(function (n) { n.remove() }); pcmp = null; cb.classList.remove('on'); return }
        var list = imgVersions().filter(function (q) { return q.id !== x.id }), other = list.filter(function (q) { return q.n < x.n }).pop() || list[0]; if (!other) return
        var ov = document.createElement('img'); ov.className = 'pcmp-img'; ov.alt = ''
        var hd = document.createElement('span'); hd.className = 'cmph'; hd.innerHTML = '<span>' + ic('split') + '</span>'
        var la = document.createElement('b'); la.className = 'cmpl'; la.textContent = 'Before · ' + vname(other)
        var lb2 = document.createElement('b'); lb2.className = 'cmpl r'; lb2.textContent = 'After · ' + vname(x)
        var at = 0.5, place = function () { var md = cmpMode(); ov.style.clipPath = md === 'wipe' ? 'inset(0 ' + ((1 - at) * 100) + '% 0 0)' : 'none'; ov.style.setProperty('opacity', md === 'fade' ? String(1 - at) : '1', 'important'); pdiff(md === 'diff'); hd.hidden = md === 'diff'; hd.style.left = (at * 100) + '%' }
        var dcv = null, pdiff = function (on) {
          if (!on) { if (dcv) dcv.hidden = true; ov.style.visibility = ''; return }
          var main = $('#still'); if (!main || !ov.complete || !ov.naturalWidth) { ov.onload = function () { place() }; return }
          if (!dcv) { dcv = document.createElement('canvas'); dcv.className = 'pcmp-img pcmpc'; wrap.insertBefore(dcv, hd); pcmp && pcmp.push(dcv) }
          dcv.hidden = false; ov.style.visibility = 'hidden'
          dcv.width = main.naturalWidth; dcv.height = main.naturalHeight
          var g3 = dcv.getContext('2d'); g3.globalCompositeOperation = 'source-over'; g3.drawImage(main, 0, 0); g3.globalCompositeOperation = 'difference'; g3.drawImage(ov, 0, 0, dcv.width, dcv.height)
        }
        var pbar = cmpModes(place); pbar.classList.add('in-pic')
        wrap.appendChild(ov); wrap.appendChild(hd); wrap.appendChild(la); wrap.appendChild(lb2); wrap.appendChild(pbar); pcmp = [ov, hd, la, lb2, pbar]; cb.classList.add('on'); place()
        urlFor(other).then(function (u) { ov.src = u })
        hd.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); hd.setPointerCapture(e.pointerId); var mv = function (ev) { var r = wrap.getBoundingClientRect(); at = Math.max(0.02, Math.min(0.98, (ev.clientX - r.left) / r.width)); place() }, en = function () { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', en) }; hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', en) })
      }
    }
    // ===== the analyzer (Alex, 8 Nov): a spectrum for sound, scopes for pictures and video =====
    var ex = { on: store.get('rs-extras') !== '0', tab: store.get('rs-scope') || 'wave', kind: null, raf: 0, last: 0, lastT: -1, hold: null, sc: null }
    function exSize(cv) { var r = cv.getBoundingClientRect(), dp = devicePixelRatio || 1, w = Math.max(10, Math.round(r.width * dp)), h = Math.max(10, Math.round(r.height * dp)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h } return { w: w, h: h, dp: dp } }
    function paintExtras() {
      var box = $('#ex-b'), x = curV(), k = kindOf(x); if (!box) return
      $('#extras').hidden = k === 'file' || k === 'suno'
      if (k === 'file' || k === 'suno') return
      $('#extras').classList.toggle('closed', !ex.on); $('#ex-tg').classList.toggle('on', ex.on)
      if (ex.kind !== k) {
        ex.kind = k; ex.hold = null
        $('#ex-title').textContent = k === 'audio' ? 'Spectrum' : 'Scopes'
        $('#ex-sub').textContent = k === 'audio' ? 'what frequencies are playing, live' : k === 'video' ? 'brightness and colour of the frame on screen' : 'brightness and colour of the picture'
        $('#ex-tabs').hidden = k === 'audio'
        box.innerHTML = k === 'audio'
          ? '<div class="ex-spec"><canvas id="ex-sp"></canvas><span class="ex-wait" id="ex-wait">Press play to see the spectrum</span></div><div class="ex-gram"><canvas id="ex-sg"></canvas></div>'
          : '<div class="ex-grid"><figure><canvas id="ex-wf"></canvas><figcaption id="ex-wf-c">Waveform</figcaption></figure><figure><canvas id="ex-vs" class="sq"></canvas><figcaption>Vectorscope</figcaption></figure><figure><canvas id="ex-hi"></canvas><figcaption>Histogram</figcaption></figure></div>'
        $$('#ex-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.sc === ex.tab) }); setTimeout(function () { lens($('#ex-tabs')) }, 30)
      }
      ex.lastT = -1
      if (ex.on && !ex.raf) ex.raf = requestAnimationFrame(exLoop)
    }
    function exLoop(now) {
      ex.raf = 0
      if (!document.body.contains(wv) || !ex.on) return
      var k = kindOf(curV())
      if (k === 'audio') drawSpectrum()
      else if (now - ex.last > 110) {
        var src = k === 'video' ? vidEl : $('#still'), t = k === 'video' ? vidEl.currentTime : 0
        if (src && (k === 'video' ? vidEl.readyState >= 2 : src.complete && src.naturalWidth) && (t !== ex.lastT || (k === 'video' && !vidEl.paused))) { ex.last = now; ex.lastT = t; drawScopes(src) }
      }
      if (audio.paused) { ex.raf = -1; setTimeout(function () { ex.raf = 0; exLoop(performance.now()) }, 250) } else ex.raf = requestAnimationFrame(exLoop)
    }
    var FR = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
    function drawSpectrum() {
      var cv = $('#ex-sp'), sg = $('#ex-sg'); if (!cv) return
      var on = anNode && audio === audEl && !audEl.paused
      $('#ex-wait').hidden = !!(anNode && audio === audEl && (on || ex.hold))
      var S = exSize(cv), g = cv.getContext('2d'), W = S.w, H = S.h, dp = S.dp
      g.clearRect(0, 0, W, H)
      var fx = function (f) { return Math.log(f / 20) / Math.log(1000) * W }
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.38)'; g.font = (10 * dp) + 'px ui-monospace, Menlo, monospace'
      FR.forEach(function (f) { var xx = Math.round(fx(f)) + .5; g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, H); g.stroke(); if (f > 20 && f < 20000) g.fillText(f >= 1000 ? (f / 1000) + 'k' : String(f), xx + 3 * dp, H - 4 * dp) })
      ;[-20, -40, -60, -80].forEach(function (db) { var yy = Math.round((-10 - db) / 90 * H) + .5; g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); g.fillText(db + ' dB', 4 * dp, yy - 3 * dp) })
      if (!anNode || audio !== audEl) return
      var n = anNode.frequencyBinCount, data = new Float32Array(n); anNode.getFloatFrequencyData(data)
      var ny = actx.sampleRate / 2, cols = Math.floor(W / dp / 2)
      if (!ex.hold || ex.hold.length !== cols) ex.hold = new Float32Array(cols).fill(-100)
      var grad = g.createLinearGradient(0, H, 0, 0); grad.addColorStop(0, 'rgba(124,58,237,.35)'); grad.addColorStop(.6, 'rgba(167,139,250,.75)'); grad.addColorStop(1, 'rgba(250,204,21,.9)')
      g.fillStyle = grad; g.beginPath(); g.moveTo(0, H)
      var vals = new Float32Array(cols)
      for (var c = 0; c < cols; c++) {
        var f0 = 20 * Math.pow(1000, c / cols), f1 = 20 * Math.pow(1000, (c + 1) / cols), b0 = Math.floor(f0 / ny * n), b1 = Math.max(b0 + 1, Math.ceil(f1 / ny * n)), m = -120
        for (var b = b0; b < b1 && b < n; b++) if (data[b] > m) m = data[b]
        vals[c] = on ? m : ex.hold[c] - 0.6
        if (on) ex.hold[c] = Math.max(m, ex.hold[c] - 0.35)
        var yy = Math.max(0, Math.min(H, (-10 - vals[c]) / 90 * H))
        g.lineTo(c / cols * W, yy); g.lineTo((c + 1) / cols * W, yy)
      }
      g.lineTo(W, H); g.closePath(); g.fill()
      g.strokeStyle = 'rgba(250,204,21,.85)'; g.lineWidth = dp; g.beginPath()
      for (var c2 = 0; c2 < cols; c2++) { var yh = Math.max(0, Math.min(H, (-10 - ex.hold[c2]) / 90 * H)); if (c2) g.lineTo((c2 + .5) / cols * W, yh); else g.moveTo(0, yh) }
      g.stroke()
      // the spectrogram: one new column a frame, low notes at the bottom
      if (on && sg) {
        var T = exSize(sg), gg = sg.getContext('2d'), w2 = T.w, h2 = T.h
        gg.drawImage(sg, -2, 0)
        for (var yv = 0; yv < h2; yv += 2) {
          var fq = 20 * Math.pow(1000, 1 - yv / h2), bi = Math.min(n - 1, Math.floor(fq / ny * n)), v = Math.max(0, Math.min(1, (data[bi] + 100) / 85))
          gg.fillStyle = v < .5 ? 'rgba(' + Math.round(40 + 160 * v) + ',' + Math.round(20 + 60 * v) + ',' + Math.round(80 + 300 * v) + ',1)' : 'rgba(' + Math.round(167 + 166 * (v - .5)) + ',' + Math.round(80 + 248 * (v - .5)) + ',' + Math.round(230 - 400 * (v - .5)) + ',1)'
          gg.fillRect(w2 - 2, yv, 2, 2)
        }
      }
    }
    function drawScopes(src) {
      var sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight; if (!sw) return
      var w = 240, h = Math.max(40, Math.round(240 * sh / sw))
      if (!ex.sc) ex.sc = document.createElement('canvas')
      var c0 = ex.sc; if (c0.width !== w || c0.height !== h) { c0.width = w; c0.height = h }
      var g0 = c0.getContext('2d', { willReadFrequently: true }), px
      try { g0.drawImage(src, 0, 0, w, h); px = g0.getImageData(0, 0, w, h).data } catch (e) { $('#ex-b').innerHTML = '<p class="muted" style="margin:0">This file does not allow scopes here.</p>'; ex.kind = null; return }
      // waveform or parade
      var cv = $('#ex-wf'); if (!cv) return
      var S = exSize(cv), W = S.w, H = S.h, g = cv.getContext('2d'), parade = ex.tab === 'parade'
      $('#ex-wf-c').textContent = parade ? 'RGB parade' : 'Waveform (brightness)'
      var acc = [new Float32Array(W * H), new Float32Array(W * H), new Float32Array(W * H)]
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4, r = px[i], gr = px[i + 1], bl = px[i + 2]
        if (parade) { var col0 = Math.floor(x / w * (W / 3)); [r, gr, bl].forEach(function (v, ch) { var row = H - 1 - Math.floor(v / 255 * (H - 1)); acc[ch][row * W + col0 + Math.floor(ch * W / 3)] += 1 }) }
        else { var L = 0.2126 * r + 0.7152 * gr + 0.0722 * bl, row2 = H - 1 - Math.floor(L / 255 * (H - 1)), col = Math.floor(x / w * W); acc[0][row2 * W + col] += 1 }
      }
      var img = g.createImageData(W, H), dd = img.data, gain = 255 * 2.2 * (W / w) * (H / h) / Math.max(1, h) * 8
      for (var j = 0; j < W * H; j++) {
        var o = j * 4
        if (parade) { dd[o] = Math.min(255, acc[0][j] * gain); dd[o + 1] = Math.min(255, acc[1][j] * gain); dd[o + 2] = Math.min(255, acc[2][j] * gain) }
        else { var vv = Math.min(255, acc[0][j] * gain); dd[o] = vv * .75; dd[o + 1] = vv; dd[o + 2] = vv * .8 }
        dd[o + 3] = 255
      }
      g.putImageData(img, 0, 0)
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.fillStyle = 'rgba(255,255,255,.4)'; g.font = (9 * S.dp) + 'px ui-monospace, Menlo, monospace'; g.lineWidth = 1
      ;[0, 25, 50, 75, 100].forEach(function (pc) { var yy = Math.round(H - 1 - pc / 100 * (H - 1)) + .5; g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); g.fillText(String(pc), 3 * S.dp, Math.max(10 * S.dp, yy - 2 * S.dp)) })
      if (parade) { g.strokeStyle = 'rgba(255,255,255,.18)'; [1, 2].forEach(function (k2) { var xx = Math.round(k2 * W / 3) + .5; g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, H); g.stroke() }) }
      // vectorscope
      var vc = $('#ex-vs'), V = exSize(vc), vg = vc.getContext('2d'), N = Math.min(V.w, V.h), cx = V.w / 2, cy = V.h / 2, R = N * 0.45
      var va = new Float32Array(V.w * V.h)
      for (var q = 0; q < px.length; q += 4) {
        var rr = px[q], gg2 = px[q + 1], bb = px[q + 2], cb = -0.1687 * rr - 0.3313 * gg2 + 0.5 * bb, cr = 0.5 * rr - 0.4187 * gg2 - 0.0813 * bb
        var vx = Math.round(cx + cb / 128 * R), vy = Math.round(cy - cr / 128 * R); if (vx >= 0 && vy >= 0 && vx < V.w && vy < V.h) va[vy * V.w + vx] += 1
      }
      var vi = vg.createImageData(V.w, V.h), vd = vi.data, vgain = 255 * 6 * (V.w * V.h) / (w * h) / 6
      for (var z = 0; z < va.length; z++) { var vv2 = Math.min(255, va[z] * vgain); vd[z * 4] = vv2 * .85; vd[z * 4 + 1] = vv2; vd[z * 4 + 2] = vv2 * .9; vd[z * 4 + 3] = 255 }
      vg.putImageData(vi, 0, 0)
      vg.strokeStyle = 'rgba(255,255,255,.18)'; vg.lineWidth = 1; vg.beginPath(); vg.arc(cx, cy, R, 0, Math.PI * 2); vg.stroke(); vg.beginPath(); vg.moveTo(cx - R, cy); vg.lineTo(cx + R, cy); vg.moveTo(cx, cy - R); vg.lineTo(cx, cy + R); vg.stroke()
      // the skin line, and where pure red, yellow, green, cyan, blue and magenta land (75%)
      vg.strokeStyle = 'rgba(250,204,21,.55)'; vg.beginPath(); vg.moveTo(cx, cy); var sa = 123 * Math.PI / 180; vg.lineTo(cx + Math.cos(sa) * R, cy - Math.sin(sa) * R); vg.stroke()
      vg.font = (9 * V.dp) + 'px ui-monospace, Menlo, monospace'
      ;[['R', 191, 0, 0], ['Y', 191, 191, 0], ['G', 0, 191, 0], ['C', 0, 191, 191], ['B', 0, 0, 191], ['M', 191, 0, 191]].forEach(function (t) {
        var cb2 = -0.1687 * t[1] - 0.3313 * t[2] + 0.5 * t[3], cr2 = 0.5 * t[1] - 0.4187 * t[2] - 0.0813 * t[3], tx = cx + cb2 / 128 * R, ty = cy - cr2 / 128 * R
        vg.strokeStyle = 'rgba(255,255,255,.45)'; vg.strokeRect(tx - 4 * V.dp, ty - 4 * V.dp, 8 * V.dp, 8 * V.dp); vg.fillStyle = 'rgba(255,255,255,.55)'; vg.fillText(t[0], tx + 6 * V.dp, ty + 3 * V.dp)
      })
      // histogram
      var hc = $('#ex-hi'), Hs = exSize(hc), hg = hc.getContext('2d'), hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
      for (var u = 0; u < px.length; u += 4) { hist[0][px[u]]++; hist[1][px[u + 1]]++; hist[2][px[u + 2]]++; hist[3][Math.round(0.2126 * px[u] + 0.7152 * px[u + 1] + 0.0722 * px[u + 2])]++ }
      var top = 1; hist.forEach(function (hh) { for (var k3 = 1; k3 < 255; k3++) if (hh[k3] > top) top = hh[k3] })
      hg.clearRect(0, 0, Hs.w, Hs.h); hg.globalCompositeOperation = 'lighter'
      ;[[0, 'rgba(239,68,68,.55)'], [1, 'rgba(34,197,94,.55)'], [2, 'rgba(59,130,246,.6)']].forEach(function (cfg) {
        hg.fillStyle = cfg[1]; hg.beginPath(); hg.moveTo(0, Hs.h)
        for (var k4 = 0; k4 < 256; k4++) hg.lineTo(k4 / 255 * Hs.w, Hs.h - Math.min(1, hist[cfg[0]][k4] / top) * Hs.h * .95)
        hg.lineTo(Hs.w, Hs.h); hg.closePath(); hg.fill()
      })
      hg.globalCompositeOperation = 'source-over'; hg.strokeStyle = 'rgba(255,255,255,.75)'; hg.lineWidth = Hs.dp; hg.beginPath()
      for (var k5 = 0; k5 < 256; k5++) { var yy5 = Hs.h - Math.min(1, hist[3][k5] / top) * Hs.h * .95; if (k5) hg.lineTo(k5 / 255 * Hs.w, yy5); else hg.moveTo(0, yy5) }
      hg.stroke()
      var clipLo = hist[3][0] / (w * h), clipHi = hist[3][255] / (w * h)
      hg.font = (9.5 * Hs.dp) + 'px ui-monospace, Menlo, monospace'; hg.fillStyle = clipLo > .01 ? '#fca5a5' : 'rgba(255,255,255,.45)'; hg.fillText('black ' + (clipLo * 100).toFixed(1) + '%', 4 * Hs.dp, 12 * Hs.dp)
      hg.fillStyle = clipHi > .01 ? '#fca5a5' : 'rgba(255,255,255,.45)'; var tw = hg.measureText('white ' + (clipHi * 100).toFixed(1) + '%').width; hg.fillText('white ' + (clipHi * 100).toFixed(1) + '%', Hs.w - tw - 4 * Hs.dp, 12 * Hs.dp)
    }
    var lastActive = null
    function activeNote() {
      var t = audio.currentTime, best = null
      if (cur.version && cur.version.id === tview.version && !audio.paused) topNotes().forEach(function (c) { if (c.at_sec != null && t >= c.at_sec - .3 && t < c.at_sec + 6) best = c.id })
      if (best === lastActive) return
      lastActive = best
      $$('#nlist > .note').forEach(function (n) { n.classList.toggle('on', n.dataset.n === best) })
      if (best) { var el = $('#nlist > [data-n="' + best + '"]'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    }
    function jump(c, andPlay) {
      if (!c) return; var x = curV()
      // wait for the file's metadata, or load() puts the time back to 0 after we set it (why the pins seemed dead)
      var go2 = function () { var set = function () { try { audio.currentTime = c.at_sec || 0 } catch (e) {} drawWave(); if (andPlay) play() }; if (audio.readyState >= 1) set(); else audio.addEventListener('loadedmetadata', function () { setTimeout(set) }, { once: true }) }
      if (!cur.url || cur.version !== x) load(x, false, false).then(go2); else go2()
      vs.show = c.sketch || null; if (typeof paintOv === 'function') paintOv()
      lastActive = null
      $$('#nlist > .note').forEach(function (n) { var on = n.dataset.n === c.id; n.classList.toggle('on', on); if (on && play) { n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash') } })
      $$('#pins .pin').forEach(function (p) { p.classList.toggle('on', p.dataset.c === c.id) })
    }

    // posting a note: at the playhead, or about the whole version
    var replyTo = null
    if ($('#cmp')) {
      // Enter posts the note, Shift+Enter is a new line (Alex, 7 Nov); never while a Greek accent is being composed
      $('#cmp-t').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); if ($('#cmp-t').value.trim() && !$('#cmp-go').disabled) $('#cmp').requestSubmit() } })
      $('#cmp-t').addEventListener('focus', function () { if (!audio.paused && store.get('rs-pause-on-type') !== '0') audio.pause() })
      var pendingAtt = null, mpick = 0
      // a picture with the note: made at most 1600 px wide, as a JPEG, before it goes up
      $('#cmp-att').onclick = function () { $('#cmp-attf').click() }
      $('#cmp-attf').onchange = function () {
        var f = this.files[0]; this.value = ''; if (!f) return
        var im = new Image(), u = URL.createObjectURL(f)
        im.onload = function () { var sc = Math.min(1, 1600 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(function (bl) { pendingAtt = bl; $('#cmp-attc').hidden = false; $('#cmp-t').focus() }, 'image/jpeg', 0.86) }
        im.onerror = function () { toast('This picture cannot be opened here. Try a JPG or PNG.') }
        im.src = u
      }
      $('#cmp-attc-x').onclick = function () { pendingAtt = null; $('#cmp-attc').hidden = true }
      var upAtt = function (x) {
        if (!pendingAtt) return Promise.resolve(null)
        return api(share ? 'share-att-add' : 'att-add', { version: x.id, type: 'image/jpeg' }).then(function (d) {
          if (d.error) throw new Error(d.error)
          return fetch(d.put, { method: 'PUT', body: pendingAtt, headers: { 'Content-Type': 'image/jpeg' } }).then(function (r) { if (!r.ok) throw new Error('The picture did not go up (' + r.status + ')'); return d.key })
        })
      }
      // @ in the note: a short list of the people to pick from
      var mpop = $('#mpop'), mq = null
      var mlist = function () {
        var t = $('#cmp-t'), before = t.value.slice(0, t.selectionStart), m = before.match(/(^|\s)@([^@\n]{0,30})$/)
        if (!m) { mpop.hidden = true; mq = null; return }
        mq = { at: before.length - m[2].length - 1, q: m[2].toLowerCase() }
        var ps = mentionPeople().filter(function (p) { return p.name.toLowerCase().indexOf(mq.q) >= 0 }).slice(0, 6)
        if (!ps.length) { mpop.hidden = true; return }
        mpick = Math.min(mpick, ps.length - 1)
        mpop.innerHTML = ps.map(function (p, i) { return '<button type="button" data-mn="' + esc(p.name) + '"' + (i === mpick ? ' class="on"' : '') + '>' + esc(p.name) + '</button>' }).join('')
        mpop.hidden = false
        $$('button', mpop).forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); minsert(b.dataset.mn) } })
      }
      var minsert = function (name) {
        var t = $('#cmp-t'); if (!mq) return
        var end = t.selectionStart, v = t.value
        t.value = v.slice(0, mq.at) + '@' + name + ' ' + v.slice(end); var c = mq.at + name.length + 2; t.setSelectionRange(c, c)
        mpop.hidden = true; mq = null; mpick = 0; t.focus()
      }
      $('#cmp-t').addEventListener('input', function () { mpick = 0; mlist() })
      $('#cmp-t').addEventListener('keydown', function (e) {
        if (mpop.hidden) return
        var bs = $$('button', mpop)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mpick = (mpick + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length; mlist() }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); if (bs[mpick]) minsert(bs[mpick].dataset.mn) }
        else if (e.key === 'Escape') { mpop.hidden = true }
      }, true)
      $('#cmp-t').addEventListener('blur', function () { setTimeout(function () { mpop.hidden = true }, 150) })
      $('#cmp').onsubmit = function (e) {
        e.preventDefault()
        var body = $('#cmp-t').value.trim(); if (!body && pendingAtt) body = 'See the picture'; if (!body) return
        var ments = mentionPeople().filter(function (p) { return body.indexOf('@' + p.name) >= 0 }).map(function (p) { return p.id })
        if (share && $('#g-name')) { var gn = $('#g-name').value.trim(); if (!gn) { $('#g-name').focus(); return } store.set('rs-guest', gn) }
        var x = curV(), at = replyTo || kindOf(x) === 'image' || kindOf(x) === 'file' || kindOf(x) === 'suno' ? null : ($('#cmp-at').checked ? Math.round(audio.currentTime * (kindOf(x) === 'video' ? 1000 : 10)) / (kindOf(x) === 'video' ? 1000 : 10) : null)
        var sketch = at != null && !replyTo && vs.drawing.length ? vs.drawing.slice() : null
        var endAt = null, posAt = !replyTo && kindOf(x) === 'image' && tview.ppos ? tview.ppos : null
        if (!replyTo && tview.range && tview.range.b != null && kindOf(x) !== 'image') { at = Math.round(tview.range.a * 1000) / 1000; endAt = Math.round(tview.range.b * 1000) / 1000 }
        $('#cmp-go').disabled = true
        var parentNow = replyTo
        var p = upAtt(x).then(function (attKey) {
          return share ? api('share-comment', { version: x.id, body: body, at_sec: at, name: store.get('rs-guest'), parent: parentNow, sketch: sketch, end_sec: endAt, pos: posAt, attach: attKey, mentions: ments }).then(function (d) { if (d.error) throw new Error(d.error); share.data.comments.push(d.comment); return d.comment })
            : sb.from('roarstudio_comments').insert({ version_id: x.id, project_id: ctx.project.id, body: body, at_sec: at, author: session.user.id, parent_id: parentNow, sketch: sketch, end_sec: endAt, pos: posAt, attach: attKey }).select().single().then(function (r) { if (r.error) throw new Error(r.error.message); if (ments.length) api('mention', { comment: r.data.id, users: ments }).then(function (m) { if (m.sent) toast('Told ' + m.sent + ' by email') }); return r.data })
        }).then(function (c) { pendingAtt = null; $('#cmp-attc').hidden = true; return c })
        if (at != null && kindOf(x) === 'video' && vidEl.readyState >= 2 && Math.abs(vidEl.currentTime - at) < 0.3) { try { var fc = document.createElement('canvas'); fc.width = 320; fc.height = 180; drawFrame(fc, vidEl); if (!isBlack(fc)) frameCache[x.id + '@' + at] = fc } catch (e) {} }
        p.then(function (c) { if (posAt) { tview.ppos = null; if ($('#cmp-pos')) $('#cmp-pos').hidden = true } if (endAt != null) { tview.range = null; paintRange() } if (sketch) { vs.drawing = []; drawMode(false) } tview.notes.push(c); $('#cmp-t').value = ''; replyTo = null; $('#cmp-t').placeholder = ''; if ($('#g-name')) $('#g-name').remove(); paintNotes() }).catch(function (x2) { toast(x2.message) }).then(function () { $('#cmp-go').disabled = false })
      }
    }
    function askName(then) {
      prompt1('Your name', 'So the artist knows who approved it', '', 'Continue', function (v) { store.set('rs-guest', v.slice(0, 60)); then() })
    }

    // play / pause, the clock, level match
    var pb = $('#pb')
    var paintPlay = function () { pb.innerHTML = ic(audio.paused ? 'play' : 'pause'); pb.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause') }
    pb.onclick = function () {
      var x = curV()
      if (cur.version !== x || !cur.url) { load(x, false, true).catch(function (e) { toast(e.message) }); return }
      if (audio.paused) play(); else audio.pause()
    }
    $('#lm').onclick = function () { matched = !matched; store.set('rs-match', matched ? '1' : '0'); this.setAttribute('aria-pressed', matched); applyGain(); paintFacts(); drawWave() }
    var tick = function () {
      if (!document.body.contains(wv)) return
      var x = curV(), dur = x.duration || audio.duration || 0
      var t = cur.version === x ? audio.currentTime : 0
      var isV = kindOf(x) === 'video', fq = isV ? +store.get('rs-fps-' + x.id) : 0
      $('#tm-t').innerHTML = isV && fq ? tcf(t, fq) + ' <span>' + fpsLabel(fq) + '</span>' : mmss(t) + ' <span>/ ' + mmss(dur) + '</span>'
      if ($('#cmp-time')) $('#cmp-time').textContent = isV && fq ? tcf(t, fq) : mmss(t)
      if ($('#cmp-time') && tview.range) { var fm = function (v) { return isV && fq ? tcf(v, fq) : mmss(v) }; $('#cmp-time').textContent = fm(tview.range.a) + ' – ' + fm(tview.range.b != null ? tview.range.b : t) }
      syncCompare()
      drawWave(); activeNote(); frameLater(tick)
    }
    ;[audEl, vidEl].forEach(function (el) {
      el.onplay = el.onpause = el.onended = function () { if (document.body.contains(pb) && el === audio) paintPlay() }
      el.onerror = function () { if (el.src && el === audio) toast('This file could not be played in the browser. Download it instead.') }
    })

    if (!share && edit) {
      $('#nv').onclick = function () { $('#nvf').click() }
      $('#nvf').onchange = function () { var f = this.files[0]; this.value = ''; if (f) startUploads([f], { project: ctx.project.id, track: id, onDone: function (nv) { ctx.versions.push(nv); tview.version = nv.id; render() } }) }
      wireDropOn(view, function (files) { if (files[0]) startUploads([files[0]], { project: ctx.project.id, track: id, onDone: function (nv) { ctx.versions.push(nv); tview.version = nv.id; render() } }) })
      $('#tsh').onclick = function () { shareBox(ctx, track) }
      $('#tm').onclick = function () {
        modal('<div class="spread"><h2>' + esc(track.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="tm-r">' + ic('pen') + ' Rename</button><button class="btn" id="tm-f">' + ic('folder') + ' Move to a folder</button><button class="btn" id="tm-s">' + ic('music') + ' New version from Suno</button><button class="btn danger" id="tm-d">' + ic('trash') + ' Delete track</button></div>', function (m) {
          $('#tm-f', m).onclick = function () {
            var fs = ctx.folders || []
            modal('<div class="spread"><h2>Move “' + esc(track.title) + '”</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts">' +
              '<button class="btn' + (!track.folder_id ? ' main' : '') + '" data-mv="">' + ic('back') + ' Top of the project</button>' + fs.map(function (f) { return '<button class="btn' + (track.folder_id === f.id ? ' main' : '') + '" data-mv="' + f.id + '">' + ic('folder') + ' ' + esc(f.name) + '</button>' }).join('') +
              '<button class="btn" id="mv-new">' + ic('fplus') + ' New folder…</button></div>', function (k) {
              $$('[data-mv]', k).forEach(function (b) { b.onclick = function () { var to = b.dataset.mv || null; sb.from('roarstudio_tracks').update({ folder_id: to }).eq('id', id).then(function () { track.folder_id = to; close(); toast(to ? 'Moved' : 'Moved to the top') }) } })
              $('#mv-new', k).onclick = function () { prompt1('New folder', 'Name', '', 'Create and move', function (v) { return sb.from('roarstudio_folders').insert({ project_id: ctx.project.id, name: v, position: fs.length, created_by: session.user.id }).select('id').single().then(function (r) { if (r.error) return; return sb.from('roarstudio_tracks').update({ folder_id: r.data.id }).eq('id', id).then(function () { toast('Moved') }) }) }) }
            })
          }
          $('#tm-s', m).onclick = function () { close(); addSuno(ctx.project.id, id, null, function () { tview = null; render() }) }
          $('#tm-r', m).onclick = function () { prompt1('Rename', 'Title', track.title, 'Save', function (val) { return sb.from('roarstudio_tracks').update({ title: val }).eq('id', id).then(function () { track.title = val; render() }) }) }
          $('#tm-d', m).onclick = function () { confirmBox('Delete “' + track.title + '”?', 'Every version, file and note of this track is deleted. This cannot be undone.', 'Delete', function () { return api('delete-track', { track: id }).then(function () { audio.pause(); tview = null; go('#p/' + ctx.project.id) }) }) }
        })
      }
      listen(ctx.project.id, function () { if (uploading || !document.body.contains(wv)) return; loadProject(ctx.project.id).then(function () { return loadNotes(id) }).then(function (ns) { if (!document.body.contains(wv)) return; var keepV = tview.version; tview.notes = ns; versions = ctx.versions.filter(function (q) { return q.track_id === id }); if (!versions.some(function (q) { return q.id === keepV })) tview.version = versions[versions.length - 1].id; paintVersions(); paintNotes(); paintAppr() }) })
    }

    // search and filters
    $('#nq').oninput = function () { nf.q = this.value.trim().toLowerCase(); paintNotes() }
    $('#nchips').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('#nchips button').forEach(function (x) { x.classList.toggle('on', x === b) }); nf.f = b.dataset.f; paintNotes() }
    // the notepad: private, saved as you type
    if ($('#ntab')) {
      var ntab = $('#ntab'); setTimeout(function () { lens(ntab) }, 30)
      ntab.onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return
        $$('button', ntab).forEach(function (x) { x.classList.toggle('on', x === b) }); lens(ntab)
        var tab = b.dataset.tab, pad = tab === 'p'
        $('#nlist').hidden = tab !== 'n'; $('#nfilter').hidden = tab !== 'n' || tview.notes.filter(function (c) { return c.version_id === tview.version && !c.parent_id }).length < 2
        if ($('#npad')) $('#npad').hidden = !pad
        $('#stills').hidden = tab !== 's'; if ($('#cmp')) $('#cmp').hidden = tab !== 'n'
        if ($('#views')) $('#views').hidden = tab !== 'w'
        if (tab === 's') loadStills()
        if (tab === 'w') loadViews()
        if (pad && !$('#npad-t').dataset.loaded) sb.from('roarstudio_notepads').select('body').eq('user_id', session.user.id).eq('track_id', id).maybeSingle().then(function (r) { var t = $('#npad-t'); if (!t) return; t.value = (r.data && r.data.body) || ''; t.dataset.loaded = '1'; t.focus() })
      }
      var padTimer = null
      if ($('#npad-t')) $('#npad-t').oninput = function () {
        var v = this.value; $('#npad-s').textContent = 'Saving…'; clearTimeout(padTimer)
        padTimer = setTimeout(function () { sb.from('roarstudio_notepads').upsert({ user_id: session.user.id, track_id: id, body: v, updated_at: new Date().toISOString() }).then(function (r) { if ($('#npad-s')) $('#npad-s').textContent = r.error ? 'Could not save' : 'Saved' }) }, 700)
      }
    }
    $('#rew').onclick = function () { seekNow(0); drawWave() }
    // Levels: every version's loudness and peak side by side, pick one to hear it
    if ($('#lvl')) $('#lvl').onclick = function () {
      var lo = -30, hi = -4, bar = function (v) { return v == null ? 0 : Math.max(2, Math.min(100, (v - lo) / (hi - lo) * 100)) }
      modal('<div class="spread"><h2>Levels</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><p class="muted" style="margin:0">Integrated loudness (LUFS) and sample peak of each version. With Level match on, every version plays at ' + lufsText(TARGET) + '.</p><div class="levels">' +
        versions.slice().reverse().map(function (q) { return '<button class="lvrow' + (q.id === tview.version ? ' on' : '') + '" data-lv="' + q.id + '"><b>' + esc(vname(q)) + '</b><span class="lvbar"><i style="width:' + bar(q.lufs) + '%"></i></span><span class="mono">' + (q.lufs == null ? '—' : lufsText(q.lufs)) + '</span><span class="mono muted">' + (q.peak_db == null ? '' : (q.peak_db < 0 ? '−' : '') + Math.abs(q.peak_db).toFixed(1) + ' dBFS') + '</span></button>' }).join('') +
        '</div>', function (m) { $$('[data-lv]', m).forEach(function (b) { b.onclick = function () { close(); setVersion(b.dataset.lv, true) } }) })
    }
    $('#zr').oninput = function () { setZoom(Math.pow(32, this.value / 100), zw.z > 1 ? zw.start + span(curV().duration || audio.duration || 0) / 2 : null); this.style.setProperty('--zv', this.value + '%') }
    $('#zr').ondblclick = function () { this.value = 0; setZoom(1) }
    // speed, loop, picture in picture, full screen
    var SPEEDS = [1, 1.25, 1.5, 2, 0.5, 0.75]
    $('#spd').onclick = function () { var i = (SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length; audEl.playbackRate = vidEl.playbackRate = SPEEDS[i]; this.querySelector('b').textContent = SPEEDS[i] + '×' }
    $('#spd').querySelector('b').textContent = (audio.playbackRate || 1) + '×'
    $('#lp').onclick = function () { var on = !audEl.loop; audEl.loop = vidEl.loop = on; this.classList.toggle('on', on) }
    $('#lp').classList.toggle('on', audEl.loop)
    if ($('#abtn')) $('#abtn').onclick = abToggle
    if ($('#ex-tg')) $('#ex-tg').onclick = function () { ex.on = !ex.on; store.set('rs-extras', ex.on ? '1' : '0'); paintExtras() }
    if ($('#ex-tabs')) $('#ex-tabs').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; ex.tab = b.dataset.sc; store.set('rs-scope', ex.tab); $$('#ex-tabs button').forEach(function (q) { q.classList.toggle('on', q === b) }); lens($('#ex-tabs')); ex.lastT = -2 }
    $$('.hint').forEach(function (h) { $('button', h).onclick = function () { store.set('rs-hint-' + h.dataset.hint, '0'); h.classList.add('gone'); setTimeout(function () { h.remove(); var hs = $('.hints'); if (hs && !hs.children.length) hs.remove() }, 260) } })
    if ($('#cmp-pos-x')) $('#cmp-pos-x').onclick = function () { tview.ppos = null; $('#cmp-pos').hidden = true; paintPPins() }
    if ($('#strm')) $('#strm').onclick = streamCheck
    if ($('#stems')) $('#stems').onclick = stemsToggle
    if ($('#cmp-rng')) $('#cmp-rng').onclick = function () {
      var t = audio.currentTime
      if (!tview.range) tview.range = { a: t, b: null }
      else if (tview.range.b == null) { if (t > tview.range.a + 0.3) tview.range.b = t; else if (t < tview.range.a - 0.3) tview.range = { a: t, b: tview.range.a }; else tview.range = null }
      else tview.range = null
      paintRange(); drawWave()
    }
    if ($('#cmp-mic')) {
      var mic = $('#cmp-mic'), downAt = 0
      mic.addEventListener('pointerdown', function (e) { e.preventDefault(); if (rec) { micStop(); downAt = 0; return } downAt = Date.now(); var x = curV(); micStart(kindOf(x) !== 'image' && $('#cmp-at') && $('#cmp-at').checked ? Math.round(audio.currentTime * 10) / 10 : null) })
      var lift = function () { if (downAt && Date.now() - downAt > 450) micStop(); downAt = 0 }
      mic.addEventListener('pointerup', lift); mic.addEventListener('pointerleave', function () { if (downAt && Date.now() - downAt > 450) lift() })
    }
    if ($('#fprev')) { $('#fprev').onclick = function () { stepFrame(-1) }; $('#fnext').onclick = function () { stepFrame(1) } }
    if ($('#vmask')) $('#vmask').onclick = function (e) { e.stopPropagation(); maskMenu(this) }
    if ($('#vdraw')) $('#vdraw').onclick = function () { drawMode(!vs.draw) }
    if ($('#vcmp')) $('#vcmp').onclick = function () { if (vs.cmp) compareOff(); else compareOn() }
    if ($('#nexp')) $('#nexp').onclick = exportMarkers
    if ($('#cmp-sk-x')) $('#cmp-sk-x').onclick = function () { vs.drawing = []; drawMode(false) }
    if ($('#grab')) $('#grab').onclick = function () { if (share && !store.get('rs-guest')) askName(grabStill); else grabStill() }
    $('#fs').onclick = function () { var el = $('#media'); try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el) } catch (e) { try { vidEl.webkitEnterFullscreen() } catch (x) {} } }
    $('#pip').onclick = function () { try { if (document.pictureInPictureElement) document.exitPictureInPicture(); else vidEl.requestPictureInPicture() } catch (e) {} }

    paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr(); paintPlay(); drawWave()
    requestAnimationFrame(tick)
    if (pendingNote) {
      var pn = tview.notes.filter(function (q) { return q.id === pendingNote })[0]; pendingNote = null
      if (pn) { tview.version = pn.version_id; paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr(); setTimeout(function () { jump(pn) }, 60); return }
    }
    if (fresh && cur.version && cur.version.track_id === id && versions.some(function (q) { return q.id === cur.version.id })) { tview.version = cur.version.id; paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr() }
    else if (pendingPlay) { pendingPlay = false; load(curV(), false, true).catch(function (e) { toast(e.message) }) }
    else if (audio.paused) load(curV(), false, false).catch(function () {})
  }
  function wireDropOn(el, fn) {
    var over = function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) e.preventDefault() }
    el.addEventListener('dragover', over); el.addEventListener('drop', function (e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); fn(Array.prototype.slice.call(e.dataTransfer.files)) })
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#layer').firstChild) close() })
  var vstep = null, vspace = null
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && vstep && $('#vov') && !/input|textarea|select/i.test((e.target && e.target.tagName) || '') && !$('#layer').firstChild) { e.preventDefault(); vstep(e.key === 'ArrowLeft' ? -1 : 1); return }
    if (e.code !== 'Space' || /input|textarea|select|button/i.test((e.target && e.target.tagName) || '')) return
    if (vspace && vspace()) { e.preventDefault(); return }
    var pb = $('#pb'); if (pb) { e.preventDefault(); pb.click() }
  })
  window.addEventListener('resize', function () { $$('canvas[data-wave]').forEach(function (cv) { var v = ctx && ctx.versions.filter(function (x) { return x.id === cv.dataset.wave })[0]; drawMini(cv, v && v.peaks) }) })

  // =====================================================================================================
  // Finals (Alex, 7 Nov): the project's final files in one folder, to look at, download and send as one link
  // =====================================================================================================
  function renderFinals(id) {
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    ;(share ? Promise.resolve(ctx) : loadProject(id)).then(drawFinals).catch(function (e) { setTop([]); view.innerHTML = errorBox(e.message) })
  }
  function drawFinals(c) {
    var view = $('#view'), edit = !share && canDo('editor')
    var files = c.versions.filter(function (v) { return v.final_at }).sort(function (a, b) {
      var ta = c.tracks.findIndex(function (t) { return t.id === a.track_id }), tb = c.tracks.findIndex(function (t) { return t.id === b.track_id })
      return ta - tb || a.n - b.n
    })
    var titleOf = function (v) { var t = c.tracks.filter(function (x) { return x.id === v.track_id })[0]; return t ? t.title : v.file_name }
    var total = files.reduce(function (a, v) { return a + Number(v.size || 0) }, 0)
    setTop([c.project.title, 'Finals'])
    view.classList.add('lux')
    view.innerHTML = brandBanner() + '<div class="lux-hero"><span class="lux-k">' + ic('star') + ' Final files</span></div><div class="head">' + (share ? '' : '<button class="ico" id="back" aria-label="Back to the project">' + ic('back') + '</button>') + '<span class="pcover art" style="' + coverAttr(c.project) + '"></span>' +
      '<div style="min-width:0"><h1>' + (share ? esc(c.project.title) : 'Finals') + '</h1><div class="sub">' + (share ? 'Final files' + (share.data.project.owner_name ? ' from ' + esc(share.data.project.owner_name) : '') + ' · ' : esc(c.project.title) + ' · ') + files.length + ' file' + (files.length === 1 ? '' : 's') + ' · ' + size(total) + '</div></div>' +
      '<div class="tools">' + (files.length ? '<button class="btn" id="dl-all">' + ic('down') + ' Download all (.zip)</button>' : '') + (edit ? '<button class="btn main" id="fin-share">' + ic('share') + ' Share the Finals</button>' : '') + '</div></div>' +
      (files.length ? '<div class="flist">' + files.map(function (v) {
        var k = kindOf(v)
        var art = v.thumb ? 'background-image:url(' + cssu(v.thumb) + ')' : k === 'audio' ? coverAttr(c.project) : ''
        var facts = [KIND_WORD[k], v.label || '', k !== 'image' && v.duration ? mmss(v.duration) : '', v.width ? v.width + '×' + v.height : '', k === 'audio' && v.sample_rate ? (v.sample_rate / 1000).toString().replace(/\.0$/, '') + ' kHz' : '', size(v.size)].filter(Boolean)
        return '<div class="frow glass k-' + k + '" data-v="' + v.id + '"><button class="fmedia" data-prev="' + v.id + '" aria-label="Open ' + esc(titleOf(v)) + '" style="' + art + '">' +
          (k === 'audio' ? '<canvas data-wave="' + v.id + '"></canvas>' : v.thumb ? '' : '<i class="big">' + ic(k === 'video' ? 'film' : 'image') + '</i>') +
          '<span class="pp">' + ic(k === 'image' ? 'eye' : 'play') + '</span></button>' +
          '<div class="finfo"><span class="fkind"><i class="kdot k-' + k + '"></i>' + KIND_WORD[k] + '</span><b>' + esc(titleOf(v)) + '</b><div class="ffacts">' + facts.slice(1).map(function (t) { return '<span>' + esc(t) + '</span>' }).join('') + '</div></div>' +
          '<div class="fact2"><button class="btn sm" data-prev2="' + v.id + '">' + ic(k === 'image' ? 'eye' : 'play') + (k === 'image' ? ' View' : ' Play') + '</button><button class="ico" data-dl="' + v.id + '" aria-label="Download" title="Download">' + ic('down') + '</button>' + (edit ? '<button class="ico" data-open="' + v.track_id + '" aria-label="Open its page" title="Open its page">' + ic('next') + '</button>' : '') + '</div></div>'
      }).join('') + '</div>'
      : '<div class="empty glass"><span class="ico" style="width:64px;height:64px">' + ic('folder') + '</span><h2>No final files yet</h2><p>' + (share ? 'Nothing here yet. Check back later.' : 'Open any file and press Make it final: it shows up here, ready to send as one link.') + '</p></div>')
    view.insertAdjacentHTML('beforeend', creditsHtml(c.project.credits, edit))
    if ($('#cr-edit')) $('#cr-edit').onclick = function () { creditsBox(c, function () { drawFinals(c) }) }
    if ($('#cr-copy')) $('#cr-copy').onclick = function () { copyText(creditsText(c.project.credits, c.project.title), 'Credits copied') }
    if ($('#back')) $('#back').onclick = function () { go('#p/' + c.project.id) }
    $$('canvas[data-wave]').forEach(function (cv) { var v = files.filter(function (x) { return x.id === cv.dataset.wave })[0]; drawMini(cv, v && v.peaks) })
    $$('[data-prev], [data-prev2]').forEach(function (b) { b.onclick = function () { preview(files.filter(function (x) { return x.id === (b.dataset.prev || b.dataset.prev2) })[0]) } })
    $$('[data-dl]').forEach(function (b) { b.onclick = function () { download(files.filter(function (x) { return x.id === b.dataset.dl })[0]) } })
    $$('[data-open]').forEach(function (b) { b.onclick = function () { go('#t/' + b.dataset.open) } })
    if ($('#fin-share')) $('#fin-share').onclick = function () { shareBox(c, null, true) }
    if ($('#dl-all')) $('#dl-all').onclick = function () { zipAll(files, titleOf, c.project.title + ' - Finals', this) }
  }
  // Credits (Alex, 7 Nov: "credits on the final folder, a template, music, lyrics, the video's credits")
  var CREDIT_TPL = {
    music: { name: 'Music', icon: 'music', roles: ['Artist', 'Title', 'Written by', 'Composed by', 'Lyrics by', 'Produced by', 'Mixed by', 'Mastered by', 'Recorded at', 'Label', 'Publisher', 'ISRC', 'Release date'], lyrics: true },
    video: { name: 'Video', icon: 'film', roles: ['Director', 'Producer', 'Production company', 'Director of photography', 'Editor', 'Colourist', 'Sound design', 'Music', 'Cast', 'Client / Agency'] },
    photo: { name: 'Photo', icon: 'image', roles: ['Photographer', 'Retouching', 'Styling', 'Hair & make-up', 'Model', 'Art direction', 'Client'] },
    custom: { name: 'Custom', icon: 'pen', roles: ['Role'] }
  }
  function creditsHtml(cr, edit) {
    var has = cr && ((cr.rows || []).some(function (r) { return r.name }) || cr.lyrics || cr.notes)
    if (!has && !edit) return ''
    var tpl = cr && CREDIT_TPL[cr.template]
    return '<section class="credits glass" id="credits"><div class="ch"><h2>Credits</h2>' + (tpl ? '<span class="ctpl">' + tpl.name + '</span>' : '') +
      '<div class="tools">' + (has ? '<button class="btn sm" id="cr-copy">' + ic('copy') + ' Copy</button>' : '') + (edit ? '<button class="btn sm' + (has ? '' : ' main') + '" id="cr-edit">' + ic(has ? 'pen' : 'plus') + (has ? ' Edit' : ' Add credits') + '</button>' : '') + '</div></div>' +
      (has ? '<div class="cgrid">' + (cr.rows || []).filter(function (r) { return r.name }).map(function (r) { return '<div class="crow"><small>' + esc(r.role) + '</small><b>' + esc(r.name) + '</b></div>' }).join('') + '</div>' +
        (cr.lyrics ? '<div><div class="kgroup" style="border:0;padding-left:0">Lyrics</div><div class="lyrics">' + esc(cr.lyrics) + '</div></div>' : '') +
        (cr.notes ? '<div class="cnotes">' + esc(cr.notes) + '</div>' : '')
        : '<p class="muted" style="margin:0">Put who made it next to the files: a music, video or photo template, lyrics and notes. Everyone with the Finals link sees them.</p>') + '</section>'
  }
  function creditsText(cr, title) {
    var t = [title, ''].concat((cr.rows || []).filter(function (r) { return r.name }).map(function (r) { return r.role + ': ' + r.name }))
    if (cr.lyrics) t.push('', 'Lyrics', cr.lyrics)
    if (cr.notes) t.push('', cr.notes)
    return t.join('\n')
  }
  function creditsBox(c, onSaved) {
    var cr = JSON.parse(JSON.stringify(c.project.credits || { template: '', rows: [], lyrics: '', notes: '' }))
    var m = modal('<div class="spread"><h2>Credits</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="field"><label>Template</label><div class="tplpick" id="cr-tpl">' + Object.keys(CREDIT_TPL).map(function (k) { return '<button type="button" class="btn' + (cr.template === k ? ' on' : '') + '" data-k="' + k + '">' + ic(CREDIT_TPL[k].icon) + CREDIT_TPL[k].name + '</button>' }).join('') + '</div></div>' +
      '<div class="credit-edit" id="cr-rows"></div><button type="button" class="btn sm" id="cr-add" style="justify-self:start">' + ic('plus') + ' Add a line</button>' +
      '<div class="field" id="cr-ly-f"><label for="cr-ly">Lyrics</label><textarea class="in" id="cr-ly" rows="7" placeholder="The words of the song, as you want them shown"></textarea></div>' +
      '<div class="field"><label for="cr-no">Notes</label><textarea class="in" id="cr-no" rows="2" placeholder="Thanks, links, anything else"></textarea></div>' +
      '<div class="row end"><button class="btn" data-x>Cancel</button><button class="btn main" id="cr-save">Save credits</button></div>')
    var card = $('.sheet-card', m); card.classList.add('wide')
    var rowsEl = $('#cr-rows', m)
    var paint = function () {
      rowsEl.innerHTML = (cr.rows || []).map(function (r, i) { return '<div class="cedit-row"><input class="in" data-r="' + i + '" data-f="role" value="' + esc(r.role) + '" placeholder="Role"><input class="in" data-r="' + i + '" data-f="name" value="' + esc(r.name) + '" placeholder="Name"><button type="button" class="ico sm danger" data-del="' + i + '" aria-label="Remove line">' + ic('x') + '</button></div>' }).join('')
      $$('input', rowsEl).forEach(function (inp) { inp.oninput = function () { cr.rows[+inp.dataset.r][inp.dataset.f] = inp.value } })
      $$('[data-del]', rowsEl).forEach(function (b) { b.onclick = function () { cr.rows.splice(+b.dataset.del, 1); paint() } })
      $('#cr-ly-f', m).hidden = !(cr.template === 'music' || cr.lyrics)
    }
    $('#cr-ly', m).value = cr.lyrics || ''; $('#cr-no', m).value = cr.notes || ''
    $('#cr-tpl', m).onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return
      var k = b.dataset.k; $$('#cr-tpl button', m).forEach(function (x) { x.classList.toggle('on', x === b) })
      var kept = {}; (cr.rows || []).forEach(function (r) { if (r.name) kept[r.role] = r.name })
      cr.template = k
      cr.rows = CREDIT_TPL[k].roles.map(function (role) { return { role: role, name: kept[role] || '' } }).concat((cr.rows || []).filter(function (r) { return r.name && CREDIT_TPL[k].roles.indexOf(r.role) < 0 }))
      paint()
    }
    $('#cr-add', m).onclick = function () { cr.rows = cr.rows || []; cr.rows.push({ role: '', name: '' }); paint(); var ins = $$('input', rowsEl); if (ins.length) ins[ins.length - 2].focus() }
    $('#cr-save', m).onclick = function () {
      cr.lyrics = $('#cr-ly', m).value.trim(); cr.notes = $('#cr-no', m).value.trim()
      cr.rows = (cr.rows || []).map(function (r) { return { role: String(r.role || '').trim().slice(0, 60), name: String(r.name || '').trim().slice(0, 200) } }).filter(function (r) { return r.role || r.name }).slice(0, 60)
      this.disabled = true
      sb.from('roarstudio_projects').update({ credits: cr }).eq('id', c.project.id).then(function (r) { if (r.error) { toast(r.error.message); return } c.project.credits = cr; close(); toast('Credits saved'); onSaved() })
    }
    if (!cr.template && !(cr.rows || []).length) $('#cr-tpl [data-k="music"]', m).click(); else paint()
  }

  // Download all as one .zip (Alex, 7 Nov), with RoarTransfer's own zip maker (../zip.js, ../zip-sw.js): where the browser
  // can, the service worker streams it straight to the disk, any size; otherwise made in memory up to 2 GB; past that,
  // one file after the other
  function zipAll(files, titleOf, name, btn) {
    files = files.filter(function (v) { return v.url || kindOf(v) !== 'suno' })
    if (!files.length) { toast('Songs from Suno stay on Suno'); return }
    var one = function (v) { if (v.url) saveUrl(v.url, v.file_name); else download(v) }
    if (files.length === 1 || !window.RTZip) { var i = 0; (function next() { if (i >= files.length) return; one(files[i++]); setTimeout(next, 1200) })(); return }
    var label = btn.innerHTML, say = function (t) { btn.innerHTML = ic('down') + ' ' + t }, done = function () { btn.innerHTML = label; btn.disabled = false }
    btn.disabled = true; say('Preparing…')
    var zipName = String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.zip'
    var used = {}
    Promise.all(files.map(function (v) { return (v.url ? Promise.resolve(v.url) : urlFor(v)).then(function (u) {
      var ext = (v.file_name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0], base = (titleOf(v) + (v.label ? ' - ' + v.label : '')).replace(/[\\/:*?"<>|]/g, ' ').trim() || 'file'
      var nm = base + ext; if (used[nm]) nm = base + ' (v' + v.n + ')' + ext; used[nm] = 1
      return { name: nm, url: u, size: Number(v.size) }
    }) })).then(function (list) {
      var total = list.reduce(function (n, f) { return n + (f.size || 0) }, 0) || 1
      var safari = /Safari\//.test(navigator.userAgent) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|Edg\/|Android/.test(navigator.userAgent)
      var viaWorker = !safari && 'serviceWorker' in navigator && window.ReadableStream && window.TransformStream
      var memory = function () {
        if (total > 2 * 1024 * 1024 * 1024) { done(); toast('Too big for one zip here: downloading one by one'); var i = 0; (function next() { if (i >= files.length) return; one(files[i++]); setTimeout(next, 1200) })(); return }
        var open = function (f) { return fetch(f.url, { mode: 'cors', cache: 'no-store', credentials: 'omit' }) }
        var rd = RTZip.stream(list, open, function (n) { say('Zipping ' + Math.min(99, Math.floor(n / total * 100)) + '%') }).getReader(), parts = []
        ;(function pump() { rd.read().then(function (c) {
          if (c.done) { var url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' })); var a = document.createElement('a'); a.href = url; a.download = zipName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url) }, 60000); done(); toast('Zip ready'); return }
          parts.push(c.value); pump()
        }, function (e) { done(); toast('The zip stopped: ' + (e && e.message || e)) }) })()
      }
      if (!viaWorker) return memory()
      navigator.serviceWorker.register('/zip-sw.js?v=3', { scope: '/__zip/', updateViaCache: 'none' }).then(function (reg) {
        var sw = reg.active || reg.waiting || reg.installing
        if (!sw) return null
        if (sw.state === 'activated') return sw
        return new Promise(function (ok) { var t = setTimeout(function () { ok(null) }, 8000); sw.addEventListener('statechange', function () { if (sw.state === 'activated') { clearTimeout(t); ok(sw) } else if (sw.state === 'redundant') { clearTimeout(t); ok(null) } }) })
      }).catch(function () { return null }).then(function (sw) {
        if (!sw) return memory()
        var id = Math.random().toString(36).slice(2) + Date.now().toString(36), ch = new MessageChannel(), ping = null, fr = null
        var stop = function () { clearInterval(ping); setTimeout(function () { if (fr) fr.remove() }, 4000); done() }
        var t = setTimeout(function () { memory() }, 4000)
        ch.port1.onmessage = function (m) {
          var x = m.data || {}
          if (x.ok) {
            clearTimeout(t); say('Zipping…')
            ping = setInterval(function () { try { sw.postMessage({ ping: 1 }) } catch (e) {} }, 10000)
            fr = document.createElement('iframe'); fr.hidden = true; fr.src = '/__zip/' + id + '/' + encodeURIComponent(zipName); document.body.appendChild(fr)
          } else if (x.bytes) say('Zipping ' + Math.min(99, Math.floor(x.bytes / total * 100)) + '%')
          else if (x.done) { stop(); toast('Zip ready') }
          else if (x.error) { stop(); toast('The zip stopped: ' + x.error) }
        }
        sw.postMessage({ zip: true, id: id, name: zipName, files: list }, [ch.port2])
      })
    }).catch(function (e) { done(); toast(e.message) })
  }
  // a final file up close (Alex, 7 Nov): only the thing itself, a waveform for sound, one Download; no names, a hairline frame
  var pvAudio = null
  function preview(v) {
    if (!v) return
    var k = kindOf(v)
    audio.pause()
    var m = modal('<div class="pv2" id="pv"><div class="spin"></div></div><div class="pv2-bar"><button class="btn sm main" id="pv-dl">' + ic('down') + ' Download</button><button class="ico sm" data-x aria-label="Close">' + ic('x') + '</button></div>')
    var card = $('.sheet-card', m); card.classList.add('lightbox', 'lb-' + k)
    $('#pv-dl', m).onclick = function () { download(v) }
    urlFor(v).then(function (u) {
      var box = $('#pv', m); if (!box) return
      if (k === 'image') { box.innerHTML = '<img src="' + esc(u) + '" alt="">'; return }
      if (k === 'video') { box.innerHTML = '<video src="' + esc(u) + '" controls autoplay playsinline' + (v.thumb ? ' poster="' + v.thumb + '"' : '') + '></video>'; return }
      // sound: our own waveform, a play button, the time
      box.innerHTML = '<div class="pva"><button class="play" id="pva-p" aria-label="Play">' + ic('pause') + '</button><div class="pva-w" id="pva-w"><canvas id="pva-c"></canvas></div><span class="time" id="pva-t">0:00</span></div>'
      if (pvAudio) pvAudio.pause()
      var a = pvAudio = new Audio(u); a.preload = 'auto'
      var pk = v.peaks || [], cv = $('#pva-c', m), wrap = $('#pva-w', m), drag = false
      var draw = function () {
        if (!document.body.contains(cv)) { a.pause(); return }
        var r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1
        if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr) }
        var g = cv.getContext('2d'), w = cv.width, h = cv.height, dur = a.duration || v.duration || 0, pos = dur ? a.currentTime / dur * w : 0
        g.clearRect(0, 0, w, h)
        var bars = Math.floor(w / (3 * dpr)), per = pk.length / Math.max(1, bars)
        for (var i = 0; i < bars; i++) {
          var mx = .05; if (pk.length) { mx = 0; for (var j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) mx = Math.max(mx, pk[j] || 0) }
          var bh = Math.max(2 * dpr, mx * h * .9), bx = i * 3 * dpr
          g.fillStyle = bx < pos ? '#a78bfa' : 'rgba(214,220,228,.32)'; g.fillRect(bx, (h - bh) / 2, 2 * dpr, bh)
        }
        g.fillStyle = '#fff'; g.fillRect(pos - dpr, 0, 2 * dpr, h)
        $('#pva-t', m).textContent = mmss(a.currentTime) + ' / ' + mmss(dur)
        if (a.paused) setTimeout(draw, 250); else requestAnimationFrame(draw)
      }
      var seek = function (e) { var r = wrap.getBoundingClientRect(), dur = a.duration || v.duration || 0; if (dur) a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur }
      wrap.onpointerdown = function (e) { drag = true; wrap.setPointerCapture(e.pointerId); seek(e) }
      wrap.onpointermove = function (e) { if (drag) seek(e) }
      wrap.onpointerup = wrap.onpointercancel = function () { drag = false }
      var pp = $('#pva-p', m)
      a.onplay = a.onpause = function () { pp.innerHTML = ic(a.paused ? 'play' : 'pause') }
      pp.onclick = function () { if (a.paused) a.play(); else a.pause() }
      a.play().catch(function () { pp.innerHTML = ic('play') })
      requestAnimationFrame(draw)
    }).catch(function (e) { toast(e.message) })
  }

  // =====================================================================================================
  // Playlists (Alex, 7 Nov, as mixup): files in an order, played one after the other, with their own link
  // =====================================================================================================
  function renderPlaylist(id) {
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    sb.from('roarstudio_playlists').select('*').eq('id', id).maybeSingle().then(function (r) {
      if (!r.data) throw new Error('This playlist is no longer here.')
      var pl = r.data
      return loadProject(pl.project_id).then(function (c) { drawPlaylist(c, pl) })
    }).catch(function (e) { setTop([]); view.innerHTML = errorBox(e.message) })
  }
  function drawPlaylist(c, pl) {
    var view = $('#view'), edit = !share && canDo('editor')
    var items = (pl.items || []).map(function (tid) { return c.tracks.filter(function (t) { return t.id === tid })[0] }).filter(Boolean)
    var playable = function (t) { var v = latest(t.id); return v && kindOf(v) !== 'image' }
    var total = items.reduce(function (a, t) { var v = latest(t.id); return a + ((v && v.duration) || 0) }, 0)
    var at = -1
    setTop([c.project.title, pl.title])
    view.innerHTML = brandBanner() + '<div class="head">' + (share ? '<span class="fi big" style="background:linear-gradient(160deg,#c4b5fd,#6d28d9);color:#fff">' + ic('list') + '</span>' : '<button class="ico" id="back" aria-label="Back to the project">' + ic('back') + '</button>') +
      '<div style="min-width:0"><h1>' + esc(pl.title) + '</h1><div class="sub">' + (share ? 'Playlist' + (share.data.project.owner_name ? ' from ' + esc(share.data.project.owner_name) : '') : esc(c.project.title)) + ' · ' + items.length + ' file' + (items.length === 1 ? '' : 's') + (total ? ' · ' + mmss(total) : '') + '</div></div>' +
      '<div class="tools">' + (items.length ? '<button class="btn main" id="pl-play">' + ic('play') + ' Play all</button>' : '') + (edit ? '<button class="btn" id="pl-add">' + ic('plus') + ' Add files</button><button class="btn" id="pl-sh">' + ic('share') + ' Share</button><button class="ico" id="pl-m" aria-label="More">' + ic('dots') + '</button>' : '') + '</div></div>' +
      '<div class="media" id="pl-media" hidden></div>' +
      '<div class="nowbar glass" id="nowbar" hidden><button class="ico sm" id="nb-prev" aria-label="Previous">' + ic('prev') + '</button><button class="play" id="nb-pp" aria-label="Play">' + ic('play') + '</button><button class="ico sm" id="nb-next" aria-label="Next">' + ic('nextt') + '</button><div class="nbmid"><b id="nb-t"></b><div class="nbbar" id="nb-bar"><i></i></div></div><span class="time" id="nb-time">0:00</span></div>' +
      '<div class="tracks plist" id="plist">' + (items.length ? items.map(function (t, i) {
        var v = latest(t.id), k = v ? kindOf(v) : 'audio'
        return '<div class="trk glass' + (playable(t) ? '' : ' muted-row') + '" data-i="' + i + '"><span class="num mono">' + (i + 1) + '</span>' + (v && v.thumb ? '<span class="th" style="background-image:url(' + cssu(v.thumb) + ')"></span>' : '<span class="th"><i>' + ic(k === 'video' ? 'film' : k === 'image' ? 'image' : 'music') + '</i></span>') +
          '<div class="nm"><b>' + esc(t.title) + '</b><span>' + esc(vname(v)) + ' · ' + KIND_WORD[k] + '</span></div><span class="t">' + (v && k !== 'image' ? mmss(v.duration) : '') + '</span>' +
          '<span class="racts">' + (share && share.data.can.download ? '<button class="ico sm" data-dl="' + t.id + '" aria-label="Download">' + ic('down') + '</button>' : '') + (edit ? '<button class="ico sm" data-up="' + i + '" aria-label="Move up">' + ic('up2') + '</button><button class="ico sm" data-dn="' + i + '" aria-label="Move down">' + ic('dn2') + '</button><button class="ico sm danger" data-rm="' + i + '" aria-label="Take out">' + ic('x') + '</button>' : '') + '</span></div>'
      }).join('') : '<div class="empty glass"><span class="ico" style="width:64px;height:64px">' + ic('list') + '</span><h2>An empty playlist</h2><p>' + (edit ? 'Press Add files and pick songs or videos from this project, in the order you want them played.' : 'Nothing here yet.') + '</p></div>') + '</div>'
    var save = function () { return sb.from('roarstudio_playlists').update({ items: pl.items }).eq('id', pl.id).then(function (r) { if (r.error) toast(r.error.message); drawPlaylist(c, pl) }) }
    if ($('#back')) $('#back').onclick = function () { audio.pause(); go('#p/' + c.project.id) }
    function playAt(i) {
      if (i < 0 || i >= items.length) { at = -1; paint(); return }
      if (!playable(items[i])) return playAt(i + 1)
      at = i; var v = latest(items[i].id), box = $('#pl-media')
      if (kindOf(v) === 'video') { box.hidden = false; if (vidEl.parentNode !== box) { box.innerHTML = ''; box.appendChild(vidEl) } vidEl.poster = v.thumb || '' } else box.hidden = true
      load(v, false, true).catch(function (e) { toast(e.message) })
      paint()
    }
    function paint() {
      $('#nowbar').hidden = at < 0
      $$('#plist .trk').forEach(function (r) { r.classList.toggle('on', +r.dataset.i === at) })
      if (at >= 0) $('#nb-t').textContent = items[at].title
      $('#nb-pp').innerHTML = ic(audio.paused ? 'play' : 'pause')
    }
    ;[audEl, vidEl].forEach(function (el) {
      el.onended = function () { if (document.body.contains($('#plist'))) playAt(at + 1) }
      el.onplay = el.onpause = function () { if (document.body.contains($('#plist'))) paint() }
    })
    $$('#plist .trk').forEach(function (r) { r.onclick = function (e) { if (e.target.closest('.racts')) return; playAt(+r.dataset.i) } })
    if ($('#pl-play')) $('#pl-play').onclick = function () { playAt(0) }
    $('#nb-pp').onclick = function () { if (audio.paused) play(); else audio.pause() }
    $('#nb-prev').onclick = function () { playAt(Math.max(0, at - 1)) }
    $('#nb-next').onclick = function () { playAt(at + 1) }
    $('#nb-bar').onclick = function (e) { var r = this.getBoundingClientRect(); if (audio.duration) audio.currentTime = (e.clientX - r.left) / r.width * audio.duration }
    ;(function tick() { if (!document.body.contains($('#plist'))) return; var d = audio.duration || 0; $('#nb-bar i').style.width = (d ? audio.currentTime / d * 100 : 0) + '%'; $('#nb-time').textContent = mmss(audio.currentTime) + ' / ' + mmss(d); frameLater(tick) })()
    $$('[data-dl]').forEach(function (b) { b.onclick = function () { download(latest(b.dataset.dl)) } })
    if (edit) {
      $$('[data-up]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.up; if (i < 1) return; var a = pl.items; a.splice(i - 1, 0, a.splice(i, 1)[0]); save() } })
      $$('[data-dn]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.dn; var a = pl.items; if (i >= a.length - 1) return; a.splice(i + 1, 0, a.splice(i, 1)[0]); save() } })
      $$('[data-rm]').forEach(function (b) { b.onclick = function () { pl.items.splice(+b.dataset.rm, 1); save() } })
      $('#pl-add').onclick = function () {
        var cand = c.tracks.filter(function (t) { var v = latest(t.id); return v && kindOf(v) !== 'image' && pl.items.indexOf(t.id) < 0 })
        modal('<div class="spread"><h2>Add to “' + esc(pl.title) + '”</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
          (cand.length ? '<div class="picks">' + cand.map(function (t) { var v = latest(t.id); return '<label class="pick"><input type="checkbox" value="' + t.id + '"><span class="th"' + (v.thumb ? ' style="background-image:url(' + cssu(v.thumb) + ')"' : '') + '>' + (v.thumb ? '' : '<i>' + ic(kindOf(v) === 'video' ? 'film' : 'music') + '</i>') + '</span><span class="nm"><b>' + esc(t.title) + '</b><small>' + KIND_WORD[kindOf(v)] + ' · ' + mmss(v.duration) + '</small></span></label>' }).join('') + '</div><div class="row end"><button class="btn" data-x>Cancel</button><button class="btn main" id="pk-go">Add</button></div>'
            : '<p class="muted" style="margin:0">Every song and video of this project is already in it. Upload more to the project first.</p>'), function (m) {
          if ($('#pk-go', m)) $('#pk-go', m).onclick = function () { $$('.pick input:checked', m).forEach(function (x) { pl.items.push(x.value) }); close(); save() }
        })
      }
      $('#pl-sh').onclick = function () { shareBox(c, null, false, pl) }
      $('#pl-m').onclick = function () {
        modal('<div class="spread"><h2>' + esc(pl.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="plm-r">' + ic('pen') + ' Rename playlist</button><button class="btn danger" id="plm-d">' + ic('trash') + ' Delete playlist</button></div>', function (m) {
          $('#plm-r', m).onclick = function () { prompt1('Rename playlist', 'Name', pl.title, 'Save', function (v) { pl.title = v; return sb.from('roarstudio_playlists').update({ title: v }).eq('id', pl.id).then(function () { drawPlaylist(c, pl) }) }) }
          $('#plm-d', m).onclick = function () { confirmBox('Delete “' + pl.title + '”?', 'Only the playlist goes; the files stay in the project. Its links stop working.', 'Delete', function () { return sb.from('roarstudio_playlists').delete().eq('id', pl.id).then(function () { audio.pause(); go('#p/' + c.project.id) }) }) }
        })
      }
    }
    paint()
  }

  // =====================================================================================================
  // Settings (Alex, 7 Nov, from mixup's organisation, profile and notification pages)
  // =====================================================================================================
  function renderSettings() {
    setTop(['Settings'])
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    Promise.all([
      sb.from('roarstudio_studios').select('*').eq('owner', session.user.id).maybeSingle(),
      sb.from('roarstudio_prefs').select('*').eq('user_id', session.user.id).maybeSingle()
    ]).then(function (r) {
      var st = r[0].data || { owner: session.user.id, name: '', logo: null, banner: null, invite_role: 'commenter', link_comment: true, link_approve: true, link_download: false, hide_versions: false }
      var pf = r[1].data || { user_id: session.user.id, notify_notes: true, notify_approvals: true, notify_versions: true, notify_shared: true, digest: false, upload_naming: false }
      var sw = function (id, on) { return '<button type="button" class="sw" id="' + id + '" aria-pressed="' + !!on + '"></button>' }
      var row = function (t, d, ctl) { return '<div class="srow"><div><b>' + t + '</b><small>' + d + '</small></div>' + ctl + '</div>' }
      view.innerHTML = '<div class="head"><div><h1>Settings</h1><div class="sub">Your studio, your defaults and your emails</div></div><div class="tools"><button class="btn" id="go-sto">' + ic('disk') + ' Storage</button></div></div>' +
        '<div class="sgrid">' +
        '<section class="scard glass"><h2>Your studio</h2><p class="muted">Shown at the top of every page you send: links, playlists and Finals.</p>' +
        '<div class="brandset"><div class="field"><label>Square logo</label><button class="logo-pick" id="st-logo"' + (st.logo ? ' style="background-image:url(' + cssu(st.logo) + ')"' : '') + ' aria-label="Choose the logo">' + (st.logo ? '' : ic('plus')) + '</button></div>' +
        '<div class="field" style="flex:1;min-width:0"><label>Wide banner</label><button class="banner-pick" id="st-banner"' + (st.banner ? ' style="background-image:url(' + cssu(st.banner) + ')"' : '') + ' aria-label="Choose the banner">' + (st.banner ? '' : ic('plus')) + '</button></div></div>' +
        '<div class="field"><label>Background of your pages</label><button class="banner-pick bd-pick" id="st-bd"' + (st.backdrop ? ' style="background-image:url(' + cssu(st.backdrop) + ')"' : '') + ' aria-label="Choose the background">' + (st.backdrop ? '' : ic('plus')) + '</button><small class="muted">Shown softly behind your Finals, playlists and links, under the glass.</small></div>' +
        '<div class="row">' + (st.backdrop ? '<button class="btn sm" id="st-bd-x">Remove background</button>' : '') + (st.logo ? '<button class="btn sm" id="st-logo-x">Remove logo</button>' : '') + (st.banner ? '<button class="btn sm" id="st-banner-x">Remove banner</button>' : '') + '</div>' +
        '<div class="field"><label for="st-name">Studio name</label><div class="row" style="flex-wrap:nowrap"><input class="in" id="st-name" maxlength="80" value="' + esc(st.name) + '" placeholder="The Mad Lions"><button class="btn main" id="st-save">Save</button></div></div></section>' +
        '<section class="scard glass"><h2>Defaults</h2><p class="muted">What new invitations and links start with. You can change each one when you make it.</p>' +
        row('Invitations', 'The role someone gets when you add them', '<select class="in" id="st-role" style="width:auto"><option value="editor">Can upload and edit</option><option value="commenter">Can listen and comment</option><option value="listener">Can listen</option></select>') +
        row('Links: comments', 'People with a link can leave notes', sw('st-lc', st.link_comment)) +
        row('Links: approve', 'People with a link can approve a version', sw('st-la', st.link_approve)) +
        row('Links: download', 'People with a link can download the files', sw('st-ld', st.link_download)) +
        row('Hide version numbers', 'People on your links see a version’s name or date, never v1, v2…', sw('st-hv', st.hide_versions)) +
        row('Watermark on links', 'Your studio’s name over pictures seen through review links; Finals stay clean', sw('st-wm', st.watermark)) +
        row('Viewer’s name on links', 'Whoever opens a review link gives their name, and sees it with the day over the video and pictures, so nothing leaks unnoticed', sw('st-wv', st.watermark_viewer)) + '</section>' +
        '<section class="scard glass"><h2>Emails</h2><p class="muted">Sent to ' + esc(session.user.email || '') + ', a few minutes after it happens, grouped together.</p>' +
        row('Notes', 'Someone leaves a note on your files', sw('pf-n', pf.notify_notes)) +
        row('New versions', 'Someone uploads a file or a new version', sw('pf-v', pf.notify_versions)) +
        row('Approvals and finals', 'A version is approved or made final', sw('pf-a', pf.notify_approvals)) +
        row('Shared with me', 'Someone adds you to a project', sw('pf-s', pf.notify_shared)) +
        row('Once a day', 'One email a day instead of a few minutes after', sw('pf-d', pf.digest)) + '</section>' +
        '<section class="scard glass"><h2>Look</h2>' + row('Theme', 'Kept on this device', '<div class="lens-group" id="st-theme"><span class="lens"></span><button data-t="dark">Dark</button><button data-t="light">Light</button><button data-t="system">System</button></div>') +
        '<div class="field"><label>Background</label><div class="bgpick" id="st-bg">' + BGS.map(function (b) { return '<button type="button" data-b="' + b.id + '" style="' + (b.id === 'none' ? '' : "background-image:url('" + (b.id === 'desk' ? 'bg.webp' : 'bg-' + b.id + '-s.webp') + "')") + '"><span>' + b.name + '</span></button>' }).join('') + '</div></div></section>' +
        '<section class="scard glass"><h2>Uploads</h2>' + row('Upload naming', 'Ask for a title before a new file, and a name before a new version', sw('pf-u', pf.upload_naming)) + '</section>' +
        '<section class="scard glass"><h2>Account</h2><p class="muted">Your name, picture, password and two-step verification live in your Roar account, the same for every Roar app.</p><div class="row"><a class="btn" href="https://themadlions.com/account/" target="_blank" rel="noopener">' + ic('out') + ' Open my Roar account</a><button class="btn" id="st-out">' + ic('back') + ' Sign out</button></div></section>' +
        '</div>'
      // two columns that each stack their cards with the same gap, so no card leaves a hole (Alex, 7 Nov)
      ;(function () {
        var g = $('.sgrid'), secs = $$('.scard', g), L = document.createElement('div'), R = document.createElement('div')
        L.className = R.className = 'scol'
        secs.forEach(function (sec, i) { sec.style.order = i })
        ;[0, 4, 5].forEach(function (i) { if (secs[i]) L.appendChild(secs[i]) })
        ;[1, 2, 3].forEach(function (i) { if (secs[i]) R.appendChild(secs[i]) })
        g.appendChild(L); g.appendChild(R)
      })()
      $('#st-role').value = st.invite_role || 'commenter'
      var thg = $('#st-theme'), th = store.get('rs-theme') || 'dark'
      $$('button', thg).forEach(function (b) { b.classList.toggle('on', b.dataset.t === th) }); setTimeout(function () { lens(thg) }, 30)
      var bgg = $('#st-bg'), bnow = store.get('rs-bg') || 'waves'
      $$('button', bgg).forEach(function (b) { b.classList.toggle('on', b.dataset.b === bnow) })
      bgg.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; store.set('rs-bg', b.dataset.b); $$('button', bgg).forEach(function (x) { x.classList.toggle('on', x === b) }); wearBg() }
      thg.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; store.set('rs-theme', b.dataset.t); $$('button', thg).forEach(function (x) { x.classList.toggle('on', x === b) }); lens(thg); wearTheme() }
      var saveSt = function (patch, msg) { Object.assign(st, patch, { owner: session.user.id, updated_at: new Date().toISOString() }); return sb.from('roarstudio_studios').upsert(st).then(function (q) { if (q.error) toast(q.error.message); else { if (msg) toast(msg); if (me) me.studio = st } }) }
      var savePf = function (patch) { Object.assign(pf, patch, { user_id: session.user.id, updated_at: new Date().toISOString() }); return sb.from('roarstudio_prefs').upsert(pf).then(function (q) { if (q.error) toast(q.error.message); else { if (me) me.prefs = pf; toast('Saved') } }) }
      var flip = function (id, fn) { $(id).onclick = function () { var on = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', on); fn(on) } }
      flip('#st-lc', function (on) { saveSt({ link_comment: on }, 'Saved') }); flip('#st-la', function (on) { saveSt({ link_approve: on }, 'Saved') }); flip('#st-ld', function (on) { saveSt({ link_download: on }, 'Saved') }); flip('#st-wm', function (on) { saveSt({ watermark: on }, 'Saved') }); flip('#st-wv', function (on) { saveSt({ watermark_viewer: on }, 'Saved') }); flip('#st-hv', function (on) { saveSt({ hide_versions: on }, 'Saved') })
      flip('#pf-n', function (on) { savePf({ notify_notes: on }) }); flip('#pf-v', function (on) { savePf({ notify_versions: on }) }); flip('#pf-a', function (on) { savePf({ notify_approvals: on }) }); flip('#pf-s', function (on) { savePf({ notify_shared: on }) }); flip('#pf-d', function (on) { savePf({ digest: on }) }); flip('#pf-u', function (on) { savePf({ upload_naming: on }) })
      $('#st-role').onchange = function () { saveSt({ invite_role: this.value }, 'Saved') }
      $('#st-save').onclick = function () { saveSt({ name: $('#st-name').value.trim() }, 'Studio name saved') }
      $('#st-logo').onclick = function () { cropBox({ title: 'Square logo', w: 400, h: 400, current: st.logo, png: true, onDone: function (u) { return saveSt({ logo: u }, 'Logo saved').then(renderSettings) } }) }
      $('#st-banner').onclick = function () { cropBox({ title: 'Wide banner', w: 1600, h: 400, current: st.banner, onDone: function (u) { return saveSt({ banner: u }, 'Banner saved').then(renderSettings) } }) }
      $('#st-bd').onclick = function () { cropBox({ title: 'Background of your pages', w: 1920, h: 1080, current: st.backdrop, onDone: function (u) { return saveSt({ backdrop: u }, 'Background saved').then(renderSettings) } }) }
      if ($('#st-bd-x')) $('#st-bd-x').onclick = function () { saveSt({ backdrop: null }, 'Background removed').then(renderSettings) }
      if ($('#st-logo-x')) $('#st-logo-x').onclick = function () { saveSt({ logo: null }, 'Logo removed').then(renderSettings) }
      if ($('#st-banner-x')) $('#st-banner-x').onclick = function () { saveSt({ banner: null }, 'Banner removed').then(renderSettings) }
      $('#st-out').onclick = function () { sb.auth.signOut() }
      $('#go-sto').onclick = function () { go('#storage') }
    })
  }

  // ---- Storage: what each project takes, and what kind of files ----
  function renderStorage() {
    setTop(['Storage'])
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    api('usage').then(function (d) {
      var tot = d.bytes || 0, ps = d.projects || [], k = d.kinds || { audio: 0, video: 0, image: 0 }, top = Math.max(1, ps.reduce(function (a, p) { return Math.max(a, p.bytes) }, 0))
      var seg = function (n, col) { return tot ? '<i style="width:' + (n / tot * 100) + '%;background:' + col + '"></i>' : '' }
      view.innerHTML = '<div class="head"><div><h1>Storage</h1><div class="sub">Your projects, stored safely in Europe</div></div><div class="tools"><button class="btn" id="go-set">' + ic('gear') + ' Settings</button></div></div>' +
        '<section class="scard glass storage"><div class="big"><b>' + size(tot) + '</b><span>in ' + ps.length + ' project' + (ps.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="kbar">' + seg(k.audio, '#a78bfa') + seg(k.video, '#22d3ee') + seg(k.image, '#ffd166') + '</div>' +
        '<div class="klegend"><span><i style="background:#a78bfa"></i>Audio ' + size(k.audio) + '</span><span><i style="background:#22d3ee"></i>Video ' + size(k.video) + '</span><span><i style="background:#ffd166"></i>Pictures ' + size(k.image) + '</span></div>' +
        '<p class="muted" style="margin:0;font-size:13px">Unlimited while RoarTransfer Studio is new. Files shared with you count for their owner.</p></section>' +
        '<div class="tracks" style="margin-top:14px">' + ps.map(function (p) { return '<button class="srow2 glass" data-p="' + p.id + '"><span class="nm"><b>' + esc(p.title) + '</b><small>' + p.files + ' file' + (p.files === 1 ? '' : 's') + (p.finals ? ' · ' + size(p.finals) + ' final' : '') + '</small></span><span class="pbar"><i style="width:' + Math.max(1, p.bytes / top * 100) + '%"></i></span><span class="t">' + size(p.bytes) + '</span></button>' }).join('') + '</div>'
      $$('[data-p]').forEach(function (b) { b.onclick = function () { go('#p/' + b.dataset.p) } })
      $('#go-set').onclick = function () { go('#settings') }
    })
  }

  // ---- Admin: who uses RoarTransfer Studio and how (Alex, 7 Nov) ----
  function renderAdmin() {
    setTop(['Admin'])
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    api('admin-stats').then(function (d) {
      if (d.error) { view.innerHTML = errorBox(d.error === 'not allowed' ? 'Only RoarTransfer Studio’s admins see this page.' : d.error); return }
      var t = d.totals, days = d.days || [], top = Math.max(1, days.reduce(function (a, x) { return Math.max(a, x.uploads + x.notes) }, 0))
      var kpi = function (n, l, s2) { return '<div class="kpi glass"><b>' + n + '</b><span>' + l + '</span>' + (s2 ? '<small>' + s2 + '</small>' : '') + '</div>' }
      var kt = d.kinds, kb = Math.max(1, kt.audio.bytes + kt.video.bytes + kt.image.bytes)
      view.innerHTML = '<div class="head"><div><h1>Admin</h1><div class="sub">Everyone on RoarTransfer Studio, what they use and how · ' + new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div><div class="tools"><button class="btn" id="ad-re">' + ic('rot') + ' Refresh</button></div></div>' +
        '<div class="kpis">' + kpi(t.accounts, 'Accounts', t.active7 + ' active this week') + kpi(t.projects, 'Projects', t.folders + ' folders · ' + t.playlists + ' playlists') + kpi(t.files, 'Files', t.finals + ' final · ' + t.approved + ' approved') + kpi(size(t.storage), 'Stored') + kpi(t.notes, 'Notes', t.guest_notes + ' from guests') + kpi(t.links, 'Links', t.finals_links + ' Finals links') + '</div>' +
        '<div class="adgrid"><section class="scard glass"><h2>Last 30 days</h2><div class="chart" role="img" aria-label="Uploads and notes per day">' + days.map(function (x) { return '<div class="col" title="' + x.day + ': ' + x.uploads + ' uploads, ' + x.notes + ' notes, ' + x.views + ' link plays/views"><i class="u" style="height:' + (x.uploads / top * 100) + '%"></i><i class="n" style="height:' + (x.notes / top * 100) + '%"></i></div>' }).join('') + '</div><div class="klegend"><span><i style="background:#a78bfa"></i>Uploads</span><span><i style="background:#22d3ee"></i>Notes</span><span>Links: ' + d.link_activity.view + ' opened · ' + d.link_activity.stream + ' played · ' + d.link_activity.download + ' downloaded</span></div></section>' +
        '<section class="scard glass"><h2>What they upload</h2>' + ['audio', 'video', 'image'].map(function (k) { return '<div class="srow"><div><b><i class="kdot k-' + k + '"></i>' + KIND_PLURAL[k] + '</b><small>' + kt[k].files + ' file' + (kt[k].files === 1 ? '' : 's') + '</small></div><span class="pbar" style="width:40%"><i style="width:' + Math.max(1, kt[k].bytes / kb * 100) + '%"></i></span><span class="mono" style="font-size:13px">' + size(kt[k].bytes) + '</span></div>' }).join('') + '</section></div>' +
        '<section class="scard glass" style="margin-top:14px"><h2>Accounts</h2><div class="atable"><div class="arow ah"><span>Account</span><span>Joined</span><span>Last active</span><span>Projects</span><span>Uploads</span><span>Notes</span><span>Storage</span></div>' +
        d.accounts.map(function (a) { return '<div class="arow"><span class="who2"><b>' + esc(a.name || a.email.split('@')[0]) + '</b><small>' + esc(a.email) + '</small></span><span>' + new Date(a.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + '</span><span>' + (a.last ? ago(a.last) : '—') + '</span><span>' + a.projects + (a.member_of ? ' <small>+' + a.member_of + ' shared</small>' : '') + '</span><span>' + a.uploads + '</span><span>' + a.notes + '</span><span>' + size(a.storage) + '</span></div>' }).join('') + '</div></section>' +
        '<section class="scard glass" style="margin-top:14px" id="ad-pro"><h2>Studio Pro</h2><div class="spin"></div></section>' +
        '<section class="scard glass" style="margin-top:14px" id="ad-wl"><h2>Waiting list</h2><div class="spin"></div></section>' +
        '<section class="scard glass" style="margin-top:14px"><h2>Biggest projects</h2>' + d.top.map(function (p) { return '<div class="srow"><div><b>' + esc(p.title) + '</b><small>' + esc(p.owner) + ' · ' + p.files + ' files · ' + ago(p.updated) + '</small></div><span class="mono" style="font-size:13px">' + size(p.bytes) + '</span></div>' }).join('') + '</section>'
      $('#ad-re').onclick = renderAdmin
      adminPro(); adminWait()
    })
  }
  // Admin > Studio Pro (Alex, 8 Nov 2026: "let me make people Pro in the Studio, as in RoarTransfer"): by email, for a month,
  // a year or always; Studio Pro also gives RoarTransfer Pro to the same date (the roarstudio function, pro-*)
  function adminPro() {
    var box = $('#ad-pro'); if (!box) return
    var months = 1
    var day = function (iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
    api('pro-list').then(function (d) {
      if (d.error) { box.innerHTML = '<h2>Studio Pro</h2><p class="muted">' + esc(d.error) + '</p>'; return }
      var ppl = d.people || []
      box.innerHTML = '<div class="spread"><h2>Studio Pro</h2><small class="muted">' + ppl.filter(function (p) { return p.pro && !p.admin }).length + ' given · admins are always Pro</small></div>' +
        '<p class="muted" style="margin:4px 0 12px;font-size:13px">Studio Pro includes RoarTransfer Pro: it is given to the same date (a longer RoarTransfer Pro they already have stays).</p>' +
        '<div class="progrant"><input class="in" id="pg-em" type="email" placeholder="Their Roar account email" autocomplete="off"><div class="chips" id="pg-m"><button data-m="1" class="on">1 month</button><button data-m="12">1 year</button><button data-m="0">Always</button></div><button class="btn main" id="pg-go">' + ic('star') + ' Make Pro</button></div>' +
        '<div class="prolist">' + (ppl.length ? ppl.map(function (p) {
          var st = p.admin ? '<span class="pchip on">Admin · always</span>' : p.pro ? '<span class="pchip on">' + (p.until ? 'Pro until ' + day(p.until) : 'Pro · always') + '</span>' : '<span class="pchip">Ended' + (p.until ? ' ' + day(p.until) : '') + '</span>'
          var act = p.admin ? '' : p.pro ? '<button class="ico sm" data-rv="' + p.id + '" aria-label="Take Pro away" title="Take Pro away">' + ic('trash') + '</button>' : '<button class="btn" data-ag="' + esc(p.email) + '">Give again</button>'
          return '<div class="srow"><div><b>' + esc(p.name || p.email.split('@')[0]) + '</b><small>' + esc(p.email) + '</small></div><div class="row" style="gap:8px">' + st + act + '</div></div>'
        }).join('') : '<p class="muted">Nobody yet.</p>') + '</div>'
      $('#pg-m', box).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; months = +b.dataset.m; $$('#pg-m button', box).forEach(function (x) { x.classList.toggle('on', x === b) }) }
      var grant = function (email) {
        email = String(email || '').trim(); if (!email) { $('#pg-em', box).focus(); return }
        $('#pg-go', box).disabled = true
        api('pro-grant', { email: email, months: months }).then(function (r) {
          $('#pg-go', box).disabled = false
          if (r.error) { toast(r.error); return }
          toast(r.transfer === 'kept' ? 'Studio Pro given · their longer RoarTransfer Pro stays' : 'Studio Pro given, with RoarTransfer Pro'); adminPro()
        })
      }
      $('#pg-go', box).onclick = function () { grant($('#pg-em', box).value) }
      $('#pg-em', box).onkeydown = function (e) { if (e.key === 'Enter') grant(this.value) }
      $$('[data-ag]', box).forEach(function (b) { b.onclick = function () { $('#pg-em', box).value = b.dataset.ag; grant(b.dataset.ag) } })
      $$('[data-rv]', box).forEach(function (b) { b.onclick = function () {
        if (!confirm('Take Studio Pro away now? The RoarTransfer Pro it gave ends too.')) return
        api('pro-revoke', { id: b.dataset.rv }).then(function (r) { if (r.error) toast(r.error); else { toast('Studio Pro taken away'); adminPro() } })
      } })
    })
  }
  // the waiting list from the pricing pages (Alex, 8 Nov 2026: "pre-order next to Coming soon")
  function adminWait() {
    var box = $('#ad-wl'); if (!box) return
    api('waitlist-list').then(function (d) {
      if (d.error) { box.innerHTML = '<h2>Waiting list</h2><p class="muted">' + esc(d.error) + '</p>'; return }
      var rows = d.rows || [], name = { 'studio-pro': 'Studio Pro', 'transfer-pro': 'RoarTransfer Pro' }
      var n = function (p) { return rows.filter(function (r) { return r.plan === p }).length }
      box.innerHTML = '<div class="spread"><h2>Waiting list</h2>' + (rows.length ? '<button class="btn" id="wl-cp">' + ic('copy') + ' Copy emails</button>' : '') + '</div>' +
        '<p class="muted" style="margin:4px 0 8px;font-size:13px">People who asked to be told when paying opens, from the pricing pages · ' + n('studio-pro') + ' Studio Pro · ' + n('transfer-pro') + ' RoarTransfer Pro</p>' +
        (rows.length ? rows.map(function (r) { return '<div class="srow"><div><b>' + esc(r.email) + '</b><small>' + name[r.plan] + (r.billing ? ' · ' + (r.billing === 'year' ? 'yearly' : 'monthly') : '') + (r.lang === 'el' ? ' · Greek' : '') + '</small></div><small class="muted">' + ago(r.created_at) + '</small></div>' }).join('') : '<p class="muted">Nobody yet.</p>')
      var cp = $('#wl-cp', box); if (cp) cp.onclick = function () { copyText(rows.map(function (r) { return r.email }).filter(function (x, i, a) { return a.indexOf(x) === i }).join(', '), 'Emails copied') }
    })
  }

  // ---- the bell: what happened in my projects and in the ones shared with me ----
  var ACT = { note: ['Comments', 'reply'], approve: ['Approvals', 'check'], final: ['Approvals', 'star'], download: ['Downloads', 'down'], stream: ['Streams', 'play'], view: ['Views', 'eye'], version: ['Uploads', 'up'], shared: ['Shared', 'people'] }
  var BELL_KINDS = ['note', 'approve', 'final', 'version', 'shared', 'download'], bellTimer = null
  function bellCount() {
    if (!session) return
    var seen = store.get('rs-seen') || new Date(Date.now() - 3 * 864e5).toISOString()
    // actor is empty for people on a link: "not me" has to keep those (Alex, 8 Nov: guests' notes never showed on the bell)
    sb.from('roarstudio_events').select('id', { count: 'exact', head: true }).gt('created_at', seen).in('kind', BELL_KINDS).or('actor.is.null,actor.neq.' + session.user.id).then(function (r) {
      var b = $('#bell-n'); if (!b) return
      var n = r.count || 0; b.hidden = !n; b.textContent = n > 9 ? '9+' : n
      $('#bell') && $('#bell').classList.toggle('has', !!n)
    })
    if (!bellTimer) { bellTimer = setInterval(function () { if (document.visibilityState === 'visible') bellCount() }, 45000); document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') bellCount() }) }
  }
  function activityPanel() {
    var filt = 'All', seenBefore = store.get('rs-seen') || new Date(Date.now() - 3 * 864e5).toISOString()
    var CH = [['All', null], ['Notes', ['note']], ['Approvals', ['approve', 'final']], ['Uploads', ['version']], ['Downloads', ['download']]].concat(me && me.pro ? [['Visits', ['view']]] : [])
    var m = modal('<div class="spread"><h2>Notifications</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="chips" id="ac-f">' + CH.map(function (f, i) { return '<button' + (i ? '' : ' class="on"') + ' data-f="' + f[0] + '">' + f[0] + '</button>' }).join('') + '</div><div id="ac-sum"></div><div class="aclist" id="ac-l"><div class="spin"></div></div>')
    $('.sheet-card', m).classList.add('drawer')
    m.classList.add('side')
    store.set('rs-seen', new Date().toISOString()); var bn = $('#bell-n'); if (bn) bn.hidden = true; if ($('#bell')) $('#bell').classList.remove('has')
    var week = new Date(Date.now() - 7 * 864e5).toISOString()
    Promise.all([sb.from('roarstudio_events').select('*').order('created_at', { ascending: false }).limit(300), sb.from('roarstudio_projects').select('id, title, owner')]).then(function (r) {
      var all = (r[0].data || []).filter(function (e) { return e.actor !== session.user.id }), ps = r[1].data || []
      var evs = all.filter(function (e) { return BELL_KINDS.indexOf(e.kind) >= 0 })
      var opens = all.filter(function (e) { return e.kind === 'view' && e.created_at > week }).length, plays = all.filter(function (e) { return e.kind === 'stream' && e.created_at > week }).length
      $('#ac-sum', m).innerHTML = opens || plays ? '<div class="acsum">' + ic('eye') + '<span>This week your links were opened <b>' + opens + '</b> time' + (opens === 1 ? '' : 's') + ' and played <b>' + plays + '</b> time' + (plays === 1 ? '' : 's') + '.</span></div>' : ''
      var tids = evs.map(function (e) { return e.track_id }).filter(Boolean)
      ;(tids.length ? sb.from('roarstudio_tracks').select('id, title').in('id', tids.filter(function (x, i) { return tids.indexOf(x) === i }).slice(0, 200)) : Promise.resolve({ data: [] })).then(function (tr) {
        var tt = {}; (tr.data || []).forEach(function (t) { tt[t.id] = t.title })
        var dayOf = function (iso) { var dd = new Date(iso), t0 = new Date(); t0.setHours(0, 0, 0, 0); var diff = Math.floor((t0 - new Date(dd.getFullYear(), dd.getMonth(), dd.getDate())) / 864e5); return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : dd.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) }
        var draw = function () {
          var want = (CH.filter(function (c) { return c[0] === filt })[0] || [0, null])[1]
          var rows = evs.filter(function (e) { return ps.some(function (x) { return x.id === e.project_id }) && (!want || want.indexOf(e.kind) >= 0) })
          var last = ''
          $('#ac-l', m).innerHTML = rows.length ? rows.map(function (e) {
            var p = ps.filter(function (x) { return x.id === e.project_id })[0], t = tt[e.track_id] || 'a file'
            var who = e.actor_name || (ctx && ctx.people && ctx.people[e.actor] && ctx.people[e.actor].name) || 'Someone'
            var what = e.kind === 'view' ? '<b>' + esc(who) + '</b> opened ' + esc(p.title) + ' from a link' : e.kind === 'note' ? '<b>' + esc(who) + '</b> left a note on ' + esc(t) : e.kind === 'approve' ? '<b>' + esc(who) + '</b> approved ' + esc(t) : e.kind === 'final' ? esc(t) + ' is <b>final</b>' : e.kind === 'download' ? '<b>' + esc(who) + '</b> downloaded ' + esc(t) : e.kind === 'version' ? '<b>' + esc(who) + '</b> uploaded a new version of ' + esc(t) : '<b>' + esc(who) + '</b> added you to ' + esc(p.title)
            var day = dayOf(e.created_at), head = day !== last ? '<div class="acday">' + day + '</div>' : ''; last = day
            var isNew = e.created_at > seenBefore
            return head + '<button class="acrow' + (isNew ? ' new' : '') + '" data-go="' + (e.track_id ? '#t/' + e.track_id : '#p/' + e.project_id) + '"><span class="ico sm k-' + e.kind + '">' + ic((ACT[e.kind] || [0, 'bell'])[1]) + '</span><span class="nm"><span class="tx">' + what + '</span><small>' + esc(p.title) + ' · ' + ago(e.created_at) + '</small>' + (e.body && e.kind === 'note' ? '<q>' + esc(String(e.body).slice(0, 140)) + '</q>' : '') + '</span>' + (isNew ? '<i class="dot" aria-label="New"></i>' : '') + '</button>'
          }).join('') : '<div class="empty" style="padding:30px 10px"><h2 style="font-size:20px">Nothing new</h2><p>Notes, approvals, new versions and downloads by the people you work with show up here.</p></div>'
          $$('[data-go]', m).forEach(function (b) { b.onclick = function () { close(); go(b.dataset.go) } })
        }
        $('#ac-f', m).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('#ac-f button', m).forEach(function (x) { x.classList.toggle('on', x === b) }); filt = b.dataset.f; draw() }
        draw()
      })
    })
  }

  // ---- the cropper: pick a photo, zoom, move, turn, crop to the shape asked for ----
  function cropBox(o) {
    var img = null, zoom = 1, rot = 0, ox = 0, oy = 0
    var m = modal('<div class="spread"><h2>' + esc(o.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="crop" id="cr" style="aspect-ratio:' + o.w + '/' + o.h + ';max-height:none;width:min(100%, calc(60vh * ' + o.w + ' / ' + o.h + '))"><canvas id="cr-c"></canvas><div class="crop-empty" id="cr-e"><span class="ico" style="width:54px;height:54px">' + ic('image') + '</span><b>Choose a photo</b><small>JPG, PNG, WebP or HEIC from your phone</small></div></div>' +
      '<input type="file" id="cr-f" accept="image/*" hidden>' +
      '<div class="cropctl"><button class="ico sm" id="cr-out" aria-label="Zoom out">−</button><input type="range" id="cr-z" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><button class="ico sm" id="cr-in" aria-label="Zoom in">+</button><button class="ico sm" id="cr-r" aria-label="Turn" title="Turn">' + ic('rot') + '</button></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Drag the photo to move it, pinch or scroll to zoom.</p>' +
      '<div class="row" style="justify-content:space-between"><div class="row"><button class="btn" id="cr-pick">' + ic('image') + ' Choose photo</button>' + (o.onRemove ? '<button class="btn danger" id="cr-rm">Remove</button>' : '') + '</div><div class="row"><button class="btn" data-x>Cancel</button><button class="btn main" id="cr-ok" disabled>Save</button></div></div>')
    var card = $('.sheet-card', m); card.classList.add('wide')
    var cv = $('#cr-c', m), box = $('#cr', m)
    var fit = function () { var r = box.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d }
    var baseFor = function (W, H) { var w = rot % 180 ? img.height : img.width, h = rot % 180 ? img.width : img.height; return Math.max(W / w, H / h) }
    var base = function () { return baseFor(cv.width, cv.height) }
    var clamp = function () {
      var s = base() * zoom, w = (rot % 180 ? img.height : img.width) * s, h = (rot % 180 ? img.width : img.height) * s
      var mx = Math.max(0, (w - cv.width) / 2), my = Math.max(0, (h - cv.height) / 2)
      ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy))
    }
    var drawTo = function (c2, W, H, k) {
      var g = c2.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H)
      // the picture always covers the whole target, even when its shape differs from the preview (no black bands, Alex 7 Nov)
      var kk = k === 1 ? 1 : baseFor(W, H) / base()
      g.save(); g.translate(W / 2 + ox * kk, H / 2 + oy * kk); g.rotate(rot * Math.PI / 180)
      var s = (k === 1 ? base() : baseFor(W, H)) * zoom; g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); g.restore()
    }
    var draw = function () { if (!img) return; clamp(); drawTo(cv, cv.width, cv.height, 1) }
    var setImg = function (src) {
      var im = new Image(); im.crossOrigin = 'anonymous'
      im.onload = function () { img = im; zoom = 1; rot = 0; ox = oy = 0; $('#cr-z', m).value = 1; $('#cr-e', m).hidden = true; $('#cr-ok', m).disabled = false; fit(); draw() }
      im.onerror = function () { toast('This picture cannot be opened here. Try a JPG or PNG.') }
      im.src = src
    }
    $('#cr-f', m).onchange = function () { var f = this.files[0]; if (f) { var rd = new FileReader(); rd.onload = function () { setImg(rd.result) }; rd.readAsDataURL(f) } }
    $('#cr-pick', m).onclick = function () { $('#cr-f', m).click() }
    $('#cr-e', m).onclick = function () { $('#cr-f', m).click() }
    if (o.current) setImg(o.current); else setTimeout(function () { $('#cr-f', m).click() }, 60)
    $('#cr-z', m).oninput = function () { zoom = +this.value; draw() }
    $('#cr-in', m).onclick = function () { zoom = Math.min(4, zoom + 0.2); $('#cr-z', m).value = zoom; draw() }
    $('#cr-out', m).onclick = function () { zoom = Math.max(1, zoom - 0.2); $('#cr-z', m).value = zoom; draw() }
    $('#cr-r', m).onclick = function () { rot = (rot + 90) % 360; ox = oy = 0; draw() }
    var drag = null, pts = {}
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy, z: zoom, dist: null } })
    cv.addEventListener('pointermove', function (e) {
      if (!drag || !img) return
      pts[e.pointerId] = [e.clientX, e.clientY]
      var ids = Object.keys(pts), d = devicePixelRatio || 1
      if (ids.length >= 2) { var a = pts[ids[0]], b = pts[ids[1]], dist = Math.hypot(a[0] - b[0], a[1] - b[1]); if (!drag.dist) drag.dist = dist; zoom = Math.max(1, Math.min(4, drag.z * dist / drag.dist)); $('#cr-z', m).value = zoom }
      else { ox = drag.ox + (e.clientX - drag.x) * d; oy = drag.oy + (e.clientY - drag.y) * d }
      draw()
    })
    var up = function (e) { delete pts[e.pointerId]; if (!Object.keys(pts).length) drag = null }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up)
    cv.addEventListener('wheel', function (e) { if (!img) return; e.preventDefault(); zoom = Math.max(1, Math.min(4, zoom * (e.deltaY < 0 ? 1.08 : 0.93))); $('#cr-z', m).value = zoom; draw() }, { passive: false })
    if ($('#cr-rm', m)) $('#cr-rm', m).onclick = function () { Promise.resolve(o.onRemove()).then(close) }
    $('#cr-ok', m).onclick = function () {
      if (!img) return
      var out = document.createElement('canvas'); out.width = o.w; out.height = o.h
      drawTo(out, o.w, o.h, o.w / cv.width)
      var url = out.toDataURL('image/jpeg', 0.86)
      if (url.length > 450000) url = out.toDataURL('image/jpeg', 0.72)
      this.disabled = true
      Promise.resolve(o.onDone(url)).then(close)
    }
  }

  // =====================================================================================================
  // people and share links
  // =====================================================================================================
  var ROLE_TEXT = { owner: 'Owner', editor: 'Can upload and edit', commenter: 'Can listen and comment', listener: 'Can listen' }
  function peopleBox(c) {
    var owner = c.role === 'owner'
    var draw = function (m) {
      $('#pl', m).innerHTML = c.peopleList.map(function (p) {
        return '<div class="person">' + avatar(p.name, p.avatar, p.user_id) + '<div class="nm"><b>' + esc(p.name) + (p.user_id === session.user.id ? ' (you)' : '') + '</b><span>' + esc(p.email || ROLE_TEXT[p.role]) + '</span></div>' +
          (owner && p.role !== 'owner' ? '<select class="in" data-role="' + p.user_id + '" aria-label="Role">' + ['editor', 'commenter', 'listener'].map(function (r) { return '<option value="' + r + '"' + (r === p.role ? ' selected' : '') + '>' + ROLE_TEXT[r] + '</option>' }).join('') + '</select><button class="ico sm danger" data-rm="' + p.user_id + '" aria-label="Remove">' + ic('trash') + '</button>' : '<span class="chip">' + esc(p.role === 'owner' ? 'Owner' : ROLE_TEXT[p.role]) + '</span>') +
          (!owner && p.user_id === session.user.id && p.role !== 'owner' ? '<button class="btn sm danger" data-leave>Leave</button>' : '') + '</div>'
      }).join('')
      $$('[data-role]', m).forEach(function (s) { s.onchange = function () { sb.from('roarstudio_members').update({ role: s.value }).eq('project_id', c.project.id).eq('user_id', s.dataset.role).then(function (r) { if (r.error) toast(r.error.message); else toast('Role changed') }) } })
      $$('[data-rm]', m).forEach(function (b) { b.onclick = function () { sb.from('roarstudio_members').delete().eq('project_id', c.project.id).eq('user_id', b.dataset.rm).then(function () { c.peopleList = c.peopleList.filter(function (p) { return p.user_id !== b.dataset.rm }); draw(m) }) } })
      var lv = $('[data-leave]', m); if (lv) lv.onclick = function () { sb.from('roarstudio_members').delete().eq('project_id', c.project.id).eq('user_id', session.user.id).then(function () { close(); go('#/') }) }
    }
    modal('<div class="spread"><h2>People</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="people" id="pl"></div>' +
      (owner ? '<form id="inv" style="display:grid;gap:10px"><div class="field"><label for="inv-e">Add someone with a Roar account</label><input class="in" id="inv-e" type="email" placeholder="their@email.com" required></div><div class="row"><select class="in" id="inv-r" style="flex:1;min-width:0"><option value="editor">Can upload and edit</option><option value="commenter">Can listen and comment</option><option value="listener">Can listen</option></select><button class="btn main">Add</button></div><p class="err" id="inv-err" hidden></p><p class="muted" style="margin:0;font-size:13px">No account? Send them a share link instead, or ask them to make a free Roar account.</p></form>' : ''), function (m) {
      draw(m)
      if (owner) $('#inv-r', m).value = (c.studio && c.studio.invite_role) || 'commenter'
      if (owner) $('#inv', m).onsubmit = function (e) {
        e.preventDefault()
        var em = $('#inv-e', m).value.trim(), er = $('#inv-err', m); er.hidden = true
        sb.rpc('roarstudio_invite', { p: c.project.id, mail: em, r: $('#inv-r', m).value }).then(function (r) {
          var res = r.data
          if (res === 'ok') { $('#inv-e', m).value = ''; toast('Added'); sb.rpc('roarstudio_people', { p: c.project.id }).then(function (q) { c.peopleList = q.data || []; (q.data || []).forEach(function (x) { c.people[x.user_id] = { name: x.name, avatar: x.avatar, role: x.role, email: x.email } }); draw(m) }) }
          else { er.textContent = res === 'no-account' ? 'There is no Roar account with this email. Send them a share link instead.' : (r.error && r.error.message) || 'Could not add them.'; er.hidden = false }
        })
      }
    })
  }

  function shareBox(c, track, finals, pl) {
    // the links people get carry RoarTransfer Studio's own address (Cloudflare sends studio.roartransfer.com to this page)
    var base = location.hostname === 'roartransfer.com' ? 'https://studio.roartransfer.com/' : location.origin + location.pathname
    modal('<div class="spread"><h2>Share ' + (finals ? 'the Finals' : track ? '“' + esc(track.title) + '”' : 'the project') + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
      '<p class="muted" style="margin:0">' + (finals ? 'One link to the final files of “' + esc(c.project.title) + '”. Anyone with it can look, listen and download, without an account. Files you make final later show up in it too.' : 'Anyone with the link can listen in the browser, without an account.') + '</p>' +
      '<div class="opts"' + (finals ? ' hidden' : '') + '><div class="opt"><span>Comments<small>They can leave notes on the waveform</small></span><button type="button" class="sw" id="s-c" aria-pressed="true" aria-label="Comments"></button></div>' +
      '<div class="opt"><span>Approve<small>They can approve a version</small></span><button type="button" class="sw" id="s-a" aria-pressed="false" aria-label="Approve"></button></div>' +
      '<div class="opt"><span>Download<small>They can download the files</small></span><button type="button" class="sw" id="s-d" aria-pressed="false" aria-label="Download"></button></div></div>' +
      '<div class="field"><label>Ends</label><div class="lens-group" id="s-e"><span class="lens"></span><button type="button" class="on" data-d="0">Never</button><button type="button" data-d="1">1 day</button><button type="button" data-d="7">7 days</button><button type="button" data-d="30">30 days</button></div></div>' +
      '<div class="field"><label for="s-p">Password (optional)</label><input class="in" id="s-p" type="text" maxlength="100" autocomplete="off"></div>' +
      '<div id="s-out" hidden style="display:grid;gap:8px"><div class="linkbox"><input id="s-link" readonly><button class="btn sm main" id="s-copy">' + ic('copy') + ' Copy</button></div></div>' +
      '<div class="row end"><button class="btn main" id="s-go">Make the link</button></div><div id="s-old"></div>', function (m) {
      var st = c.studio || {}
      if (!finals && !pl) { $('#s-c', m).setAttribute('aria-pressed', st.link_comment !== false); $('#s-a', m).setAttribute('aria-pressed', st.link_approve !== false); $('#s-d', m).setAttribute('aria-pressed', !!st.link_download) }
      if (pl) { $('#s-c', m).closest('.opt').hidden = true; $('#s-a', m).closest('.opt').hidden = true; $('#s-d', m).setAttribute('aria-pressed', !!st.link_download); $('h2', m).textContent = 'Share “' + pl.title + '”'; $('p.muted', m).textContent = 'Anyone with the link can play the playlist in order, without an account.' }
      $$('.sw', m).forEach(function (s) { s.onclick = function () { s.setAttribute('aria-pressed', s.getAttribute('aria-pressed') !== 'true') } })
      var eg = $('#s-e', m); setTimeout(function () { lens(eg) }, 30)
      eg.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('button', eg).forEach(function (x) { x.classList.toggle('on', x === b) }); lens(eg) }
      var on = function (id) { return $(id, m).getAttribute('aria-pressed') === 'true' }
      $('#s-go', m).onclick = function () {
        this.disabled = true
        api('share-create', { project: c.project.id, kind: finals ? 'finals' : pl ? 'playlist' : 'review', playlist: pl ? pl.id : null, track: track ? track.id : null, comment: on('#s-c'), approve: on('#s-a'), download: on('#s-d'), days: Number($('button.on', eg).dataset.d), password: $('#s-p', m).value }).then(function (d) {
          $('#s-go', m).disabled = false
          if (!d.token) { toast(d.error || 'Could not make the link'); return }
          $('#s-out', m).hidden = false; $('#s-link', m).value = base + '?s=' + d.token; $('#s-link', m).select(); oldLinks()
        })
      }
      $('#s-copy', m).onclick = function () { copyText($('#s-link', m).value, 'Link copied') }
      function oldLinks() {
        var q = sb.from('roarstudio_shares').select('*').eq('project_id', c.project.id).order('created_at', { ascending: false })
        q.then(function (r) {
          var rows = (r.data || []).filter(function (s) { return pl ? s.kind === 'playlist' && s.playlist_id === pl.id : finals ? s.kind === 'finals' : s.kind === 'review' && (track ? s.track_id === track.id : !s.track_id) })
          $('#s-old', m).innerHTML = rows.length ? '<div class="field"><label>Links made</label><div class="people">' + rows.map(function (s) {
            var what = [s.can_comment ? 'comments' : '', s.can_approve ? 'approve' : '', s.can_download ? 'download' : '', s.password_hash ? 'password' : ''].filter(Boolean).join(', ') || 'listen only'
            var ended = s.expires_at && new Date(s.expires_at) < new Date()
            return '<div class="person"><div class="nm"><b class="mono" style="font-size:12.5px">?s=' + esc(s.token) + '</b><span>' + esc(what) + ' · ' + (ended ? 'ended' : s.expires_at ? 'ends ' + new Date(s.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'no end') + '</span></div><button class="ico sm" data-cp="' + s.token + '" aria-label="Copy link">' + ic('copy') + '</button><button class="ico sm danger" data-sd="' + s.token + '" aria-label="Delete link">' + ic('trash') + '</button></div>'
          }).join('') + '</div></div>' : ''
          $$('[data-cp]', m).forEach(function (b) { b.onclick = function () { copyText(base + '?s=' + b.dataset.cp, 'Link copied') } })
          $$('[data-sd]', m).forEach(function (b) { b.onclick = function () { sb.from('roarstudio_shares').delete().eq('token', b.dataset.sd).then(oldLinks) } })
        })
      }
      oldLinks()
    })
  }

  // =====================================================================================================
  // a share link, for someone without an account
  // =====================================================================================================
  function renderShare() {
    var view = $('#view')
    if (!share.data) {
      view.innerHTML = '<div class="spin"></div>'
      api('share-open').then(function (d) {
        if (d.locked) { askPassword(d.error !== 'password' ? '' : share.password ? 'That password is not right.' : ''); return }
        if (d.error) { setTop([]); view.innerHTML = '<div class="empty glass"><h2>' + esc(d.error) + '</h2><p>Ask the person who sent it for a new link.</p></div>'; return }
        share.data = d
        if (d.studio && d.studio.backdrop) { document.body.style.setProperty('--bd', 'url(' + cssu(d.studio.backdrop) + ')'); document.body.classList.add('custom-bd') }
        ctx = { project: d.project, tracks: d.tracks || [], versions: d.versions || [], comments: d.comments || [], people: {}, peopleList: [], role: 'guest', picks: d.picks || [] }
        var start = function () { if (d.kind === 'review' && d.tracks && d.tracks.length === 1 && !location.hash) { location.replace('#t/' + d.tracks[0].id); return } renderShare() }
        if (viewerWm() && !store.get('rs-guest')) { view.innerHTML = ''; prompt1('Your name', 'This studio shows your name on what you watch', '', 'Continue', function (v) { store.set('rs-guest', String(v).trim().slice(0, 60) || 'Guest'); start() }); return }
        start()
      })
      return
    }
    if (share.data.kind === 'finals') return drawFinals(ctx)
    if (share.data.kind === 'playlist') return drawPlaylist(ctx, { id: share.data.playlist && share.data.playlist.id, title: (share.data.playlist && share.data.playlist.title) || 'Playlist', items: ctx.tracks.map(function (t) { return t.id }) })
    var r = route()
    if (r.kind === 't') return renderTrack(r.id)
    return drawProject(ctx)
  }
  function askPassword(msg) {
    setTop([])
    $('#view').innerHTML = '<form class="card glass" id="pwf" style="max-width:420px;margin:40px auto"><h2>This link has a password</h2><div class="field"><label for="sp">Password</label><input class="in" id="sp" type="password" autocomplete="off"></div>' + (msg ? '<p class="err">' + esc(msg) + '</p>' : '') + '<button class="btn main">Open</button></form>'
    $('#sp').focus()
    $('#pwf').onsubmit = function (e) { e.preventDefault(); share.password = $('#sp').value; share.data = null; renderShare() }
  }

  // =====================================================================================================
  // the bar at the foot (Alex, 7 Nov): leave a file's page while it plays and the player slides down here
  // =====================================================================================================
  var mini = document.createElement('div'); mini.className = 'mini glass'; mini.id = 'mini'; mini.hidden = true
  mini.innerHTML = '<div class="mini-art" id="mini-art"><div id="mini-v" class="mini-v"></div></div><div class="mini-txt"><b id="mini-t"></b><small id="mini-p"></small></div>' +
    '<button class="ico sm" id="mini-back" aria-label="Back 10 seconds" title="Back 10 seconds">' + ic('rot') + '</button><button class="play mini-pp" id="mini-pp" aria-label="Play">' + ic('play') + '</button>' +
    '<div class="mini-seek"><span class="mono" id="mini-c">0:00</span><div class="mini-bar" id="mini-bar"><i></i></div><span class="mono" id="mini-d">0:00</span></div>' +
    '<button class="ico sm" id="mini-open" aria-label="Open its page" title="Open its page">' + ic('next') + '</button><button class="ico sm" id="mini-x" aria-label="Stop and close" title="Stop and close">' + ic('x') + '</button>'
  document.body.appendChild(mini)
  function onTrackPage() { var r = route(); return cur.meta && r.kind === 't' && r.id === cur.meta.track && $('#wv') }
  function onPlaylist() { return !!$('#plist') }
  ;(function miniTick() {
    var want = !!(cur.version && cur.meta && audio.src && (!audio.paused || audio.currentTime > 0.5) && !onTrackPage() && !onPlaylist())
    if (want && mini.hidden) { mini.hidden = false; requestAnimationFrame(function () { mini.classList.add('on') }) }
    if (!want && !mini.hidden && mini.classList.contains('on')) { mini.classList.remove('on'); setTimeout(function () { if (!mini.classList.contains('on')) mini.hidden = true }, 350) }
    document.body.classList.toggle('has-mini', want)
    if (want) {
      var m = cur.meta, d = audio.duration || cur.version.duration || 0
      if ($('#mini-t').textContent !== m.title) { $('#mini-t').textContent = m.title; $('#mini-p').textContent = m.project; $('#mini-art').style.cssText = audio === vidEl ? '' : (m.cover ? "background:#000 url('" + cssu(m.cover) + "') center/cover" : m.coverStyle) }
      $('#mini-art').classList.toggle('video', audio === vidEl)
      $('#mini-c').textContent = mmss(audio.currentTime); $('#mini-d').textContent = mmss(d)
      $('#mini-bar i').style.width = (d ? audio.currentTime / d * 100 : 0) + '%'
      var icn = audio.paused ? 'play' : 'pause'; if ($('#mini-pp').dataset.i !== icn) { $('#mini-pp').dataset.i = icn; $('#mini-pp').innerHTML = ic(icn) }
    }
    frameLater(miniTick)
  })()
  $('#mini-pp').onclick = function () { if (audio.paused) play(); else audio.pause() }
  $('#mini-back').onclick = function () { audio.currentTime = Math.max(0, audio.currentTime - 10) }
  $('#mini-bar').onpointerdown = function (e) { var b = this, d = audio.duration || 0; var at = function (ev) { var r = b.getBoundingClientRect(); if (d) audio.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * d }; at(e); b.setPointerCapture(e.pointerId); b.onpointermove = function (ev) { if (ev.buttons) at(ev) } }
  $('#mini-open').onclick = function () { if (cur.meta) go('#t/' + cur.meta.track) }
  $('#mini-x').onclick = function () { audio.pause(); mini.classList.remove('on'); cur.meta = null; setTimeout(function () { mini.hidden = true }, 350); if (vidEl.parentNode && vidEl.parentNode.id === 'mini-v') vidEl.remove() }

  // =====================================================================================================
  // the session
  // =====================================================================================================
  var booted = false, needMfa = false
  function refreshSession() { sb.auth.getSession().then(function (r) { onSession(r.data.session) }) }
  function loadMe(s) {
    var md = s.user.user_metadata || {}
    me = { name: md.name || md.full_name || (s.user.email || '').split('@')[0], avatar: md.avatar_url || null, prefs: {}, studio: null }
    sb.rpc('roarstudio_me').then(function (r) {
      var d = r.data && r.data[0]; if (!me || !d) return
      if (d.display_name) me.name = d.display_name
      if (d.avatar_url) me.avatar = d.avatar_url
      paintMe()
    })
    sb.from('roarstudio_prefs').select('*').eq('user_id', s.user.id).maybeSingle().then(function (r) { if (me && r.data) me.prefs = r.data })
    sb.from('roarstudio_studios').select('*').eq('owner', s.user.id).maybeSingle().then(function (r) { if (me) me.studio = r.data || null })
    setTimeout(function () { api('admin-check').then(function (d) { if (me) me.admin = !!d.admin }) }, 300)
    setTimeout(function () { api('pro-me').then(function (d) { if (!me) return; me.pro = !!d.pro; if (me.pro && BELL_KINDS.indexOf('view') < 0) { BELL_KINDS.push('view'); bellCount() } }) }, 400)
  }
  // a new session goes on only at the level its account asks for: one with a verified authenticator types its code first
  function onSession(s) {
    var was = session && session.user.id
    if (!s) { session = null; me = null; needMfa = false; if (was || !booted) { booted = true; render() } return }
    if (booted && was === s.user.id) { session = s; return }
    sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (a) {
      var l = a && a.data
      if (l && l.nextLevel === 'aal2' && l.currentLevel !== 'aal2') { session = null; needMfa = true; booted = true; render(); return }
      needMfa = false; session = s; booted = true; loadMe(s); render()
    }).catch(function () { session = s; booted = true; loadMe(s); render() })
  }
  var lastCrumbs = []
  var _setTop = setTop; setTop = function (c) { lastCrumbs = c || []; _setTop(c) }
  sb.auth.onAuthStateChange(function (ev, s) { if (ev === 'TOKEN_REFRESHED') { if (session && s) session = s; return } setTimeout(function () { onSession(s) }) })
  if (shareToken && /^[A-Za-z0-9]{6,32}$/.test(shareToken)) share = { token: shareToken, password: '', data: null }
  sb.auth.getSession().then(function (r) { onSession(r.data.session) })
})()
