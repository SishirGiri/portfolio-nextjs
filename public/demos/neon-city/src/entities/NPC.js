// entities/NPC.js — civilians, police, hostages, shopkeepers with simple behaviors.
import { TAU, dist, angleTo } from "../utils/math.js";
import { moveCircle } from "../utils/collision.js";

const KINDS = {
  civilian:   { color: "#9bd6ff", radius: 8, speed: 50 },
  police:     { color: "#3a5a8a", radius: 9, speed: 95 },
  hostage:    { color: "#ffd23f", radius: 8, speed: 60 },
  shopkeeper: { color: "#c0a0ff", radius: 9, speed: 0 },
};

export class NPC {
  constructor(x, y, kind = "civilian") {
    const d = KINDS[kind] || KINDS.civilian;
    this.x = x; this.y = y; this.kind = kind;
    this.radius = d.radius; this.color = d.color; this.speed = d.speed;
    this.angle = Math.random() * TAU;
    this.walkPhase = Math.random() * TAU;
    this.timer = 1 + Math.random() * 3;
    this.vx = 0; this.vy = 0;
    this.panic = 0; this.alive = true;
    this.rescued = false;      // hostage flag
    this.fireCd = 1;           // police
    this.target = null;
  }

  update(dt, ctx) {
    if (!this.alive) return;
    this.timer -= dt;
    this.walkPhase += dt * 8;
    if (this.panic > 0) this.panic -= dt;
    const player = ctx.player;
    const danger = this.senseDanger(ctx);

    switch (this.kind) {
      case "civilian": this.behaviorCivilian(dt, ctx, danger); break;
      case "police": this.behaviorPolice(dt, ctx, danger); break;
      case "hostage": this.behaviorHostage(dt, ctx, danger); break;
      case "shopkeeper": this.vx = 0; this.vy = 0; break;
    }
    moveCircle(ctx.world, this, this.vx * dt, this.vy * dt);
    if (this.vx || this.vy) this.angle = Math.atan2(this.vy, this.vx);
    // despawn if very far from player
    if (dist(this.x, this.y, player.x, player.y) > 1600) this.alive = false;
  }

  senseDanger(ctx) {
    // gunfire nearby (enemy bullets / player shooting) -> civilians flee
    if (this.kind === "police") return false;
    for (const e of ctx.enemies) {
      if (e.alive && dist(e.x, e.y, this.x, this.y) < 180) return true;
    }
    if (ctx.player && !ctx.player.inVehicle && ctx.combatRecent > 0) {
      if (dist(ctx.player.x, ctx.player.y, this.x, this.y) < 220 && ctx.heat > 1) return true;
    }
    return false;
  }

  behaviorCivilian(dt, ctx, danger) {
    if (danger || this.panic > 0) {
      this.panic = Math.max(this.panic, 2);
      const fleeFrom = ctx.player;
      const a = angleTo(fleeFrom.x, fleeFrom.y, this.x, this.y);
      this.vx = Math.cos(a) * 130; this.vy = Math.sin(a) * 130;
    } else {
      if (this.timer <= 0) {
        this.timer = 1.5 + Math.random() * 3;
        if (Math.random() < 0.4) { this.vx = 0; this.vy = 0; }
        else { const a = Math.random() * TAU; this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed; }
      }
    }
  }

  behaviorPolice(dt, ctx, danger) {
    // police engage enemies (and the player at high heat)
    let target = null, bd = 999999;
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < 520 && d < bd) { bd = d; target = e; }
    }
    if (ctx.heat >= 3 && dist(this.x, this.y, ctx.player.x, ctx.player.y) < bd) {
      target = ctx.player; bd = dist(this.x, this.y, ctx.player.x, ctx.player.y);
    }
    if (target) {
      const a = angleTo(this.x, this.y, target.x, target.y);
      this.angle = a;
      this.fireCd -= dt;
      if (this.fireCd <= 0 && bd < 420) {
        this.fireCd = 0.6;
        if (ctx.onNpcShoot) ctx.onNpcShoot(this, target);
      }
      // approach if far
      if (bd > 240) { this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed; }
      else { this.vx *= 0.8; this.vy *= 0.8; }
    } else {
      if (this.timer <= 0) { this.timer = 2 + Math.random() * 3; const a = Math.random() * TAU; this.vx = Math.cos(a) * this.speed * 0.5; this.vy = Math.sin(a) * this.speed * 0.5; }
    }
  }

  behaviorHostage(dt, ctx, danger) {
    if (this.rescued) {
      // follow player
      const d = dist(this.x, this.y, ctx.player.x, ctx.player.y);
      if (d > 40) { const a = angleTo(this.x, this.y, ctx.player.x, ctx.player.y); this.vx = Math.cos(a) * this.speed; this.vy = Math.sin(a) * this.speed; }
      else { this.vx *= 0.8; this.vy *= 0.8; }
    } else {
      // cower
      this.vx *= 0.8; this.vy *= 0.8;
    }
  }

  damage(amount, ctx) {
    if (!this.alive) return;
    this.alive = false;
    ctx && ctx.onNpcKilled && ctx.onNpcKilled(this);
  }

  draw(ctx) {
    if (!this.alive) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#3a3030"; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius - 1, 0, TAU); ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(2, 2, this.radius, this.radius * 0.6, 0, 0, TAU); ctx.fill();
    // legs
    ctx.save(); ctx.rotate(this.angle);
    const sw = Math.sin(this.walkPhase) * 2;
    ctx.fillStyle = "#1a1a22"; ctx.fillRect(-2, -5, 4, 3 + sw); ctx.fillRect(-2, 2, 4, 3 - sw);
    ctx.restore();
    // torso
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, TAU); ctx.fill();
    // head
    ctx.fillStyle = "#d8a47a";
    ctx.beginPath(); ctx.arc(Math.cos(this.angle) * 2, Math.sin(this.angle) * 2, 4, 0, TAU); ctx.fill();
    if (this.kind === "hostage" && !this.rescued) {
      ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 3, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}
