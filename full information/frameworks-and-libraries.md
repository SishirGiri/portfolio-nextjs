# Frameworks and Libraries

Source: `package.json`, `package-lock.json`, config files, and imports verified across the source tree.

## Frameworks

| Framework | Version | What it does here | Where used |
|---|---|---|---|
| **Next.js** | 16.2.6 | App-Router framework: routing (`src/app/**`), layouts, RSC + client components, API routes, middleware (`src/proxy.ts`), build/serve | Entire site |
| **React** | 19.2.4 | UI component runtime | Every `.tsx` component |
| **Tailwind CSS** | ^4 (dev) | Utility CSS engine, wired via PostCSS plugin; the site mostly uses a custom design system in `globals.css` with Tailwind utilities mixed in | `postcss.config.mjs`, class names throughout |
| **NextAuth / Auth.js** | 5.0.0-beta.32 | Google OAuth sign-in, JWT sessions; gates `/api/resume` | `auth.ts`, `src/app/api/auth/**`, `src/proxy.ts`, `src/components/About/ResumeAuthModal.tsx`, `src/components/Providers.tsx` |

## Libraries (production dependencies)

| Library | Version | Purpose | Where used |
|---|---|---|---|
| **three** | ^0.184.0 | WebGL 3D engine — particle nebula, DNA helix, floating shapes in the hero | `src/components/Hero/HeroCanvas.tsx` |
| **@react-three/fiber** | ^9.6.1 | React renderer for Three.js (`<Canvas>`, `useFrame`, `useThree`) | `HeroCanvas.tsx` |
| **@react-three/drei** | ^10.7.7 | R3F helpers (installed; optimized via `optimizePackageImports` in `next.config.ts`) | Hero scene |
| **framer-motion** | ^12.38.0 | Animation — entrance variants, staggered stats, magnetic buttons, scroll effects | `Hero/`, `About/motion.ts`, various components |
| **lucide-react** | ^1.16.0 | Icon set (typed `LucideIcon`) | Skills cards, About facts, FAQ, services |

## External services / CDN libraries (not npm)

| Item | Purpose | Where |
|---|---|---|
| **Formspree** (`formspree.io/f/mlgzyywb`) | Receives contact-form submissions → owner's email | `src/lib/constants.ts` → `ContactForm.tsx` |
| **Three.js 0.160 via jsDelivr CDN** (importmap) | The car game loads Three.js as an ES module without a build step | `public/demos/car-game/index.html` |
| **Google Fonts (Orbitron, Rajdhani)** | Car-game typography | `public/demos/car-game/index.html` |
| **Google Fonts (Orbitron, Outfit)** via `next/font` | Site typography (self-hosted at build) | `src/app/layout.tsx` |
| **TensorFlow.js / other CDN scripts** | Demo apps (digit classifier etc.) load their own libs inside sandboxes | `public/demos/*/index.html` |

## Toolchain (devDependencies)

| Tool | Version | Purpose |
|---|---|---|
| typescript | ^5 | Type checking |
| @types/node, @types/react, @types/react-dom, @types/three | ^20/^19/^19/^0.184 | Type definitions |
| eslint + eslint-config-next | ^9 / 16.2.6 | Linting (`npm run lint`) |
| tailwindcss + @tailwindcss/postcss | ^4 | CSS pipeline |

## Explicitly NOT used (verified absent)

React Three Fiber is present but **no** GLSL shaders; **no** Redux/Zustand/Jotai (state is local `useState`); **no** axios/fetch wrappers (native `fetch` in ContactForm + resume modal); **no** analytics (no GA/Plausible/UMAMI scripts); **no** ORM/database libs; **no** UI kits (MUI/Chakra/shadcn — custom design system instead); **no** CMS (content is typed TS files).
