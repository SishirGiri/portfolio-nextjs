// ════════════════════════════════════════════
// MAIN — init Three.js, build world/car/traffic,
// wire UI, manage menu state, audio.
// ════════════════════════════════════════════
import * as THREE from 'three';
import { World } from './world.js';
import { Car } from './car.js';
import { Traffic } from './traffic.js';
import { MissionManager } from './missions.js';
import { Game, MISSIONS } from './game.js';
import { CAMERA, COLORS, WORLD } from './config.js';

// ───────── Audio (simple WebAudio beeps + engine hum) ─────────
class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.engineOsc = null;
    this.engineGain = null;
  }
  _ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
  setEnabled(on) {
    this.enabled = on;
    if (!on) this._stopEngine();
  }
  _beep(freq, dur, type = 'square', vol = 0.08) {
    if (!this.enabled) return;
    this._ensure();
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(this.ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.stop(this.ctx.currentTime + dur);
  }
  horn() { this._beep(420, 0.25, 'sawtooth', 0.12); }
  crash() { this._beep(120, 0.18, 'square', 0.15); }
  click() { this._beep(660, 0.05, 'square', 0.05); }
  success() { this._beep(660, 0.12); setTimeout(() => this._beep(880, 0.18), 120); }
  _stopEngine() {
    if (this.engineOsc) { try { this.engineOsc.stop(); } catch {} this.engineOsc.disconnect(); this.engineOsc = null; }
    if (this.engineGain) { this.engineGain.disconnect(); this.engineGain = null; }
  }
  engine(speed, throttle) {
    if (!this.enabled) { this._stopEngine(); return; }
    this._ensure();
    if (!this.ctx) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 80;
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    }
    const targetFreq = 70 + speed * 2.5;
    const targetGain = throttle ? 0.05 : (speed > 1 ? 0.03 : 0);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }
}

// ───────── Boot ─────────
function boot() {
  const canvas = document.getElementById('game-canvas');
  const minimap = document.getElementById('minimap');

  // Make the document focusable so keyboard events reach the game even
  // when running inside an iframe (iframes don't receive keys without focus).
  document.body.setAttribute('tabindex', '-1');
  canvas.setAttribute('tabindex', '0');
  // Try to grab focus on load.
  try { window.focus(); document.body.focus(); } catch {}

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a1020, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1020);
  scene.fog = new THREE.Fog(0x0a1020, 60, 180);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, CAMERA.chaseHeight, -CAMERA.chaseDist);

  const world = new World(scene);
  const car = new Car(scene);
  const traffic = new Traffic(scene, world);
  const missions = new MissionManager(scene, world);
  const audio = new Audio();

  const game = new Game(canvas, minimap);
  game.init(scene, camera, renderer, world, car, traffic, missions, audio);
  audio.setEnabled(game.save.sound);

  // resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // render once for menu background
  renderer.render(scene, camera);

  // expose for debugging
  window.__game = game;

  // ───────── UI wiring ─────────
  const $ = (id) => document.getElementById(id);
  const show = (id) => $(id).classList.remove('hidden');
  const hide = (id) => $(id).classList.add('hidden');

  function refreshMenu() {
    $('menu-money').textContent = `$${game.save.money.toLocaleString()}`;
    $('menu-xp').textContent = game.save.xp.toLocaleString();
    $('menu-missions').textContent = `${game.save.completedMissions.length}/${MISSIONS.length}`;
    $('btn-sound').textContent = game.save.sound ? '🔊' : '🔇';
    // Continue button only if any progress
    const hasProgress = game.save.completedMissions.length > 0 || game.save.money > 0;
    $('btn-continue').classList.toggle('hidden', !hasProgress);
  }

  function showMissionsMenu() {
    const list = $('missions-list');
    list.innerHTML = '';
    MISSIONS.forEach((m, idx) => {
      const done = game.save.completedMissions.includes(m.id);
      // unlock sequentially: first always unlocked; next unlocked if previous done
      const unlocked = idx === 0 || game.save.completedMissions.includes(MISSIONS[idx - 1].id);
      const el = document.createElement('div');
      el.className = `mission-item ${done ? 'done' : ''} ${unlocked ? '' : 'locked'}`;
      el.innerHTML = `
        <div class="mi-icon">${m.icon}</div>
        <div class="mi-info">
          <div class="mi-name">${m.name}</div>
          <div class="mi-desc">${m.desc}${m.timeLimit ? ` · ${m.timeLimit}s` : ''}</div>
        </div>
        <div class="mi-status ${done ? 'done' : unlocked ? '' : 'locked'}">${done ? '✓ Done' : unlocked ? '▶ Play' : '🔒'}</div>
      `;
      if (unlocked) {
        el.addEventListener('click', () => {
          audio.click();
          hide('missions-menu');
          startGame(m.id);
        });
      }
      list.appendChild(el);
    });
    hide('menu');
    show('missions-menu');
  }

  function startGame(missionId = null) {
    hide('menu'); hide('missions-menu'); hide('controls-menu');
    hide('complete-menu'); hide('fail-menu'); hide('pause-menu');
    audio.click();
    game.startPlay(missionId);
    // Touch controls are always available — they're useful on desktop too
    // (click-hold works like touch) and not just mobile devices.
    $('mobile-controls').classList.remove('hidden');
  }

  // Main menu buttons
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.click();
      const action = btn.dataset.action;
      if (action === 'career') showMissionsMenu();
      else if (action === 'free') startGame(null);
      else if (action === 'controls') { hide('menu'); show('controls-menu'); }
      else if (action === 'continue') {
        // continue = restart last unlocked mission, or first
        const last = MISSIONS.find((m) => !game.save.completedMissions.includes(m.id)) || MISSIONS[0];
        startGame(last.id);
      }
      else if (action === 'back-menu') {
        hide('missions-menu'); hide('controls-menu'); show('menu');
        refreshMenu();
      }
      else if (action === 'resume') game.resume();
      else if (action === 'restart') {
        hide('pause-menu'); hide('complete-menu'); hide('fail-menu');
        startGame(game.missions.active ? game.missions.active.id : null);
      }
      else if (action === 'quit') {
        game.stop();
        hide('pause-menu'); hide('complete-menu'); hide('fail-menu');
        $('mobile-controls').classList.add('hidden');
        show('menu');
        refreshMenu();
      }
      else if (action === 'next') {
        // next mission
        const cur = game.missions.active;
        const idx = MISSIONS.findIndex((m) => m.id === cur.id);
        const nextM = MISSIONS[idx + 1];
        hide('complete-menu');
        if (nextM) startGame(nextM.id);
        else { game.stop(); show('menu'); refreshMenu(); }
      }
    });
  });

  // HUD buttons
  $('btn-pause').addEventListener('click', () => { audio.click(); game.pause(); });
  $('btn-sound').addEventListener('click', () => { game.toggleSound(); });

  // ───────── Mobile touch controls ─────────
  const wireTouch = (id, name) => {
    const el = $(id);
    if (!el) return;
    const on = (e) => { e.preventDefault(); el.classList.add('active'); game.setTouch(name, true); };
    const off = (e) => { e.preventDefault(); el.classList.remove('active'); game.setTouch(name, false); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on);
    el.addEventListener('mouseup', off);
    el.addEventListener('mouseleave', off);
  };
  wireTouch('mc-left', 'left');
  wireTouch('mc-right', 'right');
  wireTouch('mc-gas', 'gas');
  wireTouch('mc-brake', 'brake');
  wireTouch('mc-handbrake', 'handbrake');
  $('mc-camera')?.addEventListener('click', (e) => { e.preventDefault(); audio.click(); game.cycleCamera(); });
  $('mc-horn')?.addEventListener('click', (e) => { e.preventDefault(); audio.horn(); });

  // pause on tab blur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.mode === 'play') game.pause();
  });

  // success sound hook on complete
  const _origComplete = game._completeMission.bind(game);
  game._completeMission = function () {
    audio.success();
    _origComplete();
  };

  // Hide loader, show menu
  refreshMenu();
  hide('loader');
  show('menu');
}

// wait for fonts/DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
