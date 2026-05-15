import type { Metadata } from "next";
import { Orbitron, Outfit } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sishir Bharati \u2014 Developer & AI Enthusiast",
  description:
    "Personal portfolio of Sishir Bharati \u2013 Aspiring Developer and AI Enthusiast from Nepal.",
  openGraph: {
    title: "Sishir Bharati \u2014 Developer & AI Enthusiast",
    description:
      "Personal portfolio of Sishir Bharati \u2013 Aspiring Developer and AI Enthusiast from Nepal.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
