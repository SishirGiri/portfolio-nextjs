# PROGRAMMING LANGUAGES AND TECHNOLOGIES

> Complete audit of `sishir-portfolio` (repo: `portfolio-nextjs`) — based on actual source files, verified 2026-08-21. Excludes `node_modules/`, `.next/`, `.git/`, `.kilo/`, `.zcode/`. Nothing was modified.

---

## 9. FINAL SUMMARY (at top, as requested)

```text
TOTAL PROGRAMMING LANGUAGES: 7

Programming Languages:
1. TypeScript (incl. TSX/JSX syntax) — 100 files (.ts 12 + .tsx 88)
2. JavaScript (incl. .mjs build config) — 26 files (.js 24 + .mjs 2)
3. HTML — 12 files
4. CSS — 13 files
5. JSON — 3 files
6. Markdown — 5 files
7. SVG / XML — 6 files

NOT present (verified): SQL, GLSL/shader language, Python, C, JSX-only files

Frameworks:
1. Next.js 16.2.6 (App Router — pages, layouts, API routes, middleware)
2. React 19.2.4 (UI runtime)
3. Tailwind CSS 4 (utility CSS via PostCSS)
4. NextAuth / Auth.js v5 (5.0.0-beta.32) — Google OAuth + JWT sessions
5. Node.js — server runtime for Next.js (build/serve, fs, route handlers)

3D Technologies:
1. Three.js 0.184 (npm) — hero scene via React Three Fiber
2. @react-three/fiber 9.6.1 — React renderer for Three.js
3. @react-three/drei 10.7.7 — R3F helper toolkit
4. Three.js 0.160 (CDN importmap) — Neon Drive NYC game
5. WebGL — renderer used by both Three.js systems
6. Canvas 2D — game HUD (minimap, speedometer, gauge cluster, textures)
7. Optional UnrealBloomPass post-processing (game, High/Ultra quality)

Styling:
1. CSS — globals.css design system (6,242 lines)
2. Tailwind CSS 4 utilities (in class names)
3. PostCSS (@tailwindcss/postcss pipeline)
NOT used: CSS Modules, Sass/SCSS, styled-components

Database:
NO — no SQL/Prisma/MongoDB/PostgreSQL/Firebase/Supabase.
Data lives in TypeScript files, browser localStorage (game), Formspree (forms).

Backend:
Next.js server only — /api/auth/* (NextAuth), /api/resume (auth-gated PNG),
src/proxy.ts middleware, RSC server components. External: Formspree, Google OAuth.

Build/Deployment:
npm (package-lock.json), Next.js build system (next dev/build/start),
Git + GitHub (SishirGiri/portfolio-nextjs), Vercel (evidenced, not a config file).
No Docker, no CI/CD workflow files.
```

---

## 1. Programming Languages (7 — verified from files)

### 1. TypeScript / TSX — primary language (100 files)
- **Extensions:** `.ts` (12), `.tsx` (88)
- **Locations:** `src/app/**` (all pages/layouts/API routes), `src/components/**` (~70 components), `src/data/` (projects.ts, skills.ts), `src/lib/constants.ts`, `src/hooks/useCountUp.ts`, root `auth.ts`, `next.config.ts`, `tailwind.config.ts`
- **Used for:** the entire Next.js site — typed content data, UI components, auth config, API route handlers, middleware
- **Examples:** `src/app/layout.tsx`, `src/data/projects.ts` (10 typed projects), `auth.ts` (NextAuth config), `src/app/api/resume/route.ts`
- **JSX note:** JSX appears only inside `.tsx` (TypeScript JSX). No plain `.jsx` files exist.

### 2. JavaScript (26 files)
- **Extensions:** `.js` (24), `.mjs` (2)
- **Locations:** `public/demos/*/script.js` + the 13-module car game in `public/demos/car-game/src/`; legacy root `script.js` and `demos/*/script.js`; `postcss.config.mjs`, `eslint.config.mjs`
- **Used for:** build-step-free demo apps (game logic, TF.js classifier, chatbot…), legacy static site, ESM build configs
- **Examples:** `public/demos/car-game/src/game.js` (main loop), `postcss.config.mjs`

### 3. HTML (12 files)
- **Extension:** `.html`
- **Locations:** `public/demos/*/index.html` (6 live demos), `demos/*/index.html` (5 legacy copies), root `index.html` (legacy static homepage)
- **Used for:** shells of the standalone demo apps + old static site
- **Example:** `public/demos/car-game/index.html` (HUD + menus + Three.js importmap)

### 4. CSS (13 files)
- **Extension:** `.css`
- **Locations:** `src/app/globals.css` (6,242-line design system), `public/demos/*/style.css` (6), `demos/*/style.css` (5 legacy), root `style.css`
- **Used for:** site-wide cyber-noir theme (design tokens, component classes) + per-demo styling
- **Example:** `src/app/globals.css`

### 5. JSON (3 files)
- **Extension:** `.json`
- **Locations:** `package.json`, `package-lock.json`, `tsconfig.tsbuildinfo` (auto-generated)
- **Used for:** dependency/script manifest, lockfile, TS build cache

### 6. Markdown (5 files)
- **Extension:** `.md`
- **Locations:** `README.md`, `public/demos/car-game/README.md`, `public/demos/snake/README.md`, `demos/README.md`, `demos/snake-game/README.md`
- **Used for:** documentation only

### 7. SVG / XML (6 files)
- **Extension:** `.svg`
- **Locations:** `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `public/images/share-master-dashboard.svg`
- **Used for:** icons/thumbnails (many more SVGs are inline JSX in components)

### Checked and NOT present (verified, not assumed)
- **SQL** — no `.sql` files, no SQL strings
- **GLSL / shader language** — no `.glsl/.vert/.frag`, no `ShaderMaterial`/`fragmentShader` usage
- **Python / C** — appear only as text content in skills/projects data, no source files

---

## 2. Frameworks

| Framework | Version | Purpose | Where used |
|---|---|---|---|
| **Next.js** | 16.2.6 | App-Router framework: file-based routing, server/client components, API routes, middleware proxy, build & serve | `src/app/**`, `src/proxy.ts`, `next.config.ts` |
| **React** | 19.2.4 (+ react-dom 19.2.4) | Component UI runtime | every `.tsx` |
| **Tailwind CSS** | ^4 | Utility-class styling alongside the custom CSS system | class names across components; `postcss.config.mjs` |
| **NextAuth (Auth.js v5)** | 5.0.0-beta.32 | Google OAuth sign-in, JWT sessions, résumé access gate | `auth.ts`, `src/app/api/auth/**`, `src/proxy.ts`, `ResumeAuthModal`, `Providers.tsx` |
| **Node.js** | runtime (^@types/node 20; no engines pin) | Server runtime for Next.js — `node:fs/promises` résumé read, route handlers, build tooling | server-side code |

No backend framework beyond Next.js itself (no Express/Nest/FastAPI — verified).

---

## 3. 3D / WebGL Technologies

| Technology | Version | What it does here |
|---|---|---|
| **Three.js (site)** | ^0.184.0 (npm) | WebGL engine for the homepage hero: 1,400-star field, 700-point color-lerped nebula, procedural DNA double helix, floating shapes |
| **React Three Fiber** | ^9.6.1 | React renderer — `<Canvas>`, `useFrame` animation, `useThree` camera/mouse parallax in `src/components/Hero/HeroCanvas.tsx` |
| **Drei** | ^10.7.7 | R3F companion helpers (optimized via `next.config.ts` `optimizePackageImports`) |
| **Three.js (game)** | 0.160.0 via jsDelivr CDN importmap | Neon Drive NYC: procedural city geometry, extruded car bodies, instanced windows/props, PBR materials, PCFSoft shadows, ACES tone mapping, 13 ES modules in `public/demos/car-game/src/` |
| **WebGL** | (via Three.js) | The rendering API both systems target; no direct raw-WebGL code |
| **Canvas 2D** | browser API | Game HUD: rotating minimap, speedometer with RPM arc, cockpit gauge cluster (CanvasTexture), all procedural textures (asphalt, brick, facades, carbon fiber, license plates, animated billboards) |
| **Post-processing** | UnrealBloomPass/EffectComposer/OutputPass (CDN addons) | Optional bloom in the game at High/Ultra quality; lazily imported, disabled otherwise. Site hero has none |
| **GLSL / shaders** | — | **None.** Only stock Three.js materials |
| **3D model files** | — | **None.** All geometry is procedural (no .gltf/.glb/.fbx/.obj) |
| **3D animation libraries** | framer-motion (12.38) animates DOM UI, not 3D; 3D motion is hand-rolled in `useFrame`/`useFrame`-equivalents |

---

## 4. Libraries & Packages (from `package.json` + lockfile)

### Production (9)
| Package | Version | Category | Purpose |
|---|---|---|---|
| next | 16.2.6 | Framework | App-Router site framework |
| react / react-dom | 19.2.4 | UI | Component runtime |
| three | ^0.184.0 | 3D | WebGL engine (hero) |
| @react-three/fiber | ^9.6.1 | 3D | React ↔ Three bridge |
| @react-three/drei | ^10.7.7 | 3D | R3F helpers |
| framer-motion | ^12.38.0 | Animation | Entrance variants, staggered stats, magnetic buttons, scroll effects |
| lucide-react | ^1.16.0 | Icons | Typed icon components (skills/about/FAQ) |
| next-auth | ^5.0.0-beta.32 | Authentication | Google OAuth + JWT sessions + route protection |

### Development (8)
| Package | Version | Purpose |
|---|---|---|
| typescript | ^5 | Type checking |
| @types/node · @types/react · @types/react-dom · @types/three | ^20/^19/^19/^0.184.1 | Type definitions |
| tailwindcss · @tailwindcss/postcss | ^4 | CSS engine + PostCSS integration |
| eslint · eslint-config-next | ^9 / 16.2.6 | Linting (`npm run lint`) |

### Categories with NO dedicated package (verified)
Forms (native `<form>` + fetch), API clients (native fetch), image processing (none), analytics (none — no GA/Plausible/UMAMI), SEO libs (none — only Next metadata API), UI kits (none — custom design system), state management (local useState only), CMS (none).

### Non-npm technologies (external)
Formspree (form endpoint), Google Fonts via `next/font` (self-hosted at build), Google Fonts + Three.js via CDN inside demos, TensorFlow.js via CDN inside the classifier demo.

---

## 5. Styling Technologies

| Technology | Status | Evidence |
|---|---|---|
| **Plain CSS (custom design system)** | ✅ primary | `src/app/globals.css` — 6,242 lines: design tokens, cyber-noir theme, all component classes |
| **Tailwind CSS** | ✅ | `^4` via `@tailwindcss/postcss`; utility classes in components (`bg-[#050810]`, `container`…) |
| **PostCSS** | ✅ | `postcss.config.mjs` (Tailwind v4 plugin pipeline) |
| CSS Modules | ❌ | no `*.module.css` files |
| Sass / SCSS | ❌ | no `.scss/.sass`, no sass package |
| styled-components / Emotion / CSS-in-JS | ❌ | none |
| Inline styles | minimal | only dynamic JS-driven styles (cursor, gauges) |

---

## 6. Data Technologies

| Technology | Status | Details |
|---|---|---|
| **TypeScript data objects** | ✅ primary | `src/data/projects.ts` (10 projects + stats + helpers), `src/data/skills.ts` (skills/tools/learning/workflow), `src/lib/constants.ts` (SITE, nav, socials) |
| **JSON** | ✅ | package manifests; also JSON-structured knowledge inside the chatbot demo |
| **APIs (consumed)** | ✅ | Formspree (forms), Google OAuth (identity), CDN modules |
| **APIs (provided)** | ✅ | Next.js route handlers (see §7) |
| **Browser localStorage** | ✅ | game saves `cargame_save_v2` (+ legacy `v1`) — money/XP/cars/missions/settings |
| **Database** | ❌ **NO DATABASE** | No SQL, Prisma, Drizzle, MongoDB/Mongoose, PostgreSQL, MySQL, SQLite, Firebase, Supabase, no `DATABASE_URL`. Verified by search |
| File storage | ✅ (static only) | `/public` assets; `/private/Sishir-Bharati-Resume.png` served via auth-gated API |

---

## 7. Backend Technologies

| Technology | Status | Details |
|---|---|---|
| **Next.js API route handlers** | ✅ | `src/app/api/auth/[...nextauth]/route.ts` (GET/POST — OAuth flow), `src/app/api/resume/route.ts` (GET — streams résumé PNG after `auth()` check; 401/404 JSON otherwise) |
| **Middleware** | ✅ | `src/proxy.ts` — matcher `/api/resume`, rejects unauthenticated hits pre-handler |
| **React Server Components** | ✅ | pages/layouts render server-side by default (e.g. `projects/[slug]/page.tsx` + `generateMetadata`); `"use client"` marks the interactive boundary |
| **Server Actions** | ❌ | none |
| **Node.js APIs** | ✅ | `node:fs/promises` (résumé read), `node:path` |
| **Authentication** | ✅ | NextAuth v5: Google provider only, JWT session strategy, `authorized` callback, custom sign-in page `/about` |
| **External APIs / Email** | ✅ | Formspree (contact → owner email); Google OAuth. No self-hosted email code |
| **Webhooks / cron / queues** | ❌ | none |
| **Server-side data writes** | ❌ | none (only client localStorage) |

---

## 8. Build & Deployment Technologies

| Technology | Status | Evidence |
|---|---|---|
| **Package manager: npm** | ✅ | `package-lock.json` |
| **Build system: Next.js** | ✅ | scripts: `dev` → `next dev`, `build` → `next build`, `start` → `next start`, `lint` → `eslint`, `export` alias |
| **TypeScript compiler** | ✅ | `tsconfig.json` (`@/*` → `src/*`), `typescript ^5` |
| **PostCSS pipeline** | ✅ | `postcss.config.mjs` |
| **ESLint** | ✅ | `eslint.config.mjs` + eslint-config-next |
| **Git / GitHub** | ✅ | remote `github.com/SishirGiri/portfolio-nextjs`, direct commits to `main` |
| **Deployment: Vercel** | ✅ (strong evidence, no config file) | `.gitignore` lists `.vercel`; `vercel.svg` scaffold; owner's other project on `*.vercel.app`; README deployment section |
| **CI/CD** | ❌ | no `.github/workflows` — relies on platform Git auto-deploy |
| **Docker** | ❌ | no Dockerfile/compose |
| **Env config on host** | ✅ required | `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (see `.env.example`) |

---

## Final Table

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Programming Language | TypeScript (incl. TSX) | ^5 compiler | Entire Next.js site: pages, components, data, auth, APIs |
| Programming Language | JavaScript (incl. .mjs) | ES2020+ | Standalone demo apps, car game, build configs, legacy site |
| Programming Language | HTML | 5 | Demo app shells + legacy static page |
| Programming Language | CSS | 3 | Design system + demo styling |
| Programming Language | JSON | — | Manifests, lockfile, chatbot knowledge |
| Programming Language | Markdown | — | Documentation |
| Programming Language | SVG / XML | — | Icons, project thumbnail |
| Framework | Next.js | 16.2.6 | App-Router framework, SSR/RSC, API routes, middleware |
| Framework | React | 19.2.4 | UI runtime |
| Framework | Tailwind CSS | ^4 | Utility styling alongside custom CSS |
| Framework | NextAuth (Auth.js) | 5.0.0-beta.32 | Google OAuth + JWT sessions, résumé gate |
| 3D | Three.js (npm) | ^0.184.0 | Hero particle nebula + DNA helix |
| 3D | React Three Fiber | ^9.6.1 | React renderer for Three.js |
| 3D | Drei | ^10.7.7 | R3F helpers |
| 3D | Three.js (CDN) | 0.160.0 | Neon Drive NYC game engine |
| WebGL | WebGL (via Three.js) | — | Rendering target of both 3D systems |
| WebGL | Canvas 2D | browser API | Game HUD, gauges, procedural textures |
| Library | framer-motion | ^12.38.0 | UI animation |
| Library | lucide-react | ^1.16.0 | Icons |
| Styling | Custom CSS design system | 6,242 lines | Site-wide cyber-noir theme (globals.css) |
| Styling | PostCSS | via @tailwindcss/postcss ^4 | CSS pipeline |
| Data | TypeScript data files | — | projects.ts, skills.ts, constants.ts |
| Data | localStorage | browser | Game saves (cargame_save_v2) |
| Database | — | — | **NO DATABASE** (none of SQL/Prisma/Mongo/Postgres/Firebase/Supabase) |
| Backend | Next.js route handlers | 16.2.6 | /api/auth/*, /api/resume (gated) |
| Backend | Node.js (runtime) | ^20 types | fs/path APIs, server execution |
| Backend | Formspree (external SaaS) | — | Contact-form email delivery |
| Build Tool | npm + lockfile | — | Dependency management |
| Build Tool | next build / tsc / ESLint | 16.2.6 / ^5 / ^9 | Compile, type-check, lint |
| Deployment | Vercel + Git/GitHub | — | Hosting & source control (push-to-main deploys) |
