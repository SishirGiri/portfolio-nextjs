// ════════════════════════════════════════════════════════
// SAVE SERVICE — the ONLY writer of player progress.
//
// Responsibilities:
//   • load() — v3 read, v2 upgrade, v1 migration, corrupt
//     save recovery (backs up the raw blob, starts clean,
//     never throws)
//   • sanitize() — structural repair + value clamping so a
//     hand-edited or partially corrupted save can't break
//     gameplay or the server
//   • mutate(fn, reason) — single choke point for progress
//     changes: applies fn, bumps `rev`, persists, emits
//     SAVE_COMPLETED (the sync service listens for it)
//   • adoptServer(blob) — replace local state after a sync
//     conflict resolution
// ════════════════════════════════════════════════════════
import { EVENTS } from '../core/events.js';
import {
  SAVE_KEY, SAVE_KEY_V1, SAVE_VERSION,
  defaultSave, defaultStats, defaultCarState,
} from '../data/save.js';
import { CAR_BY_ID, CAR_IDS } from '../data/cars.js';
import { MISSION_BY_ID } from '../data/missions.js';
import { ECONOMY } from '../data/economy.js';

const HARD_LIMITS = {
  money: 100_000_000,
  xp: 50_000_000,
  bestTimeFloorSec: 3,
};

export class SaveService {
  /**
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {{get,set,remove}} storage
   */
  constructor(bus, storage) {
    this.bus = bus;
    this.storage = storage;
    this.save = null;
    this.lastError = null;
  }

  // ───────── load / migrate ─────────

  /** Load (and if needed migrate/repair) the save. Never throws. */
  load() {
    let s = this._readJSON(SAVE_KEY);
    if (s && (s.v === SAVE_VERSION || s.v === SAVE_VERSION - 1)) {
      this._grantToro(s);
      this._upgradeToV3(s);
      this.save = this.sanitize(s);
      return this.save;
    }
    // v1 migration (original game + pre-NYC edition)
    const old = this._readJSON(SAVE_KEY_V1);
    if (old) {
      const d = defaultSave();
      d.money = Math.max(0, (old.money || 0) + 500);
      d.xp = old.xp || 0;
      for (const id of (old.completedMissions || [])) {
        if (MISSION_BY_ID[id]) d.completed[id] = { stars: 1, bestTime: null };
      }
      d.settings.sound = old.sound !== false;
      this._grantToro(d, true);
      this.save = this.sanitize(d);
      this.persist();
      return this.save;
    }
    this.save = defaultSave();
    return this.save;
  }

  _readJSON(key) {
    try {
      const raw = this.storage.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      // Corrupted blob: back it up for manual recovery, start clean.
      const raw = this.storage.get(key);
      if (raw) {
        const backupKey = `${key}.corrupt-${Date.now()}`;
        this.storage.set(backupKey, raw);
        this.storage.remove(key);
        this.bus.emit(EVENTS.SAVE_CORRUPTED, { backedUpAs: backupKey });
        this.lastError = 'corrupt-save-recovered';
      }
      return null;
    }
  }

  /**
   * Ensure the Toro SV hero car exists. Any player who doesn't own it yet
   * (v1 save or pre-Toro v2) gets it granted, keeps the old Corsa starter,
   * and — if they were still driving that starter — is switched into the Toro.
   */
  _grantToro(s, legacy = false) {
    s.ownedCars = s.ownedCars || {};
    if (legacy && !s.ownedCars.corsa) {
      s.ownedCars.corsa = { upgrades: {}, paint: '#e11d48', spoiler: 0 };
    }
    if (s.ownedCars.toro) return;
    s.ownedCars.toro = { upgrades: {}, paint: '#f5b301', spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 };
    if (!s.ownedCars.corsa) {
      s.ownedCars.corsa = { upgrades: {}, paint: '#e11d48', spoiler: 0 };
    }
    if (!s.ownedCars[s.currentCar] || s.currentCar === 'corsa') s.currentCar = 'toro';
  }

  _upgradeToV3(s) {
    if (s.v === SAVE_VERSION) return;
    s.v = SAVE_VERSION;
    s.rev = Math.max(1, Number(s.rev) || 1);
    s.updatedAt = Number(s.updatedAt) || 0;
    s.achievements = Array.isArray(s.achievements) ? s.achievements : [];
    s.stats = { ...defaultStats(), ...(s.stats || {}) };
  }

  // ───────── sanitize ─────────

  /**
   * Structural repair + clamping, IN PLACE (object identity is
   * preserved so UI-captured references stay live). Hand-edited
   * values are clamped, unknown ids dropped — the server applies
   * the same rules independently.
   */
  sanitize(s) {
    if (!isObject(s)) return defaultSave();
    const d = defaultSave();
    s.v = SAVE_VERSION;
    s.rev = Math.max(1, Math.floor(Number(s.rev) || 1));
    s.updatedAt = Math.max(0, Math.floor(Number(s.updatedAt) || 0));
    s.money = clampInt(s.money, 0, HARD_LIMITS.money, d.money);
    s.xp = clampInt(s.xp, 0, HARD_LIMITS.xp, d.xp);
    s.currentCar = CAR_BY_ID[s.currentCar]?.id || 'toro';
    s.ownedCars = isObject(s.ownedCars) ? s.ownedCars : {};
    s.completed = isObject(s.completed) ? s.completed : {};
    s.achievements = Array.isArray(s.achievements)
      ? [...new Set(s.achievements.filter((a) => typeof a === 'string'))].slice(0, 200)
      : [];
    s.stats = isObject(s.stats) ? pickNumbers(s.stats, defaultStats()) : defaultStats();
    if (isObject(s.pos)) {
      s.pos = {
        x: clampNum(s.pos.x, -3000, 3000, 0),
        z: clampNum(s.pos.z, -3000, 3000, 0),
        h: clampNum(s.pos.h, -Math.PI * 4, Math.PI * 4, 0),
      };
    }
    s.settings = mergeSettings(s.settings);

    // owned cars: keep only catalog ids, clamp cosmetics
    const ownedFixed = {};
    for (const id of CAR_IDS) {
      const car = s.ownedCars[id];
      if (!isObject(car)) continue;
      const base = defaultCarState(CAR_BY_ID[id].color);
      ownedFixed[id] = {
        upgrades: sanitizeUpgrades(car.upgrades),
        paint: typeof car.paint === 'string' && /^#[0-9a-f]{6}$/i.test(car.paint) ? car.paint : base.paint,
        spoiler: clampInt(car.spoiler, 0, 2, 0),
        wheels: clampInt(car.wheels, 0, 2, 0),
        caliper: clampInt(car.caliper, 0, 3, 0),
        kit: clampInt(car.kit, 0, 1, 0),
        exhaust: clampInt(car.exhaust, 0, 2, 0),
      };
    }
    s.ownedCars = ownedFixed;
    if (!s.ownedCars[s.currentCar]) s.ownedCars.toro = s.ownedCars.toro || defaultCarState('#f5b301');

    // mission records: keep only known missions with sane values
    const completedFixed = {};
    for (const [id, rec] of Object.entries(s.completed)) {
      const def = MISSION_BY_ID[id];
      if (!def || !isObject(rec)) continue;
      completedFixed[id] = {
        stars: clampInt(rec.stars, 1, 3, 1),
        bestTime: (typeof rec.bestTime === 'number' && rec.bestTime >= HARD_LIMITS.bestTimeFloorSec)
          ? rec.bestTime : null,
      };
    }
    s.completed = completedFixed;

    // level consistency: xp must not skip far beyond the level cap
    const maxLevel = 1000;
    if (ECONOMY.levelFromXp(s.xp) > maxLevel) s.xp = ECONOMY.levelXp(maxLevel);
    return s;
  }

  // ───────── write path ─────────

  /**
   * Mutate the save through a single choke point.
   * `fn(save)` applies the change; the result is sanitized,
   * `rev` is bumped, the blob persisted, and SAVE_COMPLETED
   * emitted (which schedules a cloud sync).
   */
  mutate(fn, reason = 'update') {
    if (!this.save) this.load();
    try {
      fn(this.save);
    } catch (err) {
      console.error('[SaveService] mutator threw — change discarded', err);
      return this.save;
    }
    this.save = this.sanitize(this.save);
    return this._persist(reason);
  }

  /** Persist the current save (bumps rev + updatedAt). */
  persist(reason = 'manual') {
    if (!this.save) this.load();
    return this._persist(reason);
  }

  _persist(reason) {
    this.save.rev = (this.save.rev || 0) + 1;
    this.save.updatedAt = Date.now();
    const ok = this.storage.set(SAVE_KEY, JSON.stringify(this.save));
    if (ok) {
      this.lastError = null;
      this.bus.emit(EVENTS.SAVE_COMPLETED, { reason, rev: this.save.rev });
    } else {
      this.lastError = 'write-failed';
      this.bus.emit(EVENTS.SAVE_FAILED, { error: 'write-failed', reason });
    }
    return ok;
  }

  /** Wipe local progress (confirmed user action only). */
  reset() {
    this.storage.remove(SAVE_KEY);
    this.storage.remove(SAVE_KEY_V1);
    this.save = defaultSave();
    this._persist('reset');
    return this.save;
  }

  /** Replace local state with a server-resolved save (sync conflict). */
  adoptServer(blob) {
    if (!isObject(blob)) return this.save;
    this.save = this.sanitize(blob);
    this.storage.set(SAVE_KEY, JSON.stringify(this.save));
    return this.save;
  }
}

// ───────── helpers ─────────

function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function clampNum(v, min, max, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function clampInt(v, min, max, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}
function pickNumbers(src, template) {
  const out = {};
  for (const key of Object.keys(template)) {
    out[key] = Number.isFinite(Number(src[key])) ? Number(src[key]) : template[key];
  }
  return out;
}
function sanitizeUpgrades(up) {
  const clean = {};
  if (!isObject(up)) return clean;
  for (const [key, lvl] of Object.entries(up)) {
    if (/^[a-z]+$/.test(key)) clean[key] = clampInt(lvl, 0, 3, 0);
  }
  return clean;
}
function mergeSettings(set) {
  const d = defaultSave().settings;
  if (!isObject(set)) return d;
  const qualities = ['low', 'medium', 'high', 'ultra'];
  set.sound = set.sound !== false;
  set.quality = qualities.includes(set.quality) ? set.quality : d.quality;
  set.transmission = set.transmission === 'manual' ? 'manual' : 'auto';
  set.tractionControl = set.tractionControl !== false;
  // volume faders: one per mixer channel, with legacy fx/amb mapped over
  const src = isObject(set.volumes) ? set.volumes : {};
  const legacy = { fx: 'sfx', amb: 'environment' };
  set.volumes = {};
  for (const [ch, def] of Object.entries(d.volumes)) {
    const val = src[ch] ?? src[Object.keys(legacy).find((k) => legacy[k] === ch)];
    set.volumes[ch] = clampNum(val, 0, 1, def);
  }
  return set;
}
