// utils/helpers.js — object pools + small canvas draw helpers.
import { TAU } from "./math.js";

// Generic object pool to avoid per-frame allocation for bullets/particles.
export class Pool {
  constructor(factory) { this.factory = factory; this.free = []; this.live = []; }
  acquire() {
    const o = this.free.pop() || this.factory();
    this.live.push(o);
    return o;
  }
  release(o) {
    const i = this.live.indexOf(o);
    if (i >= 0) { this.live.splice(i, 1); this.free.push(o); }
  }
  // Compact: remove dead items, move them to free list.
  compact(isDead) {
    const still = [];
    for (const o of this.live) {
      if (isDead(o)) this.free.push(o);
      else still.push(o);
    }
    this.live = still;
  }
  forEach(fn) { for (const o of this.live) fn(o); }
  get count() { return this.live.length; }
  clear() { for (const o of this.live) this.free.push(o); this.live = []; }
}

// Draw helpers (operate on a provided 2D context, already translated/rotated by caller).
export function fillCircle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
export function strokeCircle(ctx, x, y, r, color, lw = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}
export function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
export function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fill();
}

// Filled polygon from points.
export function polygon(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}

// Deterministic pseudo-hash from ints (for per-object variety in a seeded world).
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
