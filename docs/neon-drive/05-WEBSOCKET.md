# Neon Drive — WebSocket Protocol (v1)

Transport: `ws://<host>:3001` (dev) or same-origin via reverse
proxy (prod). Every frame is JSON: `{ v: 1, type, payload? }`.
Frames over 4KB are dropped; every inbound frame is validated
before it touches match/presence state.

## Handshake

1. Client connects.
2. **First frame must be `AUTH { token }`** within 5s — the same
   session token the REST API issued (browsers can't set WS
   headers, so it travels in the first message, never the URL).
3. Server replies `AUTH_OK { user }` or `AUTH_ERROR` + close 4003.

## Client → server

| Type | Payload | Rate | Notes |
|---|---|---|---|
| `AUTH` | `{ token }` | once | handshake |
| `PING` | `{}` | ≤1/5s | server replies `PONG` (RTT measurement) |
| `MATCHMAKING_JOIN` | `{ carId, level }` | on demand | errors when already queued/in-match |
| `MATCHMAKING_LEAVE` | `{}` | on demand | dequeue |
| `PLAYER_STATE` | `{ x, z, h, s, cp }` | ~10Hz while racing | clamped: ±3000 world, s ≤ 200; teleports dropped |
| `MATCH_EVENT` | `{ checkpoint?: n }` / `{ finish: elapsedMs }` / `{ leave: true }` | events | finish must be 2s–30min |
| `MATCH_REJOIN` | `{ matchId }` | after reconnect | restores a seat held 20s |

## Server → client

| Type | Payload | When |
|---|---|---|
| `AUTH_OK` / `AUTH_ERROR` | `{ user }` / `{ message }` | handshake result |
| `PONG` | `{}` | reply to PING |
| `PRESENCE` | `{ userId, username, online }` | a user's first/last connection |
| `NOTIFICATION` | `{ title, notificationType }` | pushed via pub/sub from REST-side events |
| `LEADERBOARD_UPDATED` | `{}` | a run was accepted (nudge to refresh boards) |
| `MATCH_FOUND` | `{ matchId, missionId, seed, countdownMs, players[] }` | matchmaking paired 2–4 racers |
| `MATCH_COUNTDOWN` | `{ startInMs }` | pre-race countdown (4s) |
| `MATCH_STARTED` | `{ startAt }` | race clock begins |
| `STATE_UPDATE` | `{ t, players: [{userId,x,z,h,s,cp}] }` | ~10Hz relay of remote ghosts |
| `MATCH_EVENT` | `{ userId, checkpoint?/finish? }` | relayed race events |
| `MATCH_FINISHED` | `{ results: [{userId,username,position,score,finishMs}] }` | authoritative results (server-computed scores, DNFs at the tail) |
| `MATCH_ABORTED` | `{ reason }` | match collapsed |
| `ERROR` | `{ message, code? }` | recoverable errors |

## Matchmaking

Level window ±3, widening 1 per 5s waited; groups of 2–4; a pair
waiting 20s+ locks in. Career race missions only.

## Server authority & anti-cheat

- Lifecycle (countdown, start, finish, results) is server-owned.
- Positions are relayed with plausibility checks (speed ceiling
  125 m/s + margin; teleport updates dropped, not fatal).
- `finish` times are validated (2s floor, timeLimit×2.5 cap).
- Scores use the same `computeScore()` as single-player boards.
- Results persist to `MatchRecord`/`MatchParticipant`.
- Disconnect mid-race: seat held 20s → DNF if not rejoined.
