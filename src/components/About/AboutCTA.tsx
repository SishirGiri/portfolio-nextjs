'use client';

import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { scaleIn, staggerContainer, staggerItem, inViewport } from './motion';

/** 10. Call to Action — large glass card with Contact Me + View Projects. */
export default function AboutCTA() {
  return (
    <section className="about-section">
      <div className="container">
        <motion.div
          className="about-glass about-cta-wrap"
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
          >
            <motion.div variants={staggerItem} className="about-cta-eyebrow">
              Let&apos;s Connect
            </motion.div>
            <motion.h2 variants={staggerItem} className="about-cta-title">
              Let&apos;s build something amazing together.
            </motion.h2>
            <motion.p variants={staggerItem} className="about-cta-desc">
              I&apos;m open to opportunities, collaboration, and great conversations.
              Whether you have a project in mind or just want to talk tech, I&apos;d
              love to hear from you.
            </motion.p>
            <motion.div
              variants={staggerItem}
              className="about-cta-actions"
            >
              <a
                href="/contact"
                className="btn btn-primary"
              >
                <Mail size={16} /> Contact Me
              </a>
              <a href="/projects" className="btn btn-ghost">
                View Projects <ArrowRight size={16} />
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
