import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Me — Sishir Bharati",
  description:
    "Get to know Sishir Bharati — an aspiring developer and AI enthusiast from Nepal. My story, philosophy, current focus, and what drives me to build.",
  openGraph: {
    title: "About Me — Sishir Bharati",
    description:
      "Get to know Sishir Bharati — an aspiring developer and AI enthusiast from Nepal. My story, philosophy, current focus, and what drives me to build.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
