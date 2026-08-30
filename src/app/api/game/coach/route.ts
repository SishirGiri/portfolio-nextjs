import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/game/coach — AI Driving Coach report for the caller.
 * Rule-based analyzer today; the Analyzer interface keeps an
 * LLM implementation swappable in later.
 */
export async function GET(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const report = await services.coach.report(user);
    return NextResponse.json({ report }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Coach unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] coach GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
