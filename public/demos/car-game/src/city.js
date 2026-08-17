// ════════════════════════════════════════════════════════
// CITY — New York-inspired open world:
// Manhattan (Midtown towers, Times Square billboards,
// Central Park, Financial District), Brooklyn (brownstone
// heights, DUMBO docks), East River with two suspension
// bridges + ring beam bridges, a road tunnel, avenues,
// subway entrances, street signs, water towers, steam vents.
// Chunked visibility streaming + spatial-hash colliders.
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import { WORLD, COLORS, DISTRICTS } from './config.js';
import { clamp, makeRng } from './utils.js';

const SIG_CYCLE = { g: 7, y: 1.6, r: 0.9 };
const CHUNK_CELLS = 4;   // chunk size in cells → 4×3 chunks of 176×176

const AVENUE_NAMES = ['West Side Hwy', 'Church St', '5th Ave', '6th Ave', 'Broadway',
  '7th Ave', 'Park Ave', 'Madison Ave', 'FDR Drive', 'BQE', 'Flatbush Ave', 'Bond St',
  'Bedford Ave', 'Lee Ave', 'Graham Ave', 'Bushwick Ave', 'East Ring'];
const STREET_NAMES = ['North Ring', 'W 72nd St', 'W 59th St', 'Brooklyn Bridge', 'W 50th St',
  'W 42nd St', 'W 34th St', 'Canal St', 'Manhattan Bridge', 'Worth St', 'Wall St',
  'Battery Pl', 'South Ring'];

/** Collects unit-plane quads into one InstancedMesh. */
class QuadBatch {
  constructor(material, y = 0.02) {
    this.mat = material; this.y = y;
    this.items = [];
  }
  add(x, z, w, d) { this.items.push({ x, z, w, d }); }
  build(scene) {
    if (!this.items.length) return null;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geo, this.mat, this.items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const s = new THREE.Vector3(), p = new THREE.Vector3();
    this.items.forEach((it, idx) => {
      p.set(it.x, this.y, it.z); s.set(it.w, it.d, 1);
      m.compose(p, q, s);
      mesh.setMatrixAt(idx, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.matrixAutoUpdate = false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
}

function facadeTextures(rng, variant) {
  const W = 128, H = 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const em = document.createElement('canvas'); em.width = W; em.height = H;
  const g = cv.getContext('2d'), e = em.getContext('2d');
  const bases = variant === 'glass'
    ? ['#2e3d52', '#33465e', '#2a3a50', '#3a4f68', '#2b3c54', '#31445c']
    : ['#2b3444', '#39445a', '#243040', '#414d63', '#2f3b4e', '#1f2937'];
  g.fillStyle = bases[variant.i % bases.length]; g.fillRect(0, 0, W, H);
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const cols = variant.glass ? 8 : 6, rows = variant.glass ? 16 : 14;
  const cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.18, y = r * ch + ch * 0.22;
      const w = cw * 0.64, h = ch * 0.52;
      g.fillStyle = rng.chance(0.5) ? '#5a6b85' : '#48587030';
      g.fillRect(x, y, w, h);
      if (rng.chance(0.4)) {
        const warm = rng.chance(0.7);
        e.fillStyle = warm ? `rgba(255,${190 + rng.int(0, 40)},120,1)` : 'rgba(140,190,255,0.9)';
        e.fillRect(x, y, w, h);
      }
    }
  }
  const map = new THREE.CanvasTexture(cv);
  const emissive = new THREE.CanvasTexture(em);
  for (const t of [map, emissive]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  // baked AO: floor-line shadows + edge vignette on the albedo map
  g.fillStyle = 'rgba(0,0,0,0.28)';
  for (let r = 0; r <= rows; r++) g.fillRect(0, r * ch, W, 3);
  const vg = g.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(0,0,0,0.22)');
  vg.addColorStop(0.1, 'rgba(0,0,0,0)');
  vg.addColorStop(0.92, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  return { map, emissive };
}

function brickTexture(rng, base) {
  const W = 128, H = 128;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 8; c++) {
      const off = (r % 2) * 8;
      g.fillStyle = rng.chance(0.5) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
      g.fillRect(c * 16 + off, r * 8, 15, 7);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function signTexture(text, color, small = false) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = small ? 48 : 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#0b0f18'; g.fillRect(0, 0, cv.width, cv.height);
  g.font = `bold ${small ? 26 : 34}px Arial`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(text, 128, cv.height / 2);
  g.fillText(text, 128, cv.height / 2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Noisy asphalt with aggregate speckle, cracks, and wheel-track wear. */
function asphaltTexture(base = '#23272e') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = 20 + Math.random() * 30;
    g.fillStyle = `rgba(${v},${v + 3},${v + 8},${0.12 + Math.random() * 0.2})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // wheel-track wear: two darker/polished strips along the length (V axis)
  for (const cx of [38, 90]) {
    const wg = g.createLinearGradient(cx - 14, 0, cx + 14, 0);
    wg.addColorStop(0, 'rgba(0,0,0,0)');
    wg.addColorStop(0.5, 'rgba(8,10,14,0.22)');
    wg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = wg;
    g.fillRect(cx - 14, 0, 28, 128);
  }
  g.strokeStyle = 'rgba(10,12,16,0.35)';
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    let x = Math.random() * 128, y = Math.random() * 128;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Concrete sidewalk with expansion-joint grid lines. */
function sidewalkTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#3d4450'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    const v = 60 + Math.random() * 35;
    g.fillStyle = `rgba(${v},${v + 4},${v + 10},${0.1 + Math.random() * 0.15})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
  }
  g.strokeStyle = 'rgba(20,24,30,0.5)';
  g.lineWidth = 2;
  for (let k = 0; k <= 128; k += 64) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 128); g.stroke();
    g.beginPath(); g.moveTo(0, k); g.lineTo(128, k); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(8, 8);
  return t;
}

/** Shop door: panel + vision window + handle. */
function doorTexture() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 160;
  const g = cv.getContext('2d');
  g.fillStyle = '#2b3340'; g.fillRect(0, 0, 96, 160);
  g.fillStyle = '#141b26'; g.fillRect(6, 6, 84, 148);
  g.fillStyle = '#3f5a75'; g.fillRect(12, 12, 72, 52);
  g.strokeStyle = '#5a6b80'; g.lineWidth = 3;
  g.strokeRect(12, 12, 72, 52);
  g.fillStyle = '#8a94a6';
  g.fillRect(78, 82, 6, 22);
  g.fillStyle = 'rgba(255,220,150,0.12)';
  g.fillRect(0, 0, 96, 160);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Striped shop awning. */
function awningTexture(color) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(240,244,250,0.85)';
  for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 8, 64);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SHOP_NAMES = ['BODEGA 24', 'PIZZA SLICE', 'BAGEL CO', 'COFFEE BAR', 'RAMEN NYC',
  'DELI GROCER', 'VINTAGE', 'RECORDS', 'TACO CLUB', 'DUMPLING HOUSE', 'BARBER', 'LAUNDROMAT'];
const NEON_COLORS = ['#00d4ff', '#f472b6', '#10b981', '#f59e0b', '#7c3aed', '#ef4444'];

export class City {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.rng = makeRng(2026);
    this.quality = opts.quality || 'medium';
    this.chunkRadius = 210;

    this.group = new THREE.Group();
    scene.add(this.group);

    // Public data
    this.collidables = [];
    this.gasStations = [];
    this.parkingZones = [];
    this.parkedCars = [];
    this.landmarks = [];
    this.mapSegs = [];
    this.lampPositions = [];
    this.beacons = [];
    this.neonSigns = [];
    this.steamVents = [];
    this.roamPOIs = [];
    this._treeSpots = [];
    // geometric building detail collections (instanced after build)
    this._wins = [];       // {x,y,z,ry,w,h,lit}
    this._doors = [];      // {x,z,ry}
    this._balcSlabs = [];  // {x,y,z,ry}
    this._fes = [];        // {x,y,z,ry, stair}
    this._hvac = [];       // {x,y,z}
    this._parapets = [];   // {x,y,z,sx,sz}
    this._awnings = [];    // {x,y,z,ry,tex}
    this._curbs = [];      // {x,z,sx,sz}
    this._benches = [];    // {x,z,ry}
    this._trash = [];      // {x,z}
    this._hydrants = [];   // {x,z}
    this.streetNames = { v: AVENUE_NAMES, h: STREET_NAMES };

    this._mats = {};
    this._night = 0;
    this._wet = 0;
    this._time = 0;
    this._lampLightTimer = 0;
    this._chunkTimer = 0;
    this._bbTimer = 0;
    this._bbFrame = 0;

    this._buildGraph();
    this._buildChunks();
    this._buildGround();
    this._buildRiver();
    this._buildRoads();
    this._buildBlocks();
    this._buildBridges();
    this._buildTunnel();
    this._buildSignals();
    this._buildStreetlights();
    this._buildTrees();
    this._buildStreetProps();
    this._buildInstancedDetail();
    this._buildBoundary();
    this._buildRoamPOIs();
    this._buildLampLights();
    this._buildSpatialHash();
  }

  // ───────── coordinates / districts ─────────
  nodeXZ(i, j) { return { x: WORLD.roadX(i), z: WORLD.roadZ(j) }; }
  nodeId(i, j) { return i * (WORLD.NZ + 1) + j; }
  nodeIJ(id) { return { i: Math.floor(id / (WORLD.NZ + 1)), j: id % (WORLD.NZ + 1) }; }
  cellCenter(i, j) { return { x: WORLD.roadX(i) + WORLD.BLOCK / 2, z: WORLD.roadZ(j) + WORLD.BLOCK / 2 }; }

  districtOf(i, j) {
    const W = WORLD;
    if (i === W.RIVER_I) return 'river';
    const within = (r) => i >= r.i0 && i <= r.i1 && j >= r.j0 && j <= r.j1;
    if (within(W.PARK)) return 'park';
    if (within(W.TIMES)) return 'times';
    if (within(W.MIDTOWN)) return 'midtown';
    if (within(W.FINANCIAL)) return 'financial';
    if (i <= 7) return i <= 1 ? 'westside' : 'mhattan';
    if (within(W.DUMBO)) return 'dumbo';
    if (within(W.HEIGHTS)) return 'heights';
    return 'brooklyn';
  }

  districtInfo(i, j) { return DISTRICTS[this.districtOf(i, j)] || DISTRICTS.brooklyn; }

  _poiCell(i, j) {
    return [[1, 6], [1, 7], [6, 10], [3, 7]].some(([a, b]) => a === i && b === j) ||
      [[3, 4], [10, 5], [12, 9], [4, 9], [11, 3], [13, 7]].some(([a, b]) => a === i && b === j); // gas+lots
  }

  // ───────── road graph ─────────
  _buildGraph() {
    const { NX, NZ } = WORLD;
    this.nodes = [];
    for (let i = 0; i <= NX; i++) {
      for (let j = 0; j <= NZ; j++) {
        const { x, z } = this.nodeXZ(i, j);
        this.nodes.push({ id: this.nodeId(i, j), i, j, x, z, nb: [] });
      }
    }
    this.edges = [];
    const link = (a, b, props) => {
      const w = WORLD.BLOCK;
      this.edges.push({ a, b, w, ...props });
      this.nodes[a].nb.push({ id: b, w });
      this.nodes[b].nb.push({ id: a, w });
    };
    // verticals (river banks are ordinary roads along the river)
    for (let i = 0; i <= NX; i++) {
      for (let j = 0; j < NZ; j++) {
        link(this.nodeId(i, j), this.nodeId(i, j + 1), {
          axis: 'z', i, j,
          highway: i === 0 || i === NX,
          width: WORLD.vWidth(i),
        });
      }
    }
    // horizontals — cross the river only at bridges
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const crossesRiver = i === WORLD.RIVER_I;
        const isBridge = crossesRiver &&
          (WORLD.BRIDGE_J.includes(j) || WORLD.RING_BRIDGE_J.includes(j));
        if (crossesRiver && !isBridge) continue;
        const tunnel = i === WORLD.TUNNEL_EDGE.i && j === WORLD.TUNNEL_EDGE.j;
        link(this.nodeId(i, j), this.nodeId(i + 1, j), {
          axis: 'x', i, j,
          highway: j === 0 || j === NZ,
          bridge: isBridge,
          suspension: crossesRiver && WORLD.BRIDGE_J.includes(j),
          tunnel,
          width: WORLD.hWidth(j),
        });
      }
    }
  }

  _mat(key, make) {
    if (!this._mats[key]) this._mats[key] = make();
    return this._mats[key];
  }

  // ───────── chunk streaming containers ─────────
  _buildChunks() {
    this.chunks = [];
    const cw = Math.ceil(WORLD.NX / CHUNK_CELLS);
    const ch = Math.ceil(WORLD.NZ / CHUNK_CELLS);
    for (let a = 0; a < cw; a++) {
      for (let b = 0; b < ch; b++) {
        const group = new THREE.Group();
        group.matrixAutoUpdate = false;
        this.group.add(group);
        this.chunks.push({ a, b, group, cx: WORLD.roadX(a * CHUNK_CELLS) + (CHUNK_CELLS * WORLD.BLOCK) / 2, cz: WORLD.roadZ(b * CHUNK_CELLS) + (CHUNK_CELLS * WORLD.BLOCK) / 2 });
      }
    }
  }

  _chunkGroupFor(i, j) {
    const a = Math.min(Math.floor(i / CHUNK_CELLS), Math.ceil(WORLD.NX / CHUNK_CELLS) - 1);
    const b = Math.min(Math.floor(j / CHUNK_CELLS), Math.ceil(WORLD.NZ / CHUNK_CELLS) - 1);
    return this.chunks[b * Math.ceil(WORLD.NX / CHUNK_CELLS) + a].group;
  }

  updateChunks(playerPos, radius) {
    for (const ch of this.chunks) {
      const d = Math.hypot(ch.cx - playerPos.x, ch.cz - playerPos.z);
      ch.group.visible = d < radius + CHUNK_CELLS * WORLD.BLOCK * 0.75;
    }
  }

  // ───────── ground + river ─────────
  _buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.spanX + 400, WORLD.spanZ + 400),
      this._mat('grass', () => new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 1 }))
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    this.group.add(ground);
  }

  _buildRiver() {
    const x0 = WORLD.roadX(WORLD.RIVER_I) + WORLD.BANK_W / 2 + WORLD.ROAD_W / 4;
    const x1 = WORLD.roadX(WORLD.RIVER_I + 1) - WORLD.BANK_W / 2 - WORLD.ROAD_W / 4;
    this.waterRect = { x0, x1, z0: -WORLD.spanZ / 2 - 60, z1: WORLD.spanZ / 2 + 60 };
    const width = x1 - x0;
    // animated wave mesh
    const geo = new THREE.PlaneGeometry(width, WORLD.spanZ + 120, 6, 48);
    this.water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: COLORS.water, roughness: 0.14, metalness: 0.65,
      transparent: true, opacity: 0.94,
    }));
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set((x0 + x1) / 2, -0.3, 0);
    this.group.add(this.water);
    this._waterBase = geo.attributes.position.array.slice();

    // Hudson-side visual water beyond the west edge
    const hudson = new THREE.Mesh(
      new THREE.PlaneGeometry(140, WORLD.spanZ + 200),
      this._mat('water2', () => new THREE.MeshStandardMaterial({
        color: COLORS.water, roughness: 0.16, metalness: 0.6, transparent: true, opacity: 0.92,
      }))
    );
    hudson.rotation.x = -Math.PI / 2;
    hudson.position.set(-WORLD.spanX / 2 - 70, -0.3, 0);
    hudson.matrixAutoUpdate = false;
    this.group.add(hudson);

    // banks
    const bankMat = this._mat('bank', () => new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 1 }));
    for (const [bx, w] of [[x0 - 0.8, 1.6], [x1 + 0.8, 1.6]]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, WORLD.spanZ + 120), bankMat);
      bank.position.set(bx, 0, 0);
      bank.receiveShadow = true;
      bank.matrixAutoUpdate = false; bank.updateMatrix();
      this.group.add(bank);
    }
    // railings along banks (colliders) with gaps at bridges
    const railMat = new THREE.MeshStandardMaterial({ color: 0x6b7688, metalness: 0.7, roughness: 0.4 });
    const gaps = [...WORLD.BRIDGE_J, ...WORLD.RING_BRIDGE_J].map((j) => {
      const bz = WORLD.roadZ(j);
      return [bz - 11, bz + 11];
    }).sort((p, q) => p[0] - q[0]);
    const segments = [];
    let cursor = -WORLD.spanZ / 2 - 60;
    for (const [g0, g1] of gaps) {
      if (g0 > cursor) segments.push([cursor, g0]);
      cursor = Math.max(cursor, g1);
    }
    if (cursor < WORLD.spanZ / 2 + 60) segments.push([cursor, WORLD.spanZ / 2 + 60]);
    for (const bx of [x0 - 0.2, x1 + 0.2]) {
      for (const [s0, s1] of segments) {
        const len = s1 - s0;
        if (len < 0.5) continue;
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, len), railMat);
        rail.position.set(bx, 0.55, (s0 + s1) / 2);
        rail.castShadow = true;
        rail.matrixAutoUpdate = false; rail.updateMatrix();
        this.group.add(rail);
        this.collidables.push({ x: bx, z: (s0 + s1) / 2, hw: 0.35, hz: len / 2 });
      }
    }
  }

  // ───────── roads + markings ─────────
  _buildRoads() {
    const mkRoad = (key, color) => {
      const tex = asphaltTexture('#' + color.toString(16).padStart(6, '0'));
      tex.repeat.set(6, 2);
      return this._mat(key, () => new THREE.MeshStandardMaterial({
        color: 0xffffff, map: tex, roughness: 0.92, metalness: 0.02,
      }));
    };
    this.roadMatStreet = mkRoad('road', COLORS.road);
    this.roadMatAve = mkRoad('avenue', COLORS.avenue);
    this.roadMatHigh = mkRoad('highway', COLORS.highway);
    this.roadMats = [this.roadMatStreet, this.roadMatAve, this.roadMatHigh];
    // wetness tints the material color; keep textures neutral white-multiplied
    this._roadBaseColors = [new THREE.Color(0xffffff), new THREE.Color(0xffffff), new THREE.Color(0xffffff)];

    const yellowMat = this._mat('lineY', () => new THREE.MeshBasicMaterial({ color: COLORS.roadLineYellow }));
    const whiteMat = this._mat('lineW', () => new THREE.MeshBasicMaterial({ color: COLORS.roadLineWhite }));
    const dashes = new QuadBatch(whiteMat, 0.03);
    const yellows = new QuadBatch(yellowMat, 0.03);
    const edges = new QuadBatch(whiteMat, 0.028);
    const stopLines = new QuadBatch(whiteMat, 0.032);
    const zebra = new QuadBatch(whiteMat, 0.03);

    const segMesh = (x, z, w, d, mat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.005, z);
      m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.updateMatrix();
      this.group.add(m);
    };

    for (const e of this.edges) {
      const a = this.nodes[e.a], b = this.nodes[e.b];
      const w = e.width;
      const mat = e.highway ? this.roadMatHigh : (w >= 18 ? this.roadMatAve : this.roadMatStreet);
      const cxm = (a.x + b.x) / 2, czm = (a.z + b.z) / 2;
      segMesh(cxm, czm, e.axis === 'x' ? WORLD.BLOCK : w, e.axis === 'z' ? WORLD.BLOCK : w, mat);
      this.mapSegs.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, w, highway: e.highway });

      // skip markings on bridge decks (railings instead) and tunnel interior strips
      if (e.bridge) continue;
      const len = WORLD.BLOCK;
      for (const off of [-0.28, 0.28]) {
        if (e.axis === 'x') yellows.add(cxm, czm + off, len - 4, 0.16);
        else yellows.add(cxm + off, czm, 0.16, len - 4);
      }
      // lane dash boundaries (between same-direction lanes)
      const lanes = [3.5, 6.99].filter((lb) => lb < w / 2 - 1);
      const dashLen = 3, gap = 4.2;
      const nDashes = Math.floor((len - 6) / (dashLen + gap));
      for (const lb of lanes) {
        for (const side of [-1, 1]) {
          for (let k = 0; k < nDashes; k++) {
            const t = -len / 2 + 4 + k * (dashLen + gap) + dashLen / 2;
            if (e.axis === 'x') dashes.add(a.x + len / 2 + t, czm + side * lb, dashLen, 0.14);
            else dashes.add(cxm + side * lb, a.z + len / 2 + t, 0.14, dashLen);
          }
        }
      }
      const edgeOff = w / 2 - 0.5;
      for (const side of [-1, 1]) {
        if (e.axis === 'x') edges.add(cxm, czm + side * edgeOff, len - 2, 0.14);
        else edges.add(cxm + side * edgeOff, czm, 0.14, len - 2);
      }
      if (e.tunnel) continue;
      // crosswalks + stop lines at both ends (non-bridge)
      for (const node of [a, b]) {
        const isHigh = node.i === 0 || node.i === WORLD.NX || node.j === 0 || node.j === WORLD.NZ;
        const iw = isHigh ? WORLD.HIGH_W : WORLD.vWidth(node.i);
        const half = iw / 2;
        const dirX = e.axis === 'x' ? (node === a ? -1 : 1) : 0;
        const dirZ = e.axis === 'z' ? (node === a ? -1 : 1) : 0;
        const cwOff = half + 1.1;
        for (let s = 0; s < 2; s++) {
          const off = cwOff + s * 0.75;
          if (e.axis === 'x') {
            zebra.add(node.x + dirX * off, node.z, iw - 1.6, 0.55);
          } else {
            zebra.add(node.x, node.z + dirZ * off, 0.55, iw - 1.6);
          }
        }
        stopLines.add(node.x + dirX * (half + 2.4) - (e.axis === 'z' ? w / 4 : 0),
          node.z + dirZ * (half + 2.4) - (e.axis === 'x' ? w / 4 : 0),
          e.axis === 'x' ? w / 2 - 0.8 : 0.4,
          e.axis === 'x' ? 0.4 : w / 2 - 0.8);
      }
    }

    // intersection pads
    for (const node of this.nodes) {
      const wV = WORLD.vWidth(node.i), wH = WORLD.hWidth(node.j);
      const w = Math.max(wV, wH);
      const isHigh = node.i === 0 || node.i === WORLD.NX || node.j === 0 || node.j === WORLD.NZ;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(w, w),
        isHigh ? this.roadMatHigh : (w >= 18 ? this.roadMatAve : this.roadMatStreet));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(node.x, 0.012, node.z);
      pad.receiveShadow = true;
      pad.matrixAutoUpdate = false; pad.updateMatrix();
      this.group.add(pad);
    }

    dashes.build(this.group);
    yellows.build(this.group);
    edges.build(this.group);
    stopLines.build(this.group);
    zebra.build(this.group);
    this._buildRoadFurniture();
  }

  /** Manholes, drainage grates, highway jersey barriers (instanced). */
  _buildRoadFurniture() {
    const rng = this.rng;
    const manholes = [], grates = [], barriers = [];
    const mkInst = (geo, mat, list, apply, cast = false) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      const m = new THREE.Matrix4(), p = new THREE.Vector3();
      const q = new THREE.Quaternion(), eu = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1);
      list.forEach((e, idx) => {
        apply(e, p, eu);
        q.setFromEuler(eu);
        m.compose(p, q, s);
        im.setMatrixAt(idx, m);
      });
      im.instanceMatrix.needsUpdate = true;
      im.matrixAutoUpdate = false;
      im.receiveShadow = true;
      im.castShadow = cast;
      this.group.add(im);
    };

    for (const e of this.edges) {
      if (e.tunnel) continue;
      const a = this.nodes[e.a], b = this.nodes[e.b];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = e.w;
      const nx = -dz / len, nz = dx / len;
      // manholes: 1-2 per segment in a lane
      const nMh = rng.int(1, 2);
      for (let k = 0; k < nMh; k++) {
        const t = rng.range(0.25, 0.75);
        const side = rng.chance(0.5) ? 1 : -1;
        manholes.push({
          x: a.x + dx * t + nx * side * 1.75,
          z: a.z + dz * t + nz * side * 1.75,
        });
      }
      // jersey barriers along highway outer edges
      if (e.highway && !e.bridge) {
        for (const side of [-1, 1]) {
          const off = (e.width / 2 + 0.75) * side;
          for (let d = 3; d < len - 3; d += 2.3) {
            barriers.push({
              x: a.x + (dx / len) * d + nx * off,
              z: a.z + (dz / len) * d + nz * off,
              ry: Math.atan2(dx, dz),
            });
          }
        }
      }
    }
    // drainage grates at intersection curb corners
    for (const node of this.nodes) {
      const w = Math.max(WORLD.vWidth(node.i), WORLD.hWidth(node.j));
      const off = w / 2 + 0.7;
      for (const [sx, sz] of [[1, 1], [-1, -1]]) {
        grates.push({ x: node.x + sx * off, z: node.z + sz * off, ry: sz > 0 ? 0 : Math.PI });
      }
    }

    const metal = new THREE.MeshStandardMaterial({ color: 0x2c3138, metalness: 0.8, roughness: 0.5 });
    mkInst(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), metal, manholes, (e, p, eu) => {
      p.set(e.x, 0.025, e.z); eu.set(0, 0, 0);
    });
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x1c2127, metalness: 0.6, roughness: 0.6 });
    mkInst(new THREE.BoxGeometry(0.95, 0.07, 0.5), grateMat, grates, (e, p, eu) => {
      p.set(e.x, 0.05, e.z); eu.set(0, e.ry, 0);
    });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.85 });
    mkInst(new THREE.BoxGeometry(0.45, 0.72, 2.15), jerseyMat, barriers, (e, p, eu) => {
      p.set(e.x, 0.36, e.z); eu.set(0, e.ry, 0);
    }, true);
  }
  // ───────── blocks by district ─────────
  _buildBlocks() {
    const sidewalkMat = this._mat('sidewalk', () => new THREE.MeshStandardMaterial({
      map: sidewalkTexture(), roughness: 0.95,
    }));
    this.sidewalkMat = sidewalkMat;

    // facade material variants (shared)
    this.facadeMats = [];
    this.facadeSideMats = [];
    for (let v = 0; v < 8; v++) {
      const variant = { i: v, glass: v >= 5 };
      const { map, emissive } = facadeTextures(this.rng, variant);
      const side = new THREE.MeshStandardMaterial({
        map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0,
        roughness: 0.85, metalness: 0.1,
      });
      const roof = this._mat(`roof${v}`, () => new THREE.MeshStandardMaterial({
        color: 0x1a2029, roughness: 0.95,
      }));
      this.facadeMats.push([side, side, roof, roof, side, side]);
      this.facadeSideMats.push(side);
    }
    // brick / brownstone mats
    this.brickMat = new THREE.MeshStandardMaterial({
      map: brickTexture(this.rng, '#7d5a4a'), roughness: 0.92,
    });
    this.brownMat = new THREE.MeshStandardMaterial({
      map: brickTexture(this.rng, '#8a6a55'), roughness: 0.92,
    });

    for (let i = 0; i < WORLD.NX; i++) {
      for (let j = 0; j < WORLD.NZ; j++) {
        const d = this.districtOf(i, j);
        if (d === 'river') continue;
        const { x: cx, z: cz } = this.cellCenter(i, j);
        const parent = this._chunkGroupFor(i, j);
        if (!this._poiCell(i, j)) {
          const slabW = WORLD.BLOCK - 15;
          this._box(parent, cx, 0.12, cz, slabW, 0.24, slabW, sidewalkMat, false);
        }
        if (this._poiCell(i, j)) { this._buildPOIDetails(i, j, cx, cz, parent); continue; }
        if (d === 'park') this._buildPark(i, j, cx, cz, parent);
        else if (d === 'times') this._buildTimes(i, j, cx, cz, parent);
        else if (d === 'midtown') this._buildTowers(i, j, cx, cz, parent, 20, 62, 3);
        else if (d === 'financial') this._buildTowers(i, j, cx, cz, parent, 26, 70, 3, true);
        else if (d === 'mhattan' || d === 'westside') this._buildMidrise(i, j, cx, cz, parent);
        else if (d === 'heights') this._buildBrownstones(cx, cz, parent);
        else if (d === 'dumbo') this._buildDumbo(cx, cz, parent);
        else this._buildBrooklyn(i, j, cx, cz, parent);
      }
    }
    this._buildSubwayAndSigns();
    this._buildSteamVents();
    this._buildRamps();
  }

  /** Drivable launch ramps (docks + park). Wedge geometry, no colliders. */
  _buildRamps() {
    this.ramps = [];
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x8a6a2f, roughness: 0.75, metalness: 0.3 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe8d44d });
    const mkRamp = (x, z, heading, len, w, h) => {
      const g = new THREE.Group();
      // wedge via a triangular profile extruded across the width
      const shape = new THREE.Shape();
      shape.moveTo(-len / 2, 0);
      shape.lineTo(len / 2, 0);
      shape.lineTo(len / 2, h);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
      geo.translate(0, 0, -w / 2);
      geo.rotateY(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, rampMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      // hazard stripes lying on the upslope surface (climb is local +Z)
      const slope = Math.atan2(h, len);
      for (let k = -1; k <= 1; k++) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.28, 1.6), stripeMat);
        s.position.set(k * w * 0.3, h / 2 + 0.04, 0);
        s.rotation.x = -Math.PI / 2 - slope;
        g.add(s);
      }
      g.position.set(x, 0, z);
      g.rotation.y = heading;
      g.matrixAutoUpdate = false; g.updateMatrix();
      this.group.add(g);
      this.ramps.push({ x, z, heading, len, w, h });
    };
    const dumbo = this.cellCenter(WORLD.DUMBO.i0 + 1, WORLD.DUMBO.j0);
    mkRamp(dumbo.x, dumbo.z, 0, 9, 6, 2.3);
    const dumbo2 = this.cellCenter(WORLD.DUMBO.i0 + 2, WORLD.DUMBO.j1);
    mkRamp(dumbo2.x, dumbo2.z, Math.PI, 9, 6, 2.3);
    const park = this.cellCenter(WORLD.PARK.i0 + 1, WORLD.PARK.j1 + 1);
    mkRamp(park.x, park.z, Math.PI / 2, 8, 5.5, 1.8);
  }

  /**
   * Ground height at a position (0 everywhere except on ramps).
   * Returns { y, ramp } — ramp is set while on the slope so the
   * caller can convert speed into launch velocity at the top edge.
   */
  groundAt(x, z) {
    if (!this.ramps) return { y: 0, ramp: null };
    for (const r of this.ramps) {
      const dx = x - r.x, dz = z - r.z;
      // local coords (along/across the ramp, heading = +z local)
      const s = Math.sin(r.heading), c = Math.cos(r.heading);
      const along = dx * s + dz * c;      // -len/2 (base) → +len/2 (top edge)
      const across = -dx * c + dz * s;
      if (Math.abs(across) <= r.w / 2 && along >= -r.len / 2 && along <= r.len / 2) {
        const y = ((along + r.len / 2) / r.len) * r.h;   // linear climb
        return { y, ramp: r, along };
      }
    }
    return { y: 0, ramp: null };
  }

  _box(parent, x, y, z, w, h, d, mat, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix();
    parent.add(m);
    return m;
  }

  /**
   * Push geometric detail (windows, doors, balconies, fire escapes,
   * rooftop HVAC, parapets) for one building. kind: tower | midrise |
   * brown | house | ware.
   */
  _detailBuilding(bx, bz, w, d, h, kind, rng) {
    const fh = kind === 'tower' ? 3.0 : 2.7;
    const floors = Math.max(0, Math.floor((h - 2.2) / fh));
    const winH = kind === 'tower' ? 1.7 : 1.4;
    const winW = 1.15;
    const addSide = (axis, face) => {
      // axis 'x': facade runs along x (faces ±z); 'z': facade along z (faces ±x)
      const len = axis === 'x' ? w : d;
      const cols = Math.floor((len - 1.6) / 2.2);
      if (cols < 1) return;
      for (let f = 0; f < floors; f++) {
        const y = 2.4 + f * fh;
        if (y + winH / 2 > h - 0.5) break;
        for (let c = 0; c < cols; c++) {
          const t = (c + 0.5) / cols - 0.5;
          const px = axis === 'x' ? bx + t * (len - 1.2) : bx + face * (w / 2 + 0.07);
          const pz = axis === 'x' ? bz + face * (d / 2 + 0.07) : bz + t * (len - 1.2);
          const ry = axis === 'x' ? (face > 0 ? 0 : Math.PI) : (face > 0 ? Math.PI / 2 : -Math.PI / 2);
          this._wins.push({ x: px, y, z: pz, ry, w: winW, h: winH, lit: rng.chance(0.42) });
        }
      }
    };
    const windowed = kind !== 'ware';
    if (windowed) {
      addSide('x', 1); addSide('x', -1);
      if (d > 4) { addSide('z', 1); addSide('z', -1); }
    }
    // entrance door on the street-facing side
    const doorFace = rng.chance(0.5) ? 1 : -1;
    this._doors.push({
      x: bx + rng.range(-w * 0.2, w * 0.2),
      z: bz - doorFace * (d / 2 + 0.1),
      ry: doorFace > 0 ? Math.PI : 0,
    });
    // balconies for brownstones + midrise front floors
    if (kind === 'brown' || (kind === 'midrise' && rng.chance(0.5))) {
      const bf = Math.min(floors, kind === 'brown' ? 2 : 3);
      for (let f = 1; f <= bf; f++) {
        this._balcSlabs.push({
          x: bx, y: 2.2 + f * fh, z: bz - doorFace * (d / 2 + 0.62),
          ry: doorFace > 0 ? Math.PI : 0, sx: clamp(w * 0.72, 2, 3.2),
        });
      }
    }
    // fire escapes on midrise sides
    if (kind === 'midrise' && h >= 9 && rng.chance(0.65)) {
      const side = rng.chance(0.5) ? 1 : -1;
      for (let f = 1; f <= Math.min(floors, 6); f++) {
        const y = 2.2 + f * fh;
        this._fes.push({
          x: bx + side * (w / 2 + 0.55), y, z: bz + rng.range(-2, 2),
          ry: side > 0 ? Math.PI / 2 : -Math.PI / 2, stair: f > 1,
        });
      }
    }
    // rooftop HVAC + parapet
    if (kind !== 'brown' && kind !== 'house') {
      const n = rng.int(1, 2);
      for (let k = 0; k < n; k++) {
        this._hvac.push({ x: bx + rng.range(-w / 3, w / 3), y: h + 0.7, z: bz + rng.range(-d / 3, d / 3) });
      }
      this._parapets.push({ x: bx, y: h + 0.38, z: bz + d / 2, sx: w + 0.3, sz: 0.2 });
      this._parapets.push({ x: bx, y: h + 0.38, z: bz - d / 2, sx: w + 0.3, sz: 0.2 });
      this._parapets.push({ x: bx + w / 2, y: h + 0.38, z: bz, sx: 0.2, sz: d + 0.3 });
      this._parapets.push({ x: bx - w / 2, y: h + 0.38, z: bz, sx: 0.2, sz: d + 0.3 });
    }
  }

  /** Benches, trash cans, hydrants + curbs along block sidewalks. */
  _buildStreetProps() {
    const rng = this.rng;
    const cw = Math.ceil(WORLD.NX / CHUNK_CELLS);
    for (let i = 0; i < WORLD.NX; i++) {
      for (let j = 0; j < WORLD.NZ; j++) {
        const d = this.districtOf(i, j);
        if (d === 'river' || this._poiCell(i, j)) continue;
        const { x: cx, z: cz } = this.cellCenter(i, j);
        const half = (WORLD.BLOCK - 15) / 2;
        // curbs (4 strips per block)
        this._curbs.push({ x: cx, z: cz + half, sx: half * 2 + 0.7, sz: 0.35 });
        this._curbs.push({ x: cx, z: cz - half, sx: half * 2 + 0.7, sz: 0.35 });
        this._curbs.push({ x: cx + half, z: cz, sx: 0.35, sz: half * 2 + 0.7 });
        this._curbs.push({ x: cx - half, z: cz, sx: 0.35, sz: half * 2 + 0.7 });
        // street furniture near corners
        const peds = this.districtInfo(i, j).peds || 1;
        const nProps = Math.round(2 * peds);
        for (let k = 0; k < nProps; k++) {
          const corner = rng.int(0, 3);
          const sx2 = corner % 2 === 0 ? -1 : 1;
          const sz2 = corner < 2 ? -1 : 1;
          const px = cx + sx2 * (half - 1.5) + rng.range(-2, 2);
          const pz = cz + sz2 * (half - 1.5) + rng.range(-2, 2);
          const roll = rng.f();
          if (roll < 0.45) this._benches.push({ x: px, z: pz, ry: rng.chance(0.5) ? 0 : Math.PI / 2 });
          else if (roll < 0.8) this._trash.push({ x: px, z: pz });
          else this._hydrants.push({ x: px, z: pz });
        }
      }
    }
  }

  /** Turn the detail collections into per-chunk InstancedMeshes. */
  _buildInstancedDetail() {
    const cw = Math.ceil(WORLD.NX / CHUNK_CELLS);
    const ch = Math.ceil(WORLD.NZ / CHUNK_CELLS);
    const chunkOf = (x, z) => {
      const a = clamp(Math.floor((x + WORLD.halfX) / WORLD.BLOCK / CHUNK_CELLS), 0, cw - 1);
      const b = clamp(Math.floor((z + WORLD.halfZ) / WORLD.BLOCK / CHUNK_CELLS), 0, ch - 1);
      return this.chunks[b * cw + a].group;
    };
    const mk = (geo, mat, entries, apply, opts = {}) => {
      const byChunk = new Map();
      for (const e of entries) {
        const g = chunkOf(e.x, e.z);
        if (!byChunk.has(g)) byChunk.set(g, []);
        byChunk.get(g).push(e);
      }
      const meshes = [];
      for (const [g, list] of byChunk) {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        const m = new THREE.Matrix4(), p = new THREE.Vector3();
        const q = new THREE.Quaternion(), eu = new THREE.Euler(), s = new THREE.Vector3();
        list.forEach((e, idx) => {
          apply(e, p, eu, s);
          q.setFromEuler(eu);
          m.compose(p, q, s);
          im.setMatrixAt(idx, m);
        });
        im.instanceMatrix.needsUpdate = true;
        im.matrixAutoUpdate = false;
        im.castShadow = !!opts.shadow;
        g.add(im);
        meshes.push(im);
      }
      return meshes;
    };

    const q0 = new THREE.Quaternion();

    // window frames (dark boxes around each pane)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 0.8, metalness: 0.3 });
    const frameGeo = new THREE.BoxGeometry(1.32, 1.32, 0.12);
    const frameEntries = this._wins.map((w2) => ({ ...w2, sy: w2.h / 1.4, sx: w2.w / 1.15 }));
    mk(frameGeo, frameMat, frameEntries, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, e.ry, 0); s.set(e.sx, e.sy, 1);
    });
    // glass panes (reflective day look)
    const paneMat = new THREE.MeshStandardMaterial({
      color: 0x8fb0c8, metalness: 0.9, roughness: 0.07, envMapIntensity: 1.5,
    });
    const paneGeo = new THREE.PlaneGeometry(1.15, 1.4);
    mk(paneGeo, paneMat, this._wins, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, e.ry, 0); s.set(e.w / 1.15, e.h / 1.4, 1);
    });
    // lit windows (warm glow, night only)
    const litMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const litEntries = this._wins.filter((w2) => w2.lit);
    this.litPanesMeshes = mk(paneGeo, litMat, litEntries, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z - 0.0); eu.set(0, e.ry, 0); s.set(e.w / 1.15, e.h / 1.4, 1);
    });
    for (const m of this.litPanesMeshes) m.visible = false;

    // doors
    const doorMat = new THREE.MeshStandardMaterial({ map: doorTexture(), roughness: 0.7 });
    const doorGeo = new THREE.PlaneGeometry(1.6, 2.6);
    mk(doorGeo, doorMat, this._doors, (e, p, eu, s) => {
      p.set(e.x, 1.35, e.z); eu.set(0, e.ry, 0); s.set(1, 1, 1);
    });
    // balconies (slab + railing)
    const balcMat = new THREE.MeshStandardMaterial({ color: 0x4a5364, metalness: 0.5, roughness: 0.5 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x2c333f, metalness: 0.6, roughness: 0.4 });
    const slabGeo = new THREE.BoxGeometry(2, 0.12, 1.1);
    mk(slabGeo, balcMat, this._balcSlabs, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, e.ry, 0); s.set(e.sx / 2, 1, 1);
    }, { shadow: true });
    const railGeo = new THREE.BoxGeometry(2, 0.85, 0.07);
    const railEntries = this._balcSlabs.map((b) => ({ ...b, y: b.y + 0.48, z: b.z - 0.5 * (Math.cos(b.ry) || 1), x: b.x - 0.5 * Math.sin(b.ry) }));
    mk(railGeo, railMat, railEntries, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, e.ry, 0); s.set(e.sx / 2, 1, 1);
    });
    // fire escapes: platform + alternating diagonal stairs
    const feMat = new THREE.MeshStandardMaterial({ color: 0x333944, metalness: 0.65, roughness: 0.45 });
    const feGeo = new THREE.BoxGeometry(1.1, 0.09, 2.6);
    mk(feGeo, feMat, this._fes, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, e.ry, 0); s.set(1, 1, 1);
    }, { shadow: true });
    const stairGeo = new THREE.BoxGeometry(0.75, 0.07, 2.2);
    const stairEntries = this._fes.filter((f) => f.stair)
      .map((f) => ({ ...f, y: f.y - 1.35, x: f.x, z: f.z + 1.1, rz: 0.85 }));
    mk(stairGeo, feMat, stairEntries, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, e.ry, e.rz); s.set(1, 1, 1);
    });
    // rooftop HVAC (box + fan cylinder)
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x6a7382, metalness: 0.55, roughness: 0.5 });
    const fanMat = new THREE.MeshStandardMaterial({ color: 0x2c333f, metalness: 0.5, roughness: 0.5 });
    const hvacGeo = new THREE.BoxGeometry(1.7, 1.1, 1.3);
    mk(hvacGeo, hvacMat, this._hvac, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, 0, 0); s.set(1, 1, 1);
    }, { shadow: true });
    const fanGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.16, 10);
    const fanEntries = this._hvac.map((hv) => ({ ...hv, y: hv.y + 0.62 }));
    mk(fanGeo, fanMat, fanEntries, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, 0, 0); s.set(1, 1, 1);
    });
    // parapets
    const parapetMat = new THREE.MeshStandardMaterial({ color: 0x39414f, roughness: 0.85 });
    const parapetGeo = new THREE.BoxGeometry(1, 0.42, 1);
    mk(parapetGeo, parapetMat, this._parapets, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(0, 0, 0); s.set(Math.max(e.sx, 0.2), 1, Math.max(e.sz, 0.2));
    });
    // curbs
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x59626f, roughness: 0.85 });
    const curbGeo = new THREE.BoxGeometry(1, 0.26, 1);
    mk(curbGeo, curbMat, this._curbs, (e, p, eu, s) => {
      p.set(e.x, 0.16, e.z); eu.set(0, 0, 0); s.set(e.sx, 1, e.sz);
    });
    // benches (seat + back)
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6b5335, roughness: 0.9 });
    const seatGeo = new THREE.BoxGeometry(1.9, 0.09, 0.5);
    mk(seatGeo, benchMat, this._benches, (e, p, eu, s) => {
      p.set(e.x, 0.55, e.z); eu.set(0, e.ry, 0); s.set(1, 1, 1);
    }, { shadow: true });
    const backGeo = new THREE.BoxGeometry(1.9, 0.55, 0.08);
    const backEntries = this._benches.map((b) => ({
      ...b, x: b.x + Math.cos(b.ry) * 0.22, z: b.z - Math.sin(b.ry) * 0.22,
    }));
    mk(backGeo, benchMat, backEntries, (e, p, eu, s) => {
      p.set(e.x, 0.85, e.z); eu.set(0, e.ry, 0); s.set(1, 1, 1);
    });
    // trash cans + hydrants
    const trashMat = new THREE.MeshStandardMaterial({ color: 0x3d4550, metalness: 0.4, roughness: 0.6 });
    mk(new THREE.CylinderGeometry(0.32, 0.28, 0.85, 10), trashMat, this._trash, (e, p, eu, s) => {
      p.set(e.x, 0.55, e.z); eu.set(0, 0, 0); s.set(1, 1, 1);
    }, { shadow: true });
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xc03028, roughness: 0.5, metalness: 0.3 });
    mk(new THREE.CylinderGeometry(0.14, 0.17, 0.75, 8), hydMat, this._hydrants, (e, p, eu, s) => {
      p.set(e.x, 0.5, e.z); eu.set(0, 0, 0); s.set(1, 1, 1);
    });
    // awnings (midtown shops)
    const awnMat = new THREE.MeshStandardMaterial({ map: awningTexture('#7a3b2e'), roughness: 0.85 });
    const awnGeo = new THREE.BoxGeometry(2.6, 0.08, 1.15);
    const awnEntries = this._awnings.map((a) => ({ ...a, rx: -0.5 }));
    mk(awnGeo, awnMat, awnEntries, (e, p, eu, s) => {
      p.set(e.x, e.y, e.z); eu.set(e.rx, e.ry, 0); s.set(1, 1, 1);
    }, { shadow: true });

    // free the collections — they're baked now
    this._wins = []; this._doors = []; this._balcSlabs = []; this._fes = [];
    this._hvac = []; this._parapets = []; this._awnings = [];
  }

  _addBuilding(parent, x, z, w, d, h, matArr) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matArr);
    m.position.set(x, h / 2 + 0.24, z);
    m.castShadow = true; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix();
    parent.add(m);
    this.collidables.push({ x, z, hw: w / 2 + 0.2, hz: d / 2 + 0.2 });
    return m;
  }

  // Manhattan-style setback towers
  _buildTowers(i, j, cx, cz, parent, hMin, hMax, n, financial = false) {
    const rng = this.rng;
    const inner = WORLD.BLOCK - 16;
    for (let k = 0; k < n; k++) {
      const w = inner / n * rng.range(0.5, 0.78);
      const d = inner * rng.range(0.42, 0.6);
      const h = rng.range(hMin, hMax);
      const bx = cx - inner / 2 + inner / n * (k + 0.5) + rng.range(-1.5, 1.5);
      const bz = cz + rng.range(-3, 3);
      const mats = rng.pick(this.facadeMats.slice(financial ? 5 : 3));
      this._addBuilding(parent, bx, bz, w, d, h, mats);
      this._detailBuilding(bx, bz, w, d, h, 'tower', rng);
      // setback crown
      if (rng.chance(0.6)) {
        this._box(parent, bx, h + 0.24 + rng.range(4, 10) / 2, bz, w * 0.62, rng.range(4, 10), d * 0.62, mats[0]);
      }
      // spire on the tallest
      if (h > hMax * 0.86) {
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 12, 6),
          this._mat('spire', () => new THREE.MeshStandardMaterial({ color: 0x8a94a6, metalness: 0.8, roughness: 0.3 })));
        spire.position.set(bx, h + 6, bz);
        spire.matrixAutoUpdate = false; spire.updateMatrix();
        parent.add(spire);
      }
      if (h > 40) {
        const beacon = this._box(parent, bx, h + 1.2, bz, 0.5, 0.5, 0.5,
          new THREE.MeshBasicMaterial({ color: 0xff2222 }), false);
        this.beacons.push(beacon);
      }
      this._addWaterTower(parent, bx + rng.range(-w / 3, w / 3), bz + rng.range(-d / 3, d / 3), h, rng.chance(0.3));
    }
  }

  _addWaterTower(parent, x, z, roofH, chance) {
    if (!chance) return;
    const g = new THREE.Group();
    const wood = this._mat('wood', () => new THREE.MeshStandardMaterial({ color: 0x6b5335, roughness: 0.95 }));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 2.4, 10), wood);
    barrel.position.y = 1.9;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1, 10), wood);
    cone.position.y = 3.6;
    g.add(barrel, cone);
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), wood);
      leg.position.set(lx, 0.4, lz);
      g.add(leg);
    }
    g.position.set(x, roofH + 0.24, z);
    g.matrixAutoUpdate = false; g.updateMatrix();
    parent.add(g);
  }

  _buildTimes(i, j, cx, cz, parent) {
    const rng = this.rng;
    const inner = WORLD.BLOCK - 16;
    for (let k = 0; k < 2; k++) {
      const w = inner / 2 * 0.8;
      const d = inner * 0.8;
      const h = rng.range(30, 55);
      const bx = cx - inner / 2 + inner / 2 * (k + 0.5);
      const mats = rng.pick(this.facadeMats.slice(3));
      this._addBuilding(parent, bx, cz, w, d, h, mats);
      this._addWaterTower(parent, bx, cz, h, rng.chance(0.5));
    }
    // animated billboards on the outer faces (facing the avenues)
    this._buildBillboards(cx, cz, parent);
    // red steps + crowd plaza
    const steps = this._box(parent, cx, 0.5, cz + 12, 14, 1, 5,
      this._mat('steps', () => new THREE.MeshStandardMaterial({ color: 0xa3202e, roughness: 0.7 })), false);
  }

  _buildBillboards(cx, cz, parent) {
    this.billboards = this.billboards || [];
    const rng = this.rng;
    for (const [sx, rotY] of [[-1, Math.PI / 2], [1, -Math.PI / 2]]) {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 384;
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(10, 15), mat);
      bb.position.set(cx + sx * 15.5, 18, cz + this.rng.range(-8, 8));
      bb.rotation.y = rotY;
      bb.matrixAutoUpdate = false; bb.updateMatrix();
      parent.add(bb);
      this.billboards.push({ cv, tex, hue: rng.range(0, 360) });
    }
  }

  _updateBillboards(dt) {
    if (!this.billboards || !this.billboards.length) return;
    this._bbTimer -= dt;
    if (this._bbTimer > 0) return;
    this._bbTimer = 0.12;
    this._bbFrame++;
    const texts = ['NEON DRIVE', 'TIMES SQ', 'BROADWAY!', 'NYC LIVE', '★ SHOWTIME ★'];
    for (const bb of this.billboards) {
      const g = bb.cv.getContext('2d');
      const t = this._bbFrame;
      const grad = g.createLinearGradient(0, 0, 0, 384);
      const hue = (bb.hue + t * 4) % 360;
      grad.addColorStop(0, `hsl(${hue},80%,45%)`);
      grad.addColorStop(1, `hsl(${(hue + 80) % 360},85%,25%)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 384);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.font = 'bold 40px Arial';
      g.textAlign = 'center';
      const msg = texts[Math.floor(t / 24) % texts.length];
      const y = 140 + ((t * 6) % 60) - 30;
      g.fillText(msg, 128, y);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      for (let k = 0; k < 8; k++) {
        g.fillRect(10 + ((t * 3 + k * 32) % 236), 320, 20, 6);
      }
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 8;
      g.strokeRect(0, 0, 256, 384);
      bb.tex.needsUpdate = true;
    }
  }

  _buildMidrise(i, j, cx, cz, parent) {
    const rng = this.rng;
    const inner = WORLD.BLOCK - 16;
    const n = rng.int(2, 3);
    for (let k = 0; k < n; k++) {
      const w = inner / n * rng.range(0.6, 0.85);
      const d = inner * rng.range(0.5, 0.7);
      const h = rng.range(9, 22);
      const bx = cx - inner / 2 + inner / n * (k + 0.5);
      const bz = cz + rng.range(-2, 2);
      this._addBuilding(parent, bx, bz, w, d, h, rng.pick(this.facadeMats));
      this._detailBuilding(bx, bz, w, d, h, 'midrise', rng);
      this._addWaterTower(parent, bx, bz, h, rng.chance(0.45));
      // ground-floor shop sign facing north + awning
      const name = rng.pick(SHOP_NAMES);
      const color = rng.pick(NEON_COLORS);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.9, 9), 2.2),
        new THREE.MeshBasicMaterial({ map: signTexture(name, color), transparent: true }));
      sign.position.set(bx, 5.2, bz - d / 2 - 0.15);
      sign.rotation.y = Math.PI;
      sign.matrixAutoUpdate = false; sign.updateMatrix();
      parent.add(sign);
      this.neonSigns.push({ mesh: sign, base: 1 });
      this._awnings.push({ x: bx + rng.range(-1, 1), y: 3.55, z: bz - d / 2 - 0.55, ry: Math.PI });
    }
  }

  _buildBrownstones(cx, cz, parent) {
    const rng = this.rng;
    const inner = WORLD.BLOCK - 17;
    // rows of narrow houses with stoops
    const n = 4;
    for (let k = 0; k < n; k++) {
      if (rng.chance(0.12)) continue;
      const w = inner / n * 0.88;
      const h = rng.range(5, 7.5);
      const bx = cx - inner / 2 + inner / n * (k + 0.5);
      const bz = cz - inner * 0.18;
      const mat = rng.chance(0.5) ? this.brownMat : this.brickMat;
      this._addBuilding(parent, bx, bz, w, inner * 0.5, h, mat);
      this._detailBuilding(bx, bz, w, inner * 0.5, h, 'brown', rng);
      // stoop
      this._box(parent, bx, h * 0.28, bz + inner * 0.32, w * 0.5, h * 0.55, 3.2,
        this._mat('stone2', () => new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.9 })));
      // cornice
      this._box(parent, bx, h + 0.7, bz, w + 0.5, 0.5, inner * 0.5 + 0.4,
        this._mat('cornice', () => new THREE.MeshStandardMaterial({ color: 0x3d3430, roughness: 0.8 })), false);
      // tree in front
      this._treeSpots.push({ x: bx + rng.range(-1, 1), z: bz + inner * 0.42, s: rng.range(0.75, 1.05) });
    }
  }

  _buildBrooklyn(i, j, cx, cz, parent) {
    const rng = this.rng;
    const inner = WORLD.BLOCK - 18;
    const perRow = 2;
    for (let a = 0; a < perRow; a++) {
      for (let b = 0; b < perRow; b++) {
        if (rng.chance(0.22)) { // vacant lot / community garden
          this._treeSpots.push({ x: cx + rng.range(-8, 8), z: cz + rng.range(-8, 8), s: 1 });
          continue;
        }
        const w = inner / perRow * rng.range(0.5, 0.66);
        const d = w * rng.range(0.9, 1.3);
        const h = rng.range(3.5, 8);
        const hx = cx - inner / 2 + inner / perRow * (a + 0.5);
        const hz = cz - inner / 2 + inner / perRow * (b + 0.5);
        this._addBuilding(parent, hx, hz, w, d, h, rng.chance(0.6) ? this.brickMat : rng.pick(this.facadeMats));
        this._detailBuilding(hx, hz, w, d, h, 'house', rng);
        const roofMat = this._mat('roofHouse', () => new THREE.MeshStandardMaterial({ color: 0x3d3040, roughness: 0.95 }));
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 2.4, d + 0.6), roofMat);
        roof.position.set(hx, h + 0.24 + 0.5, hz);
        roof.rotation.z = Math.PI / 4;
        roof.castShadow = true;
        roof.matrixAutoUpdate = false; roof.updateMatrix();
        parent.add(roof);
      }
    }
  }

  _buildDumbo(cx, cz, parent) {
    const rng = this.rng;
    // big warehouse
    const w = WORLD.BLOCK - 20, d = WORLD.BLOCK - 26;
    const h = rng.range(7, 11);
    this._addBuilding(parent, cx, cz + 4, w, d, h, this.brickMat);
    this._detailBuilding(cx, cz + 4, w, d, h, 'ware', rng);
    // sawtooth roof
    for (let k = -1; k <= 1; k++) {
      this._box(parent, cx + k * w / 3, h + 1, cz + 4, w / 3.4, 1.4, d * 0.9,
        this._mat('glassroof', () => new THREE.MeshStandardMaterial({ color: 0x5a6b85, roughness: 0.3, metalness: 0.5 })), false);
    }
    // container stacks
    const contMats = ['#c0453c', '#2f6fd0', '#1fae5e', '#d4a53a'].map((hex) =>
      new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.8 }));
    for (let k = 0; k < 5; k++) {
      const sx = cx + rng.range(-12, 12);
      const sz = cz - WORLD.BLOCK / 2 + 5 + rng.range(0, 4);
      const stack = rng.int(1, 3);
      for (let s = 0; s < stack; s++) {
        this._box(parent, sx, 1.3 + s * 2.6, sz, 6.1, 2.5, 2.5, rng.pick(contMats));
      }
      this.collidables.push({ x: sx, z: sz, hw: 3.1, hz: 1.3 });
    }
  }

  _buildPark(i, j, cx, cz, parent) {
    const grass = this._mat('parkGrass', () => new THREE.MeshStandardMaterial({
      color: COLORS.grassDark, roughness: 1,
    }));
    this._box(parent, cx, 0.26, cz, WORLD.BLOCK - 13, 0.06, WORLD.BLOCK - 13, grass, false);
    // big plaza + fountain in the SE corner cell of the park
    if (i === WORLD.PARK.i1 && j === WORLD.PARK.j1) {
      const stone = this._mat('stone', () => new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.85 }));
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 1.1, 22), stone);
      pool.position.set(cx, 0.6, cz);
      pool.castShadow = true;
      pool.matrixAutoUpdate = false; pool.updateMatrix();
      parent.add(pool);
      const jet = new THREE.Mesh(new THREE.ConeGeometry(1.3, 5, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5 }));
      jet.position.set(cx, 3.6, cz);
      parent.add(jet);
      this.fountainJet = jet;
      this.collidables.push({ x: cx, z: cz, hw: 5.6, hz: 5.6 });
      this.landmarks.push({ x: cx, z: cz, name: 'Central Park Fountain' });
    }
    // pond in the NW cell
    if (i === WORLD.PARK.i0 && j === WORLD.PARK.j0) {
      const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 24),
        this._mat('pond', () => new THREE.MeshStandardMaterial({
          color: COLORS.water, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.9,
        })));
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(cx, 0.3, cz);
      pond.matrixAutoUpdate = false; pond.updateMatrix();
      parent.add(pond);
      this.landmarks.push({ x: cx, z: cz, name: 'The Pond' });
    }
    // rocks + benches
    const rockMat = this._mat('rock', () => new THREE.MeshStandardMaterial({ color: 0x6d7684, roughness: 1 }));
    for (let k = 0; k < 3; k++) {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(this.rng.range(1, 2.2), 0), rockMat);
      rock.position.set(cx + this.rng.range(-12, 12), 0.6, cz + this.rng.range(-12, 12));
      rock.castShadow = true;
      rock.matrixAutoUpdate = false; rock.updateMatrix();
      parent.add(rock);
    }
  }

  _buildPlaza(cx, cz, parent) {
    const deckMat = this._mat('deck', () => new THREE.MeshStandardMaterial({ color: 0x4a5468, roughness: 0.9 }));
    this._box(parent, cx, 6.4, cz, WORLD.BLOCK - 12, 0.5, WORLD.BLOCK - 10, deckMat);
    const planterMat = this._mat('planter', () => new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 1 }));
    for (const [dx, dz] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
      this._box(parent, cx + dx, 7, cz + dz, 3, 1.2, 3, planterMat);
      this._treeSpots.push({ x: cx + dx, z: cz + dz, s: 1.1, y: 6.65 });
    }
  }

  // ───────── bridges ─────────
  _buildBridges() {
    for (const e of this.edges) {
      if (!e.bridge) continue;
      const a = this.nodes[e.a], b = this.nodes[e.b];
      const cxm = (a.x + b.x) / 2, czm = (a.z + b.z) / 2;
      const len = WORLD.BLOCK;
      const w = e.width;
      const railMat = this._mat('bridgeRail', () => new THREE.MeshStandardMaterial({
        color: 0x8a2f24, roughness: 0.6, metalness: 0.4,
      }));
      // deck already exists as a road; add railings + walkways
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, len), railMat);
        rail.position.set(cxm, 0.6, czm + side * (w / 2 + 0.4));
        rail.castShadow = true;
        rail.matrixAutoUpdate = false; rail.updateMatrix();
        this.group.add(rail);
        this.collidables.push({ x: cxm, z: rail.position.z, hw: 0.5, hz: len / 2 });
      }
      if (!e.suspension) {
        // beam bridge: pillars under deck
        for (const dz of [-len / 4, len / 4]) {
          for (const side of [-1, 1]) {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 4, 8), railMat);
            pillar.position.set(cxm + side * (w / 2 - 1), -1.6, czm + dz);
            pillar.matrixAutoUpdate = false; pillar.updateMatrix();
            this.group.add(pillar);
          }
        }
        continue;
      }
      // ── suspension bridge (towers + cables + hangers) ──
      const towerMat = this._mat('bridgeTower', () => new THREE.MeshStandardMaterial({
        color: 0x9a4a3a, roughness: 0.65, metalness: 0.35,
      }));
      const cableMat = this._mat('cable', () => new THREE.MeshStandardMaterial({
        color: 0xd8dee9, roughness: 0.4, metalness: 0.7,
      }));
      for (const tz of [-len / 3.2, len / 3.2]) {
        for (const side of [-1, 1]) {
          const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 26, 1.6), towerMat);
          tower.position.set(cxm + side * (w / 2 - 0.5), 13, czm + tz);
          tower.castShadow = true;
          tower.matrixAutoUpdate = false; tower.updateMatrix();
          this.group.add(tower);
        }
        // cross beam
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, 1.4), towerMat);
        beam.position.set(cxm, 22, czm + tz);
        beam.matrixAutoUpdate = false; beam.updateMatrix();
        this.group.add(beam);
      }
      // main cables (catenary approximated with quadratic bezier)
      for (const side of [-1, 1]) {
        const x = cxm + side * (w / 2 + 0.4);
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(x, 2, czm - len / 2),
          new THREE.Vector3(x, 24, czm),
          new THREE.Vector3(x, 2, czm + len / 2)
        );
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.22, 6), cableMat);
        tube.matrixAutoUpdate = false; tube.updateMatrix();
        this.group.add(tube);
        // hangers
        for (let t = 0.12; t < 0.9; t += 0.13) {
          const pt = curve.getPoint(t);
          const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, pt.y - 1.2, 4), cableMat);
          hanger.position.set(x, (pt.y + 1.2) / 2, pt.z);
          hanger.matrixAutoUpdate = false; hanger.updateMatrix();
          this.group.add(hanger);
        }
      }
    }
    // landmark markers
    const b1 = WORLD.BRIDGE_J[0], b2 = WORLD.BRIDGE_J[1];
    this.landmarks.push({ x: (WORLD.roadX(WORLD.RIVER_I) + WORLD.roadX(WORLD.RIVER_I + 1)) / 2, z: WORLD.roadZ(b1), name: 'Suspension Bridge North' });
    this.landmarks.push({ x: (WORLD.roadX(WORLD.RIVER_I) + WORLD.roadX(WORLD.RIVER_I + 1)) / 2, z: WORLD.roadZ(b2), name: 'Suspension Bridge South' });
  }

  // ───────── tunnel ─────────
  _buildTunnel() {
    const { i, j } = WORLD.TUNNEL_EDGE;
    const x0 = WORLD.roadX(i), x1 = WORLD.roadX(i + 1);
    const z = WORLD.roadZ(j);
    const cx = (x0 + x1) / 2;
    const len = WORLD.BLOCK - 14;
    const wallMat = this._mat('tunnelWall', () => new THREE.MeshStandardMaterial({
      color: 0x333d4f, roughness: 0.9,
    }));
    const h = 5.4;
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.8), wallMat);
      wall.position.set(cx, h / 2, z + side * (WORLD.ROAD_W / 2 + 0.4));
      wall.castShadow = true; wall.receiveShadow = true;
      wall.matrixAutoUpdate = false; wall.updateMatrix();
      this.group.add(wall);
      this.collidables.push({ x: cx, z: wall.position.z, hw: len / 2, hz: 0.7 });
    }
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, WORLD.ROAD_W + 1.6), wallMat);
    ceil.position.set(cx, h + 0.6, z);
    ceil.castShadow = true;
    ceil.matrixAutoUpdate = false; ceil.updateMatrix();
    this.group.add(ceil);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff });
    for (const dz of [-3, 0, 3]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(len - 5, 0.15, 0.5), lightMat);
      strip.position.set(cx, h - 0.15, z + dz);
      strip.matrixAutoUpdate = false; strip.updateMatrix();
      this.group.add(strip);
    }
    const portalMat = this._mat('portal', () => new THREE.MeshStandardMaterial({ color: 0x2a3345, roughness: 0.9 }));
    for (const side of [-1, 1]) {
      const px = side === -1 ? x0 + WORLD.ROAD_W / 2 + 4 : x1 - WORLD.ROAD_W / 2 - 4;
      const portal = new THREE.Mesh(new THREE.BoxGeometry(1.6, h + 1.4, WORLD.ROAD_W + 3.4), portalMat);
      portal.position.set(px, (h + 1.4) / 2, z);
      portal.castShadow = true;
      portal.matrixAutoUpdate = false; portal.updateMatrix();
      this.group.add(portal);
      for (const sz of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3),
          new THREE.MeshBasicMaterial({ color: COLORS.neonAmber }));
        edge.position.set(px - side * 0.9, h / 2, z + sz * (WORLD.ROAD_W / 2 + 1));
        edge.matrixAutoUpdate = false; edge.updateMatrix();
        this.group.add(edge);
      }
    }
  }

  // ───────── traffic signals (instanced) ─────────
  _buildSignals() {
    const lampCount = this.nodes.length * 2;
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.6, 6);
    const poleMat = this._mat('sigPole', () => new THREE.MeshStandardMaterial({
      color: 0x3c4658, roughness: 0.6, metalness: 0.5,
    }));
    this.sigPoles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
    const lampGeo = new THREE.SphereGeometry(0.32, 8, 8);
    this.sigLamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), lampCount);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    this._sigColors = { g: new THREE.Color(COLORS.green), y: new THREE.Color(COLORS.amber), r: new THREE.Color(COLORS.red) };

    this.nodes.forEach((node, idx) => {
      const { x, z } = node;
      const off = Math.max(WORLD.vWidth(node.i), WORLD.hWidth(node.j)) / 2 + 1.4;
      const nsPos = new THREE.Vector3(x + off, 4.4, z - off);
      const ewPos = new THREE.Vector3(x - off, 4.4, z + off);
      for (const [k, pos] of [[0, nsPos], [1, ewPos]]) {
        p.copy(pos); m.compose(p, q, s);
        this.sigPoles.setMatrixAt(idx * 2 + k, m);
        p.set(pos.x, 4.1, pos.z); m.compose(p, q, s);
        this.sigLamps.setMatrixAt(idx * 2 + k, m);
      }
      const headMat = this._mat('sigHead', () => new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.7 }));
      for (const pos of [nsPos, ewPos]) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.15, 0.55), headMat);
        head.position.set(pos.x + 0.35, 4.1, pos.z);
        head.matrixAutoUpdate = false; head.updateMatrix();
        this.group.add(head);
      }
      const phaseOffset = ((node.i * 3.1 + node.j * 5.7) % 19.1);
      const st0 = this._signalPhase(phaseOffset);
      node.sig = { t: phaseOffset, ns: st0.ns, ew: st0.ew, idx };
      this._applySignalColor(node, 'ns', st0.ns);
      this._applySignalColor(node, 'ew', st0.ew);
    });
    this.sigPoles.instanceMatrix.needsUpdate = true;
    this.sigLamps.instanceMatrix.needsUpdate = true;
    this.sigPoles.castShadow = true;
    this.group.add(this.sigPoles, this.sigLamps);
  }

  _applySignalColor(node, which, state) {
    const idx = node.sig.idx * 2 + (which === 'ns' ? 0 : 1);
    this.sigLamps.setColorAt(idx, this._sigColors[state]);
    if (this.sigLamps.instanceColor) this.sigLamps.instanceColor.needsUpdate = true;
  }

  _signalPhase(t) {
    const g = SIG_CYCLE.g, y = SIG_CYCLE.y, r = SIG_CYCLE.r;
    const cyc = (g + y + r) * 2;
    const tt = ((t % cyc) + cyc) % cyc;
    if (tt < g) return { ns: 'g', ew: 'r' };
    if (tt < g + y) return { ns: 'y', ew: 'r' };
    if (tt < g + y + r) return { ns: 'r', ew: 'r' };
    if (tt < g + y + r + g) return { ns: 'r', ew: 'g' };
    if (tt < g + y + r + g + y) return { ns: 'r', ew: 'y' };
    return { ns: 'r', ew: 'r' };
  }

  signalAt(node, axis) {
    return axis === 'z' ? node.sig.ns : node.sig.ew;
  }

  // ───────── streetlights ─────────
  _buildStreetlights() {
    const positions = [];
    const spacing = 32;
    for (const e of this.edges) {
      if (e.tunnel) continue;
      const a = this.nodes[e.a], b = this.nodes[e.b];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      const n = Math.floor(len / spacing);
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const px = a.x + dx * t, pz = a.z + dz * t;
        const nx = -dz / len, nz = dx / len;
        const side = (k % 2 === 0) ? 1 : -1;
        const off = e.width / 2 + 1.2;
        positions.push({ x: px + nx * side * off, z: pz + nz * side * off, side: nx * side, sideZ: nz * side });
      }
    }
    this.lampPositions = positions;

    const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 5.2, 6);
    const poleMat = this._mat('lampPole', () => new THREE.MeshStandardMaterial({
      color: 0x37414f, roughness: 0.6, metalness: 0.4,
    }));
    this.lampHeadMat = new THREE.MeshBasicMaterial({ color: 0x3a3f4a });
    const armGeo = new THREE.BoxGeometry(1.4, 0.1, 0.1);
    const headGeo = new THREE.BoxGeometry(0.8, 0.18, 0.34);
    this.lampPoles = new THREE.InstancedMesh(poleGeo, poleMat, positions.length);
    this.lampArms = new THREE.InstancedMesh(armGeo, poleMat, positions.length);
    this.lampHeads = new THREE.InstancedMesh(headGeo, this.lampHeadMat, positions.length);
    const m = new THREE.Matrix4(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    positions.forEach((lp, idx) => {
      p.set(lp.x, 2.6, lp.z); m.compose(p, rot, s);
      this.lampPoles.setMatrixAt(idx, m);
      const ax = lp.x - lp.side * 0.7, az = lp.z - lp.sideZ * 0.7;
      rot.setFromEuler(new THREE.Euler(0, Math.atan2(-lp.side, -lp.sideZ), 0));
      p.set(ax, 5.15, az); m.compose(p, rot, s);
      this.lampArms.setMatrixAt(idx, m);
      p.set(lp.x - lp.side * 1.3, 5.05, lp.z - lp.sideZ * 1.3);
      m.compose(p, rot, s);
      this.lampHeads.setMatrixAt(idx, m);
      rot.identity();
    });
    for (const im of [this.lampPoles, this.lampArms, this.lampHeads]) {
      im.instanceMatrix.needsUpdate = true;
      im.matrixAutoUpdate = false;
      this.group.add(im);
    }
  }

  _buildLampLights() {
    this.lampLights = [];
    for (let k = 0; k < 8; k++) {
      const l = new THREE.PointLight(0xffc98a, 0, 22, 2);
      l.position.y = 4.9;
      this.group.add(l);
      this.lampLights.push(l);
    }
  }

  // ───────── trees (instanced) ─────────
  _buildTrees() {
    const rng = this.rng;
    // park dense
    for (let i = WORLD.PARK.i0; i <= WORLD.PARK.i1; i++) {
      for (let j = WORLD.PARK.j0; j <= WORLD.PARK.j1; j++) {
        const { x: cx, z: cz } = this.cellCenter(i, j);
        for (let k = 0; k < 14; k++) {
          this._treeSpots.push({ x: cx + rng.range(-15, 15), z: cz + rng.range(-15, 15), s: rng.range(0.9, 1.6) });
        }
      }
    }
    // brooklyn yards
    for (let i = 0; i < WORLD.NX; i++) {
      for (let j = 0; j < WORLD.NZ; j++) {
        const d = this.districtOf(i, j);
        if (d !== 'brooklyn' && d !== 'heights') continue;
        const { x: cx, z: cz } = this.cellCenter(i, j);
        for (let k = 0; k < 3; k++) {
          if (rng.chance(0.4)) this._treeSpots.push({ x: cx + rng.range(-16, 16), z: cz + rng.range(-16, 16), s: rng.range(0.7, 1.2) });
        }
      }
    }

    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 6);
    const trunkMat = this._mat('trunk', () => new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }));
    const canGeo = new THREE.IcosahedronGeometry(1.15, 0);
    const canMat = this._mat('canopy', () => new THREE.MeshStandardMaterial({ color: 0x2e6b45, roughness: 1 }));
    this.treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, this._treeSpots.length);
    this.treeCanopies = new THREE.InstancedMesh(canGeo, canMat, this._treeSpots.length);
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    this._treeSpots.forEach((t, idx) => {
      const y = t.y || 0.24;
      p.set(t.x, y + 0.8 * t.s, t.z); s.setScalar(t.s); m.compose(p, q, s);
      this.treeTrunks.setMatrixAt(idx, m);
      p.set(t.x, y + (1.6 + 0.7) * t.s, t.z); s.setScalar(t.s * 1.2); m.compose(p, q, s);
      this.treeCanopies.setMatrixAt(idx, m);
    });
    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeCanopies.instanceMatrix.needsUpdate = true;
    this.treeCanopies.castShadow = true;
    this.treeTrunks.matrixAutoUpdate = false;
    this.treeCanopies.matrixAutoUpdate = false;
    this.group.add(this.treeTrunks, this.treeCanopies);
  }

  // ───────── POIs: gas / garage / dealer / police / lots / subway / signs ─────────
  _buildPOIDetails(i, j, cx, cz, parent) {
    const gasCells = { '4-9': 0, '11-3': 0, '13-7': 0 };
    const lotCells = { '3-4': 0, '10-5': 0, '12-9': 0 };
    const key = `${i}-${j}`;
    if (key in gasCells) {
      const gz = WORLD.roadZ(j) + WORLD.ROAD_W / 2 + 6;
      this._buildGasStation(cx, gz, parent);
    } else if (key === '1-6') {
      this._buildGarage(cx, cz, parent);
    } else if (key === '1-7') {
      this._buildDealer(cx, cz, parent);
    } else if (key === '6-10') {
      this._buildPolice(cx, cz, parent);
    } else if (key in lotCells) {
      this._buildLot(cx, cz, parent);
    } else if (key === `${WORLD.PLAZA_CELL[0]}-${WORLD.PLAZA_CELL[1]}`) {
      this._buildPlaza(cx, cz, parent);
    }
  }

  _buildRoamPOIs() {
    const c = (i, j) => this.cellCenter(i, j);
    const ts = c(WORLD.TIMES.i0, WORLD.TIMES.j0);
    const park = c(WORLD.PARK.i0 + 1, WORLD.PARK.j1 + 1);   // just south of the park
    const fin = c(4, 10);
    const dumbo = c(WORLD.DUMBO.i0, WORLD.DUMBO.j0);
    const bk = c(11, 5);
    this.roamPOIs = [
      { type: 'roam-race', x: ts.x, z: ts.z + 14, name: 'Times Square Race' },
      { type: 'roam-race', x: dumbo.x, z: dumbo.z - 14, name: 'Docks Race' },
      { type: 'roam-trial', x: park.x, z: park.z + 14, name: 'Park Time Trial' },
      { type: 'roam-taxi', x: fin.x, z: fin.z - 14, name: 'Financial Fare' },
      { type: 'roam-taxi', x: bk.x, z: bk.z + 14, name: 'Brooklyn Fare' },
      { type: 'roam-delivery', x: dumbo.x + 8, z: dumbo.z, name: 'DUMBO Courier' },
    ];
  }

  _buildGarage(cx, cz, parent) {
    const wallMat = this._mat('garageWall', () => new THREE.MeshStandardMaterial({ color: 0x3c4356, roughness: 0.8 }));
    this._box(parent, cx + 4, 3.7, cz + 4, 18, 7, 14, wallMat);
    this.collidables.push({ x: cx + 4, z: cz + 4, hw: 9.2, hz: 7.2 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x565f73, roughness: 0.6, metalness: 0.4 }));
    door.position.set(cx + 4, 2.4, cz - 3.05);
    door.rotation.y = Math.PI;
    door.matrixAutoUpdate = false; door.updateMatrix();
    parent.add(door);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4),
      new THREE.MeshBasicMaterial({ map: signTexture('GARAGE', '#f59e0b'), transparent: true }));
    sign.position.set(cx + 4, 6.4, cz - 3.1);
    sign.rotation.y = Math.PI;
    sign.matrixAutoUpdate = false; sign.updateMatrix();
    parent.add(sign);
    this.neonSigns.push({ mesh: sign, base: 1 });
    const padX = cx + 2, padZ = WORLD.roadZ(6) + WORLD.ROAD_W / 2 + 2.2;
    this._pad(parent, padX, padZ, 7, 5, COLORS.neonAmber);
    this.garage = { x: padX, z: padZ, r: 5.5 };
    this.landmarks.push({ x: cx + 2, z: cz - 8, name: 'Garage Plaza' });
  }

  _buildDealer(cx, cz, parent) {
    const glass = new THREE.MeshStandardMaterial({
      color: 0x9fc8ee, roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.5,
    });
    this._box(parent, cx, 3.5, cz + 3, 20, 6.5, 13, glass);
    this.collidables.push({ x: cx, z: cz + 3, hw: 10.2, hz: 6.7 });
    this._box(parent, cx, 6.9, cz + 3, 22, 0.6, 15,
      this._mat('dealerRoof', () => new THREE.MeshStandardMaterial({ color: 0x2a3242, roughness: 0.7 })));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3),
      new THREE.MeshBasicMaterial({ map: signTexture('TORO MOTORS NYC', '#00d4ff'), transparent: true }));
    sign.position.set(cx, 8.6, cz + 3);
    sign.matrixAutoUpdate = false; sign.updateMatrix();
    parent.add(sign);
    this.neonSigns.push({ mesh: sign, base: 1 });
    const padX = cx, padZ = WORLD.roadZ(7) + WORLD.ROAD_W / 2 + 2.2;
    this._pad(parent, padX, padZ, 7, 5, COLORS.neonCyan);
    this.dealer = { x: padX, z: padZ, r: 5.5 };
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.5, 20),
      this._mat('spinner', () => new THREE.MeshStandardMaterial({ color: 0x39445c, metalness: 0.6, roughness: 0.35 })));
    platform.position.set(cx, 0.5, cz + 3);
    platform.matrixAutoUpdate = false; platform.updateMatrix();
    parent.add(platform);
  }

  _buildPolice(cx, cz, parent) {
    const wallMat = this._mat('policeWall', () => new THREE.MeshStandardMaterial({ color: 0x35415e, roughness: 0.8 }));
    this._box(parent, cx, 4.2, cz + 3, 20, 8, 14, wallMat);
    this.collidables.push({ x: cx, z: cz + 3, hw: 10.2, hz: 7.2 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.6),
      new THREE.MeshBasicMaterial({ map: signTexture('NYPD PRECINCT', '#3b82f6'), transparent: true }));
    sign.position.set(cx, 7.2, cz - 4.05);
    sign.rotation.y = Math.PI;
    sign.matrixAutoUpdate = false; sign.updateMatrix();
    parent.add(sign);
    this.neonSigns.push({ mesh: sign, base: 1 });
    this.policeStation = { x: cx, z: cz - 8 };
    this._pad(parent, cx, cz - 8, 7, 5, COLORS.policeBlue);
    this.landmarks.push({ x: cx, z: cz - 8, name: 'Police Precinct' });
  }

  _buildLot(cx, cz, parent) {
    const lotMat = this._mat('lot', () => new THREE.MeshStandardMaterial({ color: 0x272c35, roughness: 0.95 }));
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), lotMat);
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(cx, 0.03, cz);
    lot.receiveShadow = true;
    lot.matrixAutoUpdate = false; lot.updateMatrix();
    parent.add(lot);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0xaab4c4 });
    const slotSpots = [];
    for (let k = -3; k <= 3; k++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 5.5), slotMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(cx + k * 3.2, 0.045, cz - 4);
      line.matrixAutoUpdate = false; line.updateMatrix();
      parent.add(line);
      if (k > -3) slotSpots.push({ x: cx + (k - 0.5) * 3.2, z: cz - 4, heading: Math.PI });
    }
    this.parkingZones.push({ x: cx, z: cz + 4.5, heading: 0 });
    this.mapSegs.push({ x1: cx - 12, z1: cz, x2: cx + 12, z2: cz, w: 2, highway: false });
    // borrowable cars (created as data; meshes by game/parked visuals)
    const styles = ['sedan', 'hatch', 'suv'];
    for (let k = 0; k < slotSpots.length; k += 3) {
      this.parkedCars.push({ ...slotSpots[k], style: styles[(k / 3) % styles.length] });
    }
  }

  _buildGasStation(x, z, parent) {
    const canopyMat = this._mat('canopy', () => new THREE.MeshStandardMaterial({ color: 0x2e3748, roughness: 0.7 }));
    this._box(parent, x, 5, z, 13, 0.6, 9, canopyMat);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.25, 9.4),
      new THREE.MeshBasicMaterial({ color: COLORS.neonCyan }));
    trim.position.set(x, 4.65, z);
    trim.matrixAutoUpdate = false; trim.updateMatrix();
    parent.add(trim);
    for (const [dx, dz] of [[-5.4, -3.4], [5.4, -3.4], [-5.4, 3.4], [5.4, 3.4]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.8, 6),
        this._mat('pillar', () => new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 })));
      p.position.set(x + dx, 2.4, z + dz);
      p.matrixAutoUpdate = false; p.updateMatrix();
      parent.add(p);
    }
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x18324a, emissive: 0x00d4ff, emissiveIntensity: 0.5 });
    for (const dz of [-1.4, 1.4]) {
      this._box(parent, x, 0.95, z + dz, 1, 1.5, 2, pumpMat);
    }
    this._pad(parent, x, z, 6.4, 5, COLORS.neonCyan);
    this.gasStations.push({ x, z, r: 6 });
  }

  _pad(parent, x, z, w, d, color) {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.04, z);
    pad.matrixAutoUpdate = false; pad.updateMatrix();
    parent.add(pad);
  }

  // subway entrances + street name signs
  _buildSubwayAndSigns() {
    const subwayMat = this._mat('subway', () => new THREE.MeshStandardMaterial({
      color: 0x2a4a35, roughness: 0.7, metalness: 0.3,
    }));
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x2e8b57 });
    const spots = [[2, 5], [5, 6], [4, 8], [6, 10], [10, 7], [12, 4], [3, 10], [9, 9]];
    for (const [i, j] of spots) {
      const { x: cx, z: cz } = this.cellCenter(i, j);
      const sx = cx - 12, sz = WORLD.roadZ(j) + WORLD.ROAD_W / 2 + 2;
      const parent = this._chunkGroupFor(i, j);
      // railing box around a dark stair hole
      this._box(parent, sx, 0.55, sz, 3.6, 0.16, 2.6, subwayMat, false);
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(3, 2),
        new THREE.MeshBasicMaterial({ color: 0x05070c }));
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(sx, 0.62, sz);
      hole.matrixAutoUpdate = false; hole.updateMatrix();
      parent.add(hole);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), globeMat);
      globe.position.set(sx + 1.6, 1.4, sz - 1.2);
      globe.matrixAutoUpdate = false; globe.updateMatrix();
      parent.add(globe);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), subwayMat);
      pole.position.set(sx + 1.6, 0.8, sz - 1.2);
      pole.matrixAutoUpdate = false; pole.updateMatrix();
      parent.add(pole);
    }
    // street name signs at selected intersections
    const signPole = this._mat('signPole', () => new THREE.MeshStandardMaterial({
      color: 0x5a6472, roughness: 0.6, metalness: 0.5,
    }));
    const intersections = [[2, 5], [6, 5], [4, 8], [6, 10], [10, 8], [2, 10], [12, 4], [6, 2]];
    for (const [i, j] of intersections) {
      const node = this.nodes[this.nodeId(i, j)];
      const off = Math.max(WORLD.vWidth(i), WORLD.hWidth(j)) / 2 + 1.8;
      const parent = this._chunkGroupFor(i, j);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 6), signPole);
      pole.position.set(node.x + off, 2, node.z + off);
      pole.matrixAutoUpdate = false; pole.updateMatrix();
      parent.add(pole);
      const mkPlate = (text, y, rotY, dx, dz) => {
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7),
          new THREE.MeshBasicMaterial({ map: signTexture(text, '#d8dee9', true), transparent: true, side: THREE.DoubleSide }));
        plate.position.set(node.x + off + dx, y, node.z + off + dz);
        plate.rotation.y = rotY;
        plate.matrixAutoUpdate = false; plate.updateMatrix();
        parent.add(plate);
      };
      mkPlate(AVENUE_NAMES[i] || '', 3.4, 0, 1.75, 0);
      mkPlate(STREET_NAMES[j] || '', 3.0, Math.PI / 2, 0, 1.75);
    }
  }

  _buildSteamVents() {
    const spots = [[4, 5], [6, 6], [3, 8], [5, 10], [11, 7], [10, 9]];
    for (const [i, j] of spots) {
      const node = this.nodes[this.nodeId(i, j)];
      this.steamVents.push({
        x: node.x + this.rng.range(-2, 2),
        z: node.z + this.rng.range(-4, 4),
      });
    }
  }

  _buildBoundary() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3c4658, roughness: 0.7 });
    const t = 0.8, h = 1.6;
    const hx = WORLD.spanX / 2 + 2, hz = WORLD.spanZ / 2 + 2;
    const walls = [
      [WORLD.spanX + 10, t, 0, hz],
      [WORLD.spanX + 10, t, 0, -hz],
      [t, WORLD.spanZ + 10, hx, 0],
      [t, WORLD.spanZ + 10, -hx, 0],
    ];
    for (const [w, d, x, z] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2, z);
      m.matrixAutoUpdate = false; m.updateMatrix();
      this.group.add(m);
      this.collidables.push({ x, z, hw: w / 2, hz: d / 2 });
    }
  }

  // ───────── spatial hash for colliders ─────────
  _buildSpatialHash() {
    this._hash = new Map();
    this._hashCell = 24;
    for (const c of this.collidables) {
      const x0 = Math.floor((c.x - c.hw) / this._hashCell), x1 = Math.floor((c.x + c.hw) / this._hashCell);
      const z0 = Math.floor((c.z - c.hz) / this._hashCell), z1 = Math.floor((c.z + c.hz) / this._hashCell);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const key = cx * 10000 + cz;
          if (!this._hash.has(key)) this._hash.set(key, []);
          this._hash.get(key).push(c);
        }
      }
    }
  }

  addCollider(c) {
    this.collidables.push(c);
    const x0 = Math.floor((c.x - c.hw) / this._hashCell), x1 = Math.floor((c.x + c.hw) / this._hashCell);
    const z0 = Math.floor((c.z - c.hz) / this._hashCell), z1 = Math.floor((c.z + c.hz) / this._hashCell);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const key = cx * 10000 + cz;
        if (!this._hash.has(key)) this._hash.set(key, []);
        this._hash.get(key).push(c);
      }
    }
  }

  removeCollider(c) {
    // used rarely (roadblocks); acceptable O(n)
    const i = this.collidables.indexOf(c);
    if (i >= 0) this.collidables.splice(i, 1);
    this._buildSpatialHash();
  }

  collideNear(x, z) {
    const cx = Math.floor(x / this._hashCell), cz = Math.floor(z / this._hashCell);
    const out = [];
    for (let a = cx - 1; a <= cx + 1; a++) {
      for (let b = cz - 1; b <= cz + 1; b++) {
        const list = this._hash.get(a * 10000 + b);
        if (list) out.push(...list);
      }
    }
    return out;
  }

  // ───────── queries ─────────
  nearestNode(x, z) {
    let best = null, bestD = Infinity;
    for (const n of this.nodes) {
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  isOnRoad(x, z) {
    const { NX, NZ, RIVER_I } = WORLD;
    const riverLo = WORLD.roadX(RIVER_I) - 10;
    const riverHi = WORLD.roadX(RIVER_I + 1) + 10;
    const inRiver = x > riverLo && x < riverHi;
    const iNear = clamp(Math.round((x + WORLD.halfX) / WORLD.BLOCK), 0, NX);
    const jNear = clamp(Math.round((z + WORLD.halfZ) / WORLD.BLOCK), 0, NZ);
    for (let i = Math.max(0, iNear - 1); i <= Math.min(NX, iNear + 1); i++) {
      if (Math.abs(x - WORLD.roadX(i)) < WORLD.vWidth(i) / 2 + 1.5) return true;
    }
    for (let j = Math.max(0, jNear - 1); j <= Math.min(NZ, jNear + 1); j++) {
      if (Math.abs(z - WORLD.roadZ(j)) < WORLD.hWidth(j) / 2 + 1.5) {
        // horizontal roads only cross the river on bridges (ring counts)
        if (inRiver && j !== 0 && j !== NZ && !WORLD.BRIDGE_J.includes(j)) continue;
        return true;
      }
    }
    return false;
  }

  // ───────── runtime ─────────
  setNight(n) {
    this._night = n;
    for (const mat of this.facadeSideMats) mat.emissiveIntensity = n * 1.15;
    this.lampHeadMat.color.setHex(n > 0.35 ? 0xffe2b0 : 0x3a3f4a);
    for (const l of this.lampLights) l.intensity = n > 0.35 ? 26 : 0;
    if (this.litPanesMeshes) {
      for (const m of this.litPanesMeshes) m.visible = n > 0.35;
    }
  }

  setWet(w) {
    this._wet = w;
    this.roadMats.forEach((mat, idx) => {
      mat.roughness = 0.92 - w * 0.58;
      mat.metalness = 0.02 + w * 0.3;
      const c = this._roadBaseColors[idx];
      mat.color.copy(c).multiplyScalar(1 - w * 0.35);
    });
  }

  update(dt, playerPos) {
    this._time += dt;
    // signals
    for (const node of this.nodes) {
      const prev = node.sig;
      const st = this._signalPhase(prev.t + dt);
      if (st.ns !== prev.ns || st.ew !== prev.ew) {
        prev.ns = st.ns; prev.ew = st.ew;
        this._applySignalColor(node, 'ns', st.ns);
        this._applySignalColor(node, 'ew', st.ew);
      }
      prev.t += dt;
    }
    const blink = (Math.sin(this._time * 3) + 1) / 2;
    for (const b of this.beacons) b.material.color.setRGB(0.6 + blink * 0.4, 0.1, 0.1);
    if (this.fountainJet) {
      this.fountainJet.scale.y = 0.85 + Math.sin(this._time * 2.2) * 0.15;
      this.fountainJet.rotation.y += dt * 0.8;
    }
    // water waves
    if (this.water && this._waterBase) {
      const pos = this.water.geometry.attributes.position;
      const arr = pos.array;
      for (let k = 0; k < arr.length; k += 3) {
        arr[k + 2] = Math.sin(this._time * 1.6 + this._waterBase[k] * 0.35 + this._waterBase[k + 1] * 0.2) * 0.14;
      }
      pos.needsUpdate = true;
    }
    // neon flicker
    if (Math.random() < dt * 2) {
      const sign = this.neonSigns[Math.floor(Math.random() * this.neonSigns.length)];
      if (sign) {
        sign.mesh.material.opacity = 0.25;
        setTimeout(() => { sign.mesh.material.opacity = 1; }, 90);
      }
    }
    // billboards (only when Times Square chunk is visible)
    const tsChunk = this._chunkGroupFor(WORLD.TIMES.i0, WORLD.TIMES.j0);
    if (tsChunk.visible) this._updateBillboards(dt);
    // lamp pool
    this._lampLightTimer -= dt;
    if (this._lampLightTimer <= 0 && this._night > 0.35 && this.lampPositions.length) {
      this._lampLightTimer = 0.5;
      const near = this.lampPositions
        .map((lp) => ({ lp, d: (lp.x - playerPos.x) ** 2 + (lp.z - playerPos.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.lampLights.length);
      near.forEach((n, idx) => {
        this.lampLights[idx].position.set(n.lp.x - n.lp.side * 1.3, 4.85, n.lp.z - n.lp.sideZ * 1.3);
      });
    }
    // chunk streaming (2.5 Hz)
    this._chunkTimer -= dt;
    if (this._chunkTimer <= 0) {
      this._chunkTimer = 0.4;
      this.updateChunks(playerPos, this.chunkRadius);
    }
  }
}
