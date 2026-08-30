/**
 * Service factory — dependency injection point.
 * Routes call createServices() (Prisma/PostgreSQL); tests call
 * it with createMemoryRepositories() so no database is needed.
 */
import { createPrismaRepositories } from '../repositories/prisma';
import { createMemoryRepositories } from '../repositories/memory';
import type { Repositories } from '../repositories/types';
import { AuthService } from './authService';
import { SaveSyncService } from './saveService';
import { LeaderboardService } from './leaderboardService';
import { AchievementService } from './achievementService';
import { FriendService } from './friendService';
import { NotificationService } from './notificationService';
import { ProfileService } from './profileService';
import { AdminService } from './adminService';
import { CoachService } from './coachService';

export interface GameServices {
  auth: AuthService;
  saves: SaveSyncService;
  leaderboard: LeaderboardService;
  achievements: AchievementService;
  friends: FriendService;
  notifications: NotificationService;
  profile: ProfileService;
  admin: AdminService;
  coach: CoachService;
  /** Telemetry sink for the analytics routes. */
  trackEvent(name: string, userId?: string | null): Promise<void>;
}

export function createServices(repos?: Repositories): GameServices {
  const r = repos ?? createPrismaRepositories();
  return {
    auth: new AuthService(r.players),
    saves: new SaveSyncService(r),
    leaderboard: new LeaderboardService(r),
    achievements: new AchievementService(r.achievements),
    friends: new FriendService(r),
    notifications: new NotificationService(r),
    profile: new ProfileService(r),
    admin: new AdminService(r),
    coach: new CoachService(r),
    trackEvent: (name, userId) => r.analytics.track(name, userId),
  };
}

export { createMemoryRepositories };
