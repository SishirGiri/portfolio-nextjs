// ai/Pathfinding.js — lightweight grid pathfinding for enemy navigation.
// Uses BFS over the tile grid with a node cap for performance. Returns the next
// step direction toward a target, navigating around solid tiles.
import { CONFIG } from "../config.js";
import { isSolid } from "../utils/collision.js";

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class Pathfinder {
  constructor(world) {
    this.world = world;
    this._cache = new Map(); // key -> grid (flow field) for a target
    this._cacheKey = null;
  }
  clear() { this._cache.clear(); this._cacheKey = null; }

  // Compute a flow field (Dijkstra distances) from a target tile outward, capped.
  // Returns an Int16Array of distances (-1 = unreachable/solid).
  computeField(targetTX, targetTY, radius = 28) {
    const w = this.world.w, h = this.world.h;
    const dist = new Int16Array(w * h).fill(-1);
    const tq = targetTY * w + targetTX;
    if (isSolid(this.world.tiles[tq])) {
      // target inside solid: find nearest walkable neighbor
      let found = false;
      for (const [dx, dy] of DIRS) {
        const nx = targetTX + dx, ny = targetTY + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!isSolid(this.world.tiles[ny * w + nx])) { return this.computeField(nx, ny, radius); }
      }
      if (!found) return dist;
    }
    dist[tq] = 0;
    const queue = [targetTX, targetTY];
    let qi = 0;
    let count = 0;
    while (qi < queue.length && count < 4000) {
      const cx = queue[qi++], cy = queue[qi++];
      const cd = dist[cy * w + cx];
      if (cd >= radius) continue;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (isSolid(this.world.tiles[ni])) continue;
        // disallow corner cutting through walls for diagonals
        if (dx && dy) {
          if (isSolid(this.world.tiles[cy * w + nx]) || isSolid(this.world.tiles[ny * w + cx])) continue;
        }
        if (dist[ni] === -1) { dist[ni] = cd + 1; queue.push(nx, ny); }
      }
      count++;
    }
    return dist;
  }

  // Returns the next desired world-space direction {x,y} (normalized) toward the target,
  // or null if no path. Caches the field per target.
  nextStep(fromX, fromY, toX, toY) {
    const w = this.world.w;
    const ttx = Math.floor(toX / CONFIG.TILE), tty = Math.floor(toY / CONFIG.TILE);
    const key = ttx + "," + tty;
    let field;
    if (this._cacheKey === key && this._cache.has(key)) field = this._cache.get(key);
    else {
      field = this.computeField(ttx, tty);
      this._cache.set(key, field);
      this._cacheKey = key;
      if (this._cache.size > 8) { const fk = this._cache.keys().next().value; this._cache.delete(fk); }
    }
    const cx = Math.floor(fromX / CONFIG.TILE), cy = Math.floor(fromY / CONFIG.TILE);
    let best = null, bestDist = field[cy * w + cx];
    if (bestDist === -1) {
      // off-field: head straight toward target as fallback
      const a = Math.atan2(toY - fromY, toX - fromX);
      return { x: Math.cos(a), y: Math.sin(a) };
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= this.world.h) continue;
      const d = field[ny * w + nx];
      if (d !== -1 && d < bestDist) { bestDist = d; best = { x: dx, y: dy }; }
    }
    if (!best) {
      const a = Math.atan2(toY - fromY, toX - fromX);
      return { x: Math.cos(a), y: Math.sin(a) };
    }
    const m = Math.hypot(best.x, best.y) || 1;
    return { x: best.x / m, y: best.y / m };
  }
}
