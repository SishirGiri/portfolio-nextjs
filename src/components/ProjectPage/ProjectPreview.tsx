"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Project } from "@/data/projects";

export default function ProjectPreview({ project }: { project: Project }) {
  return (
    <section className="pp-section pp-section-alt">
      <div className="container">
        <ScrollReveal>
          <div className="pp-section-header">
            <span className="pp-section-number">04</span>
            <h2 className="pp-section-title">Project <em>Preview</em></h2>
            <div className="pp-section-line" />
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <div className="pp-preview-wrap">
            <div className="pp-preview-browser">
              <div className="pp-browser-bar">
                <span className="pp-browser-dot pp-dot-r" />
                <span className="pp-browser-dot pp-dot-y" />
                <span className="pp-browser-dot pp-dot-g" />
                <span className="pp-browser-url">{project.title} — Preview</span>
              </div>
              <div className="pp-preview-screen">
                <div className="pp-preview-placeholder">
                  <span className="pp-preview-icon">{project.icon}</span>
                  <p className="pp-preview-text">{project.previewDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
