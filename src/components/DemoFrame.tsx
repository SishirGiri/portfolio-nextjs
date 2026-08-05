'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Full-bleed wrapper for the standalone HTML/CSS/JS demos that live under
 * `public/demos/<name>/index.html`. Each demo runs inside a sandboxed iframe
 * so its globals (e.g. TensorFlow.js `tf`), CSS, and DOM can't leak into the
 * portfolio or other demos. A floating "Back to portfolio" pill provides the
 * only chrome, keeping the portfolio's visual language without constraining
 * the demo's layout.
 */
export default function DemoFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset scroll on mount so the page never opens scrolled down.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Give the iframe keyboard focus once loaded so games that listen for
  // keydown inside the iframe receive input without requiring a click first.
  useEffect(() => {
    if (loaded) iframeRef.current?.focus();
  }, [loaded]);

  return (
    <div className="demo-frame">
      <Link href="/projects" className="demo-back" aria-label="Back to portfolio">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to portfolio
      </Link>
      {!loaded && (
        <div className="demo-loader" role="status" aria-live="polite">
          <div className="demo-loader-dot" />
          <span>Loading {title}&hellip;</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        tabIndex={0}
        className={`demo-iframe${loaded ? ' loaded' : ''}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />
    </div>
  );
}
