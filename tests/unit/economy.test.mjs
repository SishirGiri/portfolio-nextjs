import { describe, it, expect } from 'vitest';
import { ECONOMY } from '../../public/demos/car-game/src/data/economy.js';
import { computeStats } from '../../public/demos/car-game/src/gameplay/stats.js';
import { CAR_BY_ID } from '../../public/demos/car-game/src/data/cars.js';
import { MISSIONS, CAREER_MISSIONS, ROAM_MISSIONS } from '../../public/demos/car-game/src/data/missions.js';

describe('economy (shared with the server)', () => {
  it('levelFromXp inverts levelXp exactly', () => {
    for (let lv = 0; lv <= 60; lv++) {
      expect(ECONOMY.levelFromXp(ECONOMY.levelXp(lv))).toBe(lv);
    }
  });

  it('xp is monotonic in level', () => {
    for (let lv = 1; lv < 50; lv++) {
      expect(ECONOMY.levelXp(lv + 1)).toBeGreaterThan(ECONOMY.levelXp(lv));
    }
  });

  it('every career mission has the required reward fields', () => {
    for (const m of MISSIONS) {
      expect(typeof m.id).toBe('string');
      expect(m.reward).toBeGreaterThan(0);
      expect(m.xp).toBeGreaterThan(0);
      expect(typeof m.type).toBe('string');
    }
    expect(CAREER_MISSIONS.length).toBe(14);
    expect(ROAM_MISSIONS.length).toBe(4);
  });
});

describe('computeStats (shared garage/dealer math)', () => {
  it('base stats come straight from the catalog', () => {
    const toro = CAR_BY_ID.toro;
    const s = computeStats(toro, {});
    expect(s.topSpeed).toBeCloseTo(toro.topSpeed);
    expect(s.accel).toBeCloseTo(toro.accel);
  });

  it('upgrades only ever improve stats', () => {
    const toro = CAR_BY_ID.toro;
    const maxed = { engine: 3, brakes: 3, suspension: 3, tires: 3, nitro: 3, transmission: 3 };
    const s0 = computeStats(toro, {});
    const s3 = computeStats(toro, maxed);
    for (const key of ['topSpeed', 'accel', 'brake', 'grip', 'nitroCap']) {
      expect(s3[key]).toBeGreaterThan(s0[key]);
    }
  });
});
