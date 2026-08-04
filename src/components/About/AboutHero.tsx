'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem, inViewport } from './motion';

/** 1. Hero About — large gradient heading, mission statement, intro. */
export default function AboutHero() {
  return (
    <section className="about-hero">
      <div className="container">
        <motion.div
          variants={staggerContainer(0.12, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <motion.span variants={staggerItem} className="about-hero-badge">
            <Sparkles size={14} /> About Me
          </motion.span>

          <motion.h1 variants={staggerItem} className="about-hero-heading">
            Hello, I&apos;m Sishir.
          </motion.h1>

          <motion.p variants={staggerItem} className="about-hero-mission">
            I turn <span className="accent">curiosity</span> into{' '}
            <span className="accent">real-world solutions</span> — building software
            that solves meaningful problems.
          </motion.p>

          <motion.p variants={staggerItem} className="about-hero-intro">
            I&apos;m a developer and SEO professional driven by curiosity, creativity,
            and the desire to build things that matter. From developing modern digital
            experiences and optimizing them for search to exploring AI and vibe coding,
            I&apos;m constantly experimenting with technology, solving problems, and
            turning ideas into meaningful results.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
