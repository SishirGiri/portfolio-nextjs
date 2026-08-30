/**
 * Repository contracts. Services depend on these interfaces —
 * Prisma/PostgreSQL is one implementation (repositories/prisma),
 * an in-memory implementation backs the test suite. Swapping the
 * database therefore never touches service or route code.
 */

export type UserRole = 'PLAYER' | 'MODERATOR' | 'ADMIN';

export interface UserRecord {
  id: string;
  username: string | null;
  isGuest: boolean;
  role: UserRole;
  tokenVersion: number;
  disabled: boolean;
  email: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface ProfileRecord {
  userId: string;
  displayName: string;
  avatar: string;
  level: number;
  xp: number;
  money: number;
  currentCar: string;
  careerScore: number;
  updatedAt: Date;
}

export interface SaveRecord {
  userId: string;
  revision: number;
  data: SaveBlob;
  updatedAt: Date;
}

export interface StatsRecord {
  userId: string;
  distanceM: number;
  playtimeSec: number;
  missionsCompleted: number;
  missionsFailed: number;
  collisions: number;
  busts: number;
  escapes: number;
  topSpeedKmh: number;
  moneyEarned: number;
  moneySpent: number;
  updatedAt: Date;
}

export interface MissionProgressRecord {
  userId: string;
  missionId: string;
  stars: number;
  bestTimeMs: number | null;
  completions: number;
  updatedAt: Date;
}

export interface OwnedVehicleRecord {
  userId: string;
  carId: string;
  paint: string;
  spoiler: number;
  wheels: number;
  caliper: number;
  kit: number;
  exhaust: number;
  upgrades: Record<string, number>;
}

export interface LeaderboardEntryRecord {
  id: number;
  userId: string;
  missionId: string;
  score: number;
  timeMs: number;
  stars: number;
  level: number;
  vehicleId: string;
  distanceM: number;
  createdAt: Date;
}

export interface AchievementRecord {
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

// ── sanitized save blob shape (see services/saveSanitizer.ts) ──
export interface SaveBlob {
  v: number;
  rev: number;
  updatedAt: number;
  money: number;
  xp: number;
  currentCar: string;
  ownedCars: Record<
    string,
    {
      upgrades: Record<string, number>;
      paint: string;
      spoiler: number;
      wheels: number;
      caliper: number;
      kit: number;
      exhaust: number;
    }
  >;
  completed: Record<string, { stars: number; bestTime: number | null }>;
  achievements: string[];
  stats: {
    distanceM: number;
    playtimeSec: number;
    missionsCompleted: number;
    missionsFailed: number;
    collisions: number;
    busts: number;
    escapes: number;
    topSpeedKmh: number;
    moneyEarned: number;
    moneySpent: number;
    bestRunScore: number;
  };
  settings: {
    sound: boolean;
    quality: string;
    transmission: string;
    tractionControl: boolean;
    volumes: {
      master: number;
      music: number;
      engine: number;
      sfx: number;
      environment: number;
      ui: number;
      voice: number;
    };
  };
  pos?: { x: number; z: number; h: number };
}

// ── repository interfaces ──────────────────────────────────

export interface IPlayerRepository {
  createUser(input: { username?: string; passwordHash?: string; isGuest: boolean }): Promise<UserRecord>;
  findById(id: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  /** Password hash for verification — never leaves the service layer. */
  findHashById(id: string): Promise<string | null>;
  upgradeToAccount(userId: string, username: string, passwordHash: string): Promise<UserRecord | null>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  setRole(userId: string, role: UserRole): Promise<UserRecord | null>;
  setDisabled(userId: string, disabled: boolean): Promise<UserRecord | null>;
  /** Invalidate every issued session token for the user. */
  bumpTokenVersion(userId: string): Promise<number>;
  setEmail(userId: string, email: string | null, verifiedAt: Date | null): Promise<UserRecord | null>;
  /** Username-prefix search for friends / admin (excludes self + guests). */
  searchByUsername(query: string, limit: number, excludeId?: string): Promise<UserRecord[]>;
  /** Platform counters for the admin dashboard. */
  countUsers(where?: { disabled?: boolean; isGuest?: boolean }): Promise<number>;
  getProfile(userId: string): Promise<ProfileRecord | null>;
  upsertProfile(userId: string, patch: Partial<Omit<ProfileRecord, 'userId'>>): Promise<ProfileRecord>;
  getStats(userId: string): Promise<StatsRecord | null>;
  upsertStats(userId: string, patch: Partial<Omit<StatsRecord, 'userId'>>): Promise<StatsRecord>;
}

export interface ISaveRepository {
  get(userId: string): Promise<SaveRecord | null>;
  /** Returns the stored record (revision must be >= incoming). */
  put(userId: string, revision: number, data: SaveBlob): Promise<SaveRecord>;
}

export interface IMissionRepository {
  get(userId: string, missionId: string): Promise<MissionProgressRecord | null>;
  upsert(userId: string, missionId: string, patch: { stars: number; bestTimeMs: number | null; completions: number }): Promise<MissionProgressRecord>;
  listForUser(userId: string): Promise<MissionProgressRecord[]>;
}

export interface IVehicleRepository {
  listForUser(userId: string): Promise<OwnedVehicleRecord[]>;
  replaceAll(userId: string, vehicles: Omit<OwnedVehicleRecord, 'userId'>[]): Promise<void>;
}

export interface LeaderboardQuery {
  period?: 'all' | 'day' | 'week';
  page?: number;
  limit?: number;
  /** Public boards rank registered accounts only. */
  registeredOnly?: boolean;
  /** Friends board: restrict to these user ids. */
  userIds?: string[];
}

export interface ILeaderboardRepository {
  insert(entry: Omit<LeaderboardEntryRecord, 'id' | 'createdAt'>): Promise<LeaderboardEntryRecord>;
  /** Per-mission board: best score per user within the period. */
  topForMission(missionId: string, q: LeaderboardQuery): Promise<{ entries: (LeaderboardEntryRecord & { displayName?: string; isGuest?: boolean })[]; total: number }>;
  /** Overall career board ordered by profile.careerScore. */
  topOverall(q: LeaderboardQuery): Promise<{ entries: (ProfileRecord & { username: string | null; isGuest: boolean })[]; total: number }>;
  bestForUser(userId: string): Promise<LeaderboardEntryRecord[]>;
  countRecentForUser(userId: string, sinceMs: number): Promise<number>;
}

export interface IAchievementRepository {
  listForUser(userId: string): Promise<AchievementRecord[]>;
  addMany(userId: string, achievementIds: string[]): Promise<AchievementRecord[]>;
}

// ── social + platform records ─────────────────────────────

export interface FriendRequestRecord {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  /** Denormalized for list views — set by the repository. */
  fromUsername?: string | null;
}

export interface FriendSummary {
  userId: string;
  username: string;
  displayName: string;
  level: number;
  careerScore: number;
  currentCar: string;
  /** Filled by the realtime layer when the friend is online. */
  online?: boolean;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: number;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
  actorUsername?: string | null;
}

export interface FlaggedRunRecord {
  id: string;
  userId: string;
  username?: string | null;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'dismissed' | 'actioned';
  data: Record<string, unknown>;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}

export interface MatchRecordRecord {
  id: string;
  mode: string;
  missionId: string;
  seed: number;
  startedAt: Date;
  endedAt: Date | null;
}

export interface MatchParticipantRecord {
  id: string;
  matchId: string;
  userId: string;
  username?: string | null;
  position: number;
  score: number;
  finishMs: number | null;
  carId: string;
}

export interface IFriendRepository {
  /** Any-direction pending-or-resolved request between two users. */
  findRequestBetween(a: string, b: string): Promise<FriendRequestRecord | null>;
  createRequest(fromId: string, toId: string): Promise<FriendRequestRecord | null>;
  listIncoming(userId: string): Promise<FriendRequestRecord[]>;
  updateRequest(id: string, status: FriendRequestRecord['status']): Promise<FriendRequestRecord | null>;
  createFriendship(a: string, b: string): Promise<void>;
  removeFriendship(a: string, b: string): Promise<void>;
  areFriends(a: string, b: string): Promise<boolean>;
  listFriends(userId: string): Promise<FriendSummary[]>;
  /** Ids of the user's friends — used to filter leaderboards. */
  friendIds(userId: string): Promise<string[]>;
}

export interface INotificationRepository {
  create(userId: string, input: { type: string; title: string; body?: string; data?: Record<string, unknown> }): Promise<NotificationRecord>;
  listForUser(userId: string, opts?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationRecord[]>;
  markRead(userId: string, id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}

export interface IAuditRepository {
  log(input: { actorId?: string | null; action: string; targetType: string; targetId?: string | null; data?: Record<string, unknown> }): Promise<void>;
  list(opts?: { limit?: number; page?: number; targetType?: string }): Promise<AuditLogRecord[]>;
}

export interface IFlagRepository {
  create(input: { userId: string; reason: string; severity?: 'low' | 'medium' | 'high'; data?: Record<string, unknown> }): Promise<FlaggedRunRecord>;
  list(opts?: { status?: string; limit?: number; page?: number }): Promise<FlaggedRunRecord[]>;
  update(id: string, patch: { status: 'open' | 'dismissed' | 'actioned'; reviewedBy: string }): Promise<FlaggedRunRecord | null>;
  counts(): Promise<{ open: number; dismissed: number; actioned: number }>;
}

export interface IMatchRepository {
  createMatch(input: { mode: string; missionId: string; seed: number }): Promise<MatchRecordRecord>;
  finishMatch(id: string): Promise<void>;
  addParticipant(input: { matchId: string; userId: string; position: number; score: number; finishMs: number | null; carId: string }): Promise<void>;
  get(id: string): Promise<{ match: MatchRecordRecord; participants: MatchParticipantRecord[] } | null>;
  recent(limit: number): Promise<{ match: MatchRecordRecord; participants: MatchParticipantRecord[] }[]>;
  countActive(): Promise<number>;
}

export interface IAnalyticsRepository {
  track(name: string, userId: string | null | undefined, props?: Record<string, unknown>): Promise<void>;
  /** Distinct users per day emitting `name` over the last N days. */
  dau(days: number): Promise<{ date: string; count: number }[]>;
  /** Named-event totals since a timestamp. */
  countsSince(names: string[], sinceMs: number): Promise<Record<string, number>>;
  /** New registered accounts per day (from users table). */
  registrations(days: number): Promise<{ date: string; count: number }[]>;
}

export interface Repositories {
  players: IPlayerRepository;
  saves: ISaveRepository;
  missions: IMissionRepository;
  vehicles: IVehicleRepository;
  leaderboard: ILeaderboardRepository;
  achievements: IAchievementRepository;
  friends: IFriendRepository;
  notifications: INotificationRepository;
  audit: IAuditRepository;
  flags: IFlagRepository;
  matches: IMatchRepository;
  analytics: IAnalyticsRepository;
}
