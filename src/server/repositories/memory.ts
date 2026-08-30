/**
 * In-memory repository implementations — used by the test
 * suite and any environment without PostgreSQL. Mirrors the
 * Prisma implementations' semantics (including conflict
 * behavior) so service tests run without a database.
 */
import type {
  AchievementRecord,
  AuditLogRecord,
  IAchievementRepository,
  IAuditRepository,
  IFlagRepository,
  IFriendRepository,
  IAnalyticsRepository,
  ILeaderboardRepository,
  IMatchRepository,
  IMissionRepository,
  INotificationRepository,
  IPlayerRepository,
  ISaveRepository,
  IVehicleRepository,
  FlaggedRunRecord,
  FriendRequestRecord,
  FriendSummary,
  LeaderboardEntryRecord,
  LeaderboardQuery,
  MatchParticipantRecord,
  MatchRecordRecord,
  MissionProgressRecord,
  NotificationRecord,
  OwnedVehicleRecord,
  ProfileRecord,
  Repositories,
  SaveBlob,
  SaveRecord,
  StatsRecord,
  UserRecord,
} from './types';

export class MemoryPlayerRepository implements IPlayerRepository {
  users = new Map<string, UserRecord>();
  hashes = new Map<string, string>();
  profiles = new Map<string, ProfileRecord>();
  stats = new Map<string, StatsRecord>();
  private seq = 0;

  async createUser(input: { username?: string; passwordHash?: string; isGuest: boolean }) {
    if (input.username && [...this.users.values()].some((u) => u.username === input.username)) {
      const err = new Error('Unique constraint failed') as Error & { code: string };
      err.code = 'P2002';
      throw err;
    }
    const user: UserRecord = {
      id: `u${++this.seq}`,
      username: input.username ?? null,
      isGuest: input.isGuest,
      role: 'PLAYER',
      tokenVersion: 0,
      disabled: false,
      email: null,
      emailVerifiedAt: null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    if (input.passwordHash) this.hashes.set(user.id, input.passwordHash);
    return user;
  }
  async findById(id: string) { return this.users.get(id) ?? null; }
  async findByUsername(username: string) {
    return [...this.users.values()].find((u) => u.username === username) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }
  async findHashById(id: string) { return this.hashes.get(id) ?? null; }
  async upgradeToAccount(userId: string, username: string, passwordHash: string) {
    const u = this.users.get(userId);
    if (!u) return null;
    if ([...this.users.values()].some((x) => x.username === username && x.id !== userId)) return null;
    u.username = username;
    u.isGuest = false;
    this.hashes.set(userId, passwordHash);
    return u;
  }
  async setPasswordHash(userId: string, passwordHash: string) { this.hashes.set(userId, passwordHash); }
  async setRole(userId: string, role: UserRecord['role']) {
    const u = this.users.get(userId);
    if (!u) return null;
    u.role = role;
    return u;
  }
  async setDisabled(userId: string, disabled: boolean) {
    const u = this.users.get(userId);
    if (!u) return null;
    u.disabled = disabled;
    return u;
  }
  async bumpTokenVersion(userId: string) {
    const u = this.users.get(userId);
    if (!u) return 0;
    u.tokenVersion += 1;
    return u.tokenVersion;
  }
  async setEmail(userId: string, email: string | null, verifiedAt: Date | null) {
    const u = this.users.get(userId);
    if (!u) return null;
    if (email !== null && [...this.users.values()].some((x) => x.email === email && x.id !== userId)) {
      const err = new Error('Unique constraint failed') as Error & { code: string };
      err.code = 'P2002';
      throw err;
    }
    u.email = email;
    u.emailVerifiedAt = verifiedAt;
    return u;
  }
  async searchByUsername(query: string, limit: number, excludeId?: string) {
    const q = query.toLowerCase();
    return [...this.users.values()]
      .filter((u) => u.id !== excludeId && !u.isGuest && u.username !== null && u.username.toLowerCase().startsWith(q))
      .sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''))
      .slice(0, limit);
  }
  async countUsers(where?: { disabled?: boolean; isGuest?: boolean }) {
    return [...this.users.values()]
      .filter((u) => (where?.disabled === undefined || u.disabled === where.disabled)
        && (where?.isGuest === undefined || u.isGuest === where.isGuest))
      .length;
  }
  async getProfile(userId: string) { return this.profiles.get(userId) ?? null; }
  async upsertProfile(userId: string, patch: Partial<Omit<ProfileRecord, 'userId'>>) {
    const cur = this.profiles.get(userId) ?? {
      userId, displayName: 'Driver', avatar: 'car', level: 0, xp: 0, money: 0, currentCar: 'toro', careerScore: 0, updatedAt: new Date(),
    };
    const next = { ...cur, ...patch, updatedAt: new Date() };
    this.profiles.set(userId, next);
    return next;
  }
  async getStats(userId: string) { return this.stats.get(userId) ?? null; }
  async upsertStats(userId: string, patch: Partial<Omit<StatsRecord, 'userId'>>) {
    const cur = this.stats.get(userId) ?? {
      userId, distanceM: 0, playtimeSec: 0, missionsCompleted: 0, missionsFailed: 0, collisions: 0,
      busts: 0, escapes: 0, topSpeedKmh: 0, moneyEarned: 0, moneySpent: 0, updatedAt: new Date(),
    };
    const next = { ...cur, ...patch, updatedAt: new Date() };
    this.stats.set(userId, next);
    return next;
  }
}

export class MemorySaveRepository implements ISaveRepository {
  saves = new Map<string, SaveRecord>();

  async get(userId: string) { return this.saves.get(userId) ?? null; }
  async put(userId: string, revision: number, data: SaveBlob) {
    const rec: SaveRecord = { userId, revision, data, updatedAt: new Date() };
    this.saves.set(userId, rec);
    return rec;
  }
}

export class MemoryMissionRepository implements IMissionRepository {
  progress = new Map<string, MissionProgressRecord>();
  private key(userId: string, missionId: string) { return `${userId}:${missionId}`; }

  async get(userId: string, missionId: string) { return this.progress.get(this.key(userId, missionId)) ?? null; }
  async upsert(userId: string, missionId: string, patch: { stars: number; bestTimeMs: number | null; completions: number }) {
    const next: MissionProgressRecord = {
      userId, missionId,
      stars: patch.stars,
      bestTimeMs: patch.bestTimeMs,
      completions: patch.completions,
      updatedAt: new Date(),
    };
    this.progress.set(this.key(userId, missionId), next);
    return next;
  }
  async listForUser(userId: string) {
    return [...this.progress.values()].filter((p) => p.userId === userId);
  }
}

export class MemoryVehicleRepository implements IVehicleRepository {
  vehicles = new Map<string, OwnedVehicleRecord[]>();

  async listForUser(userId: string) { return this.vehicles.get(userId) ?? []; }
  async replaceAll(userId: string, vehicles: Omit<OwnedVehicleRecord, 'userId'>[]) {
    this.vehicles.set(userId, vehicles.map((v) => ({ ...v, userId })));
  }
}

export class MemoryLeaderboardRepository implements ILeaderboardRepository {
  entries: LeaderboardEntryRecord[] = [];
  players!: MemoryPlayerRepository;   // wired by createMemoryRepositories
  private seq = 0;

  async insert(entry: Omit<LeaderboardEntryRecord, 'id' | 'createdAt'>) {
    const rec: LeaderboardEntryRecord = { ...entry, id: ++this.seq, createdAt: new Date() };
    this.entries.push(rec);
    return rec;
  }
  async topForMission(missionId: string, q: LeaderboardQuery) {
    const since = q.period === 'day' ? Date.now() - 86400_000 : q.period === 'week' ? Date.now() - 7 * 86400_000 : 0;
    const allowed = (userId: string) => {
      if (q.userIds && !q.userIds.includes(userId)) return false;
      if (q.registeredOnly) return this.players.users.get(userId)?.isGuest === false;
      return true;
    };
    const rows = this.entries.filter((e) => e.missionId === missionId && e.createdAt.getTime() >= since && allowed(e.userId));
    const best = new Map<string, LeaderboardEntryRecord>();
    for (const r of rows) {
      const cur = best.get(r.userId);
      if (!cur || r.score > cur.score) best.set(r.userId, r);
    }
    const sorted = [...best.values()].sort((a, b) => b.score - a.score);
    const page = q.page ?? 1;
    const limit = q.limit ?? 15;
    return {
      entries: sorted.slice((page - 1) * limit, page * limit).map((e) => ({
        ...e,
        displayName: this.players.users.get(e.userId)?.username ?? 'Guest',
        isGuest: this.players.users.get(e.userId)?.isGuest ?? true,
      })),
      total: best.size,
    };
  }
  async topOverall(q: LeaderboardQuery) {
    const allowed = (userId: string) => {
      if (q.userIds && !q.userIds.includes(userId)) return false;
      if (q.registeredOnly) return this.players.users.get(userId)?.isGuest === false;
      return true;
    };
    const sorted = [...this.players.profiles.entries()]
      .filter(([userId]) => allowed(userId))
      .map(([userId, p]) => ({
        ...p,
        username: this.players.users.get(userId)?.username ?? null,
        isGuest: this.players.users.get(userId)?.isGuest ?? true,
      }))
      .sort((a, b) => b.careerScore - a.careerScore);
    const page = q.page ?? 1;
    const limit = q.limit ?? 15;
    return { entries: sorted.slice((page - 1) * limit, page * limit), total: sorted.length };
  }
  async bestForUser(userId: string) {
    return this.entries.filter((e) => e.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async countRecentForUser(userId: string, sinceMs: number) {
    return this.entries.filter((e) => e.userId === userId && e.createdAt.getTime() >= Date.now() - sinceMs).length;
  }
}

export class MemoryAchievementRepository implements IAchievementRepository {
  achievements = new Map<string, AchievementRecord>();

  async listForUser(userId: string) {
    return [...this.achievements.values()].filter((a) => a.userId === userId);
  }
  async addMany(userId: string, achievementIds: string[]) {
    const added: AchievementRecord[] = [];
    for (const achievementId of achievementIds) {
      const key = `${userId}:${achievementId}`;
      if (this.achievements.has(key)) continue;
      const rec = { userId, achievementId, unlockedAt: new Date() };
      this.achievements.set(key, rec);
      added.push(rec);
    }
    return added;
  }
}

export class MemoryFriendRepository implements IFriendRepository {
  requests: (FriendRequestRecord & { fromId: string; toId: string })[] = [];
  friendships: { userAId: string; userBId: string; createdAt: Date }[] = [];
  players!: MemoryPlayerRepository;

  private pair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  async findRequestBetween(a: string, b: string) {
    return this.requests.find((r) =>
      (r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a)) ?? null;
  }
  async createRequest(fromId: string, toId: string) {
    const rec: FriendRequestRecord = {
      id: `fr${this.requests.length + 1}`,
      fromId, toId, status: 'pending', createdAt: new Date(),
      fromUsername: this.players.users.get(fromId)?.username ?? null,
    };
    this.requests.push(rec);
    return rec;
  }
  async listIncoming(userId: string) {
    return this.requests
      .filter((r) => r.toId === userId && r.status === 'pending')
      .map((r) => ({ ...r, fromUsername: this.players.users.get(r.fromId)?.username ?? null }));
  }
  async updateRequest(id: string, status: FriendRequestRecord['status']) {
    const r = this.requests.find((x) => x.id === id);
    if (!r) return null;
    r.status = status;
    return r;
  }
  async createFriendship(a: string, b: string) {
    const [x, y] = this.pair(a, b);
    if (!this.friendships.some((f) => f.userAId === x && f.userBId === y)) {
      this.friendships.push({ userAId: x, userBId: y, createdAt: new Date() });
    }
  }
  async removeFriendship(a: string, b: string) {
    const [x, y] = this.pair(a, b);
    this.friendships = this.friendships.filter((f) => !(f.userAId === x && f.userBId === y));
  }
  async areFriends(a: string, b: string) {
    const [x, y] = this.pair(a, b);
    return this.friendships.some((f) => f.userAId === x && f.userBId === y);
  }
  async listFriends(userId: string): Promise<FriendSummary[]> {
    const ids = this.friendships
      .filter((f) => f.userAId === userId || f.userBId === userId)
      .map((f) => (f.userAId === userId ? f.userBId : f.userAId));
    return ids.map((id) => {
      const u = this.players.users.get(id);
      const p = this.players.profiles.get(id);
      return {
        userId: id,
        username: u?.username ?? 'unknown',
        displayName: p?.displayName ?? u?.username ?? 'Driver',
        level: p?.level ?? 0,
        careerScore: p?.careerScore ?? 0,
        currentCar: p?.currentCar ?? 'toro',
      };
    });
  }
  async friendIds(userId: string) {
    return this.friendships
      .filter((f) => f.userAId === userId || f.userBId === userId)
      .map((f) => (f.userAId === userId ? f.userBId : f.userAId));
  }
}

export class MemoryNotificationRepository implements INotificationRepository {
  notifications: NotificationRecord[] = [];
  private seq = 0;

  async create(userId: string, input: { type: string; title: string; body?: string; data?: Record<string, unknown> }) {
    const rec: NotificationRecord = {
      id: `n${++this.seq}`, userId, type: input.type,
      title: input.title, body: input.body ?? '', data: input.data ?? {},
      readAt: null, createdAt: new Date(),
    };
    this.notifications.push(rec);
    return rec;
  }
  async listForUser(userId: string, opts?: { limit?: number; unreadOnly?: boolean }) {
    return this.notifications
      .filter((n) => n.userId === userId && (!opts?.unreadOnly || n.readAt === null))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, opts?.limit ?? 30);
  }
  async markRead(userId: string, id: string) {
    const n = this.notifications.find((x) => x.userId === userId && x.id === id);
    if (n) n.readAt = new Date();
  }
  async markAllRead(userId: string) {
    for (const n of this.notifications) {
      if (n.userId === userId && n.readAt === null) n.readAt = new Date();
    }
  }
  async unreadCount(userId: string) {
    return this.notifications.filter((n) => n.userId === userId && n.readAt === null).length;
  }
}

export class MemoryAuditRepository implements IAuditRepository {
  logs: AuditLogRecord[] = [];
  private seq = 0;

  async log(input: { actorId?: string | null; action: string; targetType: string; targetId?: string | null; data?: Record<string, unknown> }) {
    this.logs.push({
      id: ++this.seq, actorId: input.actorId ?? null, action: input.action,
      targetType: input.targetType, targetId: input.targetId ?? null,
      data: input.data ?? {}, createdAt: new Date(),
    });
  }
  async list(opts?: { limit?: number; page?: number; targetType?: string }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    return this.logs
      .filter((l) => !opts?.targetType || l.targetType === opts.targetType)
      .sort((a, b) => b.id - a.id)
      .slice((page - 1) * limit, page * limit);
  }
}

export class MemoryFlagRepository implements IFlagRepository {
  flags: FlaggedRunRecord[] = [];

  async create(input: { userId: string; reason: string; severity?: 'low' | 'medium' | 'high'; data?: Record<string, unknown> }) {
    const rec: FlaggedRunRecord = {
      id: `fl${this.flags.length + 1}`, userId: input.userId, reason: input.reason,
      severity: input.severity ?? 'low', status: 'open',
      data: input.data ?? {}, createdAt: new Date(), reviewedAt: null, reviewedBy: null,
    };
    this.flags.push(rec);
    return rec;
  }
  async list(opts?: { status?: string; limit?: number; page?: number }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    return this.flags
      .filter((f) => !opts?.status || f.status === opts.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * limit, page * limit);
  }
  async update(id: string, patch: { status: 'open' | 'dismissed' | 'actioned'; reviewedBy: string }) {
    const f = this.flags.find((x) => x.id === id);
    if (!f) return null;
    f.status = patch.status;
    f.reviewedAt = new Date();
    f.reviewedBy = patch.reviewedBy;
    return f;
  }
  async counts() {
    const c = { open: 0, dismissed: 0, actioned: 0 };
    for (const f of this.flags) c[f.status] += 1;
    return c;
  }
}

export class MemoryMatchRepository implements IMatchRepository {
  matches = new Map<string, { match: MatchRecordRecord; participants: MatchParticipantRecord[] }>();
  private seq = 0;

  async createMatch(input: { mode: string; missionId: string; seed: number }) {
    const match: MatchRecordRecord = {
      id: `m${++this.seq}`, mode: input.mode, missionId: input.missionId,
      seed: input.seed, startedAt: new Date(), endedAt: null,
    };
    this.matches.set(match.id, { match, participants: [] });
    return match;
  }
  async finishMatch(id: string) {
    const rec = this.matches.get(id);
    if (rec) rec.match.endedAt = new Date();
  }
  async addParticipant(input: { matchId: string; userId: string; position: number; score: number; finishMs: number | null; carId: string }) {
    const rec = this.matches.get(input.matchId);
    if (!rec) return;
    rec.participants.push({ id: `${input.matchId}:${input.userId}`, ...input });
  }
  async get(id: string) { return this.matches.get(id) ?? null; }
  async recent(limit: number) {
    return [...this.matches.values()]
      .sort((a, b) => b.match.startedAt.getTime() - a.match.startedAt.getTime())
      .slice(0, limit);
  }
  async countActive() {
    return [...this.matches.values()].filter((m) => m.match.endedAt === null).length;
  }
}

export class MemoryAnalyticsRepository implements IAnalyticsRepository {
  events: { name: string; userId: string | null; props: Record<string, unknown>; createdAt: Date }[] = [];

  async track(name: string, userId: string | null | undefined, props?: Record<string, unknown>) {
    this.events.push({ name, userId: userId ?? null, props: props ?? {}, createdAt: new Date() });
  }
  async dau(days: number) {
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      const users = new Set(
        this.events.filter((e) => e.createdAt.toISOString().slice(0, 10) === day && e.userId).map((e) => e.userId),
      );
      out.push({ date: day, count: users.size });
    }
    return out;
  }
  async countsSince(names: string[], sinceMs: number) {
    const out: Record<string, number> = {};
    for (const name of names) {
      out[name] = this.events.filter((e) => e.name === name && e.createdAt.getTime() >= Date.now() - sinceMs).length;
    }
    return out;
  }
  async registrations(days: number) {
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      out.push({ date: day, count: this.regCountFor(day) });
    }
    return out;
  }
  private regCountFor(day: string) {
    // wired to the player repo by createMemoryRepositories
    return (this.playersRef?.users
      ? [...this.playersRef.users.values()].filter((u) => !u.isGuest && u.createdAt.toISOString().slice(0, 10) === day).length
      : 0);
  }
  playersRef: MemoryPlayerRepository | null = null;
}

export function createMemoryRepositories(): Repositories & {
  players: MemoryPlayerRepository;
  leaderboard: MemoryLeaderboardRepository;
  friends: MemoryFriendRepository;
  analytics: MemoryAnalyticsRepository;
} {
  const players = new MemoryPlayerRepository();
  const saves = new MemorySaveRepository();
  const missions = new MemoryMissionRepository();
  const vehicles = new MemoryVehicleRepository();
  const leaderboard = new MemoryLeaderboardRepository();
  const achievements = new MemoryAchievementRepository();
  const friends = new MemoryFriendRepository();
  const notifications = new MemoryNotificationRepository();
  const audit = new MemoryAuditRepository();
  const flags = new MemoryFlagRepository();
  const matches = new MemoryMatchRepository();
  const analytics = new MemoryAnalyticsRepository();
  leaderboard.players = players;
  friends.players = players;
  analytics.playersRef = players;
  return { players, saves, missions, vehicles, leaderboard, achievements, friends, notifications, audit, flags, matches, analytics };
}
