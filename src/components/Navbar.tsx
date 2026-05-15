"use client";

import { useState, useEffect } from "react";
import { NAV_LINKS } from "@/lib/constants";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = ["about", "projects", "skills", "contact"];
      let active = "";
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) active = id;
      }
      setActiveSection(active);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        <a
          href="#hero"
          className="nav-logo"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick("#hero");
          }}
        >
          <span className="logo-bracket">[</span>SB
          <span className="logo-bracket">]</span>
        </a>

        <ul className={`nav-links${menuOpen ? " open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <li key={link.section}>
              <a
                href={link.href}
                className={`nav-link${activeSection === link.section ? " active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          className={`hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
