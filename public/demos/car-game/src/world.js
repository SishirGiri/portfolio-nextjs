// ════════════════════════════════════════════
// WORLD — procedural city builder
// Roads, buildings, sidewalks, traffic lights,
// gas station, parking zones, ground + lighting.
// ════════════════════════════════════════════
import * as THREE from 'three';
import { WORLD, COLORS } from './config.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    // Data exposed for traffic / missions / minimap
    this.intersections = [];   // {x, z, lights:{ns, ew}}
    this.roads = [];           // {x1,z1,x2,z2, axis} horizontal/vertical segments
    this.gasStations = [];     // {x, z, radius}
    this.parkingZones = [];    // {x, z, w, d, heading}
    this.collidables = [];     // {x, z, r} building footprints (circle approx)
    this.roadPoints = [];      // sample points for traffic spawning

    this._materials = {};
    this._build();
  }

  _mat(key, color, opts = {}) {
    if (!this._materials[key]) {
      this._materials[key] = new THREE.MeshLambertMaterial({ color, ...opts });
    }
    return this._materials[key];
  }

  _build() {
    const { blockSize, blocksX, blocksZ, roadWidth } = WORLD;
    const spanX = blockSize * blocksX;
    const spanZ = blockSize * blocksZ;

    // Ground (grass)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX + 200, spanZ + 200),
      this._mat('grass', COLORS.grass)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.group.add(ground);

    // Roads: grid of blockSize-spaced lines centered at origin.
    // Road centerlines run along x = i*blockSize - halfX, z = j*blockSize - halfZ
    const halfX = spanX / 2;
    const halfZ = spanZ / 2;
    const roadMat = this._mat('road', COLORS.road);
    const sidewalkMat = this._mat('sidewalk', COLORS.sidewalk);
    const lineMat = this._mat('line', COLORS.roadLine, { emissive: COLORS.roadLine, emissiveIntensity: 0.25 });

    for (let i = 0; i <= blocksX; i++) {
      const x = i * blockSize - halfX;
      // vertical road strip
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, spanZ), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0, 0);
      this.group.add(road);
      this.roads.push({ axis: 'v', x, z: 0, length: spanZ });
      // center dashed line
      const dash = this._dashedLine(spanZ, 'z');
      dash.position.set(x, 0.02, 0);
      this.group.add(dash);
    }
    for (let j = 0; j <= blocksZ; j++) {
      const z = j * blockSize - halfZ;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(spanX, roadWidth), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0, z);
      this.group.add(road);
      this.roads.push({ axis: 'h', x: 0, z, length: spanX });
      const dash = this._dashedLine(spanX, 'x');
      dash.rotation.z = Math.PI / 2;
      dash.position.set(0, 0.02, z);
      this.group.add(dash);
    }

    // Intersections + traffic lights
    for (let i = 0; i <= blocksX; i++) {
      for (let j = 0; j <= blocksZ; j++) {
        const x = i * blockSize - halfX;
        const z = j * blockSize - halfZ;
        // intersection pad
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadWidth), roadMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(x, 0.01, z);
        this.group.add(pad);

        const lights = this._makeTrafficLights(x, z);
        this.intersections.push({ x, z, lights });
      }
    }

    // Buildings fill each block (between roads), leaving sidewalk margin.
    const buildingMats = [
      this._mat('bA', COLORS.buildingA),
      this._mat('bB', COLORS.buildingB),
      this._mat('bC', COLORS.buildingC),
    ];
    const neonColors = [COLORS.neonCyan, COLORS.neonViolet, COLORS.neonPink, COLORS.neonGreen];
    for (let i = 0; i < blocksX; i++) {
      for (let j = 0; j < blocksZ; j++) {
        const cx = (i + 0.5) * blockSize - halfX;
        const cz = (j + 0.5) * blockSize - halfZ;
        this._buildBlock(cx, cz, blockSize, roadWidth, buildingMats, neonColors, sidewalkMat);
      }
    }

    // Gas station (one, near a corner)
    this._addGasStation(-halfX + blockSize * 0.5, -halfZ + blockSize * 0.5);

    // Parking zones
    this._addParkingZone(halfX - blockSize * 0.5, halfZ - blockSize * 0.5, 0);
    this._addParkingZone(-halfX + blockSize * 1.5, halfZ - blockSize * 0.5, Math.PI / 2);

    // Boundary walls (keep player in world) — low neon fence
    this._addBoundary(spanX, spanZ);

    // Fog + ambient handled in main.js; here we add a hemisphere light helper.
  }

  _dashedLine(length, axis) {
    const group = new THREE.Group();
    const dashLen = 2;
    const gap = 2.4;
    const w = axis === 'z' ? 0.25 : dashLen;
    const d = axis === 'z' ? dashLen : 0.25;
    const geo = new THREE.PlaneGeometry(w, d);
    let pos = -length / 2;
    while (pos < length / 2) {
      const m = new THREE.Mesh(geo, this._mat('line', COLORS.roadLine, { emissive: COLORS.roadLine, emissiveIntensity: 0.3 }));
      m.rotation.x = -Math.PI / 2;
      if (axis === 'z') m.position.set(0, 0, pos + dashLen / 2);
      else m.position.set(pos + dashLen / 2, 0, 0);
      group.add(m);
      pos += dashLen + gap;
    }
    return group;
  }

  _makeTrafficLights(x, z) {
    // Two light heads: ns (controls vertical road) and ew (horizontal road)
    const mkHead = (color) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      return m;
    };
    const ns = mkHead(COLORS.green);
    const ew = mkHead(COLORS.red);
    ns.position.set(x + WORLD.roadWidth / 2 + 0.6, 3, z);
    ew.position.set(x, 3, z + WORLD.roadWidth / 2 + 0.6);
    this.group.add(ns, ew);
    // pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6),
      this._mat('pole', 0x475569)
    );
    pole.position.set(x + WORLD.roadWidth / 2 + 0.6, 1.7, z);
    this.group.add(pole);
    const pole2 = pole.clone();
    pole2.position.set(x, 1.7, z + WORLD.roadWidth / 2 + 0.6);
    this.group.add(pole2);

    // state: 'ns-green' or 'ew-green'
    return { ns, ew, state: 'ns-green', timer: 0 };
  }

  _buildBlock(cx, cz, blockSize, roadWidth, mats, neonColors, sidewalkMat) {
    const margin = roadWidth / 2 + 1.5; // sidewalk
    const inner = blockSize - margin * 2;
    if (inner < 6) return;

    // sidewalk slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(inner + 2, 0.3, inner + 2), sidewalkMat);
    slab.position.set(cx, 0.15, cz);
    this.group.add(slab);

    // 1-4 buildings per block, subdivided
    const subdivs = Math.random() < 0.5 ? 2 : 1;
    const cell = inner / subdivs;
    for (let a = 0; a < subdivs; a++) {
      for (let b = 0; b < subdivs; b++) {
        if (Math.random() < 0.18) continue; // empty lot / park
        const bx = cx - inner / 2 + cell * (a + 0.5);
        const bz = cz - inner / 2 + cell * (b + 0.5);
        const w = cell * (0.55 + Math.random() * 0.3);
        const d = cell * (0.55 + Math.random() * 0.3);
        const h = 4 + Math.random() * 16;
        const mat = mats[(a + b + Math.floor(Math.random() * 3)) % mats.length];
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        bldg.position.set(bx, h / 2 + 0.3, bz);
        this.group.add(bldg);
        // neon roof trim
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2),
          new THREE.MeshBasicMaterial({ color: neonColor })
        );
        trim.position.set(bx, h + 0.3, bz);
        this.group.add(trim);
        // collider (circle approx from footprint)
        this.collidables.push({ x: bx, z: bz, r: Math.max(w, d) / 2 + 0.5 });
      }
    }
  }

  _addGasStation(x, z) {
    // canopy
    const canopyMat = this._mat('canopy', 0x334155);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 8), canopyMat);
    canopy.position.set(x, 4, z);
    this.group.add(canopy);
    // pillars
    for (const [dx, dz] of [[-4,-3],[4,-3],[-4,3],[4,3]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 6), this._mat('pillar', 0x64748b));
      p.position.set(x + dx, 2, z + dz);
      this.group.add(p);
    }
    // pumps
    const pumpMat = new THREE.MeshLambertMaterial({ color: COLORS.neonCyan, emissive: COLORS.neonCyan, emissiveIntensity: 0.3 });
    for (const dz of [-1, 1]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 1.6), pumpMat);
      pump.position.set(x, 0.8, z + dz);
      this.group.add(pump);
    }
    // glowing floor pad
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.neonCyan, transparent: true, opacity: 0.12 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.03, z);
    this.group.add(pad);

    this.gasStations.push({ x, z, radius: 6 });
  }

  _addParkingZone(x, z, heading) {
    const w = 5, d = 3;
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ color: COLORS.neonGreen, transparent: true, opacity: 0.25 })
    );
    zone.rotation.x = -Math.PI / 2;
    zone.rotation.z = heading;
    zone.position.set(x, 0.04, z);
    this.group.add(zone);
    // corner markers
    const cornerMat = new THREE.MeshBasicMaterial({ color: COLORS.neonGreen });
    for (const [dx, dz] of [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), cornerMat);
      c.position.set(x + dx, 0.25, z + dz);
      this.group.add(c);
    }
    this.parkingZones.push({ x, z, w, d, heading });
  }

  _addBoundary(spanX, spanZ) {
    // Visual fence only — no collidables. The boundary fence is long and thin,
    // so a circle-approximation collider (r = length/2) would cover the whole
    // map and trap the car. Position clamping in game._update() handles bounds.
    const fenceMat = new THREE.MeshBasicMaterial({ color: COLORS.neonViolet });
    const t = 0.5;
    const h = 1.2;
    const halfX = spanX / 2 + 2;
    const halfZ = spanZ / 2 + 2;
    const walls = [
      [spanX + 8, t, 0, halfZ],
      [spanX + 8, t, 0, -halfZ],
      [t, spanZ + 8, halfX, 0],
      [t, spanZ + 8, -halfX, 0],
    ];
    for (const [w, d, x, z] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fenceMat);
      m.position.set(x, h / 2, z);
      this.group.add(m);
    }
  }

  // Update traffic lights cycle
  updateLights(dt) {
    for (const it of this.intersections) {
      it.lights.timer += dt;
      if (it.lights.timer > 8) {
        it.lights.timer = 0;
        it.lights.state = it.lights.state === 'ns-green' ? 'ew-green' : 'ns-green';
        const nsGreen = it.lights.state === 'ns-green';
        it.lights.ns.material.color.setHex(nsGreen ? COLORS.green : COLORS.red);
        it.lights.ew.material.color.setHex(nsGreen ? COLORS.red : COLORS.green);
      }
    }
  }

  // True if the NS direction is green at the nearest intersection to (x,z)
  lightStateAt(x, z) {
    let best = null, bestD = Infinity;
    for (const it of this.intersections) {
      const d = Math.abs(it.x - x) + Math.abs(it.z - z);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (!best || bestD > 14) return null;
    return best.lights.state;
  }

  isOnRoad(x, z) {
    const { blockSize, blocksX, blocksZ, roadWidth } = WORLD;
    const halfX = (blockSize * blocksX) / 2;
    const halfZ = (blockSize * blocksZ) / 2;
    const tol = roadWidth / 2;
    // near a vertical road line?
    for (let i = 0; i <= blocksX; i++) {
      if (Math.abs(x - (i * blockSize - halfX)) < tol) return true;
    }
    for (let j = 0; j <= blocksZ; j++) {
      if (Math.abs(z - (j * blockSize - halfZ)) < tol) return true;
    }
    return false;
  }
}
