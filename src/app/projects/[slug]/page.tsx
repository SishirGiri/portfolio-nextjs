import { notFound } from "next/navigation";
import { projects, getProjectBySlug } from "@/data/projects";
import ProjectPageClient from "./ProjectPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return { title: "Project Not Found" };
  return {
    title: `${project.title} — Sishir Bharati`,
    description: project.description,
  };
}

export default async function ProjectPageRoute({ params }: Props) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  return <ProjectPageClient project={project} />;
}
