export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-logo">
            <span className="logo-bracket">[</span>SB
            <span className="logo-bracket">]</span>
          </div>
          <p className="footer-copy">
            &copy; 2025 <strong>Sishir Bharati</strong>. Crafted with passion
            from Pokhara, Nepal.
          </p>
          <div className="footer-links">
            <a href="#hero">Top</a>
            <a href="#about">About</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
        <div className="footer-bar">
          <span className="footer-status">
            <span className="pulse-dot" /> Available for work
          </span>
          <span className="footer-tech">Built with Next.js + Three.js</span>
        </div>
      </div>
    </footer>
  );
}
