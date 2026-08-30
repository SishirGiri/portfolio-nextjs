// ══════════════════════════════════════════════════════════════
// GENERATE-AUDIO — offline renderer for every Neon Drive sound.
//
// Renders procedural placeholder assets into /public/audio:
//   engines/    RPM-mapped seamless loop layers (WAV) + one-shots
//   vehicles/   horns, siren, doors (WAV loops for tonal seams)
//   tires/      skid / drift / road loops + screech onset
//   collisions/ crashes, glass, scrape, thuds
//   environment/rain, wind, city ambience, thunder, splash
//   ui/         clicks, hovers, toggles, denies
//   missions/   stings: start, countdown, checkpoint, complete…
//   economy/    coins, purchase, upgrade, refuel
//   music/      synthwave menu + gameplay loops (stereo)
//   weapons/    README only (no weapons in Neon Drive)
//
// Everything here is a high-quality procedural PLACEHOLDER meant
// to be swapped 1:1 for licensed/royalty-free recordings later —
// see public/audio/README.md for the replacement map. Re-run:
//   node public/demos/car-game/tools/generate-audio.mjs
// ══════════════════════════════════════════════════════════════
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOggEncoder, createMp3Encoder } from 'wasm-media-encoders';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'public', 'audio');
const LO = 22050;   // loop / sfx render rate (WAV loops stay small)
const HI = 44100;   // one-shots, music

// ────────────────────────────────────────────────────────────
// tiny DSP kit
// ────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic noise that is periodic over `period` samples — makes
 *  randomised textures loop seamlessly without a crossfade seam. */
function periodicNoise(n, period, seed) {
  const rng = mulberry32(seed);
  const p = new Float32Array(period);
  for (let i = 0; i < period; i++) p[i] = rng() * 2 - 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = p[i % period];
  return out;
}

function whiteNoise(n, seed) { return periodicNoise(n, n, seed); }

/** Pink noise (Paul Kellet approximation). */
function pinkNoise(n, seed) {
  const rng = mulberry32(seed);
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return out;
}

class Biquad {
  constructor(type, f0, Q, sr, gainDB = 0) {
    const A = 10 ** (gainDB / 40);
    const w0 = (TAU * f0) / sr, cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') {
      b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'hp') {
      b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'bp') {
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else { // peaking
      b0 = alpha * A + 1; b1 = 1 - cw; b2 = 1 - alpha * A;
      a0 = alpha / A + 1; a1 = -2 * cw; a2 = 1 - alpha / A;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
      - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
  run(buf) { for (let i = 0; i < buf.length; i++) buf[i] = this.process(buf[i]); return buf; }
}

const chain = (buf, ...filters) => { for (const f of filters) f.run(buf); return buf; };

/** Biquad with time-varying corner frequency (for sweeps). */
function sweepFilter(buf, type, f0, f1, Q, sr) {
  const n = buf.length;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const f = f0 + (f1 - f0) * (i / n);
    const w0 = (TAU * f) / sr, cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
    else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    const x = buf[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = y;
  }
  return buf;
}

function tanhDrive(buf, drive) {
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / Math.tanh(drive);
  return buf;
}

function normalize(buf, peak = 0.89) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max < 1e-9) return buf;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

function fadeIn(buf, ms, sr) {
  const n = Math.min(buf.length, Math.floor((ms / 1000) * sr));
  for (let i = 0; i < n; i++) buf[i] *= i / n;
  return buf;
}
function fadeOut(buf, ms, sr) {
  const n = Math.min(buf.length, Math.floor((ms / 1000) * sr));
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n;
  return buf;
}

function mix(dst, src, gain = 1, offset = 0) {
  for (let i = 0; i < src.length && offset + i < dst.length; i++) {
    dst[offset + i] += src[i] * gain;
  }
  return dst;
}

function declick(buf, ms = 4, sr) {
  return fadeIn(fadeOut(buf, ms, sr), ms, sr);
}

/** Damped sine "ring". */
function ring(n, freq, decay, sr, phase = 0) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin(TAU * freq * (i / sr) + phase) * Math.exp(-i / (decay * sr));
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// writers: WAV / OGG / MP3
// ────────────────────────────────────────────────────────────
function writeWav(path, data, sr, channels = 1) {
  const ch = channels === 1 ? [data] : data;
  const n = ch[0].length;
  const buf = Buffer.alloc(44 + n * channels * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * channels * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * channels * 2, 28); buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * channels * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) {
    const s = Math.max(-1, Math.min(1, ch[c][i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, o); o += 2;
  }
  writeFileSync(path, buf);
}

async function encodeOgg(ch, sr, quality = 4) {
  const enc = await createOggEncoder();
  enc.configure({ sampleRate: sr, channels: ch.length, vbrQuality: quality });
  const parts = [enc.encode(ch)];
  parts.push(enc.finalize());
  return Buffer.concat(parts);
}
async function encodeMp3(ch, sr, kbps = 112) {
  const enc = await createMp3Encoder();
  enc.configure({ sampleRate: sr, channels: ch.length, bitrate: kbps });
  const parts = [enc.encode(ch)];
  parts.push(enc.finalize());
  return Buffer.concat(parts);
}

const written = [];
async function out(name, pcm, sr, { wav = false, mp3 = true, ogg = true, gain = 0.89, channels = 1 } = {}) {
  const dir = join(ROOT, name.split('/')[0]);
  mkdirSync(dir, { recursive: true });
  let ch = channels === 1 ? [pcm] : pcm;
  ch = ch.map((c) => normalize(c, gain));
  if (wav) { writeWav(join(ROOT, `${name}.wav`), channels === 1 ? ch[0] : ch, sr, channels); written.push(`${name}.wav`); }
  if (ogg) { writeFileSync(join(ROOT, `${name}.ogg`), await encodeOgg(ch, sr, channels === 2 ? 5 : 4)); written.push(`${name}.ogg`); }
  if (mp3) { writeFileSync(join(ROOT, `${name}.mp3`), await encodeMp3(ch, sr, channels === 2 ? 128 : 112)); written.push(`${name}.mp3`); }
}

// ══════════════════════════════════════════════════════════════
// 1. ENGINES — seamless RPM layers (per-cylinder combustion model)
// ══════════════════════════════════════════════════════════════

/**
 * Render one engine loop layer at a fixed RPM.
 * Model: per-cylinder combustion pulses (damped thump + burnt-gas
 * noise burst) laid on a 720° cycle, repeated exactly N times so the
 * loop is sample-seamless while per-cycle jitter stays periodic.
 */
function renderEngineLayer({ rpm, cyl, targetSec, sr, character, seed }) {
  const cycleHz = (rpm / 60) / 2;                       // 4-stroke: a cycle = 2 revs
  const cycles = Math.max(4, Math.round(targetSec * cycleHz));
  const cycleLen = Math.round(sr / cycleHz);
  const n = cycles * cycleLen;
  const rng = mulberry32(seed);

  const out = new Float32Array(n);
  const pulsesPerCycle = cyl / 2;                       // firings per 720°
  // per-cycle gain jitter (idle roughness), periodic over the loop
  const cycJit = new Float32Array(cycles);
  for (let c = 0; c < cycles; c++) {
    cycJit[c] = 1 + (rng() - 0.5) * character.roughness;
  }
  const cylJit = new Float32Array(cyl);
  for (let k = 0; k < cyl; k++) cylJit[k] = 0.82 + rng() * 0.36;

  const pulseLen = Math.floor(sr * character.pulseMs / 1000);
  // pre-render one combustion pulse per cylinder (thump + noise)
  const pulses = [];
  for (let k = 0; k < cyl; k++) {
    const p = new Float32Array(pulseLen);
    const f0 = character.thumpHz * (0.92 + rng() * 0.16);
    for (let i = 0; i < pulseLen; i++) {
      const t = i / sr;
      const env = Math.exp(-t / character.thumpDecay);
      p[i] = (Math.sin(TAU * f0 * t) * 1.0
        + Math.sin(TAU * f0 * 2.02 * t) * 0.5
        + Math.sin(TAU * f0 * 3.1 * t) * 0.22) * env;
    }
    // exhaust-valve gas burst rides the pulse tail
    const gas = periodicNoise(pulseLen, pulseLen, seed + 977 + k * 131);
    const gEnv = new Float32Array(pulseLen);
    for (let i = 0; i < pulseLen; i++) {
      const t = i / sr;
      gEnv[i] = Math.exp(-t / (character.thumpDecay * 0.55)) * character.gas;
    }
    const gf = new Biquad('bp', character.gasHz, 0.9, sr);
    for (let i = 0; i < pulseLen; i++) p[i] += gf.process(gas[i]) * gEnv[i];
    pulses.push(p);
  }

  // lay pulses into each cycle with ignition timing offsets
  for (let c = 0; c < cycles; c++) {
    const base = c * cycleLen;
    const wob = 1 + Math.sin((c / cycles) * TAU * character.wobbleCycles) * character.wobble;
    for (let k = 0; k < pulsesPerCycle; k++) {
      // even bank spacing with a touch of ignition scatter
      const frac = (k + 0.5) / pulsesPerCycle + (rng() - 0.5) * 0.012;
      const cycIdx = Math.floor((c * pulsesPerCycle + k)) % cyl;
      const start = Math.floor(base + frac * cycleLen);
      const g = cycJit[c] * cylJit[cycIdx] * wob;
      const p = pulses[cycIdx];
      for (let i = 0; i < p.length && start + i < n; i++) {
        out[start + i] += p[i] * g;
      }
    }
  }

  // intake hiss (breathes at cycle rate — periodic → seamless)
  const intake = periodicNoise(n, cycleLen * 2, seed + 5150);
  const iF = new Biquad('bp', character.intakeHz, 0.8, sr);
  for (let i = 0; i < n; i++) {
    const breathe = 0.55 + 0.45 * Math.sin((i / n) * TAU * 2);
    out[i] += iF.process(intake[i]) * character.intakeAmt * breathe;
  }
  // mechanical chatter (cam-rate ticks, high band)
  const mech = periodicNoise(n, cycleLen, seed + 8123);
  const mF = new Biquad('hp', 3800, 0.7, sr);
  for (let i = 0; i < n; i++) out[i] += mF.process(mech[i]) * character.mechAmt;

  // exhaust body resonances + growl
  tanhDrive(out, character.drive);
  chain(out,
    new Biquad('peak', character.resA[0], 2.0, sr, character.resA[1]),
    new Biquad('peak', character.resB[0], 1.6, sr, character.resB[1]),
    new Biquad('peak', character.resC[0], 1.2, sr, character.resC[1]),
    new Biquad('lp', character.lpf, 0.75, sr));
  return out;
}

const SPORT_CHAR = {
  roughness: 0.05, pulseMs: 26, thumpHz: 58, thumpDecay: 0.024, gas: 0.55, gasHz: 900,
  wobble: 0.03, wobbleCycles: 3, intakeHz: 1250, intakeAmt: 0.05, mechAmt: 0.012,
  drive: 1.9, resA: [95, 7], resB: [720, 6], resC: [2200, 4], lpf: 5200,
};
const STD_CHAR = {
  roughness: 0.13, pulseMs: 34, thumpHz: 52, thumpDecay: 0.030, gas: 0.62, gasHz: 620,
  wobble: 0.06, wobbleCycles: 2, intakeHz: 850, intakeAmt: 0.06, mechAmt: 0.016,
  drive: 2.2, resA: [120, 6], resB: [480, 6], resC: [1500, 4], lpf: 4200,
};

// layer centers in normalised RPM (0..1 of the usable band)
const LAYERS = [
  ['idle', 0.06, 900, 3.4],
  ['low', 0.30, 2600, 2.6],
  ['mid', 0.60, 4600, 2.4],
  ['high', 0.90, 6600, 2.2],
];

async function generateEngines() {
  for (const [profile, char, cyl] of [['sport', SPORT_CHAR, 10], ['std', STD_CHAR, 4]]) {
    for (const [name, , rpm, sec] of LAYERS) {
      const pcm = renderEngineLayer({ rpm, cyl, targetSec: sec, sr: LO, character: char, seed: 100 + cyl * 7 + rpm });
      // idle sits lower in level — the runtime layers rev up on top of it
      await out(`engines/${profile}_${name}`, pcm, LO, { wav: true, ogg: false, mp3: false, gain: name === 'idle' ? 0.55 : 0.89 });
    }
  }

  // starter crank + catch (engine start, ~1.4s)
  {
    const sr = HI, n = Math.floor(sr * 1.4);
    const pcm = new Float32Array(n);
    const crank = whiteNoise(n, 42);
    const cF = new Biquad('bp', 300, 1.2, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const whirr = (Math.sin(TAU * 24 * t) > 0 ? 1 : 0.25) * 0.6 + 0.4; // chug-chug
      const crankEnv = t < 0.75 ? 0.5 + Math.min(t / 0.75, 1) * 0.4 : Math.max(0, 0.9 - (t - 0.75) * 3);
      pcm[i] += cF.process(crank[i]) * whirr * crankEnv * 0.8;
      pcm[i] += Math.sin(TAU * 95 * t) * 0.22 * crankEnv * whirr;
    }
    // engine catches at ~0.95s and blips to 2200rpm then settles
    const catchAt = Math.floor(sr * 0.95);
    const roar = renderEngineLayer({ rpm: 2300, cyl: 6, targetSec: 0.35, sr, character: SPORT_CHAR, seed: 3 });
    mix(pcm, roar, 0.85, catchAt);
    const settle = renderEngineLayer({ rpm: 950, cyl: 6, targetSec: 0.45, sr, character: SPORT_CHAR, seed: 4 });
    fadeIn(settle, 40, sr);
    mix(pcm, settle, 0.55, catchAt + Math.floor(sr * 0.35));
    fadeOut(pcm, 120, sr);
    await out('engines/start', declick(pcm, 6, sr), sr);
  }
  // shutdown: revs fall + shudder off
  {
    const sr = HI;
    const hi = renderEngineLayer({ rpm: 1600, cyl: 6, targetSec: 0.5, sr, character: STD_CHAR, seed: 8 });
    const lo = renderEngineLayer({ rpm: 750, cyl: 4, targetSec: 0.6, sr, character: STD_CHAR, seed: 9 });
    const n = hi.length + lo.length;
    const pcm = new Float32Array(n);
    mix(pcm, hi, 0.7, 0);
    mix(pcm, lo, 0.5, hi.length - Math.floor(sr * 0.08));
    fadeOut(pcm, 260, sr);
    await out('engines/stop', fadeIn(pcm, 5, sr), sr);
  }
  // turbo blow-off (psshh)
  {
    const sr = HI, n = Math.floor(sr * 0.55);
    const pcm = whiteNoise(n, 77);
    sweepFilter(pcm, 'bp', 3600, 700, 1.1, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= Math.exp(-t / 0.16) * (t < 0.006 ? t / 0.006 : 1);
    }
    await out('engines/blowoff', pcm, sr);
  }
  // exhaust backfire crackle ×2
  for (let v = 0; v < 2; v++) {
    const sr = HI, n = Math.floor(sr * 0.42);
    const pcm = new Float32Array(n);
    const rng = mulberry32(500 + v);
    const bangs = 3 + Math.floor(rng() * 3);
    for (let b = 0; b < bangs; b++) {
      const at = Math.floor(rng() * n * 0.7);
      const boom = ring(Math.floor(sr * 0.09), 70 + rng() * 60, 0.045, sr);
      const burst = whiteNoise(boom.length, 900 + b * 37 + v);
      chain(burst, new Biquad('lp', 900, 0.8, sr));
      for (let i = 0; i < boom.length; i++) boom[i] = boom[i] * 0.8 + burst[i] * 0.7;
      fadeIn(boom, 1.5, sr);
      mix(pcm, boom, 0.9, at);
    }
    await out(`engines/backfire_${v + 1}`, fadeIn(pcm, 2, sr), sr);
  }
}

// ══════════════════════════════════════════════════════════════
// 2. TIRES — squeal / scrub / road
// ══════════════════════════════════════════════════════════════
async function generateTires() {
  // locked-wheel squeal loop (stick-slip AM over narrowband noise)
  {
    const sr = LO, sec = 3.0, n = Math.floor(sr * sec);
    const pcm = periodicNoise(n, Math.floor(sr * 0.37), 61);
    chain(pcm, new Biquad('bp', 1350, 4.5, sr), new Biquad('bp', 1900, 2.2, sr));
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const slip = 0.62 + 0.38 * Math.sin(TAU * 13 * t + Math.sin(TAU * 3.1 * t));
      const mod = 0.8 + 0.2 * Math.sin(TAU * 1.7 * t);
      pcm[i] *= slip * mod;
    }
    await out('tires/skid_loop', pcm, sr, { wav: true, ogg: true, mp3: true, gain: 0.72 });
  }
  // sideways drift scrub (lower, rougher)
  {
    const sr = LO, sec = 3.0, n = Math.floor(sr * sec);
    const pcm = periodicNoise(n, Math.floor(sr * 0.23), 63);
    chain(pcm, new Biquad('bp', 640, 2.2, sr), new Biquad('bp', 1100, 1.6, sr));
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= 0.55 + 0.45 * Math.sin(TAU * 7.3 * t + Math.cos(TAU * 2.2 * t));
    }
    await out('tires/drift_loop', pcm, sr, { wav: true, ogg: true, mp3: true, gain: 0.72 });
  }
  // squeal onset when slip breaks loose
  {
    const sr = HI, n = Math.floor(sr * 0.38);
    const pcm = whiteNoise(n, 65);
    chain(pcm, new Biquad('bp', 1500, 5.0, sr));
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= Math.min(1, t / 0.03) * (0.4 + 0.6 * Math.sin(TAU * 26 * t)) * Math.exp(-t / 0.3);
    }
    await out('tires/screech_onset', pcm, sr);
  }
  // highway tyre + road rumble
  {
    const sr = LO, sec = 4.0, n = Math.floor(sr * sec);
    const pcm = pinkNoise(n, 67);
    chain(pcm, new Biquad('lp', 330, 0.8, sr), new Biquad('hp', 55, 0.7, sr));
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= 0.75 + 0.25 * Math.sin(TAU * 1.3 * t);
    }
    await out('tires/road_loop', pcm, sr, { wav: true, ogg: true, mp3: true, gain: 0.6 });
  }
}

// ══════════════════════════════════════════════════════════════
// 3. COLLISIONS
// ══════════════════════════════════════════════════════════════
function metalClang(sr, rng, baseHz) {
  const n = Math.floor(sr * 0.5);
  const pcm = new Float32Array(n);
  const partials = 5;
  for (let p = 0; p < partials; p++) {
    const f = baseHz * (1 + p * (0.9 + rng() * 0.5));
    const g = 0.8 / (1 + p);
    mix(pcm, ring(n, f, 0.09 + rng() * 0.12, sr, rng() * TAU), g * (0.6 + rng() * 0.4));
  }
  return pcm;
}
async function generateCollisions() {
  for (const [name, mag, seed] of [['light', 0.35, 11], ['medium', 0.65, 12], ['heavy', 1.0, 13]]) {
    const sr = HI, n = Math.floor(sr * (0.7 + mag * 0.7));
    const pcm = new Float32Array(n);
    const rng = mulberry32(seed);
    // 1) initial impact: body thump + crush noise
    const thumpN = Math.floor(sr * 0.22);
    const thump = new Float32Array(thumpN);
    for (let i = 0; i < thumpN; i++) {
      const t = i / sr;
      thump[i] = (Math.sin(TAU * 46 * t) * 1.1 + Math.sin(TAU * 92 * t) * 0.5) * Math.exp(-t / 0.07);
    }
    fadeIn(thump, 1, sr);
    mix(pcm, thump, mag);
    const crush = whiteNoise(thumpN * 3, seed * 3);
    sweepFilter(crush, 'lp', 2600, 300, 0.8, sr);
    for (let i = 0; i < crush.length; i++) crush[i] *= Math.exp(-(i / sr) / 0.09);
    mix(pcm, crush, mag * 0.8);
    // 2) metal clang partials
    mix(pcm, metalClang(sr, rng, 240 + rng() * 120), mag * 0.5);
    // 3) debris tinkle (heavy only gets lots)
    const debris = Math.floor(3 + mag * 8);
    for (let d = 0; d < debris; d++) {
      const at = Math.floor(sr * (0.08 + rng() * 0.5));
      const f = 1800 + rng() * 4200;
      const len = Math.floor(sr * (0.03 + rng() * 0.06));
      const shard = ring(len, f, 0.02 + rng() * 0.03, sr, rng() * TAU);
      mix(pcm, shard, (0.25 + rng() * 0.3) * mag, at);
    }
    fadeOut(pcm, 60, sr);
    await out(`collisions/crash_${name}`, fadeIn(pcm, 1, sr), sr, { gain: 0.95 });
  }
  // glass shatter
  {
    const sr = HI, n = Math.floor(sr * 0.8);
    const pcm = whiteNoise(n, 21);
    chain(pcm, new Biquad('hp', 2400, 0.8, sr), new Biquad('lp', 9000, 0.7, sr));
    const rng = mulberry32(22);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= Math.exp(-t / 0.22) * (0.5 + 0.5 * rng() > 0.5 ? 1 : 0.7);
    }
    for (let d = 0; d < 14; d++) {
      const at = Math.floor(sr * rng() * 0.5);
      mix(pcm, ring(Math.floor(sr * 0.05), 2800 + rng() * 5000, 0.03, sr, rng() * TAU), 0.35, at);
    }
    fadeIn(pcm, 1, sr);
    await out('collisions/glass', pcm, sr);
  }
  // wall scrape loop (metal on concrete)
  {
    const sr = LO, n = Math.floor(sr * 2.2);
    const pcm = periodicNoise(n, Math.floor(sr * 0.11), 23);
    chain(pcm, new Biquad('bp', 900, 1.4, sr), new Biquad('bp', 260, 1.8, sr));
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= 0.6 + 0.4 * Math.sin(TAU * 17 * t) * Math.sin(TAU * 2.3 * t);
    }
    await out('collisions/scrape_loop', pcm, sr, { wav: true, ogg: true, mp3: true, gain: 0.7 });
  }
  // suspension thud (hard landing)
  {
    const sr = HI, n = Math.floor(sr * 0.45);
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] = (Math.sin(TAU * 60 * t) * 1.0 + Math.sin(TAU * 120 * t) * 0.4) * Math.exp(-t / 0.09);
    }
    const clunk = whiteNoise(Math.floor(sr * 0.05), 24);
    chain(clunk, new Biquad('bp', 500, 1.2, sr));
    mix(pcm, clunk, 0.8);
    fadeIn(pcm, 1, sr);
    await out('collisions/thud', pcm, sr);
  }
}

// ══════════════════════════════════════════════════════════════
// 4. VEHICLES — horns, siren, doors
// ══════════════════════════════════════════════════════════════
function renderHorn(freqs, sec, sr, seed, drive = 1.6) {
  const n = Math.floor(sr * sec);
  const pcm = new Float32Array(n);
  const rng = mulberry32(seed);
  for (const f of freqs) {
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const vib = 1 + Math.sin(TAU * 6.5 * t + rng() * 0.01) * 0.004;
      const attack = Math.min(1, t / 0.02);
      const rel = t > sec - 0.06 ? Math.max(0, (sec - t) / 0.06) : 1;
      // square-ish horn with slight motor growl
      const ph = TAU * f * vib * t;
      pcm[i] += (Math.sign(Math.sin(ph)) * 0.55 + Math.sin(ph) * 0.45) * attack * rel;
    }
  }
  tanhDrive(pcm, drive);
  chain(pcm, new Biquad('lp', 3200, 0.8, sr), new Biquad('hp', 180, 0.7, sr));
  return declick(pcm, 8, sr);
}
async function generateVehicles() {
  await out('vehicles/horn', renderHorn([400, 505], 0.9, HI, 31), HI, { gain: 0.8 });
  await out('vehicles/horn_ai_car', renderHorn([465, 585], 0.5, HI, 32), HI, { gain: 0.7 });
  await out('vehicles/horn_ai_truck', renderHorn([235, 296], 0.7, HI, 33, 2.2), HI, { gain: 0.75 });

  // police wail — exactly 3 sweep cycles so the WAV loops seamlessly
  {
    const sr = LO, cycles = 3, cycleSec = 1.5, n = Math.floor(sr * cycleSec * cycles);
    const pcm = new Float32Array(n);
    const lo = 650, hi = 1450;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const cyc = (i / sr) / cycleSec;
      const tri = 1 - Math.abs(1 - 2 * (cyc % 1));           // triangle 0→1→0
      const f = lo + (hi - lo) * tri;
      phase += (TAU * f) / sr;
      const squeal = Math.sin(phase) * 0.85 + Math.sin(phase * 2) * 0.12 + Math.sin(phase * 3) * 0.05;
      pcm[i] = squeal;
    }
    // air-horn grit layer
    const grit = periodicNoise(n, Math.floor(sr * 0.5), 35);
    const gF = new Biquad('bp', 1100, 1.2, sr);
    for (let i = 0; i < n; i++) pcm[i] += gF.process(grit[i]) * 0.18;
    tanhDrive(pcm, 1.4);
    await out('vehicles/siren_wail', pcm, sr, { wav: true, ogg: false, mp3: false, gain: 0.75 });
  }
  // pursuit start whoop (short burst)
  {
    const sr = HI, n = Math.floor(sr * 1.1);
    const pcm = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const cyc = t / 0.28;
      const f = 800 + 650 * (1 - Math.abs(1 - 2 * (cyc % 1)));
      phase += (TAU * f) / sr;
      pcm[i] = Math.sin(phase) * (t < 0.03 ? t / 0.03 : 1) * (t > 1.0 ? (1.1 - t) / 0.1 : 1);
    }
    await out('vehicles/siren_burst', declick(pcm, 6, sr), sr, { gain: 0.7 });
  }
  // door close thunk
  {
    const sr = HI, n = Math.floor(sr * 0.5);
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] = (Math.sin(TAU * 110 * t) * 0.9 + Math.sin(TAU * 220 * t) * 0.35) * Math.exp(-t / 0.075);
    }
    const latch = whiteNoise(Math.floor(sr * 0.03), 36);
    chain(latch, new Biquad('bp', 2600, 1.4, sr));
    mix(pcm, latch, 0.9);
    const body = whiteNoise(Math.floor(sr * 0.12), 37);
    chain(body, new Biquad('lp', 500, 0.9, sr));
    for (let i = 0; i < body.length; i++) body[i] *= Math.exp(-(i / sr) / 0.05);
    mix(pcm, body, 0.5);
    fadeIn(pcm, 1, sr);
    await out('vehicles/door', pcm, sr);
  }
  // busted buzzer
  {
    const sr = HI, n = Math.floor(sr * 0.9);
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const gate = t < 0.35 ? 1 : t < 0.45 ? 0 : t < 0.8 ? 1 : Math.max(0, (0.9 - t) / 0.1);
      pcm[i] = Math.sign(Math.sin(TAU * 196 * t)) * 0.6 * gate
        + Math.sin(TAU * 196 * t) * 0.3 * gate;
    }
    chain(pcm, new Biquad('lp', 1500, 0.9, sr));
    await out('vehicles/buzzer', declick(pcm, 6, sr), sr, { gain: 0.6 });
  }
}

// ══════════════════════════════════════════════════════════════
// 5. ENVIRONMENT
// ══════════════════════════════════════════════════════════════
async function generateEnvironment() {
  // rain (noise + droplet patter, periodic gusts)
  {
    const sr = LO, n = Math.floor(sr * 6);
    const pcm = pinkNoise(n, 51);
    chain(pcm, new Biquad('hp', 420, 0.7, sr), new Biquad('lp', 7000, 0.7, sr));
    const drops = periodicNoise(n, Math.floor(sr * 0.17), 52);
    const dF = new Biquad('hp', 3000, 0.8, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const gust = 0.8 + 0.2 * Math.sin(TAU * (t / 6) * 2);
      pcm[i] = pcm[i] * gust * 0.8 + dF.process(drops[i]) * 0.35 * (drops[i] > 0.72 ? 1 : 0.25) * gust;
    }
    await out('environment/rain_loop', pcm, sr, { ogg: true, mp3: true, gain: 0.55 });
  }
  // wind (gusting low noise)
  {
    const sr = LO, n = Math.floor(sr * 7);
    const pcm = pinkNoise(n, 53);
    chain(pcm, new Biquad('lp', 480, 0.8, sr), new Biquad('hp', 90, 0.7, sr));
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const ph = (t / 7) * TAU;
      const gust = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ph * 3 + Math.sin(ph * 2) * 1.3));
      pcm[i] *= gust;
    }
    await out('environment/wind_loop', pcm, sr, { ogg: true, mp3: true, gain: 0.6 });
  }
  // city day bed (traffic roar + distant horns)
  {
    const sr = LO, n = Math.floor(sr * 9);
    const pcm = pinkNoise(n, 55);
    chain(pcm, new Biquad('lp', 240, 0.8, sr), new Biquad('hp', 28, 0.7, sr));
    const hum = new Float32Array(n);
    for (let i = 0; i < n; i++) hum[i] = Math.sin(TAU * 50 * (i / sr)) * 0.3;
    mix(pcm, hum, 0.4);
    const rng = mulberry32(56);
    const horns = 4;
    for (let h = 0; h < horns; h++) {
      const at = Math.floor((h / horns) * n + rng() * n * 0.2) % (n - sr);
      const f = [392, 466, 349, 523][h % 4];
      const dur = Math.floor(sr * (0.3 + rng() * 0.5));
      const hPcm = new Float32Array(dur);
      for (let i = 0; i < dur; i++) {
        const t = i / sr;
        hPcm[i] = (Math.sin(TAU * f * t) * 0.6 + Math.sin(TAU * f * 1.26 * t) * 0.4)
          * Math.min(1, t / 0.05) * Math.max(0, Math.min(1, (dur / sr - t) / 0.08));
      }
      const hF = new Biquad('lp', 900, 0.8, sr);   // muffled by distance
      hF.run(hPcm);
      mix(pcm, hPcm, 0.16, at);
    }
    await out('environment/city_day_loop', pcm, sr, { wav: true, ogg: false, mp3: false, gain: 0.55 });
  }
  // city night bed (quieter + crickets)
  {
    const sr = LO, n = Math.floor(sr * 9);
    const pcm = pinkNoise(n, 57);
    chain(pcm, new Biquad('lp', 160, 0.8, sr));
    const cricketLen = Math.floor(sr * 0.9);
    const cricket = new Float32Array(cricketLen);
    for (let i = 0; i < cricketLen; i++) {
      const t = i / sr;
      const chirpGate = (Math.sin(TAU * 9 * t) > 0.55 && Math.sin(TAU * 2.2 * t) > 0.2) ? 1 : 0;
      cricket[i] = Math.sin(TAU * 4300 * t) * chirpGate * 0.5;
    }
    for (let rep = 0; rep * cricketLen < n; rep++) mix(pcm, cricket, 0.12, rep * cricketLen);
    await out('environment/city_night_loop', pcm, sr, { wav: true, ogg: false, mp3: false, gain: 0.5 });
  }
  // thunder ×3 (varying distance)
  for (let v = 0; v < 3; v++) {
    const sr = HI, close = v === 0;
    const n = Math.floor(sr * (close ? 3.2 : 4.2));
    const pcm = new Float32Array(n);
    const boom = pinkNoise(n, 60 + v);
    sweepFilter(boom, 'lp', close ? 320 : 140, close ? 60 : 45, 0.7, sr);
    const delay = Math.floor(sr * (close ? 0.02 : 0.5 + v * 0.3));
    for (let i = 0; i < n; i++) {
      const t = Math.max(0, (i - delay) / sr);
      pcm[i] = boom[Math.min(n - 1, i)] * Math.exp(-t / (close ? 0.5 : 0.9));
    }
    if (close) {
      const crack = whiteNoise(Math.floor(sr * 0.25), 61);
      chain(crack, new Biquad('hp', 1000, 0.8, sr));
      for (let i = 0; i < crack.length; i++) crack[i] *= Math.exp(-(i / sr) / 0.06);
      mix(pcm, crack, 0.8);
    }
    fadeIn(pcm, 3, sr);
    await out(`environment/thunder_${v + 1}`, pcm, sr, { gain: 0.95 });
  }
  // puddle splash
  {
    const sr = HI, n = Math.floor(sr * 0.6);
    const pcm = whiteNoise(n, 62);
    sweepFilter(pcm, 'lp', 2400, 260, 0.8, sr);
    const rng = mulberry32(63);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      pcm[i] *= Math.exp(-t / 0.13) * (0.6 + 0.4 * rng());
    }
    for (let d = 0; d < 6; d++) {
      const at = Math.floor(sr * (0.1 + rng() * 0.3));
      mix(pcm, ring(Math.floor(sr * 0.04), 900 + rng() * 1800, 0.02, sr, rng() * TAU), 0.2, at);
    }
    fadeIn(pcm, 2, sr);
    await out('environment/splash', pcm, sr);
  }
  // traffic pass-by whoosh (positional)
  {
    const sr = HI, n = Math.floor(sr * 1.4);
    const pcm = pinkNoise(n, 64);
    const f1 = new Biquad('lp', 700, 0.8, sr), f2 = new Biquad('hp', 120, 0.7, sr);
    for (let i = 0; i < n; i++) {
      const t = i / (sr * 1.4);
      // doppler-ish pitch crest as the car passes
      const k = 1 + 0.45 * Math.sin(Math.PI * t);
      pcm[i] = f1.process(pcm[i]) * k;
    }
    f2.run(pcm);
    for (let i = 0; i < n; i++) {
      const t = i / (sr * 1.4);
      const env = Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 2;
      pcm[i] *= env;
    }
    await out('environment/traffic_pass', pcm, sr, { gain: 0.7 });
  }
}

// ══════════════════════════════════════════════════════════════
// 6. UI
// ══════════════════════════════════════════════════════════════
function uiBlip(freq, sec, sr, { type = 'sine', slideTo = null, noiseHz = 0, gain = 1 } = {}) {
  const n = Math.floor(sr * sec);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = slideTo ? freq + (slideTo - freq) * (t / sec) : freq;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / (sec * 0.38));
    let s = Math.sin(TAU * f * t);
    if (type === 'square') s = Math.sign(s) * 0.7 + s * 0.3;
    pcm[i] = s * env * gain;
  }
  if (noiseHz) {
    const nz = whiteNoise(n, Math.floor(freq));
    const nf = new Biquad('bp', noiseHz, 2.5, sr);
    for (let i = 0; i < n; i++) pcm[i] += nf.process(nz[i]) * 0.3 * Math.exp(-(i / sr) / 0.01);
  }
  return declick(pcm, 3, sr);
}
async function generateUi() {
  const sr = HI;
  await out('ui/click', uiBlip(1900, 0.07, sr, { noiseHz: 2400, gain: 0.9 }), sr);
  await out('ui/hover', uiBlip(1200, 0.045, sr, { gain: 0.5 }), sr);
  await out('ui/back', (() => {
    const a = uiBlip(740, 0.07, sr, {}); const b = uiBlip(520, 0.09, sr, {});
    const pcm = new Float32Array(a.length + Math.floor(sr * 0.05) + b.length);
    mix(pcm, a, 0.9, 0); mix(pcm, b, 0.9, a.length + Math.floor(sr * 0.05));
    return pcm;
  })(), sr);
  await out('ui/toggle_on', uiBlip(620, 0.12, sr, { slideTo: 990 }), sr);
  await out('ui/toggle_off', uiBlip(990, 0.12, sr, { slideTo: 560 }), sr);
  await out('ui/slider', uiBlip(2600, 0.03, sr, { gain: 0.45 }), sr);
  await out('ui/deny', (() => {
    const a = uiBlip(220, 0.09, sr, { type: 'square', gain: 0.8 });
    const gap = Math.floor(sr * 0.07);
    const pcm = new Float32Array(a.length * 2 + gap);
    mix(pcm, a, 1, 0); mix(pcm, a, 1, a.length + gap);
    return pcm;
  })(), sr);
  // menu transition swoosh
  {
    const n = Math.floor(sr * 0.4);
    const pcm = whiteNoise(n, 71);
    sweepFilter(pcm, 'bp', 400, 2400, 1.4, sr);
    for (let i = 0; i < n; i++) {
      const t = i / (sr * 0.4);
      pcm[i] *= Math.sin(Math.PI * t) ** 1.5 * 0.8;
    }
    await out('ui/menu_transition', pcm, sr);
  }
}

// ══════════════════════════════════════════════════════════════
// 7. MISSIONS + ECONOMY stings
// ══════════════════════════════════════════════════════════════
function synthNote(freq, sec, sr, { type = 'saw', cutoff = 2400, gain = 0.5, attack = 0.01, release = 0.08 } = {}) {
  const n = Math.floor(sr * sec);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / attack) * Math.max(0, Math.min(1, (sec - t) / release));
    const det = 1 + 0.004 * Math.sin(TAU * 0.7 * t);
    let s = Math.sin(TAU * freq * t) + Math.sin(TAU * freq * det * t) * 0.6;
    if (type === 'saw') s += ((freq * t) % 1 - 0.5) * 1.2;
    pcm[i] = s * env * gain;
  }
  chain(pcm, new Biquad('lp', cutoff, 0.8, sr));
  return pcm;
}
async function generateStings() {
  const sr = HI;
  // mission start — rising fifth stab
  {
    const pcm = new Float32Array(Math.floor(sr * 1.3));
    mix(pcm, synthNote(220, 1.2, sr, { cutoff: 500 }), 0.8, 0);
    mix(pcm, synthNote(330, 1.1, sr, { cutoff: 900 }), 0.6, Math.floor(sr * 0.08));
    mix(pcm, synthNote(440, 1.0, sr, { cutoff: 1600 }), 0.6, Math.floor(sr * 0.16));
    mix(pcm, synthNote(660, 0.9, sr, { cutoff: 2600 }), 0.5, Math.floor(sr * 0.3));
    const swp = whiteNoise(pcm.length, 81);
    sweepFilter(swp, 'bp', 300, 3000, 1.0, sr);
    for (let i = 0; i < swp.length; i++) swp[i] *= (i / swp.length) * 0.25;
    mix(pcm, swp, 0.6);
    tanhDrive(pcm, 1.3);
    await out('missions/mission_start', fadeIn(pcm, 3, sr), sr, { gain: 0.8 });
  }
  // countdown beeps
  await out('missions/countdown', uiBlip(880, 0.14, sr, { type: 'square', gain: 0.6 }), sr);
  await out('missions/countdown_go', uiBlip(1320, 0.4, sr, { type: 'square', gain: 0.7, slideTo: 1760 }), sr);
  // checkpoint chime
  {
    const a = synthNote(988, 0.25, sr, { type: 'sine', cutoff: 4000, gain: 0.5 });
    const b = synthNote(1319, 0.35, sr, { type: 'sine', cutoff: 5000, gain: 0.5 });
    const pcm = new Float32Array(a.length + Math.floor(sr * 0.09) + b.length);
    mix(pcm, a, 1, 0); mix(pcm, b, 1, a.length + Math.floor(sr * 0.09));
    await out('missions/checkpoint', pcm, sr);
  }
  // mission complete jingle (C–E–G–C + pad tail)
  {
    const notes = [[523, 0], [659, 0.11], [784, 0.22], [1047, 0.34]];
    const total = 2.0;
    const pcm = new Float32Array(Math.floor(sr * total));
    for (const [f, at] of notes) {
      mix(pcm, synthNote(f, 0.6 - at * 0.3, sr, { cutoff: 3500, gain: 0.5 }), 1, Math.floor(sr * at));
    }
    mix(pcm, synthNote(262, 1.8, sr, { cutoff: 1200, gain: 0.35, attack: 0.3, release: 0.6 }), 1, Math.floor(sr * 0.34));
    // sparkle
    mix(pcm, synthNote(2093, 0.5, sr, { type: 'sine', cutoff: 8000, gain: 0.22 }), 1, Math.floor(sr * 0.5));
    await out('missions/mission_complete', fadeIn(pcm, 4, sr), sr, { gain: 0.8 });
  }
  // mission fail / game over
  {
    const notes = [[392, 0], [311, 0.22], [233, 0.44]];
    const pcm = new Float32Array(Math.floor(sr * 2.2));
    for (const [f, at] of notes) {
      mix(pcm, synthNote(f, 1.1, sr, { cutoff: 900, gain: 0.5, attack: 0.02, release: 0.5 }), 1, Math.floor(sr * at));
    }
    mix(pcm, synthNote(55, 2.0, sr, { type: 'sine', cutoff: 300, gain: 0.5, attack: 0.05, release: 0.8 }), 1, 0);
    await out('missions/mission_fail', fadeIn(pcm, 4, sr), sr, { gain: 0.75 });
  }
  // level up
  {
    const notes = [[523, 0], [659, 0.07], [784, 0.14], [1047, 0.21], [1319, 0.28]];
    const pcm = new Float32Array(Math.floor(sr * 1.4));
    for (const [f, at] of notes) {
      mix(pcm, synthNote(f, 0.4, sr, { cutoff: 5000, gain: 0.45 }), 1, Math.floor(sr * at));
    }
    await out('missions/level_up', fadeIn(pcm, 3, sr), sr, { gain: 0.75 });
  }
  // busted sting
  {
    const pcm = new Float32Array(Math.floor(sr * 1.5));
    mix(pcm, uiBlip(196, 0.5, sr, { type: 'square', gain: 0.5 }), 1, 0);
    mix(pcm, uiBlip(196, 0.5, sr, { type: 'square', gain: 0.5 }), 1, Math.floor(sr * 0.55));
    const slam = whiteNoise(Math.floor(sr * 0.3), 91);
    chain(slam, new Biquad('lp', 300, 0.9, sr));
    for (let i = 0; i < slam.length; i++) slam[i] *= Math.exp(-(i / sr) / 0.1);
    mix(pcm, slam, 1.2, Math.floor(sr * 1.05));
    await out('missions/busted', fadeIn(pcm, 3, sr), sr, { gain: 0.7 });
  }

  // ── economy ──
  // coin/reward
  {
    const a = synthNote(1319, 0.14, sr, { type: 'sine', cutoff: 8000, gain: 0.5 });
    const b = synthNote(1976, 0.3, sr, { type: 'sine', cutoff: 9000, gain: 0.45 });
    const pcm = new Float32Array(Math.floor(sr * 0.5));
    mix(pcm, a, 1, 0); mix(pcm, b, 1, Math.floor(sr * 0.07));
    await out('economy/coin', pcm, sr);
  }
  // purchase — cash register cha-ching
  {
    const pcm = new Float32Array(Math.floor(sr * 1.1));
    const drawer = whiteNoise(Math.floor(sr * 0.15), 95);
    chain(drawer, new Biquad('lp', 700, 0.9, sr));
    for (let i = 0; i < drawer.length; i++) drawer[i] *= Math.exp(-(i / sr) / 0.06);
    mix(pcm, drawer, 0.9, Math.floor(sr * 0.62));
    mix(pcm, ring(Math.floor(sr * 0.5), 2093, 0.25, sr), 0.4, Math.floor(sr * 0.12));
    mix(pcm, ring(Math.floor(sr * 0.5), 2637, 0.2, sr), 0.35, Math.floor(sr * 0.12));
    mix(pcm, ring(Math.floor(sr * 0.4), 3136, 0.12, sr), 0.2, Math.floor(sr * 0.16));
    await out('economy/purchase', fadeIn(pcm, 2, sr), sr);
  }
  // upgrade install — ratchet clicks + servo
  {
    const pcm = new Float32Array(Math.floor(sr * 0.9));
    const rng = mulberry32(97);
    for (let c = 0; c < 4; c++) {
      const at = Math.floor(sr * c * 0.12);
      const click = whiteNoise(Math.floor(sr * 0.03), 100 + c);
      chain(click, new Biquad('bp', 2200 + c * 300, 1.6, sr));
      for (let i = 0; i < click.length; i++) click[i] *= Math.exp(-(i / sr) / 0.012);
      mix(pcm, click, 0.8, at);
    }
    const servo = whiteNoise(Math.floor(sr * 0.4), 98);
    const sf = new Biquad('bp', 1500, 3.0, sr);
    for (let i = 0; i < servo.length; i++) servo[i] = sf.process(servo[i]) * Math.sin(Math.PI * i / servo.length) * 0.5;
    mix(pcm, servo, 0.8, Math.floor(sr * 0.5));
    await out('economy/upgrade', fadeIn(pcm, 2, sr), sr);
  }
  // refuel glug
  {
    const pcm = new Float32Array(Math.floor(sr * 0.5));
    const rng = mulberry32(99);
    for (let b = 0; b < 3; b++) {
      const at = Math.floor(sr * b * 0.12);
      const gl = whiteNoise(Math.floor(sr * 0.09), 200 + b);
      sweepFilter(gl, 'bp', 500, 180, 1.2, sr);
      for (let i = 0; i < gl.length; i++) gl[i] *= Math.exp(-(i / sr) / 0.05) * (0.7 + 0.3 * rng());
      mix(pcm, gl, 0.8, at);
    }
    await out('economy/refuel', fadeIn(pcm, 2, sr), sr);
  }
}

// ══════════════════════════════════════════════════════════════
// 8. MUSIC — synthwave loops (stereo, 96 BPM, Am–F–C–G)
// ══════════════════════════════════════════════════════════════
function renderMusic({ bars, driving, seed }) {
  const sr = HI, bpm = 96;
  const beat = 60 / bpm, barSec = beat * 4;
  const n = Math.floor(sr * barSec * bars);
  const L = new Float32Array(n), R = new Float32Array(n);
  const rng = mulberry32(seed);
  const roots = [110.0, 87.31, 130.81, 98.0];        // A2 F2 C3 G2
  const at = (b) => Math.floor(sr * b * beat);

  const addMono = (buf, pcm, gain, i0) => mix(buf, pcm, gain, Math.min(i0, n - pcm.length));
  const addStereo = (pcm, gain, i0, pan = 0) => {
    const gl = gain * (1 - Math.max(0, pan)), gr = gain * (1 + Math.min(0, pan));
    addMono(L, pcm, gl, i0); addMono(R, pcm, gr, i0);
  };

  // kick
  const kick = (() => {
    const len = Math.floor(sr * 0.28);
    const k = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = 130 * Math.exp(-t * 26) + 42;
      k[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.16);
    }
    return k;
  })();
  // snare
  const snare = (() => {
    const len = Math.floor(sr * 0.22);
    const s = whiteNoise(len, seed + 1);
    chain(s, new Biquad('hp', 1500, 0.8, sr));
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      s[i] = (s[i] * 0.8 + Math.sin(TAU * 190 * t) * 0.4) * Math.exp(-t / 0.08);
    }
    return s;
  })();
  // hat
  const hat = (() => {
    const len = Math.floor(sr * 0.05);
    const h = whiteNoise(len, seed + 2);
    chain(h, new Biquad('hp', 7500, 0.8, sr));
    for (let i = 0; i < len; i++) h[i] *= Math.exp(-(i / sr) / 0.014);
    return h;
  })();

  for (let bar = 0; bar < bars; bar++) {
    const root = roots[bar % 4];
    const bar0 = Math.floor(sr * bar * barSec);

    // pad chord (supersaw, slow attack)
    for (const [mult, pan] of [[1, -0.3], [1.5, 0.3], [2, -0.15], [2.997, 0.15]]) {
      const p = synthNote(root * mult, barSec, sr, {
        cutoff: driving ? 1400 : 900, gain: 0.16, attack: barSec * 0.3, release: barSec * 0.35,
      });
      addStereo(p, 1, bar0, pan);
    }
    // bass eighths
    if (driving) {
      for (let e = 0; e < 8; e++) {
        if (e === 3 || (bar % 2 === 1 && e === 6)) continue;
        const b = synthNote(root / 2, 0.2, sr, { cutoff: 500, gain: 0.5, attack: 0.004, release: 0.06 });
        addStereo(b, 1, bar0 + at(e / 2));
      }
    } else {
      const b = synthNote(root / 2, beat * 3.6, sr, { cutoff: 380, gain: 0.4, attack: 0.4, release: 0.9 });
      addStereo(b, 1, bar0);
    }
    // arp 16ths
    const arpSeq = [2, 3, 4, 3, 2, 4, 6, 4];
    for (let s16 = 0; s16 < 16; s16++) {
      if (driving && (bar < 2 && s16 % 2 === 1)) continue;
      const mult = arpSeq[s16 % 8];
      const a = synthNote(root * mult, 0.16, sr, {
        cutoff: 2600 + (driving ? 1600 : 0), gain: 0.16, attack: 0.004, release: 0.05,
      });
      addStereo(a, 1, bar0 + at(s16 / 4), s16 % 2 ? 0.35 : -0.35);
    }
    if (!driving) continue;

    // drums
    for (let q = 0; q < 4; q++) {
      addStereo(kick, 0.95, bar0 + at(q));
      if (q === 1 || q === 3) addStereo(snare, 0.55, bar0 + at(q));
    }
    for (let e = 0; e < 8; e++) {
      addStereo(hat, e % 2 ? 0.3 : 0.16, bar0 + at(e / 2 + 0.5), (e % 2 ? 0.4 : -0.4));
    }
    // fill on the last bar
    if (bar === bars - 1) {
      for (let s16 = 12; s16 < 16; s16++) addStereo(snare, 0.3 + (s16 - 12) * 0.08, bar0 + at(s16 / 4));
    }
  }
  // gentle "tape" glue + soften the loop seam (pad tails wrap)
  tanhDrive(L, 1.15); tanhDrive(R, 1.15);
  fadeIn(L, 25, sr); fadeOut(L, 25, sr);
  fadeIn(R, 25, sr); fadeOut(R, 25, sr);
  return [L, R];
}

async function generateMusic() {
  await out('music/menu_loop', renderMusic({ bars: 8, driving: false, seed: 300 }), HI, { channels: 2, wav: false, gain: 0.7 });
  await out('music/game_loop', renderMusic({ bars: 16, driving: true, seed: 400 }), HI, { channels: 2, wav: false, gain: 0.72 });
}

// ══════════════════════════════════════════════════════════════
async function main() {
  const t0 = Date.now();
  mkdirSync(ROOT, { recursive: true });
  // clean previous generated files (keep README)
  for (const dir of readdirSync(ROOT)) {
    const p = join(ROOT, dir);
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p)) {
        if (/\.(wav|ogg|mp3)$/.test(f)) { /* removed by overwrite anyway */ }
      }
    }
  }
  mkdirSync(join(ROOT, 'weapons'), { recursive: true });
  await generateEngines();
  await generateTires();
  await generateCollisions();
  await generateVehicles();
  await generateEnvironment();
  await generateUi();
  await generateStings();
  await generateMusic();

  const kb = (p) => `${(statSync(p).size / 1024).toFixed(0).padStart(6)} KB`;
  console.log(`\nGenerated ${written.length} audio files in ${((Date.now() - t0) / 1000).toFixed(1)}s:\n`);
  for (const f of written) console.log(`  ${kb(join(ROOT, f))}  audio/${f}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
