// config.js — central constants and data definitions for the tactical shooter.
// All values tuned for arcade-tactical feel; no external assets.

export const CONFIG = {
  // World / tiles
  TILE: 48,                // pixels per grid cell
  WORLD_W: 140,            // grid cells wide
  WORLD_H: 140,            // grid cells tall
  // tile types
  T_VOID: 0, T_ROAD: 1, T_LANE: 2, T_SIDEWALK: 3, T_CROSSWALK: 4,
  T_GRASS: 5, T_PLAZA: 6, T_WATER: 7, T_SAND: 8, T_TRACK: 9,
  T_BUILDING: 10, T_WALL: 11, T_FENCE: 12, T_DOOR: 13,
  // collision flags (derived): solid = blocks movement & bullets
  // rendering
  VIEW_W: 0, VIEW_H: 0,    // set at runtime
  // loop
  MAX_DT: 0.05,
  // player tuning
  PLAYER: {
    walkSpeed: 150, sprintSpeed: 250, rollSpeed: 420, rollTime: 0.32, rollCooldown: 0.9,
    radius: 12, maxHp: 100, maxArmor: 100, staminaMax: 100, sprintDrain: 26, staminaRegen: 18,
  },
  // enemy tuning
  ENEMY: {
    thug:   { hp: 40,  speed: 95,  accuracy: 0.62, react: 0.55, color: "#c9a227", range: 360, tier: 1 },
    soldier:{ hp: 80,  speed: 120, accuracy: 0.78, react: 0.38, color: "#c34a2a", range: 460, tier: 2 },
    elite:  { hp: 130, speed: 145, accuracy: 0.9,  react: 0.24, color: "#7d3cff", range: 600, tier: 3 },
  },
  // vehicle tuning handled per-type in VEHICLES
  NPC_CAP: 22,
  TRAFFIC_CAP: { high: 16, med: 10, low: 6 },
  // heat / wanted
  HEAT_DECAY: 0.02,
  SAVE_KEY: "tactical.save.v1",
  SETTINGS_KEY: "tactical.settings.v1",
};

export const PALETTE = {
  asphalt: "#1b1e26", asphaltDark: "#14161d", laneMark: "#d9c14a",
  sidewalk: "#2c2f3a", sidewalkDark: "#252832", crosswalk: "#cfcfcf",
  grass: "#1c2a1a", plaza: "#26262e", water: "#0e2236", sand: "#3a3225",
  building: ["#222838", "#262d40", "#1f2433", "#2a2f44"],
  roof: ["#2d3346", "#313847", "#28303f"],
  swat: { suit: "#2a3548", suitDark: "#1d2636", vest: "#3a4660", accent: "#3da9fc", skin: "#d8a47a", visor: "#102a43" },
  ink: "#e6f0ff", inkDim: "#8aa0c8",
  red: "#ff3b5c", green: "#39d98a", amber: "#ffb020", cyan: "#3da9fc", magenta: "#ff4fd8",
};

// Modern city districts (original layout). Rects are in tile coords.
export const DISTRICTS = [
  { name: "Downtown",   x: 40, y: 40, w: 60, h: 50, type: "commercial",  accent: "#3da9fc" },
  { name: "Midtown",    x: 40, y: 10, w: 60, h: 28, type: "commercial",  accent: "#5b8cff" },
  { name: "Harbor",     x: 6,  y: 6,  w: 30, h: 34, type: "industrial",  accent: "#ffb020" },
  { name: "Foundry",    x: 6,  y: 44, w: 30, h: 34, type: "industrial",  accent: "#c34a2a" },
  { name: "Eastside",   x: 104,y: 6,  w: 30, h: 40, type: "residential", accent: "#39d98a" },
  { name: "Greenville", x: 104,y: 50, w: 30, h: 40, type: "residential", accent: "#7d3cff" },
  { name: "South Park", x: 40, y: 96, w: 60, h: 38, type: "park",        accent: "#39d98a" },
];

// Weapons: damage, fire rate (s between shots), recoil (rad added per shot),
// recoilMax, recovery (rad/s), spread (rad), mag, reload (s), bulletSpeed,
// pellets, auto, range, penetrating (penetration factor 0..1), color, icon.
export const WEAPONS = [
  { id: "pistol",    name: "P-9 Pistol",     dmg: 22, rate: 0.22, recoil: 0.028, recoilMax: 0.16, recovery: 0.32, spread: 0.02, mag: 14, reload: 1.1, bulletSpeed: 820, pellets: 1, auto: false, range: 420, pen: 0.0, color: "#ffb020", icon: "🔫", reserveStart: 56 },
  { id: "smg",       name: "MP-7 SMG",       dmg: 15, rate: 0.07, recoil: 0.020, recoilMax: 0.20, recovery: 0.40, spread: 0.06, mag: 30, reload: 1.7, bulletSpeed: 880, pellets: 1, auto: true,  range: 420, pen: 0.1, color: "#3da9fc", icon: "💨", reserveStart: 120 },
  { id: "rifle",     name: "AR-15 Rifle",    dmg: 28, rate: 0.11, recoil: 0.030, recoilMax: 0.22, recovery: 0.34, spread: 0.025,mag: 30, reload: 1.9, bulletSpeed: 1000,pellets: 1, auto: true,  range: 640, pen: 0.35,color: "#ff4fd8", icon: "🎯", reserveStart: 120 },
  { id: "shotgun",   name: "M-12 Shotgun",   dmg: 13, rate: 0.62, recoil: 0.060, recoilMax: 0.30, recovery: 0.45, spread: 0.16, mag: 7,  reload: 2.1, bulletSpeed: 720, pellets: 8, auto: false, range: 280, pen: 0.0, color: "#ff3b5c", icon: "💥", reserveStart: 28 },
  { id: "sniper",    name: "D-50 Sniper",    dmg: 95, rate: 1.15, recoil: 0.090, recoilMax: 0.40, recovery: 0.30, spread: 0.005,mag: 5,  reload: 2.6, bulletSpeed: 1500,pellets: 1, auto: false, range: 1100,pen: 0.8, color: "#7d3cff", icon: "🔭", reserveStart: 20 },
];

// Grenades
export const GRENADES = [
  { id: "frag",   name: "Frag",   icon: "💣", fuse: 1.6, radius: 110, dmg: 140, kind: "frag",   color: "#ff3b5c" },
  { id: "flash",  name: "Flash",  icon: "⚡", fuse: 1.3, radius: 150, dmg: 0,   kind: "flash",  color: "#fff7c2" },
  { id: "smoke",  name: "Smoke",  icon: "🌫️",fuse: 1.2, radius: 120, dmg: 0,   kind: "smoke",  color: "#9aa3b2" },
];

// Vehicles (drivable). maxSpeed px/s, accel, handling (rad/s), body hp.
export const VEHICLES = [
  { id: "sedan",   name: "Sedan",     color: "#3a4660", w: 30, h: 18, maxSpeed: 280, accel: 220, handling: 2.8, body: 110, class: "Civilian" },
  { id: "police",  name: "Police Cruiser", color: "#2a3a6a", w: 32, h: 18, maxSpeed: 320, accel: 250, handling: 3.0, body: 120, class: "Police" },
  { id: "suv",     name: "SUV",       color: "#2e2e36", w: 34, h: 20, maxSpeed: 240, accel: 200, handling: 2.5, body: 150, class: "Civilian" },
  { id: "truck",   name: "Box Truck", color: "#4a4030", w: 46, h: 22, maxSpeed: 180, accel: 140, handling: 2.0, body: 220, class: "Industrial" },
];

// Mission templates
export const MISSIONS = [
  { id: "elim",    type: "eliminate", name: "Eliminate Targets",  desc: "Neutralize all hostile targets in the area.",         reward: 1400, xp: 200 },
  { id: "rescue",  type: "rescue",    name: "Hostage Rescue",      desc: "Clear the building and rescue the hostages.",         reward: 1800, xp: 260 },
  { id: "secure",  type: "secure",    name: "Secure Building",     desc: "Eliminate hostiles and hold the building.",           reward: 1500, xp: 220 },
  { id: "defuse",  type: "defuse",    name: "Bomb Defusal",        desc: "Reach the bomb and defuse it before the timer ends.",  reward: 2000, xp: 280, timer: 90 },
  { id: "escort",  type: "escort",    name: "VIP Escort",          desc: "Escort the VIP to the extraction point alive.",       reward: 1700, xp: 240 },
  { id: "capture", type: "capture",   name: "Capture Criminal",    desc: "Track and apprehend the target.",                     reward: 1600, xp: 230 },
  { id: "intel",   type: "intel",     name: "Collect Intelligence",desc: "Reach the intel drops and secure the data.",          reward: 1300, xp: 190 },
];

// XP curve: total XP needed to reach next level.
export function xpForLevel(level) { return Math.floor(500 * Math.pow(level, 1.35)); }
