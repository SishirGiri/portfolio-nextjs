// ════════════════════════════════════════════════════════
// STATS — effective per-car stats from base + upgrades.
// Single implementation shared by the garage UI, the
// dealership and any future systems (previously duplicated
// between main.js and vehicles.js).
// ════════════════════════════════════════════════════════
import { UPGRADES } from '../data/customization.js';

/**
 * @param {object} def car definition (from vehicles.json)
 * @param {Record<string, number>} up upgrade levels {engine: 0-3, ...}
 */
export function computeStats(def, up = {}) {
  const lv = (k) => up[k] || 0;
  return {
    topSpeed: def.topSpeed * (1 + UPGRADES.engine.topSpeed * lv('engine')),
    accel: def.accel * (1 + UPGRADES.engine.accel * lv('engine') + (UPGRADES.transmission?.accel || 0) * lv('transmission')),
    brake: def.brake * (1 + UPGRADES.brakes.brake * lv('brakes')),
    grip: def.grip * (1 + UPGRADES.tires.grip * lv('tires')),
    steer: def.steer * (1 + (UPGRADES.suspension?.steer || 0) * lv('suspension')),
    nitroCap: def.nitroCap + UPGRADES.nitro.nitroCap * lv('nitro'),
  };
}
