/**
 * Pub/Sub adapter — Redis pub/sub when REDIS_URL is set, an
 * in-process EventEmitter otherwise.
 *
 * Used to fan out live events (leaderboard changes, presence,
 * notifications, match updates) to every interested process —
 * the realtime server subscribes, REST publishers publish:
 *
 *   REST route (run submitted)  --publish-->  nd:events
 *   realtime service            --subscribe--> pushes to sockets
 *
 * Memory mode covers single-instance dev; Redis mode spans the
 * app container and the realtime container.
 */
import { EventEmitter } from 'node:events';
import type Redis from 'ioredis';

export const EVENT_CHANNEL = 'nd:events';

export type EventHandler = (event: Record<string, unknown>) => void;

export interface PubSub {
  readonly kind: 'memory' | 'redis';
  publish(event: Record<string, unknown>): Promise<void>;
  subscribe(handler: EventHandler): Promise<void>;
  unsubscribe(handler: EventHandler): Promise<void>;
  close(): Promise<void>;
}

class MemoryPubSub implements PubSub {
  readonly kind = 'memory' as const;
  private bus = new EventEmitter();

  async publish(event: Record<string, unknown>) { this.bus.emit('event', event); }
  async subscribe(handler: EventHandler) { this.bus.on('event', handler); }
  async unsubscribe(handler: EventHandler) { this.bus.off('event', handler); }
  async close() { this.bus.removeAllListeners(); }
}

class RedisPubSub implements PubSub {
  readonly kind = 'redis' as const;
  private sub: Redis;
  private handlers = new Set<EventHandler>();

  constructor(private pub: Redis, url: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RedisCtor = require('ioredis') as typeof import('ioredis').default;
    this.sub = new RedisCtor(url, { maxRetriesPerRequest: null });
    this.sub.on('error', () => { /* logged upstream; never crash */ });
  }

  async publish(event: Record<string, unknown>) {
    await this.pub.publish(EVENT_CHANNEL, JSON.stringify(event));
  }
  async subscribe(handler: EventHandler) {
    if (this.handlers.size === 0) await this.sub.subscribe(EVENT_CHANNEL);
    this.handlers.add(handler);
  }
  async unsubscribe(handler: EventHandler) {
    this.handlers.delete(handler);
    if (this.handlers.size === 0) await this.sub.unsubscribe(EVENT_CHANNEL).catch(() => {});
  }
  async close() {
    this.handlers.clear();
    this.sub.disconnect();
    this.pub.disconnect();
  }
}

let instance: PubSub | null = null;

export function getPubSub(): PubSub {
  if (instance) return instance;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RedisCtor = require('ioredis') as typeof import('ioredis').default;
      const pub = new RedisCtor(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
      pub.on('error', () => {});
      instance = new RedisPubSub(pub, url);
    } catch {
      instance = new MemoryPubSub();
    }
  } else {
    instance = new MemoryPubSub();
  }
  return instance;
}

/** Test hook. */
export function setPubSub(ps: PubSub | null) { instance = ps; }
