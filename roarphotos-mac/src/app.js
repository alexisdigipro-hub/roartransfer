// RoarPhotos: the window. Everything it shows comes from the Rust side (lib.rs); nothing goes online.
(function () {
  'use strict'
  var T = window.__TAURI__
  var inv = function (c, a) { return T.core.invoke(c, a || {}) }
  var fileUrl = function (p) { return T.core.convertFileSrc(p) }
  var $ = function (id) { return document.getElementById(id) }
  var nf = function (n) { return Number(n || 0).toLocaleString('el-GR') }

  var LABELS = ['red', 'yellow', 'green', 'blue', 'purple']
  var LABEL_NAME = { red: 'Κόκκινο', yellow: 'Κίτρινο', green: 'Πράσινο', blue: 'Μπλε', purple: 'Μωβ' }
  var MONTHS = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος']
  var VIEW_NAME = { all: 'Όλα', photos: 'Φωτογραφίες', videos: 'Βίντεο', favs: 'Αγαπημένα', hidden: 'Κρυμμένα' }

  var keep = (function () { try { return JSON.parse(localStorage.getItem('rp') || '{}') } catch (e) { return {} } })()
  function save() { try { localStorage.setItem('rp', JSON.stringify(keep)) } catch (e) {} }

  var S = {
    view: 'all', album: null, source: null,
    f: { text: '', min_rating: 0, label: '', camera: '', asc: !!keep.asc },
    items: [], at: new Map(), sel: new Set(), anchor: -1, cur: -1,
    thumbs: '', bump: {}, albums: [], sources: [], counts: {},
    secs: [], tileEl: new Map(), busy: false, vi: -1, info: !!keep.info
  }

  // ---------- small helpers: toast, modal, menu

  var toastT
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.hidden = false
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true }, ms || 2600)
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  function modal(o) {
    return new Promise(function (res) {
      var m = $('modal'), c = $('modal-card')
      c.innerHTML = '<h4>' + esc(o.title) + '</h4>' + (o.text ? '<p>' + esc(o.text) + '</p>' : '') +
        (o.input != null ? '<input id="m-in" spellcheck="false">' : '') +
        '<div class="row"><button class="btn ghost" id="m-no">' + esc(o.no || 'Άκυρο') + '</button>' +
        '<button class="btn" id="m-ok">' + esc(o.ok || 'OK') + '</button></div>'
      m.hidden = false
      var inp = $('m-in')
      if (inp) { inp.value = o.input; setTimeout(function () { inp.focus(); inp.select() }, 30) } else setTimeout(function () { $('m-ok').focus() }, 30)
      function done(v) { m.hidden = true; document.removeEventListener('keydown', key, true); res(v) }
      function key(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null) }
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(inp ? inp.value : true) }
        e.stopPropagation()
      }
      document.addEventListener('keydown', key, true)
      $('m-no').onclick = function () { done(null) }
      $('m-ok').onclick = function () { done(inp ? inp.value : true) }
      m.onclick = function (e) { if (e.target === m) done(null) }
    })
  }

  function menu(x, y, list) {
    var m = $('menu'); m.innerHTML = ''
    list.forEach(function (it) {
      if (it === '-') { m.appendChild(document.createElement('hr')); return }
      var b = document.createElement('button'); b.textContent = it.label
      if (it.danger) b.className = 'danger'
      b.onclick = function () { closeMenu(); it.fn() }
      m.appendChild(b)
    })
    m.hidden = false
    var r = m.getBoundingClientRect()
    m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'
    m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px'
  }
  function closeMenu() { $('menu').hidden = true }
  document.addEventListener('mousedown', function (e) { if (!$('menu').contains(e.target)) closeMenu() })

  // ---------- dates

  function parts(t) { return { y: +t.slice(0, 4), m: +t.slice(5, 7), d: +t.slice(8, 10) } }
  function dayTitle(t) {
    var p = parts(t), dt = new Date(p.y, p.m - 1, p.d), now = new Date()
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    var diff = Math.round((today - dt) / 864e5)
    if (diff === 0) return 'Σήμερα'
    if (diff === 1) return 'Χθες'
    return dt.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'long', year: p.y === now.getFullYear() ? undefined : 'numeric' })
  }
  function longDate(t) {
    var p = parts(t), dt = new Date(p.y, p.m - 1, p.d, +t.slice(11, 13), +t.slice(14, 16))
    return dt.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + t.slice(11, 16)
  }
  function dur(s) {
    if (s == null) return ''
    s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0')
  }
  function size(b) {
    if (b > 1e9) return (b / 1e9).toFixed(2) + ' GB'
    if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB'
    return Math.round(b / 1e3) + ' KB'
  }

  // ---------- loading

  function thumbUrl(id) { return fileUrl(S.thumbs + '/' + id + '.jpg') + (S.bump[id] ? '?v=' + S.bump[id] : '') }

  async function load(keepScroll) {
    var f = {
      view: S.view, album: S.album, source: S.source, text: S.f.text,
      min_rating: S.f.min_rating || null, label: S.f.label || null, camera: S.f.camera || null, asc: S.f.asc
    }
    var top = $('scroll').scrollTop
    S.items = await inv('query', { filter: f })
    S.at = new Map(); S.items.forEach(function (it, i) { S.at.set(it.id, i) })
    // keep what is still there selected
    var still = new Set(); S.sel.forEach(function (id) { if (S.at.has(id)) still.add(id) }); S.sel = still
    render()
    $('scroll').scrollTop = keepScroll ? top : 0
    paintSel()
  }

  async function side() {
    var r = await Promise.all([inv('counts'), inv('albums'), inv('sources'), inv('cameras')])
    S.counts = r[0]; S.albums = r[1]; S.sources = r[2]
    ;['all', 'photos', 'videos', 'favs', 'hidden'].forEach(function (k) { $('n-' + k).textContent = S.counts[k] ? nf(S.counts[k]) : '' })
    var al = $('albums'); al.innerHTML = ''
    if (!S.albums.length) al.innerHTML = '<div class="hint">Κανένα ακόμα</div>'
    S.albums.forEach(function (a) {
      var b = document.createElement('div'); b.className = 'row' + (S.view === 'album' && S.album === a.id ? ' on' : '')
      b.innerHTML = '<span class="cov"' + (a.cover ? ' style="background-image:url(\'' + thumbUrl(a.cover) + '\')"' : '') + '></span><span class="nm">' + esc(a.name) + '</span><span class="n">' + (a.count ? nf(a.count) : '') + '</span>'
      b.onclick = function () { go('album', a.id) }
      b.oncontextmenu = function (e) {
        e.preventDefault()
        menu(e.clientX, e.clientY, [
          { label: 'Μετονομασία…', fn: async function () { var n = await modal({ title: 'Μετονομασία άλμπουμ', input: a.name, ok: 'Αποθήκευση' }); if (n) { await inv('album_rename', { id: a.id, name: n }); side(); if (S.album === a.id) title() } } },
          { label: 'Διαγραφή άλμπουμ', danger: true, fn: async function () { if (await modal({ title: 'Διαγραφή «' + a.name + '»;', text: 'Σβήνεται μόνο το άλμπουμ. Οι φωτογραφίες μένουν όπως είναι.', ok: 'Διαγραφή' })) { await inv('album_delete', { id: a.id }); if (S.album === a.id) go('all'); else side() } } }
        ])
      }
      al.appendChild(b)
    })
    var so = $('sources'); so.innerHTML = ''
    if (!S.sources.length) so.innerHTML = '<div class="hint">Πρόσθεσε έναν φάκελο</div>'
    S.sources.forEach(function (s) {
      var nm = s.path.split('/').filter(Boolean).pop() || s.path
      var b = document.createElement('div'); b.className = 'row' + (s.online ? '' : ' off') + (S.view === 'source' && S.source === s.id ? ' on' : '')
      b.title = s.path + (s.online ? '' : '\nΔεν είναι συνδεδεμένος τώρα')
      b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span class="nm">' + esc(nm) + '</span><span class="n">' + (s.count ? nf(s.count) : '') + '</span>'
      b.onclick = function () { go('source', s.id) }
      b.oncontextmenu = function (e) {
        e.preventDefault()
        menu(e.clientX, e.clientY, [
          { label: 'Άνοιγμα στο Finder', fn: function () { inv('open_folder', { path: s.path }) } },
          { label: 'Σάρωση ξανά', fn: function () { inv('rescan') } },
          '-',
          { label: 'Αφαίρεση από τη βιβλιοθήκη', danger: true, fn: async function () { if (await modal({ title: 'Αφαίρεση «' + nm + '»;', text: 'Τα αρχεία μένουν στον δίσκο, δεν σβήνεται τίποτα. Χάνονται μόνο τα αστέρια, τα χρώματα και τα άλμπουμ τους εδώ.', ok: 'Αφαίρεση' })) { await inv('remove_source', { id: s.id }); if (S.source === s.id) go('all'); else { side(); load(true) } } } }
        ])
      }
      so.appendChild(b)
    })
    var cam = $('f-cam'), was = cam.value
    cam.innerHTML = '<option value="">Όλες οι κάμερες</option>' + r[3].map(function (c) { return '<option>' + esc(c) + '</option>' }).join('')
    cam.value = r[3].indexOf(was) >= 0 ? was : ''
    document.querySelectorAll('.nav [data-view]').forEach(function (b) { b.classList.toggle('on', b.dataset.view === S.view) })
  }

  function title() {
    var t = VIEW_NAME[S.view] || ''
    if (S.view === 'album') { var a = S.albums.find(function (x) { return x.id === S.album }); t = a ? a.name : 'Άλμπουμ' }
    if (S.view === 'source') { var s = S.sources.find(function (x) { return x.id === S.source }); t = s ? s.path.split('/').filter(Boolean).pop() : 'Φάκελος' }
    $('title').textContent = t
    var p = 0, v = 0; S.items.forEach(function (it) { if (it.k === 'v') v++; else p++ })
    var bits = [nf(S.items.length) + (S.items.length === 1 ? ' στοιχείο' : ' στοιχεία')]
    if (p && v) bits.push(nf(p) + ' φωτ.', nf(v) + ' βίντεο')
    $('subtitle').textContent = S.items.length ? bits.join(' · ') : ''
    $('sel-unalbum').hidden = S.view !== 'album'
    $('sel-hide').textContent = S.view === 'hidden' ? 'Επαναφορά' : 'Απόκρυψη'
  }

  function go(view, id) {
    S.view = view; S.album = view === 'album' ? id : null; S.source = view === 'source' ? id : null
    S.sel.clear(); S.cur = -1; S.anchor = -1
    side(); load().then(title)
  }

  // ---------- the grid: one section per day, tiles made when a section comes near the screen

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { fill(e.target); io.unobserve(e.target) } })
  }, { root: $('scroll'), rootMargin: '1600px 0px' })

  function geom() {
    var w = $('grid').clientWidth || 800, tile = keep.tile || 170, gap = 3
    var cols = Math.max(1, Math.floor((w + gap) / (tile + gap)))
    var side = (w - gap * (cols - 1)) / cols
    return { cols: cols, side: side, gap: gap }
  }

  function render() {
    var g = $('grid'); g.innerHTML = ''; io.disconnect(); S.tileEl.clear(); S.secs = []
    var items = S.items, ym = '', y = ''
    var years = []
    $('empty').hidden = !!items.length
    if (!items.length) { empty(); $('years').innerHTML = ''; title(); return }
    var G = geom()
    var frag = document.createDocumentFragment()
    for (var i = 0; i < items.length;) {
      var day = items[i].t.slice(0, 10), j = i
      while (j < items.length && items[j].t.slice(0, 10) === day) j++
      var m = day.slice(0, 7)
      if (m !== ym) {
        ym = m
        var h = document.createElement('h2'); h.className = 'month'; h.dataset.ym = m
        h.textContent = MONTHS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4)
        frag.appendChild(h)
        if (m.slice(0, 4) !== y) { y = m.slice(0, 4); years.push({ y: y, el: h }) }
      }
      var sec = document.createElement('div'); sec.className = 'sec'; sec._a = i; sec._b = j
      var n = j - i
      sec.innerHTML = '<div class="day">' + esc(dayTitle(items[i].t)) + '<small>' + nf(n) + '</small><button class="pick">Επιλογή όλων</button></div>'
      var tiles = document.createElement('div'); tiles.className = 'tiles'
      var rows = Math.ceil(n / G.cols)
      tiles.style.height = (rows * G.side + (rows - 1) * G.gap) + 'px'
      sec.appendChild(tiles)
      frag.appendChild(sec); S.secs.push(sec)
      io.observe(sec)
      i = j
    }
    g.appendChild(frag)
    var yb = $('years'); yb.innerHTML = ''
    if (years.length > 1) years.forEach(function (o) {
      var b = document.createElement('button'); b.textContent = o.y
      b.onclick = function () { $('scroll').scrollTop = o.el.offsetTop - 8 }
      yb.appendChild(b)
    })
    title()
  }

  function fill(sec) {
    if (sec._done) return
    sec._done = true
    var tiles = sec.querySelector('.tiles'); tiles.style.height = ''
    var frag = document.createDocumentFragment()
    for (var i = sec._a; i < sec._b; i++) frag.appendChild(tile(S.items[i]))
    tiles.appendChild(frag)
  }

  function tile(it) {
    var d = document.createElement('div'); d.className = 't'; d.dataset.id = it.id
    S.tileEl.set(it.id, d)
    paintTile(d, it, true)
    return d
  }

  function paintTile(d, it, first) {
    if (first || !d.querySelector('img')) {
      d.innerHTML = ''
      d.classList.toggle('wait', it.th === 0)
      d.classList.toggle('bad', it.th === 2)
      d.dataset.ext = it.e
      if (it.th === 1) {
        var img = new Image(); img.decoding = 'async'; img.draggable = false
        img.onload = function () { img.classList.add('in') }
        img.src = thumbUrl(it.id)
        d.appendChild(img)
      }
      var ck = document.createElement('span'); ck.className = 'ck'; d.appendChild(ck)
    }
    var old = d.querySelectorAll('.dur,.badges,.hrt'); old.forEach(function (x) { x.remove() })
    if (it.k === 'v') { var du = document.createElement('span'); du.className = 'dur'; du.textContent = dur(it.d); d.appendChild(du) }
    if (it.r || it.l) {
      var b = document.createElement('span'); b.className = 'badges'
      b.innerHTML = (it.l ? '<i class="lb l-' + it.l + '"></i>' : '') + (it.r ? '★'.repeat(it.r) : '')
      d.appendChild(b)
    }
    if (it.f) d.insertAdjacentHTML('beforeend', '<svg class="hrt" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>')
    d.classList.toggle('sel', S.sel.has(it.id))
    d.classList.toggle('cur', S.items[S.cur] === it)
  }

  function repaint(ids) {
    ids.forEach(function (id) {
      var i = S.at.get(id), d = S.tileEl.get(id)
      if (i != null && d) paintTile(d, S.items[i], false)
    })
  }

  function empty() {
    var e = $('empty')
    if (!S.sources.length) {
      e.innerHTML = '<h2>Οι φωτογραφίες σου, στο Mac σου</h2><p>Διάλεξε έναν φάκελο ή έναν εξωτερικό δίσκο με φωτογραφίες και βίντεο. Το RoarPhotos τα διαβάζει από εκεί που είναι: δεν τα αντιγράφει, δεν τα μετακινεί και δεν τα ανεβάζει πουθενά.</p><button class="btn" id="e-add">Προσθήκη φακέλου</button><p style="margin:16px 0 0;font-size:12px">ή σύρε έναν φάκελο εδώ</p>'
      $('e-add').onclick = addFolder
    } else if (S.busy && S.view === 'all') {
      e.innerHTML = '<h2>Διαβάζω τους φακέλους σου…</h2><p>Οι φωτογραφίες εμφανίζονται μόλις βρεθούν.</p>'
    } else {
      var any = S.f.text || S.f.min_rating || S.f.label || S.f.camera
      e.innerHTML = '<h2>' + (any ? 'Τίποτα με αυτά τα φίλτρα' : 'Άδειο εδώ') + '</h2><p>' +
        (any ? 'Δοκίμασε λιγότερα φίλτρα ή άλλη αναζήτηση.' : S.view === 'album' ? 'Διάλεξε φωτογραφίες στη βιβλιοθήκη και πάτα «Σε άλμπουμ».' : S.view === 'favs' ? 'Πάτα F ή την καρδιά σε μια φωτογραφία.' : '') + '</p>' +
        (any ? '<button class="btn ghost" id="e-clear">Καθάρισμα φίλτρων</button>' : '')
      if (any) $('e-clear').onclick = clearFilters
    }
  }

  var reflowT
  addEventListener('resize', function () { clearTimeout(reflowT); reflowT = setTimeout(reflow, 120) })
  function reflow() {
    var G = geom()
    S.secs.forEach(function (sec) {
      if (sec._done) return
      var rows = Math.ceil((sec._b - sec._a) / G.cols)
      sec.querySelector('.tiles').style.height = (rows * G.side + (rows - 1) * G.gap) + 'px'
    })
  }

  // years on the right follow the scroll
  $('scroll').addEventListener('scroll', function () {
    var yb = $('years').children; if (!yb.length) return
    var top = $('scroll').scrollTop + 40, cur = null
    document.querySelectorAll('#grid .month').forEach(function (h) { if (h.offsetTop <= top) cur = h.dataset.ym.slice(0, 4) })
    for (var i = 0; i < yb.length; i++) yb[i].classList.toggle('on', yb[i].textContent === (cur || yb[0].textContent))
  }, { passive: true })

  // ---------- selection

  function paintSel() {
    S.tileEl.forEach(function (d, id) { d.classList.toggle('sel', S.sel.has(id)); d.classList.toggle('cur', S.items[S.cur] && S.items[S.cur].id === id) })
    var n = S.sel.size
    $('selbar').hidden = !n
    if (!n) return
    $('sel-n').textContent = n === 1 ? '1 επιλεγμένο' : nf(n) + ' επιλεγμένα'
    var its = Array.from(S.sel).map(function (id) { return S.items[S.at.get(id)] })
    var r = its.every(function (x) { return x.r === its[0].r }) ? its[0].r : 0
    var l = its.every(function (x) { return x.l === its[0].l }) ? its[0].l : ''
    stars($('sel-stars'), r, function (v) { rate(target(), v) })
    labels($('sel-labels'), l, function (v) { label(target(), v) })
    $('sel-fav').classList.toggle('on', its.every(function (x) { return x.f }))
    $('sel-compare').hidden = n < 2 || n > 4
  }

  function target() {
    if (S.sel.size) return Array.from(S.sel)
    if (S.cur >= 0 && S.items[S.cur]) return [S.items[S.cur].id]
    return []
  }

  function select(i, how) {
    var id = S.items[i].id
    if (how === 'toggle') { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); S.anchor = i }
    else if (how === 'range' && S.anchor >= 0) {
      var a = Math.min(S.anchor, i), b = Math.max(S.anchor, i)
      for (var k = a; k <= b; k++) S.sel.add(S.items[k].id)
    } else { S.sel.clear(); S.sel.add(id); S.anchor = i }
    S.cur = i
    paintSel()
  }

  $('grid').addEventListener('click', function (e) {
    var pick = e.target.closest('.pick')
    if (pick) {
      var sec = pick.closest('.sec'), all = true
      for (var k = sec._a; k < sec._b; k++) if (!S.sel.has(S.items[k].id)) all = false
      for (k = sec._a; k < sec._b; k++) { if (all) S.sel.delete(S.items[k].id); else S.sel.add(S.items[k].id) }
      paintSel(); return
    }
    var t = e.target.closest('.t'); if (!t) return
    var i = S.at.get(+t.dataset.id)
    if (e.shiftKey) select(i, 'range')
    else if (e.metaKey || e.target.classList.contains('ck') || S.sel.size) select(i, 'toggle')
    else { S.cur = i; openViewer(i) }
  })
  $('grid').addEventListener('contextmenu', function (e) {
    var t = e.target.closest('.t'); if (!t) return
    e.preventDefault()
    var id = +t.dataset.id, i = S.at.get(id)
    if (!S.sel.has(id)) select(i)
    itemMenu(e.clientX, e.clientY)
  })

  function itemMenu(x, y) {
    var ids = target(), one = ids.length === 1 ? ids[0] : null
    var list = []
    if (one) list.push({ label: 'Άνοιγμα', fn: function () { openViewer(S.at.get(one)) } },
      { label: 'Εμφάνιση στο Finder', fn: function () { inv('reveal', { id: one }) } },
      { label: 'Άνοιγμα με την προεπιλεγμένη εφαρμογή', fn: function () { inv('open_file', { id: one }) } }, '-')
    list.push({ label: 'Σε άλμπουμ…', fn: function () { albumMenu(x, y) } })
    if (S.view === 'album') list.push({ label: 'Βγάλε από το άλμπουμ', fn: unalbum })
    if (ids.length >= 2 && ids.length <= 4) list.push({ label: 'Σύγκριση', fn: compare })
    list.push({ label: 'Εξαγωγή αντιγράφων…', fn: exportSel }, '-',
      { label: S.view === 'hidden' ? 'Επαναφορά' : 'Απόκρυψη', fn: hide },
      { label: 'Μεταφορά στον Κάδο', danger: true, fn: trash })
    menu(x, y, list)
  }

  // ---------- actions

  function patch(ids, fn) {
    ids.forEach(function (id) { var i = S.at.get(id); if (i != null) fn(S.items[i]) })
    repaint(ids); paintSel()
  }
  async function rate(ids, v) {
    if (!ids.length) return
    await inv('set_rating', { ids: ids, value: v })
    patch(ids, function (it) { it.r = v })
    if (S.f.min_rating) load(true)
    viewerSync()
  }
  async function label(ids, v) {
    if (!ids.length) return
    var all = ids.every(function (id) { return S.items[S.at.get(id)].l === v })
    if (all) v = ''
    await inv('set_label', { ids: ids, value: v })
    patch(ids, function (it) { it.l = v })
    if (S.f.label) load(true)
    viewerSync()
  }
  async function fav(ids) {
    if (!ids.length) return
    var v = !ids.every(function (id) { return S.items[S.at.get(id)].f })
    await inv('set_fav', { ids: ids, value: v })
    patch(ids, function (it) { it.f = v })
    side()
    if (S.view === 'favs' && !v) load(true)
    viewerSync()
  }
  async function hide() {
    var ids = target(); if (!ids.length) return
    var v = S.view !== 'hidden'
    await inv('set_hidden', { ids: ids, value: v })
    toast(v ? (ids.length === 1 ? 'Κρύφτηκε. Θα το βρεις στα Κρυμμένα.' : nf(ids.length) + ' κρύφτηκαν. Θα τα βρεις στα Κρυμμένα.') : 'Επανήλθαν στη βιβλιοθήκη.')
    S.sel.clear(); side(); load(true)
  }
  async function trash() {
    var ids = target(); if (!ids.length) return
    var ok = await modal({
      title: ids.length === 1 ? 'Στον Κάδο;' : nf(ids.length) + ' αρχεία στον Κάδο;',
      text: 'Τα αρχεία πάνε στον Κάδο του Mac, από εκεί τα επαναφέρεις αν το μετανιώσεις.', ok: 'Στον Κάδο'
    })
    if (!ok) return
    var n = await inv('move_to_trash', { ids: ids })
    toast(n === ids.length ? 'Μεταφέρθηκαν στον Κάδο.' : nf(n) + ' από ' + nf(ids.length) + ' πήγαν στον Κάδο. Τα υπόλοιπα δεν σβήνονται (δίσκος μόνο για ανάγνωση;).')
    S.sel.clear(); side(); await load(true)
    if (!$('viewer').hidden) { if (!S.items.length) closeViewer(); else { S.vi = Math.min(S.vi, S.items.length - 1); drawViewer() } }
  }
  async function exportSel() {
    var ids = target(); if (!ids.length) return
    toast('Διάλεξε τον φάκελο όπου θα πάνε τα αντίγραφα')
    var r = await inv('export', { ids: ids })
    if (r) toast(nf(r.copied) + ' αντίγραφα στο ' + r.dest.split('/').pop(), 3600)
  }
  function albumMenu(x, y) {
    var ids = target(); if (!ids.length) return
    var list = S.albums.map(function (a) {
      return { label: a.name, fn: async function () { await inv('album_add', { id: a.id, ids: ids }); toast('Μπήκαν στο «' + a.name + '»'); side() } }
    })
    if (list.length) list.push('-')
    list.push({ label: 'Νέο άλμπουμ…', fn: async function () {
      var n = await modal({ title: 'Νέο άλμπουμ', text: nf(ids.length) + (ids.length === 1 ? ' στοιχείο θα μπει μέσα.' : ' στοιχεία θα μπουν μέσα.'), input: '', ok: 'Δημιουργία' })
      if (n == null) return
      await inv('album_create', { name: n, ids: ids }); toast('Το άλμπουμ φτιάχτηκε'); side()
    } })
    menu(x, y, list)
  }
  async function unalbum() {
    var ids = target(); if (!ids.length || S.view !== 'album') return
    await inv('album_remove', { id: S.album, ids: ids })
    S.sel.clear(); side(); load(true)
  }

  $('sel-fav').onclick = function () { fav(target()) }
  $('sel-album').onclick = function (e) { var r = e.target.getBoundingClientRect(); albumMenu(r.left, r.top - 8 - Math.min(300, (S.albums.length + 2) * 32)) }
  $('sel-unalbum').onclick = unalbum
  $('sel-compare').onclick = compare
  $('sel-export').onclick = exportSel
  $('sel-hide').onclick = hide
  $('sel-trash').onclick = trash
  $('sel-clear').onclick = function () { S.sel.clear(); paintSel() }

  function stars(el, v, fn) {
    el.innerHTML = ''
    for (var i = 1; i <= 5; i++) (function (i) {
      var b = document.createElement('button'); b.textContent = '★'; b.title = i + (i === 1 ? ' αστέρι' : ' αστέρια') + ' (' + i + ')'
      if (i <= v) b.className = 'on'
      b.onclick = function (e) { e.stopPropagation(); fn(i === v ? 0 : i) }
      el.appendChild(b)
    })(i)
  }
  function labels(el, v, fn) {
    el.innerHTML = ''
    LABELS.forEach(function (l, i) {
      var b = document.createElement('button'); b.className = 'l-' + l + (l === v ? ' on' : ''); b.title = LABEL_NAME[l] + (i < 4 ? ' (' + (i + 6) + ')' : '')
      b.onclick = function (e) { e.stopPropagation(); fn(l) }
      el.appendChild(b)
    })
  }

  // ---------- filters

  function paintFilters() {
    stars($('f-stars'), S.f.min_rating, function (v) { S.f.min_rating = v; paintFilters(); load() })
    labels($('f-label'), S.f.label, function (l) { S.f.label = S.f.label === l ? '' : l; paintFilters(); load() })
    $('sort').classList.toggle('asc', S.f.asc)
    $('sort').title = S.f.asc ? 'Παλαιότερα πρώτα' : 'Νεότερα πρώτα'
  }
  function clearFilters() {
    S.f.text = ''; S.f.min_rating = 0; S.f.label = ''; S.f.camera = ''
    $('q').value = ''; $('f-cam').value = ''; paintFilters(); load()
  }
  var qT
  $('q').addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { S.f.text = $('q').value; load() }, 220) })
  $('f-cam').onchange = function () { S.f.camera = $('f-cam').value; load() }
  $('sort').onclick = function () { S.f.asc = !S.f.asc; keep.asc = S.f.asc; save(); paintFilters(); load() }
  $('zoom').value = keep.tile || 170
  document.documentElement.style.setProperty('--tile', (keep.tile || 170) + 'px')
  $('zoom').oninput = function () {
    keep.tile = +$('zoom').value; save()
    document.documentElement.style.setProperty('--tile', keep.tile + 'px'); reflow()
  }

  // ---------- sidebar

  document.querySelectorAll('.nav [data-view]').forEach(function (b) { b.onclick = function () { go(b.dataset.view) } })
  async function addFolder() {
    var p = await inv('pick_folder'); if (!p) return
    try { await inv('add_source', { path: p }); toast('Διαβάζω τον φάκελο…'); side(); load() } catch (err) { toast(String(err), 4000) }
  }
  $('src-add').onclick = addFolder
  $('album-new').onclick = async function () {
    var ids = Array.from(S.sel)
    var n = await modal({ title: 'Νέο άλμπουμ', text: ids.length ? nf(ids.length) + ' επιλεγμένα θα μπουν μέσα.' : 'Μετά διάλεξε φωτογραφίες και πάτα «Σε άλμπουμ».', input: '', ok: 'Δημιουργία' })
    if (n == null) return
    var id = await inv('album_create', { name: n, ids: ids }); go('album', id)
  }

  // folders dropped on the window join the library
  T.event.listen('tauri://drag-enter', function () { if (!document.querySelector('.drop-hint')) document.body.insertAdjacentHTML('beforeend', '<div class="drop-hint">Άφησε τον φάκελο για να μπει στη βιβλιοθήκη</div>') })
  T.event.listen('tauri://drag-leave', function () { var d = document.querySelector('.drop-hint'); if (d) d.remove() })
  T.event.listen('tauri://drag-drop', async function (e) {
    var d = document.querySelector('.drop-hint'); if (d) d.remove()
    var paths = (e.payload && e.payload.paths) || [], added = 0, err = ''
    for (var i = 0; i < paths.length; i++) { try { await inv('add_source', { path: paths[i] }); added++ } catch (x) { err = String(x) } }
    if (added) { toast(added === 1 ? 'Ο φάκελος μπήκε στη βιβλιοθήκη' : added + ' φάκελοι μπήκαν στη βιβλιοθήκη'); side() }
    else if (err) toast(err.indexOf('δεν βρέθηκε') >= 0 ? 'Σύρε φακέλους, όχι μεμονωμένα αρχεία' : err, 4000)
  })

  // ---------- background job: scan and thumbnails

  var lastLoad = 0
  T.event.listen('job', function (e) {
    var p = e.payload, j = $('job')
    if (p.phase === 'scan') {
      S.busy = true; j.hidden = false
      $('job-t').textContent = 'Σάρωση «' + p.source + '» · ' + nf(p.done) + ' / ' + nf(p.total)
      $('job-bar').style.width = (p.total ? p.done / p.total * 100 : 0) + '%'
      // while a first big folder is read, show what is found every few seconds (only at the top, so nothing jumps)
      if (Date.now() - lastLoad > 5000 && $('scroll').scrollTop < 40 && $('viewer').hidden) { lastLoad = Date.now(); load(); side() }
    } else if (p.phase === 'done') {
      S.busy = false; j.hidden = true; side(); if (!S.items.length) load()
    } else if (p.phase === 'error') {
      toast('Κάτι δεν πήγε καλά στη σάρωση: ' + p.error, 5000)
    }
  })
  T.event.listen('changed', function () { if ($('viewer').hidden) { lastLoad = Date.now(); side(); load(true) } })
  T.event.listen('thumbs', function (e) {
    var p = e.payload, j = $('job')
    S.busy = p.done < p.total
    j.hidden = !S.busy
    $('job-t').textContent = 'Μικρογραφίες · ' + nf(p.done) + ' / ' + nf(p.total)
    $('job-bar').style.width = (p.done / p.total * 100) + '%'
    p.ids.forEach(function (x) {
      var i = S.at.get(x[0]); if (i == null) return
      S.items[i].th = x[1] ? 1 : 2; S.bump[x[0]] = Date.now()
      var d = S.tileEl.get(x[0]); if (d) paintTile(d, S.items[i], true)
    })
    if (!S.busy) side()
  })

  // ---------- the big view

  var idleT
  function openViewer(i) {
    S.vi = i; $('viewer').hidden = false
    $('viewer').classList.toggle('with-info', S.info); $('info').hidden = !S.info
    drawViewer(); wake()
  }
  function closeViewer() {
    var v = $('viewer'); v.hidden = true
    var vid = v.querySelector('video'); if (vid) vid.pause()
    $('stage').innerHTML = ''
    var it = S.items[S.vi]
    if (it) { S.cur = S.vi; paintSel(); var d = S.tileEl.get(it.id); if (d) d.scrollIntoView({ block: 'nearest' }) }
  }
  function wake() {
    var v = $('viewer'); v.classList.remove('idle'); clearTimeout(idleT)
    idleT = setTimeout(function () { if (!v.querySelector('.info:hover')) v.classList.add('idle') }, 2600)
  }
  $('viewer').addEventListener('mousemove', wake)

  var drawN = 0
  async function drawViewer() {
    var it = S.items[S.vi]; if (!it) return closeViewer()
    var n = ++drawN, st = $('stage')
    st.classList.remove('zoom'); st.innerHTML = ''
    $('v-prev').hidden = S.vi <= 0; $('v-next').hidden = S.vi >= S.items.length - 1
    viewerSync()
    var path = await inv('preview', { id: it.id }).catch(function () { return null })
    if (n !== drawN) return
    if (it.k === 'v') {
      var v = document.createElement('video'); v.controls = true; v.autoplay = true; v.playsInline = true
      v.src = fileUrl(path)
      v.onerror = function () { st.innerHTML = '<div class="msg">Αυτό το βίντεο δεν παίζει εδώ.<br><br><button class="btn ghost" id="v-ext">Άνοιγμα στο QuickTime</button></div>'; $('v-ext').onclick = function () { inv('open_file', { id: it.id }) } }
      st.appendChild(v)
    } else {
      if (it.th === 1) { var low = new Image(); low.className = 'low'; low.src = thumbUrl(it.id); st.appendChild(low) }
      var img = new Image(); img.draggable = false
      img.onload = function () { if (low) low.remove() }
      img.onerror = function () { if (low) { low.style.filter = 'none'; low.style.opacity = 1 } else st.innerHTML = '<div class="msg">Δεν μπορώ να δείξω αυτό το αρχείο.</div>' }
      img.src = fileUrl(path)
      img.onclick = function (e) { zoomAt(img, e) }
      st.appendChild(img)
      // the next one starts loading now, so the arrow feels instant
      var nx = S.items[S.vi + 1]
      if (nx && nx.k === 'p') inv('preview', { id: nx.id }).then(function (p) { new Image().src = fileUrl(p) }).catch(function () {})
    }
  }
  function zoomAt(img, e) {
    var st = $('stage')
    if (st.classList.contains('zoom')) { st.classList.remove('zoom'); return }
    var r = img.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
    st.classList.add('zoom')
    st.scrollLeft = fx * img.naturalWidth - st.clientWidth / 2
    st.scrollTop = fy * img.naturalHeight - st.clientHeight / 2
  }
  // drag to move around a zoomed picture
  ;(function () {
    var st = $('stage'), down = null, moved = false
    st.addEventListener('mousedown', function (e) { if (st.classList.contains('zoom')) { down = { x: e.clientX, y: e.clientY, l: st.scrollLeft, t: st.scrollTop }; moved = false } })
    addEventListener('mousemove', function (e) { if (!down) return; var dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; st.scrollLeft = down.l - dx; st.scrollTop = down.t - dy })
    addEventListener('mouseup', function () { down = null })
    st.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); moved = false } }, true)
  })()

  async function viewerSync() {
    if ($('viewer').hidden) return
    var it = S.items[S.vi]; if (!it) return
    stars($('v-stars'), it.r, function (v) { rate([it.id], v) })
    labels($('v-labels'), it.l, function (l) { label([it.id], l) })
    $('v-fav').classList.toggle('on', it.f)
    var m = await inv('item', { id: it.id }).catch(function () { return null })
    if (!m || S.items[S.vi] !== it) return
    $('v-name').innerHTML = esc(m.name) + '<small>' + nf(S.vi + 1) + ' / ' + nf(S.items.length) + '</small>'
    if (S.info) drawInfo(m)
  }
  function drawInfo(m) {
    var exp = [m.fnum ? 'f/' + (Math.round(m.fnum * 10) / 10) : '', m.exposure || '', m.iso ? 'ISO ' + m.iso : '', m.focal ? Math.round(m.focal) + 'mm' : ''].filter(Boolean)
    var al = m.albums.map(function (id) { var a = S.albums.find(function (x) { return x.id === id }); return a ? '<span>' + esc(a.name) + '</span>' : '' }).join('')
    var rows = [
      ['Κάμερα', m.camera], ['Φακός', m.lens],
      ['Διάσταση', m.width && m.height ? m.width + ' × ' + m.height + (m.kind === 'photo' ? ' · ' + (m.width * m.height / 1e6).toFixed(1) + ' MP' : '') : ''],
      ['Διάρκεια', m.duration ? dur(m.duration) : ''],
      ['Μέγεθος', size(m.size) + ' · ' + m.ext.toUpperCase()],
      ['Φάκελος', m.folder],
      ['Τοποθεσία', m.lat != null ? '<a id="i-map">' + m.lat.toFixed(5) + ', ' + m.lon.toFixed(5) + '</a>' : ''],
      ['Άλμπουμ', al ? '<div class="albs">' + al + '</div>' : '']
    ].filter(function (r) { return r[1] })
    $('info').innerHTML = '<h3>' + esc(m.name) + '</h3><div class="when">' + esc(longDate(m.taken)) + '</div>' +
      (exp.length ? '<div class="exp">' + exp.map(function (x) { return '<span>' + esc(x) + '</span>' }).join('') + '</div>' : '') +
      '<dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + (r[0] === 'Τοποθεσία' || r[0] === 'Άλμπουμ' ? r[1] : esc(r[1])) + '</dd>' }).join('') + '</dl>' +
      '<div class="acts"><button id="i-finder">Στο Finder</button><button id="i-open">Άνοιγμα με…</button><button id="i-album">Σε άλμπουμ</button><button id="i-hide">' + (m.hidden ? 'Επαναφορά' : 'Απόκρυψη') + '</button><button id="i-trash">Κάδος</button></div>'
    $('i-finder').onclick = function () { inv('reveal', { id: m.id }) }
    $('i-open').onclick = function () { inv('open_file', { id: m.id }) }
    $('i-album').onclick = function (e) { S.sel = new Set([m.id]); albumMenu(e.clientX - 160, e.clientY + 14) }
    $('i-hide').onclick = async function () { S.sel = new Set([m.id]); await hide(); if (!S.items.length) closeViewer(); else { S.vi = Math.min(S.vi, S.items.length - 1); drawViewer() } }
    $('i-trash').onclick = function () { S.sel = new Set([m.id]); trash() }
    var mp = $('i-map'); if (mp) mp.onclick = function () { inv('open_folder', { path: 'https://maps.apple.com/?ll=' + m.lat + ',' + m.lon + '&q=' + encodeURIComponent(m.name) }) }
  }
  function step(d) { var i = S.vi + d; if (i < 0 || i >= S.items.length) return; S.vi = i; drawViewer() }
  $('v-prev').onclick = function () { step(-1) }
  $('v-next').onclick = function () { step(1) }
  $('v-close').onclick = closeViewer
  $('v-fav').onclick = function () { fav([S.items[S.vi].id]) }
  $('v-info').onclick = toggleInfo
  function toggleInfo() {
    S.info = !S.info; keep.info = S.info; save()
    $('viewer').classList.toggle('with-info', S.info); $('info').hidden = !S.info
    viewerSync()
  }

  // ---------- compare: up to four side by side, click for 100% at the same spot in all of them

  var cmp = { ids: [], zoom: false }
  async function compare() {
    var ids = target().slice(0, 4); if (ids.length < 2) return
    cmp.ids = ids; cmp.zoom = false
    var g = $('c-grid'); g.innerHTML = ''
    g.style.gridTemplateColumns = ids.length === 2 ? '1fr 1fr' : ids.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr'
    g.style.gridTemplateRows = ids.length === 4 ? '1fr 1fr' : '1fr'
    $('compare').hidden = false
    for (var k = 0; k < ids.length; k++) {
      var id = ids[k], it = S.items[S.at.get(id)]
      var cell = document.createElement('div'); cell.className = 'c-cell'; cell.dataset.id = id
      var img = new Image(); img.draggable = false
      img.src = it.k === 'v' ? thumbUrl(id) : fileUrl(await inv('preview', { id: id }))
      cell.appendChild(img)
      var cap = document.createElement('div'); cap.className = 'cap'
      cap.innerHTML = '<span class="nm"></span><div class="stars"></div><div class="labels"></div>'
      cell.appendChild(cap)
      g.appendChild(cell)
      paintCap(cell, it)
      inv('item', { id: id }).then((function (cell) { return function (m) { cell.querySelector('.nm').textContent = m.name } })(cell))
    }
  }
  function paintCap(cell, it) {
    stars(cell.querySelector('.stars'), it.r, function (v) { rate([it.id], v).then(function () { paintCap(cell, it) }) })
    labels(cell.querySelector('.labels'), it.l, function (l) { label([it.id], l).then(function () { paintCap(cell, it) }) })
  }
  function pan(fx, fy) {
    document.querySelectorAll('.c-cell').forEach(function (c) {
      var img = c.querySelector('img'), w = img.naturalWidth, h = img.naturalHeight
      img.style.left = (-(fx * Math.max(0, w - c.clientWidth))) + 'px'
      img.style.top = (-(fy * Math.max(0, h - c.clientHeight))) + 'px'
      if (w < c.clientWidth) img.style.left = (c.clientWidth - w) / 2 + 'px'
      if (h < c.clientHeight) img.style.top = (c.clientHeight - h) / 2 + 'px'
    })
  }
  $('c-grid').addEventListener('click', function (e) {
    var c = e.target.closest('.c-cell'); if (!c || e.target.closest('.cap')) return
    cmp.zoom = !cmp.zoom
    document.querySelectorAll('.c-cell').forEach(function (x) { x.classList.toggle('zoom', cmp.zoom); if (!cmp.zoom) { var i = x.querySelector('img'); i.style.left = i.style.top = '' } })
    if (cmp.zoom) { var r = c.getBoundingClientRect(); pan((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height) }
  })
  $('c-grid').addEventListener('mousemove', function (e) {
    if (!cmp.zoom) return
    var c = e.target.closest('.c-cell'); if (!c) return
    var r = c.getBoundingClientRect(); pan((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  })
  function closeCompare() { $('compare').hidden = true; $('c-grid').innerHTML = '' }
  $('c-close').onclick = closeCompare

  // ---------- keyboard

  document.addEventListener('keydown', function (e) {
    if (!$('modal').hidden) return
    var typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range'
    if (typing) { if (e.key === 'Escape') document.activeElement.blur(); return }
    var k = e.key, viewer = !$('viewer').hidden, comp = !$('compare').hidden
    if (k === 'Escape') { closeMenu(); if (comp) return closeCompare(); if (viewer) return closeViewer(); S.sel.clear(); return paintSel() }
    if (comp) {
      var hov = document.querySelector('.c-cell:hover')
      if (hov && /^[0-5]$/.test(k)) { var it = S.items[S.at.get(+hov.dataset.id)]; rate([it.id], +k).then(function () { paintCap(hov, it) }) }
      if (hov && /^[6-9]$/.test(k)) { var it2 = S.items[S.at.get(+hov.dataset.id)]; label([it2.id], LABELS[+k - 6]).then(function () { paintCap(hov, it2) }) }
      return
    }
    var ids = viewer ? [S.items[S.vi].id] : target()
    if ((e.metaKey && k === 'Backspace') || (viewer && k === 'Delete')) { e.preventDefault(); if (viewer) S.sel = new Set(ids); return trash() }
    if (e.metaKey && k.toLowerCase() === 'a' && !viewer) { e.preventDefault(); S.items.forEach(function (it) { S.sel.add(it.id) }); return paintSel() }
    if (e.metaKey && k.toLowerCase() === 'f') { e.preventDefault(); return $('q').focus() }
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (/^[0-5]$/.test(k)) return rate(ids, +k)
    if (/^[6-9]$/.test(k)) return label(ids, LABELS[+k - 6])
    if (k === 'f' || k === 'F') return fav(ids)
    if (k === 'h' || k === 'H') { if (viewer) S.sel = new Set(ids); return hide().then(function () { if (viewer) { if (!S.items.length) closeViewer(); else { S.vi = Math.min(S.vi, S.items.length - 1); drawViewer() } } }) }
    if (k === 'e' || k === 'E') { if (viewer) S.sel = new Set(ids); return exportSel() }
    if (viewer) {
      if (k === 'ArrowLeft') { e.preventDefault(); return step(-1) }
      if (k === 'ArrowRight') { e.preventDefault(); return step(1) }
      if (k === 'i' || k === 'I') return toggleInfo()
      if (k === ' ') { var v = $('stage').querySelector('video'); if (v) { e.preventDefault(); if (v.paused) v.play(); else v.pause() } return }
      return
    }
    if (k === 'c' || k === 'C') return compare()
    if ((k === 'Enter' || k === ' ') && S.items.length) { e.preventDefault(); var i0 = S.cur >= 0 ? S.cur : S.sel.size ? S.at.get(Array.from(S.sel)[0]) : 0; return openViewer(i0) }
    var mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -geom().cols, ArrowDown: geom().cols }[k]
    if (mv && S.items.length) {
      e.preventDefault()
      var n = Math.max(0, Math.min(S.items.length - 1, (S.cur < 0 ? -mv : S.cur) + mv))
      select(n, e.shiftKey ? 'range' : null)
      var sec = S.secs.find(function (s) { return n >= s._a && n < s._b }); if (sec) fill(sec)
      var d = S.tileEl.get(S.items[n].id); if (d) d.scrollIntoView({ block: 'nearest' })
    }
  })

  // ---------- start

  ;(async function () {
    var i = await inv('info')
    S.thumbs = i.thumbs; S.busy = i.busy
    paintFilters()
    await side()
    await load()
  })()
})()
