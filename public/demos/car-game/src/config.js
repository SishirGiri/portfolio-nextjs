// ════════════════════════════════════════════════════════
// CONFIG — NYC-inspired world layout, car catalog (incl.
// the Toro SV hero supercar), customization, missions
// (career + free-roam events), economy, weather, quality.
// Single source of truth.
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

// ───────── Player car catalog ─────────
// speed units ≈ m/s → km/h = ×3.6
export const CARS = [
  {
    id: 'toro', name: 'Toro SV', cls: 'Supercar', style: 'lambo',
    price: 0, levelReq: 0, color: '#f59e0b',
    topSpeed: 62, accel: 19, brake: 34, grip: 0.985, steer: 0.64, reverse: 14,
    nitroCap: 140, weight: 0.9, dims: { w: 2.0, h: 0.46, l: 4.55 },
    desc: 'Lamborghini-inspired AWD V12 wedge. Sharp LEDs, diffuser, and a screaming engine.',
    engine: { base: 88, range: 235, sub: 0.22 },
    drive: 'AWD',
  },
  {
    id: 'corsa', name: 'Corsa Hatch', cls: 'Hatchback', style: 'hatch',
    price: 1200, levelReq: 1, color: '#e11d48',
    topSpeed: 33, accel: 8.0, brake: 26, grip: 0.96, steer: 0.62, reverse: 11,
    nitroCap: 100, weight: 1.0, dims: { w: 1.75, h: 0.62, l: 3.8 },
    desc: 'Cheap, nimble city runabout.',
    engine: { base: 72, range: 150, sub: 0.5 },
    drive: 'FWD',
  },
  {
    id: 'metro', name: 'Metro Sedan', cls: 'Sedan', style: 'sedan',
    price: 4500, levelReq: 1, color: '#38bdf8',
    topSpeed: 39, accel: 9.5, brake: 28, grip: 0.97, steer: 0.60, reverse: 12,
    nitroCap: 100, weight: 1.05, dims: { w: 1.85, h: 0.6, l: 4.6 },
    desc: 'Comfortable daily driver.',
    engine: { base: 68, range: 165, sub: 0.6 },
    drive: 'FWD',
  },
  {
    id: 'ranger', name: 'Ranger SUV', cls: 'SUV', style: 'suv',
    price: 9500, levelReq: 2, color: '#10b981',
    topSpeed: 41, accel: 10.5, brake: 27, grip: 0.99, steer: 0.52, reverse: 12,
    nitroCap: 110, weight: 1.3, dims: { w: 1.98, h: 0.85, l: 4.8 },
    desc: 'Heavy and planted.',
    engine: { base: 60, range: 170, sub: 0.8 },
    drive: 'AWD',
  },
  {
    id: 'vela', name: 'Vela GT', cls: 'Sports', style: 'sports',
    price: 19000, levelReq: 4, color: '#f97316',
    topSpeed: 53, accel: 15.5, brake: 32, grip: 0.93, steer: 0.66, reverse: 13,
    nitroCap: 130, weight: 0.92, dims: { w: 1.9, h: 0.5, l: 4.3 },
    desc: 'Rear-drive drift coupe.',
    engine: { base: 84, range: 200, sub: 0.35 },
    drive: 'RWD',
  },
  {
    id: 'axiom', name: 'Axiom X', cls: 'Hypercar', style: 'super',
    price: 45000, levelReq: 6, color: '#7c3aed',
    topSpeed: 67, accel: 21, brake: 36, grip: 0.95, steer: 0.68, reverse: 14,
    nitroCap: 150, weight: 0.88, dims: { w: 1.95, h: 0.46, l: 4.45 },
    desc: 'The undisputed king of the ring highway.',
    engine: { base: 92, range: 245, sub: 0.25 },
    drive: 'AWD',
  },
];
export const CAR_BY_ID = Object.fromEntries(CARS.map((c) => [c.id, c]));

// ───────── Upgrades (per car, levels 0-3) ─────────
export const UPGRADES = {
  engine:     { name: 'Engine',    icon: '⚙️', costs: [800, 1600, 3200],  topSpeed: 0.04, accel: 0.07 },
  brakes:     { name: 'Brakes',    icon: '🛑', costs: [500, 1000, 2000],  brake: 0.09 },
  suspension: { name: 'Suspension',icon: '🪛', costs: [500, 1000, 2000],  steer: 0.08, stability: 0.1 },
  tires:      { name: 'Tires',     icon: '🛞', costs: [600, 1200, 2400],  grip: 0.04 },
  nitro:      { name: 'Nitro',     icon: '💨', costs: [700, 1400, 2800],  nitroCap: 30, boost: 0.08 },
  transmission: { name: 'Transmission', icon: '🔧', costs: [900, 1800, 3600], accel: 0.05, steer: 0.03 },
};

export const PAINTS = [
  { name: 'Giallo Orion', hex: '#f5b301', metal: 0.75, rough: 0.22 },
  { name: 'Arancio Borealis', hex: '#f56a00', metal: 0.7, rough: 0.25 },
  { name: 'Rosso Mars', hex: '#c81e2e', metal: 0.65, rough: 0.28 },
  { name: 'Verde Selvans', hex: '#1fae5e', metal: 0.7, rough: 0.25 },
  { name: 'Blu Glauco', hex: '#1d6fc2', metal: 0.7, rough: 0.24 },
  { name: 'Viola Pasifae', hex: '#6d3fd4', metal: 0.72, rough: 0.24 },
  { name: 'Nemesis Black', hex: '#15181d', metal: 0.85, rough: 0.3 },
  { name: 'Grigio Telesto', hex: '#6b7280', metal: 0.85, rough: 0.3 },
  { name: 'Bianco Icarus', hex: '#eef2f7', metal: 0.5, rough: 0.32 },
  { name: 'Cyber Cyan', hex: '#00d4ff', metal: 0.7, rough: 0.22 },
];

export const SPOILERS = [
  { name: 'None', price: 0 },
  { name: 'Lip Spoiler', price: 250 },
  { name: 'GT Wing', price: 600 },
];

export const WHEELS = [
  { name: 'Silver Sport', price: 0, rim: 0xc9d2dd, spokes: 5 },
  { name: 'Black Forged', price: 400, rim: 0x23262c, spokes: 5 },
  { name: 'Gold Race', price: 800, rim: 0xd4a53a, spokes: 6 },
];

export const CALIPERS = [
  { name: 'Yellow', price: 0, hex: '#f5c518' },
  { name: 'Red', price: 150, hex: '#e23b3b' },
  { name: 'Black', price: 150, hex: '#1c1f24' },
  { name: 'Blue', price: 150, hex: '#2f6fd0' },
];

export const BODYKITS = [
  { name: 'Stock', price: 0 },
  { name: 'Street Kit', price: 500 },   // canards + side skirts
];

export const EXHAUSTS = [
  { name: 'Twin Tips', price: 0 },
  { name: 'Quad Sport', price: 350 },
  { name: 'Titanium Blue', price: 700 },
];

// ───────── Economy / progression ─────────
export const ECONOMY = {
  repairCostPerHp: 3,
  bustedFinePerStar: 200,
  taxiFareBase: 90,
  vipBase: 260,
  levelXp: (n) => 120 * n * n,
  levelFromXp: (xp) => Math.floor(Math.sqrt(xp / 120)),
  cleanBonus: 60,
  starBonus: 120,
};

export const REWARDS = { missionBase: 150, xpBase: 110 };

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

// ───────── Fuel / damage ─────────
export const STATS = {
  fuelDrainPerSec: 0.55,
  fuelDrainIdle: 0.03,
  nitroDrain: 26,
  nitroRegen: 4.5,
  nitroBoost: 0.65,
  refuelPerSec: 20,
  lowFuel: 22,
  lowHealth: 25,
  tempNormal: 88, tempHot: 118, tempMax: 132,
  tempRise: 3.2, tempCool: 2.4,
};

// ───────── Missions ─────────
// Career chain + free-roam events (roam: true — excluded from
// the career list; started by driving into city markers).
export const MISSIONS = [
  {
    id: 'first-drive', name: 'First Drive', icon: '🚗',
    desc: 'Reach the destination marker downtown.',
    type: 'reach', timeLimit: 0, reward: 200, xp: 100, levelReq: 0,
    params: { minDist: 120 },
  },
  {
    id: 'driving-school', name: 'Driving School', icon: '🎓',
    desc: 'Pass 4 gates under the speed limit, then park.',
    type: 'school', timeLimit: 150, reward: 280, xp: 150, levelReq: 0,
    params: { gates: 4, speedLimit: 30, par: 95 },
  },
  {
    id: 'timed-delivery', name: 'Timed Delivery', icon: '⏱️',
    desc: 'Reach the drop point before the clock runs out.',
    type: 'reach', timeLimit: 55, reward: 320, xp: 180, levelReq: 0,
    params: { minDist: 180 },
  },
  {
    id: 'parking-pro', name: 'Parking Pro', icon: '🅿️',
    desc: 'Park precisely inside both highlighted zones.',
    type: 'parking2', timeLimit: 110, reward: 350, xp: 200, levelReq: 1,
    params: {},
  },
  {
    id: 'taxi-shift', name: 'Taxi Shift', icon: '🚕',
    desc: 'Pick up 3 passengers and drive them to their stops.',
    type: 'taxi', timeLimit: 260, reward: 520, xp: 300, levelReq: 1,
    params: { fares: 3 },
  },
  {
    id: 'package-run', name: 'Package Run', icon: '📦',
    desc: 'Deliver 3 packages across the city. Clock is tight.',
    type: 'package', timeLimit: 165, reward: 480, xp: 280, levelReq: 2,
    params: { drops: 3 },
  },
  {
    id: 'checkpoint-race', name: 'Checkpoint Rush', icon: '🏁',
    desc: 'Blast through 8 checkpoints. Beat par time for 3 stars.',
    type: 'cp-race', timeLimit: 0, reward: 600, xp: 340, levelReq: 2,
    params: { cps: 8, par: 105 },
  },
  {
    id: 'street-race', name: 'Street Race', icon: '🏎️',
    desc: 'Midtown loop against a rival. Finish first.',
    type: 'race', timeLimit: 0, reward: 850, xp: 450, levelReq: 3,
    params: { rival: 0.97 },
  },
  {
    id: 'vip-escort', name: 'VIP Transport', icon: '🤵',
    desc: 'Drive the VIP smoothly — no damage, no drama.',
    type: 'vip', timeLimit: 150, reward: 950, xp: 500, levelReq: 3,
    params: { maxDamage: 25 },
  },
  {
    id: 'car-delivery', name: 'Supercar Delivery', icon: '🚚',
    desc: 'Deliver the Vela GT to the docks without trashing it.',
    type: 'delivery', timeLimit: 130, reward: 900, xp: 480, levelReq: 4,
    params: { car: 'vela', maxDamage: 45 },
  },
  {
    id: 'highway-loop', name: 'Ring Run', icon: '🛣️',
    desc: 'One full lap of the ring highway. Par is 95 seconds.',
    type: 'highway', timeLimit: 0, reward: 700, xp: 380, levelReq: 4,
    params: { par: 95 },
  },
  {
    id: 'police-escape', name: 'Heat Run', icon: '🚓',
    desc: 'You are wanted. Lose the police within 2 minutes.',
    type: 'escape', timeLimit: 120, reward: 800, xp: 420, levelReq: 5,
    params: { stars: 2 },
  },
  {
    id: 'night-tour', name: 'Neon Night Tour', icon: '🌙',
    desc: 'Visit 4 city landmarks before the timer dies.',
    type: 'tour', timeLimit: 210, reward: 1200, xp: 650, levelReq: 5,
    params: {},
  },
  {
    id: 'city-marathon', name: 'City Marathon', icon: '🗺️',
    desc: 'One long run through every district of the city.',
    type: 'tour', timeLimit: 320, reward: 1600, xp: 850, levelReq: 6,
    params: { allDistricts: true },
  },

  // ── free-roam events (started from world markers) ──
  {
    id: 'roam-race', name: 'Street Race (Roam)', icon: '🏁',
    desc: 'Improv street race: 5 checkpoints, beat par.',
    type: 'cp-race', timeLimit: 0, reward: 450, xp: 240, levelReq: 0, roam: true,
    params: { cps: 5, par: 70 },
  },
  {
    id: 'roam-taxi', name: 'Fare (Roam)', icon: '🚕',
    desc: 'One quick taxi fare.',
    type: 'taxi', timeLimit: 110, reward: 260, xp: 140, levelReq: 0, roam: true,
    params: { fares: 1 },
  },
  {
    id: 'roam-trial', name: 'Time Trial (Roam)', icon: '⏱️',
    desc: 'Time trial: 4 checkpoints, tight par.',
    type: 'cp-race', timeLimit: 0, reward: 380, xp: 200, levelReq: 0, roam: true,
    params: { cps: 4, par: 52 },
  },
  {
    id: 'roam-delivery', name: 'Courier (Roam)', icon: '📦',
    desc: 'One package, one shot.',
    type: 'package', timeLimit: 75, reward: 300, xp: 160, levelReq: 0, roam: true,
    params: { drops: 1 },
  },
];

// ───────── Graphics quality ─────────
export const QUALITY_PRESETS = {
  low: {
    label: 'Low', pixelRatio: 1, shadows: false, shadowSize: 1024,
    traffic: 0.55, peds: 0.4, rainCount: 500, bloom: false,
    fogFar: 240, drawCars: 240, chunkRadius: 150,
  },
  medium: {
    label: 'Medium', pixelRatio: 1.5, shadows: true, shadowSize: 1536,
    traffic: 0.8, peds: 0.75, rainCount: 1100, bloom: false,
    fogFar: 330, drawCars: 330, chunkRadius: 210,
  },
  high: {
    label: 'High', pixelRatio: 2, shadows: true, shadowSize: 2048,
    traffic: 1.0, peds: 1.0, rainCount: 1800, bloom: true,
    fogFar: 430, drawCars: 430, chunkRadius: 290,
  },
  ultra: {
    label: 'Ultra', pixelRatio: 2, shadows: true, shadowSize: 2560,
    traffic: 1.2, peds: 1.2, rainCount: 2400, bloom: true,
    fogFar: 500, drawCars: 520, chunkRadius: 360,
  },
};

// ───────── Save ─────────
export const SAVE_KEY = 'cargame_save_v2';
export const SAVE_KEY_V1 = 'cargame_save_v1';

export function defaultCarState(color) {
  return { upgrades: {}, paint: color, spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 };
}

export function defaultSave() {
  return {
    v: 2,
    money: 500,
    xp: 0,
    currentCar: 'toro',
    ownedCars: { toro: defaultCarState('#f5b301') },
    completed: {},           // id -> { stars, bestTime }
    settings: {
      sound: true,
      quality: 'medium',
      transmission: 'auto',
      tractionControl: true,
      volumes: { music: 0.45, engine: 0.8, fx: 0.9, amb: 0.55 },
    },
  };
}

// Camera tuning
export const CAMERA = {
  chase: { dist: 8.8, height: 4.2, lerp: 5.5, fov: 62 },
  close: { dist: 5.7, height: 2.7, lerp: 7.5, fov: 66 },
  hood: { fov: 70 },
  cockpit: { fov: 74 },
  cine: { lerp: 2.2 },
  fovBoost: 12,
  shakeDecay: 6,
};
