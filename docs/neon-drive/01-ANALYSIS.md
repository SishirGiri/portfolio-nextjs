# Neon Drive NYC — Architecture Analysis (pre-modernization)

Audit of the game as it existed before the database + modular-architecture
upgrade. Written **before** any code was changed, per the migration strategy.

## 1. Technology identified

| Aspect | Finding |
|---|---|
| Game engine / framework | None — custom engine on **Three.js r160** (CDN, ES-module importmap) |
| Languages | **JavaScript (ES modules)** client; **TypeScript** for the Next.js host site |
| Rendering | WebGL via Three.js; optional `UnrealBloomPass` at High/Ultra; Canvas 2D for HUD instruments, minimap, billboards |
| Audio | Web Audio API — fully synthesized (engine, skids, weather, music) |
| Physics | Custom arcade car physics (torque curve, 6-speed box, TC/ABS, weight transfer) |
| Embedding | Served statically from `public/demos/car-game/`, iframed same-origin by `src/app/demos/car-game/page.tsx` via `DemoFrame` |
| Data storage | `localStorage` only (`cargame_save_v2`, migration from `cargame_save_v1`) |
| APIs | None for the game. Host site has NextAuth (Google, resume gate) + `/api/resume` |
| Database | None |
| Build step | None for the game (plain ES modules); Next.js build for the host site |

## 2. Module inventory (~8,600 lines)

```
public/demos/car-game/
├── index.html   268  shell + HUD + all menu markup
├── style.css         glassmorphic UI
└── src/
    ├── config.js       518  ALL tunables: world layout, car catalog, upgrades,
    │                        cosmetics, missions, economy, weather, quality, saves
    ├── utils.js        115  math, seeded RNG, circle-AABB, A*
    ├── audio.js        351  synthesized audio engine (4 channels)
    ├── city.js        2046  NYC builder: districts, river, bridges, chunk streaming
    ├── vehicles.js    1112  player car + 10 traffic meshes + TC/ABS physics
    ├── traffic.js      413  lane-following AI traffic + pooling + patrols
    ├── pedestrians.js  214  sidewalk pedestrians (flee, cross streets)
    ├── police.js       321  wanted stars, pursuits, violations, roadblocks
    ├── missions.js     556  12 career archetypes + 4 roam events
    ├── navmap.js       292  minimap, district map, A* GPS routing
    ├── input.js        197  keyboard + gamepad + touch (virtual wheel)
    ├── game.js        1495  main loop, cameras, weather, saves, mission flow
    └── main.js         704  boot + ALL UI wiring (menus, garage, dealer, settings)
```

## 3. What already works well (kept, not rewritten)

- **World streaming**: 4×3 chunk toggling by distance; spatial-hash colliders;
  instanced statics (markings, trees, lights); traffic/ped pooling with despawn.
  The performance work requested (§11) largely already exists.
- **Systems are already classes** with clear constructors (`City`, `PlayerCar`,
  `Traffic`, `Police`, `MissionManager`, `NavMap`, `Input`, `AudioEngine`, `Game`).
- **Data-driven content**: vehicles, upgrades, paints, missions live in `config.js`
  arrays — adding a car/mission today already needs no engine change.
- **Save migration** v1→v2 with backward compatibility.
- Visuals already match the requested neon/cyberpunk brief (day/night, weather,
  bloom, reflections, particles, skid marks).

## 4. Problems found (drive the refactor)

1. **No persistence layer** — progress lives only in `localStorage`; clearing
   browser data or switching devices loses everything. No accounts, no
   cross-device play, no leaderboards.
2. **`config.js` is a monolith** mixing five concerns: world geometry (with
   behavior via getters), vehicle/customization data, mission definitions,
   economy formulas, and quality presets. Adding content couples to everything.
3. **No event system** — `game.js` owns a `ui` callback bag (`onComplete`,
   `onFail`, `onLevelUp`…) and every system pokes the others directly
   (`police.addHeat` from collision code, `save.money -=` from six places).
4. **No centralized game-state machine** — `mode` is a free string
   (`menu|play|free|paused`) mutated ad hoc; menus re-derive state in `main.js`.
5. **Economy mutations are scattered & unvalidated** — money/XP change in
   `game.js` (missions, fines, fuel), `main.js` (dealer, garage) with no
   single choke point, so nothing can be audited, synced, or server-validated.
6. **Silent error swallowing** — every `try {} catch {}` around saves/JSON
   drops errors; a corrupted save silently becomes a fresh save (progress loss).
7. **Duplication** — stat computation (`computeStats`) lives only in `main.js`
   UI code while `vehicles.js` re-implements upgrade math for physics; the
   "buy cosmetic" handlers are six copies of the same money-check pattern.
8. **No tests** — pure logic (A*, economy, collision helpers, save migration)
   is testable but untested; no test runner in the repo at all.
9. **No server authority** — anything client-side can be edited in devtools;
   there is nothing to validate against.

## 5. Architecture risks if we rewrote blindly

- The game is a **no-build static demo inside a portfolio**. Converting 8.6k
  lines to TypeScript with a build step would risk the working game for zero
  player-facing gain. Decision: keep the client as no-build ES modules, keep
  Three.js, and add structure *inside* that constraint; all **new** server code
  is TypeScript in the existing Next.js app.
- The host site already runs NextAuth for the resume gate. Game accounts get a
  separate, lightweight token auth (guest-first, optional username/password)
  so the game stays playable without Google sign-in — coexisting, not replacing.

## 6. Modernization decisions (from this analysis)

| Requirement | Decision |
|---|---|
| Database | **PostgreSQL + Prisma** (docker-compose for local dev); graceful offline degradation |
| Server | Next.js **API routes** in TS: `UI → API → Service → Repository → Prisma → PG` |
| Auth | Guest tokens by default; optional register/login (scrypt hashing, HMAC-JWT sessions) |
| Saves | Local-first (`localStorage` + revision counter) + background sync queue; conflict handling LWW-by-revision |
| Leaderboard | Server-computed scores from mission result payloads (client never sends a score) |
| Events | Tiny `EventBus`; emitted for mission/level/save/sync milestones |
| State | `GameState` machine (BOOT→LOADING→MENU→GAMEPLAY→PAUSED→RESULTS→…) owned by `Game` |
| Data | Pure content split into **JSON** (`data/*.json`) shared by client JS **and** server TS — single source of truth for validation |
| Weapons | Out of scope for a driving game — the data-driven pattern documented for vehicles/missions is the extension recipe |
