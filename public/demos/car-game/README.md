# 🚗 Neon Drive NYC — Open-World Driving Game

A large-scale, New York-inspired open-world driving game built with **Three.js + vanilla JS** — no game engine, no external assets. Drive a Lamborghini-style supercar through Manhattan and Brooklyn. Runs standalone inside the portfolio's demo iframe.

## Play

Open **`/demos/car-game`** on the portfolio, or open `index.html` directly.

## Controls

### Desktop
| Key | Action |
|---|---|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` · `D` / `→` | Steer |
| `Space` | Handbrake / drift |
| `Shift` | Nitro (sprint on foot) |
| `E` / `F` | Enter/exit car · Garage / Showroom · start roam events |
| `C` | Camera: chase · close · hood · cockpit · cinematic |
| `H` | Horn |
| `M` | Fullscreen map (click a road to set GPS) |
| `L` | Headlights |
| `T` | Auto / manual gearbox |
| `K` | Traction control on / off |
| `Z` / `X` | Shift down / up (manual) |
| `P` / `Esc` | Pause |
| Click | Cruise control on/off |

**Gamepad** (sticks + triggers) is supported automatically.

### Mobile
A virtual steering wheel, gas/brake pedals, handbrake, nitro, horn, camera, and map buttons appear on touch devices.

## The World — New York-inspired

- **Manhattan** — Midtown skyscraper canyons with setback towers, spires, and rooftop water towers; a **Times Square** district with animated neon billboards and a red-step plaza; the **Financial District** of glass towers; wide **avenues** (5th, Park, Broadway…) with three lanes each way
- **Central Park** — a 4×4-block park with ponds, a fountain plaza, rocks, benches, and dense trees
- **The East River** — animated water splitting two boroughs, crossed by two **suspension bridges** (towers, catenary cables, hangers) and two ring-highway beam bridges
- **Brooklyn** — brownstone **Brooklyn Heights** rows with stoops and cornices, mixed residential blocks, and the **DUMBO docks** with warehouses, container stacks, and gantry cranes
- **Street life details** — subway entrances with green globes, street-name signs (Wall St, Flatbush Ave…), manhole steam, crosswalks, stop lines, cycling traffic signals, and streetlights that pool light on the road at night
- **A road tunnel** under a midtown plaza with lit interior strips

## The Car — Toro SV

A Lamborghini-inspired AWD supercar built from an **extruded side-profile body** with beveled edges — real hood, windshield, and deck slopes instead of boxes — plus a glass canopy with A/C-pillars, fender blisters, side intakes, sharp Y-shaped LED headlights with **DRL strips**, hexagonal taillights, rear diffuser with fins, engine-cover slats, mirrors, license plates, and sport wheels with spokes, **brake discs, and fixed calipers**. Carbon-fiber accents use a generated twill texture; paint, glass, rubber, chrome, and plastic all use tuned PBR materials. Physics includes a torque curve, 6-speed auto/manual gearbox, rev limiter, **traction control** (toggle `K`), **ABS**, **AWD cornering bite**, weight transfer, launch **wheelspin** with TC off, handbrake drifts with **skid marks**, and nitro. The **cockpit view** has a rotating flat-bottom wheel, digital cluster with warning indicators (TEMP / FUEL / TC), center console, and seats with headrests. Every vehicle drops a soft contact shadow, and all lights work — head/brake/turn/reverse/hazard.

## Detailed Buildings & Streets

Every building gets **geometric windows** (instanced dark frames + reflective glass panes + per-window warm interior glow at night), **entrance doors**, **balconies** on brownstones and midrise, zigzag **fire escapes**, rooftop **HVAC units with fans**, and **parapet lips** — all instanced per chunk so they stream with the world. Facades use canvas textures with baked floor-line AO and edge vignettes in brick, concrete, and glass styles; shops get neon signs plus **striped awnings**. Streets use a noise **asphalt texture** with cracks, aggregate, and darker wheel-track wear; roads carry **manhole covers**, **drainage grates** at intersection corners, and **concrete jersey barriers** along the ring highway. Sidewalks get concrete with expansion joints, and every block has **curbs**, benches, trash cans, and hydrants. Pedestrians walk their blocks **and cross streets** — waiting at the curb before stepping out. `L` cycles headlights **auto → low → high beam** (high beams throw longer, brighter light), and the chase camera now avoids clipping through buildings and leans into corners.

## Living City Systems

- **Traffic AI** — ten vehicle types (sedans, taxis, buses, trucks, motorcycles, ambulances, fire trucks, police patrols) that follow lanes, obey signals, keep gaps, change lanes, brake for pedestrians on crosswalks, honk, and occasionally break down and cause jams
- **District density** — Midtown and the Financial District are packed, parks are quiet, highways are fast, and everything thins out at night
- **Pedestrians** — sidewalk walkers that flee speeding cars
- **Police** — patrol cars that notice speeding and red-light running; 1–5 wanted stars; coordinated pursuits with spread targets, flashing lightbars and sirens; **roadblocks** at 3+ stars; busted fines and escapes
- **Dynamic time & weather** — a full day cycle (sunrise → midnight) with lit windows and streetlights, plus clear / cloudy / rain / heavy rain / fog / storm weather with wet reflective roads and reduced grip

## Gameplay

- **14 career missions** — deliveries, driving school, parking, taxi shift, checkpoint and street races (against a rival racer), VIP transport, supercar delivery, a ring-highway lap, police escape, a neon night tour, and a full city marathon across every district
- **Free-roam events** — race starts, taxi stands, time trials, and courier drops appear as glowing markers around the city; drive in and press `E` to start — they pay instantly and respawn elsewhere
- **Economy** — money, XP, levels; 6 buyable cars at the dealership
- **Garage** — 6 upgrade lines (engine, brakes, suspension, tires, nitro, transmission), 10 paints, spoilers, **wheels, brake calipers, body kits, and exhausts** with live stat bars
- **GPS navigation** — rotating minimap + fullscreen district map, click-to-route A* pathfinding, **turn-by-turn arrows**, distance to destination, and automatic recalculation when you go off route
- **Saves** — v2 localStorage saves with automatic migration from both the original game and the pre-NYC edition (existing players are gifted the Toro SV)

## Performance

- **Chunked world streaming** — the map is split into 4×3 chunks toggled by distance from the player
- **Spatial-hash colliders** — collision queries touch only nearby buildings
- **Instanced statics** — road markings, trees, streetlights, and signals are single instanced draw calls
- **Traffic mesh pooling** + despawn beyond ~175 m; pedestrian pooling
- **Quality presets** (Low / Medium / High / Ultra) scale pixel ratio, shadows, draw distance, chunk radius, traffic, and rain; Ultra adds 2560px shadows, a 360 m streaming radius, and bloom

## Tech

- Three.js r160 (CDN, ES modules via importmap, optional bloom at High quality)
- Vanilla JS ES modules — no build step
- Canvas 2D for minimap, map, speedometer, cockpit cluster, and animated billboards
- Web Audio API for all sound (4 volume channels)
- `localStorage` persistence + migrations

## Structure

```
car-game/
├── index.html       # shell + HUD + all menus
├── style.css        # glassmorphic UI
├── README.md
└── src/
    ├── config.js       # NYC layout, car catalog, customization, missions, economy
    ├── utils.js        # math helpers, seeded RNG, A*
    ├── audio.js        # synthesized audio engine (4 volume channels)
    ├── city.js         # NYC builder: districts, river, bridges, tunnel, streaming
    ├── vehicles.js     # Toro SV + all vehicle meshes + TC/ABS physics
    ├── traffic.js      # district-aware AI traffic + pooling + patrols
    ├── pedestrians.js  # sidewalk pedestrians
    ├── police.js       # wanted system, pursuits, violations, roadblocks
    ├── missions.js     # 14 career + 4 roam mission archetypes
    ├── navmap.js       # minimap, district map, GPS routing + turn-by-turn
    ├── input.js        # keyboard + gamepad + touch (virtual wheel)
    ├── game.js         # main loop, cameras, weather, saves, roam events
    └── main.js         # boot + all UI wiring (menus, garage, dealer, settings, map)
```

## Notes

- Original vehicles, environments, and branding — no copyrighted assets. NYC locations are stylistic homages, not replicas.
