"use client";

import dynamic from "next/dynamic";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ProjectCard from "./ProjectCard";
import { projects } from "@/data/projects";

const ProjectsBg = dynamic(() => import("./ProjectsBg"), { ssr: false });

export default function ProjectsSection() {
  return (
    <section id="projects" className="section projects">
      <ProjectsBg />
      <div className="container">
        <ScrollReveal>
          <div className="section-header">
            <span className="section-number">02</span>
            <h2 className="section-title">
              Featured <em>Projects</em>
            </h2>
            <div className="section-line" />
          </div>
        </ScrollReveal>

        <div className="projects-grid">
          {projects.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
