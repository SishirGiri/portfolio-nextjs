'use client';

import { motion } from 'framer-motion';
import { Gamepad2, Cpu, BookOpen, Lightbulb, Trophy, Music } from 'lucide-react';
import AboutSectionHead from './AboutSectionHead';
import { staggerContainer, staggerItem, inViewport } from './motion';

const HOBBIES = [
  { icon: Gamepad2, label: 'Gaming' },
  { icon: Cpu, label: 'Technology' },
  { icon: BookOpen, label: 'Reading about AI' },
  { icon: Lightbulb, label: 'Exploring new ideas' },
  { icon: Trophy, label: 'Football' },
  { icon: Music, label: 'Music' },
];

/** 8. Beyond Coding — hobbies and interests as glass cards. */
export default function AboutBeyond() {
  return (
    <section className="about-section">
      <div className="container">
        <AboutSectionHead number="05" title="Beyond" highlight="Coding" />

        <motion.div
          className="about-beyond-grid"
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          {HOBBIES.map((h) => {
            const Icon = h.icon;
            return (
              <motion.div
                key={h.label}
                className="about-glass about-beyond-card"
                variants={staggerItem}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.25 }}
              >
                <span className="about-beyond-icon">
                  <Icon />
                </span>
                <span className="about-beyond-label">{h.label}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
