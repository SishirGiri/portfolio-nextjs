/**
 * Save sync service — the domain logic behind PUT/GET /api/game/save.
 *
 *   • incoming blobs pass the server-side sanitizer
 *   • revision comparison decides accept vs 409 conflict
 *   • earn-rate guards clamp impossible money/XP growth
 *   • relational projections (profile, stats, vehicles,
 *     mission progress) are derived from the accepted blob
 *   • achievements are evaluated and returned
 */
import { levelFromXp, MISSION_BY_ID } from '../gameData';
import { childLogger } from '../lib/logger';
import type {
  IMissionRepository,
  IPlayerRepository,
  ISaveRepository,
  IVehicleRepository,
  Repositories,
  SaveBlob,
  SaveRecord,
} from '../repositories/types';
import { sanitizeSave } from './saveSanitizer';
import { checkEarnRate } from './antiCheat';
import { AchievementService } from './achievementService';

const log = childLogger({ module: 'save-sync' });

export type SyncOutcome =
  | { status: 'accepted'; save: SaveRecord; achievements: { id: string; name: string; desc: string; icon: string }[]; clamped: boolean }
  | { status: 'conflict'; serverSave: SaveBlob }
  | { status: 'rejected'; reason: string };

export class SaveSyncService {
  private achievementsService: AchievementService;

  constructor(private repos: Repositories) {
    this.achievementsService = new AchievementService(repos.achievements);
  }

  async getSave(userId: string) {
    return this.repos.saves.get(userId);
  }

  async sync(userId: string, incoming: unknown): Promise<SyncOutcome> {
    const sanitized = sanitizeSave(incoming);
    if (!sanitized.ok || !sanitized.save) {
      // hard rejection: persist a flag for admin review, never store the blob
      await this.repos.flags.create({
        userId, reason: 'hostile_save', severity: 'high',
        data: { flags: sanitized.flags.slice(0, 20) },
      });
      await this.repos.audit.log({ action: 'save.rejected', targetType: 'user', targetId: userId, data: { flags: sanitized.flags.slice(0, 20) } });
      return { status: 'rejected', reason: 'save failed validation' };
    }
    const save = sanitized.save;
    if (sanitized.flags.length) {
      log.warn({ userId, flags: sanitized.flags }, 'save sanitization notes');
    }

    const existing = await this.repos.saves.get(userId);

    // Conflict: this client is BEHIND a newer save stored server-side.
    if (existing && save.rev < existing.revision) {
      return { status: 'conflict', serverSave: existing.data };
    }

    // Earn-rate guard against the previously accepted state.
    let clamped = false;
    if (existing) {
      const rate = checkEarnRate(
        { money: (existing.data as SaveBlob).money ?? 0, xp: (existing.data as SaveBlob).xp ?? 0, updatedAt: existing.updatedAt },
        { money: save.money, xp: save.xp },
      );
      if (rate.clamped) {
        log.warn({ userId, flags: rate.flags }, 'earn-rate clamp');
        save.money = rate.money;
        save.xp = rate.xp;
        clamped = true;
        // soft signal — kept + flagged for review, never auto-banned
        await this.repos.flags.create({
          userId, reason: 'earn_rate', severity: 'medium',
          data: { flags: rate.flags, revision: save.rev },
        });
      }
    }

    // project first, then evaluate achievements (both mutate only
    // `save` in memory) — a SINGLE store write settles everything.
    await this.project(userId, save);
    const unlocked = await this.achievementsService.evaluate(userId, save);
    const stored = await this.repos.saves.put(userId, save.rev, save);
    return { status: 'accepted', save: stored, achievements: unlocked, clamped };
  }

  /** Derive the relational views (profile/stats/inventory/missions). */
  private async project(userId: string, save: SaveBlob) {
    const level = levelFromXp(save.xp);
    // preserve a custom display name chosen through the profile API
    const existingProfile = await this.repos.players.getProfile(userId);
    await this.repos.players.upsertProfile(userId, {
      displayName: existingProfile?.displayName || 'Driver',
      level,
      xp: save.xp,
      money: save.money,
      currentCar: save.currentCar,
    });
    await this.repos.players.upsertStats(userId, {
      distanceM: save.stats.distanceM,
      playtimeSec: save.stats.playtimeSec,
      missionsCompleted: save.stats.missionsCompleted,
      missionsFailed: save.stats.missionsFailed,
      collisions: save.stats.collisions,
      busts: save.stats.busts,
      escapes: save.stats.escapes,
      topSpeedKmh: save.stats.topSpeedKmh,
      moneyEarned: save.stats.moneyEarned,
      moneySpent: save.stats.moneySpent,
    });
    await this.repos.vehicles.replaceAll(
      userId,
      Object.entries(save.ownedCars).map(([carId, v]) => ({
        carId,
        paint: v.paint,
        spoiler: v.spoiler,
        wheels: v.wheels,
        caliper: v.caliper,
        kit: v.kit,
        exhaust: v.exhaust,
        upgrades: v.upgrades,
      })),
    );
    for (const [missionId, rec] of Object.entries(save.completed)) {
      if (!MISSION_BY_ID.has(missionId)) continue;
      // merge with the server's view: best stars, fastest time
      const prev = await this.repos.missions.get(userId, missionId);
      await this.repos.missions.upsert(userId, missionId, {
        stars: Math.max(prev?.stars ?? 0, rec.stars),
        bestTimeMs: [prev?.bestTimeMs ?? null, rec.bestTime != null ? Math.round(rec.bestTime * 1000) : null]
          .filter((t): t is number => t !== null)
          .reduce<number | null>((min, t) => (min === null ? t : Math.min(min, t)), null),
        // syncs are idempotent — completion COUNTS come from
        // leaderboard submissions, which fire once per run
        completions: prev?.completions ?? 1,
      });
    }
  }
}
