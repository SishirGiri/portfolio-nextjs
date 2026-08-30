import { describe, expect, it } from 'vitest';
import {
  checkEarnRate,
  computeScore,
  rateLimit,
  resetRateLimits,
  validateRun,
} from '../../src/server/services/antiCheat';

const goodRun = {
  missionId: 'checkpoint-race',
  elapsedMs: 95_000,
  stars: 3,
  vehicleId: 'toro',
  distanceM: 1_800,
  collisions: 0,
};

describe('validateRun (anti-cheat)', () => {
  it('accepts a plausible run', () => {
    expect(validateRun(goodRun)).toEqual({ ok: true });
  });

  it('rejects unknown missions and vehicles', () => {
    expect(validateRun({ ...goodRun, missionId: 'instant-win' }).ok).toBe(false);
    expect(validateRun({ ...goodRun, vehicleId: 'rocket' }).ok).toBe(false);
  });

  it('rejects impossible times', () => {
    expect(validateRun({ ...goodRun, elapsedMs: 500 }).ok).toBe(false);       // too fast
    expect(validateRun({ ...goodRun, elapsedMs: 3600_000 }).ok).toBe(false);  // too slow
  });

  it('rejects impossible star counts', () => {
    expect(validateRun({ ...goodRun, stars: 0 }).ok).toBe(false);
    expect(validateRun({ ...goodRun, stars: 4 }).ok).toBe(false);
    expect(validateRun({ ...goodRun, stars: 2.5 }).ok).toBe(false);
  });

  it('rejects physics-breaking distances', () => {
    // 95 s at 115 m/s ceiling ≈ 10 925 m — 50 km is impossible
    expect(validateRun({ ...goodRun, distanceM: 50_000 }).ok).toBe(false);
    expect(validateRun({ ...goodRun, distanceM: -10 }).ok).toBe(false);
  });
});

describe('computeScore (server-authoritative)', () => {
  it('matches the payout curve at par time', () => {
    // checkpoint-race reward 600, stars 3 → base = 600 × 1.2 = 720
    // par 105 s, elapsed 105 s → tempo 1 → 720
    expect(computeScore('checkpoint-race', 105_000, 3)).toBe(720);
  });

  it('rewards beating par and slows behind par', () => {
    const fast = computeScore('checkpoint-race', 70_000, 3)!;
    const slow = computeScore('checkpoint-race', 200_000, 3)!;
    expect(fast).toBeGreaterThan(720);
    expect(slow).toBeLessThan(720);
  });

  it('caps the tempo multiplier', () => {
    const fast = computeScore('checkpoint-race', 5_000, 3)!;   // absurd ratio
    const capped = computeScore('checkpoint-race', 105_000 / 1.5, 3)!;
    expect(fast).toBe(capped);
  });

  it('scales with stars', () => {
    const s3 = computeScore('checkpoint-race', 105_000, 3)!;
    const s1 = computeScore('checkpoint-race', 105_000, 1)!;
    expect(s3).toBeGreaterThan(s1);
    expect(s1).toBeGreaterThan(0);
  });

  it('returns null for unknown missions', () => {
    expect(computeScore('nope', 60_000, 3)).toBeNull();
  });
});

describe('checkEarnRate', () => {
  it('passes sane growth untouched', () => {
    const res = checkEarnRate(
      { money: 1_000, xp: 500, updatedAt: new Date(Date.now() - 3_600_000) },
      { money: 20_000, xp: 3_000 },
    );
    expect(res.clamped).toBe(false);
    expect(res.money).toBe(20_000);
  });

  it('clamps impossible money growth to the rate bound', () => {
    const res = checkEarnRate(
      { money: 1_000, xp: 500, updatedAt: new Date(Date.now() - 60_000) },
      { money: 5_000_000, xp: 600 },
    );
    expect(res.clamped).toBe(true);
    // max = 1000 + $100/s × (60 s + 60 s grace) = 13 000
    expect(res.money).toBe(13_000);
    expect(res.flags.some((f) => f.startsWith('money-rate'))).toBe(true);
  });

  it('clamps impossible xp growth', () => {
    const res = checkEarnRate(
      { money: 0, xp: 100, updatedAt: new Date(Date.now() - 60_000) },
      { money: 10, xp: 1_000_000 },
    );
    expect(res.clamped).toBe(true);
    expect(res.xp).toBe(6_100); // 100 + 50/s × 120 s
  });

  it('first sync has no previous state → never clamps', () => {
    const res = checkEarnRate(null, { money: 999_999, xp: 999_999 });
    expect(res.clamped).toBe(false);
  });
});

describe('rateLimit', () => {
  it('allows up to max events per window, then blocks', () => {
    resetRateLimits();
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 60_000)).toBe(true);
    expect(rateLimit(key, 5, 60_000)).toBe(false);
  });

  it('separate keys are independent', () => {
    resetRateLimits();
    expect(rateLimit('a', 1, 60_000)).toBe(true);
    expect(rateLimit('b', 1, 60_000)).toBe(true);
    expect(rateLimit('a', 1, 60_000)).toBe(false);
  });
});
