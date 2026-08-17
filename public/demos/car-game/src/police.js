// ════════════════════════════════════════════════════════
// POLICE — heat/wanted stars, patrol violations (red
// lights + speeding), coordinated pursuit with spread
// targets, flashing lightbars + sirens, busted & escape,
// roadblocks at 3+ stars.
// ════════════════════════════════════════════════════════
import { POLICE_CONF, COLORS } from './config.js';
import { buildVehicleMesh } from './vehicles.js';
import { clamp, normAngle, rand } from './utils.js';

export class Police {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.heat = 0;
    this.stars = 0;
    this.pursuers = [];
    this.roadblocks = [];
    this.escapeT = 0;
    this.bustedT = 0;
    this.onBusted = null;
    this.flashT = 0;
    // violation trackers
    this._speedTick = 0;
    this._redCooldown = 0;
    this._lastNode = null;
    this._roadblockCd = 0;
  }

  addHeat(n) {
    this.heat = Math.min(700, this.heat + n);
    this._updateStars();
  }

  setStars(n) {
    const th = POLICE_CONF.thresholds;
    this.heat = n <= 0 ? 0 : th[Math.min(n, 5)];
    this._updateStars();
  }

  _updateStars() {
    const th = POLICE_CONF.thresholds;
    let s = 0;
    for (let k = 1; k < th.length; k++) if (this.heat >= th[k]) s = k;
    if (s > this.stars) this.escapeT = 0;
    this.stars = s;
    if (s === 0) this._retreatAll();
  }

  _retreatAll() {
    for (const p of this.pursuers) p.retreat = 4;
  }

  _spawnPursuer(playerPos) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const node = this.city.nodes[Math.floor(rand(0, this.city.nodes.length))];
      const d = Math.hypot(node.x - playerPos.x, node.z - playerPos.z);
      if (d < 60 || d > 115) continue;
      const h = buildVehicleMesh('police', 0x1d2a44, { police: true });
      this.scene.add(h.group);
      this.pursuers.push({
        h,
        x: node.x, z: node.z,
        heading: rand(-Math.PI, Math.PI),
        speed: 8,
        retreat: 0,
      });
      return true;
    }
    return false;
  }

  // ───────── roadblocks ─────────
  _tryRoadblock(playerPos, playerVel) {
    const speed = Math.hypot(playerVel.x, playerVel.y);
    if (speed < 8) return;
    const dx = playerVel.x / speed, dz = playerVel.y / speed;
    // find a node ~100-140u ahead along travel direction
    let best = null, bestScore = Infinity;
    for (const n of this.city.nodes) {
      const rx = n.x - playerPos.x, rz = n.z - playerPos.z;
      const dist = Math.hypot(rx, rz);
      if (dist < 90 || dist > 150) continue;
      const along = rx * dx + rz * dz;
      if (along < dist * 0.8) continue; // mostly ahead
      const lat = Math.abs(rx * dz - rz * dx);
      if (lat > 14) continue;
      if (dist < bestScore) { bestScore = dist; best = n; }
    }
    if (!best) return;
    const rb = { x: best.x, z: best.z, ttl: POLICE_CONF.roadblock.lifetime, meshes: [], colliders: [], angle: Math.atan2(dx, dz) };
    const perpX = Math.cos(rb.angle), perpZ = -Math.sin(rb.angle);
    for (const laneOff of [-2.2, 2.2]) {
      const h = buildVehicleMesh('police', 0x1d2a44, { police: true });
      h.group.position.set(rb.x + perpX * laneOff, 0, rb.z + perpZ * laneOff);
      h.group.rotation.y = rb.angle + 0.5;
      this.scene.add(h.group);
      rb.meshes.push(h.group);
      const col = { x: rb.x + perpX * laneOff, z: rb.z + perpZ * laneOff, hw: 1.2, hz: 2.4 };
      rb.colliders.push(col);
      this.city.addCollider(col);
    }
    // barrier with lights
    const barrier = buildVehicleMesh('fire', 0xc03028);
    barrier.group.position.set(rb.x - dx * 6, 0, rb.z - dz * 6);
    barrier.group.rotation.y = rb.angle;
    barrier.group.scale.set(0.5, 0.7, 0.9);
    this.scene.add(barrier.group);
    rb.meshes.push(barrier.group);
    this.roadblocks.push(rb);
  }

  _updateRoadblocks(dt, playerPos) {
    for (let k = this.roadblocks.length - 1; k >= 0; k--) {
      const rb = this.roadblocks[k];
      rb.ttl -= dt;
      const dist = Math.hypot(rb.x - playerPos.x, rb.z - playerPos.z);
      if (rb.ttl <= 0 || dist > 170) {
        for (const m of rb.meshes) {
          this.scene.remove(m);
          m.traverse((o) => o.geometry?.dispose?.());
        }
        for (const c of rb.colliders) this.city.removeCollider(c);
        this.roadblocks.splice(k, 1);
      }
    }
  }

  _probeBlocked(x, z, heading, dist) {
    const px = x + Math.sin(heading) * dist;
    const pz = z + Math.cos(heading) * dist;
    for (const c of this.city.collideNear(px, pz)) {
      if (Math.abs(px - c.x) < c.hw + 1.4 && Math.abs(pz - c.z) < c.hz + 1.4) return true;
    }
    return false;
  }

  update(dt, playerPos, playerVel, playerSpeed, patrols = []) {
    this.flashT += dt;
    const want = this.stars > 0 ? POLICE_CONF.maxPursuers(this.stars) : 0;
    let active = this.pursuers.filter((p) => !p.retreat).length;
    while (active < want) {
      if (!this._spawnPursuer(playerPos)) break;
      active++;
    }

    // ── patrol violations (only while not already wanted) ──
    if (this.stars === 0 && patrols.length) {
      // speeding
      this._speedTick -= dt;
      if (playerSpeed * 3.6 > POLICE_CONF.speedLimitKmh && this._speedTick <= 0) {
        this._speedTick = 2.5;
        this.addHeat(POLICE_CONF.heat.speeding);
      }
      // running a red: track the nearest node the player passes through
      this._redCooldown -= dt;
      const node = this.city.nearestNode(playerPos.x, playerPos.z);
      if (this._lastNode && node !== this._lastNode && this._redCooldown <= 0) {
        const d = Math.hypot(playerPos.x - node.x, playerPos.z - node.z);
        if (d < 12 && playerSpeed > 9) {
          const moveAxis = Math.abs(playerVel.x) > Math.abs(playerVel.y) ? 'x' : 'z';
          const state = this.city.signalAt(node, moveAxis);
          if (state === 'r' || state === 'y') {
            this._redCooldown = 4;
            this.addHeat(POLICE_CONF.heat.runRed);
          }
        }
      }
      this._lastNode = node;
    }

    // ── roadblocks ──
    this._roadblockCd -= dt;
    if (this.stars >= POLICE_CONF.roadblock.minStars && this._roadblockCd <= 0) {
      this._roadblockCd = POLICE_CONF.roadblock.cooldown;
      this._tryRoadblock(playerPos, playerVel);
    }
    this._updateRoadblocks(dt, playerPos);

    const pursuitSpeed = POLICE_CONF.pursuitSpeed(this.stars);
    let nearest = Infinity;

    for (let k = this.pursuers.length - 1; k >= 0; k--) {
      const p = this.pursuers[k];
      const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);

      if (p.retreat) {
        p.retreat -= dt;
        p.speed = Math.min(24, p.speed + 8 * dt);
        if (p.retreat <= 0 || dist > 130) {
          this.scene.remove(p.h.group);
          p.h.group.traverse((o) => o.geometry?.dispose?.());
          this.pursuers.splice(k, 1);
          continue;
        }
      } else if (this.stars === 0) {
        p.retreat = 3;
      }

      // coordinated pursuit: spread targets around the player
      const spread = (k % 3 - 1) * 0.5;
      const lead = clamp(dist / 40, 0.2, 1) * 0.6;
      const velAng = Math.atan2(playerVel.x, playerVel.y) + spread;
      const tx = p.retreat ? p.x * 2 - playerPos.x : playerPos.x + Math.sin(velAng) * playerSpeed * lead;
      const tz = p.retreat ? p.z * 2 - playerPos.z : playerPos.z + Math.cos(velAng) * playerSpeed * lead;
      let desired = Math.atan2(tx - p.x, tz - p.z);

      // obstacle avoidance probes
      const probeDist = 6 + p.speed * 0.35;
      if (this._probeBlocked(p.x, p.z, p.heading, probeDist)) {
        const leftOK = !this._probeBlocked(p.x, p.z, p.heading - 0.7, probeDist * 0.85);
        const rightOK = !this._probeBlocked(p.x, p.z, p.heading + 0.7, probeDist * 0.85);
        if (leftOK && !rightOK) desired = p.heading - 0.9;
        else if (rightOK && !leftOK) desired = p.heading + 0.9;
        else if (leftOK && rightOK) desired = p.heading + (Math.sin(k * 2.1 + this.flashT) > 0 ? 0.9 : -0.9);
        else desired = p.heading + Math.PI * 0.6; // dead end — U-turn
      }

      const err = normAngle(desired - p.heading);
      const turnRate = 1.9 * clamp(p.speed / 8, 0.3, 1);
      p.heading += clamp(err, -turnRate * dt, turnRate * dt);

      let target = pursuitSpeed;
      if (dist > 65 && !p.retreat) target *= 1.35;             // rubber band catch-up
      if (dist < 7) target = Math.min(target, playerSpeed + 3); // don't orbit
      if (p.retreat) target = 22;
      p.speed += clamp(target - p.speed, -18 * dt, 10 * dt);

      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      for (const c of this.city.collideNear(p.x, p.z)) {
        const ox = p.x - c.x, oz = p.z - c.z;
        if (Math.abs(ox) < c.hw + 1.2 && Math.abs(oz) < c.hz + 1.2) {
          const px = c.hw + 1.2 - Math.abs(ox);
          const pz2 = c.hz + 1.2 - Math.abs(oz);
          if (px < pz2) p.x += Math.sign(ox || 1) * px;
          else p.z += Math.sign(oz || 1) * pz2;
          p.speed *= 0.6;
        }
      }

      p.h.group.position.set(p.x, 0, p.z);
      p.h.group.rotation.y = p.heading;
      const spin = p.speed * dt * 2.4;
      for (const w of p.h.wheels) w.children[0].rotation.x += spin;
      const bar = p.h.lightbar;
      if (bar) {
        const phase = Math.floor(this.flashT * 6) % 2 === 0;
        bar.userData.red.material.color.setHex(phase && !p.retreat ? 0xff3030 : 0x550000);
        bar.userData.blue.material.color.setHex(!phase && !p.retreat ? 0x3050ff : 0x000055);
      }
      for (const hl of p.h.headlights) hl.material.color.setHex(COLORS.headlight);
    }

    // ── busted check (pursuers + active roadblocks) ──
    let bustedNear = this.pursuers.some((p) => !p.retreat && Math.hypot(p.x - playerPos.x, p.z - playerPos.z) < POLICE_CONF.bustedRadius);
    if (!bustedNear) {
      bustedNear = this.roadblocks.some((rb) => Math.hypot(rb.x - playerPos.x, rb.z - playerPos.z) < POLICE_CONF.bustedRadius + 2);
    }
    if (this.stars > 0 && bustedNear && playerSpeed < POLICE_CONF.bustedSpeed) {
      this.bustedT += dt;
      if (this.bustedT >= POLICE_CONF.bustedTime && this.onBusted) {
        const cb = this.onBusted;
        this.onBusted = null;
        cb();
        this.onBusted = cb;
        this.bustedT = 0;
      }
    } else {
      this.bustedT = Math.max(0, this.bustedT - dt * 2);
    }

    // ── escape check ──
    if (this.stars > 0 && !this.pursuers.some((p) => !p.retreat)) {
      this.escapeT += dt * 3;
    } else if (this.stars > 0 && nearest > POLICE_CONF.escapeRadius) {
      this.escapeT += dt;
    } else {
      this.escapeT = Math.max(0, this.escapeT - dt * 0.6);
    }
    if (this.stars > 0 && this.escapeT >= POLICE_CONF.escapeTime) {
      this.escapeT = 0;
      this.setStars(this.stars - 1);
      if (this.stars === 0) this.heat = 0;
    }

    this.nearestDist = nearest;
  }

  /** Collision vs player circle. Returns {x,z,p} or null. */
  checkCollision(px, pz, r = 1.5) {
    for (const p of this.pursuers) {
      const rr = r + 1.7;
      const dx = p.x - px, dz = p.z - pz;
      if (dx * dx + dz * dz < rr * rr) return { x: p.x, z: p.z, p };
    }
    return null;
  }

  clearAll() {
    for (const p of this.pursuers) {
      this.scene.remove(p.h.group);
      p.h.group.traverse((o) => o.geometry?.dispose?.());
    }
    this.pursuers = [];
    for (const rb of this.roadblocks) {
      for (const m of rb.meshes) {
        this.scene.remove(m);
        m.traverse((o) => o.geometry?.dispose?.());
      }
      for (const c of rb.colliders) this.city.removeCollider(c);
    }
    this.roadblocks = [];
    this.heat = 0;
    this.stars = 0;
    this.escapeT = 0;
    this.bustedT = 0;
  }
}
