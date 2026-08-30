import { describe, expect, it, beforeEach } from 'vitest';
import {
  AuthService,
  AuthError,
  hashPassword,
  publicUser,
  signToken,
  verifyPassword,
  verifyToken,
} from '../../src/server/services/authService';
import { createMemoryRepositories } from '../../src/server/repositories/memory';
import { resetRateLimits } from '../../src/server/services/antiCheat';

beforeEach(() => resetRateLimits());

describe('password hashing (scrypt)', () => {
  it('round-trips a password', () => {
    const hash = hashPassword('hunter22');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('hunter22', hash)).toBe(true);
    expect(verifyPassword('hunter23', hash)).toBe(false);
  });

  it('salts every hash uniquely', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('rejects malformed stored hashes', () => {
    expect(verifyPassword('x', 'plaintext')).toBe(false);
    expect(verifyPassword('x', 'scrypt$only$two')).toBe(false);
  });
});

describe('session tokens (HMAC-SHA256)', () => {
  it('round-trips and carries the payload', () => {
    const token = signToken({ uid: 'user-1', guest: true });
    const payload = verifyToken(token);
    expect(payload?.uid).toBe('user-1');
    expect(payload?.guest).toBe(true);
    expect(payload?.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('rejects tampered tokens', () => {
    const token = signToken({ uid: 'user-1', guest: false });
    const [h, b] = token.split('.');
    const forgedSig = Buffer.from('forged-signature').toString('base64url');
    expect(verifyToken(`${h}.${b}.${forgedSig}`)).toBeNull();
    // payload swap: re-encode a different uid with the old signature
    const body = Buffer.from(JSON.stringify({ uid: 'attacker', iat: 1, exp: 9999999999 })).toString('base64url');
    expect(verifyToken(`${h}.${body}.${token.split('.')[2]}`)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('a.b')).toBeNull();
    expect(verifyToken('a.b.c.d')).toBeNull();
  });
});

describe('AuthService (memory repositories)', () => {
  function setup() {
    const repos = createMemoryRepositories();
    return { repos, auth: new AuthService(repos.players) };
  }

  it('creates guests and issues sessions', async () => {
    const { auth } = setup();
    const session = await auth.createGuest();
    expect(session.user.isGuest).toBe(true);
    expect(verifyToken(session.token)?.uid).toBe(session.user.id);
  });

  it('registers a fresh account and logs in', async () => {
    const { auth } = setup();
    const reg = await auth.register('racer1', 'secret7', new Request('http://x/register'));
    expect(reg.user.isGuest).toBe(false);
    expect(reg.user.username).toBe('racer1');

    const login = await auth.login('racer1', 'secret7');
    expect(login.user.id).toBe(reg.user.id);
    await expect(auth.login('racer1', 'wrong-password')).rejects.toThrow(AuthError);
    await expect(auth.login('ghost-user', 'whatever')).rejects.toThrow(AuthError);
  });

  it('upgrades a guest in place — progress survives', async () => {
    const { auth, repos } = setup();
    const guest = await auth.createGuest();
    // guest plays and syncs some progress
    await repos.players.upsertProfile(guest.user.id, { money: 4_500, level: 3 });

    const req = new Request('http://x/register', {
      headers: { authorization: `Bearer ${guest.token}` },
    });
    const upgraded = await auth.register('upgraded', 'secret7', req);
    expect(upgraded.user.id).toBe(guest.user.id);         // same row!
    expect(upgraded.user.isGuest).toBe(false);
    const profile = await repos.players.getProfile(guest.user.id);
    expect(profile?.money).toBe(4_500);                    // progress kept
  });

  it('rejects duplicate usernames and bad input', async () => {
    const { auth } = setup();
    await auth.register('taken', 'secret7', new Request('http://x'));
    await expect(auth.register('taken', 'secret7', new Request('http://x'))).rejects.toThrow(/taken/i);
    await expect(auth.register('a', 'secret7', new Request('http://x'))).rejects.toThrow(/username/i);
    await expect(auth.register('valid', '123', new Request('http://x'))).rejects.toThrow(/password/i);
  });

  it('resolves users from Bearer tokens on requests', async () => {
    const { auth } = setup();
    const session = await auth.createGuest();
    const req = new Request('http://x/save', { headers: { authorization: `Bearer ${session.token}` } });
    const user = await auth.userFromRequest(req);
    expect(user?.id).toBe(session.user.id);
    expect(await auth.userFromRequest(new Request('http://x/save'))).toBeNull();
    expect(await auth.userFromRequest(new Request('http://x/save', {
      headers: { authorization: 'Bearer nonsense' },
    }))).toBeNull();
  });

  it('publicUser never leaks password material', () => {
    const out = publicUser({ id: 'u1', username: 'bob', isGuest: false, role: 'PLAYER', tokenVersion: 0, disabled: false, email: null, emailVerifiedAt: null, createdAt: new Date() });
    expect(Object.keys(out)).not.toContain('passwordHash');
    expect(out.displayName).toBe('bob');
  });
});
