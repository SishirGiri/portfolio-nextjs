"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/Hero/HeroSection";
import AboutSection from "@/components/About/AboutSection";
import ProjectsSection from "@/components/Projects/ProjectsSection";
import SkillsSection from "@/components/Skills/SkillsSection";
import ContactSection from "@/components/Contact/ContactSection";
import Footer from "@/components/Footer";

const CustomCursor = dynamic(() => import("@/components/CustomCursor"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <ProjectsSection />
        <SkillsSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
