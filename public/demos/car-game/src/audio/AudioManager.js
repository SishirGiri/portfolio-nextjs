// ══════════════════════════════════════════════════════════════
// AUDIO MANAGER — the single entry point for game sound.
//
//  • 7-channel mixer: master ▸ music / engine / sfx / environment /
//    ui / voice, each independently controllable + persisted
//  • Buffer cache with format negotiation (ogg → mp3 fallback,
//    wav where sample-seamless loops demand it)
//  • Preloaded UI kit + lazy everything else; per-sound pools,
//    retrigger cooldowns and a global voice cap so overlaps can
//    never stack into mush
//  • Positional one-shots + repositionable loops through the
//    Spatializer (pan / distance / Doppler)
//  • Synth fallbacks for every critical sound, so a missing or
//    failed asset degrades to a beep instead of silence
// ══════════════════════════════════════════════════════════════
import { clamp } from '../utils.js';
import { Spatializer } from './Spatializer.js';
import { EngineAudio } from './EngineAudio.js';
import {
  AUDIO_BASE, CHANNELS, DEFAULT_VOLUMES, LEGACY_VOLUME_KEYS, SOUNDS,
} from './manifest.js';

const MAX_VOICES = 30;          // global simultaneous one-shot cap
const NOISE_SEC = 2;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volumes = { ...DEFAULT_VOLUMES };
    this._buffers = new Map();     // manifest id → AudioBuffer
    this._pending = new Map();     // manifest id → Promise
    this._exts = null;             // format preference per mime
    this._voices = [];             // active one-shots
    this._loops = new Map();       // manifest id → LoopVoice
    this.engine = new EngineAudio(this);
    this.spatial = null;
    this._music = { current: null };
    this._lastTrigger = new Map(); // id → ctx.time
    this._noiseBuf = null;
  }

  // ────────────────────────────────────────────────────────────
  // context + mixer
  // ────────────────────────────────────────────────────────────
  /** Create/resume the AudioContext. Must follow a user gesture. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return false; }
    const c = this.ctx;

    this.comp = c.createDynamicsCompressor();     // gentle glue, stops clip sums
    this.comp.threshold.value = -14;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;

    this.chMaster = c.createGain();
    this.chMaster.gain.value = this.enabled ? this.volumes.master : 0;
    this.chMaster.connect(this.comp);
    this.comp.connect(c.destination);

    for (const ch of CHANNELS) {
      if (ch === 'master') continue;
      const g = c.createGain();
      g.gain.value = this.volumes[ch];
      g.connect(this.chMaster);
      this[`ch${ch[0].toUpperCase()}${ch.slice(1)}`] = g;   // chMusic, chEngine, …
    }

    this.spatial = new Spatializer(c);
    this._detectFormats();
    this.preload();
    return true;
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  _detectFormats() {
    const a = document.createElement('audio');
    const can = (t) => { try { return !!a.canPlayType(t); } catch { return false; } };
    this._exts = {
      ogg: can('audio/ogg; codecs=opus') || can('audio/ogg; codecs=vorbis'),
      mp3: can('audio/mpeg'),
      wav: true,
    };
  }

  /** Resolve which file extension to fetch for a manifest entry. */
  resolveExt(entry) {
    for (const f of entry.formats) {
      if (f === 'wav') return 'wav';
      if (this._exts?.[f]) return f;
    }
    return entry.formats[entry.formats.length - 1];
  }

  // ────────────────────────────────────────────────────────────
  // loading
  // ────────────────────────────────────────────────────────────
  /** Decode one manifest sound (deduped, cached, never throws). */
  load(id) {
    const entry = SOUNDS[id];
    if (!entry) return Promise.resolve(null);
    if (this._buffers.has(id)) return Promise.resolve(this._buffers.get(id));
    if (this._pending.has(id)) return this._pending.get(id);
    const ext = this.resolveExt(entry);
    const url = `${AUDIO_BASE}/${entry.file}.${ext}`;
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.arrayBuffer(); })
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => { this._buffers.set(id, buf); this._pending.delete(id); return buf; })
      .catch(() => { this._pending.delete(id); return null; });
    this._pending.set(id, p);
    return p;
  }

  /** Preload the small, always-needed kit (UI clicks + door). */
  preload() {
    if (!this.ctx) return;
    for (const [id, e] of Object.entries(SOUNDS)) {
      if (e.preload) this.load(id);
    }
  }

  /** Warm an id list without blocking (used on game start). */
  warm(ids) { for (const id of ids) this.load(id); }

  /** Engine RPM layers for a profile config (EngineAudio). */
  loadEngineLayers(conf) {
    return Promise.all(conf.layers.map((L) => {
      const url = `${AUDIO_BASE}/${conf.file(L.id)}.wav`;
      if (this._buffers.has(`__eng:${url}`)) return this._buffers.get(`__eng:${url}`);
      const p = fetch(url)
        .then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.arrayBuffer(); })
        .then((ab) => this.ctx.decodeAudioData(ab))
        .then((buf) => { this._buffers.set(`__eng:${url}`, buf); return buf; })
        .catch(() => null);
      this._pending.set(`__eng:${url}`, p);
      return p;
    }));
  }

  /** Shared white-noise buffer for synth fallbacks. */
  noiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const c = this.ctx;
    const len = c.sampleRate * NOISE_SEC;
    this._noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this._noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return this._noiseBuf;
  }

  // ────────────────────────────────────────────────────────────
  // one-shots
  // ────────────────────────────────────────────────────────────
  /**
   * Play a sound. gain/rate scale the entry defaults; delay is
   * seconds from now. Respects per-sound pool + cooldown and the
   * global voice cap. Falls back to synthesis if the file is gone.
   */
  play(id, { gain = 1, rate = 1, delay = 0, channel } = {}) {
    if (!this.ctx || !this.enabled) return;
    const entry = SOUNDS[id];
    if (!entry) return;
    const now = this.ctx.currentTime + delay;
    if (!this._canTrigger(id, entry, now)) return;

    const buf = this._buffers.get(id);
    if (!buf && !this._pending.has(id)) this.load(id);   // warm for next time
    if (buf) this._spawnVoice(id, entry, buf, { gain, rate, when: now, channel });
    else this._synthOneShot(id, entry, { gain, rate, delay });
  }

  /**
   * Positional variant: the sound lives at world (x, z) with
   * optional source velocity for a Doppler shift. Culled by the
   * entry's max distance from the listener.
   */
  playAt(id, x, z, { gain = 1, rate = 1, velX = 0, velZ = 0, y = 1, channel } = {}) {
    if (!this.ctx || !this.enabled || !this.spatial) return;
    const entry = SOUNDS[id];
    if (!entry) return;
    const dist = this.spatial.distanceTo(x, z);
    if (dist > (entry.max || 80)) return;
    const doppler = Spatializer.dopplerRate(this.spatial.radialVelocity(x, z, velX, velZ));
    // closer sounds keep full level; distance attenuation is the panner's job
    this.play(id, { gain, rate: rate * doppler, channel });
    if (!this._buffers.get(id)) return;
    // re-route the newest voice of this id through a positioned panner
    const v = this._voices[this._voices.length - 1];
    if (v && v.id === id && !v.spatial) this._spatializeVoice(v, entry, x, y, z);
  }

  _canTrigger(id, entry, when) {
    const last = this._lastTrigger.get(id) || -Infinity;
    const cd = entry.cooldown ?? 0.04;
    if (when - last < cd) return false;
    const cap = entry.pool ?? 3;
    let n = 0;
    for (const v of this._voices) if (v.id === id) n++;
    if (n >= cap) return false;
    if (this._voices.length >= MAX_VOICES) return false;
    this._lastTrigger.set(id, when);
    return true;
  }

  _spawnVoice(id, entry, buf, { gain = 1, rate = 1, when, channel }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = (entry.gain ?? 1) * gain;
    src.connect(g);
    g.connect(this.channel(entry.channel, channel));
    const stopAt = when + buf.duration / rate + 0.05;
    src.start(when);
    src.stop(stopAt);
    const voice = { id, src, g, end: stopAt, spatial: null };
    src.onended = () => this._reapVoice(voice);
    this._voices.push(voice);
    return voice;
  }

  _spatializeVoice(voice, entry, x, y, z) {
    if (!this.spatial || !voice.g) return;
    try { voice.g.disconnect(); } catch {}
    const panner = this.spatial.acquirePanner(x, y, z, {
      refDistance: entry.ref ?? 8,
      maxDistance: entry.max ?? 180,
    }, this.channel(entry.channel));
    voice.g.connect(panner);
    voice.spatial = panner;
    const origReap = voice.src.onended;
    voice.src.onended = () => {
      this.spatial.releasePanner(panner);
      voice.spatial = null;
      origReap?.();
    };
  }

  _reapVoice(voice) {
    const i = this._voices.indexOf(voice);
    if (i >= 0) this._voices.splice(i, 1);
    if (voice.spatial) { this.spatial.releasePanner(voice.spatial); voice.spatial = null; }
  }

  /** Per-frame housekeeping (ended-voice sweep). */
  frame() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = this._voices.length - 1; i >= 0; i--) {
      if (this._voices[i].end < now - 0.5) this._reapVoice(this._voices[i]);
    }
  }

  channel(entryChannel, override) {
    const ch = override || entryChannel || 'sfx';
    return this[`ch${ch[0].toUpperCase()}${ch.slice(1)}`] || this.chSfx;
  }

  // ────────────────────────────────────────────────────────────
  // loops (single-instance, gain- or position-driven)
  // ────────────────────────────────────────────────────────────
  /** Get (and lazily start) the singleton loop for a sound id. */
  getLoop(id) {
    if (!this.ctx) return null;
    if (!this._loops.has(id)) this._loops.set(id, new LoopVoice(this, id));
    return this._loops.get(id);
  }

  /** Set a loop's intensity 0..1 (0 keeps it breathing at nil). */
  setLoop(id, intensity, smooth = 0.09) {
    this.getLoop(id)?.set(intensity, smooth);
  }

  /** Move a loop in the world (siren chase, etc). */
  moveLoop(id, x, y, z) {
    this.getLoop(id)?.setPosition(x, y, z);
  }

  stopLoop(id, fade = 0.2) {
    this.getLoop(id)?.stop(fade);
  }

  stopAllLoops(fade = 0.25) {
    for (const l of this._loops.values()) l.stop(fade);
    this._loops.clear();
    this._music.current = null;
  }

  // ────────────────────────────────────────────────────────────
  // music
  // ────────────────────────────────────────────────────────────
  /** Crossfade to a music loop ('menu' | 'game'); null stops all. */
  playMusic(which, fade = 1.2) {
    if (!this.ctx) return;
    for (const [id, l] of this._loops) {
      if (id.startsWith('music.') && id !== `music.${which}`) {
        l.stop(fade);
        this._loops.delete(id);
      }
    }
    if (!which) { this._music.current = null; return; }
    const id = `music.${which}`;
    this._music.current = id;
    this.load(id).then((buf) => {
      if (!buf || this._music.current !== id) return;
      const l = this.getLoop(id);
      l.ensurePublic();
      l.set(1, fade);
    });
  }

  pauseMusic() { this._loops.get(this._music.current)?.set(0.12, 0.4); }
  resumeMusic() { this._loops.get(this._music.current)?.set(1, 0.6); }

  // ────────────────────────────────────────────────────────────
  // settings
  // ────────────────────────────────────────────────────────────
  /** Apply channel volumes; accepts legacy keys (fx, amb). */
  setVolumes(v) {
    const next = { ...this.volumes };
    for (const [k, val] of Object.entries(v || {})) {
      const key = LEGACY_VOLUME_KEYS[k] || k;
      if (CHANNELS.includes(key) && Number.isFinite(+val)) next[key] = clamp(+val, 0, 1);
    }
    this.volumes = next;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const ch of CHANNELS) {
      if (ch === 'master') continue;
      this.channel(ch)?.gain.setTargetAtTime(next[ch], t, 0.05);
    }
    this.chMaster.gain.setTargetAtTime(this.enabled ? next.master : 0, t, 0.05);
  }

  /** Mute-all toggle (keeps the graph running for instant unmute). */
  setEnabled(on) {
    this.enabled = !!on;
    if (!this.ctx) return;
    this.chMaster.gain.setTargetAtTime(
      this.enabled ? this.volumes.master : 0, this.ctx.currentTime, 0.06);
  }

  /** Engine profile for the current vehicle. */
  setCarProfile(def, upgrades) { this.engine.setVehicle(def, upgrades); }

  // ────────────────────────────────────────────────────────────
  // teardown
  // ────────────────────────────────────────────────────────────
  stopAll(fade = 0.3) {
    this.stopAllLoops(fade);
    this.engine.stop();
  }

  // ────────────────────────────────────────────────────────────
  // synthesized fallbacks (used only when a file fails to load)
  // ────────────────────────────────────────────────────────────
  _beep(dest, freq, dur, type = 'square', vol = 0.06, slideTo = null, delay = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = c.createGain();
    const t0 = c.currentTime + delay;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }

  _noiseHit(dest, dur, freq, vol, type = 'lowpass', delay = 0) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    const t0 = c.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.2);
  }

  _synthOneShot(id, entry, { gain, delay }) {
    const dest = this.channel(entry.channel);
    const v = gain ?? 1;
    const table = {
      'ui.click': () => this._beep(dest, 720, 0.05, 'square', 0.04 * v, null, delay),
      'ui.hover': () => this._beep(dest, 880, 0.03, 'sine', 0.02 * v, null, delay),
      'ui.deny': () => this._beep(dest, 220, 0.15, 'square', 0.05 * v, null, delay),
      'economy.coin': () => { this._beep(dest, 1047, 0.07, 'sine', 0.05 * v, null, delay); this._beep(dest, 1568, 0.1, 'sine', 0.05 * v, null, delay + 0.07); },
      'mission.complete': () => [523, 659, 784, 1047].forEach((f, i) => this._beep(dest, f, 0.16, 'sine', 0.06 * v, null, delay + i * 0.1)),
      'mission.fail': () => this._beep(dest, 220, 0.4, 'sawtooth', 0.06 * v, 110, delay),
      'mission.checkpoint': () => { this._beep(dest, 988, 0.1, 'sine', 0.06 * v, null, delay); this._beep(dest, 1319, 0.14, 'sine', 0.05 * v, null, delay + 0.1); },
      'crash.light': () => this._noiseHit(dest, 0.15, 900, 0.18 * v, 'lowpass', delay),
      'crash.medium': () => { this._noiseHit(dest, 0.25, 900, 0.24 * v, 'lowpass', delay); this._beep(dest, 90, 0.18, 'sine', 0.18 * v, 45, delay); },
      'crash.heavy': () => { this._noiseHit(dest, 0.4, 700, 0.3 * v, 'lowpass', delay); this._beep(dest, 70, 0.3, 'sine', 0.24 * v, 34, delay); },
      'env.thunder1': () => { this._noiseHit(dest, 1.4, 220, 0.28 * v, 'lowpass', delay); this._beep(dest, 55, 1.1, 'sine', 0.14 * v, 32, delay); },
      'env.thunder2': () => this._noiseHit(dest, 1.6, 180, 0.26 * v, 'lowpass', delay),
      'env.thunder3': () => this._noiseHit(dest, 1.5, 200, 0.24 * v, 'lowpass', delay),
      'engine.start': () => this._noiseHit(dest, 0.8, 320, 0.2 * v, 'bandpass', delay),
      'engine.blowoff': () => this._noiseHit(dest, 0.4, 2800, 0.12 * v, 'bandpass', delay),
    };
    (table[id] || table['ui.click'])();
  }

  /** Gear-shift clunk — always synthesized (tiny + instant). */
  playShiftClunk() {
    if (!this.ctx || !this.enabled) return;
    this._noiseHit(this.chSfx, 0.06, 2200, 0.1, 'bandpass');
  }
}

// ══════════════════════════════════════════════════════════════
// LOOP VOICE — single long-running source per sound id
// ══════════════════════════════════════════════════════════════
class LoopVoice {
  constructor(mgr, id) {
    this.mgr = mgr;
    this.id = id;
    this.entry = SOUNDS[id];
    this.wantGain = 0;
    this.src = null;
    this.gainNode = null;
    this.panner = null;
    this.synth = null;
    this.stopping = false;
    mgr.load(id).then((buf) => {
      if (this.stopping) return;
      if (!buf) { this._ensureSynth(); return; }
      this._ensure(buf);
    });
  }

  /** Start immediately if the buffer is already decoded (music). */
  ensurePublic() {
    const buf = this.mgr._buffers.get(this.id);
    if (buf) this._ensure(buf);
  }

  _ensure(buf) {
    if (this.src || this.stopping || !this.mgr.ctx) return;
    const c = this.mgr.ctx;
    this.src = c.createBufferSource();
    this.src.buffer = buf;
    this.src.loop = true;
    this.gainNode = c.createGain();
    this.gainNode.gain.value = 0.0001;
    this.src.connect(this.gainNode);
    if (this.entry?.ref) {
      // spatial loop (siren): route through its own positioned panner
      this._routeSpatial(0, 1, 0);
    } else {
      this.gainNode.connect(this.mgr.channel(this.entry?.channel));
    }
    this.src.start(0, Math.random() * (buf.duration * 0.5));
    this.set(this.wantGain, 0.15);
  }

  _routeSpatial(x, y, z) {
    if (!this.mgr.spatial || !this.gainNode) return;
    if (this.panner) { try { this.gainNode.disconnect(); } catch {} }
    this.panner = this.mgr.spatial.acquirePanner(x, y, z, {
      refDistance: this.entry?.ref ?? 8,
      maxDistance: this.entry?.max ?? 180,
    }, this.mgr.channel(this.entry?.channel));
    this.gainNode.connect(this.panner);
  }

  /** Synth stand-in while the file loads / if it 404s. */
  _ensureSynth() {
    if (this.synth || this.stopping || !this.mgr.ctx) return;
    const c = this.mgr.ctx;
    const noiseIds = new Set(['tire.skid', 'tire.drift', 'tire.road', 'env.rain', 'env.wind', 'env.city_day', 'env.city_night', 'crash.scrape']);
    if (noiseIds.has(this.id)) {
      const src = c.createBufferSource();
      src.buffer = this.mgr.noiseBuffer();
      src.loop = true;
      const f = c.createBiquadFilter();
      const [type, freq, q] = {
        'tire.skid': ['bandpass', 950, 2.5], 'tire.drift': ['bandpass', 650, 1.8],
        'tire.road': ['lowpass', 320, 0.8], 'env.rain': ['highpass', 1400, 0.7],
        'env.wind': ['lowpass', 480, 0.8], 'env.city_day': ['lowpass', 190, 0.8],
        'env.city_night': ['lowpass', 150, 0.8], 'crash.scrape': ['bandpass', 900, 1.4],
      }[this.id] || ['bandpass', 800, 1];
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      this.gainNode = c.createGain(); this.gainNode.gain.value = 0.0001;
      src.connect(f); f.connect(this.gainNode);
      this.gainNode.connect(this.mgr.channel(this.entry?.channel));
      src.start();
      this.synth = src;
      this.set(this.wantGain, 0.3);
    }
  }

  /** Target intensity 0..1 → entry gain with smoothing. */
  set(intensity = 0, smooth = 0.09) {
    this.wantGain = clamp(intensity, 0, 1);
    if (!this.gainNode || !this.mgr.ctx) return;
    const peak = (this.entry?.gain ?? 1) * this.wantGain;
    this.gainNode.gain.setTargetAtTime(Math.max(peak, 0.0001), this.mgr.ctx.currentTime, smooth);
  }

  setPosition(x, y = 1, z = 0) {
    if (this.panner?.positionX) {
      const t = this.mgr.ctx.currentTime;
      this.panner.positionX.setTargetAtTime(x, t, 0.05);
      this.panner.positionY.setTargetAtTime(y, t, 0.05);
      this.panner.positionZ.setTargetAtTime(z, t, 0.05);
    } else if (this.panner?.setPosition) {
      this.panner.setPosition(x, y, z);
    } else if (this.gainNode) {
      this._routeSpatial(x, y, z);
    }
  }

  stop(fade = 0.2) {
    this.stopping = true;
    this.wantGain = 0;
    const t = this.mgr.ctx?.currentTime;
    if (this.gainNode && t !== undefined) {
      this.gainNode.gain.setTargetAtTime(0.0001, t, fade / 3);
    }
    this.mgr._loops.delete(this.id);
    const kill = () => {
      try { this.src?.stop(); } catch {}
      try { this.synth?.stop(); } catch {}
      if (this.panner) this.mgr.spatial?.releasePanner(this.panner);
      this.src = this.synth = this.panner = this.gainNode = null;
    };
    setTimeout(kill, fade * 1000 + 150);
  }
}
