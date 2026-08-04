"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback } from "react";
import { motion } from "framer-motion";
import HeroTypewriter from "./HeroTypewriter";
import StatCard from "./StatCard";
import { SITE } from "@/lib/constants";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

/* ── Social accounts (real links) ── */
const SOCIALS = [
  {
    label: "GitHub",
    href: "https://github.com/SishirGiri",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/sishir-giri-b620202a4/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: `mailto:${SITE.email}`,
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@Music_lyrics15",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.6 9.4.6 9.4.6s7.6 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@sishir_official10?is_from_webapp=1&sender_device=pc",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.5 0h-3v16.2a3.3 3.3 0 1 1-3.3-3.3c.3 0 .6 0 .9.1v-3.1a6.4 6.4 0 1 0 5.4 6.3V8.4c1.2.9 2.6 1.5 4.1 1.6V6.9c-2.3-.2-4.1-2.1-4.1-4.4z" />
      </svg>
    ),
  },
];

const KEYWORDS = [
  "Software Development",
  "Technical SEO",
  "Artificial Intelligence",
  "Modern Web Technologies",
];

/* Floating technology brand icons in the orbit. Real SVG logos from
   Simple Icons (HTML5, CSS3, JS, Python, React, Git); SEO & AI use custom
   representative glyphs (no official brand logo exists). Each carries its
   own brand color used on hover. */
type TechIcon = { name: string; color: string; path: string };
const TECH_ICONS: TechIcon[] = [
  {
    name: "HTML5",
    color: "#e34f26",
    path: "M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z",
  },
  {
    name: "CSS3",
    color: "#1572b6",
    path: "M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z",
  },
  {
    name: "JavaScript",
    color: "#f7df1e",
    path: "M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z",
  },
  {
    name: "Python",
    color: "#4b8bbe",
    path: "M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z",
  },
  {
    name: "SEO",
    color: "#00d4ff",
    /* magnifying glass — represents search/SEO */
    path: "M10.5 3a7.5 7.5 0 1 0 4.343 13.682l5.237 5.237a1.5 1.5 0 0 0 2.122-2.122l-5.237-5.237A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z",
  },
  {
    name: "AI",
    color: "#7c3aed",
    /* sparkles — represents AI */
    path: "M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4L12 2zm6.5 10l.9 2.5 2.6.9-2.6.9-.9 2.5-.9-2.5-2.6-.9 2.6-.9.9-2.5zM5 14l1 2.7L8.7 18 6 18.9 5 21.6 4 18.9 1.3 18 4 16.7 5 14z",
  },
  {
    name: "React",
    color: "#61dafb",
    path: "M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z",
  },
  {
    name: "Git",
    color: "#f05032",
    path: "M23.546 10.93L13.067.452a1.55 1.55 0 0 0-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 0 1 2.327 2.341l2.658 2.66a1.838 1.838 0 0 1 1.9 3.039 1.837 1.837 0 0 1-2.6 0 1.846 1.846 0 0 1-.404-1.996L12.86 9.143v6.925a1.847 1.847 0 1 1-1.52-.05V9.082a1.846 1.846 0 0 1-1.003-2.42L8.606 3.73.45 11.883c-.6.605-.6 1.584 0 2.189l10.48 10.477a1.546 1.546 0 0 0 2.186 0l10.43-10.43a1.544 1.544 0 0 0 0-2.189z",
  },
];

/* Framer Motion variants for the left-column entrance stagger */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function HeroSection() {
  const onSectionMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  const handleRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ripple = el.querySelector<HTMLSpanElement>(".btn-ripple");
    if (ripple) {
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
    }
    el.classList.remove("btn--ripple");
    // restart animation
    void el.offsetWidth;
    el.classList.add("btn--ripple");
  }, []);

  return (
    <section
      id="hero"
      className="hero"
      onMouseMove={onSectionMouseMove}
    >
      <HeroCanvas />
      <div className="scanlines" />
      <div className="hero-grid-bg" />

      <div className="hero-gradient-top" />
      <div className="hero-gradient-bottom" />
      <div className="hero-spotlight" />

      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      <motion.div
        className="hero-grid"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* ───────────── LEFT COLUMN ───────────── */}
        <div className="hero-left">
          <motion.div variants={item} className="hero-pre-line">
            <span className="pre-deco" />
            <p className="hero-pre">HELLO, WORLD. I&apos;M</p>
            <span className="pre-deco" />
          </motion.div>

          <motion.h1
            variants={item}
            className="hero-name"
            data-text="Sishir Bharati"
          >
            Sishir Bharati
          </motion.h1>

          <motion.p variants={item} className="hero-tagline">
            <HeroTypewriter />
          </motion.p>

          <motion.p variants={item} className="hero-sub">
            I build fast, modern, and SEO-optimized digital experiences that
            combine clean code, intuitive design, and measurable performance.
          </motion.p>

          <motion.ul variants={item} className="hero-keywords" aria-label="Focus areas">
            {KEYWORDS.map((k) => (
              <li key={k} className="keyword-chip">
                {k}
              </li>
            ))}
          </motion.ul>

          <motion.div variants={item} className="hero-cta">
            <Link
              href="/projects"
              className="btn btn-primary"
              onClick={handleRipple}
            >
              <span className="btn-text">View My Projects</span>
              <span className="btn-glow" />
              <span className="btn-ripple" />
            </Link>
            <Link
              href="/contact"
              className="btn btn-ghost"
              onClick={handleRipple}
            >
              <span className="btn-text">Contact Me</span>
              <span className="btn-ripple" />
            </Link>
            <Link
              href="/about"
              className="btn btn-resume"
              onClick={handleRipple}
            >
              <span className="btn-text">Download Resume</span>
              <span className="btn-ripple" />
            </Link>
          </motion.div>

          <motion.nav variants={item} className="hero-socials" aria-label="Social links">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="hero-social-btn"
                target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={s.label}
                data-tooltip={s.label}
              >
                {s.icon}
              </a>
            ))}
          </motion.nav>

          <motion.ul variants={item} className="hero-stats-grid" aria-label="Quick stats">
            <StatCard value={5} suffix="+" label="Projects Completed" delay={0} />
            <StatCard value={2} suffix="+" label="Years Learning" delay={0.08} />
            <StatCard value={15} suffix="+" label="Technologies" delay={0.16} />
            <StatCard value={3} suffix="+" label="SEO Projects" delay={0.24} />
          </motion.ul>
        </div>

        {/* ───────────── RIGHT COLUMN ───────────── */}
        <motion.aside
          className="hero-right"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <div className="tech-orbit" aria-hidden="true">
            <div className="tech-orbit-core" />
            {TECH_ICONS.map((t, i) => (
              <span
                key={t.name}
                className="tech-chip"
                data-name={t.name}
                style={
                  {
                    "--i": i,
                    "--total": TECH_ICONS.length,
                    "--icon-color": t.color,
                  } as React.CSSProperties
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={t.path} />
                </svg>
              </span>
            ))}
          </div>
        </motion.aside>
      </motion.div>

      <div className="scroll-indicator">
        <div className="scroll-mouse">
          <div className="scroll-wheel" />
        </div>
        <span className="scroll-progress-track">
          <span className="scroll-progress-bar" />
        </span>
        <span className="scroll-chevron" aria-hidden="true">▾</span>
        <span>Scroll to explore</span>
      </div>

      <div className="hero-side-line hero-side-left">
        <span />
        <span />
        <span />
      </div>
      <div className="hero-side-line hero-side-right">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
