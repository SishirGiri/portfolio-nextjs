'use client';

import { motion } from 'framer-motion';
import AboutSectionHead from './AboutSectionHead';
import { staggerContainer, staggerItem, inViewport } from './motion';

const FACTS = [
  { emoji: '☕', label: 'Love coding late at night' },
  { emoji: '🎮', label: 'Enjoy game development' },
  { emoji: '📈', label: 'Follow the share market' },
  { emoji: '🌍', label: 'Based in Nepal' },
  { emoji: '📚', label: 'Always learning something new' },
  { emoji: '💡', label: 'Curious about emerging tech' },
];

/** 7. Fun Facts — interactive emoji glass cards. */
export default function AboutFunFacts() {
  return (
    <section className="about-section alt">
      <div className="container">
        <AboutSectionHead number="04" title="Fun" highlight="Facts" />

        <motion.div
          className="about-fun-grid"
          variants={staggerContainer(0.09)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          {FACTS.map((f) => (
            <motion.div
              key={f.label}
              className="about-glass about-fun-card"
              variants={staggerItem}
              whileHover={{ y: -8, scale: 1.04 }}
              transition={{ duration: 0.25 }}
            >
              <span className="about-fun-emoji">{f.emoji}</span>
              <span className="about-fun-label">{f.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
