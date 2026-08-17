// ════════════════════════════════════════════════════════
// GAME — main loop: player physics + on-foot mode, collisions,
// fuel/temps, police integration, day/night + weather, rain
// particles, particles (smoke/sparks), 5 cameras, HUD
// (speedo canvas, gauges, minimap, wanted, prompts), audio
// glue, save/load + v1 migration, mission flow.
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import {
  CAR_BY_ID, CAMERA, COLORS, ECONOMY, MISSIONS, QUALITY_PRESETS,
  SAVE_KEY, SAVE_KEY_V1, STATS, TIME, WEATHER_PHASES, WORLD,
  defaultSave,
} from './config.js';
import { buildCharacter } from './vehicles.js';
import {
  clamp, lerp, damp, rand, circleAABB, fmtTime, fmtClock, fmtMoney, normAngle,
} from './utils.js';

const CAM_MODES = ['chase', 'close', 'hood', 'cockpit', 'cine'];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.paused = false;
    this.mapOpen = false;
    this.mode = 'menu';            // menu | play | free | paused
    this.cameraMode = 0;
    this.onFoot = false;
    this.cruise = false;

    this.fuel = 100;
    this.dayTime = TIME.startHour / 24;
    this.weather = { idx: 0, t: 0, rain: 0, fogFar: 1, label: 'Clear', thunderT: 0, flash: 0 };
    this.wetness = 0;
    this.toastTimer = 0;
    this.collisionCooldown = 0;
    this.saveTimer = 0;
    this._shake = 0;
    this._cinePoint = new THREE.Vector3();
    this._cineT = 0;
    this._smokeT = 0;
    this.roamEvents = [];          // active free-roam event markers
    this._routeTimer = 0;
    this._recalcToastCd = 0;

    // UI hooks assigned by main.js
    this.ui = {
      onComplete: () => {}, onFail: () => {}, onBusted: () => {},
      onPrompt: () => {}, onPause: () => {}, onMap: () => {}, onToast: () => {},
      onLevelUp: () => {}, onRoamDone: () => {},
    };
    this.save = this._loadSave();
    this._loop = this._loop.bind(this);
  }

  init(ctx) {
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.renderer = ctx.renderer;
    this.city = ctx.city;
    this.car = ctx.car;
    this.traffic = ctx.traffic;
    this.peds = ctx.peds;
    this.police = ctx.police;
    this.missions = ctx.missions;
    this.navmap = ctx.navmap;
    this.audio = ctx.audio;
    this.input = ctx.input;
    this.setQuality(ctx.quality || 'medium');

    // lights
    this.ambient = new THREE.AmbientLight(0x8fa8c8, 0.6);
    this.hemi = new THREE.HemisphereLight(0x9fc3ea, 0x27402e, 0.35);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sun.position.set(60, 90, 40);
    if (this.qual.shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(this.qual.shadowSize, this.qual.shadowSize);
      const sc = this.sun.shadow.camera;
      sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
      sc.near = 10; sc.far = 300;
      this.sun.shadow.bias = -0.0004;
    }
    this.scene.add(this.ambient, this.hemi, this.sun, this.sun.target);

    // headlight spotlights (player)
    this.headL = new THREE.SpotLight(0xfff2c0, 0, 55, Math.PI / 6.5, 0.45, 1.4);
    this.headR = new THREE.SpotLight(0xfff2c0, 0, 55, Math.PI / 6.5, 0.45, 1.4);
    this.scene.add(this.headL, this.headR);

    // rain
    this._initRain();
    this._initParticles();
    this._initSkidmarks();

    // on-foot character
    this.character = buildCharacter(0x38bdf8);
    this.character.visible = false;
    this.scene.add(this.character);
    this.footState = { x: 0, z: 0, heading: 0, speed: 0 };

    // hud refs
    const $ = (id) => document.getElementById(id);
    this.hud = {
      wrap: $('hud'), money: $('hud-money'), level: $('hud-level'), xpFill: $('hud-xp-fill'),
      clock: $('hud-clock'), weather: $('hud-weather'),
      missionName: $('hud-mission'), objective: $('hud-objective'),
      distance: $('hud-distance'), timerWrap: $('hud-timer'), timer: $('hud-timer-text'),
      speedo: $('speedo'), minimap: $('minimap'),
      fuel: $('gauge-fuel'), health: $('gauge-health'), temp: $('gauge-temp'), nitro: $('gauge-nitro'),
      wanted: $('hud-wanted'), escape: $('hud-escape-fill'), escapeWrap: $('hud-escape'),
      toast: $('hud-toast'), prompt: $('hud-prompt'), gear: $('hud-gear-shift'),
      turn: $('hud-turn'), tc: $('hud-tc'),
      cruise: $('hud-cruise'), camLabel: $('hud-cam-label'),
    };
    this.speedoCtx = this.hud.speedo?.getContext('2d');
    this.minimapCtx = this.hud.minimap?.getContext('2d');

    // callbacks
    this.peds.onPedHit = (x, z) => {
      this.police.addHeat(130);
      this.toast('⚠️ You hit a pedestrian!', 'warn');
    };
    this.traffic.onHonk = (dist) => this.audio.aiHorn(dist);
    this.police.onBusted = () => this._busted();
    this.car.onLand = (impact) => {
      if (impact < 3) return;
      this._shake = Math.min(0.7, impact / 14);
      this.audio.crash(clamp(impact / 26, 0.15, 0.6));
      for (let k = 0; k < 6; k++) {
        this.spawnParticle(this.car.pos.x + rand(-1, 1), 0.3, this.car.pos.z + rand(-1, 1),
          0x9aa5b5, { life: 0.5, size: 1, grow: 2, vy: rand(1, 3) });
      }
    };

    // canvas click → cruise toggle
    this.canvas.addEventListener('click', (e) => {
      if (e.target.closest('button, a, .overlay, .mobile-controls')) return;
      if (this.onFoot) return;
      this.cruise = !this.cruise;
      this.toast(this.cruise ? '🚗 Cruise control ON' : '🚗 Cruise control OFF', 'info');
    });
  }

  // ───────── quality ─────────
  setQuality(q) {
    this.quality = q;
    this.qual = QUALITY_PRESETS[q] || QUALITY_PRESETS.medium;
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qual.pixelRatio));
      this.renderer.shadowMap.enabled = this.qual.shadows;
      if (this.sun) this.sun.castShadow = this.qual.shadows;
    }
    if (this.camera) this.camera.far = this.qual.drawCars + 220;
    if (this.traffic) this.traffic.quality = this.qual.traffic;
    if (this.peds) this.peds.quality = this.qual.peds;
    if (this.city) this.city.chunkRadius = this.qual.chunkRadius;
    if (this.rain) this._resizeRain();
  }

  // ───────── save / load ─────────
  _loadSave() {
    let s = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) s = JSON.parse(raw);
    } catch {}
    if (s && s.v === 2) {
      this._grantToro(s);
      return s;
    }
    // migrate v1
    try {
      const raw1 = localStorage.getItem(SAVE_KEY_V1);
      if (raw1) {
        const old = JSON.parse(raw1);
        const d = defaultSave();
        d.money = Math.max(0, (old.money || 0) + 500);
        d.xp = old.xp || 0;
        for (const id of (old.completedMissions || [])) d.completed[id] = { stars: 1, bestTime: null };
        d.settings.sound = old.sound !== false;
        this._grantToro(d, true);
        return d;
      }
    } catch {}
    return defaultSave();
  }

  /**
   * Ensure the Toro SV hero car exists. Any player who doesn't own it yet
   * (v1 save or pre-Toro v2) gets it granted, keeps the old Corsa starter,
   * and — if they were still driving that starter — is switched into the Toro.
   */
  _grantToro(s, legacy = false) {
    s.ownedCars = s.ownedCars || {};
    if (legacy && !s.ownedCars.corsa) {
      s.ownedCars.corsa = { upgrades: {}, paint: '#e11d48', spoiler: 0 };
    }
    if (s.ownedCars.toro) return;
    s.ownedCars.toro = { upgrades: {}, paint: '#f5b301', spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 };
    if (!s.ownedCars.corsa) {
      s.ownedCars.corsa = { upgrades: {}, paint: '#e11d48', spoiler: 0 };
    }
    if (!s.ownedCars[s.currentCar] || s.currentCar === 'corsa') s.currentCar = 'toro';
  }

  persist() {
    // remember where the player parked so Free Drive can resume there
    if (this.running && !this.onFoot) {
      this.save.pos = {
        x: Math.round(this.car.pos.x * 10) / 10,
        z: Math.round(this.car.pos.z * 10) / 10,
        h: Math.round(this.car.heading * 100) / 100,
      };
    }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch {}
  }

  get level() { return ECONOMY.levelFromXp(this.save.xp); }

  // ───────── rain + particles ─────────
  _initRain() {
    const geo = new THREE.BufferGeometry();
    this.rainCount = this.qual.rainCount;
    const pos = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      pos[i * 3] = rand(-30, 30);
      pos[i * 3 + 1] = rand(0, 30);
      pos[i * 3 + 2] = rand(-30, 30);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x9fc8e8, size: 0.14, transparent: true, opacity: 0,
      depthWrite: false,
    }));
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  _resizeRain() {
    if (!this.rain) return;
    this.rain.visible = false;
    // rebuild with new count
    this.scene.remove(this.rain);
    this.rain.geometry.dispose();
    this._initRain();
  }

  _initParticles() {
    // sprite pool
    const cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 1, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(cv);
    this._particles = [];
    for (let i = 0; i < 90; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
      }));
      sp.visible = false;
      this.scene.add(sp);
      this._particles.push({ sp, life: 0, maxLife: 1, vel: new THREE.Vector3(), size: 1, grow: 0 });
    }
  }

  spawnParticle(x, y, z, color, opts = {}) {
    const p = this._particles.find((q) => q.life <= 0);
    if (!p) return;
    p.sp.visible = true;
    p.sp.position.set(x, y, z);
    p.sp.material.color.set(color);
    p.life = p.maxLife = opts.life || 0.6;
    p.size = opts.size || 1;
    p.grow = opts.grow || 0;
    p.vel.set(opts.vx || rand(-2, 2), opts.vy || rand(1, 4), opts.vz || rand(-2, 2));
  }

  _updateParticles(dt) {
    for (const p of this._particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.sp.visible = false; continue; }
      const t = p.life / p.maxLife;
      p.sp.material.opacity = t * 0.8;
      p.sp.position.addScaledVector(p.vel, dt);
      const s = p.size * (1 + (1 - t) * p.grow);
      p.sp.scale.set(s, s, 1);
    }
  }

  // ───────── flow ─────────
  startPlay(missionId = null, opts = {}) {
    this.mode = missionId ? 'play' : 'free';
    this.onFoot = false;
    this.cruise = false;
    this.character.visible = false;
    this.fuel = 100;
    this.police.clearAll();
    this.traffic.clearAll();
    this.peds.spawnAll();
    this._clearRoamMarkers();

    // restore player's saved car (in case a delivery mission swapped it)
    this._applySavedCar();
    this.car.tcEnabled = this.save.settings.tractionControl !== false;

    // spawn: keep position for roam events; free drive resumes at the
    // last saved position when it exists and is inside the world
    const saved = this.save.pos;
    const savedOK = saved && Math.abs(saved.x) < WORLD.spanX / 2 - 4 && Math.abs(saved.z) < WORLD.spanZ / 2 - 4;
    const spawn = opts.keepPosition
      ? { x: this.car.pos.x, z: this.car.pos.z, heading: this.car.heading }
      : (savedOK && !missionId
        ? { x: saved.x, z: saved.z, heading: saved.h }
        : { x: WORLD.roadX(2) + 1.9, z: WORLD.roadZ(6) + 8, heading: 0 });
    this.car.reset(spawn.x, spawn.z, spawn.heading);

    this.missions.start(missionId, spawn);
    if (this.missions.forceCar) {
      const def = CAR_BY_ID[this.missions.forceCar];
      this.car.configure(def, { paint: def.color, spoiler: 0, upgrades: {} });
      this.car.reset(spawn.x, spawn.z, spawn.heading);
      this.car.tcEnabled = this.save.settings.tractionControl !== false;
      this._borrowed = this.missions.forceCar;
    }
    if (this.missions.forceNight) this.dayTime = 0.94;
    if (this.missions.needPoliceStars) this.police.setStars(this.missions.needPoliceStars);

    if (this.missions._dest) {
      this.navmap.setDestination(spawn.x, spawn.z, this.missions._dest.x, this.missions._dest.z);
    } else {
      this.navmap.clearRoute();
    }
    if (!missionId) this._spawnRoamMarkers();

    this.hud.wrap.classList.remove('hidden');
    this.hud.missionName.textContent = missionId ? this.missions.active.name : 'Free Drive';
    this.hud.timerWrap.classList.toggle('hidden', !this.missions.active?.timeLimit);
    this.input.bind();
    this.running = true;
    this.paused = false;
    this.mapOpen = false;
    this.lastTime = performance.now();
    this.audio.music(true);
    requestAnimationFrame(this._loop);
  }

  pause() {
    if (this.mode !== 'play' && this.mode !== 'free') return;
    if (this.mapOpen) this.toggleMap();
    this.paused = true;
    this._prevMode = this.mode;
    this.mode = 'paused';
    this.ui.onPause(true);
    this.audio.engineOff();
    this.audio.siren(false);
  }

  resume() {
    if (this.mode !== 'paused') return;
    if (this.mapOpen) this.toggleMap();
    this.paused = false;
    this.mode = this._prevMode || 'free';
    this.ui.onPause(false);
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    this.input.unbind();
    this.missions.clear();
    this.navmap.clearRoute();
    this.police.clearAll();
    this.traffic.clearAll();
    this.peds.clearAll();
    this._clearRoamMarkers();
    this.audio.music(false);
    this.audio.engineOff();
    this.audio.siren(false);
    this.audio.skid(0); this.audio.wind(0); this.audio.rain(0);
    this.hud.wrap.classList.add('hidden');
  }

  // ───────── free-roam event markers ─────────
  _spawnRoamMarkers() {
    this._clearRoamMarkers();
    const iconFor = { 'roam-race': '🏁', 'roam-taxi': '🚕', 'roam-trial': '⏱️', 'roam-delivery': '📦' };
    const colorFor = { 'roam-race': 0xf97316, 'roam-taxi': 0xfbbf24, 'roam-trial': 0x38bdf8, 'roam-delivery': 0x10b981 };
    const pool = [...this.city.roamPOIs];
    const count = Math.min(3, pool.length);
    for (let k = 0; k < count; k++) {
      const idx = Math.floor(Math.random() * pool.length);
      const poi = pool.splice(idx, 1)[0];
      const g = new THREE.Group();
      const color = colorFor[poi.type] || 0xfbbf24;
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 0.25, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 1.2, 12, 8, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
      );
      beam.position.y = 6;
      g.add(ring, beam);
      g.position.set(poi.x, 0, poi.z);
      this.scene.add(g);
      this.roamEvents.push({ poi, mesh: g, icon: iconFor[poi.type] || '🏁', color });
    }
  }

  _clearRoamMarkers() {
    for (const e of this.roamEvents) {
      this.scene.remove(e.mesh);
      e.mesh.traverse((o) => o.geometry?.dispose?.());
    }
    this.roamEvents = [];
    this._nearRoam = null;
  }

  _nearestRoam(px, pz) {
    let best = null, bd = 7;
    for (const e of this.roamEvents) {
      const d = Math.hypot(px - e.poi.x, pz - e.poi.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  _startRoam(e) {
    this.startPlay(e.poi.type, { keepPosition: true });
    this.toast(`${e.poi.name} — GO!`, 'good', 2.5);
    this.audio.checkpoint();
  }

  toast(msg, kind = 'info', dur = 2) {
    if (!this.hud.toast) return;
    this.hud.toast.textContent = msg;
    this.hud.toast.className = `toast show ${kind}`;
    this.toastTimer = dur;
  }

  // ───────── main loop ─────────
  _loop(now) {
    if (!this.running || this.paused) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this._update(dt);
    this._render();
    requestAnimationFrame(this._loop);
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    this.input.update(dt);
    this._handleActions();

    if (this.onFoot) this._updateFoot(dt);
    else this._updateCar(dt);
    this._dropSkids(dt);
    this._updateSkids(dt);

    this._collisions(dt);
    this._zones(dt);
    this.traffic.update(dt, this.car.pos, Math.abs(this.car.speedF), this._isNight(), this.wetness, this.peds);
    this.peds.update(dt, this.onFoot ? this.character.position : this.car.pos,
      this.onFoot ? 0 : Math.abs(this.car.speedF), this.weather.rain);
    const patrols = this.police.stars === 0 ? this.traffic.patrolPositions(this.car.pos) : [];
    this.police.update(dt, this.onFoot ? this.character.position : this.car.pos,
      this.onFoot ? new THREE.Vector2() : this.car.vel,
      this.onFoot ? 0 : Math.abs(this.car.speedF), patrols);
    this.city.update(dt, this.car.pos);
    this._dayNight(dt);
    this._weather(dt);
    this._updateParticles(dt);
    this._updateMission(dt);
    this._updateCamera(dt);
    this._updateHUD(dt);
    this._updateAudio(dt);

    this.saveTimer += dt;
    if (this.saveTimer > 12) { this.saveTimer = 0; this.persist(); }
  }

  _handleActions() {
    for (const a of this.input.consumeActions()) {
      switch (a) {
        case 'pause':
          if (this.mapOpen) { this.toggleMap(); break; }
          this.paused ? this.resume() : this.pause();
          break;
        case 'camera':
          this.cameraMode = (this.cameraMode + 1) % CAM_MODES.length;
          this.hud.camLabel.textContent = CAM_MODES[this.cameraMode].toUpperCase();
          this.hud.camLabel.classList.add('show');
          clearTimeout(this._camLabelT);
          this._camLabelT = setTimeout(() => this.hud.camLabel.classList.remove('show'), 1200);
          break;
        case 'map': this.toggleMap(); break;
        case 'lights':
          this._lightsMode = ((this._lightsMode ?? 0) + 1) % 3;  // auto → low → high
          this.toast(`Headlights: ${['AUTO', 'LOW BEAM', 'HIGH BEAM'][this._lightsMode]}`, 'info', 1.4);
          break;
        case 'tc':
          this.save.settings.tractionControl = !this.save.settings.tractionControl;
          this.car.tcEnabled = this.save.settings.tractionControl;
          this.persist();
          this.toast(`Traction control ${this.car.tcEnabled ? 'ON' : 'OFF'}`, 'info', 1.4);
          break;
        case 'enter': {
          const zp = this._zonePrompt || '';
          // roam event marker?
          if (!this.onFoot && this._nearRoam && !this.missions.active) {
            this._startRoam(this._nearRoam);
            break;
          }
          if (!this.onFoot && zp.includes('Garage')) { this.ui.onGarage(); break; }
          if (!this.onFoot && zp.includes('Showroom')) { this.ui.onDealer(); break; }
          this._enterExit();
          break;
        }
        case 'trans':
          this.car.trans = this.car.trans === 'auto' ? 'manual' : 'auto';
          this.save.settings.transmission = this.car.trans;
          this.toast(`Transmission: ${this.car.trans.toUpperCase()}`, 'info');
          break;
        case 'shiftUp': if (this.car.trans === 'manual' && this.car.shiftUp()) this.audio.gearShift(); break;
        case 'shiftDown': if (this.car.trans === 'manual' && this.car.shiftDown()) this.audio.gearShift(); break;
      }
    }
  }

  toggleMap() {
    this.mapOpen = !this.mapOpen;
    this.ui.onMap(this.mapOpen);
    if (this.mapOpen) { this.paused = true; this._prevMode = this.mode; }
    else { this.paused = false; this.lastTime = performance.now(); requestAnimationFrame(this._loop); }
  }

  // ───────── car / foot updates ─────────
  _updateCar(dt) {
    const inp = this.input.state;
    let throttle = inp.throttle;
    if (this.cruise && !inp.brake) throttle = 1;
    this.car.input.throttle = throttle;
    this.car.input.brake = inp.brake;
    this.car.input.steer = inp.steer;
    this.car.input.handbrake = inp.handbrake;
    this.car.input.nitro = inp.nitro;
    if (this.fuel <= 0) this.car.input.throttle = 0;
    this.car.trans = this.save.settings.transmission;
    this.car.gripMul = 1 - this.wetness * 0.2;   // wet roads = less grip

    // ramp ground height + launch off the top edge
    const g = this.city.groundAt(this.car.pos.x, this.car.pos.z);
    this.car.groundY = g.y;
    if (this._prevRamp && !g.ramp && !this.car.airborne && Math.abs(this.car.speedF) > 6) {
      const slope = Math.atan2(this._prevRamp.h, this._prevRamp.len);
      this.car.vy = Math.abs(this.car.speedF) * Math.sin(slope) * 1.2;
      this.car.pos.y = this._prevRamp.h;
      this.car.airborne = true;
      this.audio.gearShift();
    }
    this._prevRamp = g.ramp;

    const info = this.car.update(dt);

    // world clamp
    const lim = WORLD.spanX / 2 - 2;
    const limZ = WORLD.spanZ / 2 - 2;
    if (Math.abs(this.car.pos.x) > lim) { this.car.pos.x = Math.sign(this.car.pos.x) * lim; this.car.vel.x *= -0.3; }
    if (Math.abs(this.car.pos.z) > limZ) { this.car.pos.z = Math.sign(this.car.pos.z) * limZ; this.car.vel.y *= -0.3; }

    // fuel
    const drain = (info.moving ? STATS.fuelDrainPerSec * (0.35 + inp.throttle * 0.65) : STATS.fuelDrainIdle) * dt;
    this.fuel = Math.max(0, this.fuel - drain);
    if (this.fuel <= 0 && Math.abs(this.car.speedF) < 0.4) {
      this._fuelOutT = (this._fuelOutT || 0) + dt;
      if (this._fuelOutT > 4) {
        if (this.mode === 'play') this._fail('Out of fuel!');
        else {
          this.fuel = 20;
          this.save.money = Math.max(0, this.save.money - 100);
          this.toast('🚚 Emergency fuel delivered (−$100)', 'warn', 3);
        }
        this._fuelOutT = 0;
      }
    } else this._fuelOutT = 0;

    // tire smoke / skid
    if (this.car.slip > 4.5 && Math.abs(this.car.speedF) > 6) {
      const f = this.car.forward;
      const rx = -this.car.pos.x + f.x * -1.3, rz = -this.car.pos.z + f.z * -1.3;
      if (Math.random() < 0.5) {
        this.spawnParticle(this.car.pos.x - f.x * 1.4 + rand(-0.7, 0.7), 0.3,
          this.car.pos.z - f.z * 1.4 + rand(-0.7, 0.7), 0xbcc4d0,
          { life: 0.8, size: 1.1, grow: 2, vy: 1.2 });
      }
    }

    // engine damage smoke
    this._smokeT -= dt;
    if (this.car.health < 30 && this._smokeT <= 0) {
      this._smokeT = 0.18;
      const f = this.car.forward;
      this.spawnParticle(this.car.pos.x + f.x * 1.6, 0.9, this.car.pos.z + f.z * 1.6, 0x2a2e36,
        { life: 1.2, size: 1.4, grow: 2.5, vy: 2.4 });
    }

    // cockpit gauges + warning indicators
    const warnings = [];
    if (this.car.engineTemp > 118) warnings.push({ text: 'TEMP', color: '#ef4444' });
    if (this.fuel < 22) warnings.push({ text: 'FUEL', color: '#ef4444' });
    if (!this.car.tcEnabled) warnings.push({ text: 'TC', color: '#f59e0b' });
    this.car.updateCockpitGauges(dt, this.fuel / 100, info.speedKmh, warnings);
    this.audio.horn(inp.horn);
  }

  _updateFoot(dt) {
    const inp = this.input.state;
    const camYaw = this.camera.rotation.y;
    // move relative to camera
    let mx = 0, mz = 0;
    if (inp.throttle > 0) mz += 1;
    if (inp.brake > 0) mz -= 1;
    if (inp.steer < -0.3) mx -= 1;
    if (inp.steer > 0.3) mx += 1;
    const len = Math.hypot(mx, mz);
    const sprint = inp.nitro ? 1 : 0;
    const speed = len > 0 ? (sprint ? 6.2 : 2.6) : 0;
    if (len > 0) {
      const dir = Math.atan2(mx, mz);
      const worldHeading = normAngle(camYaw + dir);
      this.footState.heading = worldHeading;
      let nx = this.character.position.x + Math.sin(worldHeading) * speed * dt;
      let nz = this.character.position.z + Math.cos(worldHeading) * speed * dt;
      // collide
      for (const c of this.city.collidables) {
        const hit = circleAABB(nx, nz, 0.45, c);
        if (hit) { nx += hit.nx * hit.depth; nz += hit.nz * hit.depth; }
      }
      const lim = WORLD.spanX / 2 - 2, limZ = WORLD.spanZ / 2 - 2;
      this.character.position.x = clamp(nx, -lim, lim);
      this.character.position.z = clamp(nz, -limZ, limZ);
    }
    this.character.rotation.y = damp(this.character.rotation.y, this.footState.heading, 10, dt)
      ;
    this.character.userData.animate(dt, speed / 6);
    // keep player car visible where left
  }

  _enterExit() {
    if (this.onFoot) {
      // near own car?
      const d = Math.hypot(this.character.position.x - this.car.pos.x, this.character.position.z - this.car.pos.z);
      // near a parked/borrowable car?
      let borrow = null;
      for (const p of this.city.parkedCars) {
        if (Math.hypot(this.character.position.x - p.x, this.character.position.z - p.z) < 2.6) { borrow = p; break; }
      }
      if (d < 3.2) {
        this.onFoot = false;
        this.character.visible = false;
        this.toast('🚗 Back behind the wheel', 'info', 1.2);
      } else if (borrow) {
        const map = { sedan: 'metro', hatch: 'corsa', suv: 'ranger' };
        const def = CAR_BY_ID[map[borrow.style] || 'corsa'];
        this.car.configure(def, { paint: def.color, spoiler: 0, upgrades: {} });
        this.car.reset(borrow.x, borrow.z, borrow.heading || 0);
        this.onFoot = false;
        this.character.visible = false;
        this._borrowed = def.id;
        this.toast(`🔑 Borrowed a ${def.name} (session only)`, 'info', 2.5);
      } else {
        this.toast('No vehicle nearby', 'warn', 1.2);
      }
    } else {
      if (Math.abs(this.car.speedF) > 3) { this.toast('Slow down to get out', 'warn', 1.2); return; }
      this.onFoot = true;
      this.cruise = false;
      const f = this.car.forward;
      this.character.position.set(this.car.pos.x + f.z * 2.2, 0, this.car.pos.z - f.x * 2.2);
      this.character.rotation.y = this.car.heading;
      this.character.visible = true;
      this.car.input.throttle = 0;
      this.toast('🚶 On foot — E to re-enter, borrow parked cars', 'info', 2.5);
    }
  }

  _applySavedCar() {
    const id = this.save.currentCar;
    const def = CAR_BY_ID[id] || CAR_BY_ID.corsa;
    const owned = this.save.ownedCars[id] || { upgrades: {}, paint: def.color, spoiler: 0 };
    this.car.configure(def, owned);
    this._borrowed = null;
  }

  // ───────── collisions ─────────
  _collisions(dt) {
    if (this.onFoot) return;
    this.collisionCooldown -= dt;
    const car = this.car;
    const S = car.handle.dims;
    const r = S.w * 0.55 + 0.18;
    const f = car.forward;
    const probe = (fx, fz) => {
      for (const c of this.city.collideNear(fx, fz)) {
        const hit = circleAABB(fx, fz, r, c);
        if (hit) return { ...hit, box: c };
      }
      return null;
    };
    for (const s of [1, -1]) {
      const fx = car.pos.x + f.x * S.l * 0.31 * s;
      const fz = car.pos.z + f.z * S.l * 0.31 * s;
      const hit = probe(fx, fz);
      if (hit) {
        // resolve at car center
        car.pos.x += hit.nx * hit.depth;
        car.pos.z += hit.nz * hit.depth;
        const vn = car.vel.x * hit.nx + car.vel.y * hit.nz;
        if (vn < 0) {
          car.vel.x -= hit.nx * vn * 1.45;
          car.vel.y -= hit.nz * vn * 1.45;
          const impact = -vn;
          if (impact > 3.5 && this.collisionCooldown <= 0) {
            this.collisionCooldown = 0.3;
            const dmg = clamp((impact - 3) * 1.35, 2, 34);
            car.applyDamage(dmg, hit.nx, hit.nz);
            this.missions.registerCollision();
            this.police.addHeat(4);
            this.audio.crash(impact / 22);
            this._shake = Math.min(1, impact / 16);
            for (let k = 0; k < 6; k++) {
              this.spawnParticle(fx, 0.6, fz, 0xffb347, { life: 0.4, size: 0.5, grow: 1, vy: rand(1, 4) });
            }
            if (car.health <= 0) this._wrecked();
          }
        }
        car.applyTransform();
      }
    }

    // traffic collision
    const hitT = this.traffic.checkCollision(car.pos.x, car.pos.z, r);
    if (hitT) {
      const dx = car.pos.x - hitT.x, dz = car.pos.z - hitT.z;
      const d = Math.hypot(dx, dz) || 1;
      const nx = dx / d, nz = dz / d;
      car.pos.x += nx * 0.5; car.pos.z += nz * 0.5;
      const vn = car.vel.x * -nx + car.vel.y * -nz;
      if (vn > 0) { car.vel.x += nx * vn * 0.7; car.vel.y += nz * vn * 0.7; }
      hitT.car.speed = 0;
      hitT.car.blockedT = 0;
      hitT.car.honkT = 0.1;
      if (this.collisionCooldown <= 0) {
        this.collisionCooldown = 0.35;
        const impact = Math.abs(car.speedF);
        car.applyDamage(clamp(impact * 0.8, 2, 26), nx, nz);
        this.missions.registerCollision();
        this.police.addHeat(16);
        this.audio.crash(impact / 20);
        this._shake = Math.min(1, impact / 18);
        this.toast('💥 Collision!', 'warn', 1);
      }
      car.applyTransform();
    }

    // police collision
    const hitP = this.police.checkCollision(car.pos.x, car.pos.z, r);
    if (hitP) {
      const dx = car.pos.x - hitP.x, dz = car.pos.z - hitP.z;
      const d = Math.hypot(dx, dz) || 1;
      const nx = dx / d, nz = dz / d;
      car.pos.x += nx * 0.6; car.pos.z += nz * 0.6;
      hitP.p.x -= nx * 0.8; hitP.p.z -= nz * 0.8;
      hitP.p.speed *= 0.4;
      if (this.collisionCooldown <= 0) {
        this.collisionCooldown = 0.4;
        car.applyDamage(clamp(Math.abs(car.speedF) * 0.9, 3, 30), nx, nz);
        this.missions.registerCollision();
        this.police.addHeat(160);
        this.audio.crash(0.8);
        this._shake = 0.8;
        this.toast('🚓 You rammed a police car!', 'warn');
      }
      car.applyTransform();
    }
  }

  // ───────── zones (gas / garage / dealer prompts) ─────────
  _zones(dt) {
    const px = this.car.pos.x, pz = this.car.pos.z;
    let prompt = null;

    // gas stations — auto refuel
    for (const g of this.city.gasStations) {
      if (Math.hypot(px - g.x, pz - g.z) < g.r) {
        if (this.fuel < 99.5 && Math.abs(this.car.speedF) < 6) {
          const before = this.fuel;
          this.fuel = Math.min(100, this.fuel + STATS.refuelPerSec * dt);
          if (Math.floor(before / 25) !== Math.floor(this.fuel / 25)) this.audio.refuelTick();
        }
        if (this.fuel < 99) prompt = '⛽ Refueling…';
        break;
      }
    }

    if (!this.onFoot) {
      if (this.city.garage && Math.hypot(px - this.city.garage.x, pz - this.city.garage.z) < this.city.garage.r) {
        prompt = '🔧 E — Open Garage (repair · upgrades · paint)';
      } else if (this.city.dealer && Math.hypot(px - this.city.dealer.x, pz - this.city.dealer.z) < this.city.dealer.r) {
        prompt = '🚗 E — Enter Showroom (buy cars)';
      }
    }

    // free-roam event markers
    this._nearRoam = this.roamEvents.length && !this.missions.active ? this._nearestRoam(px, pz) : null;
    if (this._nearRoam) {
      prompt = `${this._nearRoam.icon} E — Start ${this._nearRoam.poi.name}`;
      this._nearRoam.mesh.children[0].scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.12);
    }

    this._zonePrompt = prompt;
    this.ui.onPrompt(prompt);

    // NYC manhole steam near the player
    if (this.city.steamVents) {
      for (const v of this.city.steamVents) {
        const d = Math.hypot(v.x - px, v.z - pz);
        if (d < 70 && Math.random() < dt * 2.2) {
          this.spawnParticle(v.x, 0.3, v.z, 0xd8e0e8,
            { life: 1.6, size: 0.8, grow: 2.6, vy: 1.6, vx: rand(-0.3, 0.3), vz: rand(-0.3, 0.3) });
        }
      }
    }
  }

  openGarage() {
    // auto-repair for a fee when opened
    const cost = Math.round((100 - this.car.health) * ECONOMY.repairCostPerHp);
    if (cost > 0 && this.save.money >= cost) {
      this.save.money -= cost;
      this.car.repair();
      this.toast(`🔧 Repaired for ${fmtMoney(cost)}`, 'good', 2.5);
      this.audio.money();
    } else if (cost > 0) {
      this.toast('Not enough money to repair', 'warn');
    }
    this.persist();
  }

  // ───────── day / night + weather ─────────
  _isNight() { return TIME.nightFactor(this.dayTime) > 0.45; }

  _dayNight(dt) {
    this.dayTime = (this.dayTime + dt / TIME.CYCLE) % 1;
    const P = TIME.presets;
    let a = P[0], b = P[P.length - 1];
    for (let k = 0; k < P.length - 1; k++) {
      if (this.dayTime >= P[k].t && this.dayTime <= P[k + 1].t) { a = P[k]; b = P[k + 1]; break; }
    }
    const t = (this.dayTime - a.t) / Math.max(0.0001, b.t - a.t);
    const ca = new THREE.Color(a.sky), cb = new THREE.Color(b.sky);
    const sky = ca.lerp(cb, t);
    const fogA = new THREE.Color(a.fog), fogB = new THREE.Color(b.fog);
    const fog = fogA.lerp(fogB, t);
    const night = TIME.nightFactor(this.dayTime);

    this.scene.background = sky;
    if (!this.scene.fog) this.scene.fog = new THREE.Fog(fog, 40, 300);
    this.scene.fog.color.copy(fog);
    this._fogBaseColor = fog.clone();

    this.sun.intensity = lerp(a.sun, b.sun, t);
    this.sun.color.setHex(lerpColorHex(a.sunCol, b.sunCol, t));
    this.ambient.intensity = lerp(a.amb, b.amb, t) + 0.15;
    this.hemi.intensity = 0.2 + (1 - night) * 0.25;

    // sun position follows player for shadows
    const sunAngle = (this.dayTime - 0.25) * Math.PI * 2;
    const p = this.car.pos;
    this.sun.position.set(p.x + Math.cos(sunAngle) * 90, Math.max(18, Math.sin(sunAngle) * 110), p.z + 35);
    this.sun.target.position.set(p.x, 0, p.z);

    this.city.setNight(night);

    // headlights: auto / low / high beam
    const mode = this._lightsMode ?? 0;
    const autoOn = night > 0.35 || this.weather.rain > 0.35 || this.weather.fogFar < 0.5;
    const lightsOn = mode === 0 ? autoOn : true;
    const high = mode === 2;
    this.car.setHeadlights(lightsOn, high);
    this.headL.intensity = this.headR.intensity = lightsOn ? (high ? 175 : 85) : 0;
    this.headL.distance = this.headR.distance = high ? 85 : 55;
    const f = this.car.forward;
    this.headL.position.set(this.car.pos.x + f.x * 2 + f.z * 0.6, 0.8, this.car.pos.z + f.z * 2 - f.x * 0.6);
    this.headR.position.set(this.car.pos.x + f.x * 2 - f.z * 0.6, 0.8, this.car.pos.z + f.z * 2 + f.x * 0.6);
    this.headL.target.position.set(this.car.pos.x + f.x * 30, 0, this.car.pos.z + f.z * 30);
    this.headR.target.position.copy(this.headL.target.position);
    if (!this.headL.target.parent) this.scene.add(this.headL.target, this.headR.target);

    // clock
    if (this.hud.clock) {
      const hrs = this.dayTime * 24;
      const hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60);
      this.hud.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }

  _weather(dt) {
    const W = this.weather;
    const phase = WEATHER_PHASES[W.idx];
    W.t -= dt;
    if (W.t <= 0) {
      const roll = Math.random();
      let next = 0;
      if (roll < 0.34) next = 0;            // clear
      else if (roll < 0.54) next = 1;       // cloudy
      else if (roll < 0.72) next = 2;       // rain
      else if (roll < 0.82) next = 3;       // heavy rain
      else if (roll < 0.92) next = 4;       // fog
      else next = 5;                        // storm
      W.idx = next;
      const p = WEATHER_PHASES[next];
      W.t = rand(p.dur[0], p.dur[1]);
      if (this.running && ['rain', 'heavy', 'storm'].includes(p.id)) this.toast(`🌧 ${p.label} incoming`, 'info');
      if (this.running && p.id === 'fog') this.toast('🌫 Fog rolling in', 'info');
      if (this.running && p.id === 'cloudy') this.toast('⛅ Clouds gathering', 'info');
    }
    const target = WEATHER_PHASES[W.idx];
    W.rain = damp(W.rain, target.rain, 0.35, dt);
    W.fogFar = damp(W.fogFar, target.fogFar, 0.3, dt);
    W.cloud = damp(W.cloud || 0, target.cloud, 0.25, dt);
    W.label = target.label;

    // cloud dimming: gray the sky, cut the sun
    if (W.cloud > 0.03) {
      const gray = new THREE.Color(0x5a6472);
      if (this.scene.background?.lerp) {
        this.scene.background.lerp(gray, W.cloud * 0.55);
      }
      this.sun.intensity *= 1 - W.cloud * 0.45;
      this.ambient.intensity *= 1 - W.cloud * 0.12;
    }

    // fog distance
    const baseFar = this.qual.fogFar * W.fogFar;
    this.scene.fog.near = baseFar * 0.18;
    this.scene.fog.far = baseFar;

    // wetness accumulates
    const wetTarget = W.rain > 0.05 ? Math.min(1, W.rain) : 0;
    this.wetness = damp(this.wetness, wetTarget, W.rain > 0.05 ? 0.25 : 0.05, dt);
    this.city.setWet(this.wetness);

    // rain particles
    if (W.rain > 0.03) {
      this.rain.visible = true;
      this.rain.material.opacity = W.rain * 0.65;
      const posAttr = this.rain.geometry.attributes.position;
      const cam = this.camera.position;
      const fall = 52 * dt;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - fall;
        if (y < 0) {
          y = rand(22, 30);
          posAttr.setX(i, cam.x + rand(-30, 30));
          posAttr.setZ(i, cam.z + rand(-30, 30));
        }
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    } else {
      this.rain.visible = false;
    }

    // thunder in storms
    if (WEATHER_PHASES[W.idx].id === 'storm') {
      W.thunderT -= dt;
      if (W.thunderT <= 0) {
        W.thunderT = rand(6, 16);
        W.flash = 0.35;
        this.audio.thunder();
      }
    }
    if (W.flash > 0) {
      W.flash = Math.max(0, W.flash - dt * 1.4);
      if (this._fogBaseColor) {
        const f = this._fogBaseColor.clone().lerp(new THREE.Color(0xdfe8ff), W.flash);
        this.scene.fog.color.copy(f);
        this.scene.background = this.scene.background.clone().lerp(new THREE.Color(0xdfe8ff), W.flash);
      }
    }
  }

  // ───────── mission glue ─────────
  _updateMission(dt) {
    // GPS recalculation when the player strays off the route
    this._routeTimer -= dt;
    this._recalcToastCd -= dt;
    if (this.navmap.dest && this._routeTimer <= 0) {
      this._routeTimer = 1.5;
      this.navmap.nextWaypoint(this.car.pos.x, this.car.pos.z);
      const off = this.navmap.distanceToRoute(this.car.pos.x, this.car.pos.z);
      if (off > 32) {
        this.navmap.setDestination(this.car.pos.x, this.car.pos.z, this.navmap.dest.x, this.navmap.dest.z);
        if (this._recalcToastCd <= 0) {
          this._recalcToastCd = 6;
          this.toast('🧭 Recalculating route…', 'info', 1.5);
        }
      }
    }
    if (this.mode !== 'play' || !this.missions.active) {
      // drain events anyway
      this._drainMissionEvents();
      return;
    }
    const res = this.missions.update(dt, this.car, this.police);
    this._drainMissionEvents();
    // live route to current target
    if (this.missions._dest && this.navmap.dest &&
        (Math.abs(this.missions._dest.x - this.navmap.dest.x) > 1 ||
         Math.abs(this.missions._dest.z - this.navmap.dest.z) > 1)) {
      this.navmap.setDestination(this.car.pos.x, this.car.pos.z, this.missions._dest.x, this.missions._dest.z);
    }
    if (res && res.completed) { this._complete(); return; }
    if (res && res.failed) { this._fail(res.reason); return; }
    if (this.car.health <= 0) this._wrecked();
  }

  _drainMissionEvents() {
    for (const e of this.missions.events) {
      if (e.type === 'toast') this.toast(e.msg, e.kind);
      else if (e.type === 'money') {
        this.save.money += e.amount;
        this.toast(`💵 +${fmtMoney(e.amount)} (${e.reason})`, 'good');
        this.audio.money();
      }
    }
    this.missions.events.length = 0;
  }

  _complete() {
    const wasRoam = this.missions.isRoam;
    this.missions._lastCarHealth = this.car.health;
    const res = this.missions.finalize(this.police);
    const prevLevel = this.level;
    this.save.money += res.money;
    this.save.xp += res.xp;
    const id = this.missions.active.id;
    const prev = this.save.completed[id];
    this.save.completed[id] = {
      stars: Math.max(prev?.stars || 0, res.stars),
      bestTime: res.bestTimeField
        ? (prev?.bestTime ? Math.min(prev.bestTime, res.elapsed) : res.elapsed)
        : (prev?.bestTime ?? null),
    };
    this.persist();
    this.running = false;
    this.mode = 'menu';
    this.input.unbind();
    this.audio.success();
    if (this.level > prevLevel) this.ui.onLevelUp(this.level);
    this._applySavedCar();
    if (wasRoam) {
      this.ui.onRoamDone(res);
    } else {
      this.ui.onComplete({ ...res, mission: this.missions.active });
    }
  }

  _fail(reason) {
    const wasRoam = this.missions.isRoam;
    this.running = false;
    this.mode = 'menu';
    this.input.unbind();
    this.audio.fail();
    this._applySavedCar();
    if (wasRoam) this.ui.onRoamDone(null);
    else this.ui.onFail(reason);
  }

  _wrecked() {
    if (this.mode === 'play') this._fail('Vehicle destroyed!');
    else {
      this.save.money = Math.max(0, this.save.money - 300);
      this.car.repair();
      this.fuel = Math.max(this.fuel, 40);
      this.car.reset(this.city.garage.x, this.city.garage.z + 6, 0);
      this.toast('🛠 Recovered at the garage (−$300)', 'warn', 3);
    }
  }

  _busted() {
    const fine = ECONOMY.bustedFinePerStar * Math.max(1, this.police.stars);
    this.police.clearAll();
    if (this.mode === 'play') {
      this._fail(`Busted! Fine: ${fmtMoney(fine)}`);
    } else {
      this.save.money = Math.max(0, this.save.money - fine);
      this.car.repair();
      this.fuel = Math.max(this.fuel, 30);
      this.car.reset(this.city.policeStation.x, this.city.policeStation.z + 6, 0);
      this.toast(`🚔 Busted! Fine ${fmtMoney(fine)} — released at the station`, 'warn', 3.5);
    }
  }

  // ───────── skid marks (drift / wheelspin / handbrake) ─────────
  _initSkidmarks() {
    this._skids = [];
    this._skidGeo = new THREE.PlaneGeometry(0.32, 1.3);
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(this._skidGeo, new THREE.MeshBasicMaterial({
        color: 0x0b0d11, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.rotation.order = 'YXZ';
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 2;
      this.scene.add(m);
      this._skids.push({ m, life: 0 });
    }
    this._skidT = 0;
  }

  _dropSkids(dt) {
    if (this.onFoot) return;
    const c = this.car;
    const braking = c.input.brake > 0.8 && Math.abs(c.speedF) > 12;
    const drifting = (c.slip > 4.5 && Math.abs(c.speedF) > 6) || c.wheelspin > 0.35 || braking;
    if (!drifting || Math.abs(c.speedF) < 4) return;
    this._skidT -= dt;
    if (this._skidT > 0) return;
    this._skidT = 0.03;
    const f = c.forward;
    const S = c.handle.dims;
    for (const sx of [-1, 1]) {
      const s = this._skids.find((q) => q.life <= 0);
      if (!s) break;
      const x = c.pos.x - f.x * S.l * 0.33 + f.z * sx * (S.w / 2 - 0.08);
      const z = c.pos.z - f.z * S.l * 0.33 - f.x * sx * (S.w / 2 - 0.08);
      s.m.position.set(x, 0.023, z);
      s.m.rotation.y = c.heading;
      s.m.material.opacity = 0.55;
      s.m.visible = true;
      s.life = 5;
      s.m.scale.y = 0.7 + Math.abs(c.speedF) * 0.03;
    }
  }

  _updateSkids(dt) {
    for (const s of this._skids) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.m.visible = false; continue; }
      s.m.material.opacity = Math.min(0.55, (s.life / 5) * 0.55);
    }
  }

  // ───────── cameras ─────────
  _updateCamera(dt) {
    const cam = this.camera;
    const car = this.car;
    const speedF = Math.abs(car.speedF);
    const target = this.onFoot ? this.character.position : car.pos;
    const heading = this.onFoot ? this.character.rotation.y : car.heading;

    if (this.cameraMode === 4) {
      // cinematic tripod
      this._cineT -= dt;
      const d = this._cinePoint.distanceTo(target);
      if (this._cineT <= 0 || d > 46) {
        this._cineT = 5;
        const f = car.forward;
        this._cinePoint.set(
          target.x + f.x * 26 + rand(-14, 14), rand(1.6, 8),
          target.z + f.z * 26 + rand(-14, 14));
      }
      cam.position.lerp(this._cinePoint, 1 - Math.exp(-CAMERA.cine.lerp * dt));
      cam.lookAt(target.x, 1.2, target.z);
      if (car.dash) car.dash.visible = false;
    } else if (this.cameraMode === 2 || this.cameraMode === 3) {
      // hood / cockpit
      const S = car.handle.dims;
      const f = car.forward;
      if (this.cameraMode === 2) {
        cam.position.set(
          target.x + f.x * (S.l * 0.22), 1.06 + S.h * 0.5,
          target.z + f.z * (S.l * 0.22));
        cam.lookAt(target.x + f.x * 20, 0.9, target.z + f.z * 20);
      } else {
        const lx = -S.w * 0.22;
        cam.position.set(
          target.x + f.x * (S.cabL / 2 - 1.05) + f.z * lx,
          0.34 + S.h + 0.52,
          target.z + f.z * (S.cabL / 2 - 1.05) - f.x * lx);
        cam.lookAt(
          target.x + f.x * 20 + f.z * (lx + car.steerAngle * -6),
          0.34 + S.h + 0.45,
          target.z + f.z * 20 - f.x * (lx + car.steerAngle * -6));
      }
      if (car.dash) car.dash.visible = this.cameraMode === 3;
    } else {
      // chase / close
      const cfg = this.cameraMode === 0 ? CAMERA.chase : CAMERA.close;
      const back = cfg.dist + speedF * 0.06;
      let desired = new THREE.Vector3(
        target.x - Math.sin(heading) * back,
        cfg.height,
        target.z - Math.cos(heading) * back);
      desired = this._occludeCamera(new THREE.Vector3(target.x, 1.3, target.z), desired);
      cam.position.x = damp(cam.position.x, desired.x, cfg.lerp, dt);
      cam.position.y = damp(cam.position.y, Math.max(1.2, desired.y), cfg.lerp, dt);
      cam.position.z = damp(cam.position.z, desired.z, cfg.lerp, dt);
      // look ahead into the corner (steering-weighted)
      const rightX = Math.cos(heading), rightZ = -Math.sin(heading);
      const la = this.onFoot ? 0 : car.steerAngle * 3.2;
      cam.lookAt(
        target.x + Math.sin(heading) * 3.5 + rightX * la, 1.15,
        target.z + Math.cos(heading) * 3.5 + rightZ * la);
      if (car.dash) car.dash.visible = false;
    }

    // FOV boost with speed / nitro
    const baseFov = this.cameraMode >= 2 ? (this.cameraMode === 3 ? CAMERA.cockpit.fov : CAMERA.hood.fov)
      : (this.cameraMode === 0 ? CAMERA.chase.fov : CAMERA.close.fov);
    const boost = (speedF / Math.max(car.stats?.topSpeed || 40, 1)) * CAMERA.fovBoost + (car.nitroActive ? 7 : 0);
    const wantFov = baseFov + boost;
    if (Math.abs(cam.fov - wantFov) > 0.3) {
      cam.fov = damp(cam.fov, wantFov, 4, dt);
      cam.updateProjectionMatrix();
    }

    // shake
    if (this._shake > 0.005) {
      this._shake = Math.max(0, this._shake - dt * CAMERA.shakeDecay);
      cam.position.x += rand(-1, 1) * this._shake * 0.5;
      cam.position.y += rand(-1, 1) * this._shake * 0.35;
      cam.rotation.z += rand(-1, 1) * this._shake * 0.03;
    }
  }

  /**
   * Pull the camera in when a building blocks the line from the car to the
   * desired position (sampled probe against nearby colliders).
   */
  _occludeCamera(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const steps = 6;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const x = from.x + dx * t, y = from.y + dy * t, z = from.z + dz * t;
      for (const c of this.city.collideNear(x, z)) {
        if (y < 14 && Math.abs(x - c.x) < c.hw + 0.6 && Math.abs(z - c.z) < c.hz + 0.6) {
          return new THREE.Vector3(from.x + dx * Math.max(0.25, t - 0.18), Math.max(1.3, from.y + dy * t), from.z + dz * Math.max(0.25, t - 0.18));
        }
      }
    }
    return to;
  }

  // ───────── HUD ─────────
  _updateHUD(dt) {
    const car = this.car;
    const kmh = car.speedKmh;
    this.hud.money.textContent = fmtMoney(this.save.money);
    this.hud.level.textContent = `LV ${this.level}`;
    const cur = ECONOMY.levelXp(this.level);
    const next = ECONOMY.levelXp(this.level + 1);
    this.hud.xpFill.style.width = `${clamp((this.save.xp - cur) / (next - cur), 0, 1) * 100}%`;
    this.hud.weather.textContent = `${this.weather.label} ${this.weather.rain > 0.5 ? '🌧' : this.weather.label === 'Fog' ? '🌫' : this.weather.label === 'Storm' ? '⛈' : '☀'}`;

    // gauges
    this.hud.fuel.style.width = `${this.fuel}%`;
    this.hud.fuel.style.background = this.fuel < STATS.lowFuel
      ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#00d4ff,#38bdf8)';
    this.hud.health.style.width = `${car.health}%`;
    this.hud.health.style.background = car.health < STATS.lowHealth
      ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#10b981,#34d399)';
    this.hud.temp.style.width = `${((car.engineTemp - 70) / 62) * 100}%`;
    this.hud.temp.style.background = car.engineTemp > STATS.tempHot
      ? 'linear-gradient(90deg,#f97316,#ef4444)' : 'linear-gradient(90deg,#fbbf24,#f59e0b)';
    if (car.stats) {
      this.hud.nitro.style.width = `${(car.nitroValue / car.stats.nitroCap) * 100}%`;
    }

    // mission / objective
    if (this.missions.active) {
      this.hud.objective.textContent = this.missions.objectiveText();
      const d = this.navmap.routeDistanceLeft(this.car.pos.x, this.car.pos.z);
      this.hud.distance.textContent = d > 0 ? `${Math.round(d)} m` : `${Math.round(this.missions.distanceTo(this.car.pos.x, this.car.pos.z))} m`;
      if (this.missions.active.timeLimit) {
        this.hud.timer.textContent = fmtTime(this.missions.timeLeft);
        this.hud.timer.style.color = this.missions.timeLeft < 10 ? '#ef4444' : '';
      } else if (['cp-race', 'race', 'highway'].includes(this.missions.active.type)) {
        this.hud.timerWrap.classList.remove('hidden');
        this.hud.timer.textContent = fmtTime(this.missions.elapsed);
      }
    } else {
      this.hud.objective.textContent = this.onFoot ? 'On foot — find a car' : 'Free drive · explore the city';
      this.hud.distance.textContent = '';
    }
    this.hud.cruise.classList.toggle('show', this.cruise && !this.onFoot);

    // turn-by-turn GPS chip
    if (this.hud.turn) {
      const t = this.navmap.turnInstruction(this.car.pos.x, this.car.pos.z, this.car.heading);
      if (t) {
        this.hud.turn.textContent = `${t.icon} ${t.distance < 950 ? `${Math.round(t.distance / 10) * 10} m` : `${(t.distance / 1000).toFixed(1)} km`}`;
        this.hud.turn.classList.add('show');
      } else {
        this.hud.turn.classList.remove('show');
      }
    }
    // traction control indicator
    if (this.hud.tc) {
      this.hud.tc.textContent = this.car.tcEnabled ? 'TC' : 'TC ✕';
      this.hud.tc.classList.toggle('off', !this.car.tcEnabled);
      this.hud.tc.classList.add('show');
    }

    // wanted
    const stars = this.police.stars;
    if (stars > 0) {
      this.hud.wanted.classList.add('show');
      const pursuit = this.police.pursuers.some((p) => !p.retreat);
      this.hud.wanted.classList.toggle('pursuit', pursuit);
      this.hud.wanted.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
      const esc = clamp(this.police.escapeT / 13, 0, 1);
      this.hud.escapeWrap.classList.toggle('show', pursuit && esc > 0.05);
      this.hud.escape.style.width = `${esc * 100}%`;
    } else {
      this.hud.wanted.classList.remove('show');
      this.hud.escapeWrap.classList.remove('show');
    }

    // toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.hud.toast.className = 'toast';
    }

    this._drawSpeedo();
    this._drawMinimap();
  }

  _drawSpeedo() {
    const ctx = this.speedoCtx;
    if (!ctx) return;
    const W = this.hud.speedo.width, H = this.hud.speedo.height;
    const cx = W / 2, cy = H / 2, R = W / 2 - 8;
    ctx.clearRect(0, 0, W, H);

    const car = this.car;
    const kmh = car.speedKmh;
    const topKmh = (car.stats?.topSpeed || 40) * 3.6 * 1.08;
    const start = Math.PI * 0.75, end = Math.PI * 2.25;

    // dial background
    ctx.beginPath();
    ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,12,22,0.72)';
    ctx.fill();

    // rpm arc
    const rpm = clamp(car.rpm, 0, 1);
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(148,163,184,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, R - 2, start, end);
    ctx.stroke();
    const rpmEnd = start + (end - start) * Math.min(rpm, 1);
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#00d4ff');
    grad.addColorStop(0.7, '#fbbf24');
    grad.addColorStop(1, '#ef4444');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 2, start, rpmEnd);
    ctx.stroke();
    // redline marker
    ctx.strokeStyle = 'rgba(239,68,68,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 2, start + (end - start) * 0.92, end);
    ctx.stroke();

    // speed needle
    const speedFrac = clamp(kmh / topKmh, 0, 1);
    const ang = start + (end - start) * speedFrac;
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (R * 0.25), cy + Math.sin(ang) * (R * 0.25));
    ctx.lineTo(cx + Math.cos(ang) * (R * 0.8), cy + Math.sin(ang) * (R * 0.8));
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // digital speed
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 30px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(kmh)}`, cx, cy - 20);
    ctx.font = '11px Rajdhani, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('KM/H', cx, cy + 2);

    // gear
    ctx.fillStyle = car.nitroActive ? '#38e8b0' : '#00d4ff';
    ctx.font = 'bold 20px Orbitron, monospace';
    const gearTxt = car.speedF < -0.4 ? 'R' : `${car.gear}`;
    ctx.fillText(gearTxt, cx, cy + 26);

    // rpm digits
    ctx.font = '10px Rajdhani, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${Math.round(rpm * 7200)} RPM`, cx, cy + R * 0.62);
  }

  _drawMinimap() {
    if (!this.minimapCtx || !this.hud.minimap) return;
    const player = this.onFoot
      ? { x: this.character.position.x, z: this.character.position.z, heading: this.character.rotation.y }
      : { x: this.car.pos.x, z: this.car.pos.z, heading: this.car.heading };
    const trafficDots = this.traffic.cars.map((c) => this.traffic._carPos(c));
    const policeDots = this.police.pursuers.filter((p) => !p.retreat).map((p) => ({ x: p.x, z: p.z }));
    const rival = this.missions._rival ? this.missions._rival.h.group.position : null;
    const roamDots = this.roamEvents.map((e) => ({ x: e.poi.x, z: e.poi.z }));
    this.navmap.drawMinimap(this.minimapCtx, this.hud.minimap.width, this.hud.minimap.height,
      player, {
        night: TIME.nightFactor(this.dayTime),
        trafficDots, policeDots, roamDots,
        rivalDot: rival ? { x: rival.x, z: rival.z } : null,
        flash: Math.floor(performance.now() / 300) % 2 === 0,
        destColor: this.missions.destColor ? `#${new THREE.Color(this.missions.destColor).getHexString()}` : '#fbbf24',
      });
  }

  // ───────── audio glue ─────────
  _updateAudio(dt) {
    const a = this.audio;
    if (!a.ctx) return;
    if (this.onFoot) {
      a.engineOff();
      a.skid(0); a.wind(0);
    } else {
      a.engineTick(this.car.rpm, this.input.state.throttle, Math.abs(this.car.speedF), this.car.nitroActive);
      a.skid(clamp((this.car.slip - 3) / 8, 0, 1) * (Math.abs(this.car.speedF) > 5 ? 1 : 0));
      a.wind(Math.abs(this.car.speedF));
    }
    // siren by nearest pursuer
    const pursuit = this.police.pursuers.filter((p) => !p.retreat);
    if (pursuit.length) {
      const d = Math.min(...pursuit.map((p) => Math.hypot(p.x - this.car.pos.x, p.z - this.car.pos.z)));
      a.siren(true, clamp(1 - d / 120, 0.15, 1));
    } else {
      a.siren(false);
    }
    a.rain(this.weather.rain);
    a.ambience(TIME.nightFactor(this.dayTime) > 0.5 ? 0.3 : 1);
    a.musicPump(a.ctx.currentTime);
    // indicator tick while hazards blink
    if (this.car.hazards) {
      const ph = Math.floor(performance.now() / 350) % 2;
      if (ph !== this._blinkPhase) {
        this._blinkPhase = ph;
        a.tick();
      }
    }
  }
}

function lerpColorHex(h1, h2, t) {
  const c1 = new THREE.Color(h1), c2 = new THREE.Color(h2);
  return c1.lerp(c2, t).getHex();
}

export { MISSIONS };
