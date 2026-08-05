// ════════════════════════════════════════════
// GAME — input, camera, HUD, minimap, collisions,
// fuel/damage, save/load, main loop.
// ════════════════════════════════════════════
import * as THREE from 'three';
import { CAMERA, COLORS, STATS, SAVE_KEY, TIME, MISSIONS, WORLD } from './config.js';

export class Game {
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.minimapCanvas = minimapCanvas;
    this.mctx = minimapCanvas.getContext('2d');

    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.mode = 'menu';          // 'menu' | 'play' | 'paused' | 'free'
    this.cameraMode = 0;         // 0 chase, 1 hood, 2 top

    // Save state
    this.save = this._loadSave();

    // Runtime stats
    this.fuel = 100;
    this.health = 100;
    this.collisionCooldown = 0;
    this.violationCooldown = 0;
    this.dayTime = 0;            // 0..1 cycle
    this.toastTimer = 0;

    // Bound handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._loop = this._loop.bind(this);
  }

  // ───────── Init (called by main.js after world/car/traffic created) ─────────
  init(scene, camera, renderer, world, car, traffic, missions, audio) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.world = world;
    this.car = car;
    this.traffic = traffic;
    this.missions = missions;
    this.audio = audio;

    // sun + ambient + headlight spotlight
    this.ambient = new THREE.AmbientLight(0x404a66, 0.7);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.9);
    this.sun.position.set(40, 80, 30);
    scene.add(this.ambient, this.sun);
    this.headlight = new THREE.SpotLight(0xfff2c0, 0, 60, Math.PI / 7, 0.4, 1.5);
    scene.add(this.headlight);
    this.headlight.target = car.group;
    scene.add(this.headlight.target);

    // HUD element refs
    this.hud = {
      speed: document.getElementById('hud-speed'),
      fuel: document.getElementById('gauge-fuel'),
      health: document.getElementById('gauge-health'),
      mission: document.getElementById('hud-mission-text'),
      distance: document.getElementById('hud-distance'),
      money: document.getElementById('hud-money'),
      timerWrap: document.getElementById('hud-timer'),
      timer: document.getElementById('hud-timer-text'),
      toast: document.getElementById('toast'),
      hudWrap: document.getElementById('hud'),
    };

    this.camera.position.set(0, CAMERA.chaseHeight, -CAMERA.chaseDist);
  }

  // ───────── Input ─────────
  _bindInput() {
    // Collect every reachable window/document pair. Inside the demo iframe the
    // parent is same-origin, so we can attach listeners on the TOP window too —
    // this is what makes keyboard input reliable regardless of which frame
    // currently has focus (the most common cause of "keys not working").
    this._targets = [window];
    this._docTargets = [document];
    try {
      if (window.parent && window.parent !== window) {
        this._targets.push(window.parent);
        this._docTargets.push(window.parent.document);
      }
      if (window.top && window.top !== window && window.top !== window.parent) {
        this._targets.push(window.top);
        this._docTargets.push(window.top.document);
      }
    } catch { /* cross-origin — ignore */ }

    for (const w of this._targets) {
      w.addEventListener('keydown', this._onKeyDown);
      w.addEventListener('keyup', this._onKeyUp);
    }
    for (const d of this._docTargets) {
      d.addEventListener('keydown', this._onKeyDown);
      d.addEventListener('keyup', this._onKeyUp);
    }
    window.addEventListener('blur', this._onBlur);

    // Click/touch anywhere refocuses the iframe (best-effort).
    this._refocus = () => { try { window.focus(); } catch {} try { document.body?.focus?.(); } catch {} };
    document.addEventListener('click', this._refocus);
    document.addEventListener('touchstart', this._refocus, { passive: true });

    // Click-to-toggle cruise control: click the canvas to toggle auto-throttle
    // on/off. Works as a real input method (click-to-drive) and survives
    // instant-release pointer events.
    this._cruise = false;
    this._canvasClick = (e) => {
      const t = e.target;
      if (t.closest('button, a, .overlay, .hud-icon-btn, .mobile-controls, .input-readout')) return;
      this._cruise = !this._cruise;
    };
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.addEventListener('click', this._canvasClick);

    this._refocus();
  }
  _unbindInput() {
    for (const w of this._targets || []) {
      w.removeEventListener('keydown', this._onKeyDown);
      w.removeEventListener('keyup', this._onKeyUp);
    }
    for (const d of this._docTargets || []) {
      d.removeEventListener('keydown', this._onKeyDown);
      d.removeEventListener('keyup', this._onKeyUp);
    }
    window.removeEventListener('blur', this._onBlur);
    if (this._refocus) {
      document.removeEventListener('click', this._refocus);
      document.removeEventListener('touchstart', this._refocus);
    }
    const canvas = document.getElementById('game-canvas');
    if (canvas && this._canvasClick) canvas.removeEventListener('click', this._canvasClick);
  }

  _onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()) || k === ' ') {
      e.preventDefault();
    }
    if (k === 'arrowup' || k === 'w') this.input.throttle = 1;
    if (k === 'arrowdown' || k === 's') this.input.brake = 1;
    if (k === 'arrowleft' || k === 'a') this.input.steer = -1;
    if (k === 'arrowright' || k === 'd') this.input.steer = 1;
    if (k === ' ') this.input.handbrake = true;
    if (k === 'c') this.cycleCamera();
    if (k === 'h') this.audio && this.audio.horn();
    if (k === 'p' || k === 'escape') {
      if (this.mode === 'play') this.pause();
      else if (this.mode === 'paused') this.resume();
    }
    if (k === 'm') this.toggleSound();
  }
  _onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') this.input.throttle = 0;
    if (k === 'arrowdown' || k === 's') this.input.brake = 0;
    if (k === 'arrowleft' || k === 'a') this.input.steer = 0;
    if (k === 'arrowright' || k === 'd') this.input.steer = 0;
    if (k === ' ') this.input.handbrake = false;
  }
  _onBlur() { this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false }; }

  // Mobile touch input setters (called by main.js wiring)
  setTouch(name, val) {
    if (name === 'left') this.input.steer = val ? -1 : (this._touchRight ? 1 : 0), this._touchLeft = val;
    if (name === 'right') this.input.steer = val ? 1 : (this._touchLeft ? -1 : 0), this._touchRight = val;
    if (name === 'gas') this.input.throttle = val ? 1 : 0;
    if (name === 'brake') this.input.brake = val ? 1 : 0;
    if (name === 'handbrake') this.input.handbrake = val;
  }

  // ───────── Save / load ─────────
  _loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      money: 0,
      xp: 0,
      completedMissions: [],
      sound: true,
    };
  }
  _persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch {}
  }

  // ───────── Camera ─────────
  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % 3;
  }
  _updateCamera(dt) {
    const car = this.car;
    const heading = car.heading;
    if (this.cameraMode === 0) {
      // chase
      const back = CAMERA.chaseDist;
      const behind = new THREE.Vector3(
        car.pos.x - Math.sin(heading) * back,
        CAMERA.chaseHeight,
        car.pos.z - Math.cos(heading) * back
      );
      this.camera.position.lerp(behind, CAMERA.chaseLerp);
      this.camera.lookAt(car.pos.x, 1.2, car.pos.z);
    } else if (this.cameraMode === 1) {
      // hood
      const off = new THREE.Vector3(
        car.pos.x + Math.sin(heading) * CAMERA.hoodOffset[2] + Math.cos(heading) * CAMERA.hoodOffset[0],
        CAMERA.hoodOffset[1],
        car.pos.z + Math.cos(heading) * CAMERA.hoodOffset[2] - Math.sin(heading) * CAMERA.hoodOffset[0]
      );
      this.camera.position.copy(off);
      const look = new THREE.Vector3(
        car.pos.x + Math.sin(heading) * 10,
        1.2,
        car.pos.z + Math.cos(heading) * 10
      );
      this.camera.lookAt(look);
    } else {
      // top
      const target = new THREE.Vector3(car.pos.x, CAMERA.topHeight, car.pos.z + 0.1);
      this.camera.position.lerp(target, CAMERA.topLerp);
      this.camera.lookAt(car.pos.x, 0, car.pos.z);
    }
  }

  // ───────── Toast ─────────
  toast(msg, kind = 'info', duration = 1.6) {
    const t = this.hud.toast;
    t.textContent = msg;
    t.className = `toast ${kind}`;
    this.toastTimer = duration;
  }

  // ───────── Main loop control ─────────
  startPlay(missionId = null) {
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this._touchLeft = this._touchRight = false;
    this.fuel = 100;
    this.health = 100;
    this.dayTime = 0.25;
    // Spawn the car on a clear road centerline, well away from any building.
    // x=0 and z=0 are both road lines (the central intersection) — open space.
    this.car.reset(0, 0, 0);
    this.car.heading = 0;

    this.mode = missionId ? 'play' : 'free';
    if (missionId) {
      this.missions.start(missionId);
      this.hud.mission.textContent = this.missions.active.name;
      this.hud.timerWrap.classList.toggle('hidden', !this.missions.active.timeLimit);
    } else {
      this.missions.clear();
      this.hud.mission.textContent = 'Free Drive';
      this.hud.timerWrap.classList.add('hidden');
    }

    this.hud.hudWrap.classList.remove('hidden');
    this._bindInput();
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  pause() {
    if (this.mode !== 'play' && this.mode !== 'free') return;
    this.paused = true;
    this.mode = 'paused';
    document.getElementById('pause-menu').classList.remove('hidden');
  }
  resume() {
    this.paused = false;
    this.mode = this.missions.active ? 'play' : 'free';
    document.getElementById('pause-menu').classList.add('hidden');
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    this._unbindInput();
    this.missions.clear();
    this.hud.hudWrap.classList.add('hidden');
  }

  toggleSound() {
    this.save.sound = !this.save.sound;
    this._persistSave();
    if (this.audio) this.audio.setEnabled(this.save.sound);
    const btn = document.getElementById('btn-sound');
    btn.textContent = this.save.sound ? '🔊' : '🔇';
    this.toast(this.save.sound ? 'Sound On' : 'Sound Off', 'info');
  }

  // ───────── The loop ─────────
  _loop(now) {
    if (!this.running || this.paused) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // Sync the keyboard/touch input (held on the Game) into the Car so its
    // physics reads the latest throttle/brake/steer/handbrake each frame.
    // Cruise control (canvas click-toggle) overrides throttle when active.
    this.car.input.throttle = this._cruise ? 1 : this.input.throttle;
    this.car.input.brake = this.input.brake;
    this.car.input.steer = this.input.steer;
    this.car.input.handbrake = this.input.handbrake;

    // Car physics
    const carInfo = this.car.update(dt);

    // Collisions with buildings
    const px = this.car.pos.x, pz = this.car.pos.z;
    for (const c of this.world.collidables) {
      const dx = px - c.x, dz = pz - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.r + 1.4;
      if (d < minD) {
        // push out + damage
        const nx = dx / (d || 1), nz = dz / (d || 1);
        this.car.pos.x = c.x + nx * minD;
        this.car.pos.z = c.z + nz * minD;
        this.car.group.position.copy(this.car.pos);
        this._handleCollision(Math.abs(this.car.speed));
        this.car.speed *= -0.3;
      }
    }

    // World bounds
    const lim = WORLD.size / 2 - 2;
    if (Math.abs(this.car.pos.x) > lim) { this.car.pos.x = Math.sign(this.car.pos.x) * lim; this.car.speed *= 0.3; }
    if (Math.abs(this.car.pos.z) > lim) { this.car.pos.z = Math.sign(this.car.pos.z) * lim; this.car.speed *= 0.3; }

    // Traffic collision
    const hitTraffic = this.traffic.checkCollision(px, pz);
    if (hitTraffic) {
      this._handleCollision(Math.abs(this.car.speed) + 6);
      this.car.speed *= -0.4;
      // nudge back
      const dx = px - hitTraffic.x, dz = pz - hitTraffic.z;
      const d = Math.hypot(dx, dz) || 1;
      this.car.pos.x += (dx / d) * 0.6;
      this.car.pos.z += (dz / d) * 0.6;
      this.car.group.position.copy(this.car.pos);
    }

    // Traffic update
    this.traffic.update(dt, this.car.pos, this.car);
    this.world.updateLights(dt);

    // Fuel
    const fuelDrain = (carInfo.moving ? STATS.fuelDrainPerSec : STATS.fuelDrainIdle) * dt;
    this.fuel = Math.max(0, this.fuel - fuelDrain);
    if (this.fuel <= 0) {
      // can't accelerate
      this.input.throttle = 0;
      if (Math.abs(this.car.speed) < 0.3) {
        this._fail('Out of fuel! Visit a gas station.');
        return;
      }
    }

    // Gas station refuel / repair
    let atStation = false;
    for (const g of this.world.gasStations) {
      if (Math.hypot(px - g.x, pz - g.z) < g.radius) {
        atStation = true;
        this.fuel = Math.min(100, this.fuel + STATS.refuelPerSec * dt);
        this.health = Math.min(100, this.health + STATS.repairPerSec * dt);
        if (Math.abs(this.car.speed) < 1 && Math.floor(this.fuel) % 10 === 0) {
          // occasional toast
        }
      }
    }

    // Red light violation detection (simplified)
    this.violationCooldown -= dt;
    const onRoad = this.world.isOnRoad(px, pz);
    const lightState = this.world.lightStateAt(px, pz);
    if (onRoad && lightState && this.collisionCooldown <= 0 && Math.abs(this.car.speed) > 12) {
      // check if running red: approaching intersection on green-for-other-axis
      // (simplified heuristic)
    }

    // Cooldowns
    this.collisionCooldown -= dt;

    // Day/night
    this.dayTime = (this.dayTime + dt / TIME.cycleSec) % 1;
    const isNight = this.dayTime > TIME.nightStart || this.dayTime < TIME.dayStart;
    this._applyTimeOfDay(isNight);

    // Mission
    if (this.mode === 'play' && this.missions.active) {
      const result = this.missions.update(dt, this.car);
      if (result && result.completed) {
        this._completeMission();
        return;
      }
      if (result && result.failed) {
        this._fail(result.reason);
        return;
      }
    }

    // Health failure
    if (this.health <= 0) {
      this._fail('Vehicle destroyed!');
      return;
    }

    // Camera + HUD
    this._updateCamera(dt);
    this._updateHUD(carInfo, isNight);

    // Toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.hud.toast.classList.add('hidden');
    }

    // Audio
    if (this.audio) this.audio.engine(Math.abs(this.car.speed), this.input.throttle > 0);
  }

  _handleCollision(speed) {
    if (this.collisionCooldown > 0) return;
    this.collisionCooldown = 0.5;
    const dmg = STATS.damageOnCollision * Math.min(2, speed / 20);
    this.health = Math.max(0, this.health - dmg);
    this.missions.registerCollision();
    this.toast('⚠️ COLLISION', 'info', 1.2);
    if (this.audio) this.audio.crash();
  }

  _fail(reason) {
    this.running = false;
    this.mode = 'menu';
    this._unbindInput();
    document.getElementById('fail-title').textContent = 'Mission Failed';
    document.getElementById('fail-reason').textContent = reason;
    document.getElementById('fail-menu').classList.remove('hidden');
  }

  _completeMission() {
    const res = this.missions.finalize();
    this.save.money += res.money;
    this.save.xp += res.xp;
    if (!this.save.completedMissions.includes(this.missions.active.id)) {
      this.save.completedMissions.push(this.missions.active.id);
    }
    this._persistSave();
    this.running = false;
    this.mode = 'menu';
    this._unbindInput();
    document.getElementById('complete-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    document.getElementById('complete-money').textContent = `+$${res.money}`;
    document.getElementById('complete-xp').textContent = `+${res.xp}`;
    document.getElementById('complete-menu').classList.remove('hidden');
  }

  _applyTimeOfDay(isNight) {
    if (isNight) {
      this.ambient.intensity = 0.25;
      this.sun.intensity = 0.15;
      this.scene.fog.color.setHex(0x050810);
      this.scene.background = new THREE.Color(0x050810);
      this.headlight.intensity = 2.5;
      this.car.setHeadlights(true);
      this.renderer.setClearColor(0x050810, 1);
    } else {
      this.ambient.intensity = 0.7;
      this.sun.intensity = 0.9;
      this.scene.fog.color.setHex(0x0a1020);
      this.scene.background = new THREE.Color(0x0a1020);
      this.headlight.intensity = 0;
      this.car.setHeadlights(false);
      this.renderer.setClearColor(0x0a1020, 1);
    }
  }

  _updateHUD(carInfo, isNight) {
    this.hud.speed.textContent = Math.round(carInfo.speedKmh);
    this.hud.fuel.style.width = `${this.fuel}%`;
    this.hud.health.style.width = `${this.health}%`;
    // color gauges by level
    this.hud.fuel.style.background = this.fuel < STATS.lowFuelThreshold
      ? 'linear-gradient(90deg, #ef4444, #f97316)'
      : 'linear-gradient(90deg, #00d4ff, #38bdf8)';
    this.hud.health.style.background = this.health < STATS.lowHealthThreshold
      ? 'linear-gradient(90deg, #ef4444, #f97316)'
      : 'linear-gradient(90deg, #10b981, #34d399)';
    this.hud.money.textContent = `$${this.save.money.toLocaleString()}`;
    if (this.missions.active) {
      const d = this.missions.distanceTo(this.car.pos.x, this.car.pos.z);
      this.hud.distance.textContent = `${Math.round(d)}m`;
      if (this.missions.active.timeLimit > 0) {
        this.hud.timer.textContent = this.missions.timeLeftFormatted();
      }
    }
    this._drawMinimap(isNight);
  }

  _drawMinimap(isNight) {
    const ctx = this.mctx;
    const W = this.minimapCanvas.width;
    const H = this.minimapCanvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isNight ? 'rgba(5,8,16,0.8)' : 'rgba(8,13,26,0.8)';
    ctx.fillRect(0, 0, W, H);

    // scale: world size → minimap size
    const scale = (W - 16) / WORLD.size;
    const cx = W / 2, cy = H / 2;
    const carX = this.car.pos.x, carZ = this.car.pos.z;
    const toMap = (wx, wz) => ({ x: cx + (wx - carX) * scale, y: cy + (wz - carZ) * scale });

    // roads (grid lines)
    ctx.strokeStyle = 'rgba(0,212,255,0.35)';
    ctx.lineWidth = 1.5;
    const { blockSize, blocksX, blocksZ } = WORLD;
    const halfX = (blockSize * blocksX) / 2;
    const halfZ = (blockSize * blocksZ) / 2;
    for (let i = 0; i <= blocksX; i++) {
      const x = i * blockSize - halfX;
      const a = toMap(x, -halfZ), b = toMap(x, halfZ);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let j = 0; j <= blocksZ; j++) {
      const z = j * blockSize - halfZ;
      const a = toMap(-halfX, z), b = toMap(halfX, z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // gas station
    ctx.fillStyle = '#00d4ff';
    for (const g of this.world.gasStations) {
      const p = toMap(g.x, g.z);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // parking zones
    ctx.fillStyle = '#10b981';
    for (const z of this.world.parkingZones) {
      const p = toMap(z.x, z.z);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    // destination
    if (this.missions._dest) {
      ctx.fillStyle = this.missions.active && this.missions.active.type === 'parking' ? '#10b981' : '#fbbf24';
      const p = toMap(this.missions._dest.x, this.missions._dest.z);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // player (triangle pointing heading)
    ctx.save();
    const pc = toMap(carX, carZ);
    ctx.translate(pc.x, pc.y);
    ctx.rotate(-this.car.heading);
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(3.5, 4); ctx.lineTo(-3.5, 4); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// expose MISSIONS for menu UI
export { MISSIONS };
