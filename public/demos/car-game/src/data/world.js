// ════════════════════════════════════════════════════════
// WORLD — NYC-inspired layout, districts, day/night and
// weather phases, traffic/pedestrian/police tuning.
// Behavior-heavy (functions + getters), so it stays JS.
// ════════════════════════════════════════════════════════

export const COLORS = {
  road: 0x23272e,
  highway: 0x262b33,
  avenue: 0x25292f,
  roadLineWhite: 0xd8dee9,
  roadLineYellow: 0xd9b23c,
  sidewalk: 0x3a4150,
  sidewalkEdge: 0x4a5364,
  grass: 0x2c5238,
  grassDark: 0x234530,
  water: 0x10394c,
  sand: 0x8a7f5c,
  brick: 0x7d5a4a,
  brownstone: 0x8a6a55,
  buildingA: 0x2b3444,
  neonCyan: 0x00d4ff,
  neonViolet: 0x7c3aed,
  neonPink: 0xf472b6,
  neonGreen: 0x10b981,
  neonAmber: 0xf59e0b,
  neonRed: 0xef4444,
  headlight: 0xeef6ff,
  brakeLight: 0xff2d2d,
  reverseLight: 0xffffff,
  indicator: 0xffa500,
  red: 0xef4444,
  amber: 0xfbbf24,
  green: 0x22c55e,
  policeBlue: 0x3b82f6,
};

// ───────── World grid (New York-inspired) ─────────
// 16×12 cells. East River splits Manhattan (west) from
// Brooklyn (east). Two suspension bridges + two ring
// bridges cross it; one road tunnel runs under a midtown
// plaza. Wide avenues in Manhattan, ring highway on edges.
export const WORLD = {
  BLOCK: 44,
  NX: 16,
  NZ: 12,
  ROAD_W: 14,       // standard street: 2 lanes each way
  HIGH_W: 20,       // highway/ring: 3 lanes each way
  RIVER_I: 8,       // river cell column (east river)
  BRIDGE_J: [3, 8],           // suspension bridges (Manhattan & Brooklyn analogs)
  RING_BRIDGE_J: [0, 12],     // simple beam bridges on the ring highway
  AVENUES: [2, 6],            // wide Manhattan north-south avenues
  BANK_W: 16,                 // river bank roads width (FDR / BQE analogs)
  PARK: { i0: 2, i1: 5, j0: 0, j1: 3 },          // Central Park (4×4 cells)
  TIMES: { i0: 4, i1: 5, j0: 5, j1: 6 },         // Times Square (2×2)
  MIDTOWN: { i0: 2, i1: 7, j0: 4, j1: 7 },
  FINANCIAL: { i0: 2, i1: 7, j0: 9, j1: 11 },
  HEIGHTS: { i0: 9, i1: 11, j0: 6, j1: 9 },      // brownstone Brooklyn
  DUMBO: { i0: 9, i1: 12, j0: 10, j1: 11 },      // docks / warehouses
  TUNNEL_EDGE: { i: 3, j: 7 },                   // covered road under a plaza
  PLAZA_CELL: [3, 7],
  get spanX() { return this.BLOCK * this.NX; },
  get spanZ() { return this.BLOCK * this.NZ; },
  get halfX() { return this.spanX / 2; },
  get halfZ() { return this.spanZ / 2; },
  roadX(i) { return i * this.BLOCK - this.halfX; },
  roadZ(j) { return j * this.BLOCK - this.halfZ; },
  isRing(i, j) { return i === 0 || i === this.NX || j === 0 || j === this.NZ; },
  /** Road width for a vertical line i. */
  vWidth(i) {
    if (this.isRing(i, -1)) return this.HIGH_W;
    if (this.AVENUES.includes(i)) return 19;
    if (i === this.RIVER_I || i === this.RIVER_I + 1) return this.BANK_W;
    return this.ROAD_W;
  },
  /** Road width for a horizontal line j. */
  hWidth(j) {
    if (this.isRing(-1, j)) return this.HIGH_W;
    if (this.BRIDGE_J.includes(j)) return 18;
    if (j === 5) return 18; // crosstown "42nd" analog
    return this.ROAD_W;
  },
};

export const LANES = {
  // lane centers from road centerline, right-hand traffic
  lanesFor(width) {
    if (width >= 19) return [1.7, 5.1, 8.5];
    if (width >= 16) return [1.9, 5.7];
    return [1.75, 5.25];
  },
};

// Districts: geometry → gameplay (traffic density, building style, peds)
export const DISTRICTS = {
  river:     { label: 'East River',    traffic: 0.0,  peds: 0.0 },
  park:      { label: 'Central Park',  traffic: 0.55, peds: 1.4 },
  times:     { label: 'Times Square',  traffic: 1.5,  peds: 2.0 },
  midtown:   { label: 'Midtown',       traffic: 1.7,  peds: 1.6 },
  financial: { label: 'Financial District', traffic: 1.6, peds: 1.3 },
  mhattan:   { label: 'Lower Manhattan', traffic: 1.35, peds: 1.2 },
  westside:  { label: 'West Side',     traffic: 1.0,  peds: 0.9 },
  heights:   { label: 'Brooklyn Heights', traffic: 0.9, peds: 1.0 },
  brooklyn:  { label: 'Brooklyn',      traffic: 0.8,  peds: 0.9 },
  dumbo:     { label: 'DUMBO Docks',   traffic: 0.6,  peds: 0.5 },
};

// ───────── Day / night ─────────
export const TIME = {
  CYCLE: 300,               // seconds per full day (5 min)
  startHour: 9.5,
  presets: [
    { t: 0.00, sky: 0x0a1120, fog: 0x0a1120, sun: 0.10, sunCol: 0x8fb4ff, amb: 0.22, name: 'night'  },
    { t: 0.16, sky: 0x1a2340, fog: 0x1a2340, sun: 0.15, sunCol: 0x9fb8e8, amb: 0.28, name: 'dawn'   },
    { t: 0.22, sky: 0x9a6a4a, fog: 0xb08a68, sun: 0.55, sunCol: 0xffc98a, amb: 0.45, name: 'sunrise'},
    { t: 0.30, sky: 0x8fc3ea, fog: 0xb8d8ee, sun: 1.05, sunCol: 0xfff2d8, amb: 0.62, name: 'morning'},
    { t: 0.50, sky: 0x9fd0f2, fog: 0xc8e2f4, sun: 1.15, sunCol: 0xffffff, amb: 0.66, name: 'noon'   },
    { t: 0.70, sky: 0x8fc0e8, fog: 0xb5d5ea, sun: 0.95, sunCol: 0xffe8c0, amb: 0.6,  name: 'afternoon' },
    { t: 0.78, sky: 0xd97a4a, fog: 0xd99a6a, sun: 0.6,  sunCol: 0xff9a52, amb: 0.45, name: 'sunset' },
    { t: 0.84, sky: 0x4a2e56, fog: 0x3a2a4a, sun: 0.25, sunCol: 0xc080d0, amb: 0.3,  name: 'dusk'   },
    { t: 0.90, sky: 0x141c30, fog: 0x121a2c, sun: 0.12, sunCol: 0x8fb4ff, amb: 0.24, name: 'night'  },
    { t: 1.00, sky: 0x0a1120, fog: 0x0a1120, sun: 0.10, sunCol: 0x8fb4ff, amb: 0.22, name: 'night'  },
  ],
  nightFactor(t) {
    if (t < 0.16) return 1;
    if (t < 0.26) return 1 - (t - 0.16) / 0.10;
    if (t < 0.76) return 0;
    if (t < 0.90) return (t - 0.76) / 0.14;
    return 1;
  },
};

// ───────── Weather (cloud factor dims the sky; rain wets roads) ─────────
export const WEATHER_PHASES = [
  { id: 'clear', dur: [80, 160], rain: 0,   fogFar: 1.0,  cloud: 0.0, label: 'Clear' },
  { id: 'cloudy', dur: [60, 120], rain: 0,  fogFar: 0.88, cloud: 0.7, label: 'Cloudy' },
  { id: 'rain',  dur: [50, 100], rain: 0.6, fogFar: 0.62, cloud: 0.85, label: 'Rain'  },
  { id: 'heavy', dur: [40, 70],  rain: 1.0, fogFar: 0.45, cloud: 1.0, label: 'Heavy Rain' },
  { id: 'fog',   dur: [45, 80],  rain: 0,   fogFar: 0.35, cloud: 0.5, label: 'Fog'   },
  { id: 'storm', dur: [40, 70],  rain: 1.0, fogFar: 0.5,  cloud: 1.0, label: 'Storm' },
];

// ───────── Traffic / peds / police ─────────
export const TRAFFIC_CONF = {
  maxCars: 20,
  spawnMin: 55,
  spawnMax: 135,
  despawn: 175,
  accel: 9,
  citySpeed: 12,
  avenueSpeed: 15,
  highwaySpeed: 22,
  bankSpeed: 17,
  busSpeed: 10, truckSpeed: 11,
  gap: 9,
  lightStop: 6.5,
  crosswalkStop: 9,     // brake for pedestrians near crosswalks
  types: [
    { style: 'sedan',     w: 34, police: false },
    { style: 'hatch',     w: 12, police: false },
    { style: 'suv',       w: 9,  police: false },
    { style: 'taxi',      w: 18, police: false },
    { style: 'bus',       w: 6,  police: false },
    { style: 'truck',     w: 6,  police: false },
    { style: 'moto',      w: 5,  police: false },
    { style: 'ambulance', w: 3,  police: false },
    { style: 'fire',      w: 2,  police: false },
    { style: 'police',    w: 5,  police: true },   // patrol cars
  ],
  colors: [0x8a94a6, 0x475569, 0x94a3b8, 0x334155, 0x64748b, 0x1e293b, 0x7dd3fc, 0xa8a29e],
  stalledEventChance: 0.0008,  // per car per second
};

export const PEDS_CONF = {
  count: 34,
  walkSpeed: 1.4,
  fleeSpeed: 4.2,
  fleeRadius: 7,
  hitRadius: 1.35,
  colors: [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xf97316, 0xe2e8f0, 0x64748b],
  pants: [0x1e293b, 0x334155, 0x4c3527, 0x273449, 0x50442f],
};

export const POLICE_CONF = {
  heat: {
    hitCar: 16, hitPed: 130, hitPolice: 160, hitBuilding: 5,
    runRed: 45, speeding: 25, hitProp: 6,
  },
  speedLimitKmh: 95,        // above this, patrols notice
  thresholds: [0, 60, 170, 330, 500, 640],  // heat needed for stars 1-5
  maxPursuers: (stars) => Math.min(7, stars + 1),
  pursuitSpeed: (stars) => 30 + stars * 3.4,
  escapeRadius: 75,
  escapeTime: 13,
  bustedRadius: 6.5,
  bustedSpeed: 1.6,
  bustedTime: 2.6,
  roadblock: { minStars: 3, cooldown: 22, lifetime: 26 },
};
