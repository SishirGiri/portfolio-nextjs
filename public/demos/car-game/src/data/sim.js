// ════════════════════════════════════════════════════════
// SIM — fuel / damage / temperature tunables + camera rig.
// ════════════════════════════════════════════════════════

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
