/**
 * Web helpers — consistent response envelopes and request
 * guards shared by every game API route.
 *
 * Success: { data }       Errors: { error, code }
 * (matches the shapes already returned by the existing routes;
 *  legacy routes keep their bespoke success bodies — new code
 *  wraps them through `ok()` so the contract converges.)
 */
import { AuthError } from '../services/authService';
import type { AuthService } from '../services/authService';
import type { UserRecord } from '../repositories/types';

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, { status: 200, ...init });
}

export function fail(status: number, error: string, code?: string) {
  return Response.json({ error, code }, { status });
}

export const unauthorized = () => fail(401, 'Sign in required.', 'unauthorized');
export const forbidden = () => fail(403, 'You do not have access to this.', 'forbidden');
export const badRequest = (message: string, code = 'invalid_request') => fail(400, message, code);
export const tooMany = () => fail(429, 'Too many requests — slow down.', 'rate_limited');

/** Resolve the Bearer token to a live, enabled account or null. */
export async function requireUser(request: Request, auth: AuthService): Promise<UserRecord | null> {
  return auth.userFromRequest(request);
}

/** Role-gated access (RBAC). PLAYER < MODERATOR < ADMIN. */
const ROLE_RANK: Record<string, number> = { PLAYER: 0, MODERATOR: 1, ADMIN: 2 };

export function hasRole(user: UserRecord, min: 'MODERATOR' | 'ADMIN'): boolean {
  return (ROLE_RANK[user.role] ?? 0) >= ROLE_RANK[min];
}

export async function requireRole(
  request: Request,
  auth: AuthService,
  min: 'MODERATOR' | 'ADMIN',
): Promise<{ user: UserRecord } | { response: Response }> {
  const user = await requireUser(request, auth);
  if (!user) return { response: unauthorized() };
  if (!hasRole(user, min)) return { response: forbidden() };
  return { user };
}

/** Map service errors to responses uniformly. */
export function authErrorResponse(e: unknown): Response {
  if (e instanceof AuthError) return fail(e.code === 'database_unavailable' ? 503 : 400, e.message, e.code);
  console.error('[neon-drive] auth failure', e);
  return fail(500, 'Something went wrong.', 'internal');
}
