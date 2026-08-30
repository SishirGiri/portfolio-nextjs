import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/**
 * POST /api/game/auth/logout — revoke every session token issued
 * to this account (bumps tokenVersion). The client also drops
 * its local token; this makes the server side agree.
 */
export async function POST(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (user) await services.auth.logout(user.id);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Logout unavailable — database offline.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] logout failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
