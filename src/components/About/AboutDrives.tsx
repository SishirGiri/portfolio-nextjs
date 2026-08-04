'use client';

import { motion } from 'framer-motion';
import {
  Rocket,
  Gauge,
  FlaskConical,
  Palette,
  GraduationCap,
  Target,
} from 'lucide-react';
import AboutSectionHead from './AboutSectionHead';
import {
  fadeIn,
  staggerContainer,
  staggerItem,
  inViewport,
} from './motion';

const DRIVES = [
  {
    icon: Rocket,
    title: 'Build',
    desc: 'Turn ideas into real digital products.',
  },
  {
    icon: Gauge,
    title: 'Optimize',
    desc: 'Improve performance, SEO, usability, and results.',
  },
  {
    icon: FlaskConical,
    title: 'Experiment',
    desc: 'Explore new technologies and AI-powered development workflows.',
  },
  {
    icon: Palette,
    title: 'Create',
    desc: 'Combine code, creativity, and technology to build meaningful experiences.',
  },
  {
    icon: GraduationCap,
    title: 'Learn',
    desc: 'Stay curious and continuously develop new skills.',
  },
  {
    icon: Target,
    title: 'Solve',
    desc: 'Focus on solving real problems rather than simply writing code.',
  },
];

/** 5. What Drives Me — hero statement, principle cards, and closing philosophy. */
export default function AboutDrives() {
  return (
    <section className="about-section alt">
      <div className="container">
        <AboutSectionHead number="02" title="What" highlight="Drives Me" />

        {/* Hero statement + supporting message */}
        <motion.div
          className="about-drives-hero"
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          <p className="about-drives-quote">
            &ldquo;I don&apos;t just write code — I{' '}
            <span className="hl">explore ideas</span>, experiment with
            technology, and turn concepts into useful digital
            experiences.&rdquo;
          </p>
          <p className="about-drives-support">
            I&apos;m driven by curiosity and the challenge of turning an idea
            into something real. Whether I&apos;m optimizing a website for
            search engines, building a web application, experimenting with AI,
            or using vibe coding to rapidly bring an idea to life, I enjoy
            learning, creating, and continuously improving.
          </p>
        </motion.div>

        {/* Principle cards */}
        <motion.div
          className="about-grid-3"
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          {DRIVES.map((d) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={d.title}
                className="about-glass about-drive-card"
                variants={staggerItem}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <span className="about-drive-icon">
                  <Icon />
                </span>
                <h3 className="about-drive-title">{d.title}</h3>
                <p className="about-drive-desc">{d.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Closing personal philosophy */}
        <motion.div
          className="about-glass about-drives-closing"
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          <p className="about-drives-closing-text">
            For me, technology is about more than code. It&apos;s about{' '}
            <span className="hl">curiosity, creativity, experimentation</span>,
            and building something that genuinely serves a purpose.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
