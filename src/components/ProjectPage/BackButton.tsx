"use client";

import Link from "next/link";

export default function BackButton() {
  return (
    <Link href="/#projects" className="pp-back">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back to Portfolio
    </Link>
  );
}
