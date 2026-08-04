// utils/math.js — math helpers + seeded RNG.
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export function lerpAngle(a, b, t) {
  return a + angleDiff(a, b) * t;
}
export function rotateTowards(cur, target, maxStep) {
  const d = angleDiff(cur, target);
  if (Math.abs(d) <= maxStep) return target;
  return cur + Math.sign(d) * maxStep;
}

// Length of a vector
export const vlen = (x, y) => Math.sqrt(x * x + y * y);
// Normalize, returns {x,y} or zero vector if length ~0
export function normalize(x, y) {
  const l = Math.sqrt(x * x + y * y);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: x / l, y: y / l };
}

// Seeded RNG (mulberry32) so the city is reproducible.
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reseedable wrapper: rng() returns next float; reseed() resets to a seed.
export function makeRng(seed) {
  let s = seed;
  let gen = mulberry32(s);
  const rng = () => gen();
  rng.reseed = (n = seed) => { s = n | 0; gen = mulberry32(s); };
  rng.range = (a, b) => a + gen() * (b - a);
  rng.int = (a, b) => Math.floor(a + gen() * (b - a + 1));
  rng.pick = (arr) => arr[Math.floor(gen() * arr.length)];
  rng.chance = (p) => gen() < p;
  return rng;
}

// Color helpers
export function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgbToCss(r, g, b, a = 1) {
  return a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}
export function mixHex(a, b, t) {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  return rgbToCss(lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t), lerp(pa[2], pb[2], t));
}
export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToCss(clamp(r * f, 0, 255), clamp(g * f, 0, 255), clamp(b * f, 0, 255));
}

// Format money like $1,200
export function fmtMoney(n) { return "$" + Math.floor(n).toLocaleString("en-US"); }
