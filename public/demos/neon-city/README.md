# 🎯 TACTICAL OPS — Top-Down Tactical Shooter

A realistic, modern-world top-down tactical shooter built with **HTML5 Canvas + vanilla
JavaScript (ES Modules)**. No frameworks, no game engine, no external assets — every
object, character, and sound is drawn or synthesized at runtime. Served through the
portfolio's `DemoFrame` (sandboxed iframe) at `/demos/neon-city`.

All characters, weapons, vehicles, the city, and branding are **original fiction**.

## Play
Open the **🌆 Neon City / Tactical Ops** card on the Projects page, or go to
`/demos/neon-city` directly.

## Features

### Map & environment
- Procedural modern city: asphalt roads with lane markings, sidewalks, crosswalks,
  7 districts (Downtown, Midtown, Harbor, Foundry, Eastside, Greenville, South Park),
  a park with a lake, and water borders.
- Realistic environment objects replace every placeholder: **cars, SUVs, trucks,
  shipping containers, concrete barriers, street lights, traffic lights, road signs,
  trees, bushes, benches, utility poles, fire hydrants, dumpsters, trash bins,
  explosive barrels**.
- 2.5D buildings (apartments, offices, warehouses, factories, shops, houses) with
  shadows, rooftops, and night-lit windows.

### Player — SWAT operator
- 8-direction movement, mouse aiming, weapon rotation.
- Sprint (stamina), roll/dodge (i-frames + cooldown), reload.
- Health + armor (armor absorbs a % of damage), stamina bar.

### Weapons (5) + grenades (3)
- **P-9 Pistol, MP-7 SMG, AR-15 Rifle, M-12 Shotgun (8 pellets), D-50 Sniper**
  — each with distinct damage, fire rate, recoil + recovery, spread, mag, reload,
  bullet speed, range, and penetration.
- **Frag, Flashbang (stun), Smoke (blocks line of sight)** grenades.

### Enemy AI
- State machine: patrol → guard → investigate sounds → chase → take cover → flank →
  attack → search → flee (when wounded).
- Perception via grid line-of-sight + sound propagation (gunfire alerts nearby enemies).
- Tiered difficulty: thug → soldier → elite (HP, accuracy, reaction, weapons).
- Lightweight grid pathfinding (BFS flow fields) to navigate around buildings.

### Vehicles (drivable)
- Sedan, Police Cruiser (lights + siren), SUV, Box Truck — enter/exit, accel/brake/
  steer with momentum, collision, damage, headlights at night, explosion at 0 HP.

### NPCs
- Civilians (flee danger), police (engage enemies / you at high heat), hostages
  (cower, then follow when rescued), shopkeepers (idle).

### Missions (7)
Eliminate Targets · Hostage Rescue · Secure Building · Bomb Defusal (timer) ·
VIP Escort · Capture Criminal · Collect Intelligence — each with objective markers,
optional timer, money + XP rewards.

### HUD & minimap
- Health, armor, stamina, weapon icon + ammo + reserve, grenade counts, money,
  XP/level, heat stars, kill counter, mission tracker + timer, driving speed +
  vehicle health + nitro.
- Live minimap with districts, entities, objective markers, player aim cone, viewport.

### Graphics & audio
- Dynamic night lighting (radial light around player, lit windows, headlights),
  bullet tracers, particle systems (blood, sparks, smoke, explosions, shell casings),
  weather (rain/fog), day/night cycle.
- Fully synthesized audio: per-weapon gunshots, footsteps, reload, vehicle engine,
  crashes, explosions, flashbangs, siren, ambient city bed, UI clicks. Toggle saved.

### Save system
- `localStorage` persistence (money, XP, level, weapon reserves, grenades, position,
  stats, achievements) with **Deploy / Continue** flow.

## Controls

### On foot
| Key | Action |
| --- | --- |
| `W A S D` / Arrows | Move (8-dir) |
| `Mouse` / `Click` | Aim / Fire |
| `R` | Reload |
| `Shift` | Sprint |
| `Space` / `Q` | Roll (dodge) |
| `1`–`5` | Switch weapon |
| `G` | Throw grenade |
| `E` / `F` | Interact / Enter vehicle |
| `P` / `Esc` | Pause |

### Driving
`W`/`S` throttle/brake · `A`/`D` steer · `Space` nitro/handbrake · `E` exit.

### Mobile
Left joystick moves/drives; buttons: 🔥 Fire · `E` Enter/Exit · 🔄 Reload · 🤸 Roll ·
💣 Grenade · 🌫️ Switch grenade.

## Architecture (ES Modules)
```
src/
  main.js          entry: boot, menus, settings, shop/garage panels, loop
  game.js          Game class: world/camera/input/entities, update+render pipeline
  config.js        constants, weapons, vehicles, missions, districts
  utils/           math, collision (LOS raycast), camera, input, audio, helpers (pools)
  maps/            CityMap (procedural city), mapObjects (prop renderers), buildings
  entities/        Player, Enemy, NPC, Vehicle, Bullet, Grenade, Particle
  weapons/         Weapon (base), Arsenal (defs + unlocks)
  ai/              EnemyAI (state machine), Pathfinding (BFS flow fields)
  ui/              HUD, MiniMap, Inventory
```
Each class is single-responsibility; the Game orchestrates. Runs at 60 FPS via
`requestAnimationFrame` with delta-time, viewport-culled rendering, and object pools
for bullets/particles.

## Originality
Every element — the city, districts, all weapon/vehicle names, missions, characters,
sounds, UI, and branding — was created for this portfolio. It uses no third-party
characters, maps, stories, logos, vehicles, music, voice lines, artwork, or assets.
