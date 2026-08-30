// ══════════════════════════════════════════════════════════════
// ENGINE AUDIO — dynamic, RPM-mapped engine synthesis.
//
// Two blended paths so the engine is NEVER a static loop:
//  • File layers: 4 crossfaded RPM loops (idle/low/mid/high) per
//    vehicle profile, pitch-shifted with playbackRate so every
//    layer meets its neighbours at the SAME firing frequency.
//  • Synth core: periodic-wave oscillators + intake noise that
//    fill in instantly (before layers decode, or if files are
//    missing) and beef up the low end while files play.
//
// Responds to: RPM, throttle, speed, gear (shift cut + clunk),
// braking/engine braking, drifting/wheelspin (via rpm), nitro,
// vehicle type (per-car pitch + character), turbo (whistle +
// blow-off), rev limiter (stutter), lift-off backfires, damage
// (misfires), and the start/stop sequences.
// ══════════════════════════════════════════════════════════════
import { clamp, damp } from '../utils.js';
import { ENGINE_PROFILES, engineProfileFor } from './manifest.js';

const LAYER_HALF_WIDTH = 0.34;      // crossfade width around each layer centre
const STARTER_CATCH_SEC = 0.95;     // when the engine "catches" in engine.start
const RPM_MIN = 900, RPM_MAX = 7200;

export class EngineAudio {
  /** @param {import('./AudioManager.js').AudioManager} mgr */
  constructor(mgr) {
    this.mgr = mgr;
    this.state = 'off';             // off | starting | running
    this.profile = engineProfileFor(null);
    this._layers = null;            // [{src, gain, firingHz}]
    this._built = false;
    this._throttleS = 0;
    this._shiftT = 0;
    this._misfireT = 0;
    this._limiterPhase = 0;
    this._wasWOT = false;
    this._turboBoost = 0;
    this._loadPromise = null;
  }

  // ── vehicle setup ─────────────────────────────────────────
  /** Configure for a catalog vehicle (+ upgrades). (Re)loads loops. */
  setVehicle(def, upgrades = {}) {
    this.profile = engineProfileFor(def, upgrades);
    const conf = ENGINE_PROFILES[this.profile.profile];
    this._layerConf = conf;
    if (this._built) this._startLayers();
  }

  get firingHzFor() {
    return (rpmNorm) => (RPM_MIN + clamp(rpmNorm, 0, 1.06) * (RPM_MAX - RPM_MIN)) / 60 * (this._layerConf?.cyl || 4) / 2;
  }

  /** Raised-cosine crossfade window for a layer (pure, tested). */
  static layerWindow(rpm, center, halfWidth = LAYER_HALF_WIDTH) {
    const d = Math.abs(rpm - center);
    if (d >= halfWidth) return 0;
    return 0.5 * (1 + Math.cos((Math.PI * d) / halfWidth));
  }

  // ── graph ──────────────────────────────────────────────────
  _build() {
    if (this._built) return;
    const c = this.mgr.ctx;
    this._built = true;

    this.engMaster = c.createGain();
    this.engMaster.gain.value = 0;
    this.engFilter = c.createBiquadFilter();          // throttle "load" filter
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 500;
    this.engFilter.Q.value = 0.9;
    this.engFilter.connect(this.engMaster);
    this.engMaster.connect(this.mgr.chEngine);

    // synth core: firing harmonic wave + sub thump + intake hiss
    this.oscFire = c.createOscillator();
    this.oscFire.setPeriodicWave(this._fireWave());
    this.oscGain = c.createGain(); this.oscGain.gain.value = 0.35;
    this.oscFire.connect(this.oscGain); this.oscGain.connect(this.engFilter);
    this.oscFire.start();

    this.oscSub = c.createOscillator();
    this.oscSub.type = 'sine';
    this.subGain = c.createGain(); this.subGain.gain.value = 0.3 * (0.5 + this.profile.sub * 0.5);
    this.oscSub.connect(this.subGain); this.subGain.connect(this.engFilter);
    this.oscSub.start();

    this.intake = c.createBufferSource();
    this.intake.buffer = this.mgr.noiseBuffer();
    this.intake.loop = true;
    this.intakeFilter = c.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.frequency.value = 900; this.intakeFilter.Q.value = 0.8;
    this.intakeGain = c.createGain(); this.intakeGain.gain.value = 0;
    this.intake.connect(this.intakeFilter);
    this.intakeFilter.connect(this.intakeGain);
    this.intakeGain.connect(this.engFilter);
    this.intake.start();

    // turbo: high whistle whose pitch rides boost
    this.turboOsc = c.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 2800;
    this.turboFilter = c.createBiquadFilter();
    this.turboFilter.type = 'bandpass';
    this.turboFilter.frequency.value = 3100; this.turboFilter.Q.value = 6;
    this.turboGain = c.createGain(); this.turboGain.gain.value = 0;
    this.turboOsc.connect(this.turboFilter);
    this.turboFilter.connect(this.turboGain);
    this.turboGain.connect(this.engMaster);
    this.turboOsc.start();

    this._startLayers();
  }

  /** Combustion-pulse harmonic series → PeriodicWave. */
  _fireWave() {
    const N = 36;
    const real = new Float32Array(N + 1);
    const imag = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) {
      // 1/n rolloff with odd-harmonic emphasis = lumpy exhaust pulse train
      const odd = n % 2 === 1 ? 1 : 0.55;
      imag[n] = (1 / n ** 1.12) * odd;
    }
    return this.mgr.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  /** (Re)create the file layer voices for the current profile. */
  _startLayers() {
    this._destroyLayers();
    const conf = this._layerConf;
    if (!conf || !this.mgr.ctx) return;
    this._loadPromise = this.mgr.loadEngineLayers(conf).then((buffers) => {
      if (!buffers || this._layerConf !== conf) return;
      const c = this.mgr.ctx;
      this._layers = conf.layers.map((L, i) => {
        const buf = buffers[i];
        if (!buf) return null;
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const gain = c.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(this.engFilter);
        src.start(0, Math.random() * buf.duration * 0.5);  // desync layers
        return { src, gain, firingHz: (L.rpm / 60) * (conf.cyl / 2) };
      });
      return true;
    }).catch(() => {});
  }

  _destroyLayers() {
    if (!this._layers) return;
    for (const l of this._layers) {
      if (!l) continue;
      try { l.src.stop(); } catch { /* already stopped */ }
      try { l.src.disconnect(); l.gain.disconnect(); } catch {}
    }
    this._layers = null;
  }

  // ── sequences ──────────────────────────────────────────────
  /** Ignition: door thunk + starter crank, layers fade in on catch. */
  start() {
    if (!this.mgr.ensure()) return;
    this._build();
    if (this.state === 'running' || this.state === 'starting') return;
    this.state = 'starting';
    this.mgr.play('vehicle.door');
    this.mgr.play('engine.start', { gain: 0.9, delay: 0.28 });
    const t = this.mgr.ctx.currentTime;
    this.engMaster.gain.cancelScheduledValues(t);
    this.engMaster.gain.setTargetAtTime(0.9, t + STARTER_CATCH_SEC + 0.28, 0.25);
    setTimeout(() => { if (this.state === 'starting') this.state = 'running'; },
      (STARTER_CATCH_SEC + 0.35) * 1000);
  }

  /** Shutdown (exit car / wrecked): fall-off + shudder. */
  stop() {
    if (this.state === 'off') return;
    this.state = 'off';
    if (!this.mgr.ctx) return;
    this.mgr.play('engine.stop');
    const t = this.mgr.ctx.currentTime;
    this.engMaster.gain.cancelScheduledValues(t);
    this.engMaster.gain.setTargetAtTime(0, t, 0.18);
    this._wasWOT = false;
  }

  /** Gear change (auto or manual): throttle cut + clunk. */
  shift() {
    if (this.state !== 'running') return;
    this._shiftT = 0.13;
    this.mgr.playShiftClunk();
  }

  // ── main tick (called every frame from the game loop) ──────
  /**
   * @param {{rpm:number, throttle:number, brake:number, speed:number,
   *          gear:number, nitro:boolean, handbrake:boolean,
   *          airborne:boolean, health:number}} s
   */
  update(s, dt = 0.016) {
    if (!this.mgr.ctx || this.state === 'off') return;
    this._build?.();
    const c = this.mgr.ctx;
    const t = c.currentTime;
    const rpm = clamp(s.rpm, 0, 1.06);
    const p = this.profile;

    this._throttleS = damp(this._throttleS, s.throttle, 9, dt);
    if (this._shiftT > 0) this._shiftT -= dt;
    if (this._misfireT > 0) this._misfireT -= dt;

    const f = this.firingHzFor(rpm) * p.pitch;

    // ── rev limiter stutter ──
    let limiterDip = 1;
    if (rpm >= 0.99) {
      this._limiterPhase += dt * 14;
      limiterDip = (Math.sin(this._limiterPhase * Math.PI) > 0 ? 1 : 0.25);
    }

    // ── damage misfire ──
    if (s.health < 30 && this._misfireT <= 0 && Math.random() < dt * 1.2) {
      this._misfireT = 0.09;
      if (Math.random() < 0.25) this.mgr.play(Math.random() < 0.5 ? 'engine.backfire1' : 'engine.backfire2');
    }
    const misDip = this._misfireT > 0 ? 0.3 : 1;

    // ── shift cut ──
    const shiftDip = this._shiftT > 0 ? 0.28 : 1;

    // ── overall loudness: idle bed + throttle + rpm + nitro ──
    // during the starter sequence the one-shot owns the mix
    const runMul = this.state === 'starting' ? 0 : 1;
    const load = clamp(this._throttleS * 0.62 + rpm * 0.38, 0, 1.05);
    let g = (0.34 + load * 0.6 + (s.nitro ? 0.1 : 0)) * limiterDip * misDip * shiftDip * runMul;
    if (s.airborne) g *= 0.85;                       // free-rev in the air
    this.engMaster.gain.setTargetAtTime(g, t, 0.05);

    // ── synth core pitch ──
    this.oscFire.frequency.setTargetAtTime(f, t, 0.03);
    this.oscSub.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.oscGain.gain.setTargetAtTime((0.22 + this._throttleS * 0.3) * runMul, t, 0.06);
    this.intakeFilter.frequency.setTargetAtTime(500 + rpm * 2200, t, 0.08);
    this.intakeGain.gain.setTargetAtTime(this._throttleS * (0.05 + rpm * 0.1) * runMul, t, 0.08);

    // ── throttle "load" filter (open throttle = brighter exhaust) ──
    const cutoff = 420 + this._throttleS * 2300 + rpm * 1900 + (s.nitro ? 900 : 0);
    this.engFilter.frequency.setTargetAtTime(cutoff, t, 0.07);

    // ── file layers: crossfade + pitch-align to the same firing Hz ──
    if (this._layers) {
      let wSum = 0;
      const wins = this._layers.map((l, i) => {
        if (!l) return 0;
        const w = EngineAudio.layerWindow(rpm, this._layerConf.layers[i].center);
        wSum += w;
        return w;
      });
      for (let i = 0; i < this._layers.length; i++) {
        const l = this._layers[i];
        if (!l) continue;
        const w = wSum > 0 ? wins[i] / wSum : 0;
        const rate = clamp((f / l.firingHz), 0.45, 1.9);
        l.src.playbackRate.setTargetAtTime(rate, t, 0.05);
        l.gain.gain.setTargetAtTime(w * (0.85 + this._throttleS * 0.3) * runMul, t, 0.06);
      }
    }

    // ── turbo: spool with load, blow off on throttle lift ──
    const boostTarget = clamp(this._throttleS * rpm * 1.35, 0, 1);
    this._turboBoost = damp(this._turboBoost, boostTarget, 2.2, dt);
    const wasBoost = this._turboBoost;
    if (this._wasWOT && s.throttle < 0.15 && wasBoost > 0.45) {
      this.mgr.play('engine.blowoff', { gain: clamp(wasBoost, 0.3, 1) });
      this._turboBoost *= 0.3;
    }
    this._wasWOT = s.throttle > 0.6;
    this.turboOsc.frequency.setTargetAtTime(2400 + this._turboBoost * 2400 + rpm * 700, t, 0.08);
    this.turboGain.gain.setTargetAtTime(
      this._turboBoost * 0.045 * p.turbo * (this.state === 'running' ? 1 : 0), t, 0.09);

    // ── lift-off crackle from high RPM ──
    if (this._prevThrottle > 0.55 && s.throttle < 0.12 && rpm > 0.6 && Math.random() < 0.5) {
      this.mgr.play(Math.random() < 0.5 ? 'engine.backfire1' : 'engine.backfire2', { gain: 0.5 });
    }
    this._prevThrottle = s.throttle;
  }

  /** Pause/menu: duck to silence but keep the graph warm. */
  suspend() {
    if (!this.mgr.ctx) return;
    this.engMaster?.gain.setTargetAtTime(0, this.mgr.ctx.currentTime, 0.12);
  }
  resume() {
    if (this.state === 'running' && this.engMaster) {
      this.engMaster.gain.setTargetAtTime(0.6, this.mgr.ctx.currentTime, 0.2);
    }
  }

  destroy() {
    this._destroyLayers();
    try { this.oscFire?.stop(); this.oscSub?.stop(); this.turboOsc?.stop(); this.intake?.stop(); } catch {}
    this._built = false;
  }
}
