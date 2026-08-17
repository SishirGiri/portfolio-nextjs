// ════════════════════════════════════════════
// UTILS — math + misc helpers shared everywhere
// ════════════════════════════════════════════

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
/** Frame-rate independent exponential smoothing. */
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Deterministic RNG (mulberry32) — stable city layout per seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalize angle to [-PI, PI]. */
export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Shortest-path angular interpolation. */
export function angleLerp(a, b, t) {
  return a + normAngle(b - a) * t;
}

export function fmtTime(sec) {
  const t = Math.max(0, sec);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function fmtClock(sec) {
  const t = Math.max(0, sec);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtMoney(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Point → AABB (x,z, halfW, halfZ) penetration. Returns null or {nx,nz,depth}. */
export function circleAABB(px, pz, r, box) {
  const cx = clamp(px, box.x - box.hw, box.x + box.hw);
  const cz = clamp(pz, box.z - box.hz, box.z + box.hz);
  const dx = px - cx, dz = pz - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    return { nx: dx / d, nz: dz / d, depth: r - d };
  }
  // center inside box — push out along smallest axis
  const ox = box.hw - Math.abs(px - box.x);
  const oz = box.hz - Math.abs(pz - box.z);
  if (ox < oz) return { nx: Math.sign(px - box.x) || 1, nz: 0, depth: ox + r };
  return { nx: 0, nz: Math.sign(pz - box.z) || 1, depth: oz + r };
}

/** Simple seeded pick helper for city generation. */
export function makeRng(seed) {
  const rng = mulberry32(seed);
  return {
    f: rng,
    range: (a, b) => a + rng() * (b - a),
    int: (a, b) => Math.floor(a + rng() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(rng() * arr.length)],
    chance: (p) => rng() < p,
  };
}

/** A* over a small node graph. nodes: [{x,z,id,nb:[{id,w}]}] */
export function aStar(nodes, startId, goalId) {
  if (startId === goalId) return [startId];
  const open = new Map([[startId, 0]]);
  const came = new Map();
  const gScore = new Map([[startId, 0]]);
  const fScore = new Map([[startId, 0]]);
  const goal = nodes[goalId];
  const h = (id) => Math.hypot(nodes[id].x - goal.x, nodes[id].z - goal.z);
  while (open.size) {
    let cur = null, best = Infinity;
    for (const [id, f] of open) if (f < best) { best = f; cur = id; }
    if (cur === goalId) {
      const path = [cur];
      while (came.has(cur)) { cur = came.get(cur); path.push(cur); }
      return path.reverse();
    }
    open.delete(cur);
    for (const { id: nb, w } of nodes[cur].nb) {
      const t = gScore.get(cur) + w;
      if (t < (gScore.get(nb) ?? Infinity)) {
        came.set(nb, cur);
        gScore.set(nb, t);
        fScore.set(nb, t + h(nb));
        open.set(nb, fScore.get(nb));
      }
    }
  }
  return null;
}
