# Car Game — MVP Build Plan (Three.js, iframe demo)

A polished, fully-playable **3D city driving game** as a new portfolio demo. Vanilla JS + Three.js inside an iframe, matching the existing demo architecture exactly.

## Decisions (confirmed)
- **Scope:** Polished MVP — driving + city + 2-3 missions + parking + HUD + minimap + localStorage save. Races/garage/upgrades/weather/full-traffic-AI come later.
- **Tech:** Three.js (true 3D), loaded from CDN inside the demo's HTML (same self-contained pattern as other demos).
- **Architecture:** Standalone `public/demos/car-game/` loaded via `DemoFrame` iframe — zero coupling to React.

## Files to create

### 1. `public/demos/car-game/index.html`
Self-contained document: `<head>` with Orbitron font, Three.js CDN script (`three@0.160` min, `type="module"`), a `<canvas>` mount, HUD overlay, mobile-controls overlay, menu/pause overlays.

### 2. `public/demos/car-game/style.css`
All game styling: full-bleed canvas, HUD (speedometer, fuel, health, mission text, distance, money), minimap, menu screens, mobile touch buttons, pause overlay. Neon/cyber aesthetic to match portfolio (cyan/purple, Orbitron font, glassmorphism).

### 3. `public/demos/car-game/src/config.js`
Constants: car physics (accel, max speed, steering, grip, brake force), world size, road grid, colors, fuel/damage rates, mission definitions.

### 4. `public/demos/car-game/src/world.js`
City builder: procedural road grid (intersections + lanes), buildings (boxes with neon trim), sidewalks, a few parked cars, traffic-light poles, gas station, parking zones, ground plane + skybox/fog. Reuses a small set of geometries/materials for performance.

### 5. `public/demos/car-game/src/car.js`
Player car: a `THREE.Group` (body + cabin + 4 wheels + headlights + brake lights). Bicycle-model steering physics: speed, steering angle proportional to speed, handbrake reduces grip. Updates wheel rotation/turn, brake-light glow on brake, headlight cones at night.

### 6. `public/demos/car-game/src/traffic.js`
Simple AI traffic: a handful of cars that follow road lanes, stop at red lights, despawn off-screen. Lightweight (≤6 cars). Collision = AABB distance check → damage + bounce.

### 7. `public/demos/car-game/src/missions.js`
3 MVP missions: (1) First Drive — reach destination, (2) Parking Challenge — park in a zone with accuracy scoring, (3) Timed Delivery — reach dest before timer. Each: objective, destination marker, checkpoint(s), reward money/XP, completion screen with star rating.

### 8. `public/demos/car-game/src/game.js`
Main loop: `requestAnimationFrame`, input (keyboard + touch), camera switching (chase / hood / top), physics update, collision, fuel/damage drain, HUD refresh, minimap render (2D canvas overlay), traffic update, mission checks. Pause/resume. Save/load to `localStorage`.

### 9. `public/demos/car-game/src/main.js`
Entry: init Three.js scene/camera/renderer/lights, build world, spawn car + traffic, wire input, start loop, manage menu→play→pause→complete state machine.

### 10. `public/demos/car-game/README.md`
Quick docs: controls, missions, tech.

### 11. `src/app/demos/car-game/page.tsx`
Thin route (4 lines) mirroring snake — `<DemoFrame src="/demos/car-game/index.html" title="Car Game" />` + metadata.

### 12. `src/data/projects.ts`
Add a `car-game` project entry (copy snake's shape): `slug: "car-game"`, `icon: "🚗"`, `demoUrl: "/demos/car-game"`, category `Web Development`, `featured: true`, etc.

## MVP feature checklist
- ✅ Smooth arcade driving (accel/brake/reverse/steer/handbrake/horn)
- ✅ 3 camera views (chase/hood/top), switch with C
- ✅ Driveable city (road grid, buildings, intersections, traffic lights, parking zones, gas station)
- ✅ HUD: speedometer, fuel, health, mission, distance, money + minimap
- ✅ Light AI traffic (lane-following, stops at red lights)
- ✅ 3 missions + parking with scoring
- ✅ Fuel + vehicle damage systems; refuel/repair at stations
- ✅ Day/night cycle (headlights at night)
- ✅ Keyboard + touch controls, P/ESC pause
- ✅ localStorage save (money/XP/progress/settings/sound)
- ✅ Mobile-responsive, no page-scroll on touch
- ✅ Sound on/off (WebAudio simple beeps/engine hum)
- ✅ Star rating + rewards on mission complete

## Deferred (later iterations)
Full garage/purchases/upgrades/customization, races/time-trials with AI opponents, weather (rain/fog), 8-mission campaign, 5 game modes menu. The MVP menu will have Career (missions) + Free Drive; "more modes coming soon."

## Performance
- Object reuse, instancing for buildings where possible
- Cap traffic at 6, draw-distance fog to cull far geometry
- `requestAnimationFrame` with delta-time, pause on tab blur
- Target 60fps desktop, 30fps+ mobile

## Verification
1. Dev server, open `/demos/car-game` — game loads, menu shows, Play starts driving
2. Test all controls (WASD/arrows, space, C, H, P/ESC)
3. Drive to destination → mission completes with stars/reward
4. Park in zone → accuracy score
5. Collide with traffic → damage; refuel at station
6. Mobile viewport: touch controls work, no scroll
7. Reload → progress persists (localStorage)
8. `npm run build` — portfolio still builds, project card links correctly