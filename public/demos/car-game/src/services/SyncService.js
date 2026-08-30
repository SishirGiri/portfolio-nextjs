// ════════════════════════════════════════════════════════
// SYNC SERVICE — local-first cloud saves.
//
//   Game → SaveService (localStorage, always)
//                └─ SAVE_COMPLETED → debounce → PUT /api/game/save
//                                          ↓ 409 conflict
//                                    resolve (see _resolveConflict)
//
// Rules:
//   • the game NEVER waits on the network — sync is async
//   • offline: retries with backoff when `online` fires
//   • conflicts: higher `rev` wins; equal revs prefer the
//     newer updatedAt. If the server is ahead and we have no
//     local-only changes, we adopt the server save.
// ════════════════════════════════════════════════════════
import { EVENTS } from '../core/events.js';
import { ApiError } from './APIClient.js';

const DEVICE_KEY = 'nd_device_id';
const SYNC_BACKOFF_MS = [4000, 15000, 60000];

export class SyncService {
  /**
   * @param {import('./APIClient.js').APIClient} api
   * @param {import('./AuthService.js').AuthService} auth
   * @param {import('./SaveService.js').SaveService} saves
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {{get,set}} storage
   */
  constructor(api, auth, saves, bus, storage) {
    this.api = api;
    this.auth = auth;
    this.saves = saves;
    this.bus = bus;
    this.storage = storage;
    this.enabled = true;          // set false after hard server "unsupported"
    this.status = 'idle';         // idle | syncing | offline | error | off
    this._dirty = false;          // local changes not yet acknowledged
    this._timer = null;
    this._failures = 0;
    this._flushing = false;
    this._unbind = [];
  }

  get deviceId() {
    let id = this.storage.get(DEVICE_KEY);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      this.storage.set(DEVICE_KEY, id);
    }
    return id;
  }

  start() {
    this._unbind.push(
      this.bus.on(EVENTS.SAVE_COMPLETED, () => this.schedule(2500)),
      this.bus.on(EVENTS.AUTH_CHANGED, () => this.schedule(1000)),
    );
    globalThis.addEventListener?.('online', this._onOnline = () => { this._failures = 0; this.schedule(500); });
    globalThis.addEventListener?.('pagehide', () => this.flush({ silent: true }));
    this.schedule(3000);   // initial push/pull after boot
  }

  stop() {
    this._unbind.forEach((off) => off());
    this._unbind = [];
    globalThis.removeEventListener?.('online', this._onOnline);
    clearTimeout(this._timer);
  }

  _setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.bus.emit(EVENTS.SYNC_STATUS_CHANGED, { status });
  }

  schedule(delayMs = 2000) {
    if (!this.enabled) return;
    this._dirty = true;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), delayMs);
  }

  /** Push the local save (and pull server state). Safe to call often. */
  async flush({ silent = false } = {}) {
    if (!this.enabled || this._flushing) return;
    if (!this.auth.user) { this._setStatus('idle'); return; }
    this._flushing = true;
    if (!silent) this._setStatus('syncing');
    try {
      const res = await this.api.put('/save', {
        save: this.saves.save,
        deviceId: this.deviceId,
        clientTime: Date.now(),
      });
      this._failures = 0;
      if (res?.conflict) {
        this._resolveConflict(res);
      } else {
        this._dirty = false;
        this._setStatus('idle');
        if (res?.achievements?.length) this._deliverAchievements(res.achievements);
        if (res?.save) this.saves.adoptServer(res.save);   // authoritative echo (badges etc.)
      }
    } catch (err) {
      if (err instanceof ApiError && err.isOffline) {
        this._setStatus('offline');
      } else if (err instanceof ApiError && err.status === 401) {
        // stale token: drop to guest and retry once
        this.auth.logout();
      } else if (err instanceof ApiError && err.code === 'unsupported') {
        this.enabled = false;
        this._setStatus('off');
      } else {
        this._setStatus('error');
      }
      this._failures++;
      const backoff = SYNC_BACKOFF_MS[Math.min(this._failures - 1, SYNC_BACKOFF_MS.length - 1)];
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.flush(), backoff);
    } finally {
      this._flushing = false;
    }
  }

  _resolveConflict(res) {
    const local = this.saves.save;
    const server = res.serverSave;
    if (!local || !server) { this._dirty = false; return; }
    const localAhead = (local.rev || 0) >= (server.rev || 0);
    if (localAhead || this._dirty) {
      // keep local; next flush wins because our rev is >= server's
      this.bus.emit(EVENTS.SYNC_CONFLICT, { resolved: 'local' });
      this._dirty = true;
      // re-push immediately so the server catches up
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.flush(), 300);
    } else {
      this.saves.adoptServer(server);
      this.bus.emit(EVENTS.SYNC_CONFLICT, { resolved: 'server' });
      this._dirty = false;
      this._setStatus('idle');
    }
  }

  _deliverAchievements(list) {
    for (const a of list || []) {
      this.bus.emit(EVENTS.ACHIEVEMENT_UNLOCKED, a);
    }
  }
}
