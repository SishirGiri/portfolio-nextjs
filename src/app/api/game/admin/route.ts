import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';
import { hasRole } from '@/server/web/http';

export const dynamic = 'force-dynamic';

/**
 * /api/game/admin — RBAC-gated platform administration.
 * All sub-actions require MODERATOR+; user management requires ADMIN.
 *
 *   GET                          → dashboard stats + server status
 *   GET  ?section=flags|audit    → review queues
 *   GET  ?section=users&q=       → user search
 *   PUT  {userId, disabled}      → enable/disable account   (ADMIN)
 *   PUT  {userId, role}          → change role              (ADMIN)
 *   POST {flagId, status}        → review a flagged run     (MODERATOR+)
 */
async function guard(request: Request, min: 'MODERATOR' | 'ADMIN') {
  const services = createServices();
  const user = await services.auth.userFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 }) };
  if (!hasRole(user, min)) return { error: NextResponse.json({ error: 'Admin access required.', code: 'forbidden' }, { status: 403 }) };
  return { services, user };
}

export async function GET(request: Request) {
  try {
    const g = await guard(request, 'MODERATOR');
    if ('error' in g) return g.error;
    const url = new URL(request.url);
    const section = url.searchParams.get('section');
    if (section === 'flags') {
      return NextResponse.json({ flags: await g.services.admin.listFlags(url.searchParams.get('status')) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (section === 'audit') {
      return NextResponse.json({ entries: await g.services.admin.auditTrail(100) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (section === 'users') {
      return NextResponse.json({ users: await g.services.admin.listUsers(url.searchParams.get('q')) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const [stats, server] = await Promise.all([g.services.admin.stats(), g.services.admin.serverStatus()]);
    return NextResponse.json({ stats, server }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Admin data unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] admin GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const g = await guard(request, 'ADMIN');
    if ('error' in g) return g.error;
    const body = await request.json().catch(() => ({})) as { userId?: unknown; disabled?: unknown; role?: unknown };
    if (typeof body.disabled === 'boolean') {
      const user = await g.services.admin.setDisabled(g.user, body.userId, body.disabled);
      if (!user) return NextResponse.json({ error: 'Could not update that account.', code: 'invalid_target' }, { status: 400 });
      return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (typeof body.role === 'string') {
      const user = await g.services.admin.setRole(g.user, body.userId, body.role);
      if (!user) return NextResponse.json({ error: 'Could not update that role.', code: 'invalid_target' }, { status: 400 });
      return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'Nothing to update.', code: 'invalid_request' }, { status: 400 });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Admin action unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] admin PUT failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const g = await guard(request, 'MODERATOR');
    if ('error' in g) return g.error;
    const body = await request.json().catch(() => ({})) as { flagId?: unknown; status?: unknown };
    const flag = await g.services.admin.reviewFlag(g.user, body.flagId, body.status);
    if (!flag) return NextResponse.json({ error: 'Could not review that flag.', code: 'invalid_target' }, { status: 400 });
    return NextResponse.json({ flag }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Admin action unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] admin POST failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
