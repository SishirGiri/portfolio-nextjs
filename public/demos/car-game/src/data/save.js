// ════════════════════════════════════════════════════════
// SAVE — save format keys + defaults.
//
// Format v3 (supersedes v2 transparently):
//   adds `rev` (monotonic revision for sync conflict
//   detection), `updatedAt`, and `stats` (lifetime
//   telemetry used by achievements + leaderboards).
// ════════════════════════════════════════════════════════
import { ECONOMY } from './economy.js';

export const SAVE_VERSION = 3;
export const SAVE_KEY = 'cargame_save_v2';        // key kept for continuity
export const SAVE_KEY_V1 = 'cargame_save_v1';
export const SAVE_KEY_LEGACY_V2 = 'cargame_save_v2';

export function defaultCarState(color) {
  return { upgrades: {}, paint: color, spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 };
}

export function defaultStats() {
  return {
    distanceM: 0,
    playtimeSec: 0,
    missionsCompleted: 0,
    missionsFailed: 0,
    collisions: 0,
    busts: 0,
    escapes: 0,
    topSpeedKmh: 0,
    moneyEarned: 0,
    moneySpent: 0,
    bestRunScore: 0,
  };
}

export function defaultSave() {
  return {
    v: SAVE_VERSION,
    rev: 1,
    updatedAt: 0,
    money: ECONOMY.startMoney,
    xp: 0,
    currentCar: 'toro',
    ownedCars: { toro: defaultCarState('#f5b301') },
    completed: {},           // id -> { stars, bestTime }
    achievements: [],        // achievement ids unlocked server-side
    stats: defaultStats(),
    settings: {
      sound: true,
      quality: 'medium',
      transmission: 'auto',
      tractionControl: true,
      // one fader per mixer channel (legacy saves' fx/amb are
      // migrated to sfx/environment by SaveService.mergeSettings)
      volumes: {
        master: 1, music: 0.45, engine: 0.8, sfx: 0.9,
        environment: 0.55, ui: 0.9, voice: 1,
      },
    },
  };
}
