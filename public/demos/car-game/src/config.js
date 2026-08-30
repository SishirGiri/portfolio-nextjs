// ════════════════════════════════════════════════════════
// CONFIG — compatibility barrel.
//
// Content now lives in focused modules under src/data/
// (pure gameplay content is JSON shared with the server):
//   data/world.js         layout, districts, weather, traffic/police conf
//   data/sim.js           fuel/damage + camera tunables
//   data/quality.js       graphics presets
//   data/cars.js          ← vehicles.json (shared)
//   data/customization.js ← customization.json (shared)
//   data/missions.js      ← missions.json (shared)
//   data/economy.js       ← economy.json (shared) + level formulas
//   data/save.js          save keys + defaults (v3)
//
// Existing imports of './config.js' continue to work
// unchanged; new code should import from the specific
// data module it needs.
// ════════════════════════════════════════════════════════

export * from './data/world.js';
export * from './data/sim.js';
export * from './data/quality.js';
export * from './data/cars.js';
export * from './data/customization.js';
export * from './data/missions.js';
export * from './data/economy.js';
export * from './data/save.js';
