'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem, inViewport } from '@/components/About/motion';

const TITLE = ['Featured', 'Projects'];

/** §1 — Animated hero with badge, staggered title, intro, scroll indicator. */
export default function ProjectsHero() {
  return (
    <section className="proj-hero">
      <motion.div
        variants={staggerContainer(0.14)}
        initial="hidden"
        whileInView="visible"
        viewport={inViewport}
      >
        <motion.span className="proj-hero-badge" variants={staggerItem}>
          <Sparkles />
          Portfolio Showcase
        </motion.span>

        <motion.h1 className="proj-hero-title" aria-label="Featured Projects">
          {TITLE.map((word, i) => (
            <motion.span
              key={i}
              variants={staggerItem}
              style={{ display: 'inline-block', marginRight: '0.25em' }}
            >
              {i === 1 ? <em>{word}</em> : word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p className="proj-hero-sub" variants={staggerItem}>
          &ldquo;A collection of real-world projects showcasing my experience in
          Software Development, SEO, Artificial Intelligence, and modern web
          technologies.&rdquo;
        </motion.p>

        <motion.div className="proj-scroll" variants={staggerItem}>
          <span>Scroll</span>
          <span className="proj-scroll-mouse" aria-hidden="true" />
        </motion.div>
      </motion.div>
    </section>
  );
}
