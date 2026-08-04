import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * NextAuth (Auth.js v5) configuration.
 *
 * The resume download is gated behind a valid session: see
 * `src/app/api/resume/route.ts` and `src/proxy.ts`. Only the Google
 * provider is enabled — no passwords or phone numbers are ever collected
 * or stored by this site. Identity is fully delegated to Google.
 *
 * Required environment variables (see `.env.example`):
 *   AUTH_SECRET          — random secret (run: npx auth secret)
 *   AUTH_GOOGLE_ID       — Google OAuth Client ID
 *   AUTH_GOOGLE_SECRET   — Google OAuth Client Secret
 *
 * If the Google credentials are not configured yet, the provider is simply
 * omitted instead of crashing — so the rest of the site keeps working.
 */

const providers = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  // Fall back to AUTH_SECRET; if even that is missing, NextAuth will surface
  // a clear error in the /api/auth/* routes only — not crash unrelated pages.
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/about',
  },
  callbacks: {
    authorized: ({ auth, request }) => {
      const isResume = request.nextUrl.pathname.startsWith('/api/resume');
      if (isResume) return !!auth; // block the file unless logged in
      return true;
    },
  },
});
