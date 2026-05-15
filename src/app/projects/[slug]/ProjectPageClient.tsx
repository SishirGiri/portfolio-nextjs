"use client";

import type { Project } from "@/data/projects";
import BackButton from "@/components/ProjectPage/BackButton";
import ProjectHero from "@/components/ProjectPage/ProjectHero";
import ProjectAbout from "@/components/ProjectPage/ProjectAbout";
import ProjectFeatures from "@/components/ProjectPage/ProjectFeatures";
import ProjectTechStack from "@/components/ProjectPage/ProjectTechStack";
import ProjectPreview from "@/components/ProjectPage/ProjectPreview";
import ProjectLinks from "@/components/ProjectPage/ProjectLinks";

export default function ProjectPageClient({ project }: { project: Project }) {
  return (
    <main className="pp-page">
      <div className="pp-nav-bar">
        <div className="container pp-nav-inner">
          <BackButton />
          <span className="pp-nav-project">{project.icon} {project.title}</span>
        </div>
      </div>
      <ProjectHero project={project} />
      <ProjectAbout project={project} />
      <ProjectFeatures project={project} />
      <ProjectTechStack project={project} />
      <ProjectPreview project={project} />
      <ProjectLinks project={project} />
      <div className="container pp-bottom-back">
        <BackButton />
      </div>
    </main>
  );
}
