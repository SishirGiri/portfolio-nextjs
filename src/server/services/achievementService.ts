/**
 * Achievements — evaluated SERVER-SIDE from the sanitized save
 * on every sync. The client only displays what the server
 * unlocks, so achievement state can't be forged locally.
 *
 * Definitions live in src/server/data/achievements.json (data
 * per spec §16: id, name, desc, icon, rarity, xpReward, metric).
 * The predicate registry below interprets each `metric` kind —
 * adding an achievement is a JSON edit, adding a metric KIND is
 * the only code change.
 */
import { CAREER_MISSION_IDS, levelFromXp, VEHICLES } from '../gameData';
import { careerCompletedCount } from './saveSanitizer';
import type { IAchievementRepository, SaveBlob } from '../repositories/types';
import defs from '../data/achievements.json';

export interface AchievementMetric {
  kind: string;
  target?: number | 'all';
  missionId?: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: string;
  xpReward: number;
  metric: AchievementMetric;
}

/** metric-kind registry — resolves a definition against a save. */
type MetricFn = (save: SaveBlob, metric: AchievementMetric) => boolean;

const METRICS: Record<string, MetricFn> = {
  missionsCompleted: (s, m) => s.stats.missionsCompleted >= (Number(m.target) || 1),
  careerCompleted: (s, m) =>
    m.target === 'all'
      ? careerCompletedCount(s) >= CAREER_MISSION_IDS.length
      : careerCompletedCount(s) >= Number(m.target),
  level: (s, m) => levelFromXp(s.xp) >= Number(m.target),
  vehicles: (s, m) =>
    m.target === 'all'
      ? Object.keys(s.ownedCars).length >= VEHICLES.length
      : Object.keys(s.ownedCars).length >= Number(m.target),
  distanceKm: (s, m) => s.stats.distanceM >= Number(m.target) * 1000,
  moneyEarned: (s, m) => s.stats.moneyEarned >= Number(m.target),
  escapes: (s, m) => s.stats.escapes >= Number(m.target),
  missionCompleted: (s, m) => !!m.missionId && !!s.completed[m.missionId],
};

export const ACHIEVEMENTS: AchievementDef[] = defs as AchievementDef[];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

function meets(def: AchievementDef, save: SaveBlob): boolean {
  const fn = METRICS[def.metric.kind];
  return fn ? fn(save, def.metric) : false;
}

export class AchievementService {
  constructor(private achievements: IAchievementRepository) {}

  /**
   * Evaluate all definitions against the save, store the ones
   * that are newly earned, and return them (client toasts them).
   */
  async evaluate(userId: string, save: SaveBlob) {
    const owned = new Set((await this.achievements.listForUser(userId)).map((a) => a.achievementId));
    const earned = ACHIEVEMENTS.filter((a) => !owned.has(a.id) && meets(a, save));
    if (!earned.length) return [];
    // mirror into the save blob so the client stays in sync
    save.achievements = [...new Set([...save.achievements, ...earned.map((a) => a.id)])];
    await this.achievements.addMany(userId, earned.map((a) => a.id));
    return earned.map(({ id, name, desc, icon }) => ({ id, name, desc, icon }));
  }
}
