// ══════════════════════════════════════════════════════════════
// AUDIO — game-facing façade over the audio/ subsystem.
//
// The heavy lifting lives in src/audio/:
//   audio/AudioManager.js   mixer, loading, voices, loops, music
//   audio/EngineAudio.js    dynamic RPM engine system
//   audio/Spatializer.js    3D pan / distance / Doppler
//   audio/manifest.js       every sound + channel + file mapping
//
// This module maps GAME EVENTS to sounds: throttle→engine RPM,
// brake→squeal, drift→scrub, collision→impact, speed→wind,
// rain→ambience, mission flow→stings, purchases→register…
// ══════════════════════════════════════════════════════════════
import { clamp } from './utils.js';
import { AudioManager } from './audio/AudioManager.js';

export class GameAudio {
  constructor() {
    this.mgr = new AudioManager();
    this._skidOnsetLatch = false;
    this._hornOn = false;
    this._sirenOn = false;
    this._ambNight = null;
    this._v3 = null;                 // lazy THREE-free forward vector
  }

  get ctx() { return this.mgr.ctx; }

  // ── lifecycle ─────────────────────────────────────────────
  ensure() { return this.mgr.ensure(); }
  setEnabled(on) { this.mgr.setEnabled(on); }
  setVolumes(v) { this.mgr.setVolumes(v); }
  setCarProfile(def, upgrades) { this.mgr.setCarProfile(def, upgrades); }
  frame() { this.mgr.frame(); }

  /**
   * Sync the 3D listener to the render camera (position + forward).
   * Accepts a THREE.Camera or a plain {position, getWorldDirection}.
   */
  updateListener(camera, dt = 0.016) {
    if (!this.mgr.ctx || !this.mgr.spatial || !camera) return;
    const p = camera.position;
    if (!this._v3) {
      // Duck-typed THREE.Vector3: three's Camera.getWorldDirection calls
      // target.set(...).normalize() on it, so it must implement both.
      this._v3 = {
        x: 0, y: 0, z: -1,
        set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
        normalize() {
          const l = Math.hypot(this.x, this.y, this.z) || 1;
          this.x /= l; this.y /= l; this.z /= l; return this;
        },
      };
    }
    if (typeof camera.getWorldDirection === 'function') {
      try {
        const d = camera.getWorldDirection(this._v3);
        if (d && d !== this._v3) { this._v3.x = d.x; this._v3.y = d.y; this._v3.z = d.z; }
      } catch { /* keep last known forward — audio must never crash the game */ }
    }
    this.mgr.spatial.updateListener(
      { x: p.x, y: p.y, z: p.z },
      { x: this._v3.x, y: this._v3.y, z: this._v3.z },
      dt,
    );
  }

  // ── engine ────────────────────────────────────────────────
  engineStart() { this.mgr.engine.start(); }
  engineStop() { this.mgr.engine.stop(); }
  engineSuspend() { this.mgr.engine.suspend(); }
  engineResume() { this.mgr.engine.resume(); }
  gearShift() { this.mgr.engine.shift(); }

  /** Rich per-frame engine state (see EngineAudio.update). */
  engineUpdate(s, dt) { this.mgr.engine.update(s, dt); }

  /** Legacy 4-arg tick (kept so old call sites keep working). */
  engineTick(rpm, throttle, speed, nitro) {
    this.mgr.engine.update({ rpm, throttle, brake: 0, speed, gear: 1, nitro: !!nitro, health: 100 });
  }
  engineOff() { this.mgr.engine.suspend(); }

  // ── tires ─────────────────────────────────────────────────
  /**
   * Tire audio from slip state. braking squeal and wheelspin use
   * the locked-wheel squeal; sideways slip / handbrake use the
   * deeper drift scrub; a screech onset fires when grip first breaks.
   */
  tires({ slip = 0, speed = 0, braking = false, handbrake = false, wheelspin = 0 } = {}) {
    const moving = Math.abs(speed) > 4;
    const sideways = clamp((slip - 3) / 8, 0, 1);
    const sqDrag = braking ? clamp((Math.abs(speed) - 12) / 26, 0, 1) : 0;
    const squeal = moving ? clamp(Math.max(sqDrag, wheelspin), 0, 1) : 0;
    const drift = moving ? clamp(Math.max(sideways, handbrake ? clamp(Math.abs(speed) / 18, 0, 1) * 0.9 : 0), 0, 1) : 0;

    // onset chirp when grip first breaks at speed
    const breakingGrip = (sideways > 0.28 || squeal > 0.3) && moving;
    if (breakingGrip && !this._skidOnsetLatch) this.mgr.play('tire.screech_onset', { gain: 0.7 });
    this._skidOnsetLatch = breakingGrip;

    this.mgr.setLoop('tire.skid', squeal * 0.9);
    this.mgr.setLoop('tire.drift', drift * 0.95);
    // road rumble rides speed
    this.mgr.setLoop('tire.road', clamp(Math.abs(speed) / 55, 0, 1) * 0.8, 0.2);
  }

  /** Wall-grind scrape (intensity 0..1, decays fast when released). */
  setScrape(intensity) { this.mgr.setLoop('crash.scrape', clamp(intensity, 0, 1) * 0.9, 0.05); }

  // ── collisions ────────────────────────────────────────────
  /** Impact at the player's car (mag 0..1). */
  crash(mag) { this.crashAt(mag, null, null); }

  /** Positional impact: pass the world contact point when we have it. */
  crashAt(mag, x, z, { glass = false } = {}) {
    const m = clamp(mag, 0.05, 1);
    const id = m > 0.62 ? 'crash.heavy' : m > 0.3 ? 'crash.medium' : 'crash.light';
    const opts = { gain: 0.55 + m * 0.55 };
    if (x !== null && x !== undefined && z !== null && z !== undefined) this.mgr.playAt(id, x, z, opts);
    else this.mgr.play(id, opts);
    if (glass && m > 0.45) {
      if (x !== undefined && x !== null) this.mgr.playAt('crash.glass', x, z, { gain: 0.7 });
      else this.mgr.play('crash.glass', { gain: 0.7 });
    }
  }

  /** Hard landing thud (ramp jumps). */
  landing(impact, x, z) {
    if (x !== undefined) this.mgr.playAt('crash.thud', x, z ?? 0, { gain: clamp(impact / 10, 0.2, 1) });
    else this.mgr.play('crash.thud', { gain: clamp(impact / 10, 0.2, 1) });
  }

  // ── horn / sirens / traffic ───────────────────────────────
  horn(on) {
    if (on === this._hornOn) return;
    this._hornOn = on;
    if (on) this.mgr.getLoop('horn.player')?.set(1, 0.02);
    else this.mgr.stopLoop('horn.player', 0.08);
  }

  /** AI driver lean on the horn — positional. */
  aiHorn(x, z, dist, style = 'car') {
    const id = (style === 'bus' || style === 'truck') ? 'horn.ai_truck' : 'horn.ai_car';
    if (dist > 90) return;
    this.mgr.playAt(id, x, z, { gain: clamp(1 - dist / 90, 0.15, 1) });
  }

  /**
   * Police siren: latched, positioned at the nearest pursuer and
   * repositioned every frame so it chases through the stereo field.
   */
  siren(on, x = 0, z = 0, intensity = 1) {
    if (on && !this._sirenOn) {
      this._sirenOn = true;
      this.mgr.play('siren.burst');
      const l = this.mgr.getLoop('siren.wail');
      l?.setPosition(x, 1, z);
      l?.set(clamp(intensity, 0.15, 1), 0.3);
    } else if (this._sirenOn) {
      if (on) {
        this.mgr.moveLoop('siren.wail', x, 1, z);
        this.mgr.setLoop('siren.wail', clamp(intensity, 0.15, 1), 0.25);
      } else {
        this._sirenOn = false;
        this.mgr.stopLoop('siren.wail', 0.4);
      }
    }
  }

  /** Nearby traffic fly-by whoosh (positional + Doppler). */
  trafficPass(x, z, velX, velZ) {
    this.mgr.playAt('env.traffic_pass', x, z, { velX, velZ });
  }

  // ── environment ───────────────────────────────────────────
  wind(speed) { this.mgr.setLoop('env.wind', clamp(speed / 62, 0, 1) * 0.9, 0.25); }
  rain(amount) { this.mgr.setLoop('env.rain', clamp(amount, 0, 1), 0.5); }
  thunder() { this.mgr.play(`env.thunder${1 + Math.floor(Math.random() * 3)}`); }
  splash(x, z) {
    if (x !== undefined) this.mgr.playAt('env.splash', x, z, { gain: 0.7 });
    else this.mgr.play('env.splash', { gain: 0.7 });
  }

  /** City bed; pass 0..1 night factor for the day/night crossfade. */
  ambience(nightFactor) {
    const night = nightFactor > 0.5;
    if (night !== this._ambNight) {
      this._ambNight = night;
      // crossfade the two beds
      this.mgr.setLoop('env.city_day', night ? 0 : 0.75, 2.5);
      this.mgr.setLoop('env.city_night', night ? 0.7 : 0, 2.5);
    }
  }

  // ── vehicle life ──────────────────────────────────────────
  door() { this.mgr.play('vehicle.door'); }

  // ── mission flow ──────────────────────────────────────────
  missionStart() { this.mgr.play('mission.start'); }
  countdown(final = false) { this.mgr.play(final ? 'mission.go' : 'mission.countdown'); }
  checkpoint() { this.mgr.play('mission.checkpoint'); }
  missionComplete() { this.mgr.play('mission.complete'); }
  gameOver() { this.mgr.play('mission.fail'); }
  levelUp() { this.mgr.play('mission.level_up'); }
  busted() { this.mgr.play('mission.busted'); this.mgr.play('vehicle.buzzer'); }

  // ── economy / rewards ─────────────────────────────────────
  coin() { this.mgr.play('economy.coin'); }
  purchase() { this.mgr.play('economy.purchase'); this.mgr.play('economy.coin', { delay: 0.15 }); }
  upgrade() { this.mgr.play('economy.upgrade'); }
  refuel() { this.mgr.play('economy.refuel'); }
  deny() { this.mgr.play('ui.deny'); }

  // ── UI ────────────────────────────────────────────────────
  click() { this.mgr.play('ui.click'); }
  hover() { this.mgr.play('ui.hover'); }
  back() { this.mgr.play('ui.back'); }
  toggle(on) { this.mgr.play(on ? 'ui.toggle_on' : 'ui.toggle_off'); }
  slider() { this.mgr.play('ui.slider'); }
  menuTransition() { this.mgr.play('ui.menu_transition'); }
  tick() { this.mgr.play('ui.hover'); }       // indicator relay
  uiHover() { this.mgr.play('ui.hover'); }

  // legacy aliases
  success() { this.missionComplete(); }
  fail() { this.gameOver(); }
  money() { this.coin(); }
  refuelTick() { this.refuel(); }

  // ── music ─────────────────────────────────────────────────
  music(on) { this.mgr.playMusic(on ? 'game' : null); }
  menuMusic(on) { this.mgr.playMusic(on ? 'menu' : null); }
  pauseMusic() { this.mgr.pauseMusic(); }
  resumeMusic() { this.mgr.resumeMusic(); }

  // ── teardown ──────────────────────────────────────────────
  stopAll() {
    this.mgr.stopAll();
    this._sirenOn = false;
    this._hornOn = false;
    this._skidOnsetLatch = false;
  }
}

/** Back-compat name for the pre-upgrade import. */
export const AudioEngine = GameAudio;
