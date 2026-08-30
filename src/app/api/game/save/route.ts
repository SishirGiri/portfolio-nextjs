import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/game/save — the server-side copy of the player's
 * save (used for cross-device resume / conflict resolution).
 */
export async function GET(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    }
    const record = await services.saves.getSave(user.id);
    return NextResponse.json(
      { save: record?.data ?? null, revision: record?.revision ?? 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable — progress stays local.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] save GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

/**
 * PUT /api/game/save — sync the local-first save upward.
 *
 *   200 {conflict:false, save, achievements} — accepted
 *   409 {conflict:true,  serverSave}          — client is behind
 *   400 {code:'invalid_save'}                 — failed validation
 *
 * Progress is never destroyed: on conflict the client decides
 * (newer local edits win on the next push).
 */
export async function PUT(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || !('save' in body)) {
      return NextResponse.json({ error: 'Malformed save payload.', code: 'invalid_save' }, { status: 400 });
    }
    const outcome = await services.saves.sync(user.id, (body as { save: unknown }).save);
    switch (outcome.status) {
      case 'accepted':
        return NextResponse.json({
          conflict: false,
          save: outcome.save.data,
          revision: outcome.save.revision,
          achievements: outcome.achievements,
        });
      case 'conflict':
        return NextResponse.json(
          { conflict: true, serverSave: outcome.serverSave },
          { status: 409 },
        );
      case 'rejected':
      default:
        return NextResponse.json({ error: outcome.reason, code: 'invalid_save' }, { status: 400 });
    }
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Database unavailable — progress stays local and will sync later.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] save PUT failed', err);
    return NextResponse.json({ error: 'Sync failed.' }, { status: 500 });
  }
}
