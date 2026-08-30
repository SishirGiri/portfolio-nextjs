/**
 * Neon Drive realtime protocol — v1.
 *
 * Every frame (both directions) is JSON:
 *   { v: 1, type: 'TYPE', payload?: {...} }
 *
 * All inbound frames are validated by `parseFrame` — anything
 * malformed is dropped (and counted) BEFORE it reaches the
 * match/presence logic. Outbound frames are constructed only
 * by the server through the helpers below, so the wire format
 * has exactly one definition site.
 *
 * Handshake: the FIRST client frame must be AUTH with a valid
 * session token; the socket is closed if it isn't (5s window).
 */

export const PROTOCOL_VERSION = 1;

// ── client → server ────────────────────────────────────────
export type ClientFrameType =
  | 'AUTH'            // { token }
  | 'PING'            // {} → PONG, measures RTT
  | 'MATCHMAKING_JOIN'   // { carId }
  | 'MATCHMAKING_LEAVE'  // {}
  | 'PLAYER_STATE'    // { x, z, h, s, cp } @ ~10Hz while racing
  | 'MATCH_EVENT'     // { checkpoint?: n, finish?: elapsedMs, leave?: true }
  | 'MATCH_REJOIN';   // { matchId }

// ── server → client ────────────────────────────────────────
export type ServerFrameType =
  | 'AUTH_OK'         // { user }
  | 'AUTH_ERROR'      // { message }
  | 'PONG'
  | 'ERROR'           // { message, code? }
  | 'PRESENCE'        // { userId, username?, online }
  | 'NOTIFICATION'    // { title, notificationType }
  | 'LEADERBOARD_UPDATED'
  | 'MATCH_FOUND'     // { matchId, missionId, seed, players: [{userId, username, carId, level}] }
  | 'MATCH_COUNTDOWN' // { startInMs }
  | 'MATCH_STARTED'   // { startAt }
  | 'STATE_UPDATE'    // { t, players: [{userId, x, z, h, s, cp}] }
  | 'MATCH_EVENT'     // relayed checkpoints/finishes
  | 'MATCH_FINISHED'  // { results: [{userId, username, position, score, finishMs}] }
  | 'MATCH_ABORTED';  // { reason }

export interface ClientFrame {
  v: number;
  type: ClientFrameType;
  payload?: Record<string, unknown>;
}

export interface ServerFrame {
  v: number;
  type: ServerFrameType;
  payload?: Record<string, unknown>;
}

const MAX_FRAME_BYTES = 4 * 1024; // state frames are tiny; 4KB is generous

const CLIENT_TYPES: Record<ClientFrameType, true> = {
  AUTH: true, PING: true, MATCHMAKING_JOIN: true, MATCHMAKING_LEAVE: true,
  PLAYER_STATE: true, MATCH_EVENT: true, MATCH_REJOIN: true,
};

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Validate + normalize one inbound text frame.
 * Returns null for anything that doesn't match the schema —
 * callers drop it and move on (never throw on socket input).
 */
export function parseFrame(data: unknown, byteLength = 0): ClientFrame | null {
  if (typeof data !== 'string') return null;
  if (byteLength && byteLength > MAX_FRAME_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const frame = parsed as Record<string, unknown>;
  if (frame.v !== PROTOCOL_VERSION) return null;
  if (typeof frame.type !== 'string' || !(frame.type in CLIENT_TYPES)) return null;
  const payload = (typeof frame.payload === 'object' && frame.payload !== null ? frame.payload : {}) as Record<string, unknown>;
  return { v: PROTOCOL_VERSION, type: frame.type as ClientFrameType, payload };
}

/** Extract + clamp a PLAYER_STATE payload; null if unusable. */
export function parsePlayerState(p: Record<string, unknown>): { x: number; z: number; h: number; s: number; cp: number } | null {
  const x = num(p.x), z = num(p.z), h = num(p.h), s = num(p.s);
  if (x === null || z === null || h === null || s === null) return null;
  const cp = num(p.cp) ?? 0;
  // world bounds from the game (positions are clamped ±3000 by the sanitizer)
  if (Math.abs(x) > 3000 || Math.abs(z) > 3000) return null;
  return {
    x: Math.max(-3000, Math.min(3000, x)),
    z: Math.max(-3000, Math.min(3000, z)),
    h: Math.max(-Math.PI * 4, Math.min(Math.PI * 4, h)),
    s: Math.max(0, Math.min(200, s)),
    cp: Math.max(0, Math.min(999, Math.round(cp))),
  };
}

/** Validate a MATCH_EVENT payload. */
export function parseMatchEvent(p: Record<string, unknown>): { checkpoint?: number; finish?: number; leave?: boolean } | null {
  const out: { checkpoint?: number; finish?: number; leave?: boolean } = {};
  if (p.checkpoint !== undefined) {
    const cp = num(p.checkpoint);
    if (cp === null || cp < 0 || cp > 999) return null;
    out.checkpoint = Math.round(cp);
  }
  if (p.finish !== undefined) {
    const f = num(p.finish);
    if (f === null || f < 2000 || f > 30 * 60_000) return null;
    out.finish = Math.round(f);
  }
  if (p.leave !== undefined) out.leave = p.leave === true;
  if (out.checkpoint === undefined && out.finish === undefined && out.leave === undefined) return null;
  return out;
}

/** Server frame constructors — one definition site per message. */
export const frames = {
  authOk: (user: Record<string, unknown>): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'AUTH_OK', payload: { user } }),
  authError: (message: string): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'AUTH_ERROR', payload: { message } }),
  pong: (): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'PONG' }),
  error: (message: string, code?: string): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'ERROR', payload: { message, code } }),
  presence: (userId: string, username: string | null, online: boolean): ServerFrame =>
    ({ v: PROTOCOL_VERSION, type: 'PRESENCE', payload: { userId, username, online } }),
  notification: (userId: string, title: string, notificationType: string): ServerFrame =>
    ({ v: PROTOCOL_VERSION, type: 'NOTIFICATION', payload: { userId, title, notificationType } }),
  leaderboardUpdated: (): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'LEADERBOARD_UPDATED' }),
  matchFound: (payload: Record<string, unknown>): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'MATCH_FOUND', payload }),
  matchCountdown: (startInMs: number): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'MATCH_COUNTDOWN', payload: { startInMs } }),
  matchStarted: (startAt: number): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'MATCH_STARTED', payload: { startAt } }),
  stateUpdate: (players: unknown[]): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'STATE_UPDATE', payload: { t: Date.now(), players } }),
  matchEvent: (userId: string, event: { checkpoint?: number; finish?: number }): ServerFrame =>
    ({ v: PROTOCOL_VERSION, type: 'MATCH_EVENT', payload: { userId, ...event } }),
  matchFinished: (results: unknown[]): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'MATCH_FINISHED', payload: { results } }),
  matchAborted: (reason: string): ServerFrame => ({ v: PROTOCOL_VERSION, type: 'MATCH_ABORTED', payload: { reason } }),
};

export function encode(frame: ServerFrame): string {
  return JSON.stringify(frame);
}
