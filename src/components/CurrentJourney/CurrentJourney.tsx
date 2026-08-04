'use client';

import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';

/* ── Currently Working On ── */
const WORK_ITEMS = [
  { icon: '🚀', label: 'AI Projects', status: 'In Progress' },
  { icon: '📈', label: 'Technical SEO', status: 'In Progress' },
  { icon: '💻', label: 'Modern Portfolio', status: 'In Progress' },
  { icon: '✨', label: 'Open Source Contributions', status: 'Starting' },
];

/* ── Terminal lines (static text + blinking cursor) ── */
const TERMINAL_LINES: { cmd: string; out: string[] }[] = [
  {
    cmd: '> status',
    out: ['Building real-world software and SEO solutions.'],
  },
  {
    cmd: '> current_focus',
    out: [
      'Software Development',
      'Technical SEO',
      'Artificial Intelligence',
      'React Ecosystem',
    ],
  },
  {
    cmd: '> learning',
    out: ['Next.js', 'Machine Learning', 'Cloud Computing', 'Backend Development'],
  },
  {
    cmd: '> location',
    out: ['Nepal 🇳🇵'],
  },
  {
    cmd: '> availability',
    out: ['Open for internships, freelance, and collaborations.'],
  },
];

/* Framer Motion variants */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};
const slideLeft = {
  hidden: { opacity: 0, x: -32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};
const slideRight = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function CurrentJourney() {
  return (
    <section id="current-journey" className="section current-journey">
      <div className="container">
        {/* Header */}
        <ScrollReveal direction="up">
          <div className="section-header">
            <span className="section-number">02</span>
            <h2 className="section-title">
              Current <em>Journey</em>
            </h2>
            <div className="section-line" />
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.05}>
          <p className="current-journey-subtitle">
            What I&apos;m currently building, learning, and working toward.
          </p>
        </ScrollReveal>

        {/* Two-column cards */}
        <motion.div
          className="journey-grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Left — Currently Working On */}
          <motion.div
            className="journey-card journey-card--work"
            variants={slideLeft}
          >
            <span className="journey-card-tag">Currently Working On</span>
            <motion.ul
              className="journey-card-list"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              {WORK_ITEMS.map((w) => (
                <motion.li key={w.label} className="journey-card-item" variants={fadeUp}>
                  <span className="journey-card-item-icon" aria-hidden="true">
                    {w.icon}
                  </span>
                  <span className="journey-card-item-label">{w.label}</span>
                  <span className="journey-status-dot" aria-hidden="true" data-status={w.status} />
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Right — Latest Achievement */}
          <motion.div
            className="journey-card journey-card--achievement"
            variants={slideRight}
          >
            <span className="journey-card-badge">Latest</span>
            <span className="journey-card-tag">Latest Achievement</span>
            <h3 className="journey-card-title">
              Building modern web experiences with React.
            </h3>
            <p className="journey-card-date">2026</p>
            <p className="journey-card-desc">
              Shipped a redesigned portfolio with a focus on performance,
              accessible design, and SEO best practices — combining clean code
              with measurable results.
            </p>
          </motion.div>
        </motion.div>

        {/* Full-width terminal */}
        <ScrollReveal direction="up" delay={0.1}>
          <div className="terminal journey-terminal">
            <div className="terminal-bar">
              <span className="terminal-dot terminal-dot--red" />
              <span className="terminal-dot terminal-dot--amber" />
              <span className="terminal-dot terminal-dot--green" />
              <span className="terminal-title">sishir@portfolio: ~</span>
            </div>
            <div className="terminal-body">
              {TERMINAL_LINES.map((line) => (
                <p className="terminal-line" key={line.cmd}>
                  <span className="terminal-prompt">{line.cmd}</span>
                  <br />
                  {line.out.map((o) => (
                    <span key={o} className="terminal-out">
                      {o}
                      <br />
                    </span>
                  ))}
                </p>
              ))}
              <p className="terminal-line">
                <span className="terminal-prompt type-cursor">&gt;</span>
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
