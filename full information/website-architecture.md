# Complete Website Architecture

Actual architecture, verified from the code:

```
BROWSER
  ↓ HTTPS
NEXT.JS 16 (App Router) — server
  ├── src/proxy.ts  (middleware, matcher: /api/resume — auth gate)
  ↓
REACT 19 (server components render HTML; "use client" components hydrate)
  ↓
PAGES / ROUTES (src/app/**)
  ├── /               home (Hero 3D + journey + explore cards)
  ├── /about          story + résumé download
  ├── /projects       grid + filters
  ├── /projects/[slug] per-project detail (generateMetadata)
  ├── /skills         skills/tools/learning/workflow
  ├── /contact        contact form + FAQ
  └── /demos/*        6 iframe demo pages (DemoFrame)
  ↓
COMPONENTS (src/components/**)
  Hero/ · About/ · Contact/ · Projects/ · Skills/ · ProjectPage/ ·
  CurrentJourney/ · Navbar · Footer · PageShell · DemoFrame · ui/ · …
  (animation: framer-motion; icons: lucide-react; cursor: CustomCursor)
  ↓
DATA (no database)
  ├── src/data/projects.ts   10 projects + stats + helpers
  ├── src/data/skills.ts     skills/tools/learning/workflow arrays
  └── src/lib/constants.ts   SITE · NAV_LINKS · SOCIAL_LINKS · TYPEWRITER_PHRASES
  ↓
3D LAYER
  ├── src/components/Hero/HeroCanvas.tsx  (React Three Fiber + three@0.184)
  └── public/demos/car-game/**            (raw Three.js 0.160 via CDN, sandboxed iframe)
  ↓
API / BACKEND (Next.js route handlers)
  ├── /api/auth/*      NextAuth v5 — Google OAuth, JWT sessions (auth.ts)
  └── /api/resume      auth-gated PNG stream from /private (fs.readFile)
  ↓
EXTERNAL SERVICES / STORAGE
  ├── Formspree        contact-form submissions → owner email
  ├── Google OAuth     identity provider
  ├── jsDelivr CDN     Three.js modules for the game (browser-side)
  └── Browser localStorage  game saves (cargame_save_v2) — client only
```

## Key architectural decisions (from code/comments)

1. **Data as code** — content lives in typed TS modules; no DB/CMS; changes ship via git.
2. **Sandboxed demos** — every demo is a self-contained HTML/CSS/JS app in `/public/demos`, embedded via `DemoFrame`'s iframe so their globals/CSS can't leak into the portfolio.
3. **Defense-in-depth résumé gate** — file outside `/public` + middleware check + in-route `auth()` check; Google-only OAuth, no passwords collected.
4. **Graceful degradation** — if Google OAuth env vars are missing, the provider is omitted rather than crashing the site.
5. **Styling** — one big design-system stylesheet (`globals.css`, ~6.2k lines) + Tailwind utilities; no CSS-in-JS.
6. **Legacy layer** — the previous static site (`/index.html`, `/script.js`, `/style.css`, `/demos/*`) is kept at the root but unused by Next.js.
