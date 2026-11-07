// RoarStudio (Alex, 7 Nov 2026): the music cloud, a branch of RoarTransfer. One page, no build step.
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
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4-2.5z" fill="currentColor"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
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
    if (/^video\//.test(m) || /\.(mp4|mov|m4v|webm|mkv|avi|mxf)$/.test(n)) return 'video'
    if (/^image\//.test(m) || /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|avif|psd|svg)$/.test(n)) return 'image'
    return 'audio'
  }
  var KIND_WORD = { audio: 'Audio', video: 'Video', image: 'Picture' }
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
  var actx = null, gainNode = null, matched = store.get('rs-match') !== '0'
  var cur = { version: null, url: '', gain: 1 }
  function ensureGraph() {
    if (actx || !(window.AudioContext || window.webkitAudioContext)) return
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); var src = actx.createMediaElementSource(audEl); gainNode = actx.createGain(); src.connect(gainNode).connect(actx.destination) } catch (e) { actx = null; gainNode = null }
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
    if (kindOf(v) === 'image') { audio.pause(); return Promise.resolve() }
    return urlFor(v).then(function (u) {
      if (cur.version !== v) return
      if (cur.url !== u) { cur.url = u; audio.src = u; audio.load() }
      var go = function () { try { audio.currentTime = Math.min(t, (v.duration || audio.duration || t)) } catch (e) {} if (autoplay || (keepTime && was)) play() }
      if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true })
    })
  }
  function play() { if (audio === audEl) { ensureGraph(); if (actx && actx.state === 'suspended') actx.resume() } applyGain(); var p = audio.play(); if (p && p.catch) p.catch(function () {}) }
  function download(v) {
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

  function setTop(crumbs) {
    $('#crumbs').innerHTML = (crumbs || []).map(function (c, i) { return '<span class="sep">/</span><span>' + esc(c) + '</span>' }).join('')
    var r = $('#right')
    if (share) {
      var st = share.data && share.data.studio
      r.innerHTML = st && (st.logo || st.name) ? '<span class="brand">' + (st.logo ? '<img src="' + st.logo + '" alt="">' : '') + (st.name ? '<b>' + esc(st.name) + '</b>' : '') + '</span>' : (session ? '' : '<a class="btn sm" href="./">Sign in</a>')
      return
    }
    if (!session) { r.innerHTML = ''; return }
    var name = (me && me.name) || (session.user.email || '').split('@')[0]
    r.innerHTML = '<a class="btn sm rtlink" href="../" title="Send files with RoarTransfer">' + ic('out') + '<span>RoarTransfer</span></a><button class="ico bell" id="bell" aria-label="Notifications">' + ic('bell') + '<b id="bell-n" hidden></b></button><button class="me" id="me-btn" aria-label="Account" style="' + (me && me.avatar ? "background-image:url('" + esc(me.avatar) + "')" : 'background:hsl(' + hue(session.user.id) + ',55%,40%)') + '">' + (me && me.avatar ? '' : esc(initials(name))) + '</button>'
    $('#me-btn').onclick = function (e) {
      e.stopPropagation()
      var old = $('.menu'); if (old) { old.remove(); return }
      var m = document.createElement('div'); m.className = 'menu'
      m.innerHTML = '<div class="who">' + esc(session.user.email || '') + '</div><button id="mn-set">' + ic('gear') + ' Settings</button><button id="mn-sto">' + ic('disk') + ' Storage</button>' + (me && me.admin ? '<button id="mn-adm">' + ic('gear') + ' Admin</button>' : '') + '<button id="mn-acc">' + ic('people') + ' My Roar account</button><button id="mn-rt">' + ic('out') + ' Open RoarTransfer</button><button id="mn-out">' + ic('back') + ' Sign out</button>'
      document.body.appendChild(m)
      $('#mn-set').onclick = function () { m.remove(); go('#settings') }
      $('#mn-sto').onclick = function () { m.remove(); go('#storage') }
      if ($('#mn-adm')) $('#mn-adm').onclick = function () { m.remove(); go('#admin') }
      $('#mn-acc').onclick = function () { m.remove(); window.open('https://themadlions.com/account/', '_blank') }
      $('#mn-rt').onclick = function () { location.href = '../' }
      $('#mn-out').onclick = function () { m.remove(); sb.auth.signOut() }
      setTimeout(function () { document.addEventListener('click', function f() { m.remove(); document.removeEventListener('click', f) }) })
    }
    $('#bell').onclick = function () { activityPanel() }
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
      '<ul><li>Versions, notes and approvals for audio, video and pictures</li><li>Level matching for mixes, frame-accurate notes for picture</li><li>Finals: one branded link, Download all as .zip, credits and lyrics</li><li>Playlists, folders, people with roles</li><li>Stored on Cloudflare, with your Roar account</li></ul></div>' +
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
      view.innerHTML = '<div class="head"><div><h1>Projects</h1><div class="sub">' + ps.length + ' project' + (ps.length === 1 ? '' : 's') + (r[2] && r[2].bytes ? ' · ' + size(r[2].bytes) + ' stored' : '') + '</div></div><div class="tools">' + (ps.length ? '<div class="lens-group vmode" id="vmode"><span class="lens"></span><button data-m="big" aria-label="Big tiles" title="Big tiles">' + ic('big') + '</button><button data-m="small" aria-label="Small tiles" title="Small tiles">' + ic('small') + '</button><button data-m="list" aria-label="List" title="List">' + ic('rows') + '</button></div>' : '') + '<button class="btn main" id="np">' + ic('plus') + ' New project</button></div></div>' +
        (ps.length ? '<div class="grid g-' + (store.get('rs-view') || 'big') + '" id="pgrid">' + ps.map(function (p) {
          return '<div class="proj glass" role="button" tabindex="0" data-p="' + p.id + '"><div class="cover" style="' + (p.cover ? "background:#000 url('" + p.cover + "') center/cover" : coverStyle(p.id)) + '">' + (p.owner === session.user.id ? '<button class="ico sm danger pdel" data-pdel="' + p.id + '" aria-label="Delete ' + esc(p.title) + '">' + ic('trash') + '</button>' : '') + '</div><div class="pinfo"><b>' + esc(p.title) + '</b><span>' + esc(p.artist || (p.owner === session.user.id ? 'Yours' : 'Shared with you')) + ' · ' + (counts[p.id] || 0) + ' file' + (counts[p.id] === 1 ? '' : 's') + '</span><span class="when">' + ago(p.updated_at) + '</span></div></div>'
        }).join('') + '<button class="proj new-proj" id="np2"><span class="ico">' + ic('plus') + '</span>New project</button></div>'
        : '<div class="empty glass"><span class="ico" style="width:64px;height:64px">' + ic('music') + '</span><h2>Start your first project</h2><p>A project is an album, a single or a film score. Put tracks in it, upload versions, and invite the people you work with.</p><button class="btn main" id="np2">' + ic('plus') + ' New project</button></div>')
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
      sb.from('roarstudio_playlists').select('*').eq('project_id', id).order('created_at')
    ]).then(function (r) {
      if (!r[0].data) throw new Error('This project does not exist, or you are not in it.')
      var people = {}
      ;(r[4].data || []).forEach(function (x) { people[x.user_id] = { name: x.name, avatar: x.avatar, role: x.role, email: x.email } })
      ctx = { project: r[0].data, tracks: r[1].data || [], versions: r[2].data || [], comments: r[3].data || [], people: people, peopleList: r[4].data || [], role: r[5].data || 'listener', folders: r[6].data || [], playlists: r[7].data || [], studio: null }
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
  var KIND_PLURAL = { audio: 'Audio', video: 'Video', image: 'Pictures' }
  function coverAttr(pr) { return pr.cover ? "background:#000 url('" + pr.cover + "') center/cover" : coverStyle(pr.id) }
  function brandBanner() { var st = share && share.data && share.data.studio; return st && st.banner ? '<div class="banner" style="background-image:url(' + st.banner + ')"></div>' : '' }
  function drawProject(c) {
    var view = $('#view'), pr = c.project, edit = canDo('editor')
    var folder = !share && curFolder ? (c.folders || []).filter(function (f) { return f.id === curFolder })[0] : null
    if (!folder) curFolder = null
    setTop(folder ? [pr.title, folder.name] : [pr.title])
    var openNotes = function (tid) { var ids = c.versions.filter(function (v) { return v.track_id === tid }).map(function (v) { return v.id }); return c.comments.filter(function (n) { return ids.indexOf(n.version_id) >= 0 && !n.done && !n.parent_id }).length }
    var here = c.tracks.filter(function (t) { return share ? true : folder ? t.folder_id === folder.id : !t.folder_id })
    var kOf = function (t) { var v = latest(t.id); return v ? kindOf(v) : 'audio' }
    var counts = { audio: 0, video: 0, image: 0 }; here.forEach(function (t) { counts[kOf(t)]++ })
    var kinds = ['audio', 'video', 'image'].filter(function (k) { return counts[k] })
    if (kinds.indexOf(kindTab) < 0) kindTab = 'all'
    var shown = kindTab === 'all' ? here : here.filter(function (t) { return kOf(t) === kindTab })
    var head = folder
      ? '<button class="ico" id="fback" aria-label="Back to ' + esc(pr.title) + '">' + ic('back') + '</button><span class="fi" style="background:linear-gradient(160deg,#8fb8ff,#5b6cff);color:#0b1640">' + ic('folder') + '</span><div style="min-width:0"><h1>' + esc(folder.name) + '</h1><div class="sub">' + esc(pr.title) + ' · ' + here.length + ' file' + (here.length === 1 ? '' : 's') + '</div></div>'
      : '<button class="pcover' + (edit && !share ? ' edit' : '') + '" id="pcover" style="' + coverAttr(pr) + '" aria-label="' + (edit && !share ? 'Change the cover' : esc(pr.title)) + '">' + (edit && !share ? '<i>' + ic('image') + '</i>' : '') + '</button><div style="min-width:0"><h1>' + esc(pr.title) + '</h1><div class="sub">' + esc(pr.artist || '') + (pr.artist ? ' · ' : '') + c.tracks.length + ' file' + (c.tracks.length === 1 ? '' : 's') + (share ? (share.data.project.owner_name ? ' · shared by ' + esc(share.data.project.owner_name) : '') : '') + '</div></div>'
    var tools = share ? '' : (edit ? '<button class="btn main" id="new-btn">' + ic('plus') + ' New</button>' : '') +
      (edit && !folder ? '<button class="btn" id="sh-btn">' + ic('share') + ' Share</button>' : '') +
      (!folder ? '<button class="btn" id="pp-btn">' + ic('people') + ' People</button>' : '') +
      (edit ? '<button class="ico" id="pm-btn" aria-label="More">' + ic('dots') + '</button>' : '')
    var extra = '', extraTop = ''
    if (!share && !folder) {
      var f = c.versions.filter(function (v) { return v.final_at })
      var tiles = ''
      if (f.length) {
        var fk = { audio: 0, video: 0, image: 0 }; f.forEach(function (v) { fk[kindOf(v)]++ })
        extraTop = '<button class="finbar" id="fin-btn"><span class="fb-ic">' + ic('star') + '</span><span class="nm"><small>Delivery</small><b>Finals</b></span><span class="fb-k">' + ['audio', 'video', 'image'].filter(function (k) { return fk[k] }).map(function (k) { return '<span><i class="kdot k-' + k + '"></i>' + fk[k] + ' ' + KIND_PLURAL[k] + '</span>' }).join('') + '</span><span class="fb-size">' + f.length + ' file' + (f.length === 1 ? '' : 's') + ' · ' + size(f.reduce(function (a, v) { return a + Number(v.size || 0) }, 0)) + '</span><span class="fb-go">' + ic('next') + '</span></button>'
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
        var lead = v.thumb ? '<button class="th" data-play="' + t.id + '" style="background-image:url(' + v.thumb + ')" aria-label="Open ' + esc(t.title) + '">' + (k === 'video' ? '<i>' + ic('play') + '</i>' : '') + '</button>'
          : k === 'image' ? '<button class="th" data-play="' + t.id + '" aria-label="Open ' + esc(t.title) + '"><i>' + ic('image') + '</i></button>'
          : '<button class="th au" data-play="' + t.id + '" style="' + coverAttr(c.project) + '" aria-label="Play ' + esc(t.title) + '"><i>' + ic('play') + '</i></button>'
        var mid = k === 'audio' ? '<canvas data-wave="' + v.id + '"></canvas>' : '<span class="kind">' + ic(k === 'video' ? 'film' : 'image') + ' ' + KIND_WORD[k] + (v.width ? ' · ' + v.width + '×' + v.height : '') + '</span>'
        return '<div class="trk glass k-' + k + '" data-t="' + t.id + '">' + lead + '<div class="nm"><b>' + esc(t.title) + '</b><span>' + esc(vname(v)) + ' · ' + n + ' version' + (n === 1 ? '' : 's') + (notes ? ' · ' + notes + ' open note' + (notes === 1 ? '' : 's') : '') + '</span></div>' + mid + '<span class="cnt">' + (hasFinal ? '<span class="chip fin">Final</span>' : v.approved_at ? '<span class="chip ok">Approved</span>' : notes ? '<span class="chip warn">In review</span>' : '<span class="chip">New</span>') + '</span><span class="t">' + (k === 'image' ? size(v.size) : mmss(v.duration)) + '</span></div>'
    }
    view.innerHTML = brandBanner() + '<div class="head">' + head + '<div class="tools">' + tools + '</div></div>' + extra +
      (kinds.length > 1 ? '<div class="lens-group ktabs" id="ktabs"><span class="lens"></span><button data-k="all"' + (kindTab === 'all' ? ' class="on"' : '') + '>All <small>' + here.length + '</small></button>' + kinds.map(function (k) { return '<button data-k="' + k + '"' + (kindTab === k ? ' class="on"' : '') + '><i class="kdot k-' + k + '"></i>' + KIND_PLURAL[k] + ' <small>' + counts[k] + '</small></button>' }).join('') + '</div>' : '') +
      '<div class="tracks" id="tracks">' + (function () {
        // in All, the files go in groups by kind, each under its own line
        var order = kindTab === 'all' && kinds.length > 1 ? kinds : [null]
        return order.map(function (k) {
          var list = k ? shown.filter(function (t) { return kOf(t) === k }) : shown
          return (k ? '<div class="kgroup"><i class="kdot k-' + k + '"></i>' + KIND_PLURAL[k] + '<span>' + list.length + '</span></div>' : '') + list.map(row).join('')
        }).join('')
      })() + '</div>' +
      (edit && !share ? '<label class="drop" id="drop"><input type="file" id="files" multiple accept="audio/*,video/*,image/*,.wav,.aif,.aiff,.flac,.mp3,.m4a,.aac,.ogg,.mov,.mp4,.heic,.tif,.tiff,.psd" hidden><span class="ico" style="width:50px;height:50px">' + ic('up') + '</span><b>' + (here.length ? 'Drop more files here' : folder ? 'Drop files into this folder' : 'Drop your first files here') + '</b><span>Audio, video or pictures, up to 20 GB each. Each file gets its own page, with versions and notes.</span></label><div class="ups" id="ups"></div>'
        : (!here.length ? '<div class="empty glass"><h2>Nothing here yet</h2><p>When someone uploads a file it shows up here.</p></div>' : ''))
    $$('canvas[data-wave]').forEach(function (cv) { var v = c.versions.filter(function (x) { return x.id === cv.dataset.wave })[0]; drawMini(cv, v && v.peaks) })
    $$('.trk').forEach(function (r) { r.onclick = function (e) { if (e.target.closest('[data-play]')) return; go('#t/' + r.dataset.t) } })
    $$('[data-play]').forEach(function (b) { b.onclick = function () { pendingPlay = true; go('#t/' + b.dataset.play) } })
    if ($('#fin-btn')) $('#fin-btn').onclick = function () { go('#f/' + pr.id) }
    if ($('#ktabs')) { var kt = $('#ktabs'); setTimeout(function () { lens(kt) }, 30); kt.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; kindTab = b.dataset.k; store.set('rs-kind', kindTab); drawProject(c) } }
    $$('[data-pl]').forEach(function (b) { b.onclick = function () { go('#l/' + b.dataset.pl) } })
    $$('[data-fd]').forEach(function (b) { b.onclick = function () { go('#d/' + b.dataset.fd) } })
    if ($('#fback')) $('#fback').onclick = function () { go('#p/' + pr.id) }
    if (!share) {
      if ($('#pp-btn')) $('#pp-btn').onclick = function () { peopleBox(c) }
      if ($('#sh-btn')) $('#sh-btn').onclick = function () { shareBox(c, null) }
      if ($('#new-btn')) $('#new-btn').onclick = function () { newBox(c, folder) }
      if ($('#pm-btn')) $('#pm-btn').onclick = function () { folder ? folderMenu(c, folder) : projectMenu(c) }
      if ($('#pcover') && edit) $('#pcover').onclick = function () { coverBox(c) }
      if (edit) wireDrop($('#drop'), $('#files'), function (files) { startUploads(files, { project: pr.id, folder: folder ? folder.id : null }) })
      listen(pr.id)
    }
  }
  // + New (Alex, 7 Nov, as mixup): a file, a playlist (audio or video) or a folder
  function newBox(c, folder) {
    modal('<div class="spread"><h2>Create a new item</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="newgrid">' +
      '<button class="newcard glass" id="nb-f"><span>' + ic('file') + '</span><b>New file</b><small>Audio, video or a picture</small></button>' +
      (folder ? '' : '<button class="newcard glass" id="nb-p"><span>' + ic('list') + '</span><b>New playlist</b><small>Audio or video, in order</small></button>' +
      '<button class="newcard glass" id="nb-d"><span>' + ic('fplus') + '</span><b>New folder</b><small>Keep files together</small></button>') + '</div>', function (m) {
      $('#nb-f', m).onclick = function () { close(); $('#files').click() }
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
    return analyseAny(file).then(function (m) {
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
        return api('upload-complete', { project: opt.project, key: made.key, uploadId: made.uploadId, parts: parts, name: file.name, size: file.size, type: file.type, track: opt.track || null, title: opt.title || null, folder: opt.folder || null, label: opt.label || '', meta: meta || {} })
      }).catch(function (e) { api('upload-abort', { project: opt.project, key: made.key, uploadId: made.uploadId }); throw e })
    }).then(function (d) {
      if (!d.version) throw new Error(d.error || 'Could not finish the upload')
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
  var pendingPlay = false, tview = null
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
    tview = { track: id, version: v.id, notes: notes, at: true }
    setTop([ctx.project.title, track.title])
    var edit = canDo('editor')

    var firstV = versions[0], byName = share ? share.data.names[firstV.uploaded_by] : ctx.people[firstV.uploaded_by] && ctx.people[firstV.uploaded_by].name
    view.innerHTML = '<div class="head"><button class="ico" id="back" aria-label="Back to the project">' + ic('back') + '</button><span class="pcover sm" style="' + coverAttr(ctx.project) + '"></span><div style="min-width:0"><h1>' + esc(track.title) + '</h1><div class="sub">' + esc(ctx.project.title) + (byName ? ' · by ' + esc(byName) : '') + ' · ' + new Date(firstV.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</div></div><div class="tools">' +
      (versions.some(function (q) { return q.lufs != null }) ? '<button class="btn" id="lvl">' + ic('disk').replace('disk', '') + 'Levels</button>' : '') +
      (edit && !share ? '<button class="btn main" id="nv">' + ic('up') + ' New version</button><button class="btn" id="tsh">' + ic('share') + ' Share</button><button class="ico" id="tm" aria-label="More">' + ic('dots') + '</button>' : '') + '</div></div>' +
      '<div class="player"><section class="stage glass">' +
      '<div class="vers" id="vers"></div>' +
      '<div class="media" id="media"></div>' +
      '<div class="wave" id="wave"><canvas id="wv"></canvas><div class="pins" id="pins"></div><span class="hover-t" id="hover-t" hidden></span></div>' +
      '<div class="ctl" id="ctl"><button class="ico sm" id="rew" aria-label="Back to the start" title="Back to the start">' + ic('prev') + '</button><button class="play" id="pb" aria-label="Play">' + ic('play') + '</button><span class="time" id="tm-t">0:00 <span>/ 0:00</span></span>' +
      '<span class="pt"><span class="zoom"><button class="ico sm" id="zo" aria-label="Zoom out" title="Zoom out">' + ic('zout') + '</button><b class="mono" id="zl"></b><button class="ico sm" id="zi" aria-label="Zoom in" title="Zoom in">' + ic('zin') + '</button></span><i class="pt-sep"></i><button class="ico sm" id="spd" aria-label="Speed" title="Speed"><b class="mono" style="font-size:11px">1×</b></button><button class="ico sm" id="lp" aria-label="Loop" title="Loop">' + ic('loop') + '</button><button class="ico sm" id="pip" aria-label="Picture in picture" title="Picture in picture" hidden>' + ic('pip') + '</button><button class="ico sm" id="fs" aria-label="Full screen" title="Full screen" hidden>' + ic('full') + '</button></span>' +
      '<span class="lm">Level match <button class="sw" id="lm" aria-pressed="' + matched + '" aria-label="Level match"></button><span class="lufs" id="lufs"></span></span></div>' +
      '<div class="facts" id="facts"></div>' +
      '<div class="appr" id="appr"></div>' +
      (edit && !share ? '<input type="file" id="nvf" accept="audio/*,video/*,image/*,.wav,.aif,.aiff,.flac,.mp3,.m4a,.aac,.ogg,.mov,.mp4,.heic,.tif,.tiff,.psd" hidden><div class="ups" id="ups"></div>' : '') +
      '</section><aside class="notes glass"><header>' + (share ? '<b>Notes</b>' : '<div class="lens-group" id="ntab"><span class="lens"></span><button class="on" data-tab="n">Notes</button><button data-tab="p">Notepad</button></div>') + '<span class="muted" id="ncount"></span></header>' +
      '<div class="nfilter" id="nfilter"><label class="nsearch">' + ic('search') + '<input id="nq" placeholder="Search notes" aria-label="Search notes"></label><div class="chips" id="nchips"><button class="on" data-f="all">All</button><button data-f="open">Open</button><button data-f="done">Done</button>' + (share ? '' : '<button data-f="mine">Mine</button>') + '</div></div>' +
      '<div class="nlist" id="nlist"></div>' + (share ? '' : '<div class="npad" id="npad" hidden><textarea class="in" id="npad-t" placeholder="Only you see this notepad. Lists, ideas, what to fix next…"></textarea><span class="muted" id="npad-s" style="font-size:12px"></span></div>') +
      (canDo('commenter') ? '<form class="compose" id="cmp">' + (share && !store.get('rs-guest') ? '<input class="in" id="g-name" maxlength="60" placeholder="Your name" required>' : '') +
        '<textarea class="in" id="cmp-t" rows="2" maxlength="4000" placeholder="Write a note…"></textarea><div class="spread"><label class="attime"><input type="checkbox" id="cmp-at" checked> at <b class="mono" id="cmp-time">0:00</b></label><button class="btn main sm" id="cmp-go">Post</button></div></form>' : '') +
      '</aside></div>'

    $('#back').onclick = function () { go(share && share.data.tracks.length === 1 && share.data.project ? '#t/' + id : '#p/' + ctx.project.id) }

    function paintVersions() {
      $('#vers').innerHTML = versions.map(function (x) { return '<button class="v' + (x.id === tview.version ? ' on' : '') + '" data-v="' + x.id + '">' + esc(vname(x)) + (x.final_at ? ' <span class="tick">★</span>' : x.approved_at ? ' <span class="tick">✓</span>' : '') + '</button>' }).join('')
      $$('#vers [data-v]').forEach(function (b) { b.onclick = function () { setVersion(b.dataset.v, true) } })
    }
    function curV() { return versions.filter(function (x) { return x.id === tview.version })[0] || versions[versions.length - 1] }
    // the picture: the video element for a video, the still for a picture, nothing for sound
    function paintMedia() {
      var x = curV(), k = kindOf(x), box = $('#media')
      $('#wave').hidden = k === 'image' || (k === 'video' && !(x.peaks && x.peaks.length))
      $('#ctl').hidden = k === 'image'
      $('.lm').hidden = k !== 'audio'
      if ($('#cmp-at')) $('.attime').hidden = k === 'image'
      if ($('#fs')) { $('#fs').hidden = k !== 'video'; $('#pip').hidden = k !== 'video' || !document.pictureInPictureEnabled }
      if (k === 'video') {
        if (vidEl.parentNode !== box) { box.innerHTML = ''; box.appendChild(vidEl); var vi = document.createElement('span'); vi.className = 'vinfo'; box.appendChild(vi) }
        var info = $('.vinfo', box); if (info) info.textContent = [x.width ? x.width + '×' + x.height : '', size(x.size), x.duration ? (x.size * 8 / x.duration / 1e6).toFixed(1) + ' Mbps' : ''].filter(Boolean).join(' · ')
        if (x.thumb && !vidEl.src) vidEl.poster = x.thumb
        vidEl.onclick = function () { pb.click() }
        box.hidden = false
      } else if (k === 'image') {
        box.hidden = false
        box.innerHTML = '<div class="still"' + (x.thumb ? ' style="background-image:url(' + x.thumb + ')"' : '') + '><img id="still" alt="' + esc(x.file_name) + '"></div>'
        urlFor(x).then(function (u) { var im = $('#still'); if (im && curV() === x) { im.onload = function () { im.classList.add('on') }; im.src = u } }).catch(function () {})
      } else { box.innerHTML = ''; box.hidden = true }
    }
    function setVersion(vid, keep) {
      tview.version = vid; var x = curV()
      paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr(); drawWave()
      load(x, keep, false).catch(function (e) { toast(e.message) })
    }
    function paintFacts() {
      var x = curV()
      $('#lufs').textContent = x.lufs == null ? 'not measured' : (matched ? lufsText(TARGET) + ' (' + lufsText(x.lufs) + ')' : lufsText(x.lufs))
      var f = [KIND_WORD[kindOf(x)]]
      if (x.width) f.push(x.width + '×' + x.height)
      if (kindOf(x) !== 'image' && x.duration) f.push(mmss(x.duration))
      if (x.sample_rate) f.push((x.sample_rate / 1000).toString().replace(/\.0$/, '') + ' kHz')
      if (x.channels) f.push(x.channels === 1 ? 'mono' : x.channels === 2 ? 'stereo' : x.channels === 6 ? '5.1' : x.channels + ' ch')
      if (x.peak_db != null) f.push('peak ' + (x.peak_db < 0 ? '−' : '') + Math.abs(x.peak_db).toFixed(1) + ' dBFS')
      f.push(size(x.size))
      var who = share ? share.data.names[x.uploaded_by] : ctx.people[x.uploaded_by] && ctx.people[x.uploaded_by].name
      f.push((who ? who + ', ' : '') + ago(x.created_at))
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
    wave.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin')) return
      wave.setPointerCapture(e.pointerId)
      scrub = { t: tAt(e.clientX), was: !audio.paused }
      seekNow(scrub.t); drawWave()
    })
    wave.addEventListener('pointermove', function (e) {
      var r = wave.getBoundingClientRect(), d = devicePixelRatio || 1
      hoverX = (e.clientX - r.left) * d
      var ht = $('#hover-t'); ht.hidden = false; ht.style.left = (e.clientX - r.left) + 'px'; ht.textContent = mmss(tAt(e.clientX))
      if (scrub) { scrub.t = tAt(e.clientX); if (!scrubFrame) scrubFrame = requestAnimationFrame(function () { scrubFrame = 0; if (scrub) seekNow(scrub.t) }) }
      drawWave()
    })
    var endScrub = function () { if (!scrub) return; var tt = scrub.t; scrub = null; try { audio.currentTime = tt } catch (e) {} drawWave() }
    wave.addEventListener('pointerup', endScrub); wave.addEventListener('pointercancel', endScrub)
    wave.addEventListener('pointerleave', function () { hoverX = -1; $('#hover-t').hidden = true; drawWave() })
    wave.addEventListener('wheel', function (e) { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setZoom(zw.z * (e.deltaY < 0 ? 1.25 : 0.8), tAt(e.clientX)) }, { passive: false })
    function setZoom(z, around) {
      var x = curV(), dur = x.duration || audio.duration || 0
      zw.z = Math.max(1, Math.min(32, z)); var sp = span(dur)
      zw.start = Math.max(0, Math.min(dur - sp, (around == null ? nowT() : around) - sp / 2))
      $('#zl').textContent = zw.z > 1 ? Math.round(zw.z) + '×' : ''
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
    function paintNotes() {
      var top = topNotes(), x = curV(), dur = x.duration || 0
      var all = tview.notes.filter(function (c) { return c.version_id === tview.version && !c.parent_id })
      var open = all.filter(function (c) { return !c.done }).length
      $('#ncount').textContent = all.length ? open + ' open · ' + all.length + ' in all' : ''
      setTimeout(drawWave)
      $('#nfilter').hidden = all.length < 2
      $('#pins').innerHTML = dur ? top.filter(function (c) { return c.at_sec != null }).map(function (c) { var n = nameOf(c); return '<button class="pin' + (c.done ? ' done' : '') + '" data-c="' + c.id + '" data-at="' + c.at_sec + '" style="left:' + (c.at_sec / dur * 100) + '%;background:hsl(' + hue(n.id) + ',60%,45%)" aria-label="Note at ' + mmss(c.at_sec) + '"><span>' + esc(initials(n.name)[0]) + '</span></button>' }).join('') : ''
      $$('#pins .pin').forEach(function (p) { p.onclick = function (e) { e.stopPropagation(); var c = tview.notes.filter(function (z) { return z.id === p.dataset.c })[0]; jump(c) } })
      var one = function (c, reply) {
        var n = nameOf(c), mine = !share && session && c.author === session.user.id
        var reps = tview.notes.filter(function (z) { return z.parent_id === c.id })
        return '<div class="note' + (c.done ? ' done' : '') + '" data-n="' + c.id + '">' + avatar(n.short || n.name, n.avatar, n.id) + '<div style="min-width:0"><div class="who"><b>' + esc(n.name) + '</b>' + (c.at_sec != null && !reply ? '<button class="at" data-at="' + c.id + '">' + mmss(c.at_sec) + '</button>' : '') + '<span>' + ago(c.created_at) + '</span></div><div class="body">' + esc(c.body) + '</div>' +
          (reply ? '' : '<div class="acts">' + (canDo('commenter') ? '<button class="ico sm" data-rep="' + c.id + '" aria-label="Reply">' + ic('reply') + '</button>' : '') + (!share && (canDo('editor') || mine) ? '<button class="ico sm" data-done="' + c.id + '" aria-label="' + (c.done ? 'Open again' : 'Mark as done') + '" title="' + (c.done ? 'Open again' : 'Done') + '">' + ic('check') + '</button>' : '') + (mine || (!share && ctx.role === 'owner') ? '<button class="ico sm danger" data-del="' + c.id + '" aria-label="Delete note">' + ic('trash') + '</button>' : '') + '</div>') +
          (reps.length ? '<div class="replies">' + reps.map(function (r) { return one(r, true) }).join('') + '</div>' : '') + '</div></div>'
      }
      $('#nlist').innerHTML = top.length ? top.map(function (c) { return one(c) }).join('') : '<p class="muted" style="padding:10px 8px;margin:0;font-size:14px">' + (all.length ? 'No notes match.' : canDo('commenter') ? 'No notes on this version yet. Play it, pause where something needs work and write below.' : 'No notes on this version yet.') + '</p>'
      $$('[data-at]').forEach(function (b) { b.onclick = function () { jump(tview.notes.filter(function (z) { return z.id === b.dataset.at })[0]) } })
      $$('[data-rep]').forEach(function (b) { b.onclick = function () { replyTo = b.dataset.rep; var t = $('#cmp-t'); if (t) { t.placeholder = 'Reply to ' + nameOf(tview.notes.filter(function (z) { return z.id === replyTo })[0]).name + '…'; t.focus() } } })
      $$('[data-done]').forEach(function (b) { b.onclick = function () { var c = tview.notes.filter(function (z) { return z.id === b.dataset.done })[0]; c.done = !c.done; sb.from('roarstudio_comments').update({ done: c.done }).eq('id', c.id).then(function () {}); paintNotes() } })
      $$('[data-del]').forEach(function (b) { b.onclick = function () { var cid = b.dataset.del; sb.from('roarstudio_comments').delete().eq('id', cid).then(function () {}); tview.notes = tview.notes.filter(function (z) { return z.id !== cid && z.parent_id !== cid }); paintNotes() } })
      activeNote()
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
    function jump(c) { if (!c) return; var x = curV(); var go2 = function () { audio.currentTime = c.at_sec || 0; drawWave() }; if (!cur.url || cur.version !== x) load(x, false, false).then(go2); else go2(); lastActive = null; $$('#nlist > .note').forEach(function (n) { n.classList.toggle('on', n.dataset.n === c.id) }) }

    // posting a note: at the playhead, or about the whole version
    var replyTo = null
    if ($('#cmp')) {
      $('#cmp-t').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#cmp').requestSubmit() } })
      $('#cmp-t').addEventListener('focus', function () { if (!audio.paused && store.get('rs-pause-on-type') !== '0') audio.pause() })
      $('#cmp').onsubmit = function (e) {
        e.preventDefault()
        var body = $('#cmp-t').value.trim(); if (!body) return
        if (share && $('#g-name')) { var gn = $('#g-name').value.trim(); if (!gn) { $('#g-name').focus(); return } store.set('rs-guest', gn) }
        var x = curV(), at = replyTo || kindOf(x) === 'image' ? null : ($('#cmp-at').checked ? Math.round(audio.currentTime * 10) / 10 : null)
        $('#cmp-go').disabled = true
        var p = share ? api('share-comment', { version: x.id, body: body, at_sec: at, name: store.get('rs-guest'), parent: replyTo }).then(function (d) { if (d.error) throw new Error(d.error); share.data.comments.push(d.comment); return d.comment })
          : sb.from('roarstudio_comments').insert({ version_id: x.id, project_id: ctx.project.id, body: body, at_sec: at, author: session.user.id, parent_id: replyTo }).select().single().then(function (r) { if (r.error) throw new Error(r.error.message); return r.data })
        p.then(function (c) { tview.notes.push(c); $('#cmp-t').value = ''; replyTo = null; $('#cmp-t').placeholder = 'Write a note…'; if ($('#g-name')) $('#g-name').remove(); paintNotes() }).catch(function (x2) { toast(x2.message) }).then(function () { $('#cmp-go').disabled = false })
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
      $('#tm-t').innerHTML = mmss(t) + ' <span>/ ' + mmss(dur) + '</span>'
      if ($('#cmp-time')) $('#cmp-time').textContent = mmss(t)
      drawWave(); activeNote(); requestAnimationFrame(tick)
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
        modal('<div class="spread"><h2>' + esc(track.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="tm-r">' + ic('pen') + ' Rename</button><button class="btn" id="tm-f">' + ic('folder') + ' Move to a folder</button><button class="btn danger" id="tm-d">' + ic('trash') + ' Delete track</button></div>', function (m) {
          $('#tm-f', m).onclick = function () {
            var fs = ctx.folders || []
            modal('<div class="spread"><h2>Move “' + esc(track.title) + '”</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts">' +
              '<button class="btn' + (!track.folder_id ? ' main' : '') + '" data-mv="">' + ic('back') + ' Top of the project</button>' + fs.map(function (f) { return '<button class="btn' + (track.folder_id === f.id ? ' main' : '') + '" data-mv="' + f.id + '">' + ic('folder') + ' ' + esc(f.name) + '</button>' }).join('') +
              '<button class="btn" id="mv-new">' + ic('fplus') + ' New folder…</button></div>', function (k) {
              $$('[data-mv]', k).forEach(function (b) { b.onclick = function () { var to = b.dataset.mv || null; sb.from('roarstudio_tracks').update({ folder_id: to }).eq('id', id).then(function () { track.folder_id = to; close(); toast(to ? 'Moved' : 'Moved to the top') }) } })
              $('#mv-new', k).onclick = function () { prompt1('New folder', 'Name', '', 'Create and move', function (v) { return sb.from('roarstudio_folders').insert({ project_id: ctx.project.id, name: v, position: fs.length, created_by: session.user.id }).select('id').single().then(function (r) { if (r.error) return; return sb.from('roarstudio_tracks').update({ folder_id: r.data.id }).eq('id', id).then(function () { toast('Moved') }) }) }) }
            })
          }
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
        var pad = b.dataset.tab === 'p'
        $('#nlist').hidden = pad; $('#nfilter').hidden = pad || tview.notes.filter(function (c) { return c.version_id === tview.version && !c.parent_id }).length < 2; $('#npad').hidden = !pad; if ($('#cmp')) $('#cmp').hidden = pad
        if (pad && !$('#npad-t').dataset.loaded) sb.from('roarstudio_notepads').select('body').eq('user_id', session.user.id).eq('track_id', id).maybeSingle().then(function (r) { var t = $('#npad-t'); if (!t) return; t.value = (r.data && r.data.body) || ''; t.dataset.loaded = '1'; t.focus() })
      }
      var padTimer = null
      $('#npad-t').oninput = function () {
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
    $('#zi').onclick = function () { setZoom(zw.z * 2) }
    $('#zo').onclick = function () { setZoom(zw.z / 2) }
    // speed, loop, picture in picture, full screen
    var SPEEDS = [1, 1.25, 1.5, 2, 0.5, 0.75]
    $('#spd').onclick = function () { var i = (SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length; audEl.playbackRate = vidEl.playbackRate = SPEEDS[i]; this.querySelector('b').textContent = SPEEDS[i] + '×' }
    $('#spd').querySelector('b').textContent = (audio.playbackRate || 1) + '×'
    $('#lp').onclick = function () { var on = !audEl.loop; audEl.loop = vidEl.loop = on; this.classList.toggle('on', on) }
    $('#lp').classList.toggle('on', audEl.loop)
    $('#fs').onclick = function () { var el = $('#media'); try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el) } catch (e) { try { vidEl.webkitEnterFullscreen() } catch (x) {} } }
    $('#pip').onclick = function () { try { if (document.pictureInPictureElement) document.exitPictureInPicture(); else vidEl.requestPictureInPicture() } catch (e) {} }

    paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr(); paintPlay(); drawWave()
    requestAnimationFrame(tick)
    if (fresh && cur.version && cur.version.track_id === id && versions.some(function (q) { return q.id === cur.version.id })) { tview.version = cur.version.id; paintVersions(); paintMedia(); paintFacts(); paintNotes(); paintAppr() }
    else if (pendingPlay) { pendingPlay = false; load(curV(), false, true).catch(function (e) { toast(e.message) }) }
    else if (audio.paused) load(curV(), false, false).catch(function () {})
  }
  function wireDropOn(el, fn) {
    var over = function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) e.preventDefault() }
    el.addEventListener('dragover', over); el.addEventListener('drop', function (e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); fn(Array.prototype.slice.call(e.dataTransfer.files)) })
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#layer').firstChild) close() })
  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' || /input|textarea|select|button/i.test((e.target && e.target.tagName) || '')) return
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
        var art = v.thumb ? 'background-image:url(' + v.thumb + ')' : k === 'audio' ? coverAttr(c.project) : ''
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
    if ($('#cr-copy')) $('#cr-copy').onclick = function () { var t = creditsText(c.project.credits, c.project.title); var pr = navigator.clipboard && navigator.clipboard.writeText(t); if (pr) pr.then(function () { toast('Credits copied') }, function () { toast('Could not copy') }) }
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
    if (files.length === 1 || !window.RTZip) { var i = 0; (function next() { if (i >= files.length) return; download(files[i++]); setTimeout(next, 1200) })(); return }
    var label = btn.innerHTML, say = function (t) { btn.innerHTML = ic('down') + ' ' + t }, done = function () { btn.innerHTML = label; btn.disabled = false }
    btn.disabled = true; say('Preparing…')
    var zipName = String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.zip'
    var used = {}
    Promise.all(files.map(function (v) { return urlFor(v).then(function (u) {
      var ext = (v.file_name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0], base = (titleOf(v) + (v.label ? ' - ' + v.label : '')).replace(/[\\/:*?"<>|]/g, ' ').trim() || 'file'
      var nm = base + ext; if (used[nm]) nm = base + ' (v' + v.n + ')' + ext; used[nm] = 1
      return { name: nm, url: u, size: Number(v.size) }
    }) })).then(function (list) {
      var total = list.reduce(function (n, f) { return n + (f.size || 0) }, 0) || 1
      var safari = /Safari\//.test(navigator.userAgent) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|Edg\/|Android/.test(navigator.userAgent)
      var viaWorker = !safari && 'serviceWorker' in navigator && window.ReadableStream && window.TransformStream
      var memory = function () {
        if (total > 2 * 1024 * 1024 * 1024) { done(); toast('Too big for one zip here: downloading one by one'); var i = 0; (function next() { if (i >= files.length) return; download(files[i++]); setTimeout(next, 1200) })(); return }
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
        requestAnimationFrame(draw)
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
        return '<div class="trk glass' + (playable(t) ? '' : ' muted-row') + '" data-i="' + i + '"><span class="num mono">' + (i + 1) + '</span>' + (v && v.thumb ? '<span class="th" style="background-image:url(' + v.thumb + ')"></span>' : '<span class="th"><i>' + ic(k === 'video' ? 'film' : k === 'image' ? 'image' : 'music') + '</i></span>') +
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
    ;(function tick() { if (!document.body.contains($('#plist'))) return; var d = audio.duration || 0; $('#nb-bar i').style.width = (d ? audio.currentTime / d * 100 : 0) + '%'; $('#nb-time').textContent = mmss(audio.currentTime) + ' / ' + mmss(d); requestAnimationFrame(tick) })()
    $$('[data-dl]').forEach(function (b) { b.onclick = function () { download(latest(b.dataset.dl)) } })
    if (edit) {
      $$('[data-up]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.up; if (i < 1) return; var a = pl.items; a.splice(i - 1, 0, a.splice(i, 1)[0]); save() } })
      $$('[data-dn]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.dn; var a = pl.items; if (i >= a.length - 1) return; a.splice(i + 1, 0, a.splice(i, 1)[0]); save() } })
      $$('[data-rm]').forEach(function (b) { b.onclick = function () { pl.items.splice(+b.dataset.rm, 1); save() } })
      $('#pl-add').onclick = function () {
        var cand = c.tracks.filter(function (t) { var v = latest(t.id); return v && kindOf(v) !== 'image' && pl.items.indexOf(t.id) < 0 })
        modal('<div class="spread"><h2>Add to “' + esc(pl.title) + '”</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
          (cand.length ? '<div class="picks">' + cand.map(function (t) { var v = latest(t.id); return '<label class="pick"><input type="checkbox" value="' + t.id + '"><span class="th"' + (v.thumb ? ' style="background-image:url(' + v.thumb + ')"' : '') + '>' + (v.thumb ? '' : '<i>' + ic(kindOf(v) === 'video' ? 'film' : 'music') + '</i>') + '</span><span class="nm"><b>' + esc(t.title) + '</b><small>' + KIND_WORD[kindOf(v)] + ' · ' + mmss(v.duration) + '</small></span></label>' }).join('') + '</div><div class="row end"><button class="btn" data-x>Cancel</button><button class="btn main" id="pk-go">Add</button></div>'
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
      var st = r[0].data || { owner: session.user.id, name: '', logo: null, banner: null, invite_role: 'commenter', link_comment: true, link_approve: false, link_download: false, hide_versions: false }
      var pf = r[1].data || { user_id: session.user.id, notify_notes: true, notify_approvals: true, notify_versions: true, notify_shared: true, digest: false, upload_naming: false }
      var sw = function (id, on) { return '<button type="button" class="sw" id="' + id + '" aria-pressed="' + !!on + '"></button>' }
      var row = function (t, d, ctl) { return '<div class="srow"><div><b>' + t + '</b><small>' + d + '</small></div>' + ctl + '</div>' }
      view.innerHTML = '<div class="head"><div><h1>Settings</h1><div class="sub">Your studio, your defaults and your emails</div></div><div class="tools"><button class="btn" id="go-sto">' + ic('disk') + ' Storage</button></div></div>' +
        '<div class="sgrid">' +
        '<section class="scard glass"><h2>Your studio</h2><p class="muted">Shown at the top of every page you send: links, playlists and Finals.</p>' +
        '<div class="brandset"><div class="field"><label>Square logo</label><button class="logo-pick" id="st-logo"' + (st.logo ? ' style="background-image:url(' + st.logo + ')"' : '') + ' aria-label="Choose the logo">' + (st.logo ? '' : ic('plus')) + '</button></div>' +
        '<div class="field" style="flex:1;min-width:0"><label>Wide banner</label><button class="banner-pick" id="st-banner"' + (st.banner ? ' style="background-image:url(' + st.banner + ')"' : '') + ' aria-label="Choose the banner">' + (st.banner ? '' : ic('plus')) + '</button></div></div>' +
        '<div class="field"><label>Background of your pages</label><button class="banner-pick bd-pick" id="st-bd"' + (st.backdrop ? ' style="background-image:url(' + st.backdrop + ')"' : '') + ' aria-label="Choose the background">' + (st.backdrop ? '' : ic('plus')) + '</button><small class="muted">Shown softly behind your Finals, playlists and links, under the glass.</small></div>' +
        '<div class="row">' + (st.backdrop ? '<button class="btn sm" id="st-bd-x">Remove background</button>' : '') + (st.logo ? '<button class="btn sm" id="st-logo-x">Remove logo</button>' : '') + (st.banner ? '<button class="btn sm" id="st-banner-x">Remove banner</button>' : '') + '</div>' +
        '<div class="field"><label for="st-name">Studio name</label><div class="row" style="flex-wrap:nowrap"><input class="in" id="st-name" maxlength="80" value="' + esc(st.name) + '" placeholder="The Mad Lions"><button class="btn main" id="st-save">Save</button></div></div></section>' +
        '<section class="scard glass"><h2>Defaults</h2><p class="muted">What new invitations and links start with. You can change each one when you make it.</p>' +
        row('Invitations', 'The role someone gets when you add them', '<select class="in" id="st-role" style="width:auto"><option value="editor">Can upload and edit</option><option value="commenter">Can listen and comment</option><option value="listener">Can listen</option></select>') +
        row('Links: comments', 'People with a link can leave notes', sw('st-lc', st.link_comment)) +
        row('Links: approve', 'People with a link can approve a version', sw('st-la', st.link_approve)) +
        row('Links: download', 'People with a link can download the files', sw('st-ld', st.link_download)) +
        row('Hide version numbers', 'People on your links see a version’s name or date, never v1, v2…', sw('st-hv', st.hide_versions)) + '</section>' +
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
      flip('#st-lc', function (on) { saveSt({ link_comment: on }, 'Saved') }); flip('#st-la', function (on) { saveSt({ link_approve: on }, 'Saved') }); flip('#st-ld', function (on) { saveSt({ link_download: on }, 'Saved') }); flip('#st-hv', function (on) { saveSt({ hide_versions: on }, 'Saved') })
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
      view.innerHTML = '<div class="head"><div><h1>Storage</h1><div class="sub">Your projects on Cloudflare, in Europe</div></div><div class="tools"><button class="btn" id="go-set">' + ic('gear') + ' Settings</button></div></div>' +
        '<section class="scard glass storage"><div class="big"><b>' + size(tot) + '</b><span>in ' + ps.length + ' project' + (ps.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="kbar">' + seg(k.audio, '#a78bfa') + seg(k.video, '#22d3ee') + seg(k.image, '#ffd166') + '</div>' +
        '<div class="klegend"><span><i style="background:#a78bfa"></i>Audio ' + size(k.audio) + '</span><span><i style="background:#22d3ee"></i>Video ' + size(k.video) + '</span><span><i style="background:#ffd166"></i>Pictures ' + size(k.image) + '</span></div>' +
        '<p class="muted" style="margin:0;font-size:13px">Unlimited while RoarStudio is new. Files shared with you count for their owner.</p></section>' +
        '<div class="tracks" style="margin-top:14px">' + ps.map(function (p) { return '<button class="srow2 glass" data-p="' + p.id + '"><span class="nm"><b>' + esc(p.title) + '</b><small>' + p.files + ' file' + (p.files === 1 ? '' : 's') + (p.finals ? ' · ' + size(p.finals) + ' final' : '') + '</small></span><span class="pbar"><i style="width:' + Math.max(1, p.bytes / top * 100) + '%"></i></span><span class="t">' + size(p.bytes) + '</span></button>' }).join('') + '</div>'
      $$('[data-p]').forEach(function (b) { b.onclick = function () { go('#p/' + b.dataset.p) } })
      $('#go-set').onclick = function () { go('#settings') }
    })
  }

  // ---- Admin: who uses RoarStudio and how (Alex, 7 Nov) ----
  function renderAdmin() {
    setTop(['Admin'])
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    api('admin-stats').then(function (d) {
      if (d.error) { view.innerHTML = errorBox(d.error === 'not allowed' ? 'Only RoarStudio’s admins see this page.' : d.error); return }
      var t = d.totals, days = d.days || [], top = Math.max(1, days.reduce(function (a, x) { return Math.max(a, x.uploads + x.notes) }, 0))
      var kpi = function (n, l, s2) { return '<div class="kpi glass"><b>' + n + '</b><span>' + l + '</span>' + (s2 ? '<small>' + s2 + '</small>' : '') + '</div>' }
      var kt = d.kinds, kb = Math.max(1, kt.audio.bytes + kt.video.bytes + kt.image.bytes)
      view.innerHTML = '<div class="head"><div><h1>Admin</h1><div class="sub">Everyone on RoarStudio, what they use and how · ' + new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div></div><div class="tools"><button class="btn" id="ad-re">' + ic('rot') + ' Refresh</button></div></div>' +
        '<div class="kpis">' + kpi(t.accounts, 'Accounts', t.active7 + ' active this week') + kpi(t.projects, 'Projects', t.folders + ' folders · ' + t.playlists + ' playlists') + kpi(t.files, 'Files', t.finals + ' final · ' + t.approved + ' approved') + kpi(size(t.storage), 'Stored') + kpi(t.notes, 'Notes', t.guest_notes + ' from guests') + kpi(t.links, 'Links', t.finals_links + ' Finals links') + '</div>' +
        '<div class="adgrid"><section class="scard glass"><h2>Last 30 days</h2><div class="chart" role="img" aria-label="Uploads and notes per day">' + days.map(function (x) { return '<div class="col" title="' + x.day + ': ' + x.uploads + ' uploads, ' + x.notes + ' notes, ' + x.views + ' link plays/views"><i class="u" style="height:' + (x.uploads / top * 100) + '%"></i><i class="n" style="height:' + (x.notes / top * 100) + '%"></i></div>' }).join('') + '</div><div class="klegend"><span><i style="background:#a78bfa"></i>Uploads</span><span><i style="background:#22d3ee"></i>Notes</span><span>Links: ' + d.link_activity.view + ' opened · ' + d.link_activity.stream + ' played · ' + d.link_activity.download + ' downloaded</span></div></section>' +
        '<section class="scard glass"><h2>What they upload</h2>' + ['audio', 'video', 'image'].map(function (k) { return '<div class="srow"><div><b><i class="kdot k-' + k + '"></i>' + KIND_PLURAL[k] + '</b><small>' + kt[k].files + ' file' + (kt[k].files === 1 ? '' : 's') + '</small></div><span class="pbar" style="width:40%"><i style="width:' + Math.max(1, kt[k].bytes / kb * 100) + '%"></i></span><span class="mono" style="font-size:13px">' + size(kt[k].bytes) + '</span></div>' }).join('') + '</section></div>' +
        '<section class="scard glass" style="margin-top:14px"><h2>Accounts</h2><div class="atable"><div class="arow ah"><span>Account</span><span>Joined</span><span>Last active</span><span>Projects</span><span>Uploads</span><span>Notes</span><span>Storage</span></div>' +
        d.accounts.map(function (a) { return '<div class="arow"><span class="who2"><b>' + esc(a.name || a.email.split('@')[0]) + '</b><small>' + esc(a.email) + '</small></span><span>' + new Date(a.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + '</span><span>' + (a.last ? ago(a.last) : '—') + '</span><span>' + a.projects + (a.member_of ? ' <small>+' + a.member_of + ' shared</small>' : '') + '</span><span>' + a.uploads + '</span><span>' + a.notes + '</span><span>' + size(a.storage) + '</span></div>' }).join('') + '</div></section>' +
        '<section class="scard glass" style="margin-top:14px"><h2>Biggest projects</h2>' + d.top.map(function (p) { return '<div class="srow"><div><b>' + esc(p.title) + '</b><small>' + esc(p.owner) + ' · ' + p.files + ' files · ' + ago(p.updated) + '</small></div><span class="mono" style="font-size:13px">' + size(p.bytes) + '</span></div>' }).join('') + '</section>'
      $('#ad-re').onclick = renderAdmin
    })
  }

  // ---- the bell: what happened in my projects and in the ones shared with me ----
  var ACT = { note: ['Comments', 'reply'], approve: ['Approvals', 'check'], final: ['Approvals', 'star'], download: ['Downloads', 'down'], stream: ['Streams', 'play'], view: ['Views', 'eye'], version: ['Uploads', 'up'], shared: ['Shared', 'people'] }
  function bellCount() {
    if (!session) return
    var seen = store.get('rs-seen') || new Date(Date.now() - 864e5).toISOString()
    sb.from('roarstudio_events').select('id, actor', { count: 'exact' }).gt('created_at', seen).neq('actor', session.user.id).limit(1).then(function (r) {
      var b = $('#bell-n'); if (!b) return
      var n = r.count || 0; b.hidden = !n; b.textContent = n > 9 ? '9+' : n
    })
  }
  function activityPanel() {
    var tab = 'mine', filt = 'All'
    var m = modal('<div class="spread"><h2>Notifications</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="lens-group" id="ac-tab" style="width:100%"><span class="lens"></span><button class="on" data-t="mine" style="flex:1">My projects</button><button data-t="shared" style="flex:1">Shared with me</button></div><div class="chips" id="ac-f">' + ['All', 'Comments', 'Approvals', 'Downloads', 'Streams', 'Views', 'Uploads'].map(function (f, i) { return '<button' + (i ? '' : ' class="on"') + ' data-f="' + f + '">' + f + '</button>' }).join('') + '</div><div class="aclist" id="ac-l"><div class="spin"></div></div>')
    $('.sheet-card', m).classList.add('drawer')
    m.classList.add('side')
    store.set('rs-seen', new Date().toISOString()); var bn = $('#bell-n'); if (bn) bn.hidden = true
    setTimeout(function () { lens($('#ac-tab')) }, 30)
    Promise.all([sb.from('roarstudio_events').select('*').order('created_at', { ascending: false }).limit(300), sb.from('roarstudio_projects').select('id, title, owner')]).then(function (r) {
      var evs = (r[0].data || []).filter(function (e) { return e.actor !== session.user.id }), ps = r[1].data || []
      var tids = evs.map(function (e) { return e.track_id }).filter(Boolean)
      ;(tids.length ? sb.from('roarstudio_tracks').select('id, title').in('id', tids.filter(function (x, i) { return tids.indexOf(x) === i }).slice(0, 200)) : Promise.resolve({ data: [] })).then(function (tr) {
        var tt = {}; (tr.data || []).forEach(function (t) { tt[t.id] = t.title })
        var draw = function () {
          var rows = evs.filter(function (e) { var p = ps.filter(function (x) { return x.id === e.project_id })[0]; if (!p) return false; return (tab === 'mine') === (p.owner === session.user.id) }).filter(function (e) { return filt === 'All' || (ACT[e.kind] && ACT[e.kind][0] === filt) })
          $('#ac-l', m).innerHTML = rows.length ? rows.map(function (e) {
            var p = ps.filter(function (x) { return x.id === e.project_id })[0], t = tt[e.track_id] || ''
            var who = e.actor_name || (ctx && ctx.people && ctx.people[e.actor] && ctx.people[e.actor].name) || 'Someone'
            var what = e.kind === 'note' ? who + ' left a note on ' + t : e.kind === 'approve' ? who + ' approved ' + t : e.kind === 'final' ? t + ' is final' : e.kind === 'download' ? who + ' downloaded ' + t : e.kind === 'stream' ? who + ' played ' + t : e.kind === 'view' ? who + ' opened your link' : e.kind === 'version' ? 'New upload: ' + t : who + ' added someone to the project'
            return '<button class="acrow" data-go="' + (e.track_id ? '#t/' + e.track_id : '#p/' + e.project_id) + '"><span class="ico sm">' + ic((ACT[e.kind] || [0, 'bell'])[1]) + '</span><span class="nm"><b>' + esc(what) + '</b><small>' + esc(p.title) + ' · ' + ago(e.created_at) + '</small>' + (e.body && e.kind === 'note' ? '<em>' + esc(e.body) + '</em>' : '') + '</span></button>'
          }).join('') : '<div class="empty" style="padding:30px 10px"><h2 style="font-size:20px">Don’t miss important updates</h2><p>Nothing here yet. Notes, approvals, plays and downloads show up here.</p></div>'
          $$('[data-go]', m).forEach(function (b) { b.onclick = function () { close(); go(b.dataset.go) } })
        }
        $('#ac-tab', m).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('#ac-tab button', m).forEach(function (x) { x.classList.toggle('on', x === b) }); lens($('#ac-tab', m)); tab = b.dataset.t; draw() }
        $('#ac-f', m).onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('#ac-f button', m).forEach(function (x) { x.classList.toggle('on', x === b) }); filt = b.dataset.f; draw() }
        draw()
      })
    })
  }

  // ---- the cropper: pick a photo, zoom, move, turn, crop to the shape asked for ----
  function cropBox(o) {
    var img = null, zoom = 1, rot = 0, ox = 0, oy = 0
    var m = modal('<div class="spread"><h2>' + esc(o.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="crop" id="cr" style="aspect-ratio:' + o.w + '/' + o.h + '"><canvas id="cr-c"></canvas><div class="crop-empty" id="cr-e"><span class="ico" style="width:54px;height:54px">' + ic('image') + '</span><b>Choose a photo</b><small>JPG, PNG, WebP or HEIC from your phone</small></div></div>' +
      '<input type="file" id="cr-f" accept="image/*" hidden>' +
      '<div class="cropctl"><button class="ico sm" id="cr-out" aria-label="Zoom out">−</button><input type="range" id="cr-z" min="1" max="4" step="0.01" value="1" aria-label="Zoom"><button class="ico sm" id="cr-in" aria-label="Zoom in">+</button><button class="ico sm" id="cr-r" aria-label="Turn" title="Turn">' + ic('rot') + '</button></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Drag the photo to move it, pinch or scroll to zoom.</p>' +
      '<div class="row" style="justify-content:space-between"><div class="row"><button class="btn" id="cr-pick">' + ic('image') + ' Choose photo</button>' + (o.onRemove ? '<button class="btn danger" id="cr-rm">Remove</button>' : '') + '</div><div class="row"><button class="btn" data-x>Cancel</button><button class="btn main" id="cr-ok" disabled>Save</button></div></div>')
    var card = $('.sheet-card', m); card.classList.add('wide')
    var cv = $('#cr-c', m), box = $('#cr', m)
    var fit = function () { var r = box.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d }
    var base = function () { var w = rot % 180 ? img.height : img.width, h = rot % 180 ? img.width : img.height; return Math.max(cv.width / w, cv.height / h) }
    var clamp = function () {
      var s = base() * zoom, w = (rot % 180 ? img.height : img.width) * s, h = (rot % 180 ? img.width : img.height) * s
      var mx = Math.max(0, (w - cv.width) / 2), my = Math.max(0, (h - cv.height) / 2)
      ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy))
    }
    var drawTo = function (c2, W, H, k) {
      var g = c2.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H)
      g.save(); g.translate(W / 2 + ox * k, H / 2 + oy * k); g.rotate(rot * Math.PI / 180)
      var s = base() * zoom * k; g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); g.restore()
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
    // the links people get carry RoarStudio's own address (Cloudflare sends studio.roartransfer.com to this page)
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
      if (!finals && !pl) { $('#s-c', m).setAttribute('aria-pressed', st.link_comment !== false); $('#s-a', m).setAttribute('aria-pressed', !!st.link_approve); $('#s-d', m).setAttribute('aria-pressed', !!st.link_download) }
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
      $('#s-copy', m).onclick = function () { var t = $('#s-link', m); var p = navigator.clipboard && navigator.clipboard.writeText(t.value); if (p) p.then(function () { toast('Link copied') }, function () { t.select() }); else t.select() }
      function oldLinks() {
        var q = sb.from('roarstudio_shares').select('*').eq('project_id', c.project.id).order('created_at', { ascending: false })
        q.then(function (r) {
          var rows = (r.data || []).filter(function (s) { return pl ? s.kind === 'playlist' && s.playlist_id === pl.id : finals ? s.kind === 'finals' : s.kind === 'review' && (track ? s.track_id === track.id : !s.track_id) })
          $('#s-old', m).innerHTML = rows.length ? '<div class="field"><label>Links made</label><div class="people">' + rows.map(function (s) {
            var what = [s.can_comment ? 'comments' : '', s.can_approve ? 'approve' : '', s.can_download ? 'download' : '', s.password_hash ? 'password' : ''].filter(Boolean).join(', ') || 'listen only'
            var ended = s.expires_at && new Date(s.expires_at) < new Date()
            return '<div class="person"><div class="nm"><b class="mono" style="font-size:12.5px">?s=' + esc(s.token) + '</b><span>' + esc(what) + ' · ' + (ended ? 'ended' : s.expires_at ? 'ends ' + new Date(s.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'no end') + '</span></div><button class="ico sm" data-cp="' + s.token + '" aria-label="Copy link">' + ic('copy') + '</button><button class="ico sm danger" data-sd="' + s.token + '" aria-label="Delete link">' + ic('trash') + '</button></div>'
          }).join('') + '</div></div>' : ''
          $$('[data-cp]', m).forEach(function (b) { b.onclick = function () { var u = base + '?s=' + b.dataset.cp; var p = navigator.clipboard && navigator.clipboard.writeText(u); if (p) p.then(function () { toast('Link copied') }, function () { toast(u) }); else toast(u) } })
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
        if (d.studio && d.studio.backdrop) { document.body.style.setProperty('--bd', 'url(' + d.studio.backdrop + ')'); document.body.classList.add('custom-bd') }
        ctx = { project: d.project, tracks: d.tracks || [], versions: d.versions || [], comments: d.comments || [], people: {}, peopleList: [], role: 'guest' }
        if (d.kind === 'review' && d.tracks && d.tracks.length === 1 && !location.hash) { location.replace('#t/' + d.tracks[0].id); return }
        renderShare()
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
      if ($('#mini-t').textContent !== m.title) { $('#mini-t').textContent = m.title; $('#mini-p').textContent = m.project; $('#mini-art').style.cssText = audio === vidEl ? '' : (m.cover ? "background:#000 url('" + m.cover + "') center/cover" : m.coverStyle) }
      $('#mini-art').classList.toggle('video', audio === vidEl)
      $('#mini-c').textContent = mmss(audio.currentTime); $('#mini-d').textContent = mmss(d)
      $('#mini-bar i').style.width = (d ? audio.currentTime / d * 100 : 0) + '%'
      var icn = audio.paused ? 'play' : 'pause'; if ($('#mini-pp').dataset.i !== icn) { $('#mini-pp').dataset.i = icn; $('#mini-pp').innerHTML = ic(icn) }
    }
    requestAnimationFrame(miniTick)
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
    sb.from('roarstudio_prefs').select('*').eq('user_id', s.user.id).maybeSingle().then(function (r) { if (me && r.data) me.prefs = r.data })
    sb.from('roarstudio_studios').select('*').eq('owner', s.user.id).maybeSingle().then(function (r) { if (me) me.studio = r.data || null })
    setTimeout(function () { api('admin-check').then(function (d) { if (me) me.admin = !!d.admin }) }, 300)
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
