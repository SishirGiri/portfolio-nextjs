'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, FileDown } from 'lucide-react';
import { scaleIn, inViewport } from '@/components/About/motion';
import { GitHubIcon } from './icons';

/** §8 — Closing call-to-action glass card. */
export default function ProjectsCTA() {
  return (
    <motion.div
      className="proj-cta"
      variants={scaleIn}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      <h2 className="proj-cta-title">Interested in working together?</h2>
      <p className="proj-cta-sub">
        I&apos;m always open to discussing new projects, creative ideas, or
        opportunities to be part of your vision.
      </p>
      <div className="proj-cta-actions">
        <Link href="/contact" className="proj-btn primary">
          <Mail /> Contact Me
        </Link>
        <a
          href="https://github.com/YOUR_USERNAME"
          className="proj-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitHubIcon /> View GitHub
        </a>
        <Link href="/about" className="proj-btn ghost">
          <FileDown /> Download Resume
        </Link>
      </div>
    </motion.div>
  );
}
