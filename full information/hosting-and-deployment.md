# Hosting and Deployment

## Confirmed facts (from the repository)

| Item | Evidence |
|---|---|
| **Platform: Vercel (strongly indicated)** | `public/vercel.svg` scaffolding asset; `.gitignore` explicitly lists `# vercel` / `.vercel`; `projects.ts` links another project of the owner hosted at `*.vercel.app`; README has a Deployment section referencing Vercel |
| **GitHub integration** | Remote `origin = https://github.com/SishirGiri/portfolio-nextjs.git`; recent commits pushed straight to `main` (e.g. `3c73a80`) |
| **Build command** | `npm run build` → `next build` (`package.json`) |
| **Start command** | `npm start` → `next start` |
| **Dev command** | `npm run dev` → `next dev` |
| **Package manager** | npm (`package-lock.json` present) |
| **Node settings** | `@types/node ^20`; no `.nvmrc`/`engines` field (Vercel default Node used) |
| **Env config on host** | The three `AUTH_*` variables (see environment-variables.md) must be set in the hosting dashboard; `.env.local` is local-only |
| **Auth redirect URI hint** | `.env.example` documents `https://YOUR_DOMAIN/api/auth/callback/google` for production |
| **Images** | `images.unoptimized = true` in `next.config.ts` — disables Vercel image optimization (all `<img>` serve as-is) |

## Assumptions (not provable from source)

- Deployment is triggered by pushes to `main` (Vercel Git auto-deploy default) — no CI config file (`.github/workflows`) exists, so **no separate CI/CD pipeline** is defined.
- Custom domain: **not visible** in the repo; would be configured in the Vercel dashboard.

## Deployment checklist implied by the code

1. Set `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` in the host env.
2. Add the production redirect URI to the Google OAuth client.
3. Upload `private/Sishir-Bharati-Resume.png` to the host (folder is git-ignored, so it must exist on the server/Vercel — **note:** on ephemeral build systems this file needs to be provisioned out-of-band, or the résumé route returns its 404 path).
