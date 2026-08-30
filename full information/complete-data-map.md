# Complete Data Map

| Website Data | Stored In | Variable | Used By | Database? |
|---|---|---|---|---|
| Name ("Sishir Bharati") | `src/lib/constants.ts` | `SITE.name` | Footer, contact profile, SEO titles | No |
| Tagline / typewriter phrases | `src/lib/constants.ts` | `TYPEWRITER_PHRASES` | `Hero/Typewriter`, `HeroTypewriter` | No |
| About / story copy | `src/components/About/*.tsx` (inline JSX) | — | `/about` sections | No |
| Education | `src/components/About/AboutQuickFacts.tsx` | inline fact `{label:'Education', value:'Computer Science'}` | QuickFacts grid | No |
| Experience / journey | `src/components/CurrentJourney/CurrentJourney.tsx` + `About/AboutStory` (inline) | — | home + about | No |
| Skills (programming/SEO/AI) | `src/data/skills.ts` | `programming`, `seo`, `ai` (`Skill[]`) | `Skills/SkillCard` | No |
| Tools | `src/data/skills.ts` | `tools` (`Tool[]`) | `Skills/ToolCard` | No |
| Currently learning | `src/data/skills.ts` | `learning` (`Learning[]`) | `Skills/LearningCard` | No |
| Workflow timeline | `src/data/skills.ts` | `workflow` (`WorkflowStep[]`) | `Skills/WorkflowTimeline` | No |
| Projects (all fields) | `src/data/projects.ts` | `projects` (`Project[]`, 10 items) | `Projects/*` grid + modal, `[slug]` detail | No |
| Project descriptions/features/tech/URLs | `src/data/projects.ts` | `overview`, `features[]`, `techStack[]`, `demoUrl`, `githubUrl`, `websiteUrl` | `ProjectPage/*` | No |
| Project stats | `src/data/projects.ts` | `projectStats`, `featuredProject` | `Projects/ProjectStats`, `FeaturedProject` | No |
| Hero statistics (5+/2+/15+/3+) | `src/components/Hero/HeroSection.tsx` | inline `<StatCard>` props | hero grid | No |
| FAQ | `src/components/FAQSection.tsx` (+ `Contact/FAQ.tsx`) | `const faqs` inline | FAQ accordions | No |
| Navigation | `src/lib/constants.ts` | `NAV_LINKS` | `Navbar` | No |
| Footer content | `src/components/Footer.tsx` (+ `SITE`, `SOCIAL_LINKS`) | — | Footer | No |
| Social links | `src/lib/constants.ts` | `SOCIAL_LINKS` | Footer, Contact | No |
| Contact info (email/location) | `src/lib/constants.ts` | `SITE.email`, `SITE.location` | ContactForm profile card, mailto | No |
| Contact form endpoint | `src/lib/constants.ts` | `SITE.formspreeUrl` | ContactForm fetch | No (Formspree SaaS) |
| Résumé file | `private/Sishir-Bharati-Resume.png` (git-ignored) | — | `/api/resume` → `ResumeAuthModal` | No (file on disk) |
| SEO (titles/descriptions/OG) | `src/app/layout.tsx` + per-page `layout.tsx` + `[slug]/page.tsx` | `metadata` / `generateMetadata` | `<head>` output | No |
| Structured data (JSON-LD) | — | — | — | **None exists** |
| Images | `public/images/*.svg`, `public/*.svg` | `thumbnailUrl` refs in `projects.ts` | project cards/preview | No |
| Game progression (money/XP/cars/missions) | browser `localStorage` | key `cargame_save_v2` (+ legacy `v1`) | `public/demos/car-game/src/game.js` | No (client-side) |
| Auth secrets | `.env.local` (git-ignored) | `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | `auth.ts` | No (env) |
