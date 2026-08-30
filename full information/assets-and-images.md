# Assets and Images

## Local asset roots

### `/public` — served statically by URL

| Asset | Used by |
|---|---|
| `public/images/share-master-dashboard.svg` | Projects data → Share Master card (`thumbnailUrl` in `src/data/projects.ts`) |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Default Next.js scaffolding SVGs (mostly unused) |
| `public/demos/car-game/**` (17 files) | Neon Drive NYC game — iframe `src="/demos/car-game/index.html"` via `DemoFrame` on `/demos/car-game` |
| `public/demos/snake/**`, `chatbot/**`, `classifier/**`, `rpg/**`, `tasks/**` | The other five demo apps, each embedded the same way |
| `public/favicon.ico` | Site favicon (`src/app/favicon.ico` convention) |

### `/private` — NOT web-accessible (git-ignored)

| Asset | Used by |
|---|---|
| `private/Sishir-Bharati-Resume.png` | Résumé, served **only** through auth-gated `GET /api/resume` (see backend-and-api.md). Deliberately outside `/public` so no direct URL exists. |

### `/demos` (root) — legacy copies

Source copies of five demo apps (ai-chatbot, digit-classifier, smart-task-manager, snake-game, terminal-rpg) kept outside the web root. Not referenced by the Next.js site; `public/demos/*` are the live copies.

### Root legacy assets

`index.html`, `script.js`, `style.css` — the previous static version of the site, kept for reference; not part of the Next.js build.

## Fonts

| Font | Loaded via | Where used |
|---|---|---|
| **Orbitron** (display) | `next/font/google` → CSS var `--font-display` (`src/app/layout.tsx`) | Headings, stats, game-style numerals |
| **Outfit** (body) | `next/font/google` → `--font-body` | Site body text |
| Orbitron + Rajdhani | `<link>` to Google Fonts in `public/demos/car-game/index.html` | Car-game UI only |

## Icons

- **lucide-react** — imported as typed components across Skills/About/Contact components (no icon files on disk).
- **Emoji-as-icons** — project feature/tech icons in `src/data/projects.ts` store emoji strings.
- Inline SVG JSX — Navbar/Footer/DemoFrame arrows and social glyphs.

## Remote URLs / CDN / cloud storage

| URL | What | Referenced from |
|---|---|---|
| `https://cdn.jsdelivr.net/npm/three@0.160.0/...` | Three.js ES modules (importmap) | car-game `index.html` |
| `https://fonts.googleapis.com` / `gstatic` | Demo fonts | car-game `index.html` |
| `https://formspree.io/f/mlgzyywb` | Form endpoint | constants.ts |
| GitHub / LinkedIn / YouTube / TikTok profile URLs | Social links | constants.ts |
| `https://master-roan-tau.vercel.app/` | Share Master live site | `projects.ts` (websiteUrl/demoUrl) |
| Various CDN scripts (e.g. TensorFlow.js) | Demo apps | each `public/demos/*/index.html` |

No 3D model files (`.gltf/.glb/.fbx/.obj`) and no videos exist — all 3D geometry is generated procedurally in code.
