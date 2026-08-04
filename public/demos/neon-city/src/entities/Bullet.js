// entities/Bullet.js — projectile with tracer, owner, penetration.
import { CONFIG } from "../config.js";
import { isSolid, tileAt } from "../utils/collision.js";
import { TAU } from "../utils/math.js";

export class Bullet {
  constructor() { this.alive = false; }
  spawn(x, y, vx, vy, dmg, fromPlayer, color, range, pen = 0, weaponId = "") {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.fromPlayer = fromPlayer; this.color = color;
    this.life = range / Math.hypot(vx, vy); // seconds to live
    this.pen = pen; this.weaponId = weaponId;
    this.radius = fromPlayer ? 2.6 : 2.4;
    this.trail = []; // recent positions for tracer
    this.alive = true;
    this._penetrations = 0;
  }
  update(dt, world, onHitEntity, onHitProp) {
    if (!this.alive) return;
    const steps = 2;
    const sdt = dt / steps;
    for (let s = 0; s < steps && this.alive; s++) {
      const px = this.x, py = this.y;
      this.x += this.vx * sdt; this.y += this.vy * sdt;
      this.trail.push(this.x, this.y);
      if (this.trail.length > 8) this.trail.splice(0, 2);
      // tile collision
      const t = tileAt(world, this.x, this.y);
      if (isSolid(t)) {
        if (this.pen > 0.3 && this._penetrations < 2 && t !== CONFIG.T_BUILDING) {
          this._penetrations++; this.dmg *= 0.6;
        } else {
          this.alive = false;
          onHitProp && onHitProp(this.x, this.y, t);
          return;
        }
      }
      // entity collision (callback returns true if hit something solid to stop the bullet)
      if (onHitEntity && onHitEntity(this, px, py)) { this.alive = false; return; }
    }
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    if (!this.alive) return;
    // tracer line
    if (this.trail.length >= 4) {
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(this.trail[0], this.trail[1]);
      for (let i = 2; i < this.trail.length; i += 2) ctx.lineTo(this.trail[i], this.trail[i + 1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, TAU); ctx.fill();
  }
}
