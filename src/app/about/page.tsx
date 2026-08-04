'use client';

import PageShell from '@/components/PageShell';
import AboutBackground from '@/components/About/AboutBackground';
import AboutHero from '@/components/About/AboutHero';
import AboutProfile from '@/components/About/AboutProfile';
import AboutStory from '@/components/About/AboutStory';
import AboutPhilosophy from '@/components/About/AboutPhilosophy';
import AboutDrives from '@/components/About/AboutDrives';
import AboutFocus from '@/components/About/AboutFocus';
import AboutFunFacts from '@/components/About/AboutFunFacts';
import AboutBeyond from '@/components/About/AboutBeyond';
import AboutQuickFacts from '@/components/About/AboutQuickFacts';
import AboutCTA from '@/components/About/AboutCTA';

export default function AboutPage() {
  return (
    <PageShell>
      <div className="about-page">
        <AboutBackground />
        <div className="about-content">
          <AboutHero />
          <AboutProfile />
          <AboutStory />
          <AboutPhilosophy />
          <AboutDrives />
          <AboutFocus />
          <AboutFunFacts />
          <AboutBeyond />
          <AboutQuickFacts />
          <AboutCTA />
        </div>
      </div>
    </PageShell>
  );
}
