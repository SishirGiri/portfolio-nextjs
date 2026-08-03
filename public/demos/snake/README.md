# 🐍 Snake Neon

A polished, neon-arcade take on the classic **Snake** game — built with pure
**HTML5 Canvas + CSS3 + vanilla JavaScript**. No frameworks, no build step, no
external assets (sounds are synthesized at runtime with the Web Audio API).

It's a portfolio-quality mini-game: glowing visuals, power-ups, combos,
obstacles, level progression, full mobile support, and a real light theme.

---

## ✨ Features

### Gameplay
- Classic grid-based Snake on an HTML5 `<canvas>`.
- Smooth continuous movement with directional queueing.
- Game over on **wall hit**, **self-collision**, or **obstacle** collision.
- 180° reversal lock — you can't instantly double back into yourself.
- Buttons: **Start**, **Pause**, **Resume**, **Restart**, **Quit**, **Play Again**.

### Food & Scoring
- Standard **apple** (+10) with glowing pulse animation.
- **Golden apple** (+50) — time-limited, appears occasionally.
- **Speed-boost food** — temporary acceleration.
- **Slow-motion food** — temporary slow-down for tight maneuvering.
- **Combo scoring** — eat quickly in succession to multiply points (up to ×8).
- **Levels** — every 50 points levels you up, increases speed, and (from L3)
  adds obstacles.
- **High score** persisted in `localStorage` (namespaced under `snake-game:`).

### Game States
- Welcome / Start screen
- Playing
- Paused
- Game Over (shows Score + High Score + Play Again)
- New High Score celebration screen 🎉

### Design
- Dark neon theme by default (`#050810` / `#0a0e1a`) with a real **light theme**.
- Glowing snake with a cyan→green gradient and `shadowBlur`.
- Animated, pulsing food; particle burst on eat; board flash + shake.
- Modern typography — **Orbitron** for headings, **Rajdhani** for body.
- Card-based layout: info panel · board · controls.
- Fully responsive across desktop, tablet, and mobile.

### Sound
- 100% synthesized via **Web Audio API** oscillators — no audio files.
- Distinct cues for eat, golden, boost, slow, level-up, game-over, new-high,
  and button clicks.
- Sound On/Off toggle (persisted).

### Settings (modal)
- **Difficulty**: Easy / Medium / Hard (starting speed + ramp + combo window).
- **Grid size**: 15×15, 20×20, 25×25.
- **Theme**: Dark / Light.
- **Sound**: On / Off.
- **Reset High Score** (with a custom confirm modal — never `confirm()`).

### Extra
- **Auto-pause** when the browser tab becomes inactive (`visibilitychange`).
- Toast notifications for level-ups and power-ups.
- Animated stat pops on score/level changes.
- Active power-up list with live countdowns.
- Honors `prefers-reduced-motion`.

---

## 🎮 Controls

| Action | Keyboard | Touch |
| ------ | -------- | ----- |
| Move   | Arrow keys **or** `W` `A` `S` `D` | On-screen D-pad **or** swipe on the board |
| Pause / Resume | `P` or `Space` | Pause / Resume buttons |
| Restart | `R` | Restart button |

---

## 🕹️ How to Play

1. Click **Start Game** (or press a direction key).
2. Guide the snake to eat food and grow.
3. Avoid the walls, your own tail, and the gray obstacles (from level 3).
4. Eat quickly to build a **combo multiplier**.
5. Grab golden food for big points and power-up food for temporary effects.
6. Try to beat your high score — it's saved automatically.

---

## 🛠️ Technologies

- **HTML5** — semantic structure + `<canvas>`.
- **CSS3** — custom properties, theming, grid/flex layout, keyframe animations.
- **Vanilla JavaScript (ES2015+)** — game loop with `requestAnimationFrame`.
- **Canvas 2D API** — rendering, gradients, `shadowBlur`, rounded segments.
- **Web Audio API** — oscillator-based procedural sound effects.
- **localStorage** — namespaced persistence for settings + high score.
- **Google Fonts** (Orbitron + Rajdhani) — loaded from CDN, optional.

---

## 🚀 Run Locally

This is a static site — no build step, no dependencies.

**Option A — just open the file**
Double-click `index.html`, or right-click → *Open With → your browser*.

**Option B — local server (recommended)**
A local server avoids any file:// quirks and matches production.

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000/demos/snake-game/

# Node (no install)
npx serve
```

---

## 🌐 Deployment

### GitHub Pages
1. Push this repo to GitHub.
2. **Settings → Pages → Source:** your branch (e.g. `main`) / root (or `/docs`).
3. Your game will be live at
   `https://<your-username>.github.io/<repo>/demos/snake-game/`.

### Vercel (static)
1. Import the repo at [vercel.com](https://vercel.com).
2. Framework preset: **Other**. Build command: *(none)*. Output directory: the
   repo root (or the `demos/snake-game` folder).
3. Deploy — Vercel serves the static files as-is.

### Netlify / Cloudflare Pages / any static host
Drag-and-drop the folder, or connect the repo. No configuration needed.

---

## 📁 Project Structure

```
snake-game/
├── index.html   # markup, overlay screens, modals, dpad
├── style.css    # theming tokens, layout, animations, responsive rules
├── script.js    # game loop, rendering, input, sound, state, persistence
└── README.md    # this file
```

---

## ♿ Accessibility & Performance

- Keyboard-navigable buttons; ARIA labels on icon buttons and dialogs.
- `aria-live` toast + effects regions.
- Respects `prefers-reduced-motion`.
- Canvas sized with `devicePixelRatio` for crisp rendering (capped for perf).
- Lightweight: a few KB of JS, no runtime dependencies.

---

Enjoy the game. 🐍
