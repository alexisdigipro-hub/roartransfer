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
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'
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
  function close() { $('#layer').innerHTML = '' }
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
    if (share && /^share-/.test(action) && action !== 'share-create') { body.token = share.token; body.password = share.password }
    else if (session) h.Authorization = 'Bearer ' + session.access_token
    return fetch(FN, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) {
      return r.json().catch(function () { return { error: 'Error ' + r.status } }).then(function (d) { if (!r.ok && !d.error) d.error = 'Error ' + r.status; d._status = r.status; return d })
    })
  }

  // ---- the player: one audio element, a gain for level matching ----
  var audio = new Audio(); audio.preload = 'auto'; audio.crossOrigin = 'anonymous'
  var actx = null, gainNode = null, matched = store.get('rs-match') !== '0'
  var cur = { version: null, url: '', gain: 1 }
  function ensureGraph() {
    if (actx || !(window.AudioContext || window.webkitAudioContext)) return
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); var src = actx.createMediaElementSource(audio); gainNode = actx.createGain(); src.connect(gainNode).connect(actx.destination) } catch (e) { actx = null; gainNode = null }
  }
  function applyGain() {
    var v = cur.version, g = 1
    if (matched && v && v.lufs != null) g = Math.pow(10, Math.max(-24, Math.min(12, TARGET - v.lufs)) / 20)
    cur.gain = g
    if (gainNode) { gainNode.gain.value = g; audio.volume = 1 } else audio.volume = Math.min(1, g)
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
    cur.version = v; applyGain()
    return urlFor(v).then(function (u) {
      if (cur.version !== v) return
      if (cur.url !== u) { cur.url = u; audio.src = u; audio.load() }
      var go = function () { try { audio.currentTime = Math.min(t, (v.duration || audio.duration || t)) } catch (e) {} if (autoplay || (keepTime && was)) play() }
      if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true })
    })
  }
  function play() { ensureGraph(); if (actx && actx.state === 'suspended') actx.resume(); applyGain(); var p = audio.play(); if (p && p.catch) p.catch(function () {}) }
  function download(v) {
    (share ? api('share-url', { version: v.id, download: true }) : api('url', { version: v.id, download: true })).then(function (d) {
      if (!d.url) { toast(d.error || 'Could not download'); return }
      var a = document.createElement('a'); a.href = d.url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove()
    })
  }

  // ---- routing ----
  var qs = new URLSearchParams(location.search)
  var shareToken = qs.get('s')
  function route() { var m = location.hash.match(/^#([pt])\/([0-9a-f-]{36})/); return m ? { kind: m[1], id: m[2] } : { kind: 'home' } }
  function go(h) { if (location.hash === h) render(); else location.hash = h }
  window.addEventListener('hashchange', function () { render() })
  $('#home').onclick = function () { go(share ? '#/' : '#/') }

  var live = null // realtime channel of the open project
  function unlisten() { if (live) { sb.removeChannel(live); live = null } }

  function setTop(crumbs) {
    $('#crumbs').innerHTML = (crumbs || []).map(function (c, i) { return '<span class="sep">/</span><span>' + esc(c) + '</span>' }).join('')
    var r = $('#right')
    if (share) { r.innerHTML = session ? '' : '<a class="btn sm" href="./">Sign in</a>'; return }
    if (!session) { r.innerHTML = ''; return }
    var name = (me && me.name) || (session.user.email || '').split('@')[0]
    r.innerHTML = '<button class="me" id="me-btn" aria-label="Account" style="' + (me && me.avatar ? "background-image:url('" + esc(me.avatar) + "')" : 'background:hsl(' + hue(session.user.id) + ',55%,40%)') + '">' + (me && me.avatar ? '' : esc(initials(name))) + '</button>'
    $('#me-btn').onclick = function (e) {
      e.stopPropagation()
      var old = $('.menu'); if (old) { old.remove(); return }
      var m = document.createElement('div'); m.className = 'menu'
      m.innerHTML = '<div class="who">' + esc(session.user.email || '') + '</div><button id="mn-rt">' + ic('out') + ' Open RoarTransfer</button><button id="mn-out">' + ic('back') + ' Sign out</button>'
      document.body.appendChild(m)
      $('#mn-rt').onclick = function () { location.href = '../' }
      $('#mn-out').onclick = function () { m.remove(); sb.auth.signOut() }
      setTimeout(function () { document.addEventListener('click', function f() { m.remove(); document.removeEventListener('click', f) }) })
    }
  }

  function render() {
    var view = $('#view')
    unlisten()
    if (share) return renderShare()
    if (!session) { setTop([]); return renderSignedOut(view) }
    var r = route()
    if (r.kind === 'p') return renderProject(r.id)
    if (r.kind === 't') return renderTrack(r.id)
    return renderProjects()
  }

  // =====================================================================================================
  // signed out: what it is, and the sign-in (Roar Account first, email below, as RoarTransfer)
  // =====================================================================================================
  function renderSignedOut(view) {
    view.innerHTML = '<section class="hello">' +
      '<div><h1>Your music, <em>in one cloud</em> that listens.</h1>' +
      '<p>Upload mixes, stems and every version. Get notes pinned to the exact second, compare versions at the same loudness, and send the artist one link to approve the master.</p>' +
      '<ul><li>Projects, tracks and versions, stacked in order</li><li>Notes on the waveform, with replies</li><li>Level matching: every version at −14 LUFS</li><li>One link for artists and labels, no account needed</li><li>Stored on Cloudflare, with your Roar account</li></ul></div>' +
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
      sb.from('roarstudio_projects').select('id, title, artist, owner, updated_at, created_at').order('updated_at', { ascending: false }),
      sb.from('roarstudio_tracks').select('id, project_id'),
      api('usage')
    ]).then(function (r) {
      if (r[0].error) { view.innerHTML = errorBox(r[0].error.message); return }
      var ps = r[0].data || [], counts = {}
      ;(r[1].data || []).forEach(function (t) { counts[t.project_id] = (counts[t.project_id] || 0) + 1 })
      view.innerHTML = '<div class="head"><div><h1>Projects</h1><div class="sub">' + ps.length + ' project' + (ps.length === 1 ? '' : 's') + (r[2] && r[2].bytes ? ' · ' + size(r[2].bytes) + ' stored' : '') + '</div></div><div class="tools"><button class="btn main" id="np">' + ic('plus') + ' New project</button></div></div>' +
        (ps.length ? '<div class="grid">' + ps.map(function (p) {
          return '<button class="proj glass" data-p="' + p.id + '"><div class="cover" style="' + coverStyle(p.id) + '"><b>' + esc(p.title) + '</b></div><div class="meta"><span>' + esc(p.artist || (p.owner === session.user.id ? 'Yours' : 'Shared with you')) + '</span><span>' + (counts[p.id] || 0) + ' track' + (counts[p.id] === 1 ? '' : 's') + '</span></div></button>'
        }).join('') + '<button class="proj new-proj" id="np2"><span class="ico">' + ic('plus') + '</span>New project</button></div>'
        : '<div class="empty glass"><span class="ico" style="width:64px;height:64px">' + ic('music') + '</span><h2>Start your first project</h2><p>A project is an album, a single or a film score. Put tracks in it, upload versions, and invite the people you work with.</p><button class="btn main" id="np2">' + ic('plus') + ' New project</button></div>')
      $$('[data-p]').forEach(function (b) { b.onclick = function () { go('#p/' + b.dataset.p) } })
      ;['#np', '#np2'].forEach(function (s) { var b = $(s); if (b) b.onclick = newProject })
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
      sb.rpc('roarstudio_role', { p: id })
    ]).then(function (r) {
      if (!r[0].data) throw new Error('This project does not exist, or you are not in it.')
      var people = {}
      ;(r[4].data || []).forEach(function (x) { people[x.user_id] = { name: x.name, avatar: x.avatar, role: x.role, email: x.email } })
      ctx = { project: r[0].data, tracks: r[1].data || [], versions: r[2].data || [], comments: r[3].data || [], people: people, peopleList: r[4].data || [], role: r[5].data || 'listener' }
      return ctx
    })
  }
  var RANK = ['listener', 'commenter', 'editor', 'owner']
  var canDo = function (need) { return share ? (need === 'commenter' ? share.data.can.comment : need === 'approve' ? share.data.can.approve : need === 'download' ? share.data.can.download : false) : RANK.indexOf(ctx.role) >= RANK.indexOf(need === 'approve' ? 'editor' : need === 'download' ? 'listener' : need) }

  function renderProject(id) {
    var view = $('#view'); view.innerHTML = '<div class="spin"></div>'
    var p = share ? Promise.resolve(ctx) : loadProject(id)
    p.then(function (c) { drawProject(c) }).catch(function (e) { setTop([]); view.innerHTML = errorBox(e.message) })
  }
  function latest(trackId) { var vs = ctx.versions.filter(function (v) { return v.track_id === trackId }); return vs[vs.length - 1] }
  function drawProject(c) {
    var view = $('#view'), pr = c.project, edit = canDo('editor')
    setTop([pr.title])
    var openNotes = function (tid) { var ids = c.versions.filter(function (v) { return v.track_id === tid }).map(function (v) { return v.id }); return c.comments.filter(function (n) { return ids.indexOf(n.version_id) >= 0 && !n.done && !n.parent_id }).length }
    view.innerHTML = '<div class="head"><span class="cover" style="width:64px;height:64px;padding:0;border-radius:16px;' + coverStyle(pr.id) + '"></span><div style="min-width:0"><h1>' + esc(pr.title) + '</h1><div class="sub">' + esc(pr.artist || '') + (pr.artist ? ' · ' : '') + c.tracks.length + ' track' + (c.tracks.length === 1 ? '' : 's') + (share ? (share.data.project.owner_name ? ' · shared by ' + esc(share.data.project.owner_name) : '') : '') + '</div></div>' +
      '<div class="tools">' + (share ? '' :
        (edit ? '<button class="btn main" id="up-btn">' + ic('up') + ' Upload</button>' : '') +
        (edit ? '<button class="btn" id="sh-btn">' + ic('share') + ' Share</button>' : '') +
        '<button class="btn" id="pp-btn">' + ic('people') + ' People</button>' +
        (edit ? '<button class="ico" id="pm-btn" aria-label="More">' + ic('dots') + '</button>' : '')) + '</div></div>' +
      '<div class="tracks" id="tracks">' + (c.tracks.length ? c.tracks.map(function (t) {
        var v = latest(t.id); if (!v) return ''
        var n = c.versions.filter(function (x) { return x.track_id === t.id }).length, notes = openNotes(t.id)
        return '<div class="trk glass" data-t="' + t.id + '"><button class="pl" data-play="' + t.id + '" aria-label="Play ' + esc(t.title) + '">' + ic('play') + '</button><div class="nm"><b>' + esc(t.title) + '</b><span>v' + v.n + (v.label ? ' · ' + esc(v.label) : '') + ' · ' + n + ' version' + (n === 1 ? '' : 's') + (notes ? ' · ' + notes + ' open note' + (notes === 1 ? '' : 's') : '') + '</span></div><canvas data-wave="' + v.id + '"></canvas><span class="cnt">' + (v.approved_at ? '<span class="chip ok">Approved</span>' : notes ? '<span class="chip warn">In review</span>' : '<span class="chip">New</span>') + '</span><span class="t">' + mmss(v.duration) + '</span></div>'
      }).join('') : '') + '</div>' +
      (edit ? '<label class="drop" id="drop"><input type="file" id="files" multiple accept="audio/*,video/*,.wav,.aif,.aiff,.flac,.mp3,.m4a,.aac,.ogg,.mov,.mp4" hidden><span class="ico" style="width:50px;height:50px">' + ic('up') + '</span><b>' + (c.tracks.length ? 'Drop more tracks here' : 'Drop your first tracks here') + '</b><span>WAV, AIFF, FLAC, MP3, M4A or a video, up to 10 GB each. Each file becomes a track.</span></label><div class="ups" id="ups"></div>'
        : (!c.tracks.length ? '<div class="empty glass"><h2>No tracks yet</h2><p>When someone uploads a track it shows up here.</p></div>' : ''))
    $$('canvas[data-wave]').forEach(function (cv) { var v = c.versions.filter(function (x) { return x.id === cv.dataset.wave })[0]; drawMini(cv, v && v.peaks) })
    $$('.trk').forEach(function (r) { r.onclick = function (e) { if (e.target.closest('[data-play]')) return; go('#t/' + r.dataset.t) } })
    $$('[data-play]').forEach(function (b) { b.onclick = function () { pendingPlay = true; go('#t/' + b.dataset.play) } })
    if (!share) {
      if ($('#pp-btn')) $('#pp-btn').onclick = function () { peopleBox(c) }
      if ($('#sh-btn')) $('#sh-btn').onclick = function () { shareBox(c, null) }
      if ($('#up-btn')) $('#up-btn').onclick = function () { $('#files').click() }
      if ($('#pm-btn')) $('#pm-btn').onclick = function () { projectMenu(c) }
      if (edit) wireDrop($('#drop'), $('#files'), function (files) { files.forEach(function (f) { uploadFile(f, { project: pr.id }) }) })
      listen(pr.id)
    }
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
  window.addEventListener('beforeunload', function (e) { if (uploading) { e.preventDefault(); e.returnValue = '' } })
  function uploadFile(file, opt) {
    var box = document.createElement('div'); box.className = 'up glass'
    box.innerHTML = '<div class="spread"><span><b>' + esc(file.name) + '</b> <span class="muted">' + size(file.size) + '</span></span><span class="muted st">Reading the sound…</span></div><div class="bar"><i></i></div>'
    var list = $('#ups'); if (list) list.appendChild(box)
    var st = function (t) { $('.st', box).textContent = t }, bar = function (p) { $('.bar i', box).style.width = Math.round(p * 100) + '%' }
    uploading++
    var meta = null
    return RSAudio.analyse(file).then(function (m) {
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
        return api('upload-complete', { project: opt.project, key: made.key, uploadId: made.uploadId, parts: parts, name: file.name, size: file.size, type: file.type, track: opt.track || null, title: opt.title || null, meta: meta || {} })
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

    view.innerHTML = '<div class="head"><button class="ico" id="back" aria-label="Back to the project">' + ic('back') + '</button><div style="min-width:0"><h1>' + esc(track.title) + '</h1><div class="sub">' + esc(ctx.project.title) + (ctx.project.artist ? ' · ' + esc(ctx.project.artist) : '') + '</div></div><div class="tools">' +
      (edit && !share ? '<button class="btn main" id="nv">' + ic('up') + ' New version</button><button class="btn" id="tsh">' + ic('share') + ' Share</button><button class="ico" id="tm" aria-label="More">' + ic('dots') + '</button>' : '') + '</div></div>' +
      '<div class="player"><section class="stage glass">' +
      '<div class="vers" id="vers"></div>' +
      '<div class="wave" id="wave"><canvas id="wv"></canvas><div class="pins" id="pins"></div></div>' +
      '<div class="ctl"><button class="play" id="pb" aria-label="Play">' + ic('play') + '</button><span class="time" id="tm-t">0:00 <span>/ 0:00</span></span>' +
      '<span class="lm">Level match <button class="sw" id="lm" aria-pressed="' + matched + '" aria-label="Level match"></button><span class="lufs" id="lufs"></span></span></div>' +
      '<div class="facts" id="facts"></div>' +
      '<div class="appr" id="appr"></div>' +
      (edit && !share ? '<input type="file" id="nvf" accept="audio/*,video/*,.wav,.aif,.aiff,.flac,.mp3,.m4a,.aac,.ogg,.mov,.mp4" hidden><div class="ups" id="ups"></div>' : '') +
      '</section><aside class="notes glass"><header><b>Notes</b><span class="muted" id="ncount"></span></header><div class="nlist" id="nlist"></div>' +
      (canDo('commenter') ? '<form class="compose" id="cmp">' + (share && !store.get('rs-guest') ? '<input class="in" id="g-name" maxlength="60" placeholder="Your name" required>' : '') +
        '<textarea class="in" id="cmp-t" rows="2" maxlength="4000" placeholder="Write a note…"></textarea><div class="spread"><label class="attime"><input type="checkbox" id="cmp-at" checked> at <b class="mono" id="cmp-time">0:00</b></label><button class="btn main sm" id="cmp-go">Post</button></div></form>' : '') +
      '</aside></div>'

    $('#back').onclick = function () { go(share && share.data.tracks.length === 1 && share.data.project ? '#t/' + id : '#p/' + ctx.project.id) }

    function paintVersions() {
      $('#vers').innerHTML = versions.map(function (x) { return '<button class="v' + (x.id === tview.version ? ' on' : '') + '" data-v="' + x.id + '">v' + x.n + (x.label ? ' · ' + esc(x.label) : '') + (x.approved_at ? ' <span class="tick">✓</span>' : '') + '</button>' }).join('')
      $$('#vers [data-v]').forEach(function (b) { b.onclick = function () { setVersion(b.dataset.v, true) } })
    }
    function curV() { return versions.filter(function (x) { return x.id === tview.version })[0] || versions[versions.length - 1] }
    function setVersion(vid, keep) {
      tview.version = vid; var x = curV()
      paintVersions(); paintFacts(); paintNotes(); paintAppr(); drawWave()
      load(x, keep, false).catch(function (e) { toast(e.message) })
    }
    function paintFacts() {
      var x = curV()
      $('#lufs').textContent = x.lufs == null ? 'not measured' : (matched ? lufsText(TARGET) + ' (' + lufsText(x.lufs) + ')' : lufsText(x.lufs))
      var f = []
      if (x.sample_rate) f.push((x.sample_rate / 1000).toString().replace(/\.0$/, '') + ' kHz')
      if (x.channels) f.push(x.channels === 1 ? 'mono' : x.channels === 2 ? 'stereo' : x.channels === 6 ? '5.1' : x.channels + ' ch')
      if (x.peak_db != null) f.push('peak ' + (x.peak_db < 0 ? '−' : '') + Math.abs(x.peak_db).toFixed(1) + ' dBFS')
      f.push(size(x.size))
      var who = share ? share.data.names[x.uploaded_by] : ctx.people[x.uploaded_by] && ctx.people[x.uploaded_by].name
      f.push((who ? who + ', ' : '') + ago(x.created_at))
      $('#facts').innerHTML = f.map(function (t) { return '<span>' + esc(t) + '</span>' }).join('') + '<span>' + esc(x.file_name) + '</span>'
    }
    function paintAppr() {
      var x = curV(), a = $('#appr'), h = ''
      h += '<span class="state">' + (x.approved_at ? '<b>✓ Approved</b> by ' + esc(x.approved_by || '') + ', ' + ago(x.approved_at) : 'v' + x.n + ' is waiting for approval') + '</span>'
      if (canDo('download')) h += '<button class="btn sm" id="dl">' + ic('down') + ' Download</button>'
      if (canDo('approve')) h += x.approved_at ? (share ? '' : '<button class="btn sm" id="ap-un">Undo approval</button>') : '<button class="btn sm main" id="ap">' + ic('check') + ' Approve v' + x.n + '</button>'
      if (edit && !share) h += '<button class="ico sm" id="vm" aria-label="This version">' + ic('dots') + '</button>'
      a.innerHTML = h
      if ($('#dl')) $('#dl').onclick = function () { download(x) }
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

    // the waveform: what has played in red, the notes as pins, click to jump
    var wv = $('#wv'), wave = $('#wave'), hoverX = -1
    function drawWave() {
      var x = curV(), r = wv.getBoundingClientRect(), d = devicePixelRatio || 1
      if (!r.width) return
      if (wv.width !== Math.round(r.width * d)) { wv.width = Math.round(r.width * d); wv.height = Math.round(r.height * d) }
      var g = wv.getContext('2d'), w = wv.width, h = wv.height, dur = x.duration || audio.duration || 0, pos = dur ? (audio.currentTime / dur) * w : 0
      g.clearRect(0, 0, w, h)
      var pk = x.peaks || [], bars = Math.floor(w / (3 * d)), per = pk.length / Math.max(1, bars)
      var amp = matched && x.lufs != null ? Math.min(1.6, Math.max(.4, cur.gain)) : 1
      for (var i = 0; i < bars; i++) {
        var m = 0
        if (pk.length) for (var j = Math.floor(i * per); j < Math.floor((i + 1) * per); j++) m = Math.max(m, pk[j] || 0)
        else m = .04
        var bh = Math.max(2 * d, Math.min(1, m * amp) * h * .86), bx = i * 3 * d
        g.fillStyle = bx < pos ? '#ff3b2f' : hoverX >= 0 && bx < hoverX ? 'rgba(255,255,255,.55)' : 'rgba(214,220,228,.36)'
        g.fillRect(bx, (h - bh) / 2, 2 * d, bh)
      }
      g.fillStyle = '#fff'; g.fillRect(pos - d, 0, 2 * d, h)
    }
    function seekTo(e) { var r = wave.getBoundingClientRect(), x = curV(), dur = x.duration || audio.duration || 0; if (!dur) return; var t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur; if (!cur.url) load(x, false, false).then(function () { audio.currentTime = t }); else audio.currentTime = t; drawWave() }
    wave.addEventListener('pointerdown', function (e) { if (e.target.closest('.pin')) return; seekTo(e) })
    wave.addEventListener('pointermove', function (e) { var r = wave.getBoundingClientRect(); hoverX = (e.clientX - r.left) * (devicePixelRatio || 1); drawWave() })
    wave.addEventListener('pointerleave', function () { hoverX = -1; drawWave() })

    function topNotes() { return tview.notes.filter(function (c) { return c.version_id === tview.version && !c.parent_id }).sort(function (a, b) { return (a.at_sec == null ? 1e9 : a.at_sec) - (b.at_sec == null ? 1e9 : b.at_sec) || new Date(a.created_at) - new Date(b.created_at) }) }
    function paintNotes() {
      var top = topNotes(), x = curV(), dur = x.duration || 0
      var open = top.filter(function (c) { return !c.done }).length
      $('#ncount').textContent = top.length ? open + ' open · ' + top.length + ' in all' : ''
      $('#pins').innerHTML = dur ? top.filter(function (c) { return c.at_sec != null }).map(function (c) { var n = nameOf(c); return '<button class="pin' + (c.done ? ' done' : '') + '" data-c="' + c.id + '" style="left:' + (c.at_sec / dur * 100) + '%;background:hsl(' + hue(n.id) + ',60%,45%)" aria-label="Note at ' + mmss(c.at_sec) + '"><span>' + esc(initials(n.name)[0]) + '</span></button>' }).join('') : ''
      $$('#pins .pin').forEach(function (p) { p.onclick = function (e) { e.stopPropagation(); var c = tview.notes.filter(function (z) { return z.id === p.dataset.c })[0]; jump(c) } })
      var one = function (c, reply) {
        var n = nameOf(c), mine = !share && session && c.author === session.user.id
        var reps = tview.notes.filter(function (z) { return z.parent_id === c.id })
        return '<div class="note' + (c.done ? ' done' : '') + '" data-n="' + c.id + '">' + avatar(n.short || n.name, n.avatar, n.id) + '<div style="min-width:0"><div class="who"><b>' + esc(n.name) + '</b>' + (c.at_sec != null && !reply ? '<button class="at" data-at="' + c.id + '">' + mmss(c.at_sec) + '</button>' : '') + '<span>' + ago(c.created_at) + '</span></div><div class="body">' + esc(c.body) + '</div>' +
          (reply ? '' : '<div class="acts">' + (canDo('commenter') ? '<button class="ico sm" data-rep="' + c.id + '" aria-label="Reply">' + ic('reply') + '</button>' : '') + (!share && (canDo('editor') || mine) ? '<button class="ico sm" data-done="' + c.id + '" aria-label="' + (c.done ? 'Open again' : 'Mark as done') + '" title="' + (c.done ? 'Open again' : 'Done') + '">' + ic('check') + '</button>' : '') + (mine || (!share && ctx.role === 'owner') ? '<button class="ico sm danger" data-del="' + c.id + '" aria-label="Delete note">' + ic('trash') + '</button>' : '') + '</div>') +
          (reps.length ? '<div class="replies">' + reps.map(function (r) { return one(r, true) }).join('') + '</div>' : '') + '</div></div>'
      }
      $('#nlist').innerHTML = top.length ? top.map(function (c) { return one(c) }).join('') : '<p class="muted" style="padding:10px 8px;margin:0;font-size:14px">' + (canDo('commenter') ? 'No notes on this version yet. Play it, pause where something needs work and write below.' : 'No notes on this version yet.') + '</p>'
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
        var at = replyTo ? null : ($('#cmp-at').checked ? Math.round(audio.currentTime * 10) / 10 : null), x = curV()
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
    audio.onplay = audio.onpause = function () { if (document.body.contains(pb)) paintPlay() }
    audio.onended = function () { if (document.body.contains(pb)) paintPlay() }
    audio.onerror = function () { if (audio.src) toast('This file could not be played in the browser. Download it instead.') }

    if (!share && edit) {
      $('#nv').onclick = function () { $('#nvf').click() }
      $('#nvf').onchange = function () { var f = this.files[0]; this.value = ''; if (f) uploadFile(f, { project: ctx.project.id, track: id, onDone: function (nv) { ctx.versions.push(nv); tview.version = nv.id; render() } }) }
      wireDropOn(view, function (files) { if (files[0]) uploadFile(files[0], { project: ctx.project.id, track: id, onDone: function (nv) { ctx.versions.push(nv); tview.version = nv.id; render() } }) })
      $('#tsh').onclick = function () { shareBox(ctx, track) }
      $('#tm').onclick = function () {
        modal('<div class="spread"><h2>' + esc(track.title) + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div><div class="opts"><button class="btn" id="tm-r">' + ic('pen') + ' Rename track</button><button class="btn danger" id="tm-d">' + ic('trash') + ' Delete track</button></div>', function (m) {
          $('#tm-r', m).onclick = function () { prompt1('Rename track', 'Title', track.title, 'Save', function (val) { return sb.from('roarstudio_tracks').update({ title: val }).eq('id', id).then(function () { track.title = val; render() }) }) }
          $('#tm-d', m).onclick = function () { confirmBox('Delete “' + track.title + '”?', 'Every version, file and note of this track is deleted. This cannot be undone.', 'Delete', function () { return api('delete-track', { track: id }).then(function () { audio.pause(); tview = null; go('#p/' + ctx.project.id) }) }) }
        })
      }
      listen(ctx.project.id, function () { if (uploading) return; loadProject(ctx.project.id).then(function () { return loadNotes(id) }).then(function (ns) { var keepV = tview.version; tview.notes = ns; versions = ctx.versions.filter(function (q) { return q.track_id === id }); if (!versions.some(function (q) { return q.id === keepV })) tview.version = versions[versions.length - 1].id; paintVersions(); paintNotes(); paintAppr() }) })
    }

    paintVersions(); paintFacts(); paintNotes(); paintAppr(); paintPlay(); drawWave()
    requestAnimationFrame(tick)
    if (fresh && cur.version && cur.version.track_id === id && versions.some(function (q) { return q.id === cur.version.id })) { tview.version = cur.version.id; paintVersions(); paintFacts(); paintNotes(); paintAppr() }
    else if (pendingPlay) { pendingPlay = false; load(curV(), false, true).catch(function (e) { toast(e.message) }) }
    else load(curV(), false, false).catch(function () {})
  }
  function wireDropOn(el, fn) {
    var over = function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) e.preventDefault() }
    el.addEventListener('dragover', over); el.addEventListener('drop', function (e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); fn(Array.prototype.slice.call(e.dataTransfer.files)) })
  }
  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' || /input|textarea|select|button/i.test((e.target && e.target.tagName) || '')) return
    var pb = $('#pb'); if (pb) { e.preventDefault(); pb.click() }
  })
  window.addEventListener('resize', function () { $$('canvas[data-wave]').forEach(function (cv) { var v = ctx && ctx.versions.filter(function (x) { return x.id === cv.dataset.wave })[0]; drawMini(cv, v && v.peaks) }) })

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
      (owner ? '<form id="inv" style="display:grid;gap:10px"><div class="field"><label for="inv-e">Add someone with a Roar account</label><input class="in" id="inv-e" type="email" placeholder="their@email.com" required></div><div class="row"><select class="in" id="inv-r" style="flex:1;min-width:0"><option value="editor">Can upload and edit</option><option value="commenter" selected>Can listen and comment</option><option value="listener">Can listen</option></select><button class="btn main">Add</button></div><p class="err" id="inv-err" hidden></p><p class="muted" style="margin:0;font-size:13px">No account? Send them a share link instead, or ask them to make a free Roar account.</p></form>' : ''), function (m) {
      draw(m)
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

  function shareBox(c, track) {
    var base = location.origin + location.pathname
    modal('<div class="spread"><h2>Share ' + (track ? '“' + esc(track.title) + '”' : 'the project') + '</h2><button class="ico sm x" data-x aria-label="Close">' + ic('x') + '</button></div>' +
      '<p class="muted" style="margin:0">Anyone with the link can listen in the browser, without an account.</p>' +
      '<div class="opts"><div class="opt"><span>Comments<small>They can leave notes on the waveform</small></span><button type="button" class="sw" id="s-c" aria-pressed="true" aria-label="Comments"></button></div>' +
      '<div class="opt"><span>Approve<small>They can approve a version</small></span><button type="button" class="sw" id="s-a" aria-pressed="false" aria-label="Approve"></button></div>' +
      '<div class="opt"><span>Download<small>They can download the files</small></span><button type="button" class="sw" id="s-d" aria-pressed="false" aria-label="Download"></button></div></div>' +
      '<div class="field"><label>Ends</label><div class="lens-group" id="s-e"><span class="lens"></span><button type="button" class="on" data-d="0">Never</button><button type="button" data-d="1">1 day</button><button type="button" data-d="7">7 days</button><button type="button" data-d="30">30 days</button></div></div>' +
      '<div class="field"><label for="s-p">Password (optional)</label><input class="in" id="s-p" type="text" maxlength="100" autocomplete="off"></div>' +
      '<div id="s-out" hidden style="display:grid;gap:8px"><div class="linkbox"><input id="s-link" readonly><button class="btn sm main" id="s-copy">' + ic('copy') + ' Copy</button></div></div>' +
      '<div class="row end"><button class="btn main" id="s-go">Make the link</button></div><div id="s-old"></div>', function (m) {
      $$('.sw', m).forEach(function (s) { s.onclick = function () { s.setAttribute('aria-pressed', s.getAttribute('aria-pressed') !== 'true') } })
      var eg = $('#s-e', m); setTimeout(function () { lens(eg) }, 30)
      eg.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; $$('button', eg).forEach(function (x) { x.classList.toggle('on', x === b) }); lens(eg) }
      var on = function (id) { return $(id, m).getAttribute('aria-pressed') === 'true' }
      $('#s-go', m).onclick = function () {
        this.disabled = true
        api('share-create', { project: c.project.id, track: track ? track.id : null, comment: on('#s-c'), approve: on('#s-a'), download: on('#s-d'), days: Number($('button.on', eg).dataset.d), password: $('#s-p', m).value }).then(function (d) {
          $('#s-go', m).disabled = false
          if (!d.token) { toast(d.error || 'Could not make the link'); return }
          $('#s-out', m).hidden = false; $('#s-link', m).value = base + '?s=' + d.token; $('#s-link', m).select(); oldLinks()
        })
      }
      $('#s-copy', m).onclick = function () { var t = $('#s-link', m); var p = navigator.clipboard && navigator.clipboard.writeText(t.value); if (p) p.then(function () { toast('Link copied') }, function () { t.select() }); else t.select() }
      function oldLinks() {
        var q = sb.from('roarstudio_shares').select('*').eq('project_id', c.project.id).order('created_at', { ascending: false })
        q.then(function (r) {
          var rows = (r.data || []).filter(function (s) { return track ? s.track_id === track.id : !s.track_id })
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
        ctx = { project: d.project, tracks: d.tracks || [], versions: d.versions || [], comments: d.comments || [], people: {}, peopleList: [], role: 'guest' }
        if (d.tracks && d.tracks.length === 1 && !location.hash) { location.replace('#t/' + d.tracks[0].id); return }
        renderShare()
      })
      return
    }
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
  // the session
  // =====================================================================================================
  var booted = false, needMfa = false
  function refreshSession() { sb.auth.getSession().then(function (r) { onSession(r.data.session) }) }
  function loadMe(s) {
    var md = s.user.user_metadata || {}
    me = { name: md.name || md.full_name || (s.user.email || '').split('@')[0], avatar: md.avatar_url || null }
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
