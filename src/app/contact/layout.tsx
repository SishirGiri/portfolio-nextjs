import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Sishir Bharati",
  description:
    "Get in touch with Sishir Bharati — have a project idea, collaboration proposal, or just want to say hello? My inbox is always open.",
  openGraph: {
    title: "Contact — Sishir Bharati",
    description:
      "Get in touch with Sishir Bharati — have a project idea, collaboration proposal, or just want to say hello? My inbox is always open.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
