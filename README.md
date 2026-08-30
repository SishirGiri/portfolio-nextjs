# Sishir Bharati — Portfolio & Neon Drive Platform

Personal portfolio **plus** a production-grade real-time game
platform built around **Neon Drive**, an open-world Three.js
driving game — demonstrating full-stack engineering: game dev,
frontend, backend, auth, PostgreSQL, Redis, WebSockets,
multiplayer, AI features, security, testing, Docker, and CI/CD.

## What's inside

### Portfolio site
- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- Cyber-noir theme, Three.js hero, scroll animations
- Google OAuth (NextAuth v5) gating the resume download

### Neon Drive (`public/demos/car-game`, `src/server`, `realtime/`)
- **Game client** — vanilla JS + Three.js: NYC-inspired open
  world, missions, traffic, police pursuits, customization, GPS,
  day/night + weather, full WebAudio engine (RPM-mapped, 3D
  positional). Offline-first: everything works with no backend.
- **Platform (REST)** — guest-first auth (scrypt + HMAC tokens,
  revocation), revision-based cloud saves with server-side
  sanitization, server-computed scores + leaderboards
  (overall/mission/mine/friends), data-driven achievements,
  friends, notifications, profiles, AI driving coach, admin
  dashboard (RBAC), analytics, anti-cheat with human review.
- **Realtime (WebSocket)** — `realtime/` standalone service:
  presence, live notifications/leaderboard nudges, matchmaking
  (level-windowed), **server-authoritative ghost races** with
  validated position relay and reconnection.
- **Infra** — PostgreSQL (Prisma, migrations), optional Redis
  (KV + pub/sub adapters with in-memory fallback), Docker
  (web + realtime + db + redis), GitHub Actions CI, pino
  structured logging, health endpoints.

## Quick start

```bash
npm install
npm run db:up        # Postgres + Redis (docker compose; optional)
npm run db:migrate   # first run
npm run dev:full     # web :3000 + realtime :3001
```

Play at `http://localhost:3000/demos/car-game/` — multiplayer
needs both processes (or `npm run realtime` alongside `npm run dev`).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `dev:full` | web only / web + realtime |
| `npm test` | Vitest (services, realtime E2E, game units) |
| `npm run lint` · `npx tsc --noEmit` | quality gates |
| `npm run db:up/down/migrate/baseline` | infrastructure |
| `npm run realtime` | WebSocket service (watch mode) |

## Environment

See `.env.example`. Key vars: `DATABASE_URL`, `GAME_AUTH_SECRET`,
`REDIS_URL` (optional), `REALTIME_PORT`, `ADMIN_USERNAMES`.

## Documentation

| Doc | Contents |
|---|---|
| [`docs/neon-drive/02-ARCHITECTURE.md`](docs/neon-drive/02-ARCHITECTURE.md) | system map, layering, decision log |
| [`docs/neon-drive/03-DATABASE.md`](docs/neon-drive/03-DATABASE.md) | schema, migrations, Redis keys |
| [`docs/neon-drive/04-API.md`](docs/neon-drive/04-API.md) | REST reference |
| [`docs/neon-drive/05-WEBSOCKET.md`](docs/neon-drive/05-WEBSOCKET.md) | protocol v1, matchmaking, authority |
| [`docs/neon-drive/06-SECURITY.md`](docs/neon-drive/06-SECURITY.md) | trust model, anti-cheat, audit |
| [`docs/neon-drive/07-TESTING.md`](docs/neon-drive/07-TESTING.md) | suites + manual verification |
| [`docs/neon-drive/08-DEPLOYMENT.md`](docs/neon-drive/08-DEPLOYMENT.md) | Docker, AWS reference architecture, monitoring |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | setup, ground rules, PR checklist |

## Deployment

Docker: `docker compose --profile app up -d --build` (web,
realtime, Postgres, Redis). AWS reference architecture (ECS,
RDS, ElastiCache, CloudFront, CloudWatch) in
[08-DEPLOYMENT.md](docs/neon-drive/08-DEPLOYMENT.md).
