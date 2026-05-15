"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Project } from "@/data/projects";

export default function ProjectAbout({ project }: { project: Project }) {
  return (
    <section className="pp-section">
      <div className="container">
        <ScrollReveal>
          <div className="pp-section-header">
            <span className="pp-section-number">01</span>
            <h2 className="pp-section-title">About <em>Project</em></h2>
            <div className="pp-section-line" />
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <div className="pp-about-grid">
            <div className="pp-about-text">
              <p>{project.overview}</p>
            </div>
            <div className="pp-about-meta">
              <div className="pp-meta-card">
                <span className="pp-meta-label">Category</span>
                <span className="pp-meta-value">{project.tags[0]}</span>
              </div>
              <div className="pp-meta-card">
                <span className="pp-meta-label">Tech Stack</span>
                <span className="pp-meta-value">{project.tech}</span>
              </div>
              <div className="pp-meta-card">
                <span className="pp-meta-label">Status</span>
                <span className="pp-meta-value pp-status-active">Active</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
