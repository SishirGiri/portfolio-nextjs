// ════════════════════════════════════════════════════════
// ECONOMY — constants from economy.json (server mirrors the
// same JSON) plus the level<->XP formulas.
// levelFromXp(levelXp(n)) === n for every valid level n.
// ════════════════════════════════════════════════════════
import data from './economy.json' with { type: 'json' };

export const ECONOMY = {
  ...data,
  levelXp: (n) => data.levelCoefficient * n * n,
  levelFromXp: (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / data.levelCoefficient)),
};

export const REWARDS = { missionBase: data.missionBase, xpBase: data.xpBase };
