# Contributing

## Setup

```bash
npm install
npm run db:up        # Postgres + Redis via docker compose (Docker required)
npm run db:migrate   # first run only
npm run dev:full     # web :3000 + realtime :3001 (or `npm run dev` for web only)
```

No Docker? Everything still runs — the game is offline-first and
the platform falls back to in-memory adapters (single instance).

## Ground rules

- **Layering is one-way:** route → service → repository. Routes
  hold HTTP concerns only; services never write SQL; repositories
  implement the interfaces in `src/server/repositories/types.ts`
  (memory + prisma implementations must stay in sync).
- **Never trust the client** for scores/XP/money/results — see
  `docs/neon-drive/06-SECURITY.md`.
- **Fail soft:** any online feature must degrade, not crash.
- **Tests with the change:** service logic gets unit tests
  (memory repos), realtime logic gets protocol/match tests, and
  bug fixes get a regression test.

## Checks before opening a PR

```bash
npm run lint         # eslint
npx tsc --noEmit     # typecheck
npm test             # vitest (all suites)
```

CI (`.github/workflows/ci.yml`) runs the same gate plus builds.

## Schema changes

```bash
# edit prisma/schema.prisma, then:
npx prisma migrate dev --name <change>
npx prisma generate
```

If you added a field with a default, memory implementations in
`src/server/repositories/memory.ts` need the same default.

## Docs

Architecture-level changes update `docs/neon-drive/*` — the
numbered docs are the source of truth for the platform design.
