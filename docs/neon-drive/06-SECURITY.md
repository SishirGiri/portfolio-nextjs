# Neon Drive — Security

## Trust model

**Never trusted from the client:** scores, XP, level, money,
rank, match results, achievement unlocks. The client submits
*results* (times, stars, distances); the server derives every
competitive value (`computeScore`, sanitizer clamps, earn-rate
bounds) and stores it.

## Controls

| Area | Implementation |
|---|---|
| Passwords | scrypt + per-user salt, constant-time compare, dummy-hash on unknown users (no account enumeration) |
| Tokens | HS256 HMAC, 30d, carry `tv` (tokenVersion) — logout/password-change revokes all |
| Reset/verify | purpose-bound action tokens (1h / 24h), single-use semantics, dev email transport logs links |
| RBAC | `User.role` PLAYER/MODERATOR/ADMIN, `requireRole` on admin routes, self-demotion blocked |
| Input validation | hand-rolled validators on every REST body + WS frame (4KB cap, whitelisted types, clamped numerics) |
| SQL injection | Prisma parameterized queries only — no string SQL outside tagged templates |
| XSS | React/Next escaping; game UI renders untrusted names via `textContent`-safe templates — usernames restricted to `[a-zA-Z0-9_-]` |
| Rate limiting | per-user submission buckets (25/5min), per-IP auth limits, per-IP reset requests; Redis-shared when configured |
| Secrets | env only (`.env.example` documents); insecure dev secret is loudly warned |
| Transport | secure cookies for NextAuth; game tokens in headers (never URLs); WS auth in the first message, not the query string |
| Disabled accounts | login blocked + tokens dead (`userFromRequest` → null) |

## Anti-cheat pipeline

```
run submitted → validateRun (physics bounds)
             ├─ reject → FlaggedRun(severity by reason) + audit
             └─ accept → computeScore → insert
save synced  → sanitizeSave (hard caps, unknown ids dropped)
             ├─ reject → FlaggedRun(high) + audit
             └─ earn-rate clamp → FlaggedRun(medium), values clamped
WS race      → position teleport/speed clamps, finish-time bounds
```

Verdicts: **VALID / SUSPICIOUS (flagged, kept) / REJECTED**.
Flags land in the admin review queue — **no automatic bans**;
humans dismiss or action (see `06`→ admin flow in 04-API.md).

## Audit trail

`AuditLog` records: flag reviews, account disable/enable, role
changes, save rejections, admin bootstrap.

## Logging

pino structured logs (`service`, `module`, `requestId`/`userId`
bindings). **Never logged:** passwords, hashes, tokens, emails
in plain (dev email transport prints links locally only).

## Analytics privacy

Event names + user ids only (`AnalyticsEvent`), whitelisted at
the route. No PII, no session payloads.

## Known gaps (documented, by design)

- Email sending is dev-transport until SMTP/Resend is wired.
- Rate limiting is per-process without Redis.
- No CSP header yet on the game iframe route (game relies on
  CDN three.js) — tightening requires self-hosting the CDN asset.
