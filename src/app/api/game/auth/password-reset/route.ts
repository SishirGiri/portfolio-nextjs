import { NextResponse } from 'next/server';
import { isDbError } from '@/server/db';
import { createServices } from '@/server/services';
import { signActionToken, verifyActionToken } from '@/server/services/tokens';
import { emailService } from '@/server/services/emailService';
import { rateLimit } from '@/server/services/antiCheat';

export const dynamic = 'force-dynamic';

/**
 * POST /api/game/auth/password-reset — two-step password reset.
 *
 *   { identifier }        → always 200 (no account enumeration);
 *                           if the account exists AND has an email,
 *                           a 1-hour action token link is sent.
 *   { token, newPassword } → verify + rotate password + revoke
 *                           all sessions (tokenVersion bump).
 */
export async function POST(request: Request) {
  try {
    const services = createServices();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Malformed request.', code: 'invalid_request' }, { status: 400 });

    if (typeof body.token === 'string' && body.newPassword !== undefined) {
      const payload = verifyActionToken(body.token, 'pwreset');
      if (!payload) {
        return NextResponse.json({ error: 'This reset link is invalid or expired.', code: 'invalid_token' }, { status: 400 });
      }
      await services.auth.resetPassword(payload.uid, body.newPassword);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (typeof body.identifier === 'string') {
      if (!rateLimit(`pwreset:${request.headers.get('x-forwarded-for') ?? 'local'}`, 5, 15 * 60_000)) {
        return NextResponse.json({ error: 'Too many attempts — try again later.', code: 'rate_limited' }, { status: 429 });
      }
      const user = await services.auth.findForPasswordReset(body.identifier);
      if (user && !user.isGuest && user.email) {
        const token = signActionToken(user.id, 'pwreset');
        const origin = new URL(request.url).origin;
        const url = `${origin}/demos/car-game/index.html?resetPassword=${encodeURIComponent(token)}`;
        await emailService.sendPasswordResetEmail(user.email, url);
      }
      // uniform response either way
      return NextResponse.json(
        { ok: true, message: 'If that account exists with a verified email, a reset link has been sent.' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json({ error: 'Malformed request.', code: 'invalid_request' }, { status: 400 });
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { error: 'Password reset unavailable — database offline.', code: 'database_unavailable' },
        { status: 503 },
      );
    }
    console.error('[neon-drive] password reset failed', err);
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
}
