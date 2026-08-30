import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/game/leaderboard?scope=overall|mine|friends|<missionId>&period=all|day|week&page=1
 * Scope "overall" ranks career totals; a mission id ranks best
 * runs of that mission within the period; "mine" (auth) lists
 * personal bests; "friends" (auth) filters the overall board to
 * the caller's friend list. Public boards rank registered
 * accounts only — guests keep local progress but don't rank.
 */
export async function GET(request: Request) {
  try {
    const services = createServices();
    const url = new URL(request.url);
    // annotate the caller's own rows so the UI can highlight them
    const me = await services.auth.userFromRequest(request);
    const board = await services.leaderboard.board({
      scope: url.searchParams.get('scope') ?? 'overall',
      period: url.searchParams.get('period') ?? 'all',
      page: Number(url.searchParams.get('page') ?? 1),
      limit: Number(url.searchParams.get('limit') ?? 15),
      viewer: me,
    });
    if (!board) {
      return NextResponse.json({ error: 'Unknown leaderboard scope.', code: 'invalid_scope' }, { status: 400 });
    }
    if (me) {
      for (const e of board.entries) e.isMe = e.userId === me.id;
    }
    return NextResponse.json(
      { ...board, entries: board.entries.map(({ userId, ...rest }) => rest) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Leaderboard unavailable — the database is offline.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] leaderboard GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

/**
 * POST /api/game/leaderboard — submit a mission RUN
 * {missionId, elapsedMs, stars, vehicleId, distanceM, collisions}.
 * The score is computed here; clients can't send one.
 */
export async function POST(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Malformed run.', code: 'invalid_run' }, { status: 400 });
    }
    const outcome = await services.leaderboard.submitRun(user, {
      missionId: String((body as Record<string, unknown>).missionId ?? ''),
      elapsedMs: Number((body as Record<string, unknown>).elapsedMs ?? 0),
      stars: Number((body as Record<string, unknown>).stars ?? 0),
      vehicleId: String((body as Record<string, unknown>).vehicleId ?? ''),
      distanceM: Number((body as Record<string, unknown>).distanceM ?? 0),
      collisions: Number((body as Record<string, unknown>).collisions ?? 0),
    });
    if (!outcome.ok) {
      const status = outcome.code === 'rate_limited' ? 429 : 400;
      return NextResponse.json({ error: outcome.message, code: outcome.code }, { status });
    }
    return NextResponse.json(outcome);
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Leaderboard unavailable — the database is offline.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] leaderboard POST failed', err);
    return NextResponse.json({ error: 'Submission failed.' }, { status: 500 });
  }
}
