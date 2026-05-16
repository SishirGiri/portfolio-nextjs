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
  title: "NeuroBot AI - Build Smarter with AI Automation",
  description: "AI-powered chatbot and enterprise automation platform. Build smarter with NeuroBot AI's advanced NLP processing and smart automation solutions.",
  openGraph: {
    title: "NeuroBot AI - Build Smarter with AI Automation",
    description: "AI-powered chatbot and enterprise automation platform",
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
      <body className="bg-[#0B1020] text-[#E5E7EB] antialiased">
        {children}
      </body>
    </html>
  );
}