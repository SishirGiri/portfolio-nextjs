import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skills — Sishir Bharati",
  description:
    "The languages, tools, and technologies in Sishir Bharati's toolkit — proficiency levels, tech stack, and the workflow behind the projects.",
  openGraph: {
    title: "Skills — Sishir Bharati",
    description:
      "The languages, tools, and technologies in Sishir Bharati's toolkit — proficiency levels, tech stack, and the workflow behind the projects.",
  },
};

export default function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
