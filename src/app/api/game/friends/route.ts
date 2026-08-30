import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';

export const dynamic = 'force-dynamic';

/**
 * /api/game/friends — the social graph.
 *
 *   GET  ?q=            → player search (2+ chars)
 *   GET                 → { friends, requests }
 *   POST   {targetId}   → send request (auto-accepts theirs)
 *   PUT    {requestId}  → accept incoming
 *   DELETE ?requestId=  → reject incoming
 *   DELETE ?friendId=   → remove friend
 */
async function resolve(request: Request) {
  const services = createServices();
  const user = await services.auth.userFromRequest(request);
  return { services, user };
}

export async function GET(request: Request) {
  try {
    const { services, user } = await resolve(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    if (q !== null) {
      return NextResponse.json(
        { results: await services.friends.search(q, user) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json(await services.friends.list(user), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Friends unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] friends GET failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { services, user } = await resolve(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    if (user.isGuest) {
      return NextResponse.json({ error: 'Register an account to add friends.', code: 'guest_account' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({})) as { targetId?: unknown };
    const out = await services.friends.request(user, body.targetId);
    if (!out.ok) return NextResponse.json({ error: out.message, code: out.code }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Friends unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] friends POST failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { services, user } = await resolve(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { requestId?: unknown };
    const out = await services.friends.accept(user, body.requestId);
    if (!out.ok) return NextResponse.json({ error: out.message, code: out.code }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Friends unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] friends PUT failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { services, user } = await resolve(request);
    if (!user) return NextResponse.json({ error: 'Sign in first.', code: 'unauthorized' }, { status: 401 });
    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');
    const friendId = url.searchParams.get('friendId');
    const out = requestId !== null
      ? await services.friends.reject(user, requestId)
      : await services.friends.remove(user, friendId);
    if (!out.ok) return NextResponse.json({ error: out.message, code: out.code }, { status: 400 });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json({ error: 'Friends unavailable.', code: 'database_unavailable' }, { status: 503 });
    }
    console.error('[neon-drive] friends DELETE failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
