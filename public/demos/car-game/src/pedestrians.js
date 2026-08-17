// ════════════════════════════════════════════════════════
// PEDESTRIANS — sidewalk walkers that flee from speeding
// cars and can be knocked down (raises wanted level).
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import { PEDS_CONF, WORLD } from './config.js';
import { buildCharacter } from './vehicles.js';
import { choice, rand, clamp } from './utils.js';

export class Pedestrians {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.peds = [];
    this.onPedHit = null;
    this.quality = 1;
  }

  _ringFor(i, j) {
    const cx = this.city.cellCenter(i, j).x;
    const cz = this.city.cellCenter(i, j).z;
    const half = 13.2;
    const corners = [
      [cx - half, cz - half], [cx + half, cz - half],
      [cx + half, cz + half], [cx - half, cz + half],
    ];
    return corners;
  }

  _walkableCells() {
    const cells = [];
    for (let i = 0; i < WORLD.NX; i++) {
      for (let j = 0; j < WORLD.NZ; j++) {
        const d = this.city.districtOf(i, j);
        if (d === 'water') continue;
        if (this.city._poiCell(i, j)) continue;
        cells.push([i, j]);
      }
    }
    return cells;
  }

  spawnAll() {
    this.clearAll();
    const cells = this._walkableCells();
    const count = Math.round(PEDS_CONF.count * this.quality);
    for (let k = 0; k < count; k++) {
      const [i, j] = choice(cells);
      const corners = this._ringFor(i, j);
      const color = choice(PEDS_CONF.colors);
      const g = buildCharacter(color);
      this.scene.add(g);
      const seg = Math.floor(rand(0, 4));
      this.peds.push({
        g, corners, seg, t: rand(0, 1), dir: Math.random() < 0.5 ? 1 : -1,
        cellI: i, cellJ: j,
        speed: rand(0.9, 1.7), state: 'walk', fleeT: 0, hitT: 0, waitT: 0, crossT: 0,
        fleeDir: { x: 0, z: 0 },
      });
      this._place(this.peds[k]);
    }
  }

  _place(p) {
    const c = p.corners;
    const a = c[p.seg], b = c[(p.seg + 1) % 4];
    const x = a[0] + (b[0] - a[0]) * p.t;
    const z = a[1] + (b[1] - a[1]) * p.t;
    p.g.position.set(x, 0, z);
    const dx = (b[0] - a[0]) * p.dir, dz = (b[1] - a[1]) * p.dir;
    p.g.rotation.y = Math.atan2(dx, dz);
    return { x, z, dx, dz };
  }

  update(dt, playerPos, playerSpeed, rainAmount) {
    const activeTarget = Math.round(this.peds.length * (rainAmount > 0.4 ? 0.5 : 1));
    let active = 0;
    for (const p of this.peds) {
      if (p.state === 'gone') continue;
      if (active >= activeTarget) { p.g.visible = false; continue; }
      p.g.visible = true;
      active++;

      if (p.state === 'hit') {
        p.hitT -= dt;
        if (p.hitT <= 0) {
          // respawn elsewhere
          const cells = this._walkableCells();
          const [i, j] = choice(cells);
          p.corners = this._ringFor(i, j);
          p.seg = Math.floor(rand(0, 4)); p.t = rand(0, 1);
          p.state = 'walk';
          p.g.rotation.x = 0;
          p.g.position.y = 0;
          this._place(p);
        }
        p.g.userData.animate(dt, 0);
        continue;
      }

      const pos = p.g.position;
      const distToPlayer = Math.hypot(pos.x - playerPos.x, pos.z - playerPos.z);

      if (p.state === 'flee') {
        p.fleeT -= dt;
        const sp = PEDS_CONF.fleeSpeed;
        pos.x += p.fleeDir.x * sp * dt;
        pos.z += p.fleeDir.z * sp * dt;
        p.g.rotation.y = Math.atan2(p.fleeDir.x, p.fleeDir.z);
        p.g.userData.animate(dt, 1);
        if (p.fleeT <= 0) p.state = 'walk';
        continue;
      }

      // hit check (applies to walkers AND crossers)
      if (distToPlayer < PEDS_CONF.hitRadius && playerSpeed > 4.5) {
        p.state = 'hit';
        p.hitT = 6;
        p.g.rotation.x = Math.PI / 2;
        p.g.position.y = 0.25;
        if (this.onPedHit) this.onPedHit(pos.x, pos.z);
        continue;
      }

      // crossing the street
      if (p.state === 'wait' || p.state === 'cross') {
        this._updateCrossing(p, dt);
        continue;
      }

      // flee check
      if (distToPlayer < PEDS_CONF.fleeRadius && playerSpeed > 8) {
        p.state = 'flee';
        p.fleeT = rand(1.2, 2);
        const dx = pos.x - playerPos.x, dz = pos.z - playerPos.z;
        const d = Math.hypot(dx, dz) || 1;
        p.fleeDir = { x: dx / d, z: dz / d };
        continue;
      }

      // walk along ring
      const c = p.corners;
      const a = c[p.seg], b = c[(p.seg + 1) % 4];
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      p.t += (p.speed * p.dir / segLen) * dt;
      if (p.t >= 1) {
        p.t = 0; p.seg = (p.seg + 1) % 4;
        // at a corner — maybe cross the street to the neighboring block
        if (Math.random() < 0.3 && !this._crossingCount || (this._crossingCount || 0) < 4) {
          this._startCross(p);
        }
      }
      else if (p.t <= 0) { p.t = 1; p.seg = (p.seg + 3) % 4; }
      if (p.state === 'walk') this._place(p);
      p.g.userData.animate(dt, clamp(p.speed / 2, 0.2, 1));
    }
  }

  /** Wait at the curb, then cross to the matching corner of the next block. */
  _startCross(p) {
    const corner = p.corners[p.seg];
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const dir = Math.random() < 0.5 ? 1 : -1;
    const cellI = p.cellI + (axis === 'x' ? dir : 0);
    const cellJ = p.cellJ + (axis === 'z' ? dir : 0);
    if (cellI < 0 || cellI >= WORLD.NX || cellJ < 0 || cellJ >= WORLD.NZ) return;
    const d = this.city.districtOf(cellI, cellJ);
    if (d === 'river' || this.city._poiCell(cellI, cellJ)) return;
    p.state = 'wait';
    p.waitT = rand(0.8, 2.4);
    p.crossFrom = { x: corner[0], z: corner[1] };
    p.crossTo = { x: corner[0] + (axis === 'x' ? dir * WORLD.BLOCK : 0), z: corner[1] + (axis === 'z' ? dir * WORLD.BLOCK : 0) };
    p.crossCell = [cellI, cellJ];
    // face the crossing direction
    p.g.rotation.y = Math.atan2(p.crossTo.x - corner[0], p.crossTo.z - corner[1]);
    this._crossingCount = (this._crossingCount || 0) + 1;
  }

  _updateCrossing(p, dt) {
    if (p.state === 'wait') {
      p.waitT -= dt;
      p.g.userData.animate(dt, 0);
      if (p.waitT <= 0) p.state = 'cross';
      return;
    }
    // cross
    const dx = p.crossTo.x - p.crossFrom.x, dz = p.crossTo.z - p.crossFrom.z;
    const len = Math.hypot(dx, dz);
    p.crossT = (p.crossT || 0) + (p.speed * 1.5 / len) * dt;
    if (p.crossT >= 1) {
      // arrived: adopt the new block's ring at the matching corner
      p.corners = this._ringFor(p.crossCell[0], p.crossCell[1]);
      let best = 0, bd = Infinity;
      p.corners.forEach((cn, idx) => {
        const d2 = (cn[0] - p.crossTo.x) ** 2 + (cn[1] - p.crossTo.z) ** 2;
        if (d2 < bd) { bd = d2; best = idx; }
      });
      p.seg = best; p.t = 0;
      p.cellI = p.crossCell[0]; p.cellJ = p.crossCell[1];
      p.state = 'walk';
      p.crossT = 0;
      this._crossingCount = Math.max(0, (this._crossingCount || 1) - 1);
      this._place(p);
      return;
    }
    p.g.position.set(p.crossFrom.x + dx * p.crossT, 0, p.crossFrom.z + dz * p.crossT);
    p.g.userData.animate(dt, 0.9);
  }

  clearAll() {
    for (const p of this.peds) this.scene.remove(p.g);
    this.peds = [];
  }
}
