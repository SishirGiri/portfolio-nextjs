# Neon Drive — REST API

Base: `/api/game`. Auth: `Authorization: Bearer <token>` unless noted.
Errors: `{ error: string, code?: string }` with proper status codes.
All online features fail soft — 503 `database_unavailable` keeps the
client playable offline.

## Auth

| Method | Path | Body / Query | Result |
|---|---|---|---|
| POST | `/auth/guest` | — | `{ token, user }` |
| POST | `/auth/register` | `{ username, password }` | `{ token, user }` — upgrades the calling guest in place |
| POST | `/auth/login` | `{ username, password }` | `{ token, user }` (uniform error, IP rate-limited) |
| POST | `/auth/logout` | — | `{ ok }` — revokes all tokens (tokenVersion bump) |
| GET | `/auth/me` | — | `{ user }` incl. `role`, `emailVerified` |
| POST | `/auth/password-reset` | `{ identifier }` | always `{ ok, message }` — emails a 1h link if the account has one |
| POST | `/auth/password-reset` | `{ token, newPassword }` | `{ ok }` — rotates password + revokes sessions |

Username rules: `^[a-zA-Z0-9_-]{3,24}$`; password 6–128.

## Saves

| Method | Path | Notes |
|---|---|---|
| GET | `/save` | `{ save, revision }` |
| PUT | `/save` | `{ save, deviceId, clientTime }` → `{ conflict:false, save, revision, achievements, clamped }` or **409** `{ conflict:true, serverSave }` (higher `rev` wins) |

## Leaderboards

| Method | Path | Notes |
|---|---|---|
| GET | `/leaderboard?scope=&period=&page=&limit=` | scopes: `overall` (career), a mission id, `mine`, `friends`. Periods: `all|day|week` (mission boards). Public boards rank registered accounts only. |
| POST | `/leaderboard` | run result `{missionId, elapsedMs, stars, vehicleId, distanceM, collisions}` → `{ ok, score, isPersonalBest }` — score computed server-side; impossible runs are **rejected and flagged**. |

## Social

| Method | Path | Notes |
|---|---|---|
| GET | `/friends?q=` | search (2+ chars) or `{ friends, requests }` |
| POST | `/friends` | `{ targetId }` send request (auto-accepts theirs) |
| PUT | `/friends` | `{ requestId }` accept |
| DELETE | `/friends?requestId=` | reject |
| DELETE | `/friends?friendId=` | remove friend |
| GET | `/notifications` | `{ items, unread }` |
| PUT | `/notifications` | `{ id }` or `{ id: "all" }` mark read |
| GET/PUT | `/profile` | display name, preset avatar, email attach |

## AI coach

| Method | Path | Notes |
|---|---|---|
| GET | `/coach` | `{ report: { generatedAt, focus, insights[] } }` — rule-based analyzer, LLM-swappable |

## Analytics

| Method | Path | Notes |
|---|---|---|
| POST | `/analytics` | `{ events: [{ name }] }` — whitelisted names only, batched ≤50 |

## Admin (RBAC: MODERATOR+ / ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin` | dashboard stats + server status |
| GET | `/admin?section=flags\|audit\|users&q=` | review queues |
| PUT | `/admin` | `{ userId, disabled }` / `{ userId, role }` (ADMIN) |
| POST | `/admin` | `{ flagId, status: dismissed\|actioned }` (MODERATOR+) |

Bootstrap admins via `ADMIN_USERNAMES` env (comma-separated).

## Ops

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | v2: `{ status, database, cache, realtime, version, uptimeSec }` |
| GET | `:3001/health` (realtime service) | `{ connections, authenticated, queued, activeMatches, uptimeSec }` |
