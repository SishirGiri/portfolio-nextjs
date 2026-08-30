# Backend and API

The backend is **Next.js server-side code only** — API route handlers, a middleware proxy, server components, and one external service (Formspree). No separate backend app exists.

## API route handlers

### 1. NextAuth (Auth.js v5) — all auth endpoints

```
Endpoints : /api/auth/*  (signin, callback, signout, session, csrf, ...)
File      : src/app/api/auth/[...nextauth]/route.ts
            (re-exports GET/POST from handlers in root auth.ts)
Method    : GET, POST
Purpose   : Google OAuth sign-in flow, JWT session issuance
Input     : OAuth redirects (Google), session cookies
Output    : Redirects + session cookies (HTTP-only)
Data dest : None persisted — JWT sessions only
```

### 2. Résumé download (auth-gated)

```
Endpoint : GET /api/resume
File     : src/app/api/resume/route.ts
Method   : GET
Purpose  : Serve private/Sishir-Bharati-Resume.png ONLY to signed-in users
Input    : None (session cookie required)
Output   : PNG attachment (Content-Disposition: attachment, Cache-Control: no-store)
           or 401 JSON { error: "Authentication required..." } / 404
Data dest : File read from /private via node:fs/promises
Guards   : ① src/proxy.ts middleware (rejects pre-handler without session)
           ② in-route `await auth()` check  (belt-and-suspenders)
```

## Middleware / proxy

```
File     : src/proxy.ts (Next.js middleware)
Matcher  : ['/api/resume']
Purpose  : Early 401 for unauthenticated /api/resume hits; auth routes always allowed
```

## Server components (render-on-server)

- `src/app/projects/[slug]/page.tsx` — reads `projects.ts` at request/build time, exports `generateMetadata()` for per-project SEO, renders `ProjectPageClient`.
- All page/layout files render on the server by default; only files starting with `'use client'` ship JS to the browser.

## External services

| Service | Direction | Purpose |
|---|---|---|
| **Formspree** (`https://formspree.io/f/mlgzyywb`) | Outbound POST from the browser | Contact-form delivery to the owner's email (see contact-form.md) |
| **Google OAuth** | Inbound via NextAuth | Identity for the résumé gate |
| **jsDelivr CDN** | Inbound (browser) | Three.js 0.160 module for the car game; Google Fonts for demos |

## Webhooks / cron / email-sending code

**None.** There are no webhook receivers, no scheduled jobs, and no email-sending code — email is fully delegated to Formspree and Google.

## Backend functions inventory (non-route)

| Function | File | Purpose |
|---|---|---|
| `NextAuth({...})` config + callbacks | `auth.ts` | Providers (Google, conditional), JWT strategy, `authorized` callback for `/api/resume` |
| `getProjectBySlug(slug)` | `src/data/projects.ts` | Slug → project lookup for detail pages |
| `generateMetadata({params})` | `src/app/projects/[slug]/page.tsx` | Per-project title/description |
