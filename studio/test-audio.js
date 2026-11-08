// node studio/test-audio.js: the loudness meter against the EBU reference (a stereo 1 kHz sine at -23 dBFS reads -23.0 LUFS)
const A = require('./audio.js')
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1) } else console.log('ok', m) }
function sine(db, fs, sec, f = 1000) { const a = Math.pow(10, db / 20), n = fs * sec, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / fs); return x }
for (const fs of [44100, 48000, 96000]) {
  const l = sine(-23, fs, 20), r = sine(-23, fs, 20)
  const v = A.lufs([l, r], fs)
  assert(Math.abs(v - -23) < 0.1, `stereo -23 dBFS at ${fs} Hz reads ${v.toFixed(2)} LUFS`)
}
const m = A.lufs([sine(-20, 48000, 10)], 48000)
assert(Math.abs(m - -23.01) < 0.1, `mono -20 dBFS reads ${m.toFixed(2)} LUFS (-3 dB for one channel)`)
// the relative gate: 10 s at -20 and 10 s of near silence reads the loud part
const fs = 48000, loud = sine(-20, fs, 10), quiet = sine(-80, fs, 10), both = new Float32Array(loud.length * 2); both.set(loud); both.set(quiet, loud.length)
const g = A.lufs([both, both], fs)
assert(Math.abs(g - -20) < 0.2, `gating keeps the loud half: ${g.toFixed(2)} LUFS`)
const r = A.fromChannels([sine(-6, 48000, 3), sine(-6, 48000, 3)], 48000)
assert(r.peaks.length === 1000 && Math.abs(r.peak_db - -6) < 0.1 && Math.abs(r.duration - 3) < 0.01, `peaks ${r.peaks.length}, peak ${r.peak_db} dBFS, ${r.duration} s`)
// the file's own sample rate from a WAV header
const fsx = require('fs'), wavPath = process.argv[2]
if (wavPath) { const b = fsx.readFileSync(wavPath); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length); const r2 = A.headerRate(ab); assert(r2 === 48000, `WAV header rate ${r2}`) }
// true peak: a sine at a quarter of the rate, 45 degrees off, has samples at 0.707 but a true peak of 0 dB
{ const fs2 = 48000, n = fs2, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.99 * Math.sin(2 * Math.PI * i / 4 + Math.PI / 4)
  const tp = A.truePeak([x]), sp = 20 * Math.log10(0.99 * Math.SQRT1_2)
  assert(Math.abs(tp - 20 * Math.log10(0.99)) < 0.6 && tp > sp + 2, `true peak ${tp} dBTP over a sample peak of ${sp.toFixed(1)} dBFS`) }
{ const tp = A.truePeak([sine(-6, 48000, 2), sine(-6, 48000, 2)]); assert(Math.abs(tp - -6) < 0.2, `a 1 kHz sine at -6 dBFS reads ${tp} dBTP`) }
