# Component Architecture — Actual Tree

`P` = server component by default, `C` = `"use client"`.

```
RootLayout (src/app/layout.tsx — P: fonts, metadata, <body>)
└── Providers (C: NextAuth SessionProvider)
    └── PageShell (C: page frame + reveal-on-mount)
        ├── Navbar (C: NAV_LINKS, scroll state, mobile menu)
        ├── CustomCursor (C: cursor-follow effects)
        │
        ├── HOME  /
        │   ├── HeroSection (C)
        │   │   ├── HeroCanvas (C — React Three Fiber)
        │   │   │   ├── Particles → stars · nebula · DNA helix · floating shapes
        │   │   │   └── useFrame camera drift + mouse parallax
        │   │   ├── Typewriter / HeroTypewriter (C — TYPEWRITER_PHRASES)
        │   │   └── StatCard ×4 (C — framer-motion + useCountUp)
        │   ├── CurrentJourney (C — journey timeline)
        │   └── Explore cards → Link to /about /projects /skills /contact
        │
        ├── ABOUT  /about
        │   ├── AboutHero · AboutStory · AboutPhilosophy · AboutProfile
        │   ├── AboutQuickFacts (education/location facts)
        │   ├── AboutDrives · AboutFocus · AboutBeyond · AboutFunFacts · AboutCTA
        │   ├── AboutSectionHead · AboutBackground · motion.ts (variants)
        │   └── ResumeAuthModal (C — Google signIn → /api/resume download)
        │
        ├── PROJECTS  /projects
        │   ├── ProjectsHero · ProjectSectionHead · ProjectsBackground
        │   ├── FilterBar (C — category filter)
        │   ├── FeaturedProject · ProjectCard (C — grid) · ProjectModal (C — detail)
        │   ├── ProjectStats · DevProcess · OpenSource · ProjectsCTA · icons.tsx
        │   └── [slug] detail: ProjectHero · ProjectAbout · ProjectFeatures
        │              · ProjectTechStack · ProjectLinks · ProjectPreview · BackButton
        │              (wrapped by ProjectPageClient — C)
        │
        ├── SKILLS  /skills
        │   ├── SkillsHero · SkillSectionHead · SkillsBackground
        │   ├── SkillCard (C — animated progress) · ToolCard · LearningCard
        │   ├── TiltCard (C — pointer tilt) · WorkflowTimeline
        │
        ├── CONTACT  /contact
        │   ├── ContactSection · ContactBackground
        │   ├── ContactForm (C — validation → Formspree)
        │   ├── FAQ · WhyWorkWithMe · ContactCTA
        │
        ├── DEMOS  /demos/* ×6
        │   └── DemoFrame (C — sandboxed iframe + back pill)
        │
        └── Footer (C/P — SITE + SOCIAL_LINKS)

Shared UI utilities
├── ui/Modal.tsx · ui/ScrollReveal.tsx · ui/SectionHeader.tsx
└── hooks/useCountUp.ts

Legacy (imported rarely / unused on current pages)
├── HeroSection.tsx (old) · DashboardShowcase · ServicesSection ·
├── PricingSection · TestimonialsSection · FeaturesSection · FAQSection
└── these belong to the previous single-page layout
```

## Patterns observed

- **Folder-per-section** — `About/`, `Contact/`, `Hero/`, `Projects/`, `Skills/`, `ProjectPage/` keep related components together.
- **Client boundary** — interactive pieces are marked `"use client"`; pages/layouts stay server-rendered for SEO.
- **Animation** — shared variants in `About/motion.ts`; `ScrollReveal` wraps sections; framer-motion for stats/magnetic buttons.
- **Custom design system** — visual styling lives in `globals.css` classes (`explore-card`, `profile-card`, `hero-stats-grid`…), not per-component CSS.
