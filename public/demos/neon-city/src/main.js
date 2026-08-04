// main.js — entry point. Sets up DOM, input, audio, the Game, menus/settings,
// the shop/garage panels, resize handling, save/load UI, and the rAF loop.
import { CONFIG } from "./config.js";
import { Input } from "./utils/input.js";
import { AudioEngine } from "./utils/audio.js";
import { Game } from "./game.js";
import { VEHICLES, WEAPONS } from "./config.js";
import { fmtMoney } from "./utils/math.js";

const $ = (id) => document.getElementById(id);

function buildDom() {
  return {
    canvas: $("game"), minimap: $("minimap"),
    // HUD
    health: $("health-bar"), armor: $("armor-bar"), stamina: $("stamina-bar"),
    heat: $("heat-stars"), money: $("hud-money"), level: $("hud-level"), xp: $("xp-bar"),
    weaponName: $("weapon-name"), ammo: $("weapon-ammo"), reserve: $("weapon-reserve"),
    weaponIcon: $("weapon-icon"), weaponFlash: $("weapon-flash"),
    grenadeName: $("grenade-name"), grenadeIcon: $("grenade-icon"), grenadeCount: $("grenade-count"),
    kills: $("hud-kills"),
    missionName: $("mt-name"), missionDesc: $("mt-desc"), timer: $("mt-timer"),
    driveHud: $("drive-hud"), speed: $("drive-speed"), vehHealth: $("veh-bar"), nitro: $("nitro-bar"),
    toast: $("toast-wrap"), prompt: { prompt: $("prompt"), promptText: $("prompt-text") },
    // menus
    menu: $("menu"), pause: $("pause"), controls: $("controls"), settings: $("settings"),
    credits: $("credits"), garage: $("garage"), result: $("result"), resultTitle: $("result-title"),
    resultBody: $("result-body"), gameover: $("gameover"), loading: $("loading"),
    hudWrap: $("hud"), touch: $("touch"), stick: $("stick"), knob: $("stick-knob"),
    fire: $("t-fire"), reload: $("t-reload"), roll: $("t-roll"), grenade: $("t-grenade"),
    enter: $("t-enter"), switchBtn: $("t-switch"),
  };
}

const DEFAULT_SETTINGS = { sound: true, weather: "auto", time: "auto", traffic: "high", shake: true };

function loadSettings() {
  try { const r = localStorage.getItem(CONFIG.SETTINGS_KEY); if (r) return { ...DEFAULT_SETTINGS, ...JSON.parse(r) }; } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}
function saveSettings(s) { try { localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }

function detectMobile() {
  const touch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  const small = window.matchMedia("(max-width: 900px)").matches;
  return touch || small;
}

function resize(canvas, game) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  CONFIG.VIEW_W = window.innerWidth; CONFIG.VIEW_H = window.innerHeight;
  canvas.width = CONFIG.VIEW_W * dpr; canvas.height = CONFIG.VIEW_H * dpr;
  canvas.style.width = CONFIG.VIEW_W + "px"; canvas.style.height = CONFIG.VIEW_H + "px";
  const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.minimap.resize();
}

let game, input, audio, dom, settings;
let prePauseState = "playing";

function startNewGame() { audio.uiClick(); game.startNewGame(); hideAllOverlays(); showHud(true); }
function continueGame() { audio.uiClick(); if (game.load()) { game.continueGame(); hideAllOverlays(); showHud(true); } else game.toast("No save found", "bad"); }
function hideAllOverlays() { for (const k of ["menu", "pause", "controls", "settings", "credits", "garage", "result", "gameover"]) dom[k].classList.add("hidden"); }
function showHud(v) { dom.hudWrap.classList.toggle("show", v); dom.minimap.classList.toggle("show", v); }
function pauseFor(kind) { prePauseState = game.state; game.state = "overlay"; }
function resumeFromPause() { game.state = "playing"; }

function togglePause() {
  if (game.state === "playing") { game.state = "paused"; dom.pause.classList.remove("hidden"); }
  else if (game.state === "paused") { dom.pause.classList.add("hidden"); game.state = "playing"; }
}

function openOverlay(name) {
  pauseFor(name);
  if (name === "controls") dom.controls.classList.remove("hidden");
  if (name === "credits") dom.credits.classList.remove("hidden");
  if (name === "settings") { syncSettingsUI(); dom.settings.classList.remove("hidden"); }
}
function syncSettingsUI() {
  $("set-sound").checked = settings.sound;
  $("set-weather").value = settings.weather;
  $("set-time").value = settings.time;
  $("set-shake").checked = settings.shake;
}
function applySettings() {
  settings.sound = $("set-sound").checked;
  settings.weather = $("set-weather").value;
  settings.time = $("set-time").value;
  settings.shake = $("set-shake").checked;
  audio.setEnabled(settings.sound);
  saveSettings(settings);
}

// ---------- Shop / Garage ----------
function openShop() {
  pauseFor("shop");
  dom.resultTitle.textContent = "🏪 Armory";
  dom.resultBody.innerHTML = "";
  const rows = [
    { label: "9mm Ammo +30", price: 90, act: () => { game.player.reserves.pistol = (game.player.reserves.pistol || 0) + 30; } },
    { label: "SMG Ammo +30", price: 90, act: () => { game.player.reserves.smg = (game.player.reserves.smg || 0) + 30; } },
    { label: "Rifle Ammo +30", price: 110, act: () => { game.player.reserves.rifle = (game.player.reserves.rifle || 0) + 30; } },
    { label: "Shotgun Shells +14", price: 120, act: () => { game.player.reserves.shotgun = (game.player.reserves.shotgun || 0) + 14; } },
    { label: "Sniper Rounds +5", price: 150, act: () => { game.player.reserves.sniper = (game.player.reserves.sniper || 0) + 5; } },
    { label: "🛡️ Full Armor", price: 300, act: () => { game.player.armor = game.player.maxArmor; } },
    { label: "❤️ Med Kit", price: 200, act: () => { game.player.hp = game.player.maxHp; } },
    { label: "💣 Frag x2", price: 250, act: () => { game.player.grenades.frag = (game.player.grenades.frag || 0) + 2; } },
    { label: "⚡ Flash x2", price: 200, act: () => { game.player.grenades.flash = (game.player.grenades.flash || 0) + 2; } },
    { label: "🌫️ Smoke x2", price: 180, act: () => { game.player.grenades.smoke = (game.player.grenades.smoke || 0) + 2; } },
  ];
  for (const r of rows) {
    const row = document.createElement("div"); row.className = "result-row";
    row.innerHTML = `<span>${r.label}</span>`;
    const b = document.createElement("button"); b.className = "mini-btn"; b.textContent = "$" + r.price;
    b.onclick = () => { if (game.spend(r.price)) { r.act(); game.toast("Purchased " + r.label, "good"); audio.pickup(); openShop(); } };
    row.appendChild(b); dom.resultBody.appendChild(row);
  }
  const close = document.createElement("button"); close.className = "menu-btn primary"; close.textContent = "Leave";
  close.onclick = () => { dom.result.classList.add("hidden"); resumeFromPause(); };
  dom.resultBody.appendChild(close);
  dom.result.classList.remove("hidden");
}

let garageSel = null;
function openGarage() {
  pauseFor("garage");
  dom.garage.classList.remove("hidden");
  renderGarage();
}
function renderGarage() {
  $("garage-money").textContent = "💰 " + fmtMoney(game.money);
  if (!garageSel) garageSel = game.player.inVehicle.def.id;
  const carsEl = $("garage-cars"); carsEl.innerHTML = "";
  VEHICLES.forEach((v) => {
    const row = document.createElement("div"); row.className = "car-row" + (garageSel === v.id ? " active" : "");
    row.innerHTML = `<div class="car-swatch" style="background:${v.color}"></div>
      <div class="car-name">${v.name}<br/><span style="font-size:10px;color:var(--ink-dim)">${v.class}</span></div>
      <div class="car-tag">Select</div>`;
    row.onclick = () => { garageSel = v.id; renderGarage(); };
    carsEl.appendChild(row);
  });
  const detail = $("garage-detail");
  const v = VEHICLES.find((x) => x.id === garageSel);
  detail.innerHTML = `<div class="gd-title">${v.name}</div>
    <div class="gd-stat"><span>Top Speed</span><strong>${Math.round(v.maxSpeed)} km/h</strong></div>
    <div class="gd-stat"><span>Body</span><strong>${v.body}</strong></div>
    <button class="menu-btn primary" style="margin-top:10px" id="gd-switch">Switch to ${v.name}</button>`;
  $("gd-switch").onclick = () => {
    const old = game.player.inVehicle;
    const nv = new Vehicle(v.id, old.x, old.y, { angle: old.angle });
    nv.driver = "player";
    const i = game.vehicles.indexOf(old); if (i >= 0) game.vehicles[i] = nv; else game.vehicles.push(nv);
    game.player.inVehicle = nv;
    game.toast("Now driving " + v.name, "good"); renderGarage();
  };
}

function setupMenus() {
  $("btn-new").onclick = startNewGame;
  $("btn-continue").onclick = continueGame;
  $("btn-controls").onclick = () => { audio.uiClick(); openOverlay("controls"); };
  $("btn-credits").onclick = () => { audio.uiClick(); openOverlay("credits"); };
  $("btn-exit").onclick = () => { audio.uiClick(); exitToPortfolio(); };

  $("p-resume").onclick = () => { audio.uiClick(); togglePause(); };
  $("p-settings").onclick = () => { audio.uiClick(); openOverlay("settings"); };
  $("p-controls").onclick = () => { audio.uiClick(); openOverlay("controls"); };
  $("p-save").onclick = () => { audio.uiClick(); game.save(); game.toast("Game saved", "good"); };
  $("p-menu").onclick = () => { audio.uiClick(); dom.pause.classList.add("hidden"); game.state = "menu"; dom.menu.classList.remove("hidden"); showHud(false); };

  $("c-close").onclick = () => { audio.uiClick(); dom.controls.classList.add("hidden"); if (prePauseState === "playing") game.state = "playing"; };
  $("cr-close").onclick = () => { audio.uiClick(); dom.credits.classList.add("hidden"); if (prePauseState === "playing") game.state = "playing"; };
  $("s-close").onclick = () => { audio.uiClick(); applySettings(); dom.settings.classList.add("hidden"); if (prePauseState === "playing") game.state = "playing"; };
  $("g-close").onclick = () => { audio.uiClick(); dom.garage.classList.add("hidden"); resumeFromPause(); };
  $("r-close").onclick = () => { audio.uiClick(); dom.result.classList.add("hidden"); resumeFromPause(); };
  $("go-revive").onclick = () => { audio.uiClick(); if (game.spend(500)) { dom.gameover.classList.add("hidden"); game.player.hp = game.player.maxHp; game.player.armor = game.player.maxArmor * 0.5; game.player.alive = true; game.player.invuln = 3; game.heat = 0; game.enemies = []; game.state = "playing"; } };
  $("go-menu").onclick = () => { audio.uiClick(); dom.gameover.classList.add("hidden"); game.state = "menu"; dom.menu.classList.remove("hidden"); showHud(false); };
}

function exitToPortfolio() {
  try { if (window.parent !== window) { window.parent.location.href = "/projects"; return; } } catch (e) {}
  try { window.location.href = "/projects"; } catch (e) { window.history.back(); }
}

// ---------- Loop ----------
let last = 0;
function loop(ts) {
  const dt = Math.min(CONFIG.MAX_DT, (ts - last) / 1000 || 0);
  last = ts;
  if (game.state === "playing") game.update(dt);
  if (game.state !== "menu") game.render();
  requestAnimationFrame(loop);
}

// ---------- Boot ----------
function boot() {
  settings = loadSettings();
  dom = buildDom();
  audio = new AudioEngine(); audio.setEnabled(settings.sound);
  const ui = { stick: dom.stick, knob: dom.knob, fire: dom.fire, reload: dom.reload, roll: dom.roll, grenade: dom.grenade, enter: dom.enter, switch: dom.switchBtn };
  input = new Input(dom.canvas, ui);
  game = new Game(dom.canvas, dom.minimap, dom, audio, input, settings);
  game.dom.openShop = openShop;
  game.dom.openGarage = openGarage;

  resize(dom.canvas, game);
  window.addEventListener("resize", () => {
    resize(dom.canvas, game);
    // Re-evaluate touch controls on viewport change (rotate / resize).
    dom.touch.classList.toggle("hidden", !(detectMobile() && game.state === "playing"));
  });
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "escape" || k === "p") { e.preventDefault(); togglePause(); }
  });

  // mobile UI
  const mobile = detectMobile();
  if (mobile) dom.touch.classList.remove("hidden");

  setupMenus();
  syncSettingsUI();

  // hide loading, show menu (or auto-start if requested via ?autostart for direct links)
  const autostart = new URLSearchParams(window.location.search).has("autostart");
  setTimeout(() => {
    dom.loading.classList.add("hidden");
    if (autostart) startNewGame();
  }, 400);
  requestAnimationFrame(loop);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
