# Neon Drive — Testing

Runner: **Vitest** (`npm test`, config in `vitest.config.ts`, node
environment). No DB required — service tests run against in-memory
repositories (`createMemoryRepositories()`).

## Suites

| File | Covers |
|---|---|
| `tests/server/authService.test.ts` | scrypt round-trips, token sign/verify/tamper, guest upgrade, revocation semantics |
| `tests/server/saveService.test.ts` | sync projection, conflicts, hostile blobs, earn-rate clamps |
| `tests/server/leaderboardService.test.ts` | server-side scoring, PB accumulation, boards/pagination, guest policy, `mine` scope |
| `tests/server/antiCheat.test.ts` | run validation, score curve, earn-rate bounds, rate limiter |
| `tests/server/platform.test.ts` | logout revocation, disabled accounts, action tokens, friends flows, admin flag review, AI coach, clamped-flag surfacing |
| `tests/server/realtime.test.ts` | protocol validation, matchmaking pairing, match state machine (countdown/race/DNF/rejoin), **end-to-end scripted 2-client match over real sockets** |
| `tests/unit/*.mjs` | game-client: save migrations, economy math, event bus, game loop, audio manifest/spatializer |

## Conventions

- Services are constructed with memory repos — DB-free, fast,
  deterministic; Prisma implementations mirror the interfaces and
  are exercised by the same service tests' contracts.
- The realtime E2E spins the actual server on an ephemeral port
  (`REALTIME_PORT=0`), connects two `ws` clients with signed
  tokens, and drives auth → matchmake → race → finish → results.
- `resetRateLimits()` in `beforeEach` isolates limiter state.

## Manual verification

```bash
npm run dev          # web on :3000
npm run realtime     # ws on :3001  (or: npm run dev:full)
```

- `curl localhost:3000/api/game/health` → `{ status:'ok', database, cache, realtime }`
- `curl localhost:3001/health` → realtime stats
- Play: register → free drive → leaderboard → friends →
  multiplayer queue (two browser profiles pair into a ghost race).

## CI

`.github/workflows/ci.yml`: install → prisma generate → lint →
typecheck → tests → build → docker images (web + realtime).
