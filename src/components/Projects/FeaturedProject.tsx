'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight } from 'lucide-react';
import type { Project } from '@/data/projects';
import { fadeIn, inViewport } from '@/components/About/motion';
import { GitHubIcon } from './icons';

/** §4 — Large featured project showcase banner. */
export default function FeaturedProject({ project }: { project: Project }) {
  return (
    <motion.div
      className="proj-featured"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={inViewport}
    >
      <div className="proj-featured-media">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={`${project.title} banner`}
            fill
            unoptimized
            className="proj-featured-img"
          />
        ) : (
          <span className="proj-featured-emoji">{project.icon}</span>
        )}
      </div>

      <div className="proj-featured-body">
        <span className="proj-featured-tag">★ Featured Project</span>
        <h3 className="proj-featured-title">{project.title}</h3>
        <p className="proj-featured-desc">{project.previewDescription}</p>

        {project.highlights && (
          <ul className="proj-featured-highlights">
            {project.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}

        <div className="proj-featured-tech">
          {project.techStack.slice(0, 6).map((t) => (
            <span key={t.name} className="proj-tech-badge">
              {t.name}
            </span>
          ))}
        </div>

        <div className="proj-featured-actions">
          {project.demoUrl && project.demoUrl !== '#' &&
            (project.demoUrl.startsWith('/') ? (
              <Link href={project.demoUrl} className="proj-btn primary">
                <ExternalLink /> Live Demo
              </Link>
            ) : (
              <a
                href={project.demoUrl}
                className="proj-btn primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink /> Live Demo
              </a>
            ))}

          {!project.isPrivate && project.githubUrl && project.githubUrl !== '#' && (
            <a
              href={project.githubUrl}
              className="proj-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon /> GitHub
              </a>
            )}

          <Link href={`/projects/${project.slug}`} className="proj-btn ghost">
            Case Study <ArrowRight />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
