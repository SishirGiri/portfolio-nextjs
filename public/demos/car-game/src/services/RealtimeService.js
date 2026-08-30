/**
 * RealtimeService — WebSocket client for the realtime platform.
 *
 * Connects to the standalone realtime server (same auth token as
 * the REST API), dispatches server frames onto the EventBus, and
 * handles reconnection with backoff. The MultiplayerService and
 * UI panels subscribe to bus events; this module only moves
 * bytes.
 *
 * Bus events emitted (all under EVENTS-style names):
 *   RT_STATUS      { status }  connecting|online|offline
 *   RT_PRESENCE    { userId, username, online }
 *   RT_NOTIFICATION{ title, notificationType }
 *   RT_LEADERBOARD {}
 *   MP_FOUND / MP_COUNTDOWN / MP_STARTED / MP_STATE / MP_EVENT /
 *   MP_FINISHED / MP_ABORTED   (payload passthrough)
 */

const PROTOCOL_VERSION = 1;
const RECONNECT_DELAYS = [2000, 5000, 15000, 30000];

export class RealtimeService {
  /**
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {import('./AuthService.js').AuthService} auth
   */
  constructor(bus, auth, opts = {}) {
    this.bus = bus;
    this.auth = auth;
    this.url = opts.url || this._defaultUrl();
    this.status = 'offline';
    this.ws = null;
    this._attempts = 0;
    this._timer = null;
    this._closedByUs = false;
    this._latencyMs = null;
  }

  _defaultUrl() {
    // dev: realtime runs on :3001; prod: same origin behind a proxy
    if (typeof location !== 'undefined' && location.port === '3000') {
      return `${location.protocol === 'https:' ? 'wss' : 'ws'}://localhost:3001`;
    }
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }

  start() {
    this._connect();
  }

  stop() {
    this._closedByUs = true;
    if (this._timer) clearTimeout(this._timer);
    if (this.ws) this.ws.close();
    this._setStatus('offline');
  }

  _setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.bus.emit('RT_STATUS', { status });
  }

  _connect() {
    if (!this.auth.token) return; // nothing to authenticate with (yet)
    this._closedByUs = false;
    this._setStatus('connecting');
    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      // handshake: first frame must be AUTH
      this.send('AUTH', { token: this.auth.token });
    };

    ws.onmessage = (ev) => {
      let frame;
      try { frame = JSON.parse(ev.data); } catch { return; }
      if (!frame || frame.v !== PROTOCOL_VERSION || !frame.type) return;
      this._dispatch(frame.type, frame.payload || {});
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (this._closedByUs) return;
      this._setStatus('offline');
      this._scheduleReconnect();
    };

    ws.onerror = () => { /* onclose follows */ };
  }

  _scheduleReconnect() {
    if (this._closedByUs || this._timer) return;
    const delay = RECONNECT_DELAYS[Math.min(this._attempts, RECONNECT_DELAYS.length - 1)];
    this._attempts += 1;
    this._timer = setTimeout(() => {
      this._timer = null;
      this._connect();
    }, delay);
  }

  /** Send a protocol frame (no-op when offline). */
  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ v: PROTOCOL_VERSION, type, payload }));
      return true;
    }
    return false;
  }

  measureLatency() {
    const sentAt = performance.now();
    if (!this.send('PING')) return Promise.resolve(null);
    return new Promise((resolve) => {
      const onPong = () => {
        this.bus.off('RT_PONG_INTERNAL', onPong);
        this._latencyMs = Math.round(performance.now() - sentAt);
        resolve(this._latencyMs);
      };
      this.bus.on('RT_PONG_INTERNAL', onPong);
      setTimeout(() => {
        this.bus.off('RT_PONG_INTERNAL', onPong);
        resolve(null);
      }, 3000);
    });
  }

  _dispatch(type, payload) {
    switch (type) {
      case 'AUTH_OK':
        this._attempts = 0;
        this._setStatus('online');
        this.bus.emit('RT_AUTH_OK', payload);
        break;
      case 'AUTH_ERROR':
        this.bus.emit('RT_AUTH_ERROR', payload);
        this.stop(); // bad token — AuthService will re-login and restart
        break;
      case 'PONG':
        this.bus.emit('RT_PONG_INTERNAL', {});
        break;
      case 'PRESENCE':
        this.bus.emit('RT_PRESENCE', payload);
        break;
      case 'NOTIFICATION':
        this.bus.emit('RT_NOTIFICATION', payload);
        break;
      case 'LEADERBOARD_UPDATED':
        this.bus.emit('RT_LEADERBOARD', {});
        break;
      // multiplayer passthrough
      case 'MATCH_FOUND': this.bus.emit('MP_FOUND', payload); break;
      case 'MATCH_COUNTDOWN': this.bus.emit('MP_COUNTDOWN', payload); break;
      case 'MATCH_STARTED': this.bus.emit('MP_STARTED', payload); break;
      case 'STATE_UPDATE': this.bus.emit('MP_STATE', payload); break;
      case 'MATCH_EVENT': this.bus.emit('MP_EVENT', payload); break;
      case 'MATCH_FINISHED': this.bus.emit('MP_FINISHED', payload); break;
      case 'MATCH_ABORTED': this.bus.emit('MP_ABORTED', payload); break;
      case 'ERROR':
        this.bus.emit('RT_ERROR', payload);
        break;
    }
  }
}
