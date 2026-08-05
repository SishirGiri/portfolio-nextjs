// ════════════════════════════════════════════
// MISSIONS — manages active mission, destination
// markers, parking detection, timer, star rating.
// ════════════════════════════════════════════
import * as THREE from 'three';
import { MISSIONS, WORLD, COLORS, REWARDS } from './config.js';

export class MissionManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.active = null;          // mission definition
    this.destMarker = null;      // destination cylinder mesh
    this.timeLeft = 0;
    this.startTime = 0;
    this.violations = 0;
    this.collisions = 0;
    this.parkingProgress = 0;    // 0..1 for parking missions
    this.completed = false;
  }

  /** Pick a destination point on a road some distance from origin. */
  _pickDestination() {
    const { blockSize, blocksX, blocksZ } = WORLD;
    const halfX = (blockSize * blocksX) / 2;
    const halfZ = (blockSize * blocksZ) / 2;
    // choose a random intersection coordinate
    const ix = Math.floor(Math.random() * (blocksX + 1));
    const iz = Math.floor(Math.random() * (blocksZ + 1));
    return {
      x: ix * blockSize - halfX,
      z: iz * blockSize - halfZ,
    };
  }

  start(missionId) {
    const def = MISSIONS.find((m) => m.id === missionId);
    if (!def) return;
    this.clearMarker();
    this.active = def;
    this.completed = false;
    this.violations = 0;
    this.collisions = 0;
    this.parkingProgress = 0;
    this.startTime = performance.now();
    this.timeLeft = def.timeLimit;

    if (def.type === 'parking') {
      // destination = first parking zone
      const zone = this.world.parkingZones[0];
      this._dest = { x: zone.x, z: zone.z };
      this._makeMarker(zone.x, zone.z, COLORS.neonGreen, 4);
    } else {
      this._dest = this._pickDestination();
      this._makeMarker(this._dest.x, this._dest.z, COLORS.neonCyan, 5);
    }
  }

  _makeMarker(x, z, color, radius) {
    const marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.2, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    marker.add(ring);
    // beam
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1.2, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 })
    );
    beam.position.y = 6;
    marker.add(beam);
    marker.position.set(x, 0, z);
    this.scene.add(marker);
    this.destMarker = marker;
  }

  clearMarker() {
    if (this.destMarker) {
      this.scene.remove(this.destMarker);
      this.destMarker.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      this.destMarker = null;
    }
  }

  /** distance from car to destination */
  distanceTo(px, pz) {
    if (!this._dest) return 0;
    return Math.hypot(px - this._dest.x, pz - this._dest.z);
  }

  update(dt, car) {
    if (!this.active || this.completed) return null;
    const px = car.pos.x, pz = car.pos.z;

    // animate marker (pulse)
    if (this.destMarker) {
      this.destMarker.rotation.y += dt * 0.6;
    }

    // timer
    if (this.active.timeLimit > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        return { failed: true, reason: 'Time ran out!' };
      }
    }

    if (this.active.type === 'parking') {
      const zone = this.world.parkingZones[0];
      const dx = px - zone.x, dz = pz - zone.z;
      const dist = Math.hypot(dx, dz);
      // require slow + centered + aligned heading
      const speedOK = Math.abs(car.speed) < 1.2;
      const posOK = dist < 2.6;
      // heading alignment (zone heading is rotation around y)
      let headDiff = Math.abs(((car.heading - zone.heading) % Math.PI));
      if (headDiff > Math.PI / 2) headDiff = Math.PI - headDiff;
      const headOK = headDiff < 0.6;
      if (posOK) this.parkingProgress = Math.min(1, this.parkingProgress + dt * 0.5);
      else this.parkingProgress = Math.max(0, this.parkingProgress - dt * 0.4);
      if (posOK && speedOK && headOK && this.parkingProgress > 0.9) {
        return { completed: true };
      }
    } else if (this.active.type === 'reach') {
      const d = this.distanceTo(px, pz);
      if (d < 5) {
        return { completed: true };
      }
    }
    return null;
  }

  /** Compute star rating + rewards on completion. */
  finalize() {
    const def = this.active;
    let stars = 1;
    const elapsed = (performance.now() - this.startTime) / 1000;
    if (this.collisions === 0) stars++;
    if (this.violations === 0) stars++;
    if (def.type === 'parking' && this.parkingProgress > 0.95) stars++;
    if (def.timeLimit > 0 && this.timeLeft > def.timeLimit * 0.25) stars++;
    stars = Math.min(3, stars);

    let money = def.reward;
    let xp = def.xp;
    if (stars === 3) money += REWARDS.perfectParkingBonus;
    if (this.collisions === 0) money += REWARDS.cleanDrivingBonus;

    this.completed = true;
    return { stars, money, xp, elapsed };
  }

  registerCollision() { this.collisions++; }
  registerViolation() { this.violations++; }

  clear() {
    this.clearMarker();
    this.active = null;
    this.completed = false;
  }

  timeLeftFormatted() {
    const t = Math.max(0, this.timeLeft);
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
