# Exact Data Storage — Where Every Website Data Item Lives

There is **no database**. Every item is stored in TypeScript files, components, or static assets, then rendered by React.

---

## Identity & personal info

### Name
```
Site name/title
↓ src/lib/constants.ts → export const SITE = { name: "Sishir Bharati", ... }
↓ Also in src/app/layout.tsx → metadata.title
↓ Used by: Footer, Contact profile card, SEO <title>/OG tags
↓ Reaches browser: compiled into the React server components / metadata at build
```

### Contact information (email, location)
```
Contact page + Footer + contact form
↓ src/lib/constants.ts → SITE.email ("girisishir4@gmail.com"), SITE.location ("Pokhara, Nepal")
↓ Used by: src/components/Contact/ContactForm.tsx (profile card, mailto, copy button)
↓ Reaches browser: bundled into the client JS chunk for /contact
```

### Social links (GitHub, LinkedIn, YouTube, TikTok)
```
Footer + Contact page
↓ src/lib/constants.ts → export const SOCIAL_LINKS = [...4 links with icons]
↓ Used by: Footer.tsx, Contact components
↓ Reaches browser: rendered as <a href> — visible in DOM
```

### Navigation links
```
Navbar + mobile menu
↓ src/lib/constants.ts → export const NAV_LINKS (About/Projects/Skills/Contact)
↓ Used by: src/components/Navbar.tsx (client component)
```

## About / story content

```
About page (/about)
↓ Hardcoded JSX inside src/components/About/*.tsx (AboutHero, AboutStory,
  AboutPhilosophy, AboutProfile, AboutQuickFacts, AboutDrives, AboutFocus,
  AboutBeyond, AboutFunFacts, AboutCTA)
↓ Education: AboutQuickFacts.tsx → { label: 'Education', value: 'Computer Science' }
↓ "What drives me" list: AboutDrives.tsx (inline array)
↓ Fun facts: AboutFunFacts.tsx (inline array)
↓ Reaches browser: server/client components rendered on demand
```
*(The About page predates a central data file — its copy lives in the components themselves.)*

## Skills

```
Skills page (/skills) + section
↓ src/data/skills.ts
↓ Exports: programming: Skill[], seo: Skill[], ai: Skill[], tools: Tool[],
   learning: Learning[], workflow: WorkflowStep[]
↓ Used by: src/components/Skills/* (SkillCard, ToolCard, LearningCard, WorkflowTimeline)
↓ Reaches browser: bundled into the /skills page chunks
```

## Projects (the largest data set)

```
Home projects grid → /projects → /projects/[slug]
↓ src/data/projects.ts
↓ export const projects: Project[]            (10 projects; slug, title, icon,
   accentClass, tags, description, tech, demoUrl, githubUrl, websiteUrl,
   thumbnailUrl, heroSubtitle, overview, features[8], techStack, previewDescription,
   category, language, status, difficulty, date, highlights, featured)
↓ export function getProjectBySlug(slug)      (detail page lookup)
↓ export const projectStats                   (counts for stats bar)
↓ export const featuredProject
↓ Used by: ProjectsSection/ProjectCard/ProjectModal (grid), ProjectPage* (detail)
↓ Reaches browser: server-rendered HTML + client hydration
```

## Statistics (hero)

```
Homepage hero
↓ Hardcoded in src/components/Hero/HeroSection.tsx → <StatCard value={5} "+ Projects Completed">,
   2+ Years Learning, 15+ Technologies, 3+ SEO Projects
↓ Animated counting via src/hooks/useCountUp.ts
```

## Typewriter phrases / tagline

```
Hero
↓ src/lib/constants.ts → TYPEWRITER_PHRASES[4]
↓ src/components/Hero/Typewriter.tsx / HeroTypewriter.tsx
```

## Timeline (workflow)

```
Skills page
↓ src/data/skills.ts → workflow: WorkflowStep[]
↓ src/components/Skills/WorkflowTimeline.tsx
```

## FAQ

```
Legacy home section
↓ Hardcoded in src/components/FAQSection.tsx → const faqs = [...]
↓ (Contact page has its own FAQ inside src/components/Contact/FAQ.tsx)
```

## Footer content

```
Every page
↓ src/components/Footer.tsx — uses SITE + SOCIAL_LINKS from src/lib/constants.ts
   (brand line, nav links, socials, copyright)
```

## SEO information & structured data

```
src/app/layout.tsx → root metadata (title, description, openGraph)
src/app/{about,contact,projects,skills}/layout.tsx → per-page metadata
src/app/projects/[slug]/page.tsx → generateMetadata() per project
No sitemap.ts / robots.ts / JSON-LD exist (see seo-audit.md)
```

## Resume

```
About page → ResumeAuthModal (Google sign-in) → /api/resume
↓ File on disk: private/Sishir-Bharati-Resume.png (git-ignored, outside /public)
↓ Served ONLY by src/app/api/resume/route.ts after NextAuth session check
↓ Never exposed as a static URL
```

## Game saves (Neon Drive NYC)

```
Browser localStorage key "cargame_save_v2" (+"cargame_save_v1" legacy)
↓ Written/read by public/demos/car-game/src/game.js
↓ Money, XP, level, owned cars, upgrades, customization, completed missions,
   settings, last position — purely client-side, per-browser
```
