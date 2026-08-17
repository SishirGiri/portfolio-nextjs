// ════════════════════════════════════════════
// AUDIO — fully synthesized WebAudio engine.
// Channels: engine / fx / music / ambience with
// independent volume controls. No audio assets.
// ════════════════════════════════════════════
import { clamp, lerp } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volumes = { music: 0.45, engine: 0.8, fx: 0.9, amb: 0.55 };
    this._carProfile = { base: 72, range: 150, sub: 0.5 };
    this._musicOn = false;
    this._musicTimer = null;
    this._hornOn = false;
    this._sirenOn = false;
  }

  /** Must be called from a user gesture at least once. */
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(c.destination);

    this.chEngine = c.createGain(); this.chEngine.gain.value = this.volumes.engine;
    this.chFx = c.createGain();     this.chFx.gain.value = this.volumes.fx;
    this.chMusic = c.createGain();  this.chMusic.gain.value = this.volumes.music;
    this.chAmb = c.createGain();    this.chAmb.gain.value = this.volumes.amb;
    for (const ch of [this.chEngine, this.chFx, this.chMusic, this.chAmb]) ch.connect(this.master);

    this._buildEngine();
    this._buildLoops();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.chEngine.gain.setTargetAtTime(this.volumes.engine, t, 0.05);
    this.chFx.gain.setTargetAtTime(this.volumes.fx, t, 0.05);
    this.chMusic.gain.setTargetAtTime(this.volumes.music, t, 0.05);
    this.chAmb.gain.setTargetAtTime(this.volumes.amb, t, 0.05);
  }

  // ───────── Engine: layered oscillators + intake noise ─────────
  _buildEngine() {
    const c = this.ctx;
    this.engGain = c.createGain(); this.engGain.gain.value = 0;
    this.engFilter = c.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 900;
    this.engGain.connect(this.engFilter);
    this.engFilter.connect(this.chEngine);

    this.oscA = c.createOscillator(); this.oscA.type = 'sawtooth';
    this.oscB = c.createOscillator(); this.oscB.type = 'square';
    this.oscC = c.createOscillator(); this.oscC.type = 'sawtooth'; this.oscC.detune.value = 14;
    const gA = c.createGain(); gA.gain.value = 0.5;
    const gB = c.createGain(); gB.gain.value = 0.32;
    const gC = c.createGain(); gC.gain.value = 0.22;
    this.oscA.connect(gA); this.oscB.connect(gB); this.oscC.connect(gC);
    gA.connect(this.engGain); gB.connect(this.engGain); gC.connect(this.engGain);
    this.oscA.start(); this.oscB.start(); this.oscC.start();

    // intake / turbo whoosh tied to rpm
    const n = this._noiseSource();
    this.intakeFilter = c.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.frequency.value = 400; this.intakeFilter.Q.value = 1.2;
    this.intakeGain = c.createGain(); this.intakeGain.gain.value = 0;
    n.connect(this.intakeFilter); this.intakeFilter.connect(this.intakeGain);
    this.intakeGain.connect(this.chEngine);
  }

  setCarProfile(p) { this._carProfile = p; }

  /** rpm: 0..1 normalized, load: 0..1 throttle, speed: units/s, nitro bool */
  engineTick(rpm, load, speed, nitro) {
    if (!this.ctx) return;
    const { base, range, sub } = this._carProfile;
    const f = base + rpm * range;
    const t = this.ctx.currentTime;
    this.oscA.frequency.setTargetAtTime(f, t, 0.03);
    this.oscB.frequency.setTargetAtTime(f * 0.5 * (1 + sub * 0.2), t, 0.03);
    this.oscC.frequency.setTargetAtTime(f * (nitro ? 1.5 : 1.005), t, 0.03);
    const g = 0.02 + load * 0.055 + rpm * 0.03 + (nitro ? 0.02 : 0);
    this.engGain.gain.setTargetAtTime(g, t, 0.06);
    this.engFilter.frequency.setTargetAtTime(500 + rpm * 2400 + load * 700, t, 0.08);
    this.intakeFilter.frequency.setTargetAtTime(300 + rpm * 1900, t, 0.08);
    this.intakeGain.gain.setTargetAtTime(rpm * load * 0.05, t, 0.1);
  }

  engineOff() {
    if (!this.ctx) return;
    this.engGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    this.intakeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  // ───────── Persistent loops: skid, wind, rain, ambience ─────────
  _noiseSource() {
    const c = this.ctx;
    if (!this._noiseBuf) {
      const len = c.sampleRate * 2;
      this._noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true; src.start();
    return src;
  }

  _buildLoops() {
    const c = this.ctx;
    // skid
    const skidN = this._noiseSource();
    const skidF = c.createBiquadFilter(); skidF.type = 'bandpass';
    skidF.frequency.value = 950; skidF.Q.value = 2.5;
    this.skidGain = c.createGain(); this.skidGain.gain.value = 0;
    skidN.connect(skidF); skidF.connect(this.skidGain); this.skidGain.connect(this.chFx);
    // wind
    const windN = this._noiseSource();
    const windF = c.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 480;
    this.windGain = c.createGain(); this.windGain.gain.value = 0;
    windN.connect(windF); windF.connect(this.windGain); this.windGain.connect(this.chFx);
    // rain
    const rainN = this._noiseSource();
    const rainF = c.createBiquadFilter(); rainF.type = 'highpass'; rainF.frequency.value = 1400;
    this.rainGain = c.createGain(); this.rainGain.gain.value = 0;
    rainN.connect(rainF); rainF.connect(this.rainGain); this.rainGain.connect(this.chAmb);
    // city ambience
    const ambN = this._noiseSource();
    const ambF = c.createBiquadFilter(); ambF.type = 'lowpass'; ambF.frequency.value = 190;
    this.ambGain = c.createGain(); this.ambGain.gain.value = 0.05;
    ambN.connect(ambF); ambF.connect(this.ambGain); this.ambGain.connect(this.chAmb);
  }

  skid(amount) {
    if (!this.ctx) return;
    this.skidGain.gain.setTargetAtTime(clamp(amount, 0, 1) * 0.16, this.ctx.currentTime, 0.05);
  }
  wind(speed) {
    if (!this.ctx) return;
    this.windGain.gain.setTargetAtTime(clamp(speed / 70, 0, 1) * 0.11, this.ctx.currentTime, 0.15);
  }
  rain(amount) {
    if (!this.ctx) return;
    this.rainGain.gain.setTargetAtTime(clamp(amount, 0, 1) * 0.14, this.ctx.currentTime, 0.4);
  }
  ambience(level) {
    if (!this.ctx) return;
    this.ambGain.gain.setTargetAtTime(0.03 + level * 0.04, this.ctx.currentTime, 0.5);
  }

  // ───────── One-shots ─────────
  _env(dest, peak, attack, decay, when = 0) {
    const c = this.ctx;
    const g = c.createGain();
    const t0 = c.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(dest);
    return { g, t0 };
  }

  _beep(freq, dur, type = 'square', vol = 0.08, slideTo = null) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    const { g, t0 } = this._env(this.chFx, vol, 0.005, dur);
    o.connect(g);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }

  _noiseBurst(dur, filterFreq, vol, type = 'lowpass') {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx;
    const src = this._noiseSource();
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    const { g, t0 } = this._env(this.chFx, vol, 0.004, dur);
    src.connect(f); f.connect(g);
    src.stop(t0 + dur + 0.2);
  }

  click() { this._beep(720, 0.05, 'square', 0.045); }
  tick() { this._beep(980, 0.03, 'square', 0.028); }   // indicator relay
  uiHover() { this._beep(880, 0.03, 'sine', 0.02); }
  success() {
    this._beep(523, 0.1, 'sine', 0.09); this._beep(659, 0.1, 'sine', 0.09, null);
    setTimeout(() => this._beep(784, 0.16, 'sine', 0.1), 110);
    setTimeout(() => this._beep(1047, 0.22, 'sine', 0.09), 240);
  }
  fail() { this._beep(220, 0.3, 'sawtooth', 0.09, 110); }
  checkpoint() { this._beep(988, 0.1, 'sine', 0.08); this._beep(1319, 0.14, 'sine', 0.07); }
  gearShift() { this._noiseBurst(0.06, 2400, 0.05, 'bandpass'); }
  crash(mag) {
    const m = clamp(mag, 0.2, 1);
    this._noiseBurst(0.22 * m + 0.06, 900, 0.22 * m);
    this._beep(90, 0.16 * m + 0.05, 'sine', 0.2 * m, 45);
  }
  thunder() {
    this._noiseBurst(1.4, 220, 0.3);
    this._beep(55, 1.1, 'sine', 0.16, 32);
  }
  splash() { this._noiseBurst(0.5, 800, 0.18); }
  refuelTick() { this._beep(1200, 0.04, 'sine', 0.03); }
  money() { this._beep(1047, 0.07, 'sine', 0.07); setTimeout(() => this._beep(1568, 0.1, 'sine', 0.06), 70); }

  // ───────── Horn (latched) ─────────
  horn(on) {
    if (!this.ctx || on === this._hornOn) return;
    this._hornOn = on;
    if (on) {
      const c = this.ctx;
      this.hornOscs = [];
      for (const f of [400, 505]) {
        const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
        const g = c.createGain(); g.gain.value = 0.05;
        o.connect(g); g.connect(this.chFx); o.start();
        this.hornOscs.push({ o, g });
      }
    } else if (this.hornOscs) {
      for (const { o } of this.hornOscs) { try { o.stop(); } catch {} }
      this.hornOscs = null;
    }
  }

  // AI car horn (short)
  aiHorn(dist) {
    const v = clamp(1 - dist / 60, 0, 1) * 0.05;
    if (v <= 0.004) return;
    this._beep(370, 0.18, 'square', v);
  }

  // ───────── Siren (latched, intensity by distance) ─────────
  siren(on, intensity = 1) {
    if (!this.ctx) return;
    if (on && !this._sirenOn) {
      const c = this.ctx;
      this.sirenOsc = c.createOscillator(); this.sirenOsc.type = 'triangle';
      this.sirenLfo = c.createOscillator(); this.sirenLfo.frequency.value = 1.6;
      this.sirenLfoGain = c.createGain(); this.sirenLfoGain.gain.value = 140;
      this.sirenGain = c.createGain(); this.sirenGain.gain.value = 0;
      this.sirenOsc.frequency.value = 740;
      this.sirenLfo.connect(this.sirenLfoGain);
      this.sirenLfoGain.connect(this.sirenOsc.frequency);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.chFx);
      this.sirenOsc.start(); this.sirenLfo.start();
      this._sirenOn = true;
    }
    if (this._sirenOn) {
      const v = on ? clamp(intensity, 0, 1) * 0.075 : 0;
      this.sirenGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
      if (!on) {
        const osc = this.sirenOsc, lfo = this.sirenLfo;
        setTimeout(() => { try { osc.stop(); lfo.stop(); } catch {} }, 500);
        this._sirenOn = false;
      }
    }
  }

  // ───────── Generative music (synthwave-ish loop) ─────────
  music(on) {
    this._musicOn = on;
    if (!on && this._musicTimer) { this._musicTimer = null; }
  }

  /** Called from the game loop to schedule bars ahead. */
  musicPump(now) {
    if (!this.ctx || !this._musicOn || !this.enabled) return;
    if (this._nextBar === undefined) this._nextBar = now;
    if (now < this._nextBar) return;
    const barLen = 60 / 96 * 4; // 96 bpm
    this._scheduleBar(this._nextBar, this._barIdx = (this._barIdx || 0) + 1);
    this._nextBar += barLen;
    if (this._nextBar < now) this._nextBar = now + barLen; // catch up after pause
  }

  _scheduleBar(t0, bar) {
    const c = this.ctx;
    const roots = [110, 87.31, 130.81, 98]; // Am F C G
    const root = roots[(bar - 1) % 4];
    const spb = 60 / 96; // seconds per beat
    const at = (b) => t0 + b * spb;

    // pad chord
    for (const mult of [1, 1.5, 2]) {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = root * mult; o.detune.value = (mult - 1) * 6;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 750;
      const g = c.createGain();
      const start = at(0), end = at(4);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.016, start + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, end);
      o.connect(f); f.connect(g); g.connect(this.chMusic);
      o.start(start); o.stop(end + 0.1);
    }
    // bass eighths
    for (let i = 0; i < 8; i++) {
      if (i === 3 || (bar % 2 === 0 && i === 6)) continue;
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = root / 2;
      const g = c.createGain();
      const s = at(i / 2);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.045, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      o.connect(g); g.connect(this.chMusic);
      o.start(s); o.stop(s + 0.3);
    }
    // hats on 8ths (quiet)
    for (let i = 0; i < 8; i++) {
      const src = this._noiseSource();
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = c.createGain();
      const s = at(i / 2);
      const v = i % 2 ? 0.012 : 0.02;
      g.gain.setValueAtTime(v, s);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.05);
      src.connect(f); f.connect(g); g.connect(this.chMusic);
      src.stop(s + 0.08);
    }
    // kick on quarters
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator(); o.type = 'sine';
      const s = at(i);
      o.frequency.setValueAtTime(120, s);
      o.frequency.exponentialRampToValueAtTime(42, s + 0.12);
      const g = c.createGain();
      g.gain.setValueAtTime(0.08, s);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      o.connect(g); g.connect(this.chMusic);
      o.start(s); o.stop(s + 0.3);
    }
  }
}
