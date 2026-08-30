/**
 * Ghost-race match engine — server-authoritative state machine.
 *
 * States:  countdown → racing → finished
 *
 * The server owns the lifecycle (countdown, start, results);
 * relays player positions with a per-player speed/teleport
 * sanity check; and computes final scores with the SAME
 * computeScore used by single-player leaderboards, so match
 * results are consistent and untrusting of client claims.
 *
 * Pure logic + injected clock/persistence so tests drive a full
 * match without sockets (see tests/server/realtime.test.ts).
 */
import { computeScore } from '../src/server/services/antiCheat';

export interface MatchPlayer {
  userId: string;
  username: string;
  carId: string;
  level: number;
}

export interface PlayerRuntime {
  x: number; z: number; h: number; s: number; cp: number;
  lastUpdate: number;
  finishMs: number | null;
  disconnectedAt: number | null;
}

export interface MatchResultRow {
  userId: string;
  username: string;
  position: number;
  score: number;
  finishMs: number | null;
}

/** Physics ceiling for relayed movement (matches anti-cheat + margin). */
const MAX_SPEED_MPS = 125;
const RECONNECT_GRACE_MS = 20_000;
const COUNTDOWN_MS = 4_000;
const RACE_TIMEOUT_FACTOR = 2.5; // vs the mission time limit

export type MatchPhase = 'countdown' | 'racing' | 'finished';

export class GhostRaceMatch {
  readonly id: string;
  readonly missionId: string;
  readonly seed: number;
  readonly timeLimitMs: number;
  phase: MatchPhase = 'countdown';
  readonly startedAt: number;          // race start (after countdown)
  readonly createdAt = Date.now();
  players: Map<string, PlayerRuntime> = new Map();

  constructor(
    id: string,
    missionId: string,
    seed: number,
    timeLimitSec: number,
    private roster: MatchPlayer[],
    clock = Date.now(),
  ) {
    this.id = id;
    this.missionId = missionId;
    this.seed = seed;
    this.timeLimitMs = Math.max(30_000, timeLimitSec > 0 ? timeLimitSec * 1000 : 180_000);
    this.startedAt = clock + COUNTDOWN_MS;
    for (const p of roster) {
      this.players.set(p.userId, {
        x: 0, z: 0, h: 0, s: 0, cp: 0,
        lastUpdate: 0, finishMs: null, disconnectedAt: null,
      });
    }
  }

  get rosterList(): MatchPlayer[] { return [...this.roster]; }
  get countdownMs() { return COUNTDOWN_MS; }

  /** Sanity-checked position update; returns the relayable state or null. */
  applyState(userId: string, state: { x: number; z: number; h: number; s: number; cp: number }, now = Date.now()): boolean {
    if (this.phase !== 'racing') return false;
    const rt = this.players.get(userId);
    if (!rt || rt.finishMs !== null) return false;
    // teleport / speed clamp: reject jumps no car could make
    if (rt.lastUpdate > 0) {
      const dtSec = Math.max(0.05, (now - rt.lastUpdate) / 1000);
      const dx = state.x - rt.x;
      const dz = state.z - rt.z;
      const dist = Math.hypot(dx, dz);
      if (dist > MAX_SPEED_MPS * dtSec * 1.5 + 5) {
        // implausible — drop this update (don't punish jitter twice)
        rt.lastUpdate = now;
        return false;
      }
    }
    rt.x = state.x; rt.z = state.z; rt.h = state.h;
    rt.s = state.s; rt.cp = state.cp;
    rt.lastUpdate = now;
    return true;
  }

  /** Player crossed the finish. Validated against minimum plausible time. */
  finish(userId: string, elapsedMs: number): boolean {
    if (this.phase !== 'racing') return false;
    const rt = this.players.get(userId);
    if (!rt || rt.finishMs !== null) return false;
    if (elapsedMs < 2_000 || elapsedMs > this.timeLimitMs * RACE_TIMEOUT_FACTOR) return false;
    rt.finishMs = Math.round(elapsedMs);
    return true;
  }

  markDisconnected(userId: string, now = Date.now()) {
    const rt = this.players.get(userId);
    if (rt && rt.finishMs === null && rt.disconnectedAt === null) rt.disconnectedAt = now;
  }

  markReconnected(userId: string) {
    const rt = this.players.get(userId);
    if (rt) rt.disconnectedAt = null;
  }

  left(userId: string, now = Date.now()) {
    const rt = this.players.get(userId);
    if (rt && rt.finishMs === null) rt.disconnectedAt = now; // DNF unless already finished
  }

  /** Advance the state machine; returns 'started' | 'finished' | null. */
  tick(now = Date.now()): 'started' | 'finished' | null {
    if (this.phase === 'countdown' && now >= this.startedAt) {
      this.phase = 'racing';
      return 'started';
    }
    if (this.phase === 'racing') {
      if (this.everyoneDone(now) || now >= this.startedAt + this.timeLimitMs * RACE_TIMEOUT_FACTOR) {
        this.phase = 'finished';
        return 'finished';
      }
    }
    return null;
  }

  private everyoneDone(now: number): boolean {
    for (const rt of this.players.values()) {
      if (rt.finishMs !== null) continue;
      if (rt.disconnectedAt !== null && now - rt.disconnectedAt > RECONNECT_GRACE_MS) continue; // DNF
      return false; // someone still racing with a live connection
    }
    return true;
  }

  /** Authoritative results: finishers by time, then DNFs. */
  results(): MatchResultRow[] {
    const rows: MatchResultRow[] = [];
    const finishers = [...this.players.entries()]
      .filter(([, rt]) => rt.finishMs !== null)
      .sort((a, b) => (a[1].finishMs ?? 0) - (b[1].finishMs ?? 0));
    let position = 1;
    for (const [userId, rt] of finishers) {
      const info = this.roster.find((p) => p.userId === userId);
      const finishMs = rt.finishMs!;
      // winner keeps full tempo bonus; later finishers keep their own
      const score = computeScore(this.missionId, finishMs, 3) ?? 100;
      rows.push({ userId, username: info?.username ?? 'unknown', position: position++, score, finishMs });
    }
    // DNFs — position after finishers, no score
    const positionCap = position;
    for (const [userId, rt] of this.players) {
      if (rt.finishMs !== null) continue;
      const info = this.roster.find((p) => p.userId === userId);
      rows.push({ userId, username: info?.username ?? 'unknown', position: positionCap, score: 0, finishMs: null });
    }
    return rows;
  }
}
