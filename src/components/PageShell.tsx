'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import CustomCursor from '@/components/CustomCursor';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/**
 * Shared chrome for every page: custom cursor, navbar, footer, plus a subtle
 * fade/translate-in transition on route change and scroll-to-top on navigate.
 * The visual identity (navbar, footer, dark theme) stays identical across
 * pages because they all render through this shell.
 */
export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Trigger the enter transition whenever the route changes.
  useEffect(() => {
    setMounted(false);
    // Next frame so the "fresh" state paints before we flip to mounted.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // Scroll to top on navigation so each page starts at the hero/header.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <CustomCursor />
      <Navbar />
      <main className={`page-transition${mounted ? ' page-transition-entered' : ''}`}>
        {children}
      </main>
      <Footer />
    </>
  );
}
