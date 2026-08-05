// ════════════════════════════════════════════
// TRAFFIC — lightweight AI vehicles
// Lane-following on the road grid, stop at red lights,
// despawn far from player. Simplified collision check.
// ════════════════════════════════════════════
import * as THREE from 'three';
import { TRAFFIC, WORLD, COLORS } from './config.js';
import { buildCarMesh } from './car.js';

export class Traffic {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cars = []; // { mesh, wheels, axis, dir, speed, x, z, color }
  }

  _spawnCar(playerPos) {
    // pick a road line (vertical 'v' or horizontal 'h')
    const { blockSize, blocksX, blocksZ, roadWidth } = WORLD;
    const halfX = (blockSize * blocksX) / 2;
    const halfZ = (blockSize * blocksZ) / 2;
    const laneOffset = roadWidth / 4; // drive on one side

    const axis = Math.random() < 0.5 ? 'v' : 'h';
    let x, z, dir;
    if (axis === 'v') {
      const lineIdx = Math.floor(Math.random() * (blocksX + 1));
      x = lineIdx * blockSize - halfX;
      const side = Math.random() < 0.5 ? 1 : -1;
      x += side * laneOffset;
      dir = side > 0 ? 1 : -1; // +z or -z
      z = playerPos.z + (Math.random() < 0.5 ? 1 : -1) * (TRAFFIC.spawnDistance * (0.5 + Math.random() * 0.5));
    } else {
      const lineIdx = Math.floor(Math.random() * (blocksZ + 1));
      z = lineIdx * blockSize - halfZ;
      const side = Math.random() < 0.5 ? 1 : -1;
      z += side * laneOffset;
      dir = side > 0 ? 1 : -1; // +x or -x
      x = playerPos.x + (Math.random() < 0.5 ? 1 : -1) * (TRAFFIC.spawnDistance * (0.5 + Math.random() * 0.5));
    }

    const color = TRAFFIC.colors[Math.floor(Math.random() * TRAFFIC.colors.length)];
    const built = buildCarMesh(color);
    // scale down slightly for variety
    built.group.scale.setScalar(0.92);
    this.scene.add(built.group);

    const car = {
      mesh: built.group,
      wheels: built.wheels,
      axis, dir, speed: 0,
      x, z, color,
      heading: 0,
    };
    this._place(car);
    this.cars.push(car);
  }

  _place(car) {
    if (car.axis === 'v') {
      car.heading = car.dir > 0 ? 0 : Math.PI; // facing +z or -z
    } else {
      car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }

  /** distance² helper */
  _dist2(ax, az, bx, bz) {
    const dx = ax - bx, dz = az - bz;
    return dx * dx + dz * dz;
  }

  /** Check if the car must stop (red light ahead within stopDistance) */
  _mustStopAtLight(car) {
    const { blockSize, blocksX, blocksZ } = WORLD;
    const halfX = (blockSize * blocksX) / 2;
    const halfZ = (blockSize * blocksZ) / 2;
    // nearest intersection ahead along travel direction
    let nearest = null, bestD = TRAFFIC.stopDistance;
    for (const it of this.world.intersections) {
      let ahead = false;
      let d = Infinity;
      if (car.axis === 'v') {
        const dz = (it.z - car.z) * car.dir;
        if (dz > 0 && dz < bestD && Math.abs(it.x - car.x) < 3) { ahead = true; d = dz; }
      } else {
        const dx = (it.x - car.x) * car.dir;
        if (dx > 0 && dx < bestD && Math.abs(it.z - car.z) < 3) { ahead = true; d = dx; }
      }
      if (ahead && d < bestD) { bestD = d; nearest = it; }
    }
    if (!nearest) return false;
    const state = nearest.lights.state;
    // ns-green means vertical road is green
    const greenForMe = car.axis === 'v' ? state === 'ns-green' : state === 'ew-green';
    return !greenForMe;
  }

  update(dt, playerPos, playerCar) {
    // spawn / despawn
    for (let k = this.cars.length - 1; k >= 0; k--) {
      const c = this.cars[k];
      const d2 = this._dist2(c.x, c.z, playerPos.x, playerPos.z);
      if (d2 > TRAFFIC.despawnDistance * TRAFFIC.despawnDistance) {
        this.scene.remove(c.mesh);
        this.cars.splice(k, 1);
      }
    }
    while (this.cars.length < TRAFFIC.maxCars) {
      this._spawnCar(playerPos);
    }

    for (const c of this.cars) {
      // avoid the player car
      const pd2 = this._dist2(c.x, c.z, playerPos.x, playerPos.z);
      const playerBlocking = pd2 < TRAFFIC.stopDistance * TRAFFIC.stopDistance;

      // stop for red light / player ahead
      const stop = this._mustStopAtLight(c) || playerBlocking;
      if (stop) {
        c.speed = Math.max(0, c.speed - TRAFFIC.accel * 1.4 * dt);
      } else {
        c.speed = Math.min(TRAFFIC.maxSpeed, c.speed + TRAFFIC.accel * dt);
      }
      const move = c.speed * dt;
      if (c.axis === 'v') c.z += c.dir * move;
      else c.x += c.dir * move;

      // keep within world bounds; if out, wrap
      const lim = WORLD.size / 2 + 10;
      if (Math.abs(c.x) > lim || Math.abs(c.z) > lim) {
        // respawn near player
        this.scene.remove(c.mesh);
        // mark for removal; will respawn next frame via while loop
        c._dead = true;
      }

      c.mesh.position.set(c.x, 0, c.z);
      for (const w of c.wheels) w.rotation.x += move * 0.6;
    }
    // cleanup dead
    for (let k = this.cars.length - 1; k >= 0; k--) {
      if (this.cars[k]._dead) this.cars.splice(k, 1);
    }
  }

  /** Check collision between player (at px,pz with radius pr) and traffic.
   *  Returns the collided car or null. */
  checkCollision(px, pz, pr = 1.4) {
    for (const c of this.cars) {
      const dx = c.x - px, dz = c.z - pz;
      const rr = (pr + 1.6);
      if (dx * dx + dz * dz < rr * rr) return c;
    }
    return null;
  }

  clear() {
    for (const c of this.cars) this.scene.remove(c.mesh);
    this.cars = [];
  }
}
