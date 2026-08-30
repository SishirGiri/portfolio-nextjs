/**
 * Auth service — scrypt password hashing + HMAC-SHA256
 * session tokens (a minimal JWT), zero external dependencies.
 *
 *   • passwords: scrypt with per-user salt, constant-time compare
 *   • tokens:    HS256-style signed JSON, 30-day expiry
 *   • guests:    created silently; registering UPGRADES the
 *                guest row so progress carries over
 *
 * Secrets come from GAME_AUTH_SECRET → AUTH_SECRET → a dev-only
 * fallback (loudly warned about) so the demo runs anywhere.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IPlayerRepository, UserRecord } from '../repositories/types';

const TOKEN_TTL_SEC = 30 * 24 * 3600;
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;
const DUMMY_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

let warnedAboutSecret = false;
function getSecret(): string {
  const secret = process.env.GAME_AUTH_SECRET || process.env.AUTH_SECRET;
  if (secret) return secret;
  if (!warnedAboutSecret) {
    warnedAboutSecret = true;
    console.warn(
      '[neon-drive] GAME_AUTH_SECRET/AUTH_SECRET not set — using an insecure dev secret. ' +
      'Set GAME_AUTH_SECRET in production.'
    );
  }
  return 'neon-drive-insecure-dev-secret';
}

// ── passwords ──────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, 'hex');
  // reject truncated/garbage hashes before the constant-time compare
  if (expected.length < 32) return false;
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ── tokens (HS256 JWT shape) ───────────────────────────────
export interface TokenPayload {
  uid: string;
  guest: boolean;
  /** Token version — invalidated when the user's row bumps it. */
  tv?: number;
  iat: number;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'> & { tv?: number }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL_SEC })).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (typeof payload.uid !== 'string') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── service ────────────────────────────────────────────────
export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    isGuest: user.isGuest,
    role: user.role,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    displayName: user.username ?? 'Guest',
    createdAt: user.createdAt,
  };
}

export class AuthService {
  constructor(private players: IPlayerRepository) {}

  /** Resolve the Bearer token on a request to a live, enabled user row. */
  async userFromRequest(request: Request): Promise<UserRecord | null> {
    const header = request.headers.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) return null;
    const payload = verifyToken(match[1]);
    if (!payload) return null;
    const user = await this.players.findById(payload.uid);
    if (!user) return null;
    // revocation: token was issued before the user bumped their version
    if ((payload.tv ?? 0) !== user.tokenVersion) return null;
    if (user.disabled) return null;
    return user;
  }

  sessionFor(user: UserRecord) {
    return {
      token: signToken({ uid: user.id, guest: user.isGuest, tv: user.tokenVersion }),
      user: publicUser(user),
    };
  }

  async createGuest() {
    const user = await this.players.createUser({ isGuest: true });
    return this.sessionFor(user);
  }

  async register(username: unknown, password: unknown, currentRequest: Request) {
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      throw new AuthError('Username must be 3–24 characters (letters, numbers, _ or -).', 'invalid_username');
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      throw new AuthError('Password must be 6–128 characters.', 'invalid_password');
    }
    if (await this.players.findByUsername(username)) {
      throw new AuthError('That username is already taken.', 'username_taken');
    }

    // Upgrading the current guest keeps all progress. Only an
    // already-named account is refused (sign out first).
    const current = await this.userFromRequest(currentRequest);
    if (current && !current.isGuest) {
      throw new AuthError('Already signed in — sign out first to create another account.', 'already_signed_in');
    }
    const user = current
      ? await this.players.upgradeToAccount(current.id, username, hashPassword(password))
      : await this.players.createUser({ username, passwordHash: hashPassword(password), isGuest: false });
    if (!user) throw new AuthError('That username is already taken.', 'username_taken');
    return this.sessionFor(user);
  }

  async login(username: unknown, password: unknown) {
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new AuthError('Invalid username or password.', 'invalid_credentials');
    }
    const user = await this.players.findByUsername(username);
    if (user?.disabled) throw new AuthError('This account is disabled.', 'account_disabled');
    const hash = user ? await this.players.findHashById(user.id) : null;
    // Uniform work + error whether or not the account exists,
    // so responses can't leak account existence.
    if (!user || !user.username || !hash || !verifyPassword(password, hash)) {
      verifyPassword(password, DUMMY_HASH);
      throw new AuthError('Invalid username or password.', 'invalid_credentials');
    }
    return this.sessionFor(user);
  }

  /** Revoke every session token issued to this user. */
  async logout(userId: string) {
    await this.players.bumpTokenVersion(userId);
  }

  async changePassword(userId: string, currentPassword: unknown, newPassword: unknown) {
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
      throw new AuthError('New password must be 6–128 characters.', 'invalid_password');
    }
    const hash = await this.players.findHashById(userId);
    if (!hash) throw new AuthError('This account has no password (guest).', 'no_password');
    if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, hash)) {
      throw new AuthError('Current password is incorrect.', 'invalid_credentials');
    }
    await this.players.setPasswordHash(userId, hashPassword(newPassword));
    await this.players.bumpTokenVersion(userId);
  }

  /** Look up an account by username OR email for password reset. */
  async findForPasswordReset(identifier: unknown): Promise<UserRecord | null> {
    if (typeof identifier !== 'string' || identifier.length === 0) return null;
    const byName = await this.players.findByUsername(identifier);
    if (byName) return byName;
    return this.players.findByEmail(identifier);
  }

  async resetPassword(tokenPayloadUid: string, newPassword: unknown) {
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
      throw new AuthError('Password must be 6–128 characters.', 'invalid_password');
    }
    const user = await this.players.findById(tokenPayloadUid);
    if (!user || user.isGuest) throw new AuthError('Account not found.', 'not_found');
    await this.players.setPasswordHash(user.id, hashPassword(newPassword));
    await this.players.bumpTokenVersion(user.id);
  }

  async setEmail(userId: string, email: unknown): Promise<string> {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AuthError('Enter a valid email address.', 'invalid_email');
    }
    const updated = await this.players.setEmail(userId, email.toLowerCase(), null);
    if (!updated) throw new AuthError('That email is already in use.', 'email_taken');
    return updated.email!;
  }

  async verifyEmail(userId: string, email: string) {
    await this.players.setEmail(userId, email.toLowerCase(), new Date());
  }
}
