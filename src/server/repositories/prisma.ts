import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type {
  AchievementRecord,
  AuditLogRecord,
  FlaggedRunRecord,
  FriendRequestRecord,
  FriendSummary,
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

// ════════════════════════════════════════════════════════
// Prisma-backed repositories — the ONLY code in the game
// server that writes SQL-shaped calls. Everything above goes
// through the interfaces in types.ts.
// ════════════════════════════════════════════════════════

const userSelect = {
  id: true, username: true, isGuest: true, role: true, tokenVersion: true,
  disabled: true, email: true, emailVerifiedAt: true, createdAt: true,
} as const;

function toUser(u: {
  id: string; username: string | null; isGuest: boolean; role: 'PLAYER' | 'MODERATOR' | 'ADMIN';
  tokenVersion: number; disabled: boolean; email: string | null; emailVerifiedAt: Date | null; createdAt: Date;
}): UserRecord {
  return u;
}

export class PrismaPlayerRepository implements IPlayerRepository {
  async createUser(input: { username?: string; passwordHash?: string; isGuest: boolean }) {
    return toUser(
      await prisma.user.create({
        data: {
          username: input.username,
          passwordHash: input.passwordHash,
          isGuest: input.isGuest,
        },
        select: userSelect,
      }),
    );
  }
  async findById(id: string) {
    const u = await prisma.user.findUnique({ where: { id }, select: userSelect });
    return u ? toUser(u) : null;
  }
  async findByUsername(username: string) {
    const u = await prisma.user.findUnique({ where: { username }, select: userSelect });
    return u ? toUser(u) : null;
  }
  async findByEmail(email: string) {
    const u = await prisma.user.findUnique({ where: { email }, select: userSelect });
    return u ? toUser(u) : null;
  }
  async findHashById(id: string) {
    const u = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
    return u?.passwordHash ?? null;
  }
  async upgradeToAccount(userId: string, username: string, passwordHash: string) {
    try {
      const u = await prisma.user.update({
        where: { id: userId },
        data: { username, passwordHash, isGuest: false },
        select: userSelect,
      });
      return toUser(u);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
      throw err;
    }
  }
  async setPasswordHash(userId: string, passwordHash: string) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
  async setRole(userId: string, role: UserRecord['role']) {
    try {
      const u = await prisma.user.update({ where: { id: userId }, data: { role }, select: userSelect });
      return toUser(u);
    } catch {
      return null;
    }
  }
  async setDisabled(userId: string, disabled: boolean) {
    try {
      const u = await prisma.user.update({ where: { id: userId }, data: { disabled }, select: userSelect });
      return toUser(u);
    } catch {
      return null;
    }
  }
  async bumpTokenVersion(userId: string) {
    const u = await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    return u.tokenVersion;
  }
  async setEmail(userId: string, email: string | null, verifiedAt: Date | null) {
    try {
      const u = await prisma.user.update({
        where: { id: userId },
        data: { email, emailVerifiedAt: verifiedAt },
        select: userSelect,
      });
      return toUser(u);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
      throw err;
    }
  }
  async searchByUsername(query: string, limit: number, excludeId?: string) {
    const users = await prisma.user.findMany({
      where: {
        username: { startsWith: query, mode: 'insensitive' },
        isGuest: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: userSelect,
      orderBy: { username: 'asc' },
      take: limit,
    });
    return users.map(toUser);
  }
  async countUsers(where?: { disabled?: boolean; isGuest?: boolean }) {
    return prisma.user.count({
      where: {
        ...(where?.disabled !== undefined ? { disabled: where.disabled } : {}),
        ...(where?.isGuest !== undefined ? { isGuest: where.isGuest } : {}),
      },
    });
  }
  async getProfile(userId: string) {
    return prisma.playerProfile.findUnique({ where: { userId } });
  }
  async upsertProfile(userId: string, patch: Partial<Omit<ProfileRecord, 'userId'>>) {
    return prisma.playerProfile.upsert({
      where: { userId },
      create: { userId, displayName: patch.displayName ?? 'Driver', ...patch },
      update: patch,
    });
  }
  async getStats(userId: string) {
    return prisma.playerStats.findUnique({ where: { userId } });
  }
  async upsertStats(userId: string, patch: Partial<Omit<StatsRecord, 'userId'>>) {
    return prisma.playerStats.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
    });
  }
}

export class PrismaSaveRepository implements ISaveRepository {
  async get(userId: string): Promise<SaveRecord | null> {
    const rec = await prisma.gameSave.findUnique({ where: { userId } });
    return rec ? { userId: rec.userId, revision: rec.revision, data: rec.data as unknown as SaveBlob, updatedAt: rec.updatedAt } : null;
  }
  async put(userId: string, revision: number, data: SaveBlob): Promise<SaveRecord> {
    const rec = await prisma.gameSave.upsert({
      where: { userId },
      create: { userId, revision, data: data as unknown as Prisma.InputJsonValue },
      update: { revision, data: data as unknown as Prisma.InputJsonValue },
    });
    return { userId: rec.userId, revision: rec.revision, data: rec.data as unknown as SaveBlob, updatedAt: rec.updatedAt };
  }
}

export class PrismaMissionRepository implements IMissionRepository {
  async get(userId: string, missionId: string): Promise<MissionProgressRecord | null> {
    return prisma.missionProgress.findUnique({ where: { userId_missionId: { userId, missionId } } });
  }
  async upsert(userId: string, missionId: string, patch: { stars: number; bestTimeMs: number | null; completions: number }) {
    return prisma.missionProgress.upsert({
      where: { userId_missionId: { userId, missionId } },
      create: { userId, missionId, ...patch },
      update: patch,
    });
  }
  async listForUser(userId: string) {
    return prisma.missionProgress.findMany({ where: { userId } });
  }
}

export class PrismaVehicleRepository implements IVehicleRepository {
  async listForUser(userId: string): Promise<OwnedVehicleRecord[]> {
    const rows = await prisma.ownedVehicle.findMany({ where: { userId } });
    return rows.map((r) => ({ ...r, upgrades: r.upgrades as Record<string, number> }));
  }
  async replaceAll(userId: string, vehicles: Omit<OwnedVehicleRecord, 'userId'>[]) {
    await prisma.$transaction([
      prisma.ownedVehicle.deleteMany({ where: { userId } }),
      prisma.ownedVehicle.createMany({
        data: vehicles.map((v) => ({ ...v, userId, upgrades: v.upgrades as unknown as Prisma.InputJsonValue })),
      }),
    ]);
  }
}

function periodStart(period: LeaderboardQuery['period']): Date | null {
  if (period === 'day') return new Date(Date.now() - 24 * 3600_000);
  if (period === 'week') return new Date(Date.now() - 7 * 24 * 3600_000);
  return null;
}

export class PrismaLeaderboardRepository implements ILeaderboardRepository {
  async insert(entry: Omit<LeaderboardEntryRecord, 'id' | 'createdAt'>) {
    return prisma.leaderboardEntry.create({ data: entry });
  }
  /** Board visibility filter: registered-only boards and friends boards. */
  private boardUserFilter(q: LeaderboardQuery): Prisma.UserWhereInput | undefined {
    if (q.userIds) return { id: { in: q.userIds }, isGuest: false };
    if (q.registeredOnly) return { isGuest: false };
    return undefined;
  }
  async topForMission(missionId: string, q: LeaderboardQuery) {
    const since = periodStart(q.period);
    const userFilter = this.boardUserFilter(q);
    const where: Prisma.LeaderboardEntryWhereInput = {
      missionId,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(userFilter ? { user: userFilter } : {}),
    };
    // best score per user within the window
    const grouped = await prisma.leaderboardEntry.groupBy({
      by: ['userId'],
      where,
      _max: { score: true },
      orderBy: { _max: { score: 'desc' } },
      skip: ((q.page ?? 1) - 1) * (q.limit ?? 15),
      take: q.limit ?? 15,
    });
    const total = await prisma.leaderboardEntry.groupBy({ by: ['userId'], where, _count: true });
    if (!grouped.length) return { entries: [], total: total.length };
    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, username: true, isGuest: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u]));
    // fetch the winning entry rows for display details
    const rows = await prisma.leaderboardEntry.findMany({
      where: { missionId, userId: { in: grouped.map((g) => g.userId) }, ...(since ? { createdAt: { gte: since } } : {}) },
      orderBy: { score: 'desc' },
    });
    const bestByUser = new Map<string, LeaderboardEntryRecord>();
    for (const r of rows) {
      const cur = bestByUser.get(r.userId);
      if (!cur || r.score > cur.score) bestByUser.set(r.userId, r);
    }
    const entries = grouped
      .map((g) => {
        const row = bestByUser.get(g.userId);
        if (!row) return null;
        const user = nameById.get(g.userId);
        return { ...row, displayName: user?.username || 'Guest', isGuest: user?.isGuest ?? true };
      })
      .filter((e): e is LeaderboardEntryRecord & { displayName: string; isGuest: boolean } => e !== null);
    return { entries, total: total.length };
  }
  async topOverall(q: LeaderboardQuery) {
    const limit = q.limit ?? 15;
    const userFilter = this.boardUserFilter(q);
    const where: Prisma.PlayerProfileWhereInput = userFilter ? { user: userFilter } : {};
    const [profiles, total] = await Promise.all([
      prisma.playerProfile.findMany({
        where,
        orderBy: [{ careerScore: 'desc' }, { updatedAt: 'asc' }],
        skip: ((q.page ?? 1) - 1) * limit,
        take: limit,
        include: { user: { select: { username: true, isGuest: true } } },
      }),
      prisma.playerProfile.count({ where }),
    ]);
    return {
      entries: profiles.map((p) => ({ ...p, username: p.user.username, isGuest: p.user.isGuest })),
      total,
    };
  }
  async bestForUser(userId: string) {
    return prisma.leaderboardEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async countRecentForUser(userId: string, sinceMs: number) {
    return prisma.leaderboardEntry.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - sinceMs) } },
    });
  }
}

export class PrismaAchievementRepository implements IAchievementRepository {
  async listForUser(userId: string): Promise<AchievementRecord[]> {
    return prisma.achievement.findMany({ where: { userId } });
  }
  async addMany(userId: string, achievementIds: string[]): Promise<AchievementRecord[]> {
    if (!achievementIds.length) return [];
    try {
      return await prisma.achievement.createManyAndReturn({
        data: achievementIds.map((achievementId) => ({ userId, achievementId })),
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return [];
      throw err;
    }
  }
}

// ── social + platform repositories ─────────────────────────

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export class PrismaFriendRepository implements IFriendRepository {
  async findRequestBetween(a: string, b: string): Promise<FriendRequestRecord | null> {
    const rec = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromId: a, toId: b },
          { fromId: b, toId: a },
        ],
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec) return null;
    return { ...rec, status: rec.status as FriendRequestRecord['status'] };
  }
  async createRequest(fromId: string, toId: string): Promise<FriendRequestRecord | null> {
    try {
      const rec = await prisma.friendRequest.create({ data: { fromId, toId } });
      return { ...rec, status: rec.status as FriendRequestRecord['status'] };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
      throw err;
    }
  }
  async listIncoming(userId: string): Promise<FriendRequestRecord[]> {
    const rows = await prisma.friendRequest.findMany({
      where: { toId: userId, status: 'pending' },
      include: { from: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id, fromId: r.fromId, toId: r.toId,
      status: r.status as FriendRequestRecord['status'], createdAt: r.createdAt,
      fromUsername: r.from.username,
    }));
  }
  async updateRequest(id: string, status: FriendRequestRecord['status']): Promise<FriendRequestRecord | null> {
    try {
      const rec = await prisma.friendRequest.update({
        where: { id },
        data: { status },
      });
      return { ...rec, status: rec.status as FriendRequestRecord['status'] };
    } catch {
      return null;
    }
  }
  async createFriendship(a: string, b: string) {
    const [userAId, userBId] = pair(a, b);
    await prisma.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });
  }
  async removeFriendship(a: string, b: string) {
    const [userAId, userBId] = pair(a, b);
    await prisma.friendship.deleteMany({ where: { userAId, userBId } });
  }
  async areFriends(a: string, b: string) {
    const [userAId, userBId] = pair(a, b);
    const n = await prisma.friendship.count({ where: { userAId, userBId } });
    return n > 0;
  }
  async listFriends(userId: string): Promise<FriendSummary[]> {
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, username: true, profile: { select: { displayName: true, level: true, careerScore: true, currentCar: true } } } },
        userB: { select: { id: true, username: true, profile: { select: { displayName: true, level: true, careerScore: true, currentCar: true } } } },
      },
    });
    return rows.map((f) => {
      const other = f.userAId === userId ? f.userB : f.userA;
      return {
        userId: other.id,
        username: other.username ?? 'unknown',
        displayName: other.profile?.displayName ?? other.username ?? 'Driver',
        level: other.profile?.level ?? 0,
        careerScore: other.profile?.careerScore ?? 0,
        currentCar: other.profile?.currentCar ?? 'toro',
      };
    });
  }
  async friendIds(userId: string) {
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    return rows.map((f) => (f.userAId === userId ? f.userBId : f.userAId));
  }
}

export class PrismaNotificationRepository implements INotificationRepository {
  async create(userId: string, input: { type: string; title: string; body?: string; data?: Record<string, unknown> }) {
    const rec = await prisma.notification.create({
      data: {
        userId, type: input.type, title: input.title,
        body: input.body ?? '', data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });
    return { ...rec, data: rec.data as Record<string, unknown> } satisfies NotificationRecord;
  }
  async listForUser(userId: string, opts?: { limit?: number; unreadOnly?: boolean }) {
    const rows = await prisma.notification.findMany({
      where: { userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 30,
    });
    return rows.map((r) => ({ ...r, data: r.data as Record<string, unknown> }));
  }
  async markRead(userId: string, id: string) {
    await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }
  async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
  async unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }
}

export class PrismaAuditRepository implements IAuditRepository {
  async log(input: { actorId?: string | null; action: string; targetType: string; targetId?: string | null; data?: Record<string, unknown> }) {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null, action: input.action,
        targetType: input.targetType, targetId: input.targetId ?? null,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
  async list(opts?: { limit?: number; page?: number; targetType?: string }) {
    const rows = await prisma.auditLog.findMany({
      where: opts?.targetType ? { targetType: opts.targetType } : {},
      include: { actor: { select: { username: true } } },
      orderBy: { id: 'desc' },
      skip: ((opts?.page ?? 1) - 1) * (opts?.limit ?? 50),
      take: opts?.limit ?? 50,
    });
    return rows.map((r) => ({
      id: r.id, actorId: r.actorId, action: r.action, targetType: r.targetType,
      targetId: r.targetId, data: r.data as Record<string, unknown>, createdAt: r.createdAt,
      actorUsername: r.actor?.username ?? null,
    })) satisfies AuditLogRecord[];
  }
}

export class PrismaFlagRepository implements IFlagRepository {
  async create(input: { userId: string; reason: string; severity?: 'low' | 'medium' | 'high'; data?: Record<string, unknown> }) {
    const rec = await prisma.flaggedRun.create({
      data: {
        userId: input.userId, reason: input.reason, severity: input.severity ?? 'low',
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
      include: { user: { select: { username: true } } },
    });
    return this.toRecord(rec);
  }
  async list(opts?: { status?: string; limit?: number; page?: number }) {
    const rows = await prisma.flaggedRun.findMany({
      where: opts?.status ? { status: opts.status } : {},
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: ((opts?.page ?? 1) - 1) * (opts?.limit ?? 50),
      take: opts?.limit ?? 50,
    });
    return rows.map((r) => this.toRecord(r));
  }
  async update(id: string, patch: { status: 'open' | 'dismissed' | 'actioned'; reviewedBy: string }) {
    try {
      const rec = await prisma.flaggedRun.update({
        where: { id },
        data: { status: patch.status, reviewedAt: new Date(), reviewedBy: patch.reviewedBy },
        include: { user: { select: { username: true } } },
      });
      return this.toRecord(rec);
    } catch {
      return null;
    }
  }
  async counts() {
    const grouped = await prisma.flaggedRun.groupBy({ by: ['status'], _count: true });
    const out = { open: 0, dismissed: 0, actioned: 0 };
    for (const g of grouped) {
      if (g.status === 'open' || g.status === 'dismissed' || g.status === 'actioned') out[g.status] = g._count;
    }
    return out;
  }
  private toRecord(rec: { id: string; userId: string; reason: string; severity: string; status: string; data: Prisma.JsonValue; createdAt: Date; reviewedAt: Date | null; reviewedBy: string | null; user?: { username: string | null } | null }): FlaggedRunRecord {
    return {
      id: rec.id, userId: rec.userId, username: rec.user?.username ?? null, reason: rec.reason,
      severity: rec.severity as FlaggedRunRecord['severity'], status: rec.status as FlaggedRunRecord['status'],
      data: (rec.data ?? {}) as Record<string, unknown>, createdAt: rec.createdAt,
      reviewedAt: rec.reviewedAt, reviewedBy: rec.reviewedBy,
    };
  }
}

export class PrismaMatchRepository implements IMatchRepository {
  async createMatch(input: { mode: string; missionId: string; seed: number }) {
    const rec = await prisma.matchRecord.create({ data: input });
    return { ...rec, endedAt: rec.endedAt } satisfies MatchRecordRecord;
  }
  async finishMatch(id: string) {
    await prisma.matchRecord.update({ where: { id }, data: { endedAt: new Date() } });
  }
  async addParticipant(input: { matchId: string; userId: string; position: number; score: number; finishMs: number | null; carId: string }) {
    await prisma.matchParticipant.create({ data: input });
  }
  async get(id: string) {
    const match = await prisma.matchRecord.findUnique({
      where: { id },
      include: { participants: { include: { user: { select: { username: true } } }, orderBy: { position: 'asc' } } },
    });
    if (!match) return null;
    return {
      match: { ...match, endedAt: match.endedAt },
      participants: match.participants.map((p) => ({ ...p, username: p.user.username })),
    };
  }
  async recent(limit: number) {
    const matches = await prisma.matchRecord.findMany({
      include: { participants: { include: { user: { select: { username: true } } } } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return matches.map((match) => ({
      match: { ...match, endedAt: match.endedAt },
      participants: match.participants
        .sort((a, b) => a.position - b.position)
        .map((p) => ({ ...p, username: p.user.username })),
    }));
  }
  async countActive() {
    return prisma.matchRecord.count({ where: { endedAt: null } });
  }
}

export class PrismaAnalyticsRepository implements IAnalyticsRepository {
  async track(name: string, userId: string | null | undefined, props?: Record<string, unknown>) {
    await prisma.analyticsEvent.create({
      data: { name, userId: userId ?? null, props: (props ?? {}) as Prisma.InputJsonValue },
    });
  }
  async dau(days: number) {
    const rows = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS date, COUNT(DISTINCT "userId") AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= NOW() - (${days} || ' days')::interval AND "userId" IS NOT NULL
      GROUP BY 1 ORDER BY 1`;
    const map = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.count)]));
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      out.push({ date: day, count: map.get(day) ?? 0 });
    }
    return out;
  }
  async countsSince(names: string[], sinceMs: number) {
    const rows = await prisma.analyticsEvent.groupBy({
      by: ['name'],
      where: { name: { in: names }, createdAt: { gte: new Date(Date.now() - sinceMs) } },
      _count: true,
    });
    const out: Record<string, number> = {};
    for (const name of names) out[name] = 0;
    for (const r of rows) out[r.name] = r._count;
    return out;
  }
  async registrations(days: number) {
    const rows = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS date, COUNT(*) AS count
      FROM "User"
      WHERE "isGuest" = false AND "createdAt" >= NOW() - (${days} || ' days')::interval
      GROUP BY 1 ORDER BY 1`;
    const map = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.count)]));
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      out.push({ date: day, count: map.get(day) ?? 0 });
    }
    return out;
  }
}

export function createPrismaRepositories(): Repositories {
  return {
    players: new PrismaPlayerRepository(),
    saves: new PrismaSaveRepository(),
    missions: new PrismaMissionRepository(),
    vehicles: new PrismaVehicleRepository(),
    leaderboard: new PrismaLeaderboardRepository(),
    achievements: new PrismaAchievementRepository(),
    friends: new PrismaFriendRepository(),
    notifications: new PrismaNotificationRepository(),
    audit: new PrismaAuditRepository(),
    flags: new PrismaFlagRepository(),
    matches: new PrismaMatchRepository(),
    analytics: new PrismaAnalyticsRepository(),
  };
}
