// ════════════════════════════════════════════════════════
// STORAGE — injectable key/value backends.
// The browser backend is localStorage; tests (and any
// non-DOM environment) use the memory backend. Nothing in
// the game touches localStorage directly anymore.
// ════════════════════════════════════════════════════════

export function createBrowserStorage() {
  return {
    get(key) {
      try { return globalThis.localStorage?.getItem(key) ?? null; }
      catch { return null; }   // private mode / quota/security errors
    },
    set(key, value) {
      try { globalThis.localStorage?.setItem(key, value); return true; }
      catch { return false; }
    },
    remove(key) {
      try { globalThis.localStorage?.removeItem(key); } catch { /* noop */ }
    },
  };
}

export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get: (key) => (map.has(key) ? map.get(key) : null),
    set: (key, value) => { map.set(key, String(value)); return true; },
    remove: (key) => { map.delete(key); },
    _dump: () => Object.fromEntries(map),
  };
}
