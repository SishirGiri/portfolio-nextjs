'use client';

import { motion } from 'framer-motion';
import { MapPin, GraduationCap, Globe, Briefcase } from 'lucide-react';
import AboutSectionHead from './AboutSectionHead';
import { staggerContainer, staggerItem, inViewport } from './motion';

type Fact = {
  icon: typeof MapPin;
  label: string;
  value: string;
  title?: string;
};

const FACTS: Fact[] = [
  { icon: MapPin, label: 'Location', value: 'Pokhara, Nepal' },
  { icon: GraduationCap, label: 'Education', value: 'Computer Science' },
  { icon: Globe, label: 'Languages', value: 'Nepali · English · Hindi', title: 'Nepali (Native) · English (Fluent) · Hindi (Professional) · German (Basic) · Korean (Basic)' },
  { icon: Briefcase, label: 'Open to', value: 'Collaboration' },
];

/** 9. Quick Facts — compact glass cards. */
export default function AboutQuickFacts() {
  return (
    <section className="about-section alt">
      <div className="container">
        <AboutSectionHead number="06" title="Quick" highlight="Facts" />

        <motion.div
          className="about-quick-grid"
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          {FACTS.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                className="about-glass about-quick-card"
                variants={staggerItem}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <span className="about-quick-icon">
                  <Icon />
                </span>
                <div className="about-quick-label">{f.label}</div>
                <div className="about-quick-value" title={f.title}>{f.value}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
