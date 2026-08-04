// utils/camera.js — follow camera with look-ahead, shake, world clamp.
import { CONFIG } from "../config.js";
import { clamp, lerp } from "./math.js";

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.shake = 0;
    this.lookAhead = 0.16;
  }
  snapTo(entity) {
    this.x = clamp(entity.x - CONFIG.VIEW_W / 2, 0, this._maxX());
    this.y = clamp(entity.y - CONFIG.VIEW_H / 2, 0, this._maxY());
  }
  follow(entity, dt, pointerOffsetX = 0, pointerOffsetY = 0) {
    const tx = entity.x - CONFIG.VIEW_W / 2 + pointerOffsetX * this.lookAhead;
    const ty = entity.y - CONFIG.VIEW_H / 2 + pointerOffsetY * this.lookAhead;
    this.x = lerp(this.x, clamp(tx, 0, this._maxX()), clamp(dt * 8, 0, 1));
    this.y = lerp(this.y, clamp(ty, 0, this._maxY()), clamp(dt * 8, 0, 1));
  }
  addShake(n) { this.shake = Math.min(this.shake + n, 14); }
  offset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const s = this.shake;
    return { x: (Math.random() * 2 - 1) * s, y: (Math.random() * 2 - 1) * s };
  }
  decay(dt) { if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 22); }
  _maxX() { return Math.max(0, CONFIG.WORLD_W * CONFIG.TILE - CONFIG.VIEW_W); }
  _maxY() { return Math.max(0, CONFIG.WORLD_H * CONFIG.TILE - CONFIG.VIEW_H); }
  worldToScreen(wx, wy) {
    const o = this.offset();
    return { x: wx - this.x + o.x, y: wy - this.y + o.y };
  }
  screenToWorld(sx, sy) {
    const o = this.offset();
    return { x: sx + this.x - o.x, y: sy + this.y - o.y };
  }
}
