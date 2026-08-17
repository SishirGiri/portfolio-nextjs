import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects — Sishir Bharati",
  description:
    "Explore Sishir Bharati's projects — AI chatbot, terminal RPG, digit classifier, task manager, Snake Neon, Neon Drive, and more. Play the live demos.",
  openGraph: {
    title: "Projects — Sishir Bharati",
    description:
      "Explore Sishir Bharati's projects — AI chatbot, terminal RPG, digit classifier, task manager, Snake Neon, Neon Drive, and more. Play the live demos.",
  },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
