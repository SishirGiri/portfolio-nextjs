# Full Information — Complete Website Audit

> **Project:** `sishir-portfolio` (repo: `portfolio-nextjs`) — the personal portfolio of **Sishir Bharati**, Aspiring Developer & AI Enthusiast from Nepal.
> **Audit date:** 2026-08-21 · **No website files were modified** — this folder is a read-only report.

---

## 1. Executive Summary

This is a **Next.js 16 (App Router) + React 19 + TypeScript** personal portfolio with a dark "cyber-noir" futuristic theme. All portfolio content (projects, skills, socials, navigation, contact info) lives in **plain TypeScript data files** — there is **no database**. The contact form submits to **Formspree** (external SaaS). A **NextAuth (Auth.js v5) Google sign-in** gates the résumé file, which is stored in a git-ignored `/private` folder and served only through an authenticated API route. The homepage hero uses **React Three Fiber / Three.js** for a particle-nebula + DNA-helix animation, and the site ships **six standalone HTML/CSS/JS demo apps** (including the large "Neon Drive NYC" Three.js driving game) inside sandboxed iframes. Legacy artifacts of the previous static site (`/index.html`, `/script.js`, `/style.css`, `/demos/*`) remain at the root.

**Headline answers**

| Question | Answer |
|---|---|
| Framework | **Next.js 16.2.6** (App Router) + **React 19.2.4** |
| Languages | **8**: TypeScript/TSX, JavaScript, HTML, CSS, JSON, Markdown, SVG (XML), Bash-ish config (mjs) |
| Database | **NO DATABASE DETECTED** — all data in TS files + localStorage (game) |
| Main data storage | `src/data/projects.ts`, `src/data/skills.ts`, `src/lib/constants.ts` |
| Contact form → | **Formspree** (`https://formspree.io/f/mlgzyywb`) → owner's email inbox |
| Images/assets | `public/images/`, `public/*.svg`, `private/` (résumé), Google Fonts via `next/font` |
| Backend/API | 2 route groups: `/api/auth/*` (NextAuth) and `/api/resume` (gated résumé download) |
| 3D code | `src/components/Hero/HeroCanvas.tsx` (R3F) + `public/demos/car-game/src/*.js` (raw Three.js) |
| Security | Good posture overall; findings S1–S5 in `security-audit.md` (no exposed secrets) |

## 2. Technology Stack

- **Next.js 16.2.6** — App Router, RSC pages + client components, API routes, middleware proxy
- **React 19.2.4** — UI runtime
- **TypeScript 5** — typed everywhere (`src/**/*`, `auth.ts`, configs)
- **Tailwind CSS 4** (via `@tailwindcss/postcss`) + **6,242-line custom `globals.css`** design system
- **Three.js 0.184** + **@react-three/fiber 9** + **@react-three/drei 10** — hero 3D scene; raw Three.js 0.160 (CDN) in the car game
- **Framer Motion 12** — scroll/UI animation
- **lucide-react** — icons
- **NextAuth v5 beta (Auth.js)** — Google OAuth, JWT sessions, résumé gate
- **Vanilla JS/HTML/CSS** — the six standalone demo apps

## 3–18. Detailed Reports

Each topic has its own file in this folder:

1. [programming-languages.md](programming-languages.md)
2. [frameworks-and-libraries.md](frameworks-and-libraries.md)
3. [data-storage.md](data-storage.md)
4. [database.md](database.md)
5. [backend-and-api.md](backend-and-api.md)
6. [contact-form.md](contact-form.md)
7. [assets-and-images.md](assets-and-images.md)
8. [environment-variables.md](environment-variables.md)
9. [website-architecture.md](website-architecture.md)
10. [pages-and-routes.md](pages-and-routes.md)
11. [components.md](components.md)
12. [threejs-webgl.md](threejs-webgl.md)
13. [seo-audit.md](seo-audit.md)
14. [hosting-and-deployment.md](hosting-and-deployment.md)
15. [security-audit.md](security-audit.md)
16. [dependencies.md](dependencies.md)
17. [complete-file-structure.md](complete-file-structure.md)
18. [complete-data-map.md](complete-data-map.md)
