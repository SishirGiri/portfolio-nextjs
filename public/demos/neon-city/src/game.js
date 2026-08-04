// game.js — Game orchestrator. Owns world, camera, input, entities, missions,
// heat, economy, and the update/render pipeline. main.js drives the loop + menus.
import { CONFIG, DISTRICTS, MISSIONS, WEAPONS, GRENADES, xpForLevel } from "./config.js";
import { Camera } from "./utils/camera.js";
import { Pool, fillCircle, fillRect } from "./utils/helpers.js";
import { clamp, lerp, rand, randi, pick, dist, dist2, angleTo, TAU, mixHex } from "./utils/math.js";
import { hasLineOfSight, tileAt, isSolid, circleHitsSolid } from "./utils/collision.js";
import { CityMap } from "./maps/CityMap.js";
import { drawGround, drawBuilding } from "./maps/buildings.js";
import { drawProp, propRadius, isPropSolid, isPropExplosive, drawBarrel } from "./maps/mapObjects.js";
import { Player } from "./entities/Player.js";
import { Enemy } from "./entities/Enemy.js";
import { NPC } from "./entities/NPC.js";
import { Vehicle } from "./entities/Vehicle.js";
import { Bullet } from "./entities/Bullet.js";
import { Grenade, grenadeDefById } from "./entities/Grenade.js";
import { Particle, spawnHitSparks, spawnBlood, spawnMuzzle, spawnExplosion, spawnCasing } from "./entities/Particle.js";
import { Pathfinder } from "./ai/Pathfinding.js";
import { EnemyAI } from "./ai/EnemyAI.js";
import { HUD } from "./ui/HUD.js";
import { MiniMap } from "./ui/MiniMap.js";
import { Inventory } from "./ui/Inventory.js";

export class Game {
  constructor(canvas, mmCanvas, dom, audio, input, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dom = dom;
    this.audio = audio;
    this.input = input;
    this.settings = settings;

    this.camera = new Camera();
    this.minimap = new MiniMap(mmCanvas);
    this.hud = new HUD(dom);
    this.inventory = new Inventory(dom);

    this.state = "menu";          // menu | playing | paused | overlay | dead
    this.time = 0;
    this.world = null;
    this.player = null;
    this.vehicles = [];
    this.enemies = [];
    this.npcs = [];
    this.bullets = [];
    this.grenades = [];
    this.smokes = [];             // active smoke clouds (block LOS)
    this.markers = [];
    this.mission = null;
    this.missionDesc = "Find a <span class='mt-mark'>?</span> marker to start one.";
    this.missionTimer = 0;

    // pools
    this.particles = new Pool(() => new Particle());
    this.bulletPool = new Pool(() => new Bullet());
    this.grenadePool = new Pool(() => new Grenade());

    // progression / economy
    this.money = 500;
    this.xp = 0; this.level = 1; this.xpNext = xpForLevel(1);
    this.kills = 0;
    this.heat = 0; this._heatSeen = 0;
    this.stats = { missionsDone: 0, kmDriven: 0, districts: new Set() };
    this.achievements = new Set();
    this.combatRecent = 0;

    // environment
    this.dayTime = 0.32;          // 0..1 (0 = midnight, 0.5 = noon)
    this.weather = "clear"; this._weatherT = 0;
    this._loadPos = null;

    // AI
    this.pathfinder = null;
    this.ai = null;
    this._engineT = 0;
  }

  // ---------- World / session setup ----------
  initWorld() {
    this.world = new CityMap();
    this.pathfinder = new Pathfinder(this.world);
    this.ai = new EnemyAI(this.pathfinder);
    this.setupMarkers();
  }

  setupMarkers() {
    const T = CONFIG.TILE;
    this.markers = [
      { x: 70 * T, y: 35 * T, kind: "mission" },
      { x: 20 * T, y: 20 * T, kind: "mission" },
      { x: 115 * T, y: 25 * T, kind: "mission" },
      { x: 20 * T, y: 60 * T, kind: "mission" },
      { x: 115 * T, y: 65 * T, kind: "mission" },
      { x: 70 * T, y: 110 * T, kind: "mission" },
      { x: 60 * T, y: 60 * T, kind: "garage" },
      { x: 110 * T, y: 70 * T, kind: "garage" },
      { x: 50 * T, y: 50 * T, kind: "safehouse" },
      { x: 75 * T, y: 50 * T, kind: "shop" },
    ];
  }

  startNewGame() {
    this.initWorld();
    const T = CONFIG.TILE;
    const start = this.world.findRoadNear(70 * T, 35 * T, 24);
    this.player = new Player(start.x, start.y);
    // starter vehicle next to player
    const carSpot = this.world.findRoadNear(start.x + 60, start.y, 8);
    const car = new Vehicle("police", carSpot.x, carSpot.y, { angle: 0 });
    this.vehicles = [car];
    this.enemies = []; this.npcs = []; this.bullets = []; this.grenades = []; this.smokes = [];
    this.particles.clear(); this.bulletPool.clear(); this.grenadePool.clear();
    this.mission = null; this.missionTimer = 0;
    this.heat = 0; this._heatSeen = 0; this.money = 500; this.xp = 0; this.level = 1; this.xpNext = xpForLevel(1);
    this.kills = 0; this.stats = { missionsDone: 0, kmDriven: 0, districts: new Set() };
    this.dayTime = 0.32; this.weather = "clear"; this._weatherT = 0;
    this.seedWorld();
    this.camera.snapTo(this.player);
    this.state = "playing";
    this.toast("Deployed to the city. Stay sharp.", "info");
  }

  seedWorld() {
    // parked cars along roads
    for (let i = 0; i < 30; i++) {
      const c = pick(this.world.roadCells);
      const v = new Vehicle(pick(["sedan", "suv", "sedan", "truck"]), c.x * CONFIG.TILE + CONFIG.TILE / 2, c.y * CONFIG.TILE + CONFIG.TILE / 2, { angle: pick([0, Math.PI / 2]) });
      if (dist(v.x, v.y, this.player.x, this.player.y) > 120) this.vehicles.push(v);
    }
    // civilians + a couple police
    for (let i = 0; i < CONFIG.NPC_CAP; i++) {
      const c = pick(this.world.roadCells);
      this.npcs.push(new NPC(c.x * CONFIG.TILE, c.y * CONFIG.TILE, Math.random() < 0.15 ? "police" : "civilian"));
    }
  }

  randomRoadPointNear(ox, oy, r) { return this.world.findRoadNear(ox + rand(-r, r), oy + rand(-r, r), 12); }
  randomRoadPointFar(ox, oy, minD) { return this.world.randomRoadPointFar(ox, oy, minD); }

  // ---------- Save / Load ----------
  save() {
    try {
      const data = {
        money: this.money, xp: this.xp, level: this.level,
        reserves: this.player ? this.player.reserves : null,
        grenades: this.player ? this.player.grenades : null,
        weaponIndex: this.player ? this.player.weaponIndex : 0,
        px: this.player ? this.player.x : 70 * CONFIG.TILE,
        py: this.player ? this.player.y : 35 * CONFIG.TILE,
        dayTime: this.dayTime,
        stats: { ...this.stats, districts: [...this.stats.districts] },
        achievements: [...this.achievements],
        ts: Date.now(),
      };
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      this.money = d.money ?? 500; this.xp = d.xp ?? 0; this.level = d.level ?? 1; this.xpNext = xpForLevel(this.level);
      this._loadReserves = d.reserves; this._loadGrenades = d.grenades; this._loadWeapon = d.weaponIndex ?? 0;
      this._loadPos = { x: d.px, y: d.py };
      this.stats = { missionsDone: d.stats?.missionsDone ?? 0, kmDriven: d.stats?.kmDriven ?? 0, districts: new Set(d.stats?.districts ?? []) };
      this.achievements = new Set(d.achievements ?? []);
      this.dayTime = d.dayTime ?? 0.32;
      return true;
    } catch (e) { return false; }
  }
  continueGame() {
    this.initWorld();
    const T = CONFIG.TILE;
    const start = this.world.findRoadNear(this._loadPos?.x || 70 * T, this._loadPos?.y || 35 * T, 24);
    this.player = new Player(start.x, start.y);
    if (this._loadReserves) this.player.reserves = this._loadReserves;
    if (this._loadGrenades) this.player.grenades = this._loadGrenades;
    this.player.setWeapon(this._loadWeapon || 0);
    const car = new Vehicle("police", start.x + 60, start.y, { angle: 0 });
    this.vehicles = [car]; this.enemies = []; this.npcs = []; this.bullets = []; this.grenades = []; this.smokes = [];
    this.particles.clear(); this.bulletPool.clear(); this.grenadePool.clear();
    this.mission = null; this.missionTimer = 0; this.heat = 0;
    this.seedWorld();
    this.camera.snapTo(this.player);
    this.state = "playing";
    this.toast("Welcome back, operator.", "info");
  }

  // ---------- Update ----------
  update(dt) {
    if (this.state !== "playing") return;
    this.time += dt;
    if (this.combatRecent > 0) this.combatRecent -= dt;
    this.updateSky(dt);

    // player
    this.player.update(dt, this.input, this.world, this.camera, this.audio, (shot) => this.spawnPlayerShot(shot));

    // one-shot inputs
    if (this.input.consumeInteract()) this.interact();
    if (this.input.consumeGrenade()) this.throwGrenade();
    if (this.input.consumeSwitch()) { this.player.cycleGrenade(); this.audio.uiClick(); }
    this.inventory.update(dt);

    // driving vs on-foot camera follow
    const focus = this.player.inVehicle || this.player;
    const look = this.player.inVehicle ? { x: 0, y: 0 } : { x: this.input.mouse.x - CONFIG.VIEW_W / 2, y: this.input.mouse.y - CONFIG.VIEW_H / 2 };
    if (this.player.inVehicle) this.player.inVehicle.driveUpdate(dt, this.input, this.world, this.audio, (force) => this.onCrash(force));
    this.camera.follow(focus, dt, look.x, look.y);
    this.camera.decay(dt);

    // entities
    this.updateBullets(dt);
    this.updateGrenades(dt);
    this.updateEnemies(dt);
    this.updateNPCs(dt);
    this.updateVehicles(dt);
    this.updateParticles(dt);
    this.updateSmokes(dt);
    if (this.ai) this.ai.updateSounds(dt);

    // systems
    this.updateHeat(dt);
    if (this.mission) this.updateMission(dt);
    this.updateSpawning(dt);
    this.updatePrompts();

    // engine sound
    if (this.player.inVehicle && this.settings.sound) {
      this._engineT -= dt;
      if (this._engineT <= 0) { this._engineT = 0.12; this.audio.engineBlip(60 + Math.abs(this.player.inVehicle.speed) * 0.35); }
    }
    if (this.settings.sound) this.audio.ambient(dt);

    this.input.clearFrame();
    this.hud.refresh(this);
  }

  spawnPlayerShot(shot) {
    const w = shot.weapon; const p = this.player;
    this.combatRecent = 1.5;
    for (let i = 0; i < w.pellets; i++) {
      const spread = (Math.random() - 0.5) * this.player.weapon.spread() * 2 + (w.pellets > 1 ? (i / w.pellets - 0.5) * w.spread : 0);
      const a = shot.angle + spread;
      const b = this.bulletPool.acquire();
      const mx = p.x + Math.cos(a) * 16, my = p.y + Math.sin(a) * 16;
      b.spawn(mx, my, Math.cos(a) * w.bulletSpeed, Math.sin(a) * w.bulletSpeed, w.dmg, true, w.color, w.range, w.pen, w.id);
      this.bullets.push(b);
    }
    spawnMuzzle(this.particles, p.x + Math.cos(shot.angle) * 16, p.y + Math.sin(shot.angle) * 16, shot.angle, w.color);
    spawnCasing(this.particles, p.x, p.y, shot.angle);
    this.camera.addShake(w.id === "shotgun" ? 5 : w.id === "sniper" ? 6 : 1.5);
    this.ai.reportSound(p.x, p.y, 360); // enemies hear gunfire
    if (w.id === "sniper" || w.id === "rifle") this.addHeat(0.05);
  }

  onEnemyShoot(enemy, shot) {
    const w = WEAPONS.find((x) => x.id === shot.weaponId) || WEAPONS[0];
    const b = this.bulletPool.acquire();
    const a = shot.angle;
    b.spawn(enemy.x + Math.cos(a) * 14, enemy.y + Math.sin(a) * 14, Math.cos(a) * w.bulletSpeed, Math.sin(a) * w.bulletSpeed, w.dmg, false, "#ff8a4a", w.range, 0, w.id);
    this.bullets.push(b);
    spawnMuzzle(this.particles, enemy.x + Math.cos(a) * 14, enemy.y + Math.sin(a) * 14, a, "#ffaa55");
    this.audio.shoot(w.id);
  }
  onNpcShoot(npc, target) {
    const w = WEAPONS[0];
    const a = angleTo(npc.x, npc.y, target.x, target.y) + (Math.random() - 0.5) * 0.12;
    const b = this.bulletPool.acquire();
    b.spawn(npc.x + Math.cos(a) * 12, npc.y + Math.sin(a) * 12, Math.cos(a) * w.bulletSpeed, Math.sin(a) * w.bulletSpeed, w.dmg, false, "#9bd6ff", w.range, 0, w.id);
    this.bullets.push(b);
    this.audio.shoot("pistol");
  }

  updateBullets(dt) {
    const onHitEntity = (b, px, py) => {
      if (b.fromPlayer) {
        // enemies + (heat) npcs
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (dist2(b.x, b.y, e.x, e.y) < (e.radius + b.radius) ** 2) {
            const head = dist2(b.x, b.y, e.x, e.y) < (e.radius * 0.4) ** 2;
            e.damage(b.dmg, this, head);
            this.audio.hit();
            spawnHitSparks(this.particles, b.x, b.y, head ? "#ffd23f" : e.color);
            if (head) this.audio.headshot();
            return true;
          }
        }
        for (const n of this.npcs) {
          if (!n.alive) continue;
          if (this.heat >= 2 && dist2(b.x, b.y, n.x, n.y) < (n.radius + b.radius) ** 2) {
            n.damage(b.dmg, this); spawnBlood(this.particles, n.x, n.y); return true;
          }
        }
      } else {
        const p = this.player;
        if (dist2(b.x, b.y, p.x, p.y) < (p.radius + b.radius) ** 2) {
          p.damage(b.dmg, this); spawnBlood(this.particles, b.x, b.y); return true;
        }
        for (const n of this.npcs) {
          if (n.kind === "police" && n.alive && dist2(b.x, b.y, n.x, n.y) < (n.radius + b.radius) ** 2) {
            n.damage(b.dmg, this); return true;
          }
        }
      }
      // vehicles
      for (const v of this.vehicles) {
        if (v.wrecked) continue;
        if (v.hitsCircle(b.x, b.y, b.radius)) { v.hp -= b.dmg * 0.4; spawnHitSparks(this.particles, b.x, b.y, "#ffd23f"); if (v.hp <= 0) v.explode(this.audio, (f) => this.onCrash(f)); return true; }
      }
      return false;
    };
    const onHitProp = (x, y, t) => { spawnHitSparks(this.particles, x, y, "#cccccc", 4); };
    for (const b of this.bullets) b.update(dt, this.world, onHitEntity, onHitProp);
    this.bullets = this.bullets.filter((b) => { if (!b.alive) this.bulletPool.release(b); return b.alive; });
  }

  updateGrenades(dt) {
    const collide = (x, y) => isSolid(tileAt(this.world, x, y));
    for (const g of this.grenades) {
      g.update(dt, this.world, collide);
      if (!g.alive) {
        const fx = g.detonate();
        this.detonate(fx);
      }
    }
    this.grenades = this.grenades.filter((g) => { if (!g.alive) this.grenadePool.release(g); return g.alive; });
  }

  detonate(fx) {
    if (fx.kind === "frag") {
      spawnExplosion(this.particles, fx.x, fx.y);
      this.audio.explosion(); this.camera.addShake(10);
      this.ai.reportSound(fx.x, fx.y, 600);
      this.applyRadiusDamage(fx.x, fx.y, fx.radius, fx.dmg, true);
    } else if (fx.kind === "flash") {
      this.audio.flashbang(); this.camera.addShake(4);
      // stun enemies + flash player if close
      for (const e of this.enemies) if (e.alive && dist(e.x, e.y, fx.x, fx.y) < fx.radius) e.flashStun = 3;
      if (dist(this.player.x, this.player.y, fx.x, fx.y) < fx.radius) this.player.flashStun = 1.2;
    } else if (fx.kind === "smoke") {
      this.smokes.push({ x: fx.x, y: fx.y, r: fx.radius, life: 8 });
      for (let i = 0; i < 10; i++) { const p = this.particles.acquire(); p.spawn(fx.x + rand(-30, 30), fx.y + rand(-30, 30), rand(-10, 10), rand(-10, 10), rand(2, 4), "#9aa3b2", rand(8, 14), "smoke"); }
    }
  }

  applyRadiusDamage(x, y, r, dmg, fromPlayer) {
    // explosive barrels chain
    for (const pr of this.world.props) {
      if (pr.type === "barrel" && dist(pr.x, pr.y, x, y) < r) {
        pr.type = "_gone";
        setTimeout(() => this.detonate({ kind: "frag", x: pr.x, y: pr.y, radius: 110, dmg: 120 }), 80);
      }
    }
    for (const e of this.enemies) if (e.alive && dist(e.x, e.y, x, y) < r) e.damage(damageFalloff(dist(e.x, e.y, x, y), r, dmg), this);
    for (const n of this.npcs) if (n.alive && dist(n.x, n.y, x, y) < r) n.damage(damageFalloff(dist(n.x, n.y, x, y), r, dmg), this);
    for (const v of this.vehicles) if (!v.wrecked && v.hitsCircle(x, y, r)) { v.hp -= damageFalloff(0, r, dmg) * 0.5; if (v.hp <= 0) v.explode(this.audio, (f) => this.onCrash(f)); }
    if (fromPlayer === false) { if (dist(this.player.x, this.player.y, x, y) < r) this.player.damage(damageFalloff(dist(this.player.x, this.player.y, x, y), r, dmg), this); }
  }

  throwGrenade() {
    const p = this.player;
    const gdef = p.currentGrenade;
    if ((p.grenades[gdef.id] || 0) <= 0) { this.toast("No " + gdef.name + " left", "bad"); return; }
    p.grenades[gdef.id]--;
    const g = this.grenadePool.acquire();
    const a = p.aimAngle;
    const power = 320;
    g.spawn(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, Math.cos(a) * power, Math.sin(a) * power, gdef);
    this.grenades.push(g);
    this.audio.uiClick();
  }

  updateEnemies(dt) {
    const ctx = {
      player: this.player, world: this.world, audio: this.audio, game: this,
      enemies: this.enemies, heat: this.heat, combatRecent: this.combatRecent,
      onEnemyShoot: (e, s) => this.onEnemyShoot(e, s),
    };
    for (const e of this.enemies) {
      e.update(dt, this.world);
      if (e.alive && this.ai) this.ai.think(e, ctx, dt);
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.downT > 0);
  }

  updateNPCs(dt) {
    const ctx = {
      player: this.player, world: this.world, enemies: this.enemies,
      heat: this.heat, combatRecent: this.combatRecent,
      onNpcShoot: (n, t) => this.onNpcShoot(n, t), onNpcKilled: (n) => this.onNpcKilled(n),
    };
    for (const n of this.npcs) n.update(dt, ctx);
    this.npcs = this.npcs.filter((n) => n.alive);
  }

  updateVehicles(dt) {
    for (const v of this.vehicles) {
      if (v === this.player.inVehicle) continue;
      v.update(dt);
      // run-over collisions when player-driven car hits others
    }
    // player vehicle vs pedestrians/enemies
    const pv = this.player.inVehicle;
    if (pv && Math.abs(pv.speed) > 90) {
      for (const n of this.npcs) if (n.alive && pv.hitsCircle(n.x, n.y, n.radius)) { n.damage(100, { onNpcKilled: () => this.onNpcKilled(n) }); spawnBlood(this.particles, n.x, n.y); }
      for (const e of this.enemies) if (e.alive && pv.hitsCircle(e.x, e.y, e.radius)) { e.damage(Math.abs(pv.speed) * 0.2, this); }
    }
    this.vehicles = this.vehicles.filter((v) => !(v.wrecked && v.wreckT <= 0));
  }

  updateParticles(dt) {
    for (const p of this.particles.live) p.update(dt);
    this.particles.compact((p) => !p.alive);
    if (this.particles.count > 700) this.particles.live.splice(0, this.particles.count - 700);
  }
  updateSmokes(dt) {
    for (const s of this.smokes) s.life -= dt;
    this.smokes = this.smokes.filter((s) => s.life > 0);
  }

  // ---------- Heat ----------
  addHeat(n) { const b = Math.floor(this.heat); this.heat = clamp(this.heat + n, 0, 5); const a = Math.floor(this.heat); if (a > b) { this.toast("HEAT " + "★".repeat(a), "heat"); this.audio.siren(); } this._heatSeen = 4; }
  updateHeat(dt) {
    if (this._heatSeen > 0) this._heatSeen -= dt;
    else if (this.heat > 0) this.heat = Math.max(0, this.heat - CONFIG.HEAT_DECAY * dt);
    const wanted = Math.floor(this.heat);
    const active = this.enemies.filter((e) => e.heat && e.alive).length;
    if (wanted > 0 && active < wanted * 2 && Math.random() < 0.015 + wanted * 0.01) this.spawnHeatEnemies(1);
  }
  spawnHeatEnemies(n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = rand(500, 900);
      const x = clamp(this.player.x + Math.cos(a) * r, 50, CONFIG.WORLD_W * CONFIG.TILE - 50);
      const y = clamp(this.player.y + Math.sin(a) * r, 50, CONFIG.WORLD_H * CONFIG.TILE - 50);
      const tier = this.heat >= 4 ? "elite" : this.heat >= 2.5 ? "soldier" : "thug";
      const e = new Enemy(x, y, tier); e.heat = true; this.enemies.push(e);
    }
  }

  // ---------- Spawning (traffic/civilians refresh) ----------
  updateSpawning(dt) {
    if (this.npcs.length < CONFIG.NPC_CAP && Math.random() < 0.02) {
      const c = pick(this.world.roadCells);
      const x = c.x * CONFIG.TILE, y = c.y * CONFIG.TILE;
      if (dist(x, y, this.player.x, this.player.y) > 600) this.npcs.push(new NPC(x, y, Math.random() < 0.15 ? "police" : "civilian"));
    }
  }

  // ---------- Prompts / interaction ----------
  updatePrompts() {
    if (this.player.inVehicle) { this.showPrompt("", false); return; }
    // nearest enterable vehicle
    let nearV = null, bd = 70 * 70;
    for (const v of this.vehicles) { if (v.wrecked || v.driver || v.traffic) continue; const d = dist2(v.x, v.y, this.player.x, this.player.y); if (d < bd) { bd = d; nearV = v; } }
    let nearM = null, md = 46 * 46;
    for (const m of this.markers) { const d = dist2(m.x, m.y, this.player.x, this.player.y); if (d < md) { md = d; nearM = m; } }
    if (nearV && bd < 70 * 70) this.showPrompt("Enter vehicle", true);
    else if (nearM) {
      const labels = { mission: "Start mission", garage: "Garage", safehouse: "Save & rest", shop: "Open shop" };
      this.showPrompt(labels[nearM.kind] || "Interact", true);
    } else this.showPrompt("", false);
  }
  showPrompt(text, show) { const d = this.dom.prompt; d.promptText.textContent = text; d.prompt.classList.toggle("hidden", !show); }

  interact() {
    const p = this.player;
    if (p.inVehicle) { this.exitVehicle(); return; }
    let best = null, bd = 70 * 70;
    for (const v of this.vehicles) { if (v.wrecked || v.driver || v.traffic) continue; const d = dist2(v.x, v.y, p.x, p.y); if (d < bd) { bd = d; best = v; } }
    if (best) { this.enterVehicle(best); return; }
    let nearM = null, md = 46 * 46;
    for (const m of this.markers) { const d = dist2(m.x, m.y, p.x, p.y); if (d < md) { md = d; nearM = m; } }
    if (nearM) this.activateMarker(nearM);
  }

  enterVehicle(v) {
    v.driver = "player"; v.traffic = false;
    this.player.inVehicle = v;
    this.dom.driveHud.classList.add("show");
    this.audio.uiClick();
    this.toast("Entered " + v.def.name, "info");
  }
  exitVehicle() {
    const v = this.player.inVehicle; if (!v) return;
    this.player.inVehicle = null; v.driver = null;
    this.player.x = v.x + Math.cos(v.angle + Math.PI / 2) * 26;
    this.player.y = v.y + Math.sin(v.angle + Math.PI / 2) * 26;
    v.speed = 0;
    this.dom.driveHud.classList.remove("show");
    this.audio.uiClick();
  }

  activateMarker(m) {
    switch (m.kind) {
      case "mission": if (this.mission) { this.toast("Finish your current op first", "bad"); return; } this.startMission(); break;
      case "garage": this.openGarage(); break;
      case "safehouse": this.save(); this.toast("Progress saved. Health & armor restored.", "good"); this.player.hp = this.player.maxHp; this.player.armor = this.player.maxArmor; this.heat = Math.max(0, this.heat - 2); break;
      case "shop": this.openShop(); break;
    }
  }

  // ---------- Missions ----------
  startMission() {
    const def = MISSIONS[(this.stats.missionsDone) % MISSIONS.length];
    this.mission = { def, dest: null, targets: [], hostages: [], startTime: this.time, state: "active", timer: def.timer || 0 };
    this.missionTimer = def.timer || 0;
    this.missionDesc = def.desc;
    this.setupMission();
    this.toast("Mission: " + def.name, "info");
    this.audio.toast();
  }
  setupMission() {
    const m = this.mission, def = m.def;
    const far = () => this.world.randomRoadPointFar(this.player.x, this.player.y, 500);
    switch (def.type) {
      case "eliminate": case "secure": {
        for (let i = 0; i < 6; i++) {
          const pt = this.randomRoadPointNear(this.player.x, this.player.y, 500);
          const tier = i < 2 ? "thug" : i < 4 ? "soldier" : "elite";
          const e = new Enemy(pt.x, pt.y, tier); this.enemies.push(e); m.targets.push(e);
        }
        m.dest = { x: this.player.x, y: this.player.y }; break;
      }
      case "rescue": {
        for (let i = 0; i < 3; i++) {
          const pt = this.randomRoadPointNear(this.player.x, this.player.y, 350);
          const h = new NPC(pt.x, pt.y, "hostage"); this.npcs.push(h); m.hostages.push(h);
          // guard
          const g = new Enemy(pt.x + rand(-40, 40), pt.y + rand(-40, 40), "thug"); this.enemies.push(g); m.targets.push(g);
        }
        m.dest = this.world.randomRoadPointFar(this.player.x, this.player.y, 700);
        break;
      }
      case "defuse": { const pt = this.randomRoadPointNear(this.player.x, this.player.y, 300); m.dest = pt; m.bomb = { x: pt.x, y: pt.y, defused: false }; break; }
      case "escort": { const pt = this.randomRoadPointNear(this.player.x, this.player.y, 80); const vip = new NPC(pt.x, pt.y, "hostage"); vip.rescued = true; this.npcs.push(vip); m.vip = vip; m.dest = this.world.randomRoadPointFar(this.player.x, this.player.y, 700); break; }
      case "capture": { const pt = this.randomRoadPointNear(this.player.x, this.player.y, 500); const t = new Enemy(pt.x, pt.y, "soldier"); t.isTarget = true; this.enemies.push(t); m.targets.push(t); break; }
      case "intel": { m.intel = []; for (let i = 0; i < 3; i++) m.intel.push({ ...this.randomRoadPointNear(this.player.x, this.player.y, 450), taken: false }); m.dest = m.intel[0]; break; }
    }
  }
  updateMission(dt) {
    const m = this.mission, def = m.def, p = this.player;
    if (m.timer > 0) { m.timer -= dt; this.missionTimer = m.timer; if (m.timer <= 0) { if (def.type === "defuse") return this.failMission("The bomb detonated."); } }
    switch (def.type) {
      case "eliminate": case "secure":
        if (m.targets.every((e) => !e.alive)) this.completeMission();
        break;
      case "rescue":
        if (m.hostages.every((h) => h.rescued || !h.alive) && dist2(p.x, p.y, m.dest.x, m.dest.y) < 50 * 50) this.completeMission();
        else for (const h of m.hostages) if (!h.rescued && h.alive && dist2(p.x, p.y, h.x, h.y) < 30 * 30) { h.rescued = true; this.toast("Hostage freed — get to extraction", "good"); }
        break;
      case "defuse":
        if (dist2(p.x, p.y, m.bomb.x, m.bomb.y) < 30 * 30) { m.bomb.defused = true; this.completeMission(); }
        break;
      case "escort":
        if (m.vip.alive && dist2(p.x, p.y, m.dest.x, m.dest.y) < 50 * 50) this.completeMission();
        else if (!m.vip.alive) this.failMission("The VIP was KIA.");
        break;
      case "capture":
        if (m.targets[0] && !m.targets[0].alive) this.completeMission();
        else if (m.targets[0] && m.targets[0].alive && dist2(p.x, p.y, m.targets[0].x, m.targets[0].y) < 24 * 24 && m.targets[0].hp < m.targets[0].maxHp * 0.2) { m.targets[0].alive = false; this.completeMission(); }
        break;
      case "intel": {
        const cur = m.intel.find((i) => !i.taken);
        if (cur && dist2(p.x, p.y, cur.x, cur.y) < 30 * 30) { cur.taken = true; this.toast("Intel " + (m.intel.filter((i) => i.taken).length) + "/" + m.intel.length, "good"); this.audio.pickup(); const next = m.intel.find((i) => !i.taken); m.dest = next || null; if (!next) this.completeMission(); }
        break;
      }
    }
  }
  completeMission() {
    const m = this.mission; if (!m) return;
    this.money += m.def.reward; this.addXP(m.def.xp);
    this.stats.missionsDone++;
    this.toast("Mission Complete +" + m.def.reward, "good");
    this.audio.missionDone();
    this.mission = null; this.missionTimer = 0;
    this.missionDesc = "Find a <span class='mt-mark'>?</span> marker to start one.";
    this.checkAchievements();
  }
  failMission(reason) {
    this.toast("Mission Failed: " + reason, "bad");
    this.audio.missionFail();
    this.mission = null; this.missionTimer = 0;
    this.missionDesc = "Find a <span class='mt-mark'>?</span> marker to start one.";
  }

  // ---------- Economy / XP ----------
  addXP(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.xpNext = xpForLevel(this.level); this.money += 500; this.toast("Level Up → LV " + this.level + "  (+$500)", "good"); this.audio.levelUp(); }
  }
  spend(n) { if (this.money < n) { this.toast("Not enough cash", "bad"); return false; } this.money -= n; return true; }

  // ---------- Events ----------
  onEnemyKilled(e) {
    this.kills++;
    const reward = (e.tierLevel || 1) * 70; this.money += reward; this.addXP(25 + (e.tierLevel || 1) * 15);
    this.addHeat(e.heat ? 0 : 0.3);
    if (Math.random() < 0.4) {/* cash pickup could drop; keep simple */}
    this.checkAchievements();
  }
  onEnemyHit(e, head) {}
  onNpcKilled(n) { this.addHeat(0.6); }
  onPlayerHit(amount) { this.camera.addShake(2); }
  onPlayerDeath() { this.state = "dead"; this.audio.death(); this.dom.gameover.classList.remove("hidden"); }
  onCrash(force) { this.camera.addShake(clamp(force * 0.04, 2, 12)); if (force > 100 && this.player.inVehicle) { this.player.damage(force * 0.1, this); } }
  spawnBlood(x, y) { spawnBlood(this.particles, x, y); }

  checkAchievements() {
    const give = (id, name) => { if (!this.achievements.has(id)) { this.achievements.add(id); this.toast("🏆 " + name, "good"); this.audio.levelUp(); } };
    if (this.stats.missionsDone >= 1) give("first", "First Op Complete");
    if (this.kills >= 10) give("marksman", "Marksman — 10 kills");
    if (this.money >= 20000) give("earner", "Big Earner — $20,000");
    if (this.stats.missionsDone >= 7) give("veteran", "Veteran — 7 ops");
  }

  // ---------- Shop / Garage (open overlays via main.js DOM) ----------
  openShop() { if (this.dom.openShop) this.dom.openShop(); }
  openGarage() { if (this.player.inVehicle && this.dom.openGarage) this.dom.openGarage(); else this.toast("Enter a vehicle first", "bad"); }

  // ---------- Sky / weather ----------
  updateSky(dt) {
    if (this.settings.time === "day") this.dayTime = 0.4;
    else if (this.settings.time === "night") this.dayTime = 0.0;
    else this.dayTime = (this.dayTime + dt * 0.005) % 1;
    if (this.settings.weather === "auto") { this._weatherT += dt; if (this._weatherT > 70) { this._weatherT = 0; this.weather = pick(["clear", "clear", "rain", "fog"]); } }
    else this.weather = this.settings.weather;
  }
  nightFactor() { const t = this.dayTime; const d = Math.abs(((t + 0.5) % 1) - 0.5); return clamp(1 - d / 0.26, 0, 1); }

  // ---------- Toasts ----------
  toast(msg, kind = "info") {
    const el = document.createElement("div");
    el.className = "toast " + kind; el.textContent = msg;
    this.dom.toast.appendChild(el);
    setTimeout(() => el.remove(), 3200);
    this.audio.toast();
  }

  // ---------- Render ----------
  render() {
    const ctx = this.ctx, W = CONFIG.VIEW_W, H = CONFIG.VIEW_H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const nf = this.nightFactor();
    ctx.fillStyle = mixHex("#10131f", "#05060f", nf);
    ctx.fillRect(0, 0, W, H);
    if (!this.world || !this.player) return;

    const o = this.camera.offset();
    ctx.save();
    ctx.translate(-this.camera.x + o.x, -this.camera.y + o.y);

    const view = { x: this.camera.x, y: this.camera.y, w: W, h: H };
    drawGround(ctx, this.world, view, nf);
    // buildings (2.5D) below entities
    const T = CONFIG.TILE;
    const x0 = Math.max(0, Math.floor(view.x / T) - 1), y0 = Math.max(0, Math.floor(view.y / T) - 1);
    const x1 = Math.min(this.world.w, Math.ceil((view.x + view.w) / T) + 1);
    const y1 = Math.min(this.world.h, Math.ceil((view.y + view.h) / T) + 1);
    for (const b of this.world.buildings) {
      if (b.x + b.w < view.x - T || b.x > view.x + view.w + T || b.y + b.h < view.y - T || b.y > view.y + view.h + T) continue;
      drawBuilding(ctx, b, nf);
    }
    // props
    for (const pr of this.world.props) {
      if (pr.type === "_gone") continue;
      if (pr.x < view.x - 40 || pr.x > view.x + view.w + 40 || pr.y < view.y - 40 || pr.y > view.y + view.h + 40) continue;
      if (pr.type === "barrel") drawBarrel(ctx, pr);
      else drawProp(ctx, pr, nf);
    }
    // smoke clouds
    for (const s of this.smokes) { ctx.fillStyle = "rgba(150,155,165,0.35)"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    // entities
    for (const v of this.vehicles) if (!this.player.inVehicle || v !== this.player.inVehicle) { if (inView(v.x, v.y, view)) v.draw(ctx, nf); }
    for (const n of this.npcs) if (inView(n.x, n.y, view)) n.draw(ctx);
    for (const e of this.enemies) if (inView(e.x, e.y, view)) e.draw(ctx, nf);
    // grenades
    for (const g of this.grenades) g.draw(ctx);
    // player (on top of enemies)
    this.player.draw(ctx, nf);
    if (this.player.inVehicle) this.player.inVehicle.draw(ctx, nf);
    // bullets / particles
    for (const b of this.bullets) b.draw(ctx);
    for (const p of this.particles.live) p.draw(ctx);
    // markers
    this.drawMarkers(ctx, nf);

    ctx.restore();

    // lighting (night)
    if (nf > 0.05) this.drawNightLights(ctx, W, H, nf, o);
    // weather overlay
    this.drawWeather(ctx, W, H, nf);
    // aim reticle
    if (!this.player.inVehicle) this.drawReticle(ctx);
    // hit direction indicators could go here
    this.minimap.draw(this);
  }

  drawMarkers(ctx, nf) {
    for (const m of this.markers) {
      if (Math.abs(m.x - this.camera.x - CONFIG.VIEW_W / 2) > CONFIG.VIEW_W) continue;
      const pulse = Math.sin(this.time * 3 + m.x * 0.01);
      const col = m.kind === "garage" ? "#ffb020" : m.kind === "safehouse" ? "#39d98a" : m.kind === "shop" ? "#7d3cff" : "#3da9fc";
      ctx.save(); ctx.translate(m.x, m.y);
      ctx.strokeStyle = col; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 24 + pulse * 3, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(0, -46, 0, 4);
      grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, col);
      ctx.globalAlpha = 0.3 + 0.25 * nf; ctx.fillStyle = grad; ctx.fillRect(-5, -46, 10, 50); ctx.globalAlpha = 1;
      const icon = m.kind === "garage" ? "🔧" : m.kind === "safehouse" ? "🏠" : m.kind === "shop" ? "🏪" : "?";
      ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(icon, 0, -52 + pulse * 2);
      ctx.restore();
    }
    // mission dest beam
    if (this.mission && this.mission.dest) {
      const d = this.mission.dest;
      ctx.strokeStyle = "#39d98a"; ctx.globalAlpha = 0.8; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(d.x, d.y, 28, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  drawNightLights(ctx, W, H, nf, o) {
    // radial light around player
    const px = this.player.x - this.camera.x + o.x, py = this.player.y - this.camera.y + o.y;
    const g = ctx.createRadialGradient(px, py, 40, px, py, 320);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(5,8,18,${0.6 * nf})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(10,5,30,${0.18 * nf})`; ctx.fillRect(0, 0, W, H);
  }
  drawWeather(ctx, W, H, nf) {
    if (this.weather === "rain") {
      ctx.strokeStyle = "rgba(160,200,255,0.3)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const x = (i * 97 + (this.time * 900 | 0)) % W, y = (i * 53 + (this.time * 1400 | 0)) % H;
        ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12);
      }
      ctx.stroke(); ctx.fillStyle = "rgba(20,30,50,0.18)"; ctx.fillRect(0, 0, W, H);
    } else if (this.weather === "fog") { ctx.fillStyle = "rgba(180,190,210,0.14)"; ctx.fillRect(0, 0, W, H); }
  }
  drawReticle(ctx) {
    const p = this.player;
    const w = this.camera.screenToWorld(this.input.mouse.x, this.input.mouse.y);
    const rx = w.x - this.camera.x + this.camera.offset().x;
    const ry = w.y - this.camera.y + this.camera.offset().y;
    ctx.strokeStyle = "#3da9fc"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(rx, ry, 8, 0, TAU); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx - 12, ry); ctx.lineTo(rx - 4, ry); ctx.moveTo(rx + 4, ry); ctx.lineTo(rx + 12, ry);
    ctx.moveTo(rx, ry - 12); ctx.lineTo(rx, ry - 4); ctx.moveTo(rx, ry + 4); ctx.lineTo(rx, ry + 12);
    ctx.stroke();
  }
}

function damageFalloff(d, r, dmg) { return dmg * clamp(1 - d / r, 0, 1); }
function inView(x, y, view) { return x > view.x - 60 && x < view.x + view.w + 60 && y > view.y - 60 && y < view.y + view.h + 60; }
