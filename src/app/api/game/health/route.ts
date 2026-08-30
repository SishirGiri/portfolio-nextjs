import { NextResponse } from 'next/server';
import { prisma, isDbError } from '@/server/db';
import { getKV } from '@/server/lib/kv';

export const dynamic = 'force-dynamic';

const BOOTED_AT = Date.now();
const VERSION = '2.0.0';

/**
 * GET /api/game/health — v2 liveness + dependency probes.
 * The game client pings this to decide whether cloud features
 * are available; { database: false } → the client plays on,
 * purely local. Also reports cache backend, realtime reachability,
 * version and uptime for monitoring dashboards.
 */
export async function GET() {
  const base = {
    version: VERSION,
    uptimeSec: Math.round((Date.now() - BOOTED_AT) / 1000),
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    const kv = getKV();
    const cacheOk = await kv.ping();

    // realtime probe (optional — unknown when not configured)
    let realtime: 'up' | 'down' | 'unknown' = 'unknown';
    const realtimeUrl = process.env.REALTIME_HEALTH_URL;
    if (realtimeUrl) {
      try {
        const res = await fetch(realtimeUrl, { signal: AbortSignal.timeout(1500) });
        realtime = res.ok ? 'up' : 'down';
      } catch {
        realtime = 'down';
      }
    }

    return NextResponse.json(
      { status: 'ok', database: true, cache: kv.kind, cacheOk, realtime, ...base },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (isDbError(err)) {
      return NextResponse.json(
        { status: 'degraded', database: false, ...base, error: 'Database unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    throw err;
  }
}
