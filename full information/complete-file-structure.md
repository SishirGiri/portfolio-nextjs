# Complete File Structure

Everything relevant in the repository (excluding `node_modules/`, `.next/` build output, `.git/`, tool folders `.kilo/`, `.zcode/`, and this `full information/` report folder).

```text
personal website/                          ← project root (repo: portfolio-nextjs)
├── package.json                           npm scripts + dependencies
├── package-lock.json                      dependency lockfile
├── tsconfig.json                          TypeScript config (paths: @/* → src/*)
├── next.config.ts                         Next.js config (images, optimize imports)
├── tailwind.config.ts                     Tailwind theme (legacy tokens)
├── postcss.config.mjs                     Tailwind v4 PostCSS plugin
├── eslint.config.mjs                      ESLint (next config)
├── auth.ts                                NextAuth (Auth.js v5) — Google provider, JWT
├── .env.example                           env template (names only)
├── .env.local                             real env (git-ignored)
├── .gitignore
├── README.md                              project readme
│
├── ── LEGACY static site (unused by Next) ──
├── index.html · script.js · style.css     previous single-page version
│
├── private/                               NOT web-served, git-ignored
│   └── Sishir-Bharati-Resume.png          served only via /api/resume
│
├── src/
│   ├── proxy.ts                           middleware (guards /api/resume)
│   ├── app/
│   │   ├── layout.tsx                     root layout: fonts, metadata, Providers
│   │   ├── page.tsx                       / home
│   │   ├── globals.css                    6,242-line design system
│   │   ├── favicon.ico
│   │   ├── about/    layout.tsx · page.tsx
│   │   ├── contact/  layout.tsx · page.tsx
│   │   ├── projects/ layout.tsx · page.tsx
│   │   │   └── [slug]/ page.tsx · ProjectPageClient.tsx
│   │   ├── skills/   layout.tsx · page.tsx
│   │   ├── demos/
│   │   │   ├── car-game/page.tsx   chatbot/page.tsx
│   │   │   ├── classifier/page.tsx · rpg/page.tsx
│   │   │   └── snake/page.tsx      tasks/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── resume/route.ts              (GET, auth-gated)
│   ├── components/
│   │   ├── Providers.tsx                   SessionProvider wrapper
│   │   ├── PageShell.tsx · Navbar.tsx · Footer.tsx
│   │   ├── CustomCursor.tsx · DemoFrame.tsx
│   │   ├── CurrentJourney/CurrentJourney.tsx
│   │   ├── Hero/ HeroSection · HeroCanvas · Typewriter · HeroTypewriter · StatCard
│   │   ├── About/ (14 files: Hero, Story, Philosophy, Profile, QuickFacts,
│   │   │         Drives, Focus, Beyond, FunFacts, CTA, SectionHead,
│   │   │         Background, ResumeAuthModal, motion.ts)
│   │   ├── Projects/ (11 files: Hero, SectionHead, FilterBar, FeaturedProject,
│   │   │            ProjectCard, ProjectModal, ProjectStats, DevProcess,
│   │   │            OpenSource, CTA, Background, icons.tsx)
│   │   ├── ProjectPage/ (7 files: Hero, About, Features, TechStack,
│   │   │               Links, Preview, BackButton)
│   │   ├── Skills/ (9 files: Hero, SectionHead, SkillCard, ToolCard,
│   │   │          LearningCard, TiltCard, WorkflowTimeline, Background)
│   │   ├── Contact/ (7 files: Section, ContactForm, FAQ, WhyWorkWithMe,
│   │   │           CTA, Background)
│   │   ├── ui/ Modal.tsx · ScrollReveal.tsx · SectionHeader.tsx
│   │   └── legacy: HeroSection.tsx · DashboardShowcase · ServicesSection ·
│   │       PricingSection · TestimonialsSection · FeaturesSection · FAQSection
│   ├── data/
│   │   ├── projects.ts                     10 projects + stats + helpers
│   │   └── skills.ts                       skills/tools/learning/workflow
│   ├── lib/constants.ts                    SITE · NAV_LINKS · SOCIAL_LINKS · phrases
│   └── hooks/useCountUp.ts
│
├── public/
│   ├── favicon.ico (route) · file/globe/next/vercel/window.svg
│   ├── images/share-master-dashboard.svg
│   └── demos/
│       ├── car-game/  index.html · style.css · README.md
│       │              └── src/ (13 modules: main, game, city, vehicles, traffic,
│       │                 pedestrians, police, missions, navmap, input, audio,
│       │                 config, utils)
│       ├── snake/     index.html · script.js · style.css · README.md
│       ├── chatbot/   index.html · script.js · style.css
│       ├── classifier/ index.html · script.js · style.css
│       ├── rpg/       index.html · script.js · style.css
│       └── tasks/     index.html · script.js · style.css
│
└── demos/                                  legacy source copies (not served)
    ├── README.md
    ├── ai-chatbot/ · digit-classifier/ · smart-task-manager/
    ├── snake-game/ · terminal-rpg/        (index.html · script.js · style.css each)
```
