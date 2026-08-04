'use client';

import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';

const ITEMS = [
  {
    icon: '⚡',
    title: 'Fast Communication',
    desc: 'Quick, clear replies — usually within 24 hours, every time.',
  },
  {
    icon: '💻',
    title: 'Clean Code',
    desc: 'Readable, maintainable, well-structured code built to last.',
  },
  {
    icon: '📈',
    title: 'SEO Focused',
    desc: 'Technical SEO baked in — performance, semantics, and rankings.',
  },
  {
    icon: '🚀',
    title: 'Performance Optimized',
    desc: 'Fast-loading, accessible experiences that users and bots love.',
  },
];

const card = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function WhyWorkWithMe() {
  return (
    <div className="why-section">
      <ScrollReveal direction="up">
        <div className="why-header">
          <span className="section-number">02</span>
          <h2 className="why-title">
            Why Work <em>With Me</em>?
          </h2>
        </div>
      </ScrollReveal>

      <motion.div
        className="why-grid"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      >
        {ITEMS.map((it) => (
          <motion.div key={it.title} className="why-card" variants={card}>
            <span className="why-card-icon" aria-hidden="true">{it.icon}</span>
            <h3 className="why-card-title">{it.title}</h3>
            <p className="why-card-desc">{it.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
