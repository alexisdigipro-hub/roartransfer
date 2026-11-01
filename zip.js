// Download all as one .zip (Alex, 1 Nov 2026: "many files: show each one, but Download all as a zip").
// A plain zip writer for streams: every file is stored as it is (no compression: videos and pictures do not shrink,
// and it keeps the computer free), its CRC worked out while it passes, in a data descriptor after it. Zip64 only
// where a file or the archive passes 4 GB, so smaller zips open in every unzipper (macOS Archive Utility too).
// Used by zip-sw.js (a stream the browser saves as it comes, any size) and by the page (in memory, small sets).
// No dependencies. RTZip.stream(files, open) -> ReadableStream; RTZip.length(files) -> bytes, or 0 if not known.
;(function (root) {
  var CRC = (function () {
    var t = new Uint32Array(256 * 8)
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c }
    for (var i = 256; i < t.length; i++) t[i] = (t[i - 256] >>> 8) ^ t[t[i - 256] & 255]
    return t
  })()
  // slicing by 8: fast enough for gigabytes in a browser
  function crc32(crc, b) {
    var c = ~crc, i = 0, n = b.length
    for (; i + 8 <= n; i += 8) {
      c ^= b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)
      c = CRC[1792 + (c & 255)] ^ CRC[1536 + ((c >>> 8) & 255)] ^ CRC[1280 + ((c >>> 16) & 255)] ^ CRC[1024 + (c >>> 24)]
        ^ CRC[768 + b[i + 4]] ^ CRC[512 + b[i + 5]] ^ CRC[256 + b[i + 6]] ^ CRC[b[i + 7]]
    }
    for (; i < n; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8)
    return ~c >>> 0
  }
  var FOUR = 0xffffffff
  var enc = new TextEncoder()
  // the same name twice gets (2), (3)…; no folders, no ../
  function names(files) {
    var seen = {}
    return files.map(function (f) {
      var nm = String(f.name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '_') || 'file'
      var key = nm.toLowerCase()
      if (seen[key]) {
        var dot = nm.lastIndexOf('.'), base = dot > 0 ? nm.slice(0, dot) : nm, ext = dot > 0 ? nm.slice(dot) : ''
        var k = 2; while (seen[(base + ' (' + k + ')' + ext).toLowerCase()]) k++
        nm = base + ' (' + k + ')' + ext; key = nm.toLowerCase()
      }
      seen[key] = 1
      return nm
    })
  }
  function dosTime(d) {
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    }
  }
  function W(n) { var b = new Uint8Array(n); return { b: b, v: new DataView(b.buffer), o: 0 } }
  function u16(w, x) { w.v.setUint16(w.o, x, true); w.o += 2 }
  function u32(w, x) { w.v.setUint32(w.o, x >>> 0, true); w.o += 4 }
  function u64(w, x) { w.v.setUint32(w.o, x % 4294967296, true); w.v.setUint32(w.o + 4, Math.floor(x / 4294967296), true); w.o += 8 }
  function put(w, bytes) { w.b.set(bytes, w.o); w.o += bytes.length }
  // a file needs zip64 when it, or where it starts, does not fit in 4 bytes; the size has to be known beforehand
  // (it is: every file on a link has its size), and one without a size is treated as big, to be safe
  function big(size, at) { return !(size >= 0) || size >= FOUR || at >= FOUR }
  function local(name, z64, t) {
    var w = W(30 + name.length + (z64 ? 20 : 0))
    u32(w, 0x04034b50); u16(w, z64 ? 45 : 20); u16(w, 0x0808); u16(w, 0); u16(w, t.time); u16(w, t.date)
    u32(w, 0); u32(w, z64 ? FOUR : 0); u32(w, z64 ? FOUR : 0); u16(w, name.length); u16(w, z64 ? 20 : 0); put(w, name)
    if (z64) { u16(w, 1); u16(w, 16); u64(w, 0); u64(w, 0) }
    return w.b
  }
  function descriptor(crc, size, z64) {
    var w = W(z64 ? 24 : 16)
    u32(w, 0x08074b50); u32(w, crc)
    if (z64) { u64(w, size); u64(w, size) } else { u32(w, size); u32(w, size) }
    return w.b
  }
  function central(e, t) {
    var z64 = e.z64, off64 = e.at >= FOUR, x = z64 ? 4 + 16 + (off64 ? 8 : 0) : 0
    var w = W(46 + e.name.length + x)
    u32(w, 0x02014b50); u16(w, 0x033f); u16(w, z64 ? 45 : 20); u16(w, 0x0808); u16(w, 0); u16(w, t.time); u16(w, t.date)
    u32(w, e.crc); u32(w, z64 ? FOUR : e.size); u32(w, z64 ? FOUR : e.size); u16(w, e.name.length); u16(w, x); u16(w, 0)
    u16(w, 0); u16(w, 0); u32(w, 0o100644 << 16); u32(w, off64 ? FOUR : e.at); put(w, e.name)
    if (z64) { u16(w, 1); u16(w, 16 + (off64 ? 8 : 0)); u64(w, e.size); u64(w, e.size); if (off64) u64(w, e.at) }
    return w.b
  }
  function end(count, cdAt, cdSize) {
    var z64 = count >= 0xffff || cdAt >= FOUR || cdAt + cdSize >= FOUR
    var w = W((z64 ? 56 + 20 : 0) + 22)
    if (z64) {
      var at = cdAt + cdSize
      u32(w, 0x06064b50); u64(w, 44); u16(w, 45); u16(w, 45); u32(w, 0); u32(w, 0); u64(w, count); u64(w, count); u64(w, cdSize); u64(w, cdAt)
      u32(w, 0x07064b50); u32(w, 0); u64(w, at); u32(w, 1)
    }
    u32(w, 0x06054b50); u16(w, 0); u16(w, 0); u16(w, Math.min(count, 0xffff)); u16(w, Math.min(count, 0xffff))
    u32(w, z64 ? FOUR : cdSize); u32(w, z64 ? FOUR : cdAt); u16(w, 0)
    return w.b
  }
  // the exact size of the zip, so the browser shows how far it is and how long is left
  function length(files) {
    var nm = names(files), at = 0, cd = 0
    for (var i = 0; i < files.length; i++) {
      var s = Number(files[i].size), n = enc.encode(nm[i]).length
      if (!(s >= 0)) return 0
      var z64 = big(s, at), off64 = at >= FOUR
      cd += 46 + n + (z64 ? 20 + (off64 ? 8 : 0) : 0)
      at += 30 + n + (z64 ? 20 : 0) + s + (z64 ? 24 : 16)
    }
    var z = files.length >= 0xffff || at >= FOUR || at + cd >= FOUR
    return at + cd + (z ? 76 : 0) + 22
  }
  // open(file, i) -> Promise of a ReadableStream (or a Response) of that file's bytes; the files are read one by one,
  // only as fast as the zip is taken, so a 50 GB transfer never sits in memory
  function stream(files, open, onProgress) {
    var nm = names(files).map(function (s) { return enc.encode(s) })
    var t = dosTime(new Date()), entries = [], at = 0, i = 0, rd = null, cur = null, done = 0
    return new ReadableStream({
      pull: async function (ctl) {
        for (;;) {
          if (!cur) {
            if (i >= files.length) {
              var cdAt = at, parts = entries.map(function (e) { return central(e, t) })
              var cdSize = parts.reduce(function (n, p) { return n + p.length }, 0)
              parts.forEach(function (p) { ctl.enqueue(p) })
              ctl.enqueue(end(entries.length, cdAt, cdSize)); ctl.close(); return
            }
            var f = files[i], s = Number(f.size)
            cur = { name: nm[i], at: at, size: 0, crc: 0, z64: big(s, at), want: s }
            var head = local(cur.name, cur.z64, t)
            var src = await open(f, i)
            if (src && src.body !== undefined) { if (!src.ok || !src.body) throw new Error('HTTP ' + src.status + ' · ' + (f.name || '')); src = src.body }
            rd = src.getReader()
            ctl.enqueue(head); at += head.length
            return
          }
          var c = await rd.read()
          if (c.done) {
            if (cur.want >= 0 && cur.size !== cur.want) throw new Error('Short file · ' + (files[i].name || ''))
            var d = descriptor(cur.crc, cur.size, cur.z64)
            ctl.enqueue(d); at += d.length
            entries.push(cur); cur = null; rd = null; i++
            continue
          }
          var b = c.value instanceof Uint8Array ? c.value : new Uint8Array(c.value)
          if (!b.length) continue
          cur.crc = crc32(cur.crc, b); cur.size += b.length; at += b.length; done += b.length
          ctl.enqueue(b)
          if (onProgress) onProgress(done)
          return
        }
      },
      cancel: function () { if (rd) try { rd.cancel() } catch (e) {} }
    }, { highWaterMark: 1 })
  }
  // a file's bytes: through the site first (url), and its own address (alt) if that does not answer
  function open(f) {
    var get = function (u) { return fetch(u, { mode: 'cors', cache: 'no-store', credentials: 'omit' }) }
    return get(f.url).then(function (r) {
      if (r.ok && r.body && !/text\/html/.test(r.headers.get('content-type') || '')) return r
      if (f.alt && f.alt !== f.url) return get(f.alt)
      return r
    }, function (er) { if (f.alt && f.alt !== f.url) return get(f.alt); throw er })
  }
  root.RTZip = { open: open, stream: stream, length: length, names: names, crc32: crc32 }
})(typeof self !== 'undefined' ? self : globalThis)
