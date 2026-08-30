# Neon Drive — Architecture

## System map

```
                         BROWSER
        ┌──────────────────────────────────────────┐
        │  Next.js site (portfolio shell + Demos)  │
        │      └─ iframe: Neon Drive game client    │
        │           Three.js · vanilla JS · WebAudio│
        └───────┬─────────────────────┬────────────┘
            REST (fetch)         WebSocket (ws)
                │                     │
        ┌───────▼────────┐   ┌────────▼─────────┐
        │  Next.js web   │   │  Realtime service │
        │  (this repo,   │   │  realtime/ (ws)   │
        │   route.ts)    │   │  port 3001        │
        │                │   │  · presence       │
        │  services/     │   │  · matchmaking    │
        │  repositories/ │   │  · ghost races    │
        └───┬───────┬────┘   └───────┬───────────┘
            │       └──── pub/sub ───┤
            ▼                        ▼
      PostgreSQL                 Redis (optional)
      (Prisma, source      (cache · rate limits · queue)
       of truth)                   │
            └───────► KV/PubSub adapters fall back to
                      in-process memory without Redis
```

## Layering (strict, one direction)

```
API route (src/app/api/game/**)      ← HTTP concerns only
  → service (src/server/services/*)  ← domain logic, no SQL
    → repository (src/server/repositories/*) ← interfaces
      → Prisma impl | memory impl    ← swappable
```

- **Game client never touches the DB.** It syncs saves and
  submits run *results* (never scores) through the REST API.
- **Realtime server verifies tokens with the shared secret**
  (`signToken`/`verifyToken` from authService) — no DB needed
  for auth; DB use is optional/degraded for match persistence.
- **Everything online is fail-soft**: DB down → 503 +
  `database_unavailable` → the client plays locally; Redis down →
  in-memory adapters; realtime down → single-player continues.

## Key services

| Service | File | Responsibility |
|---|---|---|
| Auth | `services/authService.ts` | scrypt passwords, HMAC session tokens (with `tv` revocation), guest→account upgrade |
| Save sync | `services/saveService.ts` | sanitize → conflict check → earn-rate clamp → project → achievements (single write) |
| Sanitizer | `services/saveSanitizer.ts` | the trust boundary for save blobs |
| Anti-cheat | `services/antiCheat.ts` | run validation, server-side scoring, earn-rate bounds |
| Leaderboard | `services/leaderboardService.ts` | boards (overall/mission/mine/friends), KV cache, pub/sub nudge |
| Achievements | `services/achievementService.ts` | data-driven defs (`data/achievements.json`) + predicate registry |
| Friends | `services/friendService.ts` | requests, symmetric friendships, notifications |
| Notifications | `services/notificationService.ts` | durable + live push |
| Profile | `services/profileService.ts` | display name, avatar, email verification |
| Admin | `services/adminService.ts` | stats, flags review, RBAC actions, audit trail |
| Coach | `services/coachService.ts` | rule-based AI analyzer behind a swappable `Analyzer` interface |

## Realtime protocol

See [05-WEBSOCKET.md](05-WEBSOCKET.md). Versioned envelopes
(`{v:1, type, payload}`), first-message auth, server-side
validation of every inbound frame.

## Decision log (problem → decision → trade-off)

| Problem | Decision | Trade-off |
|---|---|---|
| Next.js App Router can't host WebSockets | standalone `ws` service (`realtime/`) on :3001 | extra process/container vs. breaking `next dev` + Vercel |
| Browsers can't set WS headers | AUTH as first message (5s window) | one RTT before auth vs. tokens in URLs/logs |
| Redis absent in dev/tests | KV + PubSub adapters with memory fallback | single-instance-only state without Redis, acceptable locally |
| Full physics sync is heavy & the game is single-player-first | ghost races: server relays positions + owns lifecycle/scores | positions are client-reported (sanity-clamped) vs. full server simulation |
| Stateless 30d tokens, no revocation | `tokenVersion` bump invalidates all tokens | revocation is all-or-nothing per user vs. session table overhead |
| Email needs external provider | `EmailService` with console dev transport | verification/reset links visible in logs until SMTP/Resend is wired |

## Related docs

[03-DATABASE.md](03-DATABASE.md) · [04-API.md](04-API.md) ·
[05-WEBSOCKET.md](05-WEBSOCKET.md) · [06-SECURITY.md](06-SECURITY.md) ·
[07-TESTING.md](07-TESTING.md) · [08-DEPLOYMENT.md](08-DEPLOYMENT.md)
