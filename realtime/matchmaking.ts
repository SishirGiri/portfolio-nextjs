/**
 * Matchmaking — level-windowed pairing for ghost races.
 *
 * Start simple (spec §9): FIFO queue with a level window of ±3
 * that widens by 1 every 5 seconds of waiting, pairing 2–4
 * players. A group that has waited 20s+ locks in with whoever
 * is eligible (min 2). Pure logic — no sockets — so it is fully
 * unit-testable; the server pumps `tick()`.
 */

export interface QueueEntry {
  userId: string;
  username: string;
  level: number;
  carId: string;
  joinedAt: number;
}

export interface FormedMatch {
  players: QueueEntry[];
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const BASE_WINDOW = 3;
const WINDOW_GROWTH_PER_SEC = 0.2;
const IMPATIENCE_MS = 20_000;

export class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  get size() { return this.queue.length; }
  get waiting() { return [...this.queue]; }

  join(entry: Omit<QueueEntry, 'joinedAt'>): boolean {
    if (this.queue.some((q) => q.userId === entry.userId)) return false;
    this.queue.push({ ...entry, joinedAt: Date.now() });
    return true;
  }

  leave(userId: string): boolean {
    const before = this.queue.length;
    this.queue = this.queue.filter((q) => q.userId !== userId);
    return this.queue.length !== before;
  }

  /** Pair eligible players into matches. Call on an interval. */
  tick(now = Date.now()): FormedMatch[] {
    const matches: FormedMatch[] = [];
    // oldest first — fairness
    const pool = [...this.queue].sort((a, b) => a.joinedAt - b.joinedAt);

    while (pool.length >= MIN_PLAYERS) {
      const seed = pool[0];
      const waitedSec = (now - seed.joinedAt) / 1000;
      const window = BASE_WINDOW + waitedSec * WINDOW_GROWTH_PER_SEC;
      const group = [seed];
      for (let i = 1; i < pool.length && group.length < MAX_PLAYERS; i++) {
        const candidate = pool[i];
        if (Math.abs(candidate.level - seed.level) <= window) group.push(candidate);
      }
      // never pair a fresh seed with a single far-off player;
      // require the group to fill or the seed to be impatient
      if (group.length >= MIN_PLAYERS && (group.length >= MIN_PLAYERS + 1 || waitedSec * 1000 >= IMPATIENCE_MS || group.length >= MAX_PLAYERS)) {
        matches.push({ players: group });
        const ids = new Set(group.map((g) => g.userId));
        for (const g of group) {
          const idx = this.queue.findIndex((q) => q.userId === g.userId);
          if (idx >= 0) this.queue.splice(idx, 1);
        }
        pool.length = 0;
        pool.push(...this.queue.sort((a, b) => a.joinedAt - b.joinedAt));
        continue;
      }
      // seed can't be paired yet — try the next seeds in this pass
      let paired = false;
      for (let i = 1; i < pool.length && !paired; i++) {
        const alt = pool[i];
        if (Math.abs(alt.level - seed.level) > BASE_WINDOW + ((now - alt.joinedAt) / 1000) * WINDOW_GROWTH_PER_SEC) continue;
        const group2 = [seed, alt];
        matches.push({ players: group2 });
        const ids = new Set(group2.map((g) => g.userId));
        this.queue = this.queue.filter((q) => !ids.has(q.userId));
        pool.length = 0;
        pool.push(...this.queue.sort((a, b) => a.joinedAt - b.joinedAt));
        paired = true;
      }
      if (!paired) break;
    }
    return matches;
  }
}
