// utils/audio.js — synthesized sound via Web Audio API. No external files.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this._musicTimer = 0;
  }
  ensure() {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }
  setEnabled(v) { this.enabled = v; if (v) this.ensure(); }
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); }

  // Core: oscillator + gain envelope.
  tone(freq, dur, type = "square", vol = 0.2, slideTo = null, dest = null) {
    if (!this.enabled) return;
    const a = this.ensure(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // Noise burst (for explosions, shotgun, footsteps).
  noise(dur, vol = 0.25, filter = 1200, dest = null) {
    if (!this.enabled) return;
    const a = this.ensure(); if (!a) return;
    const t = a.currentTime;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filter;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest || this.master);
    src.start(t);
  }

  // --- Specific sounds ---
  shoot(weaponId) {
    if (!this.enabled) return;
    switch (weaponId) {
      case "shotgun": this.noise(0.14, 0.32, 1600); this.tone(120, 0.1, "sawtooth", 0.12, 60); break;
      case "sniper": this.tone(900, 0.06, "square", 0.18, 200); this.noise(0.08, 0.18, 2400); break;
      case "pistol": this.tone(620, 0.05, "square", 0.13, 220); break;
      case "smg": this.tone(540, 0.04, "square", 0.1, 240); break;
      case "rifle": this.tone(700, 0.05, "square", 0.14, 220); break;
      default: this.tone(540, 0.05, "square", 0.12);
    }
  }
  hit() { this.tone(240, 0.05, "sawtooth", 0.1, 120); }
  headshot() { this.tone(900, 0.08, "triangle", 0.16, 1400); }
  reload() { this.tone(360, 0.05, "square", 0.08); setTimeout(() => this.tone(520, 0.05, "square", 0.08), 150); }
  empty() { this.tone(160, 0.04, "square", 0.07); }
  explosion() { this.noise(0.5, 0.5, 800); this.tone(90, 0.5, "sawtooth", 0.2, 40); }
  flashbang() { this.noise(0.6, 0.45, 4000); this.tone(2000, 0.4, "sine", 0.18, 200); }
  step() { this.noise(0.05, 0.06, 600); }
  roll() { this.noise(0.3, 0.14, 700); }
  uiClick() { this.tone(660, 0.04, "square", 0.08); }
  toast() { this.tone(880, 0.08, "triangle", 0.1, 1100); }
  missionDone() { [660, 880, 1180].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, "triangle", 0.14), i * 120)); }
  missionFail() { [440, 330, 220].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, "sawtooth", 0.14), i * 140)); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, "triangle", 0.16), i * 110)); }
  death() { this.noise(0.9, 0.4, 600); this.tone(160, 0.9, "sawtooth", 0.2, 50); }
  crash() { this.noise(0.2, 0.3, 1400); }
  pickup() { this.tone(990, 0.08, "triangle", 0.12, 1480); }
  siren() { this.tone(700, 0.3, "sine", 0.06, 500); }
  // Engine blip (RPM based): called periodically while driving.
  engineBlip(f) { this.tone(f, 0.04, "sawtooth", 0.04); }
  // Ambient city bed: occasional distant honk / hiss.
  ambient(dt) {
    this._musicTimer -= dt;
    if (this._musicTimer <= 0) {
      this._musicTimer = 4 + Math.random() * 6;
      if (Math.random() < 0.4) { this.tone(280, 0.25, "sawtooth", 0.05, 200); }
      else this.noise(0.4, 0.04, 500);
    }
  }
}
