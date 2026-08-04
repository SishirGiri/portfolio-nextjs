// entities/Grenade.js — frag / flash / smoke grenade projectile with fuse timer.
import { GRENADES } from "../config.js";
import { TAU } from "../utils/math.js";

export class Grenade {
  constructor() { this.alive = false; }
  spawn(x, y, vx, vy, def) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.def = def;
    this.fuse = def.fuse;
    this.alive = true;
    this.spin = Math.random() * TAU;
    this.bounced = false;
  }
  update(dt, world, collide) {
    if (!this.alive) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= (1 - 2.2 * dt); this.vy *= (1 - 2.2 * dt);
    this.spin += dt * 12;
    // bounce off solid tiles
    if (collide && collide(this.x, this.y)) {
      this.vx *= -0.4; this.vy *= -0.4;
      this.x += this.vx * dt * 2; this.y += this.vy * dt * 2;
    }
    this.fuse -= dt;
    if (this.fuse <= 0) this.alive = false;
  }
  // Returns the effect payload when detonated.
  detonate() {
    const d = this.def;
    return { kind: d.kind, x: this.x, y: this.y, radius: d.radius, dmg: d.dmg, color: d.color };
  }
  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(2, 2, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.rotate(this.spin);
    // body
    ctx.fillStyle = this.def.color;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    // top cap
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-2, -8, 4, 3);
    ctx.restore();
  }
}

export function grenadeDefById(id) { return GRENADES.find((g) => g.id === id); }
