/**
 * Action tokens — short-lived, single-purpose HMAC tokens for
 * email verification and password reset. Stateless (no storage),
 * bound to a purpose + user + expiry, signed with the same
 * GAME_AUTH_SECRET as session tokens.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const ACTION_TTL_SEC = {
  'pwreset': 3600,          // 1 hour
  'emailverify': 24 * 3600, // 24 hours
} as const;

export type ActionPurpose = keyof typeof ACTION_TTL_SEC;

function getSecret(): string {
  return process.env.GAME_AUTH_SECRET || process.env.AUTH_SECRET || 'neon-drive-insecure-dev-secret';
}

export interface ActionTokenPayload {
  uid: string;
  purpose: ActionPurpose;
  /** Extra bound data (e.g. the email being verified). */
  data?: string;
  exp: number;
}

export function signActionToken(uid: string, purpose: ActionPurpose, data?: string): string {
  const exp = Math.floor(Date.now() / 1000) + ACTION_TTL_SEC[purpose];
  const body = Buffer.from(JSON.stringify({ uid, purpose, data, exp })).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyActionToken(token: unknown, purpose: ActionPurpose): ActionTokenPayload | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as ActionTokenPayload;
    if (payload.purpose !== purpose) return null;
    if (typeof payload.uid !== 'string') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
