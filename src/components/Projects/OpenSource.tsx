'use client';

import { motion } from 'framer-motion';
import { FolderGit2, Package, Users, GraduationCap, Trophy } from 'lucide-react';
import { staggerContainer, staggerItem, inViewport } from '@/components/About/motion';

/**
 * §7 — Open source & community focus areas.
 * Framed honestly as focus/growth areas rather than fabricated contribution counts.
 */
const AREAS = [
  {
    icon: FolderGit2,
    title: 'GitHub Contributions',
    desc: 'Sharing code, experiments, and project builds publicly on GitHub as I learn and ship.',
  },
  {
    icon: Package,
    title: 'Open Source Projects',
    desc: 'Building real-world projects with readable, reusable code that others can explore and learn from.',
  },
  {
    icon: Users,
    title: 'Community Contributions',
    desc: 'Engaging with developer communities, sharing knowledge, and learning from open collaboration.',
  },
  {
    icon: GraduationCap,
    title: 'Learning Projects',
    desc: 'Hands-on builds across web, AI, and SEO that turn concepts into practical, working software.',
  },
  {
    icon: Trophy,
    title: 'Hackathon Projects',
    desc: 'Rapid prototyping and creative problem-solving under time constraints to push my limits.',
  },
  {
    icon: Trophy,
    title: 'Experimentation',
    desc: 'Exploring new tools, AI workflows, and modern development practices through side builds.',
  },
];

export default function OpenSource() {
  return (
    <motion.div
      className="proj-os-grid"
      variants={staggerContainer(0.08)}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      {AREAS.map((a) => {
        const Icon = a.icon;
        return (
          <motion.div key={a.title} className="proj-os-card" variants={staggerItem}>
            <span className="proj-os-icon">
              <Icon />
            </span>
            <h3 className="proj-os-title">{a.title}</h3>
            <p className="proj-os-desc">{a.desc}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
