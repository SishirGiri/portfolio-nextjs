import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/** POST /api/game/auth/guest — silently create a guest identity. */
export async function POST() {
  try {
    const services = createServices();
    const session = await services.auth.createGuest();
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable — playing locally.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] guest creation failed', err);
    return NextResponse.json({ error: 'Could not create a guest session.' }, { status: 500 });
  }
}
