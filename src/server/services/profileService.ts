/**
 * Profile service — player-facing profile management: display
 * name, preset avatar, email + verification. Progress numbers
 * (level/xp/money) are NOT editable here — they only ever come
 * from the sanitized save sync.
 */
import type { Repositories, UserRecord } from '../repositories/types';
import { AuthError } from './authService';
import { signActionToken, verifyActionToken } from './tokens';
import { emailService } from './emailService';

const DISPLAY_NAME_RE = /^[a-zA-Z0-9 _-]{2,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATARS = ['car', 'helmet', 'flame', 'crown', 'bolt', 'star'];

export class ProfileService {
  constructor(private repos: Repositories) {}

  async get(viewer: UserRecord) {
    const profile = await this.repos.players.getProfile(viewer.id);
    const stats = await this.repos.players.getStats(viewer.id);
    return {
      displayName: profile?.displayName ?? viewer.username ?? 'Driver',
      avatar: profile?.avatar ?? 'car',
      level: profile?.level ?? 0,
      xp: profile?.xp ?? 0,
      careerScore: profile?.careerScore ?? 0,
      avatars: AVATARS,
      email: viewer.email,
      emailVerified: viewer.emailVerifiedAt !== null,
      stats: stats ? {
        distanceKm: Math.round(stats.distanceM / 100) / 10,
        playtimeHours: Math.round((stats.playtimeSec / 3600) * 10) / 10,
        missionsCompleted: stats.missionsCompleted,
        missionsFailed: stats.missionsFailed,
        collisions: stats.collisions,
        busts: stats.busts,
        escapes: stats.escapes,
        topSpeedKmh: Math.round(stats.topSpeedKmh),
      } : null,
    };
  }

  async update(viewer: UserRecord, patch: { displayName?: unknown; avatar?: unknown }) {
    const updates: { displayName?: string; avatar?: string } = {};
    if (patch.displayName !== undefined) {
      if (typeof patch.displayName !== 'string' || !DISPLAY_NAME_RE.test(patch.displayName)) {
        throw new AuthError('Display name must be 2–24 letters, numbers, spaces, _ or -.', 'invalid_display_name');
      }
      updates.displayName = patch.displayName;
    }
    if (patch.avatar !== undefined) {
      if (typeof patch.avatar !== 'string' || !AVATARS.includes(patch.avatar)) {
        throw new AuthError('Unknown avatar.', 'invalid_avatar');
      }
      updates.avatar = patch.avatar;
    }
    if (Object.keys(updates).length) {
      await this.repos.players.upsertProfile(viewer.id, updates);
    }
    return this.get(viewer);
  }

  /** Attach an email and send the verification link (dev transport logs it). */
  async requestEmailVerification(viewer: UserRecord, email: unknown, origin: string) {
    if (viewer.isGuest) throw new AuthError('Register an account first.', 'guest_account');
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      throw new AuthError('Enter a valid email address.', 'invalid_email');
    }
    const address = email.toLowerCase();
    const updated = await this.repos.players.setEmail(viewer.id, address, null);
    if (!updated) throw new AuthError('That email is already in use.', 'email_taken');
    const token = signActionToken(viewer.id, 'emailverify', address);
    const url = `${origin}/demos/car-game/index.html?verifyEmail=${encodeURIComponent(token)}`;
    await emailService.sendVerificationEmail(address, url);
    return { email: address };
  }

  async verifyEmail(token: unknown) {
    const payload = verifyActionToken(token, 'emailverify');
    if (!payload || !payload.data) throw new AuthError('This verification link is invalid or expired.', 'invalid_token');
    const user = await this.repos.players.findById(payload.uid);
    if (!user) throw new AuthError('Account not found.', 'not_found');
    await this.repos.players.setEmail(user.id, payload.data, new Date());
    return { email: payload.data };
  }
}
