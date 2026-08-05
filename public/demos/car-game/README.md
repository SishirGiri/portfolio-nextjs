# 🚗 Car Game — City Driving Simulator

A 3D city driving simulator built with **Three.js + vanilla JS**, running standalone inside the portfolio's demo iframe.

## Play

Open **`/demos/car-game`** on the portfolio, or open `index.html` directly.

## Controls

### Desktop
| Key | Action |
|---|---|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| `Space` | Handbrake |
| `C` | Change camera (chase / hood / top) |
| `H` | Horn |
| `P` / `Esc` | Pause |
| `M` | Mute / unmute |

### Mobile
Large touch controls appear automatically: steering (◀ ▶), pedals (⬆ ⬇), handbrake, camera, horn.

## Features

- **Arcade driving physics** — bicycle-model steering, handbrake drift, smooth accel/brake/reverse
- **Procedural city** — road grid, intersections, buildings with neon trim, sidewalks, boundary fence
- **Traffic lights** — cycling NS/EW lights that AI traffic obeys
- **AI traffic** — lane-following cars that stop at red lights and despawn off-screen
- **3 camera views** — chase, hood, top-down
- **HUD** — speedometer, fuel, health, mission, distance, money, timer + live minimap
- **Missions** — First Drive, Parking Challenge (accuracy-scored), Timed Delivery
- **Fuel & damage** — drain while driving, refill/repair at the gas station
- **Day/night cycle** — headlights and street glow at night
- **Rewards** — money, XP, star rating (based on collisions, violations, time)
- **Save system** — money/XP/mission progress/sound via `localStorage`
- **Web Audio** — synthesized engine hum, horn, crash, UI sounds (no audio files)

## Tech

- Three.js r160 (CDN, ES module via importmap)
- Vanilla JS ES modules — no build step
- Canvas 2D minimap overlay
- Web Audio API for sound
- `localStorage` for persistence

## Structure

```
car-game/
├── index.html       # shell + HUD + menus
├── style.css        # neon UI
├── README.md
└── src/
    ├── config.js    # tunable constants (physics, world, missions)
    ├── world.js     # city builder (roads, buildings, lights, stations, parking)
    ├── car.js       # player car mesh + bicycle-model physics; buildCarMesh() shared with traffic
    ├── traffic.js   # lane-following AI traffic
    ├── missions.js  # mission/destination/parking/timer/star logic
    ├── game.js      # main loop, input, camera, HUD, minimap, collisions, fuel/damage, save
    └── main.js      # init Three.js + UI/menu wiring + audio
```

## Notes

- Original vehicles, environments, and branding — no copyrighted assets.
- Performance-tuned for desktop (60fps) and mobile (30fps+).
