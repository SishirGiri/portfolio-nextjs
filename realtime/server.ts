/**
 * Neon Drive realtime service — WebSocket layer (spec §10).
 *
 *   npm run realtime        (tsx watch, dev)
 *   npm run realtime:start  (tsx, prod-ish)
 *
 * Runs as its own process on REALTIME_PORT (default 3001) next
 * to the Next.js app. Browsers cannot set custom headers on
 * WebSocket upgrades, so the FIRST frame must be AUTH with the
 * game session token — verified with the shared authService
 * secret (same GAME_AUTH_SECRET as the REST API).
 *
 * Responsibilities:
 *   • presence (who is online) + heartbeat
 *   • push notifications + leaderboard nudges (via pub/sub)
 *   • matchmaking + server-authoritative ghost races
 *
 * DB access: optional. Without it the service still runs
 * (presence + relay), but matches can't persist and disabled
 * accounts can't be checked — degraded, never dead.
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../src/server/services/authService';
import { realtimeLogger } from '../src/server/lib/logger';
import { getPubSub } from '../src/server/lib/pubsub';
import { createPrismaRepositories } from '../src/server/repositories/prisma';
import type { Repositories } from '../src/server/repositories/types';
import { MISSION_BY_ID } from '../src/server/gameData';
import { parseFrame, parsePlayerState, parseMatchEvent, frames, encode, type ServerFrame } from './protocol';
import { MatchmakingQueue } from './matchmaking';
import { GhostRaceMatch } from './match';

const log = realtimeLogger;
const PORT = Number(process.env.REALTIME_PORT || 3001);

// race missions eligible for matchmaking (career races only)
const RACE_MISSIONS = [...MISSION_BY_ID.values()].filter(
  (m) => !m.roam && (m.type === 'race' || m.type === 'cp-race'),
);

// ── optional database ───────────────────────────────────────
let repos: Repositories | null = null;
try {
  repos = createPrismaRepositories();
} catch (err) {
  log.warn({ err: String(err) }, 'database unavailable — realtime runs degraded (no match persistence)');
}

// ── connection bookkeeping ──────────────────────────────────
interface Session {
  ws: WebSocket;
  userId: string | null;        // null until AUTH
  username: string | null;
  isAlive: boolean;
  matchId: string | null;       // active match membership
}

const sessions = new Set<Session>();
const byUser = new Map<string, Set<Session>>();

function send(session: Session, frame: ServerFrame) {
  if (session.ws.readyState === WebSocket.OPEN) session.ws.send(encode(frame));
}

function sendToUser(userId: string, frame: ServerFrame) {
  for (const s of byUser.get(userId) ?? []) send(s, frame);
}

function broadcast(frame: ServerFrame) {
  for (const s of sessions) if (s.userId) send(s, frame);
}

function registerPresence(session: Session) {
  if (!session.userId) return;
  let set = byUser.get(session.userId);
  if (!set) {
    set = new Set();
    byUser.set(session.userId, set);
    // first connection for this user → announce
    broadcast(frames.presence(session.userId, session.username, true));
  }
  set.add(session);
}

function unregisterPresence(session: Session) {
  if (!session.userId) return;
  const set = byUser.get(session.userId);
  if (!set) return;
  set.delete(session);
  if (set.size === 0) {
    byUser.delete(session.userId);
    broadcast(frames.presence(session.userId, session.username, false));
  }
}

// ── matchmaking + matches ───────────────────────────────────
const queue = new MatchmakingQueue();
const matches = new Map<string, GhostRaceMatch>();
const matchOfSession = new Map<Session, string>();

function beginMatch(players: { userId: string; username: string; level: number; carId: string }[]) {
  const mission = RACE_MISSIONS[Math.floor(Math.random() * RACE_MISSIONS.length)] ?? [...MISSION_BY_ID.values()][0];
  const matchId = randomUUID();
  const seed = Math.floor(Math.random() * 0x7fffffff);
  const match = new GhostRaceMatch(matchId, mission.id, seed, mission.timeLimit, players);
  matches.set(matchId, match);
  const payload = {
    matchId,
    missionId: mission.id,
    seed,
    countdownMs: match.countdownMs,
    players: players.map((p) => ({ userId: p.userId, username: p.username, carId: p.carId, level: p.level })),
  };
  for (const p of players) {
    for (const s of byUser.get(p.userId) ?? []) {
      s.matchId = matchId;
      matchOfSession.set(s, matchId);
      send(s, frames.matchFound(payload));
      send(s, frames.matchCountdown(match.countdownMs));
    }
  }
}

function endMatch(match: GhostRaceMatch) {
  const results = match.results();
  for (const p of match.rosterList) {
    for (const s of byUser.get(p.userId) ?? []) {
      send(s, frames.matchFinished(results));
      s.matchId = null;
    }
  }
  for (const [session, id] of matchOfSession) {
    if (id === match.id) {
      matchOfSession.delete(session);
      session.matchId = null;
    }
  }
  matches.delete(match.id);
  if (repos) {
    (async () => {
      try {
        const rec = await repos!.matches.createMatch({ mode: 'ghost-race', missionId: match.missionId, seed: match.seed });
        await Promise.all(results.map((r, i) => repos!.matches.addParticipant({
          matchId: rec.id, userId: r.userId, position: r.position, score: r.score, finishMs: r.finishMs, carId: 'toro',
        })));
        await repos!.matches.finishMatch(rec.id);
      } catch (err) {
        log.warn({ err: String(err) }, 'match results persistence failed');
      }
    })();
  }
}

function abortMatch(match: GhostRaceMatch, reason: string) {
  for (const p of match.rosterList) {
    for (const s of byUser.get(p.userId) ?? []) send(s, frames.matchAborted(reason));
  }
  matches.delete(match.id);
  for (const [session, id] of matchOfSession) if (id === match.id) matchOfSession.delete(session);
}

// ── pub/sub fan-out (notifications, leaderboard nudges) ─────
getPubSub().subscribe((event) => {
  if (event.type === 'NOTIFICATION' && typeof event.userId === 'string') {
    sendToUser(event.userId, frames.notification(event.userId, String(event.title ?? ''), String(event.notificationType ?? '')));
  } else if (event.type === 'LEADERBOARD_UPDATED') {
    broadcast(frames.leaderboardUpdated());
  }
}).catch((err) => log.warn({ err: String(err) }, 'pubsub subscribe failed'));

// relay loop: batch positions every 100ms per match
const relayTimer = setInterval(() => {
  const now = Date.now();
  // 1. match state machine
  for (const match of [...matches.values()]) {
    const step = match.tick(now);
    if (step === 'started') {
      for (const p of match.rosterList) sendToUser(p.userId, frames.matchStarted(match.startedAt));
      log.info({ matchId: match.id, missionId: match.missionId, players: match.rosterList.length }, 'match started');
    } else if (step === 'finished') {
      endMatch(match);
    }
  }
  // 2. position relay (only to that match's members)
  for (const match of matches.values()) {
    if (match.phase !== 'racing') continue;
    const players = [...match.players.entries()]
      .filter(([, rt]) => rt.lastUpdate > 0 && rt.finishMs === null)
      .map(([userId, rt]) => ({ userId, x: rt.x, z: rt.z, h: rt.h, s: rt.s, cp: rt.cp }));
    if (players.length) {
      const frame = frames.stateUpdate(players);
      for (const p of match.rosterList) sendToUser(p.userId, frame);
    }
  }
  // 3. matchmaking pairing
  for (const formed of queue.tick(now)) beginMatch(formed.players.map((p) => ({
    userId: p.userId, username: p.username, level: p.level, carId: p.carId,
  })));
}, 100);

// ── heartbeat: probe every 30s, drop the dead ───────────────
const heartbeatTimer = setInterval(() => {
  for (const session of sessions) {
    if (!session.isAlive) {
      session.ws.terminate();
      continue;
    }
    session.isAlive = false;
    session.ws.ping();
  }
}, 30_000);

// ── HTTP health endpoint (same port) ────────────────────────
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'neon-drive-realtime',
      version: '2.0.0',
      connections: sessions.size,
      authenticated: [...byUser.keys()].length,
      queued: queue.size,
      activeMatches: matches.size,
      uptimeSec: Math.round(process.uptime()),
    }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server, maxPayload: 8 * 1024 });

wss.on('connection', (ws) => {
  const session: Session = { ws, userId: null, username: null, isAlive: true, matchId: null };
  sessions.add(session);
  let authTimer: NodeJS.Timeout | null = setTimeout(() => {
    if (!session.userId) ws.close(4001, 'auth timeout');
  }, 5_000);

  ws.on('pong', () => { session.isAlive = true; });

  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    const text = String(data);
    const frame = parseFrame(text, text.length);
    if (!frame) return; // drop malformed input silently

    // ── unauthenticated: only AUTH is allowed ──
    if (!session.userId) {
      if (frame.type !== 'AUTH') return;
      const token = frame.payload?.token;
      const payload = typeof token === 'string' ? verifyToken(token) : null;
      if (!payload) {
        send(session, frames.authError('Invalid or expired session.'));
        ws.close(4003, 'unauthorized');
        return;
      }
      // best-effort account state check (DB optional)
      (async () => {
        if (repos) {
          try {
            const user = await repos.players.findById(payload.uid);
            if (!user || user.disabled || (payload.tv ?? 0) !== user.tokenVersion) {
              send(session, frames.authError('Session revoked.'));
              ws.close(4003, 'unauthorized');
              return;
            }
            session.username = user.username;
          } catch { /* degraded mode: token-only */ }
        }
        session.userId = payload.uid;
        registerPresence(session);
        if (authTimer) { clearTimeout(authTimer); authTimer = null; }
        send(session, frames.authOk({ id: session.userId, username: session.username }));
        log.debug({ userId: session.userId }, 'socket authenticated');
      })();
      return;
    }

    switch (frame.type) {
      case 'PING':
        send(session, frames.pong());
        break;

      case 'MATCHMAKING_JOIN': {
        const carId = typeof frame.payload?.carId === 'string' ? frame.payload.carId : 'toro';
        const level = Number(frame.payload?.level ?? 0) || 0;
        if (!repos) {
          send(session, frames.error('Matchmaking unavailable — database offline.', 'degraded'));
          break;
        }
        if (session.matchId) {
          send(session, frames.error('Already in a match.', 'in_match'));
          break;
        }
        const joined = queue.join({
          userId: session.userId, username: session.username ?? 'driver', level, carId,
        });
        send(session, frames.error(joined ? 'Queued.' : 'Already queued.', joined ? undefined : 'already_queued'));
        break;
      }

      case 'MATCHMAKING_LEAVE':
        queue.leave(session.userId);
        break;

      case 'PLAYER_STATE': {
        const matchId = session.matchId;
        if (!matchId) break;
        const match = matches.get(matchId);
        if (!match) break;
        const state = parsePlayerState(frame.payload ?? {});
        if (state) match.applyState(session.userId, state);
        break;
      }

      case 'MATCH_EVENT': {
        const matchId = session.matchId;
        if (!matchId) break;
        const match = matches.get(matchId);
        if (!match) break;
        const event = parseMatchEvent(frame.payload ?? {});
        if (!event) break;
        if (event.leave !== undefined) {
          match.left(session.userId);
          session.matchId = null;
          matchOfSession.delete(session);
          break;
        }
        if (event.checkpoint !== undefined) {
          // relay to the other racers
          const relay = frames.matchEvent(session.userId, { checkpoint: event.checkpoint });
          for (const p of match.rosterList) {
            if (p.userId !== session.userId) sendToUser(p.userId, relay);
          }
        }
        if (event.finish !== undefined) {
          if (match.finish(session.userId, event.finish)) {
            const relay = frames.matchEvent(session.userId, { finish: event.finish });
            for (const p of match.rosterList) {
              if (p.userId !== session.userId) sendToUser(p.userId, relay);
            }
          }
        }
        break;
      }

      case 'MATCH_REJOIN': {
        const matchId = frame.payload?.matchId;
        if (typeof matchId !== 'string') break;
        const match = matches.get(matchId);
        if (!match || !match.players.has(session.userId)) break;
        match.markReconnected(session.userId);
        session.matchId = matchId;
        matchOfSession.set(session, matchId);
        send(session, frames.matchFound({
          matchId: match.id, missionId: match.missionId, seed: match.seed,
          countdownMs: 0, players: match.rosterList.map((p) => ({
            userId: p.userId, username: p.username, carId: p.carId, level: p.level,
          })),
        }));
        send(session, frames.matchStarted(match.startedAt));
        break;
      }
    }
  });

  ws.on('close', () => {
    sessions.delete(session);
    if (authTimer) clearTimeout(authTimer);
    if (session.userId) {
      unregisterPresence(session);
      queue.leave(session.userId);
      if (session.matchId) {
        const match = matches.get(session.matchId);
        if (match) match.markDisconnected(session.userId);
        matchOfSession.delete(session);
      }
    }
  });
});

server.listen(PORT, () => {
  log.info({ port: PORT, db: repos ? 'connected' : 'degraded' }, 'neon-drive realtime listening');
});

/** Graceful shutdown — used by tests and SIGTERM in production. */
export function shutdown() {
  clearInterval(relayTimer);
  clearInterval(heartbeatTimer);
  for (const session of sessions) session.ws.terminate();
  wss.close();
  server.close();
}

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

export { wss, server };
