'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Client-side session provider so components (e.g. the resume download
 * button) can read whether the visitor is already signed in.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
