# Neon Drive — Database

PostgreSQL via Prisma. Schema: [`prisma/schema.prisma`](../../prisma/schema.prisma).

## Migrations

```bash
npm run db:up          # start Postgres (+ Redis) via docker compose
npm run db:migrate     # apply pending migrations (prisma migrate deploy)
```

**Baselining an existing db:push'd database** (tables exist, no
migration history) — mark the initial migration as applied:

```bash
npm run db:baseline    # prisma migrate resolve --applied 20260825000000_init
```

Creating a new migration after schema edits:

```bash
npx prisma migrate dev --name <change>
```

## Model map (16 tables)

| Model | Purpose | Key constraints |
|---|---|---|
| `User` | identity: guest-first, optional username+scrypt hash | `username? @unique`, `role`, `tokenVersion`, `disabled`, `email? @unique` |
| `PlayerProfile` | projected progression + display identity | pk userId, `@@index(careerScore desc)` for the overall board |
| `GameSave` | the authoritative sanitized save blob | pk userId, `revision` for sync conflicts |
| `PlayerStats` | career telemetry | pk userId |
| `OwnedVehicle` | garage inventory | `@@unique(userId, carId)` |
| `MissionProgress` | per-mission bests | `@@unique(userId, missionId)` |
| `Achievement` | unlocked achievements | `@@unique(userId, achievementId)` |
| `LeaderboardEntry` | one row per submitted run (score computed server-side) | `@@index(missionId, score desc)`, `@@index(missionId, createdAt, score)` |
| `Friendship` | symmetric friend edge, pair stored sorted (a<b) | `@@unique(userAId, userBId)` |
| `FriendRequest` | pending/rejected requests | `@@unique(fromId, toId)`, `@@index(toId, status)` |
| `Notification` | in-app notifications | `@@index(userId, createdAt desc)`, `@@index(userId, readAt)` |
| `AuditLog` | admin/system action trail | `@@index(createdAt desc)`, `@@index(targetType, targetId)` |
| `FlaggedRun` | anti-cheat findings for review | `@@index(status, createdAt desc)` |
| `MatchRecord` | multiplayer match header | `@@index(startedAt desc)` |
| `MatchParticipant` | per-player results in a match | `@@unique(matchId, userId)` |
| `AnalyticsEvent` | whitelisted telemetry (ids only) | `@@index(name, createdAt)` |

## Data flow invariants

- **Save blob** (`GameSave.data`) is the only writable
  progression store; relational tables are *projections*
  written by `SaveSyncService.project()` — never edited directly.
- **Scores** live only in `LeaderboardEntry` and are always
  computed by `computeScore()` on the server; clients submit
  results (`elapsedMs/stars/vehicleId/distanceM/collisions`).
- `careerScore` accumulates personal-best deltas only.
- Deletes cascade from `User`; `AuditLog.actor` and
  `AnalyticsEvent.user` set null (records outlive accounts).

## Redis key map (when REDIS_URL is set)

```
nd:rl:<bucket>:<key>    rate-limit counters (TTL = window)
nd:lb:<scope>:<period>:<page>:<limit>:<ids|pub>   cached board pages (20s)
nd:mm:queue             matchmaking queue
nd:presence:<userId>    online registry
nd:events               pub/sub channel (notifications, leaderboard, match)
```
