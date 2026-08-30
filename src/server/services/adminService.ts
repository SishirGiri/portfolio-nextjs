/**
 * Admin service — platform moderation + monitoring domain
 * logic. Every mutation is audit-logged; destructive actions
 * never auto-fire (anti-cheat flags are reviewed by humans).
 *
 * Admin bootstrap: comma-separated ADMIN_USERNAMES env grants
 * ADMIN on login (applyBootstrap runs from the login route).
 */
import type { Repositories, UserRecord } from '../repositories/types';
import { getKV } from '../lib/kv';

export class AdminService {
  constructor(private repos: Repositories) {}

  /** Grant ADMIN to usernames listed in ADMIN_USERNAMES (idempotent). */
  async applyBootstrap() {
    const names = (process.env.ADMIN_USERNAMES || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const name of names) {
      const user = await this.repos.players.findByUsername(name);
      if (user && user.role !== 'ADMIN') {
        await this.repos.players.setRole(user.id, 'ADMIN');
        await this.repos.audit.log({ action: 'role.bootstrap', targetType: 'user', targetId: user.id, data: { role: 'ADMIN' } });
      }
    }
  }

  async stats() {
    const dayMs = 86400_000;
    const [totalPlayers, registered, disabled, openFlags, activeMatches, dau, newRegs, eventCounts] = await Promise.all([
      this.repos.players.countUsers(),
      this.repos.players.countUsers({ isGuest: false }),
      this.repos.players.countUsers({ disabled: true }),
      this.repos.flags.counts(),
      this.repos.matches.countActive(),
      this.repos.analytics.dau(7),
      this.repos.analytics.registrations(7),
      this.repos.analytics.countsSince(['session_start', 'mission_complete', 'mission_fail', 'mp_match_start'], dayMs),
    ]);
    const topPlayers = await this.repos.leaderboard.topOverall({ page: 1, limit: 10 });
    return {
      players: { total: totalPlayers, registered, disabled },
      flags: openFlags,
      activeMatches,
      dau,
      registrations: newRegs,
      events24h: eventCounts,
      topPlayers: topPlayers.entries.map((p, i) => ({
        rank: i + 1, userId: p.userId, username: p.username ?? 'Guest', careerScore: p.careerScore, level: p.level,
      })),
    };
  }

  async listUsers(query: unknown, limit = 25) {
    if (typeof query === 'string' && query.trim().length >= 1) {
      const users = await this.repos.players.searchByUsername(query.trim(), limit);
      return Promise.all(users.map((u) => this.decorateUser(u)));
    }
    return [];
  }

  private async decorateUser(user: UserRecord) {
    const profile = await this.repos.players.getProfile(user.id);
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      disabled: user.disabled,
      createdAt: user.createdAt,
      level: profile?.level ?? 0,
      careerScore: profile?.careerScore ?? 0,
    };
  }

  async setDisabled(admin: UserRecord, userId: unknown, disabled: unknown) {
    if (typeof userId !== 'string' || typeof disabled !== 'boolean') return null;
    if (userId === admin.id) return null; // never disable yourself
    const user = await this.repos.players.setDisabled(userId, disabled);
    if (!user) return null;
    await this.repos.audit.log({
      actorId: admin.id, action: disabled ? 'account.disabled' : 'account.enabled',
      targetType: 'user', targetId: userId,
    });
    return this.decorateUser(user);
  }

  async setRole(admin: UserRecord, userId: unknown, role: unknown) {
    if (typeof userId !== 'string' || typeof role !== 'string' || !['PLAYER', 'MODERATOR', 'ADMIN'].includes(role)) return null;
    if (userId === admin.id) return null;
    const user = await this.repos.players.setRole(userId, role as UserRecord['role']);
    if (!user) return null;
    await this.repos.players.bumpTokenVersion(userId); // force re-auth with new role
    await this.repos.audit.log({
      actorId: admin.id, action: 'role.changed', targetType: 'user', targetId: userId, data: { role },
    });
    return this.decorateUser(user);
  }

  async listFlags(status: unknown) {
    const s = typeof status === 'string' && ['open', 'dismissed', 'actioned'].includes(status) ? status : 'open';
    return this.repos.flags.list({ status: s, limit: 50 });
  }

  async reviewFlag(admin: UserRecord, flagId: unknown, status: unknown) {
    if (typeof flagId !== 'string' || typeof status !== 'string' || !['dismissed', 'actioned'].includes(status)) return null;
    const flag = await this.repos.flags.update(flagId, { status: status as 'dismissed' | 'actioned', reviewedBy: admin.id });
    if (!flag) return null;
    await this.repos.audit.log({
      actorId: admin.id, action: `flag.${status}`, targetType: 'run', targetId: flagId,
      data: { userId: flag.userId, reason: flag.reason },
    });
    // actioned = consequence taken manually (e.g. score cleared /
    // account disabled through the users tab) — recorded here
    return flag;
  }

  async auditTrail(limit = 100) {
    return this.repos.audit.list({ limit });
  }

  async serverStatus() {
    const kv = getKV();
    const mem = process.memoryUsage();
    return {
      cache: kv.kind,
      node: process.version,
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1024 / 1024),
    };
  }
}
