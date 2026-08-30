/**
 * Anti-cheat — server-side validation.
 *
 * Principles:
 *   • clients send RESULTS (time, stars, vehicle, distance),
 *     never scores — scores are computed here
 *   • anything physics-impossible is rejected, not trusted
 *   • earn rates between save syncs are bounded by wall-clock
 *     time, so a hacked client can't teleport to riches
 *   • submissions are rate-limited per user
 */
import { MISSION_BY_ID, VEHICLE_BY_ID } from '../gameData';

// Fastest possible car: Axiom X 67 m/s × nitro boost ≈ 110 m/s.
const MAX_SPEED_MPS = 115;
// Ceiling on legitimate earnings between syncs (generous on
// purpose — only blatant cheating should trip it).
const MAX_MONEY_PER_SEC = 100;          // $360k/hour
const MAX_XP_PER_SEC = 50;              // 180k xp/hour
const SYNC_GRACE_MS = 60_000;

export const RATE_LIMIT = {
  windowMs: 5 * 60_000,
  maxSubmissions: 25,
};

export interface RunPayload {
  missionId: string;
  elapsedMs: number;
  stars: number;
  vehicleId: string;
  distanceM: number;
  collisions: number;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateRun(run: RunPayload): ValidationResult {
  const mission = MISSION_BY_ID.get(run.missionId);
  if (!mission) return { ok: false, reason: 'unknown mission' };
  if (!Number.isFinite(run.elapsedMs) || run.elapsedMs < 2000) return { ok: false, reason: 'implausible time (too fast)' };

  // time caps: timed missions get their limit + 2 min slack; open missions 30 min
  const capMs = mission.timeLimit > 0 ? mission.timeLimit * 1000 + 120_000 : 30 * 60_000;
  if (run.elapsedMs > capMs) return { ok: false, reason: 'implausible time (too slow)' };

  if (!Number.isInteger(run.stars) || run.stars < 1 || run.stars > 3) return { ok: false, reason: 'invalid stars' };
  if (!VEHICLE_BY_ID.has(run.vehicleId)) return { ok: false, reason: 'unknown vehicle' };

  if (!Number.isFinite(run.distanceM) || run.distanceM < 0) return { ok: false, reason: 'invalid distance' };
  const elapsedSec = run.elapsedMs / 1000;
  const maxDistance = MAX_SPEED_MPS * elapsedSec + 500;
  if (run.distanceM > maxDistance) return { ok: false, reason: 'implausible distance' };

  if (!Number.isFinite(run.collisions) || run.collisions < 0 || run.collisions > 10_000) {
    return { ok: false, reason: 'invalid collisions' };
  }
  return { ok: true };
}

/**
 * Deterministic score for a mission run. Fastest-car-in-catalog
 * physics can't produce values outside these bounds.
 *
 *   base   = reward × (0.6 + stars × 0.2)     (matches payout)
 *   tempo  = par/elapsed, clamped to [0.75, 1.5]
 *   score  = round(base × tempo)
 */
export function computeScore(missionId: string, elapsedMs: number, stars: number): number | null {
  const mission = MISSION_BY_ID.get(missionId);
  if (!mission) return null;
  const elapsedSec = Math.max(1, elapsedMs / 1000);
  const par = (mission.params?.par as number | undefined) ?? (mission.timeLimit > 0 ? mission.timeLimit * 0.75 : null);
  const tempo = par ? Math.min(1.5, Math.max(0.75, par / elapsedSec)) : 1;
  const base = mission.reward * (0.6 + stars * 0.2);
  return Math.max(1, Math.round(base * tempo));
}

export interface EarnRateCheck {
  clamped: boolean;
  money: number;
  xp: number;
  flags: string[];
}

/**
 * Bound money/XP growth by the wall-clock time elapsed since
 * the previous accepted sync. Deltas beyond the rate limit are
 * clamped to the maximum and flagged (kept — progress is never
 * destroyed on a soft signal; hard impossible values are
 * rejected earlier by the sanitizer).
 */
export function checkEarnRate(
  previous: { money: number; xp: number; updatedAt: Date } | null,
  next: { money: number; xp: number },
): EarnRateCheck {
  const flags: string[] = [];
  if (!previous) return { clamped: false, money: next.money, xp: next.xp, flags };
  const elapsedSec = Math.max(0, (Date.now() + SYNC_GRACE_MS - previous.updatedAt.getTime()) / 1000);
  const maxMoney = previous.money + MAX_MONEY_PER_SEC * elapsedSec;
  const maxXp = previous.xp + MAX_XP_PER_SEC * elapsedSec;
  let { money, xp } = next;
  let clamped = false;
  if (money > maxMoney) {
    flags.push(`money-rate:${money}->${Math.floor(maxMoney)}`);
    money = Math.max(previous.money, Math.floor(maxMoney));
    clamped = true;
  }
  if (xp > maxXp) {
    flags.push(`xp-rate:${xp}->${Math.floor(maxXp)}`);
    xp = Math.max(previous.xp, Math.floor(maxXp));
    clamped = true;
  }
  return { clamped, money, xp, flags };
}

// ── sliding-window rate limiter (per user + per IP) ─────────
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}
