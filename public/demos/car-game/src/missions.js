// ════════════════════════════════════════════════════════
// MISSIONS — 12 mission archetypes:
// reach, school, parking2, taxi, package, cp-race, race,
// delivery, highway, escape, tour. Markers, gates, timers,
// rival racer, star scoring + rewards.
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import { MISSIONS, ECONOMY, COLORS, WORLD } from './config.js';
import { buildVehicleMesh } from './vehicles.js';
import { clamp, choice, rand, normAngle } from './utils.js';

const markerColorFor = {
  pickup: 0x10b981, dropoff: 0xf59e0b, dest: 0x00d4ff, checkpoint: 0xfbbf24,
};

export class MissionManager {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.active = null;
    this.events = [];       // {type:'toast'|'money', ...} drained by game
    this._marker = null;
    this._cones = [];
    this._rival = null;
    this.clear();
  }

  toast(msg, kind = 'info') { this.events.push({ type: 'toast', msg, kind }); }
  pay(amount, reason) { this.events.push({ type: 'money', amount, reason }); }

  // ───────── setup ─────────
  clear() {
    this._clearMarker();
    this._clearCones();
    this._clearRival();
    this.active = null;
    this.state = null;
    this.elapsed = 0;
    this.timeLeft = 0;
    this.collisions = 0;
    this.violations = 0;
    this.parkingProgress = 0;
    this._dest = null;
    this.needPoliceStars = 0;
    this.forceNight = false;
    this.forceCar = null;
  }

  start(missionId, spawnPos) {
    this.clear();
    const def = MISSIONS.find((m) => m.id === missionId);
    if (!def) return;
    this.active = def;
    this.spawnPos = spawnPos;
    this.timeLeft = def.timeLimit || 0;
    const S = {
      firstDrive: () => this._setupReach(def),
      reach: () => this._setupReach(def),
      school: () => this._setupSchool(),
      parking2: () => this._setupParking2(),
      taxi: () => this._setupTaxi(def),
      package: () => this._setupPackage(def),
      'cp-race': () => this._setupCpRace(def),
      race: () => this._setupRace(),
      vip: () => this._setupVip(def),
      delivery: () => this._setupDelivery(def),
      highway: () => this._setupHighway(),
      escape: () => { this.needPoliceStars = def.params.stars; this.toast('🚨 They are onto you — lose them!', 'warn'); },
      tour: () => this._setupTour(),
    };
    (S[def.type] || S.reach)();
    this.isRoam = !!def.roam;
  }

  _randNode(minDistFrom = null, minDist = 0) {
    for (let k = 0; k < 40; k++) {
      const n = choice(this.city.nodes);
      if (!minDistFrom) return n;
      if (Math.hypot(n.x - minDistFrom.x, n.z - minDistFrom.z) >= minDist) return n;
    }
    return choice(this.city.nodes);
  }

  _nodesWalk(startNode, count) {
    // random walk over the graph, no immediate backtracking
    const pts = [];
    let cur = startNode;
    let prev = null;
    while (pts.length < count) {
      const options = cur.nb.filter((nb) => !prev || nb.id !== prev.id);
      const pick = choice(options.length ? options : cur.nb);
      prev = cur;
      cur = this.city.nodes[pick.id];
      pts.push(cur);
    }
    return pts;
  }

  // ───────── per-type setup ─────────
  _setupReach(def) {
    const n = this._randNode(this.spawnPos, def.params?.minDist || 120);
    this._setDest(n.x, n.z, markerColorFor.dest);
    this.state = { phase: 'drive' };
  }

  _setupSchool() {
    const gates = this._nodesWalk(this.city.nearestNode(this.spawnPos.x, this.spawnPos.z), 4);
    this.state = { phase: 'gates', gates, gateIdx: 0, overs: 0 };
    this._spawnCones(gates[0]);
    this._setDest(gates[0].x, gates[0].z, markerColorFor.checkpoint);
  }

  _setupParking2() {
    const zones = this.city.parkingZones.slice(0, 2);
    this.state = { phase: 'park', zoneIdx: 0, zones };
    this._setDest(zones[0].x, zones[0].z, 0x10b981);
  }

  _setupTaxi(def) {
    this.state = { phase: 'pickup', fare: 1, faresTotal: def.params.fares };
    this._newFare();
  }

  _newFare() {
    const s = this.state;
    const n = this._randNode(this.spawnPos, 90);
    s.target = n;
    this._setDest(n.x, n.z, markerColorFor.pickup);
    this.toast(`🧍 Fare ${s.fare}/${s.faresTotal}: pick up the passenger`);
  }
  _setupPackage(def) {
    this.state = { phase: 'drop', drop: 1, dropsTotal: def.params.drops };
    this._newDrop();
  }

  _newDrop() {
    const s = this.state;
    const n = this._randNode(this.spawnPos, 70);
    s.target = n;
    this._setDest(n.x, n.z, markerColorFor.dropoff);
    this.toast(`📦 Drop ${s.drop}/${s.dropsTotal}`);
  }

  _setupCpRace(def) {
    const cps = this._nodesWalk(this.city.nearestNode(this.spawnPos.x, this.spawnPos.z), def.params.cps);
    this.state = { phase: 'race', cps, cpIdx: 0, par: def.params.par };
    this._setDest(cps[0].x, cps[0].z, markerColorFor.checkpoint);
  }

  _setupRace() {
    // midtown loop around Times Square
    const ring = [];
    const ringCells = [[2, 4], [4, 4], [7, 4], [7, 5], [7, 7], [4, 7], [2, 7], [2, 5]];
    for (const [i, j] of ringCells) ring.push(this.city.nodes[this.city.nodeId(i, j)]);
    this.state = { phase: 'race', cps: ring, cpIdx: 0 };
    this._setDest(ring[0].x, ring[0].z, markerColorFor.checkpoint);
    // rival
    const h = buildVehicleMesh('super', 0xf97316);
    h.group.position.set(ring[0].x + 2.5, 0, ring[0].z);
    this.scene.add(h.group);
    this._rival = { h, seg: 0, t: 0, speed: 23, finished: false, route: ring };
  }

  _setupVip(def) {
    this.state = { phase: 'drive', maxDamage: def.params.maxDamage };
    const n = this._randNode(this.spawnPos, 170);
    this._setDest(n.x, n.z, 0xf5b301);
    this.toast('🤵 The VIP is aboard — drive smoothly!');
  }

  _setupDelivery(def) {
    this.forceCar = def.params.car;
    this.state = { phase: 'drive', maxDamage: def.params.maxDamage };
    const n = this._randNode(this.spawnPos, 200);
    this._setDest(n.x, n.z, markerColorFor.dropoff);
    this.toast('🔑 The Vela GT is yours — treat it gently!');
  }

  _setupHighway() {
    const { NX, NZ } = WORLD;
    const ring = [
      [0, 0], [0, Math.floor(NZ / 2)], [0, NZ],
      [Math.floor(NX / 2), NZ], [NX, NZ], [NX, Math.floor(NZ / 2)],
      [NX, 0], [Math.floor(NX / 2), 0], [0, 0],
    ].map(([i, j]) => this.city.nodes[this.city.nodeId(i, j)]);
    this.state = { phase: 'race', cps: ring, cpIdx: 0, par: 95 };
    this._setDest(ring[0].x, ring[0].z, markerColorFor.checkpoint);
  }

  _setupTour() {
    if (this.active.params?.allDistricts) {
      this.state = { phase: 'tour', lmIdx: 0, lms: this._districtTour() };
      this._setDest(this.state.lms[0].x, this.state.lms[0].z, markerColorFor.dest);
      this.toast('🗺 Cross every district of the city!');
      return;
    }
    this.forceNight = true;
    const lms = this.city.landmarks.filter((l) => l.name !== 'Garage Plaza');
    this.state = { phase: 'tour', lmIdx: 0, lms };
    this._setDest(lms[0].x, lms[0].z, markerColorFor.dest);
    this.toast(`🌙 Visit ${lms.length} landmarks`);
  }

  /** One representative point per district for the marathon. */
  _districtTour() {
    const pts = [];
    const push = (i, j, name) => {
      const c = this.city.cellCenter(i, j);
      pts.push({ x: c.x, z: c.z, name });
    };
    push(4, 5, 'Times Square');
    push(3, 1, 'Central Park');
    push(4, 10, 'Financial District');
    push(1, 4, 'West Side');
    push(4, 8, 'Lower Manhattan');
    push(10, 7, 'Brooklyn Heights');
    push(14, 2, 'Brooklyn');
    push(10, 10, 'DUMBO Docks');
    return pts;
  }

  // ───────── markers / props ─────────
  _ensureMarker() {
    if (this._marker) return this._marker;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4, 0.3, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1.6, 16, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    beam.position.y = 8;
    g.add(ring, beam);
    g.userData = { ring, beam };
    this.scene.add(g);
    this._marker = g;
    return g;
  }

  _setDest(x, z, color) {
    const m = this._ensureMarker();
    m.position.set(x, 0, z);
    m.userData.ring.material.color.setHex(color);
    m.userData.beam.material.color.setHex(color);
    this._dest = { x, z };
    this.destColor = color;
  }

  _clearMarker() {
    if (this._marker) {
      this.scene.remove(this._marker);
      this._marker.traverse((o) => o.geometry?.dispose?.());
      this._marker = null;
    }
  }

  _spawnCones(node) {
    this._clearCones();
    const coneGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(node.x + side * 4.5, 0.45, node.z);
      cone.castShadow = true;
      this.scene.add(cone);
      this._cones.push(cone);
    }
  }

  _clearCones() {
    for (const c of this._cones) {
      this.scene.remove(c);
      c.geometry?.dispose?.();
    }
    this._cones = [];
  }

  _clearRival() {
    if (this._rival) {
      this.scene.remove(this._rival.h.group);
      this._rival.h.group.traverse((o) => o.geometry?.dispose?.());
      this._rival = null;
    }
  }

  // ───────── runtime ─────────
  distanceTo(px, pz) {
    if (!this._dest) return 0;
    return Math.hypot(px - this._dest.x, pz - this._dest.z);
  }

  objectiveText() {
    const a = this.active, s = this.state;
    if (!a) return '';
    switch (a.type) {
      case 'reach': return 'Drive to the destination';
      case 'school':
        if (s.phase === 'gates') return `Gate ${s.gateIdx + 1}/${s.gates.length} — keep under ${a.params.speedLimit} km/h`;
        return 'Park in the highlighted zone';
      case 'parking2': return `Park in zone ${s.zoneIdx + 1}/${s.zones.length}`;
      case 'taxi':
        return s.phase === 'pickup' ? `Pick up passenger (${s.fare}/${s.faresTotal})` : `Drop off passenger (${s.fare}/${s.faresTotal})`;
      case 'package': return `Deliver package ${s.drop}/${s.dropsTotal}`;
      case 'cp-race': return `Checkpoint ${s.cpIdx + 1}/${s.cps.length}`;
      case 'race': return `Race checkpoint ${s.cpIdx + 1}/${s.cps.length}`;
      case 'delivery': return 'Deliver the car — keep it clean!';
      case 'vip': return 'Drive the VIP — smooth and undamaged';
      case 'highway': return `Ring checkpoint ${s.cpIdx + 1}/${s.cps.length}`;
      case 'escape': return 'Lose the police!';
      case 'tour': return `Landmark ${s.lmIdx + 1}/${s.lms.length}: ${s.lms[s.lmIdx]?.name || ''}`;
      default: return '';
    }
  }

  update(dt, car, police) {
    if (!this.active) return null;
    const def = this.active;
    const s = this.state;
    this.elapsed += dt;

    // marker pulse
    if (this._marker) {
      this._marker.userData.ring.scale.setScalar(1 + Math.sin(this.elapsed * 4) * 0.08);
      this._marker.rotation.y += dt * 0.8;
    }

    // timer
    if (def.timeLimit > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) return { failed: true, reason: 'Time ran out!' };
    }

    const px = car.pos.x, pz = car.pos.z;
    const speedKmh = car.speedKmh;
    const stopped = Math.abs(car.speedF) < 1.2;

    // rival progress
    if (this._rival) this._updateRival(dt, car);

    switch (def.type) {
      case 'reach':
      case 'vip':
      case 'delivery': {
        if ((def.type === 'delivery' || def.type === 'vip') && car.health < 100 - s.maxDamage) {
          return { failed: true, reason: def.type === 'vip' ? 'The VIP bailed — too rough!' : 'You trashed the delivery car!' };
        }
        const d = this.distanceTo(px, pz);
        if (d < 6 && (def.type === 'reach' || stopped)) return { completed: true };
        break;
      }

      case 'school': {
        if (s.phase === 'gates') {
          const gate = s.gates[s.gateIdx];
          const d = Math.hypot(px - gate.x, pz - gate.z);
          if (d < 8) {
            if (speedKmh <= def.params.speedLimit + 4) {
              s.gateIdx++;
              this.toast(`✓ Gate ${s.gateIdx}/${s.gates.length} cleared`, 'good');
              if (s.gateIdx >= s.gates.length) {
                s.phase = 'park';
                const zone = this.city.parkingZones[1];
                this._setDest(zone.x, zone.z, 0x10b981);
                this.toast('🎓 Now park it!');
              } else {
                this._spawnCones(s.gates[s.gateIdx]);
                this._setDest(s.gates[s.gateIdx].x, s.gates[s.gateIdx].z, markerColorFor.checkpoint);
              }
            } else {
              s.overs++;
              this.toast(`⚠️ Too fast! ${def.params.speedLimit} km/h max (${s.overs}/2)`, 'warn');
              if (s.overs >= 2) return { failed: true, reason: 'Too many gate violations.' };
              // push player past gate to retry
              s.gates.push(gate);
            }
            // nudge out of radius so we don't retrigger
            car.pos.x = px + Math.sin(car.heading) * 9;
            car.pos.z = pz + Math.cos(car.heading) * 9;
          }
        } else {
          if (this._checkParking(dt, car, this._dest, 0)) return { completed: true };
        }
        break;
      }

      case 'parking2': {
        const zone = s.zones[s.zoneIdx];
        if (this._checkParking(dt, car, zone, s.zoneIdx)) {
          s.zoneIdx++;
          this.parkingProgress = 0;
          if (s.zoneIdx >= s.zones.length) return { completed: true };
          const nz = s.zones[s.zoneIdx];
          this._setDest(nz.x, nz.z, 0x10b981);
          this.toast(`✓ Zone ${s.zoneIdx} parked!`, 'good');
        }
        break;
      }

      case 'taxi': {
        const t = s.target;
        const d = Math.hypot(px - t.x, pz - t.z);
        if (d < 5.5 && stopped) {
          if (s.phase === 'pickup') {
            s.phase = 'dropoff';
            const drop = this._randNode(t, 110);
            s.target = drop;
            this._setDest(drop.x, drop.z, markerColorFor.dropoff);
            this.toast('🧍 Passenger aboard — step on it', 'info');
          } else {
            const fare = ECONOMY.taxiFareBase + Math.round(rand(0, 60));
            this.pay(fare, `Fare ${s.fare}`);
            s.fare++;
            if (s.fare > s.faresTotal) return { completed: true };
            s.phase = 'pickup';
            this._newFare();
          }
        }
        break;
      }

      case 'package': {
        const t = s.target;
        if (Math.hypot(px - t.x, pz - t.z) < 5.5) {
          s.drop++;
          if (s.drop > s.dropsTotal) return { completed: true };
          this.toast('📦 Delivered!', 'good');
          this._newDrop();
        }
        break;
      }

      case 'cp-race':
      case 'race':
      case 'highway': {
        const cp = s.cps[s.cpIdx];
        const d = Math.hypot(px - cp.x, pz - cp.z);
        if (d < 7) {
          s.cpIdx++;
          if (s.cpIdx >= s.cps.length) {
            if (this._rival && !this._rival.finished) return { completed: true };
            if (!this._rival) return { completed: true };
          }
          const nc = s.cps[s.cpIdx % s.cps.length];
          this._setDest(nc.x, nc.z, markerColorFor.checkpoint);
        }
        if (this._rival && this._rival.finished) {
          return { failed: true, reason: 'The rival finished first!' };
        }
        break;
      }

      case 'escape': {
        if (police && police.stars === 0) return { completed: true };
        break;
      }

      case 'tour': {
        const lm = s.lms[s.lmIdx];
        if (Math.hypot(px - lm.x, pz - lm.z) < 9) {
          s.lmIdx++;
          this.toast(`✓ ${lm.name}`, 'good');
          if (s.lmIdx >= s.lms.length) return { completed: true };
          const nl = s.lms[s.lmIdx];
          this._setDest(nl.x, nl.z, markerColorFor.dest);
        }
        break;
      }
    }

    // parking progress helper for HUD
    if (def.type === 'school' && s.phase === 'park') {
      this.parkingProgress = this._parkScore(car, this._dest);
    }
    return null;
  }

  _parkScore(car, zone) {
    if (!zone) return 0;
    const d = Math.hypot(car.pos.x - zone.x, car.pos.z - zone.z);
    const posOK = d < 3;
    const stopped = Math.abs(car.speedF) < 1.4;
    const headDiff = Math.abs(normAngle(car.heading - (zone.heading || 0)));
    const headOK = Math.min(headDiff, Math.PI - headDiff) < 0.7;
    return posOK && stopped && headOK ? 1 : posOK ? 0.5 : 0;
  }

  _checkParking(dt, car, zone, idx) {
    const score = this._parkScore(car, zone);
    if (score === 1) this.parkingProgress = Math.min(1, this.parkingProgress + dt * 0.55);
    else this.parkingProgress = Math.max(0, this.parkingProgress - dt * 0.5);
    return this.parkingProgress >= 0.92;
  }

  _updateRival(dt, playerCar) {
    const r = this._rival;
    const route = r.route;
    // rubber-banding vs player checkpoint progress
    const playerFrac = this.state.cpIdx / this.state.cps.length;
    const rivalFrac = r.seg / route.length;
    let speed = r.speed;
    if (rivalFrac - playerFrac > 0.18) speed *= 0.88;
    else if (playerFrac - rivalFrac > 0.18) speed *= 1.1;

    const a = route[r.seg];
    const b = route[(r.seg + 1) % route.length];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    r.t += (speed * dt) / segLen;
    while (r.t >= 1) {
      r.t -= 1;
      r.seg++;
      if (r.seg >= route.length) { r.seg = route.length; r.t = 0; r.finished = true; break; }
    }
    const nx = a.x + (b.x - a.x) * r.t;
    const nz = a.z + (b.z - a.z) * r.t;
    r.h.group.position.set(nx, 0, nz);
    r.h.group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    for (const w of r.h.wheels) w.children[0].rotation.x += speed * dt * 2.4;
    r.progress = rivalFrac;
  }

  registerCollision() { this.collisions++; }
  registerViolation() { this.violations++; }

  finalize(police) {
    const def = this.active;
    let stars = 3;
    if (this.collisions > 2) stars--;
    if (this.violations > 2) stars--;
    let par = def.timeLimit ? def.timeLimit * 0.75 : null;
    if (def.params?.par) par = def.params.par;
    if (par && this.elapsed > par) stars--;
    if (def.type === 'delivery') stars = this._deliveryStars(def);
    if (def.type === 'escape' && this.elapsed < def.timeLimit * 0.5) stars = 3;
    stars = clamp(stars, 1, 3);

    let money = Math.round(def.reward * (0.6 + stars * 0.2));
    let xp = Math.round(def.xp * (0.7 + stars * 0.1));
    if (this.collisions === 0) money += ECONOMY.cleanBonus;

    return {
      stars, money, xp, elapsed: this.elapsed,
      bestTimeField: ['cp-race', 'highway', 'race'].includes(def.type),
    };
  }

  _deliveryStars(def) {
    const dmg = 100 - this._lastCarHealth;
    if (dmg < 8) return 3;
    if (dmg < def.params.maxDamage * 0.5) return 2;
    return 1;
  }
}
