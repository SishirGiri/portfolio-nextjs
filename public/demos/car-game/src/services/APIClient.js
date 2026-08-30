// ════════════════════════════════════════════════════════
// API CLIENT — fetch wrapper for the game's Next.js API.
// Timeouts every request, never throws raw network errors
// (ApiError carries a `code`), and degrades to a cheap
// health probe when offline.
// ════════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'network', body = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;      // network | timeout | database_unavailable | invalid_* | unauthorized | ...
    this.body = body;
  }
  get isOffline() { return this.code === 'network' || this.code === 'timeout' || this.status === 0; }
}

export class APIClient {
  constructor({ base = '/api/game', timeoutMs = 8000, fetchImpl = null } = {}) {
    this.base = base;
    this.timeoutMs = timeoutMs;
    this._fetch = fetchImpl || globalThis.fetch?.bind(globalThis);
    this.token = null;
  }

  setToken(token) { this.token = token; }

  async request(path, { method = 'GET', body = null, auth = true, timeoutMs } = {}) {
    if (!this._fetch) throw new ApiError('fetch unavailable', { code: 'network' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs ?? this.timeoutMs);
    try {
      const headers = { Accept: 'application/json' };
      if (body !== null) headers['Content-Type'] = 'application/json';
      if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
      const res = await this._fetch(`${this.base}${path}`, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
        credentials: 'same-origin',
      });
      let json = null;
      try { json = await res.json(); } catch { /* non-JSON error pages */ }
      if (!res.ok) {
        throw new ApiError(json?.error || `HTTP ${res.status}`, {
          status: res.status,
          code: json?.code || `http_${res.status}`,
          body: json,
        });
      }
      return json;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err?.name === 'AbortError') throw new ApiError('request timed out', { code: 'timeout' });
      throw new ApiError(err?.message || 'network error', { code: 'network' });
    } finally {
      clearTimeout(timer);
    }
  }

  get(path, params) {
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null));
      const q = qs.toString();
      if (q) path = `${path}?${q}`;
    }
    return this.request(path, { method: 'GET' });
  }

  post(path, body, opts = {}) {
    return this.request(path, { method: 'POST', body, ...opts });
  }

  put(path, body, opts = {}) {
    return this.request(path, { method: 'PUT', body, ...opts });
  }

  /** Cheap reachability + database probe. Never throws. */
  async health(timeoutMs = 3500) {
    try {
      const res = await this.request('/health', { auth: false, timeoutMs });
      return res?.status === 'ok' && res?.database === true;
    } catch {
      return false;
    }
  }
}
