// entities/Enemy.js — hostile unit with a behavior state machine.
// The think() logic lives in ai/EnemyAI.js; this class holds state + physics + draw.
import { CONFIG } from "../config.js";
import { TAU } from "../utils/math.js";
import { moveCircle } from "../utils/collision.js";

export class Enemy {
  constructor(x, y, tier = "thug") {
    const d = CONFIG.ENEMY[tier] || CONFIG.ENEMY.thug;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.radius = 11; this.tier = tier;
    this.hp = d.hp; this.maxHp = d.hp;
    this.speed = d.speed; this.accuracy = d.accuracy; this.react = d.react;
    this.color = d.color; this.range = d.range; this.tierLevel = d.tier;
    this.angle = Math.random() * TAU;
    this.aimAngle = this.angle;
    this.walkPhase = Math.random() * TAU;
    // AI state
    this.state = "patrol";      // patrol|guard|investigate|chase|cover|attack|search|flee
    this.stateTime = 0;
    this.alert = 0;             // 0..1 awareness before engaging
    this.lastKnown = null;      // {x,y} of player
    this.fireCd = Math.random() * 1.2;
    this.reactTimer = 0;        // reaction delay after first seeing player
    this.patrolTarget = null;
    this.down = false; this.downT = 0;
    this.isTarget = false;      // mission target flag
    this.heat = false;          // spawned by heat system
    this.flashStun = 0;
    this.weaponId = tier === "elite" ? "rifle" : tier === "soldier" ? "smg" : "pistol";
    this.alive = true;
  }

  get isDown() { return this.down || !this.alive; }

  damage(amount, game, headshot = false) {
    if (!this.alive) return;
    this.hp -= amount;
    this.alert = 1;
    if (this.state === "patrol" || this.state === "guard") this.setState("investigate");
    game && game.spawnBlood(this.x, this.y);
    game && game.onEnemyHit(this, headshot);
    if (this.hp <= 0) this.kill(game);
  }
  kill(game) {
    if (!this.alive) return;
    this.alive = false; this.down = true; this.downT = 6;
    game && game.onEnemyKilled(this);
  }
  setState(s) { this.state = s; this.stateTime = 0; }

  // Physics used by AI module.
  move(dt, world, dx, dy) {
    moveCircle(world, this, dx, dy);
    if (dx || dy) { this.angle = Math.atan2(dy, dx); this.walkPhase += dt * 10; }
  }

  // Shooting used by AI module. Returns a shot descriptor or null.
  tryShoot(target, audio) {
    if (this.fireCd > 0 || this.flashStun > 0.3) return null;
    this.fireCd = (this.weaponId === "pistol" ? 0.5 : this.weaponId === "smg" ? 0.12 : 0.18) * (0.8 + Math.random() * 0.6);
    const ang = Math.atan2(target.y - this.y, target.x - this.x);
    // accuracy-based spread
    const inacc = (1 - this.accuracy) * 0.25 + 0.04;
    const spread = (Math.random() - 0.5) * inacc * 2;
    audio && audio.shoot(this.weaponId);
    return { angle: ang + spread, weaponId: this.weaponId };
  }

  update(dt, world) {
    if (!this.alive) { if (this.down) this.downT -= dt; return; }
    this.stateTime += dt;
    if (this.flashStun > 0) this.flashStun -= dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    this.aimAngle = this.lastKnown ? Math.atan2(this.lastKnown.y - this.y, this.lastKnown.x - this.x) : this.angle;
  }

  draw(ctx, nf) {
    if (!this.alive) {
      // corpse
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.ellipse(this.x, this.y, 12, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#3a3030"; ctx.beginPath(); ctx.arc(this.x, this.y, 10, 0, TAU); ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(2, 3, this.radius + 1, (this.radius + 1) * 0.6, 0, 0, TAU); ctx.fill();
    // legs
    ctx.save(); ctx.rotate(this.angle);
    const sw = Math.sin(this.walkPhase) * 3;
    ctx.fillStyle = "#1a1a22";
    ctx.fillRect(-3, -6, 5, 4 + sw); ctx.fillRect(-3, 2, 5, 4 - sw);
    ctx.restore();
    // weapon
    ctx.save(); ctx.rotate(this.aimAngle); ctx.fillStyle = "#111"; ctx.fillRect(7, -1.5, 14, 3); ctx.restore();
    // torso
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.arc(0, 0, this.radius - 3, 0, TAU); ctx.fill();
    // head
    const hx = Math.cos(this.aimAngle) * 3, hy = Math.sin(this.aimAngle) * 3;
    ctx.fillStyle = "#caa078"; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.arc(hx, hy, 4.8, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
    // alert indicator
    if (this.state === "investigate") {
      ctx.fillStyle = "#ffd23f"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("?", 0, -18);
    } else if (this.state === "chase" || this.state === "attack") {
      ctx.fillStyle = "#ff3b5c"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", 0, -18);
    }
    ctx.restore();
    // health bar
    if (this.hp < this.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(this.x - 12, this.y - 18, 24, 3);
      ctx.fillStyle = "#ff3b5c"; ctx.fillRect(this.x - 12, this.y - 18, 24 * (this.hp / this.maxHp), 3);
    }
  }
}
