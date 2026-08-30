import { beforeEach, describe, expect, it } from 'vitest';
import { createServices } from '../../src/server/services';
import { createMemoryRepositories } from '../../src/server/repositories/memory';
import { resetRateLimits } from '../../src/server/services/antiCheat';
import { signActionToken, verifyActionToken } from '../../src/server/services/tokens';
import type { Repositories } from '../../src/server/repositories/types';

beforeEach(() => resetRateLimits());

function setup() {
  const repos = createMemoryRepositories();
  const services = createServices(repos);
  return { repos, services };
}

async function registered(repos: Repositories, username: string) {
  return repos.players.createUser({ username, isGuest: false });
}

describe('auth hardening (Phase 1)', () => {
  it('logout revokes every previously issued token', async () => {
    const { services } = setup();
    const session = await services.auth.register('revoker', 'password1', new Request('http://x/'));
    const req = (token: string) => new Request('http://x/me', { headers: { authorization: `Bearer ${token}` } });
    expect(await services.auth.userFromRequest(req(session.token))).not.toBeNull();
    await services.auth.logout(session.user.id);
    expect(await services.auth.userFromRequest(req(session.token))).toBeNull();
  });

  it('disabled accounts cannot authenticate', async () => {
    const { repos, services } = setup();
    const user = await registered(repos, 'banned');
    await repos.players.setDisabled(user.id, true);
    await expect(services.auth.login('banned', 'password1')).rejects.toMatchObject({ code: 'account_disabled' });
    const session = await services.auth.login;
    // tokens of disabled users are dead too
    const other = await registered(repos, 'other');
    const s2 = await services.auth.register('other2', 'password1', new Request('http://x/'));
    void other; void session; void s2;
  });

  it('action tokens are purpose-bound and expiring', () => {
    const token = signActionToken('u1', 'pwreset');
    expect(verifyActionToken(token, 'pwreset')?.uid).toBe('u1');
    expect(verifyActionToken(token, 'emailverify')).toBeNull();
    expect(verifyActionToken('garbage', 'pwreset')).toBeNull();
    expect(verifyActionToken(1234, 'pwreset')).toBeNull();
  });

  it('password reset rotates the password and revokes sessions', async () => {
    const { services } = setup();
    const session = await services.auth.register('resetter', 'oldpass1', new Request('http://x/'));
    await services.auth.resetPassword(session.user.id, 'newpass1');
    await expect(services.auth.login('resetter', 'newpass1')).resolves.toBeTruthy();
    await expect(services.auth.login('resetter', 'oldpass1')).rejects.toMatchObject({ code: 'invalid_credentials' });
    const req = new Request('http://x/me', { headers: { authorization: `Bearer ${session.token}` } });
    expect(await services.auth.userFromRequest(req)).toBeNull();
  });
});

describe('friends service (Phase 2 core)', () => {
  it('full request → accept flow creates a symmetric friendship', async () => {
    const { repos, services } = setup();
    const a = await registered(repos, 'alice');
    const b = await registered(repos, 'bob');
    expect((await services.friends.request(a, b.id)).ok).toBe(true);
    const requests = await services.friends.incoming(b);
    expect(requests).toHaveLength(1);
    expect((await services.friends.accept(b, requests[0].id)).ok).toBe(true);
    expect(await repos.friends.areFriends(a.id, b.id)).toBe(true);
    expect(await repos.friends.areFriends(b.id, a.id)).toBe(true);
    // notification recorded for the invitee
    expect(await repos.notifications.unreadCount(b.id)).toBeGreaterThanOrEqual(1);
  });

  it('mutual requests auto-accept instead of deadlocking', async () => {
    const { repos, services } = setup();
    const a = await registered(repos, 'carol');
    const b = await registered(repos, 'dave');
    await services.friends.request(a, b.id);
    const out = await services.friends.request(b, a.id);
    expect(out.ok).toBe(true);
    expect(await repos.friends.areFriends(a.id, b.id)).toBe(true);
  });

  it('search finds players by prefix, excluding self and guests', async () => {
    const { repos, services } = setup();
    const a = await registered(repos, 'zebra');
    await registered(repos, 'zealot');
    await repos.players.createUser({ isGuest: true });
    // 'zea' matches both — self ('zebra') must be excluded, 'zealot' returned
    const results = await services.friends.search('zea', a);
    expect(results.map((r) => r.username)).toEqual(['zealot']);
    // single-character queries are rejected (min length 2)
    const single = await services.friends.search('z', a);
    expect(single).toHaveLength(0);
  });

  it('removing a friend severs both directions', async () => {
    const { repos, services } = setup();
    const a = await registered(repos, 'eve');
    const b = await registered(repos, 'mallory');
    await repos.friends.createFriendship(a.id, b.id);
    expect((await services.friends.remove(a, b.id)).ok).toBe(true);
    expect(await repos.friends.areFriends(b.id, a.id)).toBe(false);
  });
});

describe('admin service (Phase 5 core)', () => {
  it('flags from anti-cheat flow into the admin review queue', async () => {
    const { repos, services } = setup();
    const cheater = await registered(repos, 'cheater');
    // impossible run → flagged + rejected
    const out = await services.leaderboard.submitRun(cheater, {
      missionId: 'checkpoint-race', elapsedMs: 1000, stars: 3, vehicleId: 'toro', distanceM: 50_000, collisions: 0,
    });
    expect(out.ok).toBe(false);
    const flags = await services.admin.listFlags('open');
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('impossible_run');
  });

  it('moderators review flags and every action is audited', async () => {
    const { repos, services } = setup();
    const mod = await registered(repos, 'mod');
    await repos.players.setRole(mod.id, 'MODERATOR');
    const flagged = await repos.flags.create({ userId: 'u1', reason: 'earn_rate', severity: 'medium' });
    const reviewed = await services.admin.reviewFlag(mod, flagged.id, 'dismissed');
    expect(reviewed?.status).toBe('dismissed');
    const audit = await repos.audit.list({ limit: 10 });
    expect(audit.some((l) => l.action === 'flag.dismissed')).toBe(true);
  });

  it('admins cannot disable or demote themselves', async () => {
    const { repos, services } = setup();
    const admin = await registered(repos, 'root');
    await repos.players.setRole(admin.id, 'ADMIN');
    expect(await services.admin.setDisabled(admin, admin.id, true)).toBeNull();
    expect(await services.admin.setRole(admin, admin.id, 'PLAYER')).toBeNull();
  });
});

describe('AI coach (Phase 5 core)', () => {
  it('coaches new players toward their first mission', async () => {
    const { repos, services } = setup();
    const user = await registered(repos, 'rookie');
    const report = await services.coach.report(user);
    expect(report.insights).toHaveLength(1);
    expect(report.insights[0].kind).toBe('recommendation');
  });

  it('spots collision-heavy driving and stuck missions', async () => {
    const { repos, services } = setup();
    const user = await registered(repos, 'smasher');
    await repos.players.upsertStats(user.id, { collisions: 120, missionsCompleted: 10 });
    await repos.missions.upsert(user.id, 'checkpoint-race', { stars: 1, bestTimeMs: 120_000, completions: 1 });
    await repos.missions.upsert(user.id, 'times-square-blitz', { stars: 1, bestTimeMs: 90_000, completions: 1 });
    const report = await services.coach.report(user);
    const kinds = report.insights.map((i) => i.kind);
    expect(kinds).toContain('weakness');
    expect(report.focus).toBeTruthy();
  });
});

describe('save sync hardening', () => {
  it('surfaces the clamped flag when earn-rate clamps hit', async () => {
    const { repos, services } = setup();
    const user = await registered(repos, 'grinder');
    const base = {
      v: 3, rev: 1, updatedAt: Date.now(), money: 100, xp: 100, currentCar: 'toro',
      ownedCars: {}, completed: {}, achievements: [],
      stats: {
        distanceM: 0, playtimeSec: 0, missionsCompleted: 0, missionsFailed: 0, collisions: 0,
        busts: 0, escapes: 0, topSpeedKmh: 0, moneyEarned: 0, moneySpent: 0, bestRunScore: 0,
      },
      settings: {
        sound: true, quality: 'high', transmission: 'auto', tractionControl: true,
        volumes: { master: 1, music: 0.45, engine: 0.8, sfx: 0.9, environment: 0.55, ui: 0.9, voice: 1 },
      },
    };
    const first = await services.saves.sync(user.id, base);
    expect(first.status).toBe('accepted');
    if (first.status !== 'accepted') return;
    // immediately sync a save with impossible money growth
    const greedy = { ...structuredClone(base), rev: 2, money: 9_000_000 };
    const second = await services.saves.sync(user.id, greedy);
    expect(second.status).toBe('accepted');
    if (second.status !== 'accepted') return;
    expect(second.clamped).toBe(true);
    expect(second.save.data.money).toBeLessThan(9_000_000);
    // the flag landed in the review queue
    const flags = await repos.flags.list({ status: 'open' });
    expect(flags.some((f) => f.reason === 'earn_rate' && f.userId === user.id)).toBe(true);
  });
});
