import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';
import { publicUser } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** GET /api/game/auth/me — current session + profile summary. */
export async function GET(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not signed in.', code: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { user: publicUser(user) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] /auth/me failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
