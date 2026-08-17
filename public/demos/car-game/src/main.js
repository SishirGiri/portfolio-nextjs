// ════════════════════════════════════════════════════════
// MAIN — boot Three.js, build all systems, wire every UI:
// main menu, mission select, garage (upgrades/paint/spoiler),
// dealership, settings, controls, pause, complete/fail,
// fullscreen map, mobile controls, resize, bloom (high).
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
  const game = new Game(canvas);
  game.init({
    scene, camera, renderer, city, car, traffic, peds, police, missions, navmap, audio, input,
    quality: game.save.settings.quality,
  });
  game._applySavedCar();
  audio.setVolumes(game.save.settings.volumes);
  audio.setEnabled(game.save.settings.sound);
  game.car.trans = game.save.settings.transmission;

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
    const hasProgress = done > 0 || game.save.money > 500;
    $('btn-continue').classList.toggle('hidden', !hasProgress);
  }

  function startGame(missionId) {
    hideAllOverlays();
    audio.click();
    game.startPlay(missionId);
    $('mobile-controls').classList.remove('hidden');
  }

  function hideAllOverlays() {
    for (const id of ['menu', 'missions-menu', 'controls-menu', 'settings-menu',
      'garage-menu', 'dealer-menu', 'pause-menu', 'complete-menu', 'fail-menu', 'map-overlay']) {
      hide(id);
    }
  }

  function backToMenu() {
    hideAllOverlays();
    refreshMenu();
    show('menu');
    menuLoop();
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
            localStorage.removeItem('cargame_save_v2');
            localStorage.removeItem('cargame_save_v1');
            game.save = game._loadSave();
            game.persist();
            game._applySavedCar();
            refreshMenu();
            audio.fail(); // deliberate "wipe" cue
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
        case 'career': hide('menu'); buildMissionList(); show('missions-menu'); break;
        case 'free': startGame(null); break;
        case 'controls': hide('menu'); show('controls-menu'); break;
        case 'settings': hide('menu'); buildSettings(); show('settings-menu'); break;
        case 'garage': hide('menu'); openGarage(); break;
        case 'dealer': hide('menu'); openDealer(); break;
        case 'back-menu': backToMenu(); break;
        case 'resume': game.resume(); break;
        case 'restart':
          startGame(game.missions.active ? game.missions.active.id : null);
          break;
        case 'pause-settings': hide('pause-menu'); buildSettings(); show('settings-menu');
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
  function openGarage() { buildGarage(); show('garage-menu'); }

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
        game.save.currentCar = id;
        game.persist();
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
      game.save.money -= cost;
      owned.upgrades = owned.upgrades || {};
      owned.upgrades[key] = lvl + 1;
      game.persist();
      audio.money();
      refreshCar();
    }));
    body.querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => {
      owned.paint = b.dataset.paint;
      game.persist();
      audio.click();
      const paintDef = PAINTS.find((p) => p.hex === owned.paint);
      if (id === game.save.currentCar) game.car.setPaint(paintDef);
      buildGarage();
    }));
    body.querySelectorAll('[data-spoiler]').forEach((b) => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.spoiler, 10);
      const price = SPOILERS[idx].price;
      if (owned.spoiler !== idx && price > 0 && game.save.money < price) return;
      if (owned.spoiler !== idx && price > 0) game.save.money -= price;
      owned.spoiler = idx;
      game.persist();
      audio.click();
      if (id === game.save.currentCar) game.car.setSpoiler(idx);
      buildGarage();
    }));
    body.querySelectorAll('[data-wheels]').forEach((b) => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.wheels, 10);
      const price = WHEELS[idx].price;
      if (owned.wheels !== idx && price > 0 && game.save.money < price) return;
      if (owned.wheels !== idx && price > 0) game.save.money -= price;
      owned.wheels = idx;
      game.persist();
      audio.click();
      if (id === game.save.currentCar) game.car.setWheels(idx);
      buildGarage();
    }));
    body.querySelectorAll('[data-caliper]').forEach((b) => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.caliper, 10);
      const price = CALIPERS[idx].price;
      if (owned.caliper !== idx && price > 0 && game.save.money < price) return;
      if (owned.caliper !== idx && price > 0) game.save.money -= price;
      owned.caliper = idx;
      game.persist();
      audio.click();
      if (id === game.save.currentCar) game.car.setCaliper(idx);
      buildGarage();
    }));
    const rebuildCosmetic = (apply) => {
      apply();
      game.persist();
      audio.click();
      if (id === game.save.currentCar) refreshCar(); else buildGarage();
    };
    body.querySelectorAll('[data-kit]').forEach((b) => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.kit, 10);
      const price = BODYKITS[idx].price;
      if (owned.kit !== idx && price > 0 && game.save.money < price) return;
      if (owned.kit !== idx && price > 0) game.save.money -= price;
      rebuildCosmetic(() => { owned.kit = idx; });
    }));
    body.querySelectorAll('[data-exhaust]').forEach((b) => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.exhaust, 10);
      const price = EXHAUSTS[idx].price;
      if (owned.exhaust !== idx && price > 0 && game.save.money < price) return;
      if (owned.exhaust !== idx && price > 0) game.save.money -= price;
      rebuildCosmetic(() => { owned.exhaust = idx; });
    }));
  }

  function statBar(label, frac) {
    return `<div class="stat"><span class="stat-label">${label}</span>
      <div class="stat-bar"><div class="stat-fill" style="width:${clamp(frac, 0.05, 1) * 100}%"></div></div></div>`;
  }

  function computeStats(def, up) {
    const lv = (k) => up[k] || 0;
    return {
      topSpeed: def.topSpeed * (1 + UPGRADES.engine.topSpeed * lv('engine')),
      accel: def.accel * (1 + UPGRADES.engine.accel * lv('engine') + (UPGRADES.transmission?.accel || 0) * lv('transmission')),
      brake: def.brake * (1 + UPGRADES.brakes.brake * lv('brakes')),
      grip: def.grip * (1 + UPGRADES.tires.grip * lv('tires')),
    };
  }

  // ════════════════════════════════════════════
  // Dealer
  // ════════════════════════════════════════════
  function openDealer() { buildDealer(); show('dealer-menu'); }

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
        game.save.money -= def.price;
        game.save.ownedCars[def.id] = { upgrades: {}, paint: def.color, spoiler: 0 };
        game.save.currentCar = def.id;
        game.persist();
        audio.money();
        game.toast(`🔑 ${def.name} added to your garage!`, 'good', 3);
        buildDealer();
      });
      const driveBtn = el.querySelector('[data-drive]');
      if (driveBtn) driveBtn.addEventListener('click', () => {
        game.save.currentCar = def.id;
        game.persist();
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
    const wire = (id, key) => {
      const el = $(id);
      el.value = s.volumes[key];
      el.oninput = () => {
        s.volumes[key] = parseFloat(el.value);
        audio.setVolumes(s.volumes);
        game.persist();
      };
    };
    wire('vol-music', 'music'); wire('vol-engine', 'engine');
    wire('vol-fx', 'fx'); wire('vol-amb', 'amb');
    $('trans-toggle').checked = s.transmission === 'manual';
    $('trans-toggle').onchange = (e) => {
      s.transmission = e.target.checked ? 'manual' : 'auto';
      game.car.trans = s.transmission;
      game.persist();
    };
    const tcToggle = $('tc-toggle');
    if (tcToggle) {
      tcToggle.checked = s.tractionControl !== false;
      tcToggle.onchange = (e) => {
        s.tractionControl = e.target.checked;
        game.car.tcEnabled = s.tractionControl;
        game.persist();
      };
    }
    $('sound-toggle').checked = s.sound;
    $('sound-toggle').onchange = (e) => {
      s.sound = e.target.checked;
      audio.setEnabled(s.sound);
      game.persist();
    };
    const resetBtn = $('btn-reset-save');
    resetBtn.onclick = () => {
      if (resetBtn.dataset.confirm) {
        localStorage.removeItem('cargame_save_v2');
        localStorage.removeItem('cargame_save_v1');
        game.save = game._loadSave();
        game.persist();
        game._applySavedCar();
        resetBtn.dataset.confirm = '';
        resetBtn.textContent = 'Reset Save';
        resetBtn.classList.remove('danger-confirm');
        refreshMenu();
        audio.fail();
      } else {
        resetBtn.dataset.confirm = '1';
        resetBtn.textContent = 'Click again to confirm';
        resetBtn.classList.add('danger-confirm');
        setTimeout(() => { resetBtn.dataset.confirm = ''; resetBtn.textContent = 'Reset Save'; resetBtn.classList.remove('danger-confirm'); }, 3000);
      }
    };
  }

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
  const unlock = () => { audio.ensure(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // pause on tab blur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (game.mode === 'play' || game.mode === 'free')) game.pause();
  });

  // ════════════════════════════════════════════
  // Menu background camera (slow orbit over the city)
  // ════════════════════════════════════════════
  let menuAngle = 0;
  function menuLoop() {
    if (game.running || game.paused) return;
    menuAngle += 0.0012;
    const R = 130;
    camera.position.set(Math.sin(menuAngle) * R, 70, Math.cos(menuAngle) * R);
    camera.lookAt(0, 0, 0);
    city.update(0.016, { x: 0, z: 0 });
    renderer.render(scene, camera);
    requestAnimationFrame(menuLoop);
  }

  // initial paint
  game.setQuality(game.save.settings.quality);
  sizeMapCanvas();
  refreshMenu();
  hide('loader');
  show('menu');
  menuLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
