/**
 * Server-side save sanitization — the trust boundary.
 *
 * The client sanitizes too, but the server NEVER trusts what
 * arrives over the wire: the same structural rules (valid ids,
 * clamped values, whitelisted settings) are applied here
 * before anything is persisted. Mirrors the logic in
 * public/demos/car-game/src/services/SaveService.js.
 */
import { CAREER_MISSION_IDS, MISSION_BY_ID, VEHICLE_BY_ID, VEHICLES, levelFromXp } from '../gameData';
import type { SaveBlob } from '../repositories/types';

const HARD_LIMITS = {
  money: 100_000_000,
  xp: 50_000_000,
  maxLevel: 1000,
  bestTimeFloorSec: 3,
};

export interface SanitizeResult {
  ok: boolean;
  save?: SaveBlob;
  flags: string[];   // audit notes (clamped values, dropped ids…)
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const clampNum = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeSave(raw: unknown): SanitizeResult {
  const flags: string[] = [];
  if (!isObj(raw)) return { ok: false, flags: ['not-an-object'] };
  const r = raw;

  const ownedCars: SaveBlob['ownedCars'] = {};
  if (isObj(r.ownedCars)) {
    for (const def of VEHICLES) {
      const car = r.ownedCars[def.id];
      if (!isObj(car)) continue;
      const upgrades: Record<string, number> = {};
      if (isObj(car.upgrades)) {
        for (const [k, v] of Object.entries(car.upgrades)) {
          if (/^[a-z]+$/.test(k)) upgrades[k] = clampInt(v, 0, 3, 0);
        }
      }
      const paint = typeof car.paint === 'string' && /^#[0-9a-f]{6}$/i.test(car.paint)
        ? car.paint : def.color;
      ownedCars[def.id] = {
        upgrades,
        paint,
        spoiler: clampInt(car.spoiler, 0, 2, 0),
        wheels: clampInt(car.wheels, 0, 2, 0),
        caliper: clampInt(car.caliper, 0, 3, 0),
        kit: clampInt(car.kit, 0, 1, 0),
        exhaust: clampInt(car.exhaust, 0, 2, 0),
      };
    }
  } else {
    flags.push('ownedCars-missing');
  }
  if (!ownedCars.toro) {
    ownedCars.toro = { upgrades: {}, paint: VEHICLE_BY_ID.get('toro')!.color, spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 };
    flags.push('toro-granted');
  }

  const completed: SaveBlob['completed'] = {};
  if (isObj(r.completed)) {
    for (const [id, rec] of Object.entries(r.completed)) {
      if (!MISSION_BY_ID.has(id)) { flags.push(`unknown-mission:${id}`); continue; }
      if (!isObj(rec)) continue;
      completed[id] = {
        stars: clampInt(rec.stars, 1, 3, 1),
        bestTime: typeof rec.bestTime === 'number' && rec.bestTime >= HARD_LIMITS.bestTimeFloorSec
          ? rec.bestTime : null,
      };
    }
  }

  const s = r.stats;
  const stats: SaveBlob['stats'] = {
    distanceM: clampNum(isObj(s) ? s.distanceM : 0, 0, 4e9, 0),
    playtimeSec: clampNum(isObj(s) ? s.playtimeSec : 0, 0, 4e7, 0),
    missionsCompleted: clampInt(isObj(s) ? s.missionsCompleted : 0, 0, 1e6, 0),
    missionsFailed: clampInt(isObj(s) ? s.missionsFailed : 0, 0, 1e6, 0),
    collisions: clampInt(isObj(s) ? s.collisions : 0, 0, 1e7, 0),
    busts: clampInt(isObj(s) ? s.busts : 0, 0, 1e6, 0),
    escapes: clampInt(isObj(s) ? s.escapes : 0, 0, 1e6, 0),
    topSpeedKmh: clampNum(isObj(s) ? s.topSpeedKmh : 0, 0, 500, 0),
    moneyEarned: clampInt(isObj(s) ? s.moneyEarned : 0, 0, HARD_LIMITS.money, 0),
    moneySpent: clampInt(isObj(s) ? s.moneySpent : 0, 0, HARD_LIMITS.money, 0),
    bestRunScore: clampInt(isObj(s) ? s.bestRunScore : 0, 0, 1e7, 0),
  };

  const set = isObj(r.settings) ? r.settings : {};
  const vol = isObj(set.volumes) ? set.volumes : {};
  const qualities = ['low', 'medium', 'high', 'ultra'];
  // one fader per audio mixer channel; legacy saves' fx/amb map to sfx/environment
  const volOf = (ch: string, legacyKey: string | null, fallback: number) =>
    clampNum(ch in vol ? vol[ch] : (legacyKey && legacyKey in vol ? vol[legacyKey] : undefined), 0, 1, fallback);
  const settings: SaveBlob['settings'] = {
    sound: set.sound !== false,
    quality: qualities.includes(String(set.quality)) ? String(set.quality) : 'medium',
    transmission: set.transmission === 'manual' ? 'manual' : 'auto',
    tractionControl: set.tractionControl !== false,
    volumes: {
      master: volOf('master', null, 1),
      music: volOf('music', null, 0.45),
      engine: volOf('engine', null, 0.8),
      sfx: volOf('sfx', 'fx', 0.9),
      environment: volOf('environment', 'amb', 0.55),
      ui: volOf('ui', null, 0.9),
      voice: volOf('voice', null, 1),
    },
  };

  let money = clampInt(r.money, 0, HARD_LIMITS.money, 500);
  let xp = clampInt(r.xp, 0, HARD_LIMITS.xp, 0);
  if (levelFromXp(xp) > HARD_LIMITS.maxLevel) {
    xp = 120 * HARD_LIMITS.maxLevel * HARD_LIMITS.maxLevel;
    flags.push('xp-clamped');
  }
  let currentCar = typeof r.currentCar === 'string' && VEHICLE_BY_ID.has(r.currentCar)
    ? r.currentCar : 'toro';
  if (!ownedCars[currentCar]) { currentCar = 'toro'; flags.push('currentCar-fixed'); }

  const achievements = Array.isArray(r.achievements)
    ? [...new Set(r.achievements.filter((a): a is string => typeof a === 'string'))].slice(0, 200)
    : [];

  const save: SaveBlob = {
    v: 3,
    rev: Math.max(1, clampInt(r.rev, 1, 1e9, 1)),
    updatedAt: clampInt(r.updatedAt, 0, Date.now() + 60_000, 0),
    money,
    xp,
    currentCar,
    ownedCars,
    completed,
    achievements,
    stats,
    settings,
    ...(isObj(r.pos) ? {
      pos: {
        x: clampNum(r.pos.x, -3000, 3000, 0),
        z: clampNum(r.pos.z, -3000, 3000, 0),
        h: clampNum(r.pos.h, -Math.PI * 4, Math.PI * 4, 0),
      },
    } : {}),
  };
  return { ok: true, save, flags };
}

/** Career missions completed count (for achievements). */
export function careerCompletedCount(save: SaveBlob): number {
  return CAREER_MISSION_IDS.filter((id) => save.completed[id]).length;
}
