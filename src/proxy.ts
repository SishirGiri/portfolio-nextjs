import { auth } from '@/../auth';

/**
 * Middleware-level access control.
 *
 * Belt-and-suspenders alongside the in-route `auth()` check in
 * `src/app/api/resume/route.ts`: the resume file is rejected before the
 * route handler even runs if there is no session. Auth callback routes
 * are always allowed through.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  // Always allow NextAuth's own routes (sign-in, callback, etc.).
  const isAuthRoute =
    pathname.startsWith('/api/auth') || pathname.startsWith('/auth');

  if (isAuthRoute) return;

  // The resume endpoint requires an authenticated session.
  if (pathname.startsWith('/api/resume') && !req.auth) {
    return Response.json(
      { error: 'Authentication required to download the resume.' },
      { status: 401 }
    );
  }
});

export const config = {
  // Only run middleware on the resume API (cheap + targeted).
  matcher: ['/api/resume'],
};
