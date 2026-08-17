// ════════════════════════════════════════════════════════
// TRAFFIC — AI vehicles on the road graph.
// District + time-of-day density, lane following, signal
// compliance, pedestrian crosswalks, car following, lane
// changes, honking, stalled-car events, emergency vehicles,
// police patrols. Mesh pooling for spawn/despawn.
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import { TRAFFIC_CONF, WORLD, LANES, COLORS } from './config.js';
import { buildVehicleMesh } from './vehicles.js';
import { clamp, rand, choice } from './utils.js';

export class Traffic {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.cars = [];
    this.quality = 1;
    this.night = false;
    this.wet = 0;
    this.onHonk = null;
    this._pool = new Map();   // style → [handles]
    this._edgeMap = new Map();
    for (const e of city.edges) {
      this._edgeMap.set(`${e.a}_${e.b}`, e);
      this._edgeMap.set(`${e.b}_${e.a}`, e);
    }
  }

  edgeBetween(a, b) { return this._edgeMap.get(`${a}_${b}`); }

  /** Traffic-density factor of an edge from its adjacent districts. */
  _edgeDensity(e) {
    if (e.highway) return 0.85;
    const d = (i, j) => {
      i = clamp(i, 0, WORLD.NX - 1); j = clamp(j, 0, WORLD.NZ - 1);
      return this.city.districtInfo(i, j).traffic;
    };
    let a, b;
    if (e.axis === 'z') { a = d(e.i - 1, e.j); b = d(e.i, e.j); }
    else { a = d(e.i, e.j - 1); b = d(e.i, e.j); }
    const v = (a + b) / 2;
    return v > 0.01 ? v : 1; // bridges over "river" cells default busy
  }

  _edgeSpeed(e) {
    if (e.bridge) return 15;
    if (e.highway) return TRAFFIC_CONF.highwaySpeed;
    if (e.width >= WORLD.BANK_W) return TRAFFIC_CONF.bankSpeed;
    if (e.width >= 18) return TRAFFIC_CONF.avenueSpeed;
    return TRAFFIC_CONF.citySpeed;
  }

  /** Local density multiplier around a world position. */
  _localDensity(playerPos) {
    const i = clamp(Math.floor((playerPos.x + WORLD.halfX) / WORLD.BLOCK), 0, WORLD.NX - 1);
    const j = clamp(Math.floor((playerPos.z + WORLD.halfZ) / WORLD.BLOCK), 0, WORLD.NZ - 1);
    let sum = 0, n = 0;
    for (let a = i - 1; a <= i + 1; a++) {
      for (let b = j - 1; b <= j + 1; b++) {
        if (a < 0 || a >= WORLD.NX || b < 0 || b >= WORLD.NZ) continue;
        const d = this.city.districtInfo(a, b).traffic;
        if (d > 0.01) { sum += d; n++; }
      }
    }
    return n ? sum / n : 1;
  }

  get targetCount() {
    const local = clamp(this._lastDensity || 1, 0.5, 1.8);
    return Math.round(TRAFFIC_CONF.maxCars * this.quality * (this.night ? 0.5 : 1) * local);
  }

  _takeMesh(style, color, opts) {
    const pool = this._pool.get(style);
    if (pool && pool.length) {
      const h = pool.pop();
      h.paint.color.setHex(color);
      h.group.visible = true;
      return h;
    }
    return buildVehicleMesh(style, color, { detail: 'low', ...opts });
  }

  _giveMesh(c) {
    c.h.group.visible = false;
    let pool = this._pool.get(c.style);
    if (!pool) { pool = []; this._pool.set(c.style, pool); }
    if (pool.length < 8) pool.push(c.h);
    else {
      this.scene.remove(c.h.group);
      c.h.group.traverse((o) => o.geometry?.dispose?.());
    }
  }

  _spawn(playerPos) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const e = choice(this.city.edges);
      if (e.tunnel && Math.random() < 0.5) continue;
      // bias spawns toward busy edges near the player
      const density = this._edgeDensity(e);
      if (Math.random() > density) continue;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const s = rand(4, e.w - 4);
      const from = dir === 1 ? this.city.nodes[e.a] : this.city.nodes[e.b];
      const d = Math.hypot(from.x - playerPos.x, from.z - playerPos.z);
      if (d < TRAFFIC_CONF.spawnMin || d > TRAFFIC_CONF.spawnMax) continue;
      const tw = TRAFFIC_CONF.types;
      const total = tw.reduce((s2, t) => s2 + t.w, 0);
      let roll = Math.random() * total;
      let type = tw[0];
      for (const t of tw) { roll -= t.w; if (roll <= 0) { type = t; break; } }
      const color = type.style === 'taxi' ? 0xf7c531
        : type.style === 'bus' ? 0x3e6b8f
        : type.style === 'truck' ? 0xa85533
        : type.style === 'police' ? 0x1d2a44
        : type.style === 'ambulance' ? 0xe8edf4
        : type.style === 'fire' ? 0xc03028
        : choice(TRAFFIC_CONF.colors);
      const h = this._takeMesh(type.style, color, type.police ? { police: true } : {});
      this.scene.add(h.group);
      const lanes = LANES.lanesFor(e.width);
      // driver personality: normal / aggressive / slow
      const pRoll = Math.random();
      const personality = pRoll < 0.15 ? 'aggressive' : pRoll < 0.3 ? 'slow' : 'normal';
      const c = {
        h, edge: e, dir, s,
        lane: Math.random() < 0.6 ? 0 : Math.min(lanes.length - 1, 1),
        laneCur: 0, laneTarget: 0,
        speed: 0,
        style: type.style,
        personality,
        isPatrol: !!type.police,
        emergency: type.style === 'ambulance' || type.style === 'fire' || type.style === 'police',
        honkT: 0, blockedT: 0, braking: false,
        stalled: 0,
      };
      c.laneTarget = this._targetLaneOffset(c);
      c.laneCur = c.laneTarget;
      const p = this._carPos(c);
      h.group.position.set(p.x, 0, p.z);
      h.group.rotation.y = Math.atan2(p.hx, p.hz);
      this.cars.push(c);
      return c;
    }
    return null;
  }

  _carPos(c) {
    const e = c.edge;
    const a = this.city.nodes[e.a], b = this.city.nodes[e.b];
    const from = c.dir === 1 ? a : b;
    const to = c.dir === 1 ? b : a;
    const len = e.w;
    const t = clamp(c.s, 0, len) / len;
    const hx = (to.x - from.x) / len, hz = (to.z - from.z) / len;
    const rx = hz, rz = -hx;
    const off = c.laneCur;
    return {
      x: from.x + (to.x - from.x) * t + rx * off,
      z: from.z + (to.z - from.z) * t + rz * off,
      hx, hz,
    };
  }

  _targetLaneOffset(c) {
    return LANES.lanesFor(c.edge.width)[Math.min(c.lane, LANES.lanesFor(c.edge.width).length - 1)];
  }

  _signalStop(c) {
    const e = c.edge;
    const remaining = e.w - c.s;
    if (remaining > TRAFFIC_CONF.lightStop + 2) return null;
    const toNode = this.city.nodes[c.dir === 1 ? e.b : e.a];
    if (e.bridge) return null;
    // emergency vehicles push through slowly
    const state = this.city.signalAt(toNode, e.axis);
    if (state === 'g') return null;
    return Math.max(0, remaining - TRAFFIC_CONF.lightStop * 0.55);
  }

  _carAhead(c) {
    let best = null, bestDist = Infinity;
    for (const o of this.cars) {
      if (o === c) continue;
      if (o.edge !== c.edge || o.dir !== c.dir) continue;
      const ds = (o.s - c.s) * c.dir;
      if (ds > 0 && ds < bestDist) { bestDist = ds; best = o; }
    }
    return best ? { car: best, dist: bestDist } : null;
  }

  _playerAhead(c, playerPos) {
    const p = this._carPos(c);
    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const ahead = dx * p.hx + dz * p.hz;
    const lat = Math.abs(dx * p.hz - dz * p.hx);
    if (ahead > 0 && ahead < 16 && lat < 2.6) return ahead;
    return null;
  }

  _pedAhead(c, peds) {
    if (!peds) return null;
    const p = this._carPos(c);
    let best = Infinity;
    for (const ped of peds.peds) {
      if (!ped.g.visible || ped.state === 'hit') continue;
      const dx = ped.g.position.x - p.x, dz = ped.g.position.z - p.z;
      const ahead = dx * p.hx + dz * p.hz;
      const lat = Math.abs(dx * p.hz - dz * p.hx);
      if (ahead > 0 && ahead < TRAFFIC_CONF.crosswalkStop && lat < 2.8 && ahead < best) best = ahead;
    }
    return best === Infinity ? null : best;
  }

  _pickNextEdge(c) {
    const e = c.edge;
    const curNode = this.city.nodes[c.dir === 1 ? e.b : e.a];
    const backNodeId = c.dir === 1 ? e.a : e.b;
    const options = curNode.nb.filter((n) => n.id !== backNodeId);
    const pool = options.length ? options : curNode.nb;
    const straight = pool.filter((n) => {
      const ne = this.edgeBetween(curNode.id, n.id);
      return ne && ne.axis === e.axis;
    });
    const pickFrom = (straight.length && Math.random() < 0.65) ? straight : pool;
    const pick = choice(pickFrom);
    return { edge: this.edgeBetween(curNode.id, pick.id), toNode: pick.id };
  }

  update(dt, playerPos, playerSpeed, night, wetness, peds = null) {
    this.night = night; this.wet = wetness;
    this._lastDensity = this._localDensity(playerPos);

    // despawn far cars (into the pool)
    for (let k = this.cars.length - 1; k >= 0; k--) {
      const c = this.cars[k];
      const p = this._carPos(c);
      if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) > TRAFFIC_CONF.despawn) {
        this._giveMesh(c);
        this.cars.splice(k, 1);
      }
    }
    while (this.cars.length < this.targetCount) {
      if (!this._spawn(playerPos)) break;
    }

    const weatherMul = 1 - wetness * 0.2;
    const flash = Math.floor(performance.now() / 260) % 2 === 0;

    for (const c of this.cars) {
      const p = this._carPos(c);
      let target = this._edgeSpeed(c.edge) * weatherMul;
      let gap = TRAFFIC_CONF.gap;
      let braking = false;
      // personality: aggressive drivers speed and tailgate, slow ones cruise
      if (c.personality === 'aggressive') { target *= 1.25; gap *= 0.65; }
      else if (c.personality === 'slow') { target *= 0.72; gap *= 1.35; }
      if (c.emergency) target *= 1.15;

      // stalled-car random events
      if (c.stalled > 0) {
        c.stalled -= dt;
        target = 0;
        braking = true;
      } else if (Math.random() < TRAFFIC_CONF.stalledEventChance * dt * 60) {
        c.stalled = rand(5, 10);
      }

      // red light ahead
      if (c.stalled <= 0) {
        const stopIn = this._signalStop(c);
        if (stopIn !== null) {
          if (stopIn < 0.4) target = 0;
          else target = Math.min(target, stopIn * 1.6);
          braking = stopIn < 4;
        }
      }

      // pedestrians on the crosswalk ahead
      if (c.stalled <= 0) {
        const pedIn = this._pedAhead(c, peds);
        if (pedIn !== null) {
          target = Math.min(target, Math.max(0, (pedIn - 3) * 1.5));
          braking = pedIn < 5;
        }
      }

      // car ahead
      const ahead = this._carAhead(c);
      if (ahead && ahead.dist < gap + 6) {
        const desired = Math.min(target, Math.max(0, (ahead.dist - gap) * 1.8));
        target = Math.min(target, desired);
        if (target < c.speed - 1) braking = true;
        if (ahead.dist < gap + 3 && ahead.car.speed < 4 && c.speed < 4) {
          c.blockedT += dt;
          if (c.blockedT > 1.2 && c.laneChangeT === undefined && c.edge.w - c.s > 10) {
            const lanes = LANES.lanesFor(c.edge.width);
            if (lanes.length > 1) {
              const newLane = c.lane === 0 ? 1 : 0;
              let clear = true;
              for (const o of this.cars) {
                if (o === c || o.edge !== c.edge || o.dir !== c.dir || o.lane !== newLane) continue;
                if (Math.abs(o.s - c.s) < 9) { clear = false; break; }
              }
              if (clear) { c.lane = newLane; c.laneChangeT = 0; }
              else c.blockedT = 0;
            } else {
              c.blockedT = 0;
            }
          }
        } else {
          c.blockedT = Math.max(0, c.blockedT - dt);
        }
      } else {
        c.blockedT = Math.max(0, c.blockedT - dt);
      }

      // player ahead
      const pAhead = this._playerAhead(c, playerPos);
      if (pAhead !== null) {
        const desired = Math.max(0, (pAhead - gap * 0.8) * 1.7);
        if (desired < target) { target = desired; braking = pAhead < 5; }
        if (pAhead < 5) {
          c.honkT -= dt;
          if (c.honkT <= 0) {
            c.honkT = rand(4, 8);
            if (this.onHonk) this.onHonk(Math.hypot(p.x - playerPos.x, p.z - playerPos.z));
          }
        }
      }

      // accelerate/brake toward target
      if (c.speed < target) c.speed = Math.min(target, c.speed + TRAFFIC_CONF.accel * dt);
      else c.speed = Math.max(target, c.speed - TRAFFIC_CONF.accel * 1.6 * dt);

      // advance
      c.s += c.speed * dt;

      // reached node → next edge
      if (c.s >= c.edge.w) {
        const next = this._pickNextEdge(c);
        if (!next.edge) continue;
        const dirNext = next.edge.a === (c.dir === 1 ? c.edge.b : c.edge.a) ? 1 : -1;
        c.edge = next.edge;
        c.dir = dirNext;
        c.s = 0.01;
        c.laneChangeT = undefined;
        c.laneCur = this._targetLaneOffset(c);
        c.laneTarget = c.laneCur;
      }

      // lane change animation
      c.laneTarget = this._targetLaneOffset(c);
      if (c.laneChangeT !== undefined) {
        c.laneChangeT += dt;
        c.laneCur += (c.laneTarget - c.laneCur) * Math.min(1, dt * 2.2);
        if (Math.abs(c.laneCur - c.laneTarget) < 0.05) {
          c.laneCur = c.laneTarget;
          c.laneChangeT = undefined;
        }
      }

      // place mesh
      const np = this._carPos(c);
      c.h.group.position.set(np.x, 0, np.z);
      c.h.group.rotation.y = Math.atan2(np.hx, np.hz);
      const spin = c.speed * dt * 2.4;
      for (const w of c.h.wheels) w.children[0].rotation.x += spin;
      for (const b of c.h.brakeLights) b.material.color.setHex(braking ? COLORS.brakeLight : 0x551111);
      // emergency lightbars flash
      if (c.emergency && c.h.lightbar) {
        c.h.lightbar.userData.red.material.color.setHex(flash ? 0xff3030 : 0x550000);
        c.h.lightbar.userData.blue.material.color.setHex(!flash ? 0xffaa20 : 0x552200);
      }
      // stalled cars blink hazards
      if (c.stalled > 0 && c.h.indicators.length) {
        const blink = Math.floor(performance.now() / 400) % 2 === 0;
        for (const ind of c.h.indicators) ind.material.color.setHex(blink ? COLORS.indicator : 0x7a5200);
      }
      const hl = night || wetness > 0.4;
      for (const h2 of c.h.headlights) h2.material.color.setHex(hl ? COLORS.headlight : 0x6b6b58);
      c.braking = braking;
    }
  }

  /** Patrol car positions for the police violation system. */
  patrolPositions(playerPos, maxDist = 45) {
    const out = [];
    for (const c of this.cars) {
      if (!c.isPatrol) continue;
      const p = this._carPos(c);
      if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) < maxDist) out.push(p);
    }
    return out;
  }

  /** Collision check vs player circle. Returns {x,z,car} or null. */
  checkCollision(px, pz, r = 1.5) {
    for (const c of this.cars) {
      const p = this._carPos(c);
      const rr = r + 1.7;
      const dx = p.x - px, dz = p.z - pz;
      if (dx * dx + dz * dz < rr * rr) return { x: p.x, z: p.z, car: c };
    }
    return null;
  }

  clearAll() {
    for (const c of this.cars) this._giveMesh(c);
    this.cars = [];
  }
}
