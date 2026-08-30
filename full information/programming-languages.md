# Programming Languages

Verified from actual files (excluding `node_modules/`, `.next/`, `.git/`, `.kilo/`, `.zcode/`).
**8 languages total.**

## 1. TypeScript / TSX — primary language (100 files)

| | |
|---|---|
| Extensions | `.ts` (12), `.tsx` (88) |
| Purpose | The entire Next.js site: pages, layouts, components, data, auth, config |
| Locations | `src/app/**` (pages/layouts/routes), `src/components/**` (UI), `src/data/**` (content), `src/lib/constants.ts`, `src/hooks/useCountUp.ts`, root `auth.ts`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` |
| Example | `src/app/layout.tsx` — root layout with `next/font`, metadata, `<Providers>` |

### .ts (12 files)
`auth.ts`, `next.config.ts`, `tailwind.config.ts`, `src/proxy.ts` (middleware), `src/data/projects.ts`, `src/data/skills.ts`, `src/lib/constants.ts`, `src/app/api/resume/route.ts`, `src/app/api/auth/[...nextauth]/route.ts`

### .tsx (88 files)
All pages under `src/app/**` (10 pages/layouts + `[slug]` detail), all ~70 components under `src/components/**` (`About/`, `Contact/`, `Hero/`, `Projects/`, `Skills/`, `ProjectPage/`, `ui/`, plus root-level Navbar/Footer/PageShell/etc.), `src/app/projects/[slug]/ProjectPageClient.tsx`.

## 2. JavaScript (24 files)

| | |
|---|---|
| Extension | `.js` |
| Purpose | Standalone demo apps (no build step) + legacy static site |
| Locations | `public/demos/*/script.js` (6 demos; 13 of the files are the car game's 13 modules), root `script.js` (legacy), `demos/*/script.js` (legacy copies) |
| Example | `public/demos/car-game/src/game.js` — main loop of the driving game |

## 3. HTML (12 files)

| | |
|---|---|
| Extension | `.html` |
| Purpose | Shells for the six standalone demos + legacy root page |
| Locations | `public/demos/*/index.html` (6), `demos/*/index.html` (5 legacy copies), root `index.html` (legacy static homepage) |
| Example | `public/demos/car-game/index.html` — HUD + menus + importmap for the game |

## 4. CSS (13 files)

| | |
|---|---|
| Extension | `.css` |
| Purpose | Site-wide design system + per-demo styles + legacy theme |
| Locations | `src/app/globals.css` (6,242 lines — the real design system), `public/demos/*/style.css` (6), `demos/*/style.css` (5 legacy), root `style.css` (legacy) |
| Example | `src/app/globals.css` — design tokens, cyber-noir theme, all component classes |

## 5. JSON (3 files)

`package.json` (deps/scripts), `package-lock.json` (lockfile), `tsconfig.tsbuildinfo` (build cache — auto-generated).

## 6. Markdown (5 files)

`README.md` (root), `public/demos/car-game/README.md`, `public/demos/snake/README.md`, `demos/README.md`, `demos/snake-game/README.md` — documentation only.

## 7. SVG — XML markup language (6 files)

`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `public/images/share-master-dashboard.svg` (project thumbnail). Note: many more SVGs are inline in TSX as JSX and inside CSS/canvas textures.

## 8. JavaScript-module config (.mjs, 2 files)

`postcss.config.mjs`, `eslint.config.mjs` — build-tool configuration in ESM JavaScript.

## Checked and NOT present

- **SQL** — no `.sql` files, no SQL strings anywhere (`database.md`).
- **GLSL** — no `.glsl`/`.vert`/`.frag` files and no `ShaderMaterial`/`fragmentShader` usage; all 3D uses stock Three.js materials (`threejs-webgl.md`).
- **JSX (plain)** — every React file is `.tsx`; no plain `.jsx` exists.
- **Python / C / others** — mentioned as *skills/projects content* in the data files, but no such source files exist in this repo.
