'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, Lock, ArrowRight } from 'lucide-react';
import type { Project } from '@/data/projects';
import { staggerItem } from '@/components/About/motion';
import TiltCard from '@/components/Skills/TiltCard';
import { GitHubIcon } from './icons';

/**
 * §3 — Premium project card.
 *
 * - Whole card tilts on hover (TiltCard) and opens the quick-preview modal on click.
 * - Action buttons (Live / GitHub / Case Study) call stopPropagation so they
 *   navigate independently of the modal trigger.
 */
export default function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: (p: Project) => void;
}) {
  const hasDemo = project.demoUrl && project.demoUrl !== '#';
  const internalDemo = hasDemo && project.demoUrl.startsWith('/');
  const isPrivate = project.isPrivate || !project.githubUrl || project.githubUrl === '#';
  const techBadges = project.techBadges ?? project.tech.split('·').map((t) => t.trim());

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <motion.article
      variants={staggerItem}
      className="proj-card"
      onClick={() => onOpen(project)}
      tabIndex={0}
      role="button"
      aria-label={`Preview ${project.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project);
        }
      }}
    >
      <TiltCard className="proj-card-tilt" max={6}>
        {/* Media */}
        <div className="proj-card-media">
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt={`${project.title} preview`}
              width={600}
              height={340}
              unoptimized
              className="proj-card-img"
            />
          ) : (
            <span className="proj-card-emoji">{project.icon}</span>
          )}
          <span className="proj-card-overlay" />
          {project.featured && (
            <span className="proj-card-featured">★ Featured</span>
          )}
          <span className="proj-card-cat">{project.category}</span>
        </div>

        {/* Body */}
        <div className="proj-card-body">
          <h3 className="proj-card-title">{project.title}</h3>
          <p className="proj-card-desc">{project.description}</p>

          <div className="proj-card-tech">
            {techBadges.slice(0, 4).map((t) => (
              <span key={t} className="proj-tech-badge">{t}</span>
            ))}
          </div>

          <div className="proj-card-meta">
            <span>{project.date}</span>
            <span className="dot">•</span>
            <span>{project.status}</span>
            <span className="dot">•</span>
            <span>{project.difficulty}</span>
          </div>

          <div className="proj-card-actions" onClick={stop}>
            {hasDemo &&
              (internalDemo ? (
                <Link href={project.demoUrl} className="proj-btn primary" title="Live Demo">
                  <ExternalLink /> Live
                </Link>
              ) : (
                <a
                  href={project.demoUrl}
                  className="proj-btn primary"
                  title="Live Demo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink /> Live
                </a>
              ))}

            {isPrivate ? (
              <span className="proj-card-private" title="Private repository">
                <Lock /> Private Repository
              </span>
            ) : (
              <a
                href={project.githubUrl}
                className="proj-btn"
                title="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon /> Code
              </a>
            )}

            <Link
              href={`/projects/${project.slug}`}
              className="proj-btn ghost"
              title="Case study"
              style={{ marginLeft: 'auto' }}
            >
              Case Study <ArrowRight />
            </Link>
          </div>
        </div>
      </TiltCard>
    </motion.article>
  );
}
