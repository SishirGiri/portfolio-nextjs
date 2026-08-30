import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';
import { AuthError } from '@/server/services/authService';
import { rateLimit } from '@/server/services/antiCheat';

export const dynamic = 'force-dynamic';

/**
 * POST /api/game/auth/register — {username, password}.
 * When called with a valid guest Bearer token, the guest is
 * UPGRADED in place (progress carries over).
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`register:${ip}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again later.', code: 'rate_limited' }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const services = createServices();
    const session = await services.auth.register(body?.username, body?.password, request);
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable — try again later.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] register failed', err);
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}
