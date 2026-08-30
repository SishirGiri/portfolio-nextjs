import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/** Whitelisted event names — anything else is dropped (privacy). */
const ALLOWED = new Set([
  'session_start', 'mission_start', 'mission_complete', 'mission_fail',
  'mp_match_start', 'mp_match_end', 'login', 'register', 'garage_visit', 'dealer_visit',
]);

/**
 * POST /api/game/analytics — batched client telemetry.
 * { events: [{ name, at? }] } — ids only, no personal data.
 */
export async function POST(request: Request) {
  try {
    const services = createServices();
    const user = await services.auth.userFromRequest(request);
    const body = await request.json().catch(() => null) as { events?: unknown } | null;
    const events = Array.isArray(body?.events) ? body!.events.slice(0, 50) : [];
    for (const e of events) {
      const name = (e as { name?: unknown })?.name;
      if (typeof name === 'string' && ALLOWED.has(name)) {
        await services.trackEvent(name, user?.id);
      }
    }
    return NextResponse.json({ ok: true, accepted: events.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      // analytics must never break the game
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true, accepted: 0 });
  }
}
