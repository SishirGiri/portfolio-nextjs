# Three.js / WebGL

Two independent 3D systems — no GLSL shaders anywhere (verified: no `ShaderMaterial`/`fragmentShader`/`.glsl`).

## System 1 — Hero scene (React Three Fiber, npm `three@0.184`)

**File:** `src/components/Hero/HeroCanvas.tsx` (`"use client"`), mounted by `HeroSection` on `/`.

| Aspect | Implementation |
|---|---|
| Canvas | R3F `<Canvas>` with camera drift (`useFrame`) + mouse parallax (`useThree`) |
| Geometry — stars | `THREE.Points` + `BufferGeometry` with random positions (1,400 desktop / 600 mobile) |
| Geometry — nebula | `THREE.Points` sphere-shell distribution (700/300) with per-vertex `color` attribute lerping cyan→violet |
| Geometry — DNA helix | `THREE.Group` of instanced spheres/boxes along two helical strands (height 14, radius 2.6) |
| Floating shapes | procedural meshes orbiting the scene |
| Materials | stock Three.js materials (PointsMaterial/MeshStandard) — colors via `THREE.Color` |
| Animation | `useFrame` rotations, lerp helpers, scroll-reactive motion; counts halve on mobile |
| Post-processing | **none** (no EffectComposer/Bloom in the site bundle) |
| Performance | `next.config.ts` → `experimental.optimizePackageImports: ['@react-three/fiber','@react-three/drei','three']` |

Drei is installed as a dependency for R3F helpers.

## System 2 — Neon Drive NYC game (raw Three.js 0.160 via CDN)

**Folder:** `public/demos/car-game/` — 13 ES modules loaded by `index.html` through an importmap pinned to `three@0.160.0` on jsDelivr. Runs inside a `DemoFrame` sandboxed iframe at `/demos/car-game`.

| Module | 3D responsibility |
|---|---|
| `src/city.js` | Procedural NYC: extruded wedge/prism buildings, suspension bridges (Bezier-curve tube cables + hangers), instanced windows/doors/balconies/fire-escapes/HVAC/streetlights/trees/markings (InstancedMesh), river with animated vertex waves, chunk-visibility streaming |
| `src/vehicles.js` | Extruded side-profile car bodies (bevel), glass canopies, detailed wheels (spokes + brake disc + caliper), cockpit interior with CanvasTexture gauge cluster |
| `src/game.js` | Renderer (ACESFilmic tone mapping, PCFSoft shadows), sun/ambient/hemisphere lights, headlight SpotLights, rain `Points`, skid-mark decal pool, 5 cameras, day/night color grading |
| `src/traffic.js` / `police.js` / `pedestrians.js` | Moving meshes: 10 vehicle types (pooled), pursuit cars with flashing lightbars, capsule characters |
| `src/config.js` | Quality presets Low→Ultra (pixel ratio, shadow map size 1024–2560, chunk radius, bloom flag) |
| Optional bloom | High/Ultra lazily imports `UnrealBloomPass`/`EffectComposer`/`OutputPass` from the CDN addons path; silently disabled otherwise |

**Textures** — all generated at runtime with Canvas2D (asphalt noise + wheel wear, brick, facades with emissive lit-window maps, neon signs, carbon-fiber twill, license plate, animated Times-Square billboards). No external image/3D-model files.

## What is NOT present

- No GLSL shaders / custom ShaderMaterial
- No `.gltf/.glb/.fbx/.obj` models — everything procedural
- No WebGPU usage; WebGL only
