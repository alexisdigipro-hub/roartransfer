// RoarStudio's ear: what the page works out from a file before it goes up, all in the browser.
// peaks: the waveform as 1000 values 0..1; lufs: integrated loudness by ITU-R BS.1770-4 (K-weighting, 400 ms blocks with
// 75% overlap, absolute gate -70 LUFS, relative gate -10 LU); peak_db: the highest sample in dBFS.
// Level matching plays every version at the same loudness from these numbers. Tested by studio/test-audio.js.
(function (root) {
  'use strict'
  var BINS = 1000

  // the two K-weighting filters for any sample rate (the same design pyloudnorm and libebur128 use)
  function kCoeffs(fs) {
    var f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196
    var K = Math.tan(Math.PI * f0 / fs), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416)
    var a0 = 1 + K / Q + K * K
    var shelf = { b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], a: [2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] }
    var f1 = 38.13547087602444, Q1 = 0.5003270373238773
    var K1 = Math.tan(Math.PI * f1 / fs), a01 = 1 + K1 / Q1 + K1 * K1
    var hp = { b: [1, -2, 1], a: [2 * (K1 * K1 - 1) / a01, (1 - K1 / Q1 + K1 * K1) / a01] }
    return [shelf, hp]
  }
  function filter(x, c) {
    var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = c.b[0], b1 = c.b[1], b2 = c.b[2], a1 = c.a[0], a2 = c.a[1]
    for (var i = 0; i < x.length; i++) {
      var v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
    }
    return y
  }

  // channels: Float32Array per channel (5.1: L R C LFE Ls Rs; the LFE is left out, the surrounds weigh 1.41)
  function lufs(channels, fs) {
    var n = channels[0].length, block = Math.round(0.4 * fs), hop = Math.round(0.1 * fs)
    if (n < block) return null
    var cs = kCoeffs(fs), weights = channels.map(function (_, i) { return channels.length === 6 ? (i === 3 ? 0 : i >= 4 ? 1.41 : 1) : 1 })
    var filtered = channels.map(function (ch, i) { return weights[i] ? filter(filter(ch, cs[0]), cs[1]) : null })
    var nb = Math.floor((n - block) / hop) + 1, z = new Float64Array(nb)
    // a running sum of squares per channel makes each block one subtraction
    var sums = filtered.map(function (f) {
      if (!f) return null
      var s = new Float64Array(n + 1)
      for (var i = 0; i < n; i++) s[i + 1] = s[i] + f[i] * f[i]
      return s
    })
    for (var j = 0; j < nb; j++) {
      var a = j * hop, t = 0
      for (var c = 0; c < sums.length; c++) if (sums[c]) t += weights[c] * (sums[c][a + block] - sums[c][a]) / block
      z[j] = t
    }
    var L = function (v) { return -0.691 + 10 * Math.log10(v) }
    var abs = [], i2
    for (i2 = 0; i2 < nb; i2++) if (z[i2] > 0 && L(z[i2]) > -70) abs.push(z[i2])
    if (!abs.length) return -70
    var mean = abs.reduce(function (p, q) { return p + q }, 0) / abs.length
    var rel = L(mean) - 10
    var keep = abs.filter(function (v) { return L(v) > rel })
    if (!keep.length) return L(mean)
    return L(keep.reduce(function (p, q) { return p + q }, 0) / keep.length)
  }

  function peaksOf(channels) {
    var n = channels[0].length, out = new Array(BINS), per = n / BINS, top = 0
    for (var b = 0; b < BINS; b++) {
      var s = Math.floor(b * per), e = Math.max(s + 1, Math.floor((b + 1) * per)), m = 0
      // every sample for short files, a stride for long ones (a few million reads at most)
      var step = Math.max(1, Math.floor((e - s) / 2000))
      for (var c = 0; c < channels.length; c++) { var ch = channels[c]; for (var i = s; i < e; i += step) { var v = ch[i] < 0 ? -ch[i] : ch[i]; if (v > m) m = v } }
      out[b] = m; if (m > top) top = m
    }
    return { peaks: out, top: top }
  }
  function samplePeak(channels) {
    var m = 0
    for (var c = 0; c < channels.length; c++) { var ch = channels[c]; for (var i = 0; i < ch.length; i++) { var v = ch[i] < 0 ? -ch[i] : ch[i]; if (v > m) m = v } }
    return m
  }

  function fromChannels(channels, fs) {
    var p = peaksOf(channels), sp = samplePeak(channels)
    // the waveform is drawn against full scale with a gentle curve, so quiet passages still show
    var peaks = p.peaks.map(function (v) { return Math.round(Math.min(1, Math.pow(v, 0.8)) * 1000) / 1000 })
    var l = lufs(channels, fs)
    return { peaks: peaks, lufs: l == null ? null : Math.round(l * 10) / 10, peak_db: sp > 0 ? Math.round(20 * Math.log10(sp) * 10) / 10 : null, duration: channels[0].length / fs, sample_rate: fs, channels: channels.length }
  }

  // the file's own sample rate (the browser resamples what it decodes to its own rate): WAV, AIFF, FLAC headers
  function headerRate(buf) {
    try {
      var d = new DataView(buf), tag = function (o) { return String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3)) }
      if (tag(0) === 'RIFF' && tag(8) === 'WAVE') {
        for (var o = 12; o + 8 < Math.min(d.byteLength, 1 << 20);) { var id = tag(o), len = d.getUint32(o + 4, true); if (id === 'fmt ') return d.getUint32(o + 12, true); o += 8 + len + (len & 1) }
      }
      if (tag(0) === 'FORM' && (tag(8) === 'AIFF' || tag(8) === 'AIFC')) {
        for (var q = 12; q + 8 < Math.min(d.byteLength, 1 << 20);) {
          var id2 = tag(q), len2 = d.getUint32(q + 4)
          if (id2 === 'COMM') { var e = d.getUint16(q + 16) & 0x7fff, m = d.getUint32(q + 18); return Math.round(m * Math.pow(2, e - 16383 - 31)) }
          q += 8 + len2 + (len2 & 1)
        }
      }
      if (tag(0) === 'fLaC') return (d.getUint8(18) << 12) | (d.getUint8(19) << 4) | (d.getUint8(20) >> 4)
    } catch (x) {}
    return 0
  }

  // a file from the page: decoded by the browser (WAV, AIFF, FLAC, MP3, AAC/M4A, OGG; the sound of an MP4/MOV where it can)
  function analyse(file) {
    var AC = root.AudioContext || root.webkitAudioContext
    if (!AC || file.size > 1.5 * 1024 * 1024 * 1024) return Promise.resolve(null)
    return file.arrayBuffer().then(function (buf) {
      var rate = headerRate(buf), ctx = new AC()
      return new Promise(function (ok, no) { ctx.decodeAudioData(buf, ok, no) }).then(function (ab) {
        var chans = []
        for (var c = 0; c < ab.numberOfChannels; c++) chans.push(ab.getChannelData(c))
        var r = fromChannels(chans, ab.sampleRate)
        if (rate > 0) r.sample_rate = rate
        try { ctx.close() } catch (e) {}
        return r
      }, function () { try { ctx.close() } catch (e) {} return null })
    }).catch(function () { return null })
  }

  var api = { analyse: analyse, fromChannels: fromChannels, lufs: lufs, headerRate: headerRate, BINS: BINS }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.RSAudio = api
})(typeof window !== 'undefined' ? window : globalThis)
