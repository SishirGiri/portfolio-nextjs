// utils/collision.js — collision + line-of-sight helpers against the tile grid.
import { CONFIG } from "../config.js";

// Solid tile types (block movement and bullets unless penetrable).
const SOLID = new Set([CONFIG.T_BUILDING, CONFIG.T_WALL, CONFIG.T_FENCE, CONFIG.T_VOID]);

export function isSolid(tile) { return SOLID.has(tile); }
// Tiles that block entities but bullets can sometimes penetrate handled elsewhere.
export function isWalkable(tile) { return !SOLID.has(tile); }
export function isDriveable(tile) {
  return tile === CONFIG.T_ROAD || tile === CONFIG.T_LANE || tile === CONFIG.T_CROSSWALK ||
         tile === CONFIG.T_SIDEWALK || tile === CONFIG.T_PLAZA || tile === CONFIG.T_TRACK;
}

export function tileAt(world, wx, wy) {
  const cx = Math.floor(wx / CONFIG.TILE), cy = Math.floor(wy / CONFIG.TILE);
  if (cx < 0 || cy < 0 || cx >= world.w || cy >= world.h) return CONFIG.T_VOID;
  return world.tiles[cy * world.w + cx];
}

// Resolve circle-vs-tile-grid movement: try X then Y to allow sliding along walls.
export function moveCircle(world, ent, dx, dy) {
  const r = ent.radius;
  let nx = ent.x + dx;
  if (!circleHitsSolid(world, nx, ent.y, r)) ent.x = nx;
  let ny = ent.y + dy;
  if (!circleHitsSolid(world, ent.x, ny, r)) ent.y = ny;
}

export function circleHitsSolid(world, x, y, r) {
  // Sample the four cardinal points + center around the circle.
  const checks = [
    [x, y], [x + r, y], [x - r, y], [x, y + r], [x, y - r],
    [x + r * 0.7, y + r * 0.7], [x - r * 0.7, y + r * 0.7],
    [x + r * 0.7, y - r * 0.7], [x - r * 0.7, y - r * 0.7],
  ];
  for (const [px, py] of checks) {
    if (isSolid(tileAt(world, px, py))) return true;
  }
  return false;
}

// Circle vs axis-aligned rectangle overlap test.
export function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX, dy = cy - nearestY;
  return dx * dx + dy * dy < cr * cr;
}

// DDA grid raycast for line-of-sight. Returns true if line of sight is clear.
// maxTileSolidPenetration: how many solid tiles a "see-through" ray tolerates (0 = blocked by any).
export function hasLineOfSight(world, ax, ay, bx, by, allowFence = false) {
  // Convert to tile coords; step via DDA.
  let x0 = ax / CONFIG.TILE, y0 = ay / CONFIG.TILE;
  const x1 = bx / CONFIG.TILE, y1 = by / CONFIG.TILE;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const steps = Math.ceil(Math.max(dx, dy) * 2);
  if (steps === 0) return true;
  const sx = (x1 - x0) / steps, sy = (y1 - y0) / steps;
  for (let i = 1; i < steps; i++) {
    const tx = Math.floor(x0 + sx * i), ty = Math.floor(y0 + sy * i);
    if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return false;
    const t = world.tiles[ty * world.w + tx];
    if (t === CONFIG.T_BUILDING || t === CONFIG.T_WALL || t === CONFIG.T_VOID) return false;
    if (!allowFence && t === CONFIG.T_FENCE) return false;
  }
  return true;
}

// Raycast distance: how far can a bullet travel before hitting a solid tile.
// Returns { dist, hitTile }.
export function raycastSolid(world, ax, ay, angle, maxDist) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const step = CONFIG.TILE * 0.5;
  for (let d = step; d < maxDist; d += step) {
    const x = ax + dx * d, y = ay + dy * d;
    const t = tileAt(world, x, y);
    if (isSolid(t)) return { dist: d, hitTile: t };
  }
  return { dist: maxDist, hitTile: -1 };
}
