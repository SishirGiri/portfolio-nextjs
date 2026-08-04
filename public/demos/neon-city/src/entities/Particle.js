// entities/Particle.js — lightweight visual particle. Types: spark, blood, smoke, debris, muzzle, casing, explosion.
export class Particle {
  constructor() { this.alive = false; }
  spawn(x, y, vx, vy, life, color, size, type = "spark") {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size; this.type = type;
    this.alive = true;
    if (type === "smoke") { this.grow = size * 2; }
  }
  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const drag = this.type === "smoke" ? 0.6 : 1.6;
    this.vx *= (1 - drag * dt); this.vy *= (1 - drag * dt);
    if (this.type === "smoke") { this.size += dt * 8; this.vy -= dt * 6; }
    if (this.type === "casing") { /* gravity-ish handled by drag */ }
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    if (!this.alive) return;
    const a = Math.max(0, this.life / this.maxLife);
    if (this.type === "smoke") {
      ctx.fillStyle = `rgba(120,125,135,${a * 0.4})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === "blood") {
      ctx.fillStyle = this.color; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.type === "casing") {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - 1.5, this.y - 0.8, 3, 1.6);
    } else {
      // spark / debris / muzzle / explosion
      ctx.fillStyle = this.color; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// Helpers to spawn common bursts (attached to a particle pool in Game).
export function spawnHitSparks(pool, x, y, color, n = 6) {
  for (let i = 0; i < n; i++) {
    const p = pool.acquire(); p.alive || (p.spawn && p.spawn(0, 0, 0, 0, 0, "#", 1));
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    p.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.18 + Math.random() * 0.2, color, 1.5 + Math.random() * 2, "spark");
  }
}
export function spawnBlood(pool, x, y, n = 8) {
  for (let i = 0; i < n; i++) {
    const p = pool.acquire();
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 140;
    p.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * 0.3, "#a01828", 1.8 + Math.random() * 2.2, "blood");
  }
}
export function spawnMuzzle(pool, x, y, angle, color) {
  for (let i = 0; i < 4; i++) {
    const p = pool.acquire();
    const a = angle + (Math.random() - 0.5) * 0.7;
    p.spawn(x, y, Math.cos(a) * (80 + Math.random() * 120), Math.sin(a) * (80 + Math.random() * 120), 0.1, color || "#ffd23f", 2 + Math.random() * 2, "spark");
  }
}
export function spawnExplosion(pool, x, y) {
  for (let i = 0; i < 24; i++) {
    const p = pool.acquire();
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 260;
    const col = ["#ffb020", "#ff3b5c", "#ffd23f"][Math.floor(Math.random() * 3)];
    p.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * 0.5, col, 2 + Math.random() * 3, "spark");
  }
  for (let i = 0; i < 10; i++) {
    const p = pool.acquire();
    const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 60;
    p.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.6 + Math.random() * 0.8, "#444", 5 + Math.random() * 5, "smoke");
  }
}
export function spawnCasing(pool, x, y, angle) {
  const p = pool.acquire();
  const a = angle + Math.PI + (Math.random() - 0.5) * 0.6;
  p.spawn(x, y, Math.cos(a) * 60, Math.sin(a) * 60, 1.2, "#caa84a", 2, "casing");
}
