// weapons/Arsenal.js — re-exports weapon defs and helpers for shop/progression unlocks.
// The canonical weapon data lives in config.js (WEAPONS). This module provides
// convenience selectors and unlock gating by player level.
import { WEAPONS } from "../config.js";

export const ARSENAL = WEAPONS;

export function weaponById(id) { return WEAPONS.find((w) => w.id === id); }

// Unlock thresholds (by level). The player starts with the pistol + SMG.
export const UNLOCKS = {
  pistol: 1,
  smg: 1,
  rifle: 3,
  shotgun: 2,
  sniper: 4,
};

export function unlockedWeapons(level) {
  return WEAPONS.filter((w) => (UNLOCKS[w.id] || 1) <= level);
}
