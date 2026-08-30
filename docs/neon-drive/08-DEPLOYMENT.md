# Neon Drive — Deployment

## Local (full stack)

```bash
npm install
npm run db:up                  # Postgres + Redis (docker compose)
npm run db:migrate             # apply migrations (first run)
npm run dev:full               # web :3000 + realtime :3001
```

Redis is optional — without `REDIS_URL` the platform falls back
to in-process adapters (single instance only).

## Docker (whole platform)

```bash
GAME_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  docker compose --profile app up -d --build
```

Containers: `web` (Next standalone, :3000), `realtime` (ws,
:3001), `db` (Postgres 16), `redis` (7). Healthchecks wired for
all four; `web` probes `/api/game/health`, `realtime` its
`/health`.

## AWS reference architecture

```
                     Internet
                        ↓
                   CloudFront  ──(static: .next/static, public/)
                        ↓
              Application Load Balancer
                   ↙            ↘
        web (ECS Fargate)   realtime (ECS Fargate)
        /api/game/* REST     WS :3001 (sticky sessions off —
        port 3000             the service is stateless per conn)
                   ↘            ↙
             ElastiCache Redis  ── shared: rate limits, board
                   ↓               cache, matchmaking, pub/sub
                RDS PostgreSQL  ── source of truth
                        ↓
              CloudWatch (logs/metrics/alarms)
```

Choices: ECS Fargate (no servers to manage, per-service
scaling), ElastiCache `cache.t4g.micro` (fits the key map in
03-DATABASE.md), RDS `db.t4g.micro` Postgres 16, S3 + CloudFront
for static assets, Route 53 for DNS. Secrets via ECS Secrets +
SSM Parameter Store (never baked into images).

### ALB WebSocket routing

```
/ws/*  → realtime service (idle timeout ≥ 300s)
/*     → web service
```

The client already prefers same-origin WS in prod — point
`/ws/*` at the realtime service (or serve it on a subdomain and
set `REALTIME_URL`).

## Monitoring & alerts

- Liveness: `/api/game/health` (web) + `/health` (realtime) —
  CloudWatch synthetics canary every 30s.
- Alert on: health 503 > 2 min, ALB 5xx rate > 1%, realtime
  connections < expected floor (service down), RDS CPU > 80%,
  Redis evictions > 0 (memory too small).
- Logs: pino JSON → CloudWatch Logs (fields: service, module,
  userId, requestId, level, time).

## Environments

- **Development** — local compose, dev secrets, LOG_LEVEL=debug.
- **Staging** — same images, separate RDS/Redis, `ADMIN_USERNAMES`
  populated, email dev-transport.
- **Production** — real secrets, `GAME_AUTH_SECRET` ≥ 32 bytes,
  EMAIL_TRANSPORT=smtp (+ credentials), LOG_LEVEL=info.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck →
test → build → docker build. Deploy to AWS is environment-gated
and provisioned outside the repo (Terraform/ECS console) — the
workflow builds and tags the artifacts; promotion is manual.
