/**
 * KV adapter — Redis when REDIS_URL is set, in-memory otherwise.
 *
 * Backs shared rate limiting, leaderboard caching, matchmaking
 * queues and presence. The in-memory fallback keeps local dev
 * (no Docker) and the test suite fully functional; Redis makes
 * the state survive restarts and span multiple instances.
 *
 * Keys follow the neon-drive namespace convention:
 *   nd:rl:<bucket>:<key>     rate-limit windows
 *   nd:lb:<scope>:<period>   cached leaderboard pages
 *   nd:mm:queue              matchmaking queue
 *   nd:presence:<userId>     online player registry
 */
import type Redis from 'ioredis';

export interface KV {
  readonly kind: 'memory' | 'redis';
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Atomic counter used by the rate limiter; returns the new value. */
  incr(key: string, ttlSec: number): Promise<number>;
  /** Delete every key in a namespace prefix (cache invalidation). */
  delPrefix(prefix: string): Promise<void>;
  ping(): Promise<boolean>;
}

// ── in-memory fallback ─────────────────────────────────────
class MemoryKV implements KV {
  readonly kind = 'memory' as const;
  private map = new Map<string, { value: string; expiresAt: number | null }>();

  private live(key: string): string | null {
    const rec = this.map.get(key);
    if (!rec) return null;
    if (rec.expiresAt !== null && rec.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return rec.value;
  }

  async get(key: string) { return this.live(key); }
  async set(key: string, value: string, ttlSec?: number) {
    this.map.set(key, { value, expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null });
  }
  async del(key: string) { this.map.delete(key); }
  async incr(key: string, ttlSec: number) {
    const cur = Number(this.live(key) ?? '0') + 1;
    const existing = this.map.get(key);
    // window anchored at first hit, not extended by later ones
    const expiresAt = existing?.expiresAt ?? Date.now() + ttlSec * 1000;
    this.map.set(key, { value: String(cur), expiresAt });
    return cur;
  }
  async delPrefix(prefix: string) {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }
  async ping() { return true; }
}

// ── Redis implementation ───────────────────────────────────
class RedisKV implements KV {
  readonly kind = 'redis' as const;
  constructor(private redis: Redis) {}

  async get(key: string) { return this.redis.get(key); }
  async set(key: string, value: string, ttlSec?: number) {
    if (ttlSec) await this.redis.set(key, value, 'EX', ttlSec);
    else await this.redis.set(key, value);
  }
  async del(key: string) { await this.redis.del(key); }
  async incr(key: string, ttlSec: number) {
    const n = await this.redis.incr(key);
    if (n === 1) await this.redis.expire(key, ttlSec);
    return n;
  }
  async delPrefix(prefix: string) {
    // SCAN in batches — never KEYS in production paths
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== '0');
  }
  async ping() {
    try { return (await this.redis.ping()) === 'PONG'; } catch { return false; }
  }
}

let instance: KV | null = null;

/** Process-wide KV. Redis mode requires REDIS_URL; falls back silently. */
export function getKV(): KV {
  if (instance) return instance;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      // lazy require keeps ioredis optional at runtime for tooling
      // that never touches the KV (e.g. schema tooling in CI)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RedisCtor = require('ioredis') as typeof import('ioredis').default;
      const redis = new RedisCtor(url, { maxRetriesPerRequest: 2, lazyConnect: false, enableOfflineQueue: false });
      redis.on('error', () => { /* surfaced via ping(); never crash the app */ });
      instance = new RedisKV(redis);
    } catch {
      instance = new MemoryKV();
    }
  } else {
    instance = new MemoryKV();
  }
  return instance;
}

/** Test hook — swap the adapter and clear state. */
export function setKV(kv: KV | null) { instance = kv; }
