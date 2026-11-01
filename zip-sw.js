// Download all as one .zip, any size (Alex, 1 Nov 2026). The page hands this worker the files of a link; the browser
// then opens /__zip/<id>/<name>.zip, and the worker answers with the zip as it is made (zip.js), file after file,
// straight from storage, so the browser saves it like any download, with its progress, never all in memory.
// Its scope is /__zip/ only: it never touches the rest of roartransfer.com.
importScripts('/zip.js')

var jobs = {}

self.addEventListener('install', function () { self.skipWaiting() })
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()) })

self.addEventListener('message', function (e) {
  var m = e.data || {}
  // the page says it is still there every few seconds while a zip goes, so the browser keeps this worker running
  if (m.ping) return
  if (m.zip && m.id && Array.isArray(m.files)) {
    jobs[m.id] = { name: m.name || 'RoarTransfer.zip', files: m.files, port: e.ports && e.ports[0], at: Date.now() }
    if (e.ports && e.ports[0]) e.ports[0].postMessage({ ok: true })
  }
})

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url)
  var m = u.pathname.match(/^\/__zip\/([A-Za-z0-9]+)\//)
  if (!m) return
  var job = jobs[m[1]]
  if (!job) { e.respondWith(new Response('This download has ended. Go back to the link and press Download all again.', { status: 410, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })); return }
  delete jobs[m[1]]
  var port = job.port, last = 0
  var tell = function (x) { try { if (port) port.postMessage(x) } catch (er) {} }
  var body = RTZip.stream(job.files, function (f) {
    return fetch(f.url, { mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
  }, function (n) { var now = Date.now(); if (now - last > 700) { last = now; tell({ bytes: n }) } })
  // tell the page when it ended, well or not
  var pass = new TransformStream({ flush: function () { tell({ done: true }) } })
  body.pipeTo(pass.writable).catch(function (er) { tell({ error: String(er && er.message || er) }) })
  var h = {
    'Content-Type': 'application/zip',
    'Content-Disposition': "attachment; filename=\"" + job.name.replace(/[^\x20-\x7e]|["\\]/g, '_') + "\"; filename*=UTF-8''" + encodeURIComponent(job.name),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
  var len = RTZip.length(job.files)
  if (len) h['Content-Length'] = String(len)
  e.respondWith(new Response(pass.readable, { headers: h }))
})
