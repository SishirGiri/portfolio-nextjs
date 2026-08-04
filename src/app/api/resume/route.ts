import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { auth } from '@/../auth';
import { NextResponse } from 'next/server';

/**
 * Serves the resume file ONLY to authenticated users.
 *
 * The resume lives outside `/public` (in `/private`) so it can never be
 * fetched directly by URL — the only way to reach it is through this route,
 * which requires a valid NextAuth session. `src/middleware.ts` adds a second
 * check in front of this route so even a direct hit is rejected pre-handler.
 *
 * No download is ever revealed, started, or streamed without a session.
 */
const RESUME_PATH = join(process.cwd(), 'private', 'Sishir-Bharati-Resume.png');
const FILENAME = 'Sishir-Bharati-Resume.png';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required to download the resume.' },
      { status: 401 }
    );
  }

  try {
    const file = await readFile(RESUME_PATH);
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${FILENAME}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Resume file is currently unavailable.' },
      { status: 404 }
    );
  }
}
