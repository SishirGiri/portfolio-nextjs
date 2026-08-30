# Environment Variables

## Files found

| File | Committed? | Contents |
|---|---|---|
| `.env.example` | Yes (template) | Variable names + instructions, empty values |
| `.env.local` | **No** (`.gitignore` blocks `.env*`) | The three real variables (values not inspected/reported) |

## Variable names (VALUES INTENTIONALLY OMITTED)

| Variable | Required by | Purpose |
|---|---|---|
| `AUTH_SECRET` | NextAuth (`auth.ts`) | Random secret used to sign JWT session cookies. Generate with `npx auth secret`. |
| `AUTH_GOOGLE_ID` | NextAuth Google provider | Google OAuth **Client ID** (Google Cloud Console). If unset, the Google provider is silently omitted — the site still runs. |
| `AUTH_GOOGLE_SECRET` | NextAuth Google provider | Google OAuth **Client Secret**. Same conditional behavior as above. |
| `NEXTAUTH_URL` *(optional, commented in example)* | NextAuth | Base URL — only needed when deployed on a known domain. Not present in `.env.local`. |

All variables are **server-side only** — NextAuth reads them in `auth.ts` (server context); none are exposed with a `NEXT_PUBLIC_` prefix, so nothing reaches the client bundle.

## Related configuration that is NOT env-based

- Formspree endpoint — hardcoded public constant in `src/lib/constants.ts` (by design).
- Quality/audio settings for the game — user-level, stored in browser `localStorage`, not env.
