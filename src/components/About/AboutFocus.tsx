'use client';

import { motion } from 'framer-motion';
import {
  Search,
  Code2,
  Sparkles,
  Bot,
  Cpu,
  BarChart3,
  Infinity as InfinityIcon,
} from 'lucide-react';
import AboutSectionHead from './AboutSectionHead';
import { staggerContainer, staggerItem, inViewport } from './motion';

const FOCUS = [
  {
    num: '01',
    title: 'SEO & Organic Growth',
    desc: 'Improving search visibility, keyword rankings, organic traffic, technical SEO, on-page optimization, and website performance.',
    icon: Search,
  },
  {
    num: '02',
    title: 'Web Development',
    desc: 'Building modern, responsive, fast, accessible, and user-friendly websites and web applications.',
    icon: Code2,
  },
  {
    num: '03',
    title: 'Vibe Coding',
    desc: 'Exploring the modern approach of building software through AI-assisted coding, rapid experimentation, creative problem-solving, and turning ideas into functional products quickly.',
    icon: Sparkles,
  },
  {
    num: '04',
    title: 'AI & Automation',
    desc: 'Exploring AI tools, AI-assisted development, automation, APIs, and intelligent workflows to build smarter and more efficient solutions.',
    icon: Bot,
  },
  {
    num: '05',
    title: 'Programming & Problem Solving',
    desc: 'Strengthening programming skills through real-world projects, experimentation, debugging, and solving practical technical problems.',
    icon: Cpu,
  },
  {
    num: '06',
    title: 'Data & Optimization',
    desc: 'Using analytics, performance data, search insights, and user behavior to continuously improve digital products and websites.',
    icon: BarChart3,
  },
  {
    num: '07',
    title: 'Continuous Learning',
    desc: 'Keeping up with emerging technologies, SEO trends, AI development, programming techniques, and modern approaches to building digital products.',
    icon: InfinityIcon,
  },
];

/** 6. Current Focus — 7 numbered glass cards with icons. */
export default function AboutFocus() {
  return (
    <section className="about-section">
      <div className="container">
        <AboutSectionHead number="03" title="Current" highlight="Focus" />

        <motion.div
          className="about-focus-grid focus-grid-7"
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          {FOCUS.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.num}
                className="about-glass about-focus-card"
                variants={staggerItem}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <div className="about-focus-top">
                  <span className="about-focus-icon">
                    <Icon />
                  </span>
                  <span className="about-focus-num">{f.num}</span>
                </div>
                <h3 className="about-focus-title">{f.title}</h3>
                <p className="about-focus-desc">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
