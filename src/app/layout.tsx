import type { Metadata } from "next";
import { Orbitron, Outfit } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sishir Bharati — Developer & AI Enthusiast",
  description: "Personal portfolio of Sishir Bharati – Aspiring Developer and AI Enthusiast from Nepal.",
  openGraph: {
    title: "Sishir Bharati — Developer & AI Enthusiast",
    description: "Personal portfolio of Sishir Bharati – Aspiring Developer and AI Enthusiast from Nepal.",
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
      <body className="bg-[#050810] text-[#e2e8f0] antialiased">
        {children}
      </body>
    </html>
  );
}