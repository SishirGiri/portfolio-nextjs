// entities/Vehicle.js — drivable car/police/SUV/truck. Arcade physics + collision.
import { VEHICLES } from "../config.js";
import { TAU, clamp } from "../utils/math.js";
import { isSolid, tileAt, circleRect } from "../utils/collision.js";

export class Vehicle {
  constructor(typeId, x, y, opts = {}) {
    const def = typeof typeId === "string" ? VEHICLES.find((v) => v.id === typeId) : typeId;
    this.def = def;
    this.x = x; this.y = y; this.angle = opts.angle || 0;
    this.speed = 0;
    this.hp = def.body; this.maxHp = def.body;
    this.color = opts.color || def.color;
    this.w = def.w; this.h = def.h;
    this.driver = null;          // null (parked) | 'player' | {ai}
    this.traffic = !!opts.traffic;
    this.nitro = 0; this.nitroActive = false; this.maxNitro = opts.maxNitro || 0;
    this.wrecked = false; this.wreckT = 0;
    this.siren = 0;              // police siren phase
    this.alive = true;
  }

  // Player driving update.
  driveUpdate(dt, input, world, audio, onCrash) {
    if (this.wrecked) { this.wreckT -= dt; return; }
    const d = this.def;
    const mv = input.moveVec();
    const fwd = mv.y < -0.2 ? 1 : (input.keys["w"] ? 1 : 0);
    const back = mv.y > 0.2 ? 1 : (input.keys["s"] ? 1 : 0);
    let steer = (input.keys["a"] || mv.x < -0.2 ? -1 : 0) + (input.keys["d"] || mv.x > 0.2 ? 1 : 0);
    const handbrake = input.keys[" "] && this.maxNitro === 0;

    // nitro
    this.nitroActive = input.keys[" "] && this.maxNitro > 0 && this.nitro > 0;
    if (this.nitroActive) this.nitro = Math.max(0, this.nitro - dt * 33);
    else this.nitro = Math.min(this.maxNitro, this.nitro + dt * 6);

    const maxSpeed = d.maxSpeed * (this.nitroActive ? 1.35 : 1);
    if (fwd) this.speed += d.accel * dt;
    else if (back) this.speed -= d.accel * dt;
    else this.speed *= (1 - 1.0 * dt);
    if (handbrake) this.speed *= (1 - 2.6 * dt);
    this.speed = clamp(this.speed, -maxSpeed * 0.4, maxSpeed);

    const sf = clamp(Math.abs(this.speed) / 100, 0, 1);
    this.angle += steer * d.handling * sf * dt * (this.speed < 0 ? -1 : 1);

    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    const t = tileAt(world, nx, ny);
    if (isSolid(t)) {
      if (Math.abs(this.speed) > 110) {
        this.hp -= Math.abs(this.speed) * 0.04;
        audio && audio.crash(); onCrash && onCrash(Math.abs(this.speed));
      }
      this.speed *= -0.3;
    } else { this.x = nx; this.y = ny; }

    if (this.def.id === "police") this.siren += dt * 8;
    if (this.hp <= 0 && !this.wrecked) this.explode(audio, onCrash);
  }

  explode(audio, onCrash) {
    this.wrecked = true; this.wreckT = 8; this.hp = 0; this.speed = 0;
    audio && audio.explosion();
    onCrash && onCrash(120);
  }

  // Collision vs circle (entity). Returns true if hit.
  hitsCircle(cx, cy, cr) {
    // approximate vehicle as oriented box -> use local-space AABB
    const dx = cx - this.x, dy = cy - this.y;
    const ca = Math.cos(-this.angle), sa = Math.sin(-this.angle);
    const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
    return Math.abs(lx) < this.w / 2 + cr && Math.abs(ly) < this.h / 2 + cr;
  }

  update(dt) {
    if (this.wrecked) this.wreckT -= dt;
    if (this.def.id === "police" && !this.wrecked) this.siren += dt * 8;
  }

  draw(ctx, nf) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(-this.w / 2 + 3, -this.h / 2 + 3, this.w, this.h);
    ctx.rotate(this.angle);
    const col = this.wrecked ? "#2a2a2a" : this.color;
    // body
    ctx.fillStyle = col;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    // cabin
    ctx.fillStyle = shadeLocal(col, 0.7);
    ctx.fillRect(-this.w / 4, -this.h / 2 + 2, this.w / 2.2, this.h - 4);
    // windshield + rear window
    ctx.fillStyle = "rgba(150,210,240,0.55)";
    ctx.fillRect(this.w / 8, -this.h / 2 + 3, this.w / 6, this.h - 6);
    ctx.fillRect(-this.w / 3.5, -this.h / 2 + 3, this.w / 7, this.h - 6);
    // headlights (night)
    if (nf > 0.35 && !this.wrecked) {
      ctx.fillStyle = "rgba(255,245,200,0.95)";
      ctx.fillRect(this.w / 2 - 2, -this.h / 2 + 1, 2, 3);
      ctx.fillRect(this.w / 2 - 2, this.h / 2 - 4, 2, 3);
    }
    // police siren
    if (this.def.id === "police" && !this.wrecked) {
      const on = Math.floor(this.siren) % 2 === 0;
      ctx.fillStyle = on ? "#ff3b5c" : "#3a6aff";
      ctx.fillRect(-2, -this.h / 2 - 2, 4, 2);
      ctx.fillStyle = on ? "#3a6aff" : "#ff3b5c";
      ctx.fillRect(-2, this.h / 2, 4, 2);
    }
    ctx.restore();
    // nitro trail
    if (this.nitroActive) {
      for (let i = 0; i < 3; i++) {
        const a = this.angle + Math.PI;
        const dx = Math.cos(a) * (16 + i * 6), dy = Math.sin(a) * (16 + i * 6);
        ctx.fillStyle = `rgba(125,60,255,${0.3 - i * 0.08})`;
        ctx.beginPath(); ctx.arc(this.x + dx, this.y + dy, 5 - i, 0, TAU); ctx.fill();
      }
    }
    // health bar when damaged & player-driven
    if (this.hp < this.maxHp && this.driver === "player") {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(this.x - 18, this.y - 22, 36, 4);
      ctx.fillStyle = "#ffb020"; ctx.fillRect(this.x - 18, this.y - 22, 36 * (this.hp / this.maxHp), 4);
    }
  }
}

function shadeLocal(hex, f) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgb(${clamp(r * f, 0, 255) | 0},${clamp(g * f, 0, 255) | 0},${clamp(b * f, 0, 255) | 0})`;
}
