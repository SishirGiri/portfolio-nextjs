'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { name: 'About', href: '/about' },
  { name: 'Projects', href: '/projects' },
  { name: 'Skills', href: '/skills' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Scroll style only matters on the home page (full-height hero). On inner
  // pages the navbar should always read as "scrolled" so the glass background
  // is visible against the content immediately.
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const closeMobile = () => setIsMobileMenuOpen(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className={`navbar ${isScrolled || !isHome ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Link
            href="/"
            className={`nav-logo${isHome ? ' active' : ''}`}
            aria-current={isHome ? 'page' : undefined}
            onClick={closeMobile}
          >
            <span className="logo-bracket">[</span>SB<span className="logo-bracket">]</span>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <ul className="nav-links desktop-nav">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={`nav-link${isActive(link.href) ? ' active' : ''}`}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile Menu Button - Hidden on desktop */}
          <button
            className={`hamburger${isMobileMenuOpen ? ' open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay - Only shown when open */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-links">
          {navLinks.map((link) => (
            <li key={link.name}>
              <Link
                href={link.href}
                className={`nav-link${isActive(link.href) ? ' active' : ''}`}
                aria-current={isActive(link.href) ? 'page' : undefined}
                onClick={closeMobile}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
