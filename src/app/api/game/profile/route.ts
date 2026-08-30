import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';
import { AuthError } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/game/profile — the caller's platform profile
 * (display name, avatar, email verification, career stats).
 * PUT  — update { displayName?, avatar? }.
 */
export async function GET(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const profile = await services.profile.get(user);
    return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Profile unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] profile GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    if (user.isGuest) {
      return NextResponse.json({ error: 'Register an account to customize your profile.', code: 'guest_account' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({})) as { displayName?: unknown; avatar?: unknown };
    const profile = await services.profile.update(user, body);
    return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Profile unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] profile PUT failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
