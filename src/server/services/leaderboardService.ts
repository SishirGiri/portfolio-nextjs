/**
 * Leaderboard service — run submission + ranking queries.
 *
 * Clients submit mission RESULTS; this service validates them
 * (anti-cheat), computes the score server-side, updates the
 * player's career total, and answers board queries with
 * pagination + period filters.
 *
 * Boards: overall (career), per-mission (period), mine (personal
 * bests), friends (your friend list). Public boards rank
 * registered accounts only. Page queries are cached briefly in
 * the KV (Redis when configured) and invalidated on new runs;
 * every accepted run publishes LEADERBOARD_UPDATED through the
 * pub/sub adapter so realtime clients can refresh live.
 */
import { MISSION_BY_ID, VEHICLE_BY_ID } from '../gameData';
import { getKV } from '../lib/kv';
import { getPubSub } from '../lib/pubsub';
import type { Repositories, UserRecord } from '../repositories/types';
import { computeScore, RATE_LIMIT, rateLimit, validateRun, type RunPayload } from './antiCheat';
const CACHE_TTL_SEC = 20;

export type SubmitOutcome =
  | { ok: true; score: number; isPersonalBest: boolean }
  | { ok: false; code: string; message: string };

export interface BoardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  timeMs: number;
  stars: number;
  vehicleId: string;
  vehicleName: string;
  isMe?: boolean;
}

export interface Board {
  scope: string;
  period: 'all' | 'day' | 'week';
  page: number;
  limit: number;
  total: number;
  entries: BoardEntry[];
}

export interface BoardOptions {
  scope?: string;
  period?: string;
  page?: number;
  limit?: number;
  /** Resolved caller — enables `mine`, `friends` and isMe badges. */
  viewer?: UserRecord | null;
}

export class LeaderboardService {
  constructor(private repos: Repositories) {}

  async submitRun(user: UserRecord, run: RunPayload): Promise<SubmitOutcome> {
    const verdict = validateRun(run);
    if (!verdict.ok) {
      // physics-impossible result: rejected AND flagged for review
      await this.repos.flags.create({
        userId: user.id, reason: 'impossible_run', severity: 'high',
        data: { reason: verdict.reason, run: { ...run } },
      });
      return { ok: false, code: 'invalid_run', message: verdict.reason };
    }
    if (!rateLimit(`runs:${user.id}`, RATE_LIMIT.maxSubmissions, RATE_LIMIT.windowMs)) {
      return { ok: false, code: 'rate_limited', message: 'Too many submissions — slow down.' };
    }

    const score = computeScore(run.missionId, run.elapsedMs, run.stars);
    if (score === null) return { ok: false, code: 'invalid_run', message: 'unknown mission' };

    const prevBestScore = await this.bestScoreForMission(user.id, run.missionId);
    const isPersonalBest = score > prevBestScore;
    const profile = await this.repos.players.getProfile(user.id);
    if (isPersonalBest) {
      await this.repos.players.upsertProfile(user.id, {
        careerScore: (profile?.careerScore ?? 0) + (score - prevBestScore),
      });
    }

    await this.repos.leaderboard.insert({
      userId: user.id,
      missionId: run.missionId,
      score,
      timeMs: Math.round(run.elapsedMs),
      stars: run.stars,
      level: profile?.level ?? 0,
      vehicleId: VEHICLE_BY_ID.has(run.vehicleId) ? run.vehicleId : 'toro',
      distanceM: Math.max(0, Math.round(run.distanceM)),
    });

    // cached pages are stale now; live viewers get a nudge
    await getKV().delPrefix('nd:lb:');
    await getPubSub().publish({ type: 'LEADERBOARD_UPDATED', missionId: run.missionId, userId: user.id, score }).catch(() => {});
    return { ok: true, score, isPersonalBest };
  }

  private async bestScoreForMission(userId: string, missionId: string): Promise<number> {
    const entries = await this.repos.leaderboard.bestForUser(userId);
    const mine = entries.filter((e) => e.missionId === missionId);
    return mine.reduce((max, e) => Math.max(max, e.score), 0);
  }

  /** Board rows for the API, shaped for the game's UI. */
  async board(opts: BoardOptions): Promise<Board | null> {
    const period = (['all', 'day', 'week'].includes(String(opts.period)) ? opts.period : 'all') as 'all' | 'day' | 'week';
    const page = Math.max(1, Math.min(50, Math.floor(Number(opts.page) || 1)));
    const limit = Math.max(1, Math.min(50, Math.floor(Number(opts.limit) || 15)));
    const scope = opts.scope ?? 'overall';

    // personal bests across every mission
    if (scope === 'mine') {
      if (!opts.viewer) return { scope, period, page, limit, total: 0, entries: [] };
      const entries = await this.repos.leaderboard.bestForUser(opts.viewer.id);
      const best = new Map<string, typeof entries[number]>();
      for (const e of entries) {
        const cur = best.get(e.missionId);
        if (!cur || e.score > cur.score) best.set(e.missionId, e);
      }
      const sorted = [...best.values()].sort((a, b) => b.score - a.score);
      return {
        scope, period: 'all', page, limit, total: sorted.length,
        entries: sorted.slice((page - 1) * limit, page * limit).map((e, i) => ({
          rank: (page - 1) * limit + i + 1,
          userId: e.userId,
          displayName: MISSION_BY_ID.get(e.missionId)?.name ?? e.missionId,
          score: e.score,
          timeMs: e.timeMs,
          stars: e.stars,
          vehicleId: e.vehicleId,
          vehicleName: VEHICLE_BY_ID.get(e.vehicleId)?.name ?? '',
          isMe: true,
        })),
      };
    }

    // friends-filtered variant of overall / mission boards
    const friendsScope = scope === 'friends' || scope === 'friends-overall';
    const missionScope = scope !== 'overall' && scope !== 'friends-overall' && scope !== 'friends' ? scope : null;
    if (missionScope && !MISSION_BY_ID.has(missionScope)) return null;

    let userIds: string[] | undefined;
    let effectiveScope = scope;
    if (friendsScope) {
      if (!opts.viewer) return { scope, period, page, limit, total: 0, entries: [] };
      userIds = await this.repos.friends.friendIds(opts.viewer.id);
      userIds.push(opts.viewer.id); // you compete on your friends board too
      effectiveScope = missionScope ?? 'overall';
    }

    const cacheKey = `nd:lb:${effectiveScope}:${period}:${page}:${limit}:${userIds ? userIds.join(',') : 'pub'}`;
    const kv = getKV();
    const cached = await kv.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const board = JSON.parse(cached) as Board;
        board.scope = scope; // report the requested scope back
        return board;
      } catch { /* fall through to a fresh query */ }
    }

    const query = { period: missionScope ? period : 'all', page, limit, registeredOnly: !userIds, userIds };
    const built = missionScope
      ? await this.buildMissionBoard(scope, missionScope, query)
      : await this.buildOverallBoard(scope, query);

    if (built) {
      await kv.set(cacheKey, JSON.stringify(built), CACHE_TTL_SEC).catch(() => {});
      // cached copy stores the canonical scope for reuse
    }
    return built;
  }

  private async buildMissionBoard(scope: string, missionId: string, q: { period: 'all' | 'day' | 'week'; page: number; limit: number; registeredOnly?: boolean; userIds?: string[] }): Promise<Board> {
    const { entries, total } = await this.repos.leaderboard.topForMission(missionId, q);
    return {
      scope, period: q.period, page: q.page, limit: q.limit, total,
      entries: entries.map((e, i) => ({
        rank: (q.page - 1) * q.limit + i + 1,
        userId: e.userId,
        displayName: e.displayName ?? 'Guest',
        score: e.score,
        timeMs: e.timeMs,
        stars: e.stars,
        vehicleId: e.vehicleId,
        vehicleName: VEHICLE_BY_ID.get(e.vehicleId)?.name ?? '',
      })),
    };
  }

  private async buildOverallBoard(scope: string, q: { page: number; limit: number; registeredOnly?: boolean; userIds?: string[] }): Promise<Board> {
    const { entries, total } = await this.repos.leaderboard.topOverall(q);
    return {
      scope, period: 'all', page: q.page, limit: q.limit, total,
      entries: entries.map((p, i) => ({
        rank: (q.page - 1) * q.limit + i + 1,
        userId: p.userId,
        displayName: p.username ?? 'Guest',
        score: p.careerScore,
        timeMs: 0,
        stars: 0,
        vehicleId: p.currentCar,
        vehicleName: VEHICLE_BY_ID.get(p.currentCar)?.name ?? '',
      })),
    };
  }
}
