# All Pages and Routes

App Router — every route lives in `src/app/`. Plus API routes under `/api`.

## Static pages

### `/` — Home
- **File:** `src/app/page.tsx` (client)
- **Layout:** root `src/app/layout.tsx`
- **Components:** `PageShell` (Navbar/Footer/cursor wrapper), `HeroSection` (+`HeroCanvas` R3F 3D, `Typewriter`, `StatCard`s, `useCountUp`), `CurrentJourney`, explore-card grid, `ScrollReveal`
- **Data:** `TYPEWRITER_PHRASES` (constants.ts); explore cards inline; stats inline
- **API calls:** none · **Assets:** 3D hero canvas · **SEO:** root metadata

### `/about`
- **File:** `src/app/about/page.tsx` + `layout.tsx` (own metadata)
- **Components:** `About/*` (Hero, Story, Philosophy, Profile, QuickFacts, Drives, Focus, Beyond, FunFacts, CTA, SectionHead, Background, motion) + **ResumeAuthModal** (Google sign-in → `/api/resume`)
- **Data:** copy inline in components; résumé via auth API
- **API calls:** `signIn('google')`, `fetch('/api/resume')`

### `/projects`
- **File:** `src/app/projects/page.tsx` + `layout.tsx`
- **Components:** `Projects/*` (Hero, SectionHead, FilterBar, FeaturedProject, ProjectCard, ProjectModal, ProjectStats, DevProcess, OpenSource, CTA, Background)
- **Data:** `projects`, `projectStats`, `featuredProject` from `src/data/projects.ts`

### `/projects/[slug]` — project detail (dynamic)
- **File:** `src/app/projects/[slug]/page.tsx` (server, `generateMetadata`) + `ProjectPageClient.tsx`
- **Components:** `ProjectPage/*` (Hero, About, Features, TechStack, Links, Preview, BackButton)
- **Data:** `getProjectBySlug(slug)` · **404** when slug unknown

### `/skills`
- **File:** `src/app/skills/page.tsx` + `layout.tsx`
- **Components:** `Skills/*` (Hero, SectionHead, SkillCard, ToolCard, LearningCard, TiltCard, WorkflowTimeline, Background)
- **Data:** `programming/seo/ai/tools/learning/workflow` from `src/data/skills.ts`

### `/contact`
- **File:** `src/app/contact/page.tsx` + `layout.tsx`
- **Components:** `Contact/*` (Section, ContactForm, FAQ, WhyWorkWithMe, CTA, Background)
- **Data:** `SITE` constants · **API calls:** POST Formspree (browser→SaaS)

## Demo pages (iframe embeds)

Each = one `page.tsx` exporting metadata + `<DemoFrame src="/demos/<name>/index.html">`.

| URL | Page file | Demo app | Notes |
|---|---|---|---|
| `/demos/car-game` | `src/app/demos/car-game/page.tsx` | Neon Drive NYC (Three.js) | largest demo, own README |
| `/demos/snake` | `src/app/demos/snake/page.tsx` | Snake Neon (canvas) | |
| `/demos/chatbot` | `src/app/demos/chatbot/page.tsx` | AI chatbot | |
| `/demos/classifier` | `src/app/demos/classifier/page.tsx` | digit classifier (TF.js) | |
| `/demos/rpg` | `src/app/demos/rpg/page.tsx` | terminal RPG | |
| `/demos/tasks` | `src/app/demos/tasks/page.tsx` | task manager | |

## API routes

| URL | File | Method | Access |
|---|---|---|---|
| `/api/auth/*` | `src/app/api/auth/[...nextauth]/route.ts` | GET/POST | public (auth flow) |
| `/api/resume` | `src/app/api/resume/route.ts` | GET | **session required** (2 guards) |

## Notable absences

- No `sitemap.ts` / `robots.txt` route, no custom 404 (`not-found.tsx`), no error boundary files, no `/blog` or CMS routes.
