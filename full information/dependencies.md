# Dependencies

From `package.json` (name `sishir-portfolio` v0.1.0, private) + `package-lock.json`.
Caret `^` = compatible range locked precisely in the lockfile.

## Production dependencies (8)

| Package | Version | Purpose | Where used | Type |
|---|---|---|---|---|
| `next` | 16.2.6 | Framework: routing, SSR/RSC, API routes, middleware, build | entire `src/app` | prod |
| `react` | 19.2.4 | UI runtime | every component | prod |
| `react-dom` | 19.2.4 | React DOM renderer | paired with react | prod |
| `three` | ^0.184.0 | WebGL engine for hero scene | `Hero/HeroCanvas.tsx` | prod |
| `@react-three/fiber` | ^9.6.1 | React renderer for three | `HeroCanvas.tsx` | prod |
| `@react-three/drei` | ^10.7.7 | R3F helper toolkit | hero scene helpers | prod |
| `framer-motion` | ^12.38.0 | Animations (variants, stagger, magnetic buttons) | Hero/About/Contact/Skills | prod |
| `lucide-react` | ^1.16.0 | Icon components | Skills, About, FAQ, services | prod |
| `next-auth` | ^5.0.0-beta.32 | Auth.js v5 — Google OAuth + JWT sessions | `auth.ts`, `/api/auth`, résumé gate | prod |

*(9 rows — 8 libraries listed in package.json plus react-dom shown separately.)*

## Development dependencies (8)

| Package | Version | Purpose | Type |
|---|---|---|---|
| `typescript` | ^5 | Type system | dev |
| `@types/node` | ^20 | Node type defs | dev |
| `@types/react` / `@types/react-dom` | ^19 | React type defs | dev |
| `@types/three` | ^0.184.1 | Three.js type defs | dev |
| `tailwindcss` | ^4 | Utility CSS engine | dev |
| `@tailwindcss/postcss` | ^4 | PostCSS integration for Tailwind v4 | dev |
| `eslint` | ^9 | Linter | dev |
| `eslint-config-next` | 16.2.6 | Next.js lint rules | dev |

## Notable non-dependencies (loaded externally / SaaS)

- three@0.160 — **CDN importmap** inside the car game (not npm)
- Formspree — external form endpoint (constant, not a package)
- Google Fonts — via `next/font` (self-hosted at build) + `<link>` in demos

## Scripts

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `export` | `next build` (alias) |

## Health notes

- Versions are current-generation (Next 16 / React 19 / Tailwind 4 / three 0.184).
- `next-auth` rides the **v5 beta** channel — pin awareness for advisories.
- No unused heavy deps detected; legacy components (Pricing/Testimonials/etc.) still rely only on the core set.
