// ════════════════════════════════════════════════════════
// MAIN — boot Three.js, build all systems, wire every UI:
// main menu, mission select, garage (upgrades/paint/spoiler),
// dealership, settings, controls, pause, complete/fail,
// fullscreen map, leaderboard + account overlays, mobile
// controls, resize, bloom (high). Online features are
// optional and fail soft — the game never waits on them.
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { City } from './city.js';
import { PlayerCar } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { MissionManager } from './missions.js';
import { NavMap } from './navmap.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Game, MISSIONS } from './game.js';
import {
  CARS, CAR_BY_ID, UPGRADES, PAINTS, SPOILERS, WHEELS, CALIPERS, BODYKITS, EXHAUSTS,
  ECONOMY, QUALITY_PRESETS, WORLD,
} from './config.js';
import { computeStats } from './gameplay/stats.js';
import { EventBus } from './core/EventBus.js';
import { State } from './core/GameState.js';
import { GameLoop } from './core/GameLoop.js';
import { EVENTS } from './core/events.js';
import { APIClient } from './services/APIClient.js';
import { AuthService } from './services/AuthService.js';
import { SaveService } from './services/SaveService.js';
import { SyncService } from './services/SyncService.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { RealtimeService } from './services/RealtimeService.js';
import { MultiplayerService } from './services/MultiplayerService.js';
import { createBrowserStorage } from './services/storage.js';
import { fmtMoney, fmtTime, clamp } from './utils.js';

const CAREER = MISSIONS.filter((m) => !m.roam);

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');

// Surface runtime errors on screen — silent failures in a demo iframe are worse.
function reportError(msg) {
  const el = $('loader');
  if (!el) return;
  el.classList.remove('hidden');
  el.innerHTML = `<div style="max-width:640px;white-space:pre-wrap;color:#fda4af;font-size:13px;">
    ⚠ Runtime error — please reload.<br/>${String(msg).replace(/</g, '&lt;')}</div>`;
}
window.addEventListener('error', (e) => reportError(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason?.stack || e.reason));

// ════════════════════════════════════════════
// Boot
// ════════════════════════════════════════════
async function boot() {
  const canvas = $('game-canvas');
  document.body.setAttribute('tabindex', '-1');
  try { window.focus(); document.body.focus(); } catch {}

  // ── online services (optional, fail soft) ──
  const storage = createBrowserStorage();
  const bus = new EventBus();
  const api = new APIClient();
  const auth = new AuthService(api, bus, storage);
  const saves = new SaveService(bus, storage);
  const sync = new SyncService(api, auth, saves, bus, storage);
  const leaderboard = new LeaderboardService(api, bus);
  const realtime = new RealtimeService(bus, auth);
  const multiplayer = new MultiplayerService(bus, realtime);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1120);
  scene.fog = new THREE.Fog(0x0a1120, 40, 320);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 560);
  camera.position.set(0, 60, 90);
  camera.lookAt(0, 0, 0);

  // soft image-based lighting for PBR materials
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch { /* non-fatal */ }

  // systems
  const audio = new AudioEngine();
  const input = new Input();
  const city = new City(scene, {});
  const car = new PlayerCar(scene);
  const traffic = new Traffic(scene, city);
  const peds = new Pedestrians(scene, city);
  const police = new Police(scene, city);
  const missions = new MissionManager(scene, city);
  const navmap = new NavMap(city);
  const game = new Game(canvas, { bus, saves, leaderboard, multiplayer });
  game.state.set(State.LOADING);
  game.init({
    scene, camera, renderer, city, car, traffic, peds, police, missions, navmap, audio, input,
    quality: game.save.settings.quality,
  });
  game._applySavedCar();
  audio.setVolumes(game.save.settings.volumes);
  audio.setEnabled(game.save.settings.sound);
  game.car.trans = game.save.settings.transmission;

  // menu music starts once the first gesture unlocks the context
  const startMenuMusic = () => {
    if (!game.running && !game.paused) audio.menuMusic(true);
  };
  startMenuMusic();

  window.__game = game; // debug hook

  // ── optional bloom at High quality ──
  let composer = null;
  async function setupBloom() {
    if (composer || game.quality !== 'high') return;
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
      ]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.55, 0.86));
      composer.addPass(new OutputPass());
      game._render = () => composer.render();
      onResize();
    } catch { composer = null; }
  }
  if (game.quality === 'high' || game.quality === 'ultra') setupBloom();

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer?.setSize(window.innerWidth, window.innerHeight);
    sizeMapCanvas();
  }
  window.addEventListener('resize', onResize);

  // ════════════════════════════════════════════
  // UI hooks from the game core
  // ════════════════════════════════════════════
  game.ui.onPrompt = (text) => {
    const el = $('hud-prompt');
    if (text) { el.textContent = text; el.classList.add('show'); }
    else el.classList.remove('show');
  };
  game.ui.onPause = (p) => { p ? show('pause-menu') : hide('pause-menu'); };
  game.ui.onMap = (open) => {
    if (open) { show('map-overlay'); drawBigMap(); }
    else hide('map-overlay');
  };
  game.ui.onGarage = () => { game.pause(); openGarage(); };
  game.ui.onDealer = () => { game.pause(); openDealer(); };
  game.ui.onLevelUp = (lv) => game.toast(`⬆ LEVEL ${lv}! New content unlocked`, 'good', 3);
  game.ui.onRoamDone = (res) => {
    // roam events flow straight back into free drive
    game.startPlay(null, { keepPosition: true });
    game.toast(res ? `✓ Event complete +${fmtMoney(res.money)}` : '✕ Event failed', res ? 'good' : 'warn', 2.5);
  };
  game.ui.onComplete = (res) => {
    $('complete-title').textContent = res.mission.name;
    $('complete-stars').textContent = '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('complete-money').textContent = `+${fmtMoney(res.money)}`;
    $('complete-xp').textContent = `+${res.xp}`;
    const nextIdx = CAREER.findIndex((m) => m.id === res.mission.id) + 1;
    $('btn-next').classList.toggle('hidden', nextIdx >= CAREER.length);
    show('complete-menu');
    hide('hud');
    $('mobile-controls').classList.add('hidden');
    menuLoop();
  };
  game.ui.onFail = (reason) => {
    $('fail-reason').textContent = reason;
    show('fail-menu');
    hide('hud');
    $('mobile-controls').classList.add('hidden');
    menuLoop();
  };

  // ════════════════════════════════════════════
  // Main menu
  // ════════════════════════════════════════════
  function refreshMenu() {
    $('menu-money').textContent = fmtMoney(game.save.money);
    $('menu-xp').textContent = `${game.save.xp.toLocaleString()} · LV ${game.level}`;
    const done = CAREER.filter((m) => game.save.completed[m.id]).length;
    $('menu-missions').textContent = `${done}/${CAREER.length}`;
    const hasProgress = done > 0 || game.save.money > ECONOMY.startMoney;
    $('btn-continue').classList.toggle('hidden', !hasProgress);
  }

  function startGame(missionId) {
    hideAllOverlays();
    audio.click();
    game.startPlay(missionId);
    $('mobile-controls').classList.remove('hidden');
  }

  const OVERLAY_STATE = {
    'missions-menu': State.MISSIONS,
    'garage-menu': State.GARAGE,
    'dealer-menu': State.DEALER,
    'settings-menu': State.SETTINGS,
    'controls-menu': State.MENU,
    'leaderboard-menu': State.LEADERBOARD,
    'account-menu': State.ACCOUNT,
    'mp-menu': State.MULTIPLAYER,
    'friends-menu': State.FRIENDS,
    'coach-menu': State.COACH,
    'admin-menu': State.ADMIN,
  };

  function hideAllOverlays() {
    for (const id of ['menu', 'missions-menu', 'controls-menu', 'settings-menu',
      'garage-menu', 'dealer-menu', 'pause-menu', 'complete-menu', 'fail-menu',
      'map-overlay', 'leaderboard-menu', 'account-menu',
      'mp-menu', 'friends-menu', 'coach-menu', 'admin-menu']) {
      hide(id);
    }
  }

  function backToMenu() {
    hideAllOverlays();
    refreshMenu();
    show('menu');
    if (game.state.current !== State.MENU) game.state.set(State.MENU);
    audio.back();
    startMenuMusic();
    menuLoop();
  }

  function openOverlay(id) {
    hideAllOverlays();
    show(id);
    audio.menuTransition();
    const st = OVERLAY_STATE[id];
    if (st && st !== game.state.current) game.state.set(st);
  }

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.click();
      const a = btn.dataset.action;
      switch (a) {
        case 'continue': {
          const next = CAREER.find((m) => !game.save.completed[m.id]) || CAREER[0];
          startGame(next.id);
          break;
        }
        case 'new-game': {
          const btn = $('btn-new-game');
          if (btn.dataset.confirm) {
            delete btn.dataset.confirm;
            btn.textContent = '✦ New Game';
            btn.classList.remove('danger-confirm');
            saves.reset();
            game._applySavedCar();
            refreshAccountUI();
            refreshMenu();
            audio.deny(); // deliberate "wipe" cue
          } else {
            btn.dataset.confirm = '1';
            btn.textContent = 'Click again to wipe progress';
            btn.classList.add('danger-confirm');
            setTimeout(() => {
              delete btn.dataset.confirm;
              btn.textContent = '✦ New Game';
              btn.classList.remove('danger-confirm');
            }, 3000);
          }
          break;
        }
        case 'career': buildMissionList(); openOverlay('missions-menu'); break;
        case 'free': startGame(null); break;
        case 'multiplayer': buildMultiplayerPanel(); openOverlay('mp-menu'); break;
        case 'friends': buildFriendsPanel(); openOverlay('friends-menu'); break;
        case 'coach': buildCoachPanel(); openOverlay('coach-menu'); break;
        case 'admin': buildAdminPanel(); openOverlay('admin-menu'); break;
        case 'mp-queue': {
          const level = game.level ?? 0;
          const carId = game.save.currentCar || 'toro';
          if (!multiplayer.queue(carId, level)) {
            game.toast?.('Multiplayer offline — check your connection.', 'warn');
          }
          break;
        }
        case 'mp-cancel': multiplayer.cancelQueue(); buildMultiplayerPanel(); break;
        case 'controls': openOverlay('controls-menu'); break;
        case 'settings': buildSettings(); openOverlay('settings-menu'); break;
        case 'garage': openGarage(); break;
        case 'dealer': openDealer(); break;
        case 'leaderboard': buildLeaderboard(); openOverlay('leaderboard-menu'); break;
        case 'account': buildAccount(); openOverlay('account-menu'); break;
        case 'back-menu': backToMenu(); break;
        case 'resume': game.resume(); break;
        case 'restart':
          startGame(game.missions.active ? game.missions.active.id : null);
          break;
        case 'pause-settings': hide('pause-menu'); buildSettings(); openOverlay('settings-menu');
          $('settings-back-target').value = 'pause';
          break;
        case 'quit':
          game.stop();
          $('mobile-controls').classList.add('hidden');
          backToMenu();
          break;
        case 'next': {
          const curIdx = CAREER.findIndex((m) => m.id === game.missions.active?.id);
          const nxt = CAREER[curIdx + 1];
          if (nxt) startGame(nxt.id);
          else backToMenu();
          break;
        }
        case 'replay': startGame(game.missions.active ? game.missions.active.id : null); break;
        case 'menu-return': backToMenu(); break;
      }
    });
  });

  // ════════════════════════════════════════════
  // Mission select
  // ════════════════════════════════════════════
  function buildMissionList() {
    const list = $('missions-list');
    list.innerHTML = '';
    CAREER.forEach((m, idx) => {
      const rec = game.save.completed[m.id];
      const prevDone = idx === 0 || !!game.save.completed[CAREER[idx - 1].id];
      const levelOK = game.level >= m.levelReq;
      const unlocked = prevDone && levelOK;
      const el = document.createElement('div');
      el.className = `mission-item ${rec ? 'done' : ''} ${unlocked ? '' : 'locked'}`;
      el.innerHTML = `
        <div class="mi-icon">${m.icon}</div>
        <div class="mi-info">
          <div class="mi-name">${m.name} ${rec ? `<span class="mi-stars">${'★'.repeat(rec.stars)}</span>` : ''}</div>
          <div class="mi-desc">${m.desc}</div>
          <div class="mi-meta">💰 ${fmtMoney(m.reward)} · ⭐ ${m.xp} XP
            ${m.timeLimit ? ` · ⏱ ${m.timeLimit}s` : ''}
            ${rec?.bestTime ? ` · 🏆 ${fmtTime(rec.bestTime)}` : ''}
            ${!levelOK ? ` · 🔒 Level ${m.levelReq}` : ''}</div>
        </div>
        <div class="mi-status ${rec ? 'done' : unlocked ? '' : 'locked'}">${rec ? '✓' : unlocked ? '▶' : '🔒'}</div>`;
      if (unlocked) el.addEventListener('click', () => { audio.click(); startGame(m.id); });
      list.appendChild(el);
    });
  }

  // ════════════════════════════════════════════
  // Garage
  // ════════════════════════════════════════════
  function openGarage() { buildGarage(); openOverlay('garage-menu'); }

  function buildGarage() {
    const tabs = $('garage-tabs');
    tabs.innerHTML = '';
    const ownedIds = Object.keys(game.save.ownedCars);
    if (!ownedIds.includes(game.save.currentCar)) ownedIds.push(game.save.currentCar);
    for (const id of ownedIds) {
      const def = CAR_BY_ID[id];
      const b = document.createElement('button');
      b.className = `garage-tab ${id === game.save.currentCar ? 'active' : ''}`;
      b.textContent = def.name;
      b.addEventListener('click', () => {
        audio.click();
        saves.mutate((s) => { s.currentCar = id; }, 'select-car');
        const { x, z } = game.car.pos;
        const h = game.car.heading;
        game._applySavedCar();
        game.car.reset(x, z, h);
        buildGarage();
      });
      tabs.appendChild(b);
    }
    buildGarageBody(game.save.currentCar);
  }

  function buildGarageBody(id) {
    const def = CAR_BY_ID[id];
    const owned = game.save.ownedCars[id] || (game.save.ownedCars[id] = { upgrades: {}, paint: def.color, spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 });
    const body = $('garage-body');
    const stats = computeStats(def, owned.upgrades || {});
    body.innerHTML = `
      <div class="garage-car-title">${def.name} <span class="car-class">${def.cls}${def.drive ? ` · ${def.drive}` : ''}</span></div>
      <div class="garage-stats">
        ${statBar('Speed', stats.topSpeed / 75)}
        ${statBar('Accel', stats.accel / 26)}
        ${statBar('Brakes', stats.brake / 44)}
        ${statBar('Grip', (stats.grip - 0.85) / 0.25)}
      </div>
      <h4>⚙ Upgrades</h4>
      <div class="upgrades">${Object.entries(UPGRADES).map(([key, u]) => {
        const lvl = owned.upgrades?.[key] || 0;
        const maxed = lvl >= 3;
        const cost = maxed ? 0 : u.costs[lvl];
        const afford = game.save.money >= cost;
        return `
          <div class="upgrade-row">
            <span class="up-icon">${u.icon}</span>
            <span class="up-name">${u.name}</span>
            <span class="up-pips">${'●'.repeat(lvl)}${'○'.repeat(3 - lvl)}</span>
            <button class="up-buy ${maxed ? 'maxed' : afford ? '' : 'poor'}" data-up="${key}"
              ${maxed || !afford ? 'disabled' : ''}>${maxed ? 'MAX' : fmtMoney(cost)}</button>
          </div>`;
      }).join('')}</div>
      <h4>🎨 Paint <span class="hint">(free)</span></h4>
      <div class="paints">${PAINTS.map((p) => `
        <button class="paint-swatch ${owned.paint === p.hex ? 'active' : ''}" data-paint="${p.hex}"
          title="${p.name}" style="background:${p.hex}"></button>`).join('')}</div>
      <div class="garage-cols">
        <div>
          <h4>🏎 Spoiler</h4>
          <div class="spoilers">${SPOILERS.map((s, i) => `
            <button class="spoiler-btn ${owned.spoiler === i ? 'active' : ''}" data-spoiler="${i}">
              ${s.name}${s.price ? ` · ${fmtMoney(s.price)}` : ''}</button>`).join('')}</div>
          <h4>🧰 Body Kit</h4>
          <div class="spoilers">${BODYKITS.map((s, i) => `
            <button class="spoiler-btn ${owned.kit === i ? 'active' : ''}" data-kit="${i}">
              ${s.name}${s.price ? ` · ${fmtMoney(s.price)}` : ''}</button>`).join('')}</div>
        </div>
        <div>
          <h4>🛞 Wheels</h4>
          <div class="spoilers">${WHEELS.map((s, i) => `
            <button class="spoiler-btn ${owned.wheels === i ? 'active' : ''}" data-wheels="${i}">
              ${s.name}${s.price ? ` · ${fmtMoney(s.price)}` : ''}</button>`).join('')}</div>
          <h4>🛑 Brake Calipers</h4>
          <div class="paints small">${CALIPERS.map((s, i) => `
            <button class="paint-swatch cal ${owned.caliper === i ? 'active' : ''}" data-caliper="${i}"
              title="${s.name}" style="background:${s.hex}"></button>`).join('')}</div>
          <h4>💨 Exhaust</h4>
          <div class="spoilers">${EXHAUSTS.map((s, i) => `
            <button class="spoiler-btn ${owned.exhaust === i ? 'active' : ''}" data-exhaust="${i}">
              ${s.name}${s.price ? ` · ${fmtMoney(s.price)}` : ''}</button>`).join('')}</div>
        </div>
      </div>`;

    const refreshCar = () => {
      const { x, z } = game.car.pos; const h = game.car.heading;
      game._applySavedCar();
      game.car.reset(x, z, h);
      buildGarage();
    };
    body.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.up;
      const lvl = owned.upgrades?.[key] || 0;
      const cost = UPGRADES[key].costs[lvl];
      if (lvl >= 3 || game.save.money < cost) return;
      saves.mutate((s) => {
        s.money -= cost;
        s.stats.moneySpent = (s.stats.moneySpent || 0) + cost;
        const car = s.ownedCars[id];
        car.upgrades = car.upgrades || {};
        car.upgrades[key] = (car.upgrades[key] || 0) + 1;
      }, 'buy-upgrade');
      bus.emit(EVENTS.UPGRADE_PURCHASED, { vehicleId: id, upgrade: key, level: lvl + 1 });
      bus.emit(EVENTS.MONEY_SPENT, { amount: cost, reason: 'upgrade' });
      audio.upgrade();
      refreshCar();
    }));
    body.querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => {
      saves.mutate((s) => { s.ownedCars[id].paint = b.dataset.paint; }, 'paint');
      audio.click();
      const paintDef = PAINTS.find((p) => p.hex === owned.paint);
      if (id === game.save.currentCar) game.car.setPaint(paintDef);
      buildGarage();
    }));
    // one generic buyer for priced cosmetics (spoiler/wheels/caliper/kit/exhaust)
    const cosmetic = (attr, list, apply) => {
      body.querySelectorAll(`[data-${attr}]`).forEach((b) => b.addEventListener('click', () => {
        const idx = parseInt(b.dataset[attr], 10);
        const price = list[idx].price;
        if (owned[attr] !== idx && price > 0 && game.save.money < price) return;
        saves.mutate((s) => {
          if (s.ownedCars[id][attr] !== idx && price > 0) {
            s.money -= price;
            s.stats.moneySpent = (s.stats.moneySpent || 0) + price;
          }
          s.ownedCars[id][attr] = idx;
        }, `buy-${attr}`);
        if (owned[attr] !== idx && price > 0) {
          bus.emit(EVENTS.MONEY_SPENT, { amount: price, reason: attr });
        }
        audio.click();
        apply(idx);
        buildGarage();
      }));
    };
    cosmetic('spoiler', SPOILERS, (i) => { if (id === game.save.currentCar) game.car.setSpoiler(i); });
    cosmetic('wheels', WHEELS, (i) => { if (id === game.save.currentCar) game.car.setWheels(i); });
    cosmetic('caliper', CALIPERS, () => { if (id === game.save.currentCar) refreshCar(); });
    cosmetic('kit', BODYKITS, () => { if (id === game.save.currentCar) refreshCar(); });
    cosmetic('exhaust', EXHAUSTS, () => { if (id === game.save.currentCar) refreshCar(); });
  }

  function statBar(label, frac) {
    return `<div class="stat"><span class="stat-label">${label}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${clamp(frac, 0.05, 1) * 100}%"></div></div></div>`;
  }

  // ════════════════════════════════════════════
  // Dealer
  // ════════════════════════════════════════════
  function openDealer() { buildDealer(); openOverlay('dealer-menu'); }

  function buildDealer() {
    const list = $('dealer-list');
    list.innerHTML = '';
    for (const def of CARS) {
      const owned = !!game.save.ownedCars[def.id];
      const levelOK = game.level >= def.levelReq;
      const afford = game.save.money >= def.price;
      const el = document.createElement('div');
      el.className = `dealer-card ${owned ? 'owned' : ''}`;
      el.innerHTML = `
        <div class="dc-name">${def.name}<span class="car-class">${def.cls}</span></div>
        <div class="dc-stats">
          ${statBar('Speed', def.topSpeed / 75)}
          ${statBar('Accel', def.accel / 24)}
        </div>
        <div class="dc-desc">${def.desc}</div>
        <div class="dc-foot">
          <span class="dc-price">${def.price === 0 ? 'Free' : fmtMoney(def.price)}
            ${!levelOK ? ` · 🔒 LV ${def.levelReq}` : ''}</span>
          ${owned ? '<button class="menu-btn small" data-drive="1">Drive</button>'
        : `<button class="menu-btn small primary" data-buy="${def.id}" ${(!levelOK || !afford) ? 'disabled' : ''}>Buy</button>`}
        </div>`;
      const buyBtn = el.querySelector('[data-buy]');
      if (buyBtn) buyBtn.addEventListener('click', () => {
        if (!levelOK || !afford) return;
        saves.mutate((s) => {
          s.money -= def.price;
          s.stats.moneySpent = (s.stats.moneySpent || 0) + def.price;
          s.ownedCars[def.id] = { upgrades: {}, paint: def.color, spoiler: 0 };
          s.currentCar = def.id;
        }, 'buy-car');
        bus.emit(EVENTS.VEHICLE_PURCHASED, { vehicleId: def.id });
        bus.emit(EVENTS.MONEY_SPENT, { amount: def.price, reason: 'vehicle' });
        audio.purchase();
        game.toast(`🔑 ${def.name} added to your garage!`, 'good', 3);
        buildDealer();
      });
      const driveBtn = el.querySelector('[data-drive]');
      if (driveBtn) driveBtn.addEventListener('click', () => {
        saves.mutate((s) => { s.currentCar = def.id; }, 'select-car');
        audio.click();
        const { x, z } = game.car.pos; const h = game.car.heading;
        game._applySavedCar();
        game.car.reset(x, z, h);
        buildDealer();
      });
      list.appendChild(el);
    }
    $('dealer-money').textContent = fmtMoney(game.save.money);
  }

  // ════════════════════════════════════════════
  // Settings
  // ════════════════════════════════════════════
  function buildSettings() {
    const s = game.save.settings;
    document.querySelectorAll('#quality-row button').forEach((b) => {
      b.classList.toggle('active', b.dataset.q === s.quality);
      b.onclick = () => {
        s.quality = b.dataset.q;
        game.setQuality(s.quality);
        if (s.quality === 'high' || s.quality === 'ultra') setupBloom();
        else if (composer) { composer = null; game._render = () => renderer.render(scene, camera); }
        game.persist();
        audio.click();
        buildSettings();
      };
    });
    // one slider per mixer channel — independent + persisted
    const wire = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.value = s.volumes[key];
      el.oninput = () => {
        s.volumes[key] = parseFloat(el.value);
        audio.setVolumes(s.volumes);
        audio.slider();
        game.persist();
      };
    };
    wire('vol-master', 'master'); wire('vol-music', 'music');
    wire('vol-engine', 'engine'); wire('vol-sfx', 'sfx');
    wire('vol-env', 'environment'); wire('vol-ui', 'ui'); wire('vol-voice', 'voice');
    $('trans-toggle').checked = s.transmission === 'manual';
    $('trans-toggle').onchange = (e) => {
      s.transmission = e.target.checked ? 'manual' : 'auto';
      game.car.trans = s.transmission;
      audio.toggle(e.target.checked);
      game.persist();
    };
    const tcToggle = $('tc-toggle');
    if (tcToggle) {
      tcToggle.checked = s.tractionControl !== false;
      tcToggle.onchange = (e) => {
        s.tractionControl = e.target.checked;
        game.car.tcEnabled = s.tractionControl;
        audio.toggle(e.target.checked);
        game.persist();
      };
    }
    $('sound-toggle').checked = s.sound;
    $('sound-toggle').onchange = (e) => {
      s.sound = e.target.checked;
      audio.setEnabled(s.sound);
      audio.toggle(e.target.checked);
      game.persist();
    };
    const resetBtn = $('btn-reset-save');
    resetBtn.onclick = () => {
      if (resetBtn.dataset.confirm) {
        saves.reset();
        game._applySavedCar();
        resetBtn.dataset.confirm = '';
        resetBtn.textContent = 'Reset Save';
        resetBtn.classList.remove('danger-confirm');
        refreshAccountUI();
        refreshMenu();
        audio.deny();
      } else {
        resetBtn.dataset.confirm = '1';
        resetBtn.textContent = 'Click again to confirm';
        resetBtn.classList.add('danger-confirm');
        setTimeout(() => { resetBtn.dataset.confirm = ''; resetBtn.textContent = 'Reset Save'; resetBtn.classList.remove('danger-confirm'); }, 3000);
      }
    };
  }

  // ════════════════════════════════════════════
  // Leaderboard
  // ════════════════════════════════════════════
  let lbScope = 'overall';
  let lbPeriod = 'all';
  function buildLeaderboard() {
    const scopeSel = $('lb-scope');
    if (!scopeSel.dataset.built) {
      scopeSel.innerHTML = `<option value="overall">🏆 Career Total</option>` +
        CAREER.map((m) => `<option value="${m.id}">${m.icon} ${m.name}</option>`).join('');
      scopeSel.dataset.built = '1';
      scopeSel.addEventListener('change', () => { lbScope = scopeSel.value; fetchLeaderboard(); });
      document.querySelectorAll('#lb-periods button').forEach((b) => {
        b.addEventListener('click', () => {
          lbPeriod = b.dataset.period;
          document.querySelectorAll('#lb-periods button').forEach((x) => x.classList.toggle('active', x === b));
          fetchLeaderboard();
        });
      });
    }
    scopeSel.value = lbScope;
    document.querySelectorAll('#lb-periods button').forEach((x) => x.classList.toggle('active', x.dataset.period === lbPeriod));
    fetchLeaderboard();
  }

  async function fetchLeaderboard() {
    const list = $('lb-list');
    list.innerHTML = `<div class="lb-status">Loading rankings…</div>`;
    try {
      const res = await leaderboard.top({ scope: lbScope, period: lbPeriod, limit: 15 });
      if (!res.entries?.length) {
        list.innerHTML = `<div class="lb-status">No entries yet — be the first on the board! 🏁</div>`;
        return;
      }
      list.innerHTML = res.entries.map((e, i) => `
        <div class="lb-row ${e.isMe ? 'me' : ''}">
          <span class="lb-rank">${(res.page - 1) * res.limit + i + 1}</span>
          <span class="lb-name">${escapeHtml(e.displayName)}</span>
          <span class="lb-vehicle">${e.vehicleName || ''}</span>
          <span class="lb-score">${e.score.toLocaleString()}</span>
          ${e.timeMs ? `<span class="lb-time">${fmtTime(e.timeMs / 1000)}</span>` : '<span class="lb-time"></span>'}
        </div>`).join('');
    } catch {
      list.innerHTML = `<div class="lb-status">Leaderboard unavailable — the server may be offline.<br/>Play continues; runs sync when it's back.</div>`;
    }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ════════════════════════════════════════════
  // Account (guest ⇄ registered)
  // ════════════════════════════════════════════
  function refreshAccountUI() {
    const chip = $('account-chip');
    if (!chip) return;
    if (auth.user && !auth.user.isGuest) {
      chip.textContent = `👤 ${auth.user.username}`;
    } else if (auth.user) {
      chip.textContent = '👤 Guest';
    } else {
      chip.textContent = '👤 Offline';
    }
  }

  function buildAccount() {
    const box = $('acct-forms');
    const info = $('acct-info');
    const status = $('acct-status');
    status.textContent = '';
    const named = auth.user && !auth.user.isGuest;
    $('acct-logout-btn').classList.toggle('hidden', !named);
    if (named) {
      box.classList.add('hidden');
      info.classList.remove('hidden');
      const st = game.save.stats || {};
      info.innerHTML = `
        <div class="acct-name">${escapeHtml(auth.user.username)}</div>
        <div class="acct-grid">
          <div><span>Level</span><b>${game.level}</b></div>
          <div><span>Missions</span><b>${st.missionsCompleted || 0}</b></div>
          <div><span>Distance</span><b>${((st.distanceM || 0) / 1000).toFixed(1)} km</b></div>
          <div><span>Playtime</span><b>${Math.floor((st.playtimeSec || 0) / 60)} min</b></div>
        </div>`;
    } else {
      box.classList.remove('hidden');
      info.classList.add('hidden');
    }
  }

  function wireAccount() {
    const status = $('acct-status');
    const setBusy = (btn, busy, text) => {
      if (!btn) return;
      btn.disabled = busy;
      if (text) btn.textContent = text;
    };
    const handle = async (btn, fn) => {
      setBusy(btn, true, '…');
      status.textContent = '';
      try {
        await fn();
        buildAccount();
        audio.success();
      } catch (err) {
        status.textContent = err?.message || 'Request failed';
        audio.fail();
      } finally {
        setBusy(btn, false);
      }
    };
    $('acct-login-btn')?.addEventListener('click', () => {
      handle($('acct-login-btn'), () => auth.login($('acct-login-user').value.trim(), $('acct-login-pass').value));
    });
    $('acct-reg-btn')?.addEventListener('click', () => {
      handle($('acct-reg-btn'), () => auth.register($('acct-reg-user').value.trim(), $('acct-reg-pass').value));
    });
    const onEnter = (inputId, btnId) => {
      $(inputId)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') $(btnId)?.click();
      });
    };
    onEnter('acct-login-user', 'acct-login-btn');
    onEnter('acct-login-pass', 'acct-login-btn');
    onEnter('acct-reg-user', 'acct-reg-btn');
    onEnter('acct-reg-pass', 'acct-reg-btn');
    $('acct-logout-btn')?.addEventListener('click', async () => {
      auth.logout();
      await auth.ensureSession();
      buildAccount();
    });
  }
  wireAccount();

  // ════════════════════════════════════════════
  // Fullscreen map
  // ════════════════════════════════════════════
  const mapCanvas = $('map-canvas');
  function sizeMapCanvas() {
    if (!mapCanvas) return;
    mapCanvas.width = Math.min(window.innerWidth * 0.86, 900);
    mapCanvas.height = Math.min(window.innerHeight * 0.8, 640);
    if (!$('map-overlay').classList.contains('hidden')) drawBigMap();
  }
  function drawBigMap() {
    const ctx = mapCanvas.getContext('2d');
    navmap.drawBigMap(ctx, mapCanvas.width, mapCanvas.height, {
      x: game.car.pos.x, z: game.car.pos.z, heading: game.car.heading,
    }, {
      missionDots: [],
      roamDots: game.roamEvents.map((e) => ({
        x: e.poi.x, z: e.poi.z, emoji: e.icon, label: e.poi.name,
      })),
    });
  }
  mapCanvas.addEventListener('click', (e) => {
    const r = mapCanvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (mapCanvas.width / r.width);
    const my = (e.clientY - r.top) * (mapCanvas.height / r.height);
    const w = navmap.mapToWorld(mx, my, mapCanvas.width, mapCanvas.height);
    navmap.setDestination(game.car.pos.x, game.car.pos.z, w.x, w.z);
    audio.click();
    drawBigMap();
  });

  // ════════════════════════════════════════════
  // HUD buttons + mobile controls
  // ════════════════════════════════════════════
  $('btn-pause').addEventListener('click', () => { audio.click(); game.pause(); });
  $('btn-sound').addEventListener('click', () => {
    game.save.settings.sound = !game.save.settings.sound;
    audio.setEnabled(game.save.settings.sound);
    game.persist();
    $('btn-sound').textContent = game.save.settings.sound ? '🔊' : '🔇';
  });
  $('btn-sound').textContent = game.save.settings.sound ? '🔊' : '🔇';
  $('btn-map').addEventListener('click', () => { audio.click(); game.toggleMap(); });

  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (isTouch) $('mobile-controls').classList.add('touch-mode');
  input.attachWheel($('mc-wheel'));
  const hold = (id, name) => {
    const el = $(id);
    if (!el) return;
    const on = (e) => { e.preventDefault(); el.classList.add('active'); input.setTouch(name, true); };
    const off = (e) => { e.preventDefault(); el.classList.remove('active'); input.setTouch(name, false); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  };
  hold('mc-gas', 'gas'); hold('mc-brake', 'brake');
  hold('mc-handbrake', 'handbrake'); hold('mc-nitro', 'nitro');
  $('mc-camera')?.addEventListener('click', (e) => { e.preventDefault(); audio.click(); input.actions.push('camera'); });
  $('mc-horn')?.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.horn(true); });
  $('mc-horn')?.addEventListener('pointerup', () => audio.horn(false));
  $('mc-map')?.addEventListener('click', (e) => { e.preventDefault(); audio.click(); input.actions.push('map'); });

  // unlock audio on first interaction
  const unlock = () => { audio.ensure(); startMenuMusic(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // hover feedback on every menu button (sound has its own cooldown)
  document.querySelectorAll('.menu-btn, .garage-tab, .mission-item').forEach((el) => {
    el.addEventListener('pointerenter', () => audio.hover());
  });

  // pause on tab blur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (game.mode === 'play' || game.mode === 'free')) game.pause();
  });

  // ════════════════════════════════════════════
  // Online glue: account chip, sync dot, achievements
  // ════════════════════════════════════════════
  bus.on(EVENTS.AUTH_CHANGED, refreshAccountUI);
  bus.on(EVENTS.SYNC_STATUS_CHANGED, ({ status }) => {
    const dot = $('sync-dot');
    if (!dot) return;
    dot.dataset.status = status;
    dot.title = {
      idle: 'Progress synced to the cloud',
      syncing: 'Syncing…',
      offline: 'Offline — progress is saved locally and will sync later',
      error: 'Sync problem — retrying automatically',
      off: 'Cloud sync unavailable on this server',
    }[status] || status;
  });
  bus.on(EVENTS.ACHIEVEMENT_UNLOCKED, (a) => {
    game.toast(`🏆 Achievement: ${a.name}`, 'good', 4);
  });
  bus.on(EVENTS.SAVE_CORRUPTED, ({ backedUpAs }) => {
    game.toast('⚠ Save was corrupted — recovered to a fresh start', 'warn', 5);
    console.warn('[Save] corrupted blob backed up as', backedUpAs);
  });
  bus.on(EVENTS.SYNC_CONFLICT, ({ resolved }) => {
    game.toast(resolved === 'local'
      ? '☁ Kept this device\'s newer progress'
      : '☁ Loaded newer cloud progress', 'info', 3);
  });
  refreshAccountUI();
  // ════════════════════════════════════════════
  // Platform UI — multiplayer, friends, coach, admin
  // ════════════════════════════════════════════
  const onlineFriends = new Set();   // userIds reported online by presence

  bus.on('RT_PRESENCE', (p) => {
    if (p?.online) onlineFriends.add(p.userId);
    else onlineFriends.delete(p.userId);
    // live dots on the friends panel if it's open
    if (!$('friends-menu')?.classList.contains('hidden')) buildFriendsPanel();
  });

  bus.on('RT_NOTIFICATION', (p) => {
    game.toast?.(`🔔 ${p?.title ?? 'Notification'}`, 'info', 4200);
  });

  // ── multiplayer flow ──
  function mpStatusLine() {
    switch (multiplayer.phase) {
      case 'queued': return '🔍 Searching for opponents…';
      case 'countdown': return `🏁 Match found — ${multiplayer.match?.players?.length ?? 2} racers. Starting soon!`;
      case 'racing': return '🏎 Race in progress — good luck!';
      case 'finished': return '✅ Match complete.';
      default: return realtime.status === 'online' ? '🟢 Realtime connected' : '⚪ Realtime offline (single-player only)';
    }
  }

  function buildMultiplayerPanel() {
    const el = $('mp-status');
    if (el) el.textContent = mpStatusLine();
    const btn = $('btn-mp-queue');
    if (btn) {
      const queued = multiplayer.phase === 'queued';
      btn.textContent = queued ? '✕ Cancel search' : '⚔ Find a Race';
      btn.dataset.action = queued ? 'mp-cancel' : 'mp-queue';
    }
  }

  bus.on('MP_UI', (p) => {
    buildMultiplayerPanel();
    if (p?.phase === 'countdown' && p.match?.missionId) {
      // jump into the race mission when the server match is set
      hideAllOverlays();
      game.toast?.(`🏁 Ghost race: ${p.match.players.length} racers — get ready!`, 'info', 3500);
      startGame(p.match.missionId);
    }
    if (p?.phase === 'finished' && p.results) {
      const mine = p.results.find((r) => r.userId === auth.user?.id);
      if (mine) {
        game.toast?.(
          mine.finishMs != null
            ? `🏁 Finished P${mine.position} — +${mine.score} MP score`
            : '🏁 Race over — did not finish',
          mine.position === 1 ? 'success' : 'info', 5200,
        );
      }
      setTimeout(() => game.clearMultiplayer(), 8000);
    }
    if (p?.phase === 'idle' && p.message) game.toast?.(p.message, 'warn', 3500);
  });

  // ── friends ──
  async function buildFriendsPanel() {
    const listEl = $('friends-list');
    const reqEl = $('friends-requests');
    if (!listEl) return;
    if (!auth.user || auth.user.isGuest) {
      listEl.innerHTML = '<div class="friend-row muted">Register an account to add friends.</div>';
      if (reqEl) reqEl.innerHTML = '';
      return;
    }
    try {
      const data = await api.get('/friends');
      if (reqEl) {
        reqEl.innerHTML = (data.requests ?? []).map((r) => `
          <div class="friend-row">
            <span>➕ <b>${r.fromUsername ?? 'Player'}</b> wants to race</span>
            <span class="friend-actions">
              <button class="mini-btn" data-friend-accept="${r.id}">Accept</button>
              <button class="mini-btn ghost" data-friend-reject="${r.id}">✕</button>
            </span>
          </div>`).join('') || '';
      }
      listEl.innerHTML = (data.friends ?? []).map((f) => `
        <div class="friend-row">
          <span>${onlineFriends.has(f.userId) ? '🟢' : '⚪'} <b>${f.username}</b>
            <small>Lv ${f.level} · ${fmtMoney(f.careerScore)} pts</small></span>
          <span class="friend-actions">
            <button class="mini-btn ghost" data-friend-remove="${f.userId}">Remove</button>
          </span>
        </div>`).join('') || '<div class="friend-row muted">No friends yet — search above.</div>';

      document.querySelectorAll('[data-friend-accept]').forEach((b) => b.addEventListener('click', async () => {
        await api.put('/friends', { requestId: b.dataset.friendAccept }).catch(() => {});
        buildFriendsPanel();
      }));
      document.querySelectorAll('[data-friend-reject]').forEach((b) => b.addEventListener('click', async () => {
        await api.request('/friends?requestId=' + b.dataset.friendReject, { method: 'DELETE' }).catch(() => {});
        buildFriendsPanel();
      }));
      document.querySelectorAll('[data-friend-remove]').forEach((b) => b.addEventListener('click', async () => {
        await api.request('/friends?friendId=' + b.dataset.friendRemove, { method: 'DELETE' }).catch(() => {});
        buildFriendsPanel();
      }));
    } catch { /* offline */ }
  }

  const friendSearchBox = () => $('friend-search');
  if (friendSearchBox()) {
    let searchTimer = null;
    friendSearchBox().addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        const q = friendSearchBox().value.trim();
        const resEl = $('friend-results');
        if (q.length < 2) { resEl.innerHTML = ''; return; }
        try {
          const data = await api.get('/friends', { q });
          resEl.innerHTML = (data.results ?? []).map((r) => `
            <div class="friend-row">
              <span><b>${r.username}</b> <small>Lv ${r.level}</small></span>
              <button class="mini-btn" data-friend-add="${r.userId}">+ Add</button>
            </div>`).join('') || '<div class="friend-row muted">No players found.</div>';
          document.querySelectorAll('[data-friend-add]').forEach((b) => b.addEventListener('click', async () => {
            const out = await api.post('/friends', { targetId: b.dataset.friendAdd }).catch((e) => e);
            game.toast?.(out?.code === 'already_friends' ? 'Already friends!' : 'Request sent.', 'info', 2500);
            buildFriendsPanel();
          }));
        } catch { /* offline */ }
      }, 300);
    });
  }

  // ── AI coach ──
  async function buildCoachPanel() {
    const el = $('coach-insights');
    if (!el) return;
    el.innerHTML = '<div class="friend-row muted">Analyzing your driving…</div>';
    try {
      const { report } = await api.get('/coach');
      el.innerHTML = report.insights.map((i) => `
        <div class="coach-card kind-${i.kind}">
          <div class="coach-title">${
            i.kind === 'strength' ? '💪' : i.kind === 'weakness' ? '⚠️' : i.kind === 'trend' ? '📈' : '🎯'
          } ${i.title}</div>
          <div class="coach-detail">${i.detail}</div>
        </div>`).join('') || '<div class="friend-row muted">Play a few missions to get coaching.</div>';
      const focusEl = $('coach-focus');
      if (focusEl && report.focus) {
        const m = CAREER.find((x) => x.id === report.focus);
        focusEl.textContent = m ? `Next focus: ${m.name}` : '';
      }
    } catch {
      el.innerHTML = '<div class="friend-row muted">Coach unavailable offline.</div>';
    }
  }

  // ── admin ──
  async function buildAdminPanel() {
    const wrap = $('admin-menu');
    if (!wrap) return;
    const role = auth.user?.role;
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      wrap.querySelector('.panel').innerHTML =
        '<h2>🛡 Admin</h2><p class="muted">Moderator or admin account required.</p>' +
        '<button class="menu-btn ghost" data-action="back-menu">← Back</button>';
      return;
    }
    try {
      const { stats, server } = await api.get('/admin');
      const flags = await api.get('/admin', { section: 'flags' });
      wrap.querySelector('.panel').innerHTML = `
        <h2>🛡 Admin Dashboard</h2>
        <div class="admin-grid">
          <div class="admin-stat"><b>${stats.players.total}</b><span>players</span></div>
          <div class="admin-stat"><b>${stats.players.registered}</b><span>registered</span></div>
          <div class="admin-stat"><b>${stats.activeMatches}</b><span>live matches</span></div>
          <div class="admin-stat"><b>${stats.flags.open}</b><span>open flags</span></div>
          <div class="admin-stat"><b>${server.memoryMb} MB</b><span>rss</span></div>
          <div class="admin-stat"><b>${Math.round(server.uptimeSec / 60)}m</b><span>uptime</span></div>
        </div>
        <h3>DAU (7d)</h3>
        <div class="dau-bars">${stats.dau.map((d) =>
          `<div class="dau-bar" title="${d.date}: ${d.count}"><span style="height:${Math.min(100, d.count * 12)}%"></span></div>`).join('')}</div>
        <h3>⚠ Suspicious runs (${flags.flags.length})</h3>
        <div class="admin-flags">${(flags.flags ?? []).slice(0, 10).map((f) => `
          <div class="friend-row">
            <span><b>${f.username ?? f.userId.slice(0, 8)}</b>
              <small>${f.reason} · ${f.severity} · ${new Date(f.createdAt).toLocaleDateString()}</small></span>
            <span class="friend-actions">
              <button class="mini-btn" data-flag-dismiss="${f.id}">Dismiss</button>
              <button class="mini-btn danger" data-flag-action="${f.id}">Action</button>
            </span>
          </div>`).join('') || '<div class="friend-row muted">Queue clear — nice.</div>'}</div>
        <button class="menu-btn ghost" data-action="back-menu">← Back</button>`;
      document.querySelectorAll('[data-flag-dismiss]').forEach((b) => b.addEventListener('click', async () => {
        await api.post('/admin', { flagId: b.dataset.flagDismiss, status: 'dismissed' }).catch(() => {});
        buildAdminPanel();
      }));
      document.querySelectorAll('[data-flag-action]').forEach((b) => b.addEventListener('click', async () => {
        await api.post('/admin', { flagId: b.dataset.flagAction, status: 'actioned' }).catch(() => {});
        buildAdminPanel();
      }));
    } catch {
      wrap.querySelector('.panel').innerHTML =
        '<h2>🛡 Admin</h2><p class="muted">Admin data unavailable offline.</p>' +
        '<button class="menu-btn ghost" data-action="back-menu">← Back</button>';
    }
  }

  // show/hide admin + coach buttons by role
  function refreshPlatformButtons() {
    const adminBtn = document.querySelector('[data-action="admin"]');
    if (adminBtn) {
      const role = auth.user?.role;
      adminBtn.classList.toggle('hidden', role !== 'ADMIN' && role !== 'MODERATOR');
    }
  }
  bus.on(EVENTS.AUTH_CHANGED, refreshPlatformButtons);

  auth.restore();
  sync.start();
  auth.ensureSession().then((user) => {
    if (user) {
      sync.schedule(500);
      realtime.start();
    }
  });
  // (re)connect the socket whenever the auth token changes
  // ── analytics: whitelisted bus events → batched telemetry ──
  const ANALYTIC_EVENTS = new Set([
    'GAME_STARTED', 'MISSION_COMPLETED', 'MISSION_FAILED',
  ]);
  const ANALYTIC_NAMES = {
    GAME_STARTED: 'mission_start', MISSION_COMPLETED: 'mission_complete', MISSION_FAILED: 'mission_fail',
  };
  const analyticsQueue = [];
  const flushAnalytics = async () => {
    if (!analyticsQueue.length || !auth.token) return;
    const events = analyticsQueue.splice(0, 50);
    await api.post('/analytics', { events }, { auth: true }).catch(() => {});
  };
  bus.onAny?.((name) => {
    if (ANALYTIC_EVENTS.has(name) && analyticsQueue.length < 100) {
      analyticsQueue.push({ name: ANALYTIC_NAMES[name] });
    }
  });
  setInterval(flushAnalytics, 20_000);
  window.addEventListener('pagehide', flushAnalytics);

  bus.on(EVENTS.AUTH_CHANGED, () => {
    if (auth.token) { realtime.stop(); realtime.start(); }
    else realtime.stop();
  });

  // ════════════════════════════════════════════
  // Menu background camera (slow orbit over the city)
  // ════════════════════════════════════════════
  let menuAngle = 0;
  const menuLoopCtl = new GameLoop((dt) => {
    if (game.running || game.paused) { menuLoopCtl.stop(); return; }
    menuAngle += 0.0012 * dt * 60;
    const R = 130;
    camera.position.set(Math.sin(menuAngle) * R, 70, Math.cos(menuAngle) * R);
    camera.lookAt(0, 0, 0);
    city.update(0.016, { x: 0, z: 0 });
  }, () => renderer.render(scene, camera));
  function menuLoop() {
    if (game.running || game.paused) { menuLoopCtl.stop(); return; }
    menuLoopCtl.start();
  }

  // initial paint
  game.setQuality(game.save.settings.quality);
  sizeMapCanvas();
  refreshMenu();
  hide('loader');
  show('menu');
  game.state.set(State.MENU);
  menuLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
