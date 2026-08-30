// ════════════════════════════════════════════════════════
// LEADERBOARD SERVICE — reads rankings, submits runs.
//
// Submissions carry the MISSION RESULT (time, stars,
// vehicle, distance) — never a score. The server computes
// the score from its copy of missions.json, so a modified
// client can't inject an arbitrary number.
// ════════════════════════════════════════════════════════
import { EVENTS } from '../core/events.js';
import { ApiError } from './APIClient.js';

export class LeaderboardService {
  /**
   * @param {import('./APIClient.js').APIClient} api
   * @param {import('../core/EventBus.js').EventBus} bus
   */
  constructor(api, bus) {
    this.api = api;
    this.bus = bus;
  }

  /**
   * @param {{scope?: 'overall'|string, period?: 'all'|'day'|'week', page?: number, limit?: number}} opts
   *   scope 'overall' = career total; otherwise a mission id.
   */
  async top({ scope = 'overall', period = 'all', page = 1, limit = 15 } = {}) {
    const res = await this.api.get('/leaderboard', { scope, period, page, limit });
    this.bus.emit(EVENTS.LEADERBOARD_UPDATED, { scope, period, entries: res.entries });
    return res;
  }

  /** Personal bests for the signed-in player. */
  async mine() {
    return this.api.get('/leaderboard', { scope: 'mine' });
  }

  /**
   * Fire-and-forget mission run submission. Returns the
   * server's score on success; callers decide whether to
   * surface "new best!" feedback.
   */
  async submitRun(run) {
    const payload = {
      missionId: run.missionId,
      elapsedMs: Math.round(run.elapsedMs),
      stars: run.stars,
      vehicleId: run.vehicleId,
      distanceM: Math.round(run.distanceM || 0),
      collisions: Math.max(0, Math.round(run.collisions || 0)),
      clientTime: Date.now(),
    };
    const res = await this.api.post('/leaderboard', payload);
    return res;   // {score, isPersonalBest, rank?}
  }

  /** Non-throwing wrapper for use in UI glue. */
  async trySubmitRun(run) {
    try {
      return await this.submitRun(run);
    } catch (err) {
      if (err instanceof ApiError && (err.isOffline || err.status === 429)) return null;
      console.warn('[Leaderboard] submission rejected:', err?.message);
      return null;
    }
  }
}
