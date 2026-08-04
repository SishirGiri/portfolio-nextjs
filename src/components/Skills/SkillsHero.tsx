'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem, inViewport } from '@/components/About/motion';

const TITLE = ['My', 'Skills', '&', 'Expertise'];

/** §1 — Animated hero with badge, staggered title, intro, and scroll indicator. */
export default function SkillsHero() {
  return (
    <section className="skills-hero">
      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={inViewport}
      >
        <motion.span className="skills-hero-badge" variants={staggerItem}>
          <Sparkles />
          Skills &amp; Expertise
        </motion.span>

        <motion.h1 className="skills-hero-title" aria-label="My Skills & Expertise">
          {TITLE.map((word, i) => (
            <motion.span key={i} variants={staggerItem} style={{ display: 'inline-block', marginRight: '0.25em' }}>
              {i === 1 ? <em>{word}</em> : word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p className="skills-hero-sub" variants={staggerItem}>
          A collection of the technologies, tools, and expertise I use to build
          modern web applications and optimize websites for performance and
          search visibility.
        </motion.p>

        <motion.div className="skills-scroll" variants={staggerItem}>
          <span>Scroll</span>
          <span className="skills-scroll-mouse" aria-hidden="true" />
        </motion.div>
      </motion.div>
    </section>
  );
}
