# Database

## NO DATABASE DETECTED

### Searches performed

| Searched for | Result |
|---|---|
| PostgreSQL / MySQL / MongoDB / SQLite / Supabase / Firebase | **Not found** — no clients, SDKs, or imports |
| Prisma / Drizzle / Mongoose / any ORM | **Not found** — not in `package.json`, no schema files |
| `DATABASE_URL` (or any `DB_*` env var) | **Not found** — `.env.local` contains only `AUTH_*` names |
| SQL queries (`SELECT`, `INSERT`, `prisma.`, `.query(`, `CREATE TABLE`) | **Not found** in `src/**` |
| Server actions / DB writes | **None** — the only writes are client-side localStorage (game saves) |

### Where data actually lives instead

1. **Static typed content** — `src/data/projects.ts`, `src/data/skills.ts`, `src/lib/constants.ts` (compiled into the JS bundles at build time)
2. **In-component copy** — About/FAQ/stats hardcoded in their components
3. **Static assets** — `/public` (images, demos) and `/private` (résumé, git-ignored)
4. **Browser localStorage** — `cargame_save_v2` for the driving game's progression (client-only)
5. **External SaaS** — Formspree holds contact-form submissions server-side (delivered to the owner's email); NextAuth uses JWT sessions (no session table)

### Implication

Adding a database would currently require choosing a provider + ORM from scratch; nothing in the codebase assumes one.
