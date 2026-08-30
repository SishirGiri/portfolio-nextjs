import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/**
 * /api/game/notifications
 *   GET                → { items, unread }
 *   PUT   {id|"all"}   → mark read
 */
export async function GET(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const out = await services.notifications.list(user);
    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Notifications unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] notifications GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { id?: unknown };
    if (body.id === 'all') await services.notifications.markAllRead(user);
    else await services.notifications.markRead(user, body.id);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Notifications unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] notifications PUT failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
