// ════════════════════════════════════════════════════════
// EVENT BUS — minimal pub/sub that decouples game systems.
// The Game owns one instance and passes it to services;
// UI and gameplay code communicate through EVENTS only.
// ════════════════════════════════════════════════════════

export class EventBus {
  constructor() {
    this._handlers = new Map();   // event -> Set<fn>
    this._any = new Set();        // wildcard (event, payload)
  }

  /** Subscribe. Returns an unsubscribe function. */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /** Subscribe for exactly one emission. */
  once(event, handler) {
    const off = this.on(event, (payload) => { off(); handler(payload); });
    return off;
  }

  /** Subscribe to every event (useful for logging/analytics). */
  onAny(handler) {
    this._any.add(handler);
    return () => this._any.delete(handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this._handlers.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        // One bad listener must never break the game loop.
        console.error(`[EventBus] handler for "${event}" threw`, err);
      }
    });
    this._any.forEach((fn) => {
      try { fn(event, payload); } catch { /* ignored */ }
    });
  }

  clear() {
    this._handlers.clear();
    this._any.clear();
  }
}
