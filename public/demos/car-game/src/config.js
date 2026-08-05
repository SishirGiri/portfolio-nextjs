// ════════════════════════════════════════════
// CONFIG — all tunable constants for Car Game
// ════════════════════════════════════════════

export const COLORS = {
  road: 0x1a2030,
  roadLine: 0x3b82f6,
  sidewalk: 0x2a3142,
  grass: 0x0f3d2e,
  buildingA: 0x1e293b,
  buildingB: 0x243044,
  buildingC: 0x18222f,
  neonCyan: 0x00d4ff,
  neonViolet: 0x7c3aed,
  neonPink: 0xf472b6,
  neonGreen: 0x10b981,
  carBody: 0xe11d48,
  carBodyAlt: 0x00d4ff,
  headlight: 0xfff7d6,
  brakeLight: 0xff2d2d,
  red: 0xef4444,
  amber: 0xfbbf24,
  green: 0x10b981,
};

// World / city grid
export const WORLD = {
  blockSize: 40,        // distance between intersections
  blocksX: 6,           // grid width (in blocks)
  blocksZ: 6,           // grid depth
  roadWidth: 12,        // drivable road width
  get size() { return this.blockSize * Math.max(this.blocksX, this.blocksZ); },
  get half() { return this.size / 2; },
};

// Player car physics (arcade-feel, not realistic)
export const CAR = {
  accel: 5,             // forward accel force (slow, gradual build-up)
  brakeForce: 26,       // braking decel
  reverseAccel: 4,      // reverse accel
  maxSpeed: 38,         // raw units/sec — controllable city speed
  maxReverse: 14,
  drag: 0.96,           // velocity damping per frame (coasting)
  steerSpeed: 9,        // how fast the wheel turns (higher = snappier response)
  steerMax: 0.7,        // max steer angle — sharp enough for a controlled 360°
  grip: 0.92,           // lateral grip (higher = less drift)
  handbrakeGrip: 0.65,  // grip when handbraking (drift)
  wheelBase: 2.0,       // distance between axles (shorter = tighter turn radius)
  turnAtSpeedFactor: 1.0, // steering fully effective at all speeds (enables 360 turns)
};

// Fuel / damage
export const STATS = {
  fuelDrainPerSec: 0.45,    // % per second while moving
  fuelDrainIdle: 0.04,
  damageOnCollision: 12,    // per hit (scaled by relative speed)
  refuelPerSec: 22,         // at gas station
  repairPerSec: 20,         // at repair (gas station)
  lowFuelThreshold: 20,
  lowHealthThreshold: 25,
};

// Traffic
export const TRAFFIC = {
  maxCars: 6,
  spawnDistance: 120,       // spawn beyond this from player
  despawnDistance: 200,
  stopDistance: 7,          // stop this far behind another car / red light
  accel: 14,
  maxSpeed: 32,
  colors: [0x3b82f6, 0xf59e0b, 0x10b981, 0xef4444, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xf97316],
};

// Camera
export const CAMERA = {
  chaseDist: 9,
  chaseHeight: 4.5,
  chaseLerp: 0.08,
  hoodOffset: [0.5, 1.3, -0.2],
  topHeight: 45,
  topLerp: 0.1,
  fov: 60,
};

// Day/night
export const TIME = {
  cycleSec: 180,         // full day length in seconds
  nightStart: 0.78,      // fraction of cycle where night begins
  dayStart: 0.12,        // fraction where day returns
};

// Economy / rewards
export const REWARDS = {
  missionBase: 150,
  xpBase: 120,
  perfectParkingBonus: 100,
  cleanDrivingBonus: 50,
};

// localStorage key
export const SAVE_KEY = 'cargame_save_v1';

// Mission definitions (resolved at runtime with world coordinates)
export const MISSIONS = [
  {
    id: 'first-drive',
    name: 'First Drive',
    icon: '🚗',
    desc: 'Drive to the destination marker downtown.',
    type: 'reach',
    timeLimit: 0,
    reward: 200,
    xp: 100,
  },
  {
    id: 'parking',
    name: 'Parking Challenge',
    icon: '🅿️',
    desc: 'Park precisely inside the highlighted zone.',
    type: 'parking',
    timeLimit: 90,
    reward: 250,
    xp: 150,
  },
  {
    id: 'timed-delivery',
    name: 'Timed Delivery',
    icon: '⏱️',
    desc: 'Reach the destination before time runs out.',
    type: 'reach',
    timeLimit: 60,
    reward: 300,
    xp: 180,
  },
];
