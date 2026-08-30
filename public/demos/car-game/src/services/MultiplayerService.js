/**
 * MultiplayerService — ghost-race client logic.
 *
 * Owns the client half of a match: matchmaking requests, remote
 * car bookkeeping with interpolation, 10Hz state upload, finish
 * reporting, and cleanup. Rendering stays in game.js — this
 * service exposes `remotes` (id → interpolated transform) and
 * the game draws whatever is there, so netcode and rendering
 * stay decoupled.
 *
 * Bus events emitted:
 *   MP_UI        { phase: 'idle'|'queued'|'countdown'|'racing'|'finished',
 *                   match?, players?, results?, elapsed?, message? }
 */

const SEND_HZ = 10;

export class MultiplayerService {
  /**
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {import('./RealtimeService.js').RealtimeService} realtime
   */
  constructor(bus, realtime) {
    this.bus = bus;
    this.realtime = realtime;
    this.phase = 'idle';
    this.match = null;          // { matchId, missionId, seed, players }
    this.remotes = new Map();   // userId → { x, z, h, s, cp, tx, tz, th, lastAt, finished }
    this._sendAcc = 0;
    this._startedAt = 0;
    this._finishSent = false;

    bus.on('MP_FOUND', (p) => this._onFound(p));
    bus.on('MP_COUNTDOWN', (p) => this._ui('countdown', { match: this.match, startInMs: p?.startInMs }));
    bus.on('MP_STARTED', (p) => this._onStarted(p));
    bus.on('MP_STATE', (p) => this._onState(p));
    bus.on('MP_FINISHED', (p) => this._onFinished(p));
    bus.on('MP_ABORTED', (p) => this._reset('finished', { message: p?.reason ?? 'Match aborted' }));
  }

  _ui(phase, extra = {}) {
    this.phase = phase;
    this.bus.emit('MP_UI', { phase, ...extra });
  }

  get active() {
    return this.phase === 'countdown' || this.phase === 'racing';
  }

  queue(carId, level) {
    if (this.active) return false;
    this._reset('idle');
    const ok = this.realtime.send('MATCHMAKING_JOIN', { carId, level });
    if (ok) this._ui('queued', { message: 'Searching for opponents…' });
    return ok;
  }

  cancelQueue() {
    if (this.phase !== 'queued') return;
    this.realtime.send('MATCHMAKING_LEAVE', {});
    this._reset('idle');
  }

  rejoin() {
    if (!this.match) return;
    this.realtime.send('MATCH_REJOIN', { matchId: this.match.matchId });
  }

  _onFound(payload) {
    this.match = payload;
    this._finishSent = false;
    for (const p of payload.players ?? []) {
      this.remotes.set(p.userId, {
        x: 0, z: 0, h: 0, s: 0, cp: 0,
        tx: 0, tz: 0, th: 0,
        lastAt: 0, finished: false, info: p,
      });
    }
    this._ui('countdown', { match: this.match });
  }

  _onStarted(payload) {
    this._startedAt = payload?.startAt ?? Date.now();
    this._ui('racing', { match: this.match });
  }

  _onState(payload) {
    const now = Date.now();
    for (const p of payload.players ?? []) {
      const r = this.remotes.get(p.userId);
      if (!r || r.finished) continue;
      r.tx = p.x; r.tz = p.z; r.th = p.h;
      r.s = p.s; r.cp = p.cp;
      r.lastAt = now;
    }
  }

  /** The local player crossed the finish line. */
  sendFinish(elapsedMs) {
    if (this._finishSent || this.phase !== 'racing') return;
    this._finishSent = true;
    this.realtime.send('MATCH_EVENT', { finish: Math.round(elapsedMs) });
  }

  leaveMatch() {
    if (!this.active) return;
    this.realtime.send('MATCH_EVENT', { leave: true });
    this._reset('idle');
  }

  _onFinished(payload) {
    const results = payload?.results ?? [];
    for (const row of results) {
      const r = this.remotes.get(row.userId);
      if (r) r.finished = true;
    }
    this._ui('finished', { match: this.match, results });
    // keep remotes visible briefly; game.js clears on results dismiss
  }

  _reset(nextPhase, extra) {
    this.match = null;
    this.remotes.clear();
    this._finishSent = false;
    this._ui(nextPhase, extra);
  }

  /** Per-frame: interpolation toward the newest network targets. */
  update(dt, localState = null) {
    // 1. smooth remote ghosts toward their targets
    for (const r of this.remotes.values()) {
      const k = Math.min(1, dt * 10); // ~100ms catch-up
      r.x += (r.tx - r.x) * k;
      r.z += (r.tz - r.z) * k;
      // heading takes the short way around
      let dh = r.th - r.h;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      r.h += dh * k;
    }
    // 2. upload local state at SEND_HZ while racing
    if (this.phase === 'racing' && localState) {
      this._sendAcc += dt;
      if (this._sendAcc >= 1 / SEND_HZ) {
        this._sendAcc = 0;
        this.realtime.send('PLAYER_STATE', localState);
      }
    }
  }

  /** Milliseconds since the server-side race start (for the HUD timer). */
  raceElapsedMs() {
    return this._startedAt ? Math.max(0, Date.now() - this._startedAt) : 0;
  }

  clear() {
    this._reset('idle');
  }
}
