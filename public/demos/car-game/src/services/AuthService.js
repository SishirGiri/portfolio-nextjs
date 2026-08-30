// ════════════════════════════════════════════════════════
// AUTH SERVICE — guest-first identity for the game.
//
// Every player silently gets a guest account (token stored
// locally). Registering a username/password later UPGRADES
// the same guest — progress carries over. All password
// verification + token signing happens server-side
// (scrypt + HMAC-SHA256); the client only stores the token.
// ════════════════════════════════════════════════════════
import { EVENTS } from '../core/events.js';
import { ApiError } from './APIClient.js';

const TOKEN_KEY = 'nd_token';
const USER_KEY = 'nd_user';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

export class AuthService {
  /**
   * @param {import('./APIClient.js').APIClient} api
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {{get,set,remove}} storage
   */
  constructor(api, bus, storage) {
    this.api = api;
    this.bus = bus;
    this.storage = storage;
    this.user = null;        // {id, username, isGuest, displayName, createdAt}
    this.status = 'init';    // init | connecting | online | offline
    this._didTryGuest = false;
  }

  /** Restore a previous session from storage (no network). */
  restore() {
    const token = this.storage.get(TOKEN_KEY);
    if (!token) return false;
    try {
      this.user = JSON.parse(this.storage.get(USER_KEY)) || null;
    } catch { this.user = null; }
    if (!this.user) { this._clear(); return false; }
    this.api.setToken(token);
    this.status = 'online';
    this.bus.emit(EVENTS.AUTH_CHANGED, { user: this.user });
    return true;
  }

  /**
   * Ensure we have SOME identity. Offline → stays guest-null
   * and the game keeps working purely locally.
   */
  async ensureSession() {
    if (this.user) return this.user;
    if (this._didTryGuest) return null;
    this._didTryGuest = true;
    this.status = 'connecting';
    try {
      const res = await this.api.post('/auth/guest', null, { auth: false });
      this._applySession(res);
      this.status = 'online';
      return this.user;
    } catch (err) {
      this.status = (err instanceof ApiError && err.isOffline) ? 'offline' : 'error';
      return null;
    }
  }

  /** Create an account (or upgrade the current guest, keeping progress). */
  async register(username, password) {
    validateCredentials(username, password);
    const res = await this.api.post('/auth/register', { username, password });
    this._applySession(res);
    return this.user;
  }

  async login(username, password) {
    validateCredentials(username, password);
    const res = await this.api.post('/auth/login', { username, password });
    this._applySession(res);
    return this.user;
  }

  logout() {
    this._clear();
    this._didTryGuest = false;
    this.status = 'init';
    this.bus.emit(EVENTS.AUTH_CHANGED, { user: null });
  }

  _applySession(res) {
    if (!res?.token || !res?.user) throw new ApiError('malformed session response', { code: 'invalid_response' });
    this.api.setToken(res.token);
    this.user = res.user;
    this.storage.set(TOKEN_KEY, res.token);
    this.storage.set(USER_KEY, JSON.stringify(res.user));
    this.bus.emit(EVENTS.AUTH_CHANGED, { user: this.user });
  }

  _clear() {
    this.api.setToken(null);
    this.user = null;
    this.storage.remove(TOKEN_KEY);
    this.storage.remove(USER_KEY);
  }
}

export function validateCredentials(username, password) {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    throw new ApiError('Username must be 3–24 chars (letters, numbers, _ or -).', { code: 'invalid_username' });
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    throw new ApiError('Password must be 6–128 characters.', { code: 'invalid_password' });
  }
}
