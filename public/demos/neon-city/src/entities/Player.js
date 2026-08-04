// entities/Player.js — modern SWAT operator.
// 8-direction movement, mouse aim, weapon rotation, sprint, roll/dodge (i-frames),
// reload, health/armor, inventory (weapons + grenades + reserves).
import { CONFIG, PALETTE, WEAPONS, GRENADES } from "../config.js";
import { clamp, TAU, angleTo } from "../utils/math.js";
import { moveCircle } from "../utils/collision.js";
import { Weapon } from "../weapons/Weapon.js";

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = CONFIG.PLAYER.radius;
    this.angle = 0;             // body facing (movement dir)
    this.aimAngle = 0;          // weapon facing (mouse)
    this.hp = CONFIG.PLAYER.maxHp; this.maxHp = CONFIG.PLAYER.maxHp;
    this.armor = CONFIG.PLAYER.maxArmor; this.maxArmor = CONFIG.PLAYER.maxArmor;
    this.stamina = CONFIG.PLAYER.staminaMax;
    this.inVehicle = null;
    // inventory
    this.weapons = WEAPONS.map((w) => new Weapon(w));
    this.weaponIndex = 0;
    this.reserves = {}; WEAPONS.forEach((w) => this.reserves[w.id] = w.reserveStart);
    this.grenades = { frag: 2, flash: 1, smoke: 1 };
    this.grenadeIndex = 0;
    this.grenadeList = GRENADES;
    // state
    this.walkPhase = 0;
    this.invuln = 0;
    this.rollTime = 0; this.rollCooldown = 0; this.rollDir = { x: 0, y: 0 };
    this.reloading = 0;
    this.flashStun = 0;         // screen/aim disruption when flashed
    this.alive = true;
    this._stepTimer = 0;
  }

  get weapon() { return this.weapons[this.weaponIndex]; }
  get currentGrenade() { return this.grenadeList[this.grenadeIndex]; }

  setWeapon(i) {
    if (i < 0 || i >= this.weapons.length) return false;
    if (i === this.weaponIndex) return false;
    this.weaponIndex = i; this.reloading = 0;
    return true;
  }
  cycleGrenade() { this.grenadeIndex = (this.grenadeIndex + 1) % this.grenadeList.length; }

  startReload(audio) {
    const w = this.weapon;
    if (this.reloading > 0 || w.mag >= w.def.mag) return false;
    if ((this.reserves[w.def.id] || 0) <= 0) { audio && audio.empty(); return false; }
    this.reloading = w.def.reload;
    audio && audio.reload();
    return true;
  }
  finishReload() {
    const w = this.weapon;
    const need = w.def.mag - w.mag;
    const have = this.reserves[w.def.id] || 0;
    const take = Math.min(need, have);
    w.mag += take; this.reserves[w.def.id] = have - take;
    this.reloading = 0;
  }

  tryFire(audio) {
    const w = this.weapon;
    if (this.rollTime > 0 || this.reloading > 0 || this.flashStun > 0.4) return null;
    if (w.fireCd > 0) return null;
    if (w.mag <= 0) { audio && audio.empty(); this.startReload(audio); return null; }
    w.mag--; w.fireCd = w.def.rate;
    w.recoil = Math.min(w.def.recoilMax, w.recoil + w.def.recoil);
    audio && audio.shoot(w.def.id);
    // emit shot info; game spawns bullets/particles
    return { angle: this.aimAngle, weapon: w.def };
  }

  startRoll(moveX, moveY, audio) {
    if (this.rollCooldown > 0 || this.stamina < 25) return false;
    let dx = moveX, dy = moveY;
    if (dx === 0 && dy === 0) { dx = Math.cos(this.aimAngle); dy = Math.sin(this.aimAngle); }
    const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    this.rollDir = { x: dx, y: dy };
    this.rollTime = CONFIG.PLAYER.rollTime;
    this.rollCooldown = CONFIG.PLAYER.rollCooldown;
    this.invuln = Math.max(this.invuln, CONFIG.PLAYER.rollTime + 0.05);
    this.stamina -= 25;
    audio && audio.roll();
    return true;
  }

  update(dt, input, world, camera, audio, spawnShot) {
    if (!this.alive) return;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.rollCooldown > 0) this.rollCooldown -= dt;
    if (this.flashStun > 0) this.flashStun -= dt;
    this.weapon.update(dt);
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) this.finishReload(); }

    // Stamina regen
    this.stamina = clamp(this.stamina + CONFIG.PLAYER.staminaRegen * dt, 0, CONFIG.PLAYER.staminaMax);

    // Movement
    if (this.rollTime > 0) {
      this.rollTime -= dt;
      const sp = CONFIG.PLAYER.rollSpeed;
      moveCircle(world, this, this.rollDir.x * sp * dt, this.rollDir.y * sp * dt);
    } else {
      const mv = input.moveVec();
      const moving = mv.x !== 0 || mv.y !== 0;
      const wantSprint = input.sprinting() && this.stamina > 0 && moving;
      const sp = wantSprint ? CONFIG.PLAYER.sprintSpeed : CONFIG.PLAYER.walkSpeed;
      if (wantSprint) this.stamina = Math.max(0, this.stamina - CONFIG.PLAYER.sprintDrain * dt);
      moveCircle(world, this, mv.x * sp * dt, mv.y * sp * dt);
      if (moving) {
        this.angle = Math.atan2(mv.y, mv.x);
        this.walkPhase += dt * (wantSprint ? 18 : 12);
        // footstep audio
        this._stepTimer -= dt;
        if (this._stepTimer <= 0) { this._stepTimer = wantSprint ? 0.26 : 0.36; audio && audio.step(); }
      }
    }

    // Aim: mouse → world; on mobile, auto-aim handled by game (sets input.touchAim)
    let aimX, aimY;
    if (input.touchAim) { aimX = input.touchAim.x; aimY = input.touchAim.y; }
    else {
      const w = camera.screenToWorld(input.mouse.x, input.mouse.y);
      aimX = w.x; aimY = w.y;
    }
    this.aimAngle = angleTo(this.x, this.y, aimX, aimY);

    // Fire intent
    if ((input.fireHeld && this.weapon.def.auto) || input.mouse.fired) {
      const shot = this.tryFire(audio);
      if (shot && spawnShot) spawnShot(shot);
    }
    if (input.consumeReload()) this.startReload(audio);
    if (input.consumeRoll()) {
      const mv = input.moveVec();
      this.startRoll(mv.x, mv.y, audio);
    }
    // weapon switch via number keys
    const wk = input.weaponKey();
    if (wk >= 0) { if (this.setWeapon(wk)) audio && audio.uiClick(); }
  }

  damage(amount, game) {
    if (this.invuln > 0 || !this.alive) return;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor -= absorbed; dmg -= absorbed;
    }
    this.hp -= dmg;
    this.invuln = 0.35;
    game && game.onPlayerHit(amount);
    if (this.hp <= 0) { this.hp = 0; this.alive = false; game && game.onPlayerDeath(); }
  }
  heal(n) { this.hp = clamp(this.hp + n, 0, this.maxHp); }
  addArmor(n) { this.armor = clamp(this.armor + n, 0, this.maxArmor); }

  draw(ctx, nf) {
    if (this.inVehicle) return; // vehicle drawn separately
    const R = 13;
    const moving = this.rollTime > 0 || (Math.abs(this.vx) + Math.abs(this.vy)) > 0.5;
    const flashing = this.invuln > 0 && Math.floor(performance.now() / 60) % 2 === 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.ellipse(3, 4, R + 2, (R + 2) * 0.6, 0, 0, TAU); ctx.fill();

    // Roll: draw as a tumbling ball
    if (this.rollTime > 0) {
      ctx.fillStyle = flashing ? "#fff" : PALETTE.swat.suit;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = PALETTE.swat.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.restore();
      return;
    }

    // Body facing movement; weapon layer faces aimAngle.
    const bob = moving ? Math.sin(this.walkPhase) * 1.5 : Math.sin(performance.now() / 400) * 0.8;

    // legs
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = "#1a1f2a";
    const legSwing = moving ? Math.sin(this.walkPhase) * 4 : 0;
    ctx.fillRect(-3, -7, 6, 5 + legSwing);
    ctx.fillRect(-3, 2, 6, 5 - legSwing);
    ctx.restore();

    // weapon (rotated to aim)
    ctx.save();
    ctx.rotate(this.aimAngle);
    drawWeaponSprite(ctx, this.weapon.def.id);
    ctx.restore();

    // torso (vest)
    ctx.fillStyle = flashing ? "#fff" : PALETTE.swat.vest;
    ctx.beginPath(); ctx.arc(0, bob, R - 1, 0, TAU); ctx.fill();
    ctx.fillStyle = flashing ? "#eee" : PALETTE.swat.suit;
    ctx.beginPath(); ctx.arc(0, bob, R - 4, 0, TAU); ctx.fill();
    // chest plate accent
    ctx.fillStyle = PALETTE.swat.accent;
    ctx.fillRect(-3, bob - 2, 6, 4);

    // head (drawn last, on top, slightly toward aim)
    const hx = Math.cos(this.aimAngle) * 3, hy = Math.sin(this.aimAngle) * 3 + bob;
    ctx.fillStyle = PALETTE.swat.skin;
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, TAU); ctx.fill();
    // helmet
    ctx.fillStyle = "#1d2636";
    ctx.beginPath(); ctx.arc(hx, hy, 5.4, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
    // visor (facing aim)
    ctx.fillStyle = PALETTE.swat.visor;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(this.aimAngle);
    ctx.fillRect(2, -2.4, 3, 4.8);
    ctx.restore();

    // outline
    ctx.strokeStyle = "#07080d"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, bob, R - 1, 0, TAU); ctx.stroke();

    ctx.restore();
  }
}

function drawWeaponSprite(ctx, id) {
  ctx.fillStyle = "#16181f";
  switch (id) {
    case "pistol":
      ctx.fillRect(8, -2, 12, 4); ctx.fillRect(8, 1, 4, 5); break;
    case "smg":
      ctx.fillRect(8, -2, 18, 4); ctx.fillRect(10, 2, 4, 6); ctx.fillRect(20, -3, 4, 2); break;
    case "rifle":
      ctx.fillRect(8, -2, 24, 4); ctx.fillRect(12, 2, 4, 7); ctx.fillRect(22, -4, 6, 2); ctx.fillStyle="#3a3f4d"; ctx.fillRect(28,-1,6,2); break;
    case "shotgun":
      ctx.fillRect(8, -2, 22, 5); ctx.fillStyle="#3a2a1a"; ctx.fillRect(20, -1.5, 12, 3.5); ctx.fillStyle="#16181f"; ctx.fillRect(10, 2, 4, 6); break;
    case "sniper":
      ctx.fillRect(8, -2, 30, 3); ctx.fillStyle="#2a2e36"; ctx.fillRect(16, -5, 8, 2.5); ctx.fillStyle="#16181f"; ctx.fillRect(12, 2, 4, 6); break;
    default: ctx.fillRect(8, -2, 12, 4);
  }
}
