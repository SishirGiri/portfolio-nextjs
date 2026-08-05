'use client';

import { motion } from 'framer-motion';
import { Gamepad2, Cpu, BookOpen, Lightbulb, Trophy, Music, TrendingUp } from 'lucide-react';
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

/** Featured interest rendered as a wider, richer card spanning the grid row. */
const SHARE_MARKET = {
  icon: TrendingUp,
  label: 'Share Market',
  description:
    'I enjoy trading in the share market, analyzing market trends and company performance, and making informed decisions about when to buy and sell.',
  focus: ['Buying', 'Selling', 'Trading', 'Market Analysis'],
};

/** 8. Beyond Coding — hobbies and interests as glass cards. */
export default function AboutBeyond() {
  const ShareIcon = SHARE_MARKET.icon;
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

          {/* Featured interest — Share Market */}
          <motion.div
            className="about-glass about-beyond-card about-beyond-card--featured"
            variants={staggerItem}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.25 }}
          >
            <span className="about-beyond-icon about-beyond-icon--share">
              <ShareIcon />
            </span>
            <div className="about-beyond-body">
              <span className="about-beyond-label">{SHARE_MARKET.label}</span>
              <p className="about-beyond-desc">{SHARE_MARKET.description}</p>
              <ul className="about-beyond-focus">
                {SHARE_MARKET.focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
