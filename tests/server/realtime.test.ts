import { describe, expect, it } from 'vitest';
import {
  parseFrame, parsePlayerState, parseMatchEvent, frames, encode, PROTOCOL_VERSION,
} from '../../realtime/protocol';
import { MatchmakingQueue } from '../../realtime/matchmaking';
import { GhostRaceMatch } from '../../realtime/match';

describe('protocol validation (spec §10: validate all inbound frames)', () => {
  it('accepts well-formed frames and rejects garbage', () => {
    const good = parseFrame(JSON.stringify({ v: 1, type: 'PING' }));
    expect(good?.type).toBe('PING');
    expect(parseFrame('not json')).toBeNull();
    expect(parseFrame('42')).toBeNull();
    expect(parseFrame(JSON.stringify({ v: 2, type: 'PING' }))).toBeNull();          // wrong version
    expect(parseFrame(JSON.stringify({ v: 1, type: 'EXPLODE' }))).toBeNull();       // unknown type
    expect(parseFrame(JSON.stringify({ v: 1, type: 'AUTH' }), 10_000)).toBeNull();  // oversize
  });

  it('clamps and bounds player state', () => {
    const ok = parsePlayerState({ x: 10, z: -20, h: 1.5, s: 40, cp: 3 });
    expect(ok).toEqual({ x: 10, z: -20, h: 1.5, s: 40, cp: 3 });
    expect(parsePlayerState({ x: 'NaN', z: 0, h: 0, s: 0 })).toBeNull();
    expect(parsePlayerState({ x: 10_000, z: 0, h: 0, s: 0 })).toBeNull();           // out of world
    const clamped = parsePlayerState({ x: 0, z: 0, h: 0, s: 10_000 });
    expect(clamped?.s).toBe(200);                                                   // speed ceiling
  });

  it('validates match events', () => {
    expect(parseMatchEvent({ checkpoint: 4 })?.checkpoint).toBe(4);
    expect(parseMatchEvent({ finish: 65_000 })?.finish).toBe(65_000);
    expect(parseMatchEvent({ finish: 50 })).toBeNull();      // implausibly fast
    expect(parseMatchEvent({})).toBeNull();                  // empty
    expect(parseMatchEvent({ leave: true })?.leave).toBe(true);
  });

  it('server frames encode with the protocol version', () => {
    expect(JSON.parse(encode(frames.pong())).v).toBe(PROTOCOL_VERSION);
  });
});

describe('matchmaking pairing', () => {
  it('pairs similar levels immediately', () => {
    const q = new MatchmakingQueue();
    q.join({ userId: 'a', username: 'a', level: 5, carId: 'toro' });
    q.join({ userId: 'b', username: 'b', level: 6, carId: 'vela' });
    const out = q.tick();
    expect(out).toHaveLength(1);
    expect(out[0].players.map((p) => p.userId).sort()).toEqual(['a', 'b']);
    expect(q.size).toBe(0);
  });

  it('holds far-apart levels until the window widens', () => {
    const q = new MatchmakingQueue();
    q.join({ userId: 'a', username: 'a', level: 2, carId: 'toro' });
    q.join({ userId: 'b', username: 'b', level: 12, carId: 'toro' });
    expect(q.tick(Date.now())).toHaveLength(0);
    // 60s later the window has grown by 12 → eligible
    const out = q.tick(Date.now() + 60_000);
    expect(out).toHaveLength(1);
  });

  it('pairs within the base window, locks impatient pairs beyond it', () => {
    const t0 = Date.now();
    // ±3 window: 5 and 6 pair immediately
    const q = new MatchmakingQueue();
    q.join({ userId: 'a', username: 'a', level: 5, carId: 'toro' });
    q.join({ userId: 'b', username: 'b', level: 6, carId: 'toro' });
    expect(q.tick(t0)).toHaveLength(1);

    // 5 vs 9 is outside ±3 — held until the window widens / impatience
    const q2 = new MatchmakingQueue();
    q2.join({ userId: 'a', username: 'a', level: 5, carId: 'toro' });
    q2.join({ userId: 'b', username: 'b', level: 9, carId: 'toro' });
    expect(q2.tick(t0)).toHaveLength(0);
    expect(q2.tick(t0 + 25_000)).toHaveLength(1);       // impatient → paired
  });

  it('caps groups at 4 and dedupes joins', () => {
    const q = new MatchmakingQueue();
    expect(q.join({ userId: 'a', username: 'a', level: 1, carId: 'toro' })).toBe(true);
    expect(q.join({ userId: 'a', username: 'a', level: 1, carId: 'toro' })).toBe(false);
    for (const id of ['b', 'c', 'd', 'e']) q.join({ userId: id, username: id, level: 1, carId: 'toro' });
    const out = q.tick(Date.now() + 25_000);
    expect(out[0].players).toHaveLength(4);
    expect(q.size).toBe(1); // the 5th waits for the next group
  });

  it('leave removes a queued player', () => {
    const q = new MatchmakingQueue();
    q.join({ userId: 'x', username: 'x', level: 3, carId: 'toro' });
    expect(q.leave('x')).toBe(true);
    expect(q.leave('x')).toBe(false);
    expect(q.size).toBe(0);
  });
});

describe('ghost race match state machine', () => {
  const roster = [
    { userId: 'a', username: 'alice', carId: 'toro', level: 5 },
    { userId: 'b', username: 'bob', carId: 'vela', level: 6 },
  ];

  function makeMatch(clock = 1_000_000) {
    return new GhostRaceMatch('m1', 'checkpoint-race', 42, 120, roster, clock);
  }

  it('counts down, starts, and rejects early state', () => {
    const t0 = 1_000_000;
    const m = makeMatch(t0);
    expect(m.phase).toBe('countdown');
    expect(m.applyState('a', { x: 0, z: 0, h: 0, s: 10, cp: 0 }, t0 + 500)).toBe(false);
    expect(m.tick(t0 + 3_999)).toBeNull();
    expect(m.tick(t0 + 4_000)).toBe('started');
    expect(m.phase).toBe('racing');
  });

  it('relays sane movement and drops teleports', () => {
    const t0 = 1_000_000;
    const m = makeMatch(t0);
    m.tick(t0 + 4_000);
    const t = t0 + 5_000;
    expect(m.applyState('a', { x: 0, z: 0, h: 0, s: 30, cp: 0 }, t)).toBe(true);
    // 500m in 1s is impossible → dropped
    expect(m.applyState('a', { x: 500, z: 0, h: 0, s: 30, cp: 1 }, t + 1_000)).toBe(false);
    // 40m in 1s is fine
    expect(m.applyState('a', { x: 40, z: 0, h: 1, s: 40, cp: 1 }, t + 2_000)).toBe(true);
  });

  it('finishes players in order with server-computed scores', () => {
    const t0 = 1_000_000;
    const m = makeMatch(t0);
    m.tick(t0 + 4_000);
    expect(m.finish('b', 50_000)).toBe(true);
    expect(m.finish('b', 40_000)).toBe(false);       // can't finish twice
    expect(m.finish('a', 1_200)).toBe(false);        // below the 2s floor → rejected
    expect(m.finish('a', 62_000)).toBe(true);
    expect(m.tick(t0 + 70_000)).toBe('finished');
    const results = m.results();
    expect(results[0].userId).toBe('b');
    expect(results[0].position).toBe(1);
    expect(results[0].finishMs).toBe(50_000);
    expect(results[0].score).toBeGreaterThan(0);     // computeScore-derived
    expect(results[1].position).toBe(2);
  });

  it('DNFs disconnected players after the grace window', () => {
    const t0 = 1_000_000;
    const m = makeMatch(t0);
    m.tick(t0 + 4_000);
    m.finish('a', 55_000);
    m.markDisconnected('b', t0 + 10_000);
    // b's seat is held; race continues
    expect(m.tick(t0 + 15_000)).toBeNull();
    // after 20s grace b counts as DNF → everyone accounted for → finish
    expect(m.tick(t0 + 31_000)).toBe('finished');
    const results = m.results();
    expect(results.find((r) => r.userId === 'b')?.finishMs).toBeNull();
    expect(results.find((r) => r.userId === 'b')?.score).toBe(0);
  });

  it('reconnection restores the seat', () => {
    const t0 = 1_000_000;
    const m = makeMatch(t0);
    m.tick(t0 + 4_000);
    m.markDisconnected('b', t0 + 10_000);
    m.markReconnected('b');
    expect(m.tick(t0 + 31_000)).toBeNull();          // b back → race continues
  });
});

describe('end-to-end scripted match over real sockets', () => {
  it('two clients auth, matchmake, race, and receive results', async () => {
    // -- spin the server on an ephemeral port --
    process.env.REALTIME_PORT = '0';
    const mod = await import('../../realtime/server');
    const { server, shutdown } = mod;
    await new Promise<void>((r) => server.on('listening', r));
    const port = (server.address() as { port: number }).port;

    // -- tokens signed with the shared dev secret (degraded DB → token-only auth) --
    const { WebSocket: WsSocket } = await import('ws');
    type WsSocketType = InstanceType<typeof WsSocket>;
    const { signToken } = await import('../../src/server/services/authService');
    const tokenA = signToken({ uid: 'player-a', guest: false, tv: 0 });
    const tokenB = signToken({ uid: 'player-b', guest: false, tv: 0 });

    const connect = (token: string) => new Promise<WsSocketType>((resolve, reject) => {
      const ws = new WsSocket(`ws://127.0.0.1:${port}`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ v: 1, type: 'AUTH', payload: { token } }));
        resolve(ws);
      });
      ws.on('error', reject);
    });


    const wsA = await connect(tokenA);
    const wsB = await connect(tokenB);

    // buffered collector: history + live frames (back-to-back server
    // frames would race a fresh listener otherwise)
    const collector = (ws: WsSocketType) => {
      const history: { type: string; payload?: unknown }[] = [];
      ws.on('message', (data: unknown) => history.push(JSON.parse(String(data))));
      return (wanted: string, timeoutMs = 8_000) => new Promise<unknown>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let poll: ReturnType<typeof setInterval> | null = null;
        let onClose: (() => void) | null = null;
        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (poll) clearInterval(poll);
          if (onClose) ws.off('close', onClose);
        };
        const hit = history.find((f) => f.type === wanted);
        if (hit) return resolve(hit.payload ?? {});
        timer = setTimeout(() => {
          cleanup();
          reject(new Error(`timeout waiting for ${wanted}; saw: ${history.map((h) => h.type).join(',')}`));
        }, timeoutMs);
        poll = setInterval(() => {
          const found = history.find((f) => f.type === wanted);
          if (found) {
            cleanup();
            resolve(found.payload ?? {});
          }
        }, 25);
        onClose = () => {
          cleanup();
          reject(new Error('socket closed early'));
        };
        ws.on('close', onClose);
      });
    };
    const collectA = collector(wsA);
    const collectB = collector(wsB);
    try {
      await collectA('AUTH_OK');
      await collectB('AUTH_OK');

      // both queue → the ticker pairs them
      wsA.send(JSON.stringify({ v: 1, type: 'MATCHMAKING_JOIN', payload: { carId: 'toro', level: 5 } }));
      wsB.send(JSON.stringify({ v: 1, type: 'MATCHMAKING_JOIN', payload: { carId: 'vela', level: 6 } }));
      const found = await collectA('MATCH_FOUND') as { players: unknown[] };
      expect(found.players).toHaveLength(2);
      await collectB('MATCH_FOUND');
      await collectA('MATCH_COUNTDOWN');
      await collectB('MATCH_COUNTDOWN');

      // countdown (4s) elapses server-side
      await collectA('MATCH_STARTED');
      await collectB('MATCH_STARTED');

      // drive + finish
      wsA.send(JSON.stringify({ v: 1, type: 'PLAYER_STATE', payload: { x: 12, z: 4, h: 0.2, s: 38, cp: 2 } }));
      wsA.send(JSON.stringify({ v: 1, type: 'MATCH_EVENT', payload: { finish: 51_000 } }));
      wsB.send(JSON.stringify({ v: 1, type: 'MATCH_EVENT', payload: { finish: 48_000 } }));

      const results = await collectA('MATCH_FINISHED') as { results: { userId: string; score: number }[] };
      expect(results.results).toHaveLength(2);
      expect(results.results[0].userId).toBe('player-b');   // faster
      expect(results.results[0].score).toBeGreaterThan(0);
      await collectB('MATCH_FINISHED');
    } finally {
      wsA.close();
      wsB.close();
      shutdown();
    }
  }, 20_000);
});
