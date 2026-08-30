import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';
import { AuthError } from '@/server/services/authService';
import { rateLimit } from '@/server/services/antiCheat';

export const dynamic = 'force-dynamic';

/** POST /api/game/auth/login — {username, password}. */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 15, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again later.', code: 'rate_limited' }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const services = createServices();
    const session = await services.auth.login(body?.username, body?.password);
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 401 });
    }
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable — try again later.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] login failed', err);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}
