/* ============================================================
   Snake Neon — vanilla JS game logic
   States: welcome | playing | paused | gameover | newhigh
   Features: power-ups, combos, obstacles, levels, sound, themes
   No external deps. Sounds via Web Audio API.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Constants ---------------- */
  const STORAGE_PREFIX = "snake-game:"; // namespaced localStorage keys
  const KEYS = {
    highScore: STORAGE_PREFIX + "highscore",
    sound: STORAGE_PREFIX + "sound",
    theme: STORAGE_PREFIX + "theme",
    difficulty: STORAGE_PREFIX + "difficulty",
    gridSize: STORAGE_PREFIX + "gridsize",
  };

  const STATE = {
    WELCOME: "welcome",
    PLAYING: "playing",
    PAUSED: "paused",
    GAMEOVER: "gameover",
    NEWHIGH: "newhigh",
  };

  const DIR = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  // Base tick interval (ms) per difficulty before level scaling.
  const DIFFICULTY = {
    easy:   { baseMs: 170, msStep: 6,  minMs: 90, comboWindow: 1800 },
    medium: { baseMs: 135, msStep: 8,  minMs: 70, comboWindow: 1400 },
    hard:   { baseMs: 105, msStep: 10, minMs: 55, comboWindow: 1100 },
  };

  // Food types
  const FOOD = {
    APPLE: "apple",     // +10
    GOLD: "gold",       // +50, time-limited
    BOOST: "boost",     // temporary speed increase
    SLOW: "slow",       // temporary slow-motion
  };

  const FOOD_POINTS = { apple: 10, gold: 50, boost: 15, slow: 15 };

  // Power-up durations (ms)
  const POWER_DURATION = { boost: 4000, slow: 5000, gold: 7000 };

  /* ---------------- DOM ---------------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    canvas: $("game"),
    boardFrame: $("board-frame"),
    overlay: $("overlay"),
    // screens
    welcome: $("screen-welcome"),
    paused: $("screen-paused"),
    gameover: $("screen-gameover"),
    newhigh: $("screen-newhigh"),
    // stat display
    highScore: $("high-score"),
    score: $("score"),
    level: $("level"),
    speed: $("speed"),
    difficultyDisplay: $("difficulty-display"),
    // combo
    comboMeter: $("combo-meter"),
    comboLabel: $("combo-label"),
    comboBarFill: $("combo-bar-fill"),
    // result screens
    resultScore: $("result-score"),
    resultHigh: $("result-high"),
    newhighScore: $("newhigh-score"),
    // toast
    toast: $("toast"),
    // buttons
    btnStart: $("btn-start"),
    btnPlay: $("btn-play"),
    btnPause: $("btn-pause"),
    btnResume: $("btn-resume"),
    btnRestart: $("btn-restart"),
    btnQuit: $("btn-quit"),
    btnPlayAgain: $("btn-play-again"),
    btnHome: $("btn-home"),
    btnNewhighAgain: $("btn-newhigh-again"),
    btnNewhighHome: $("btn-newhigh-home"),
    // topbar
    soundToggle: $("sound-toggle"),
    soundIcon: $("sound-icon"),
    themeToggle: $("theme-toggle"),
    themeIcon: $("theme-icon"),
    settingsToggle: $("settings-toggle"),
    // dpad
    dpadUp: $("dpad-up"),
    dpadDown: $("dpad-down"),
    dpadLeft: $("dpad-left"),
    dpadRight: $("dpad-right"),
    // effects
    effectsList: $("effects-list"),
    // settings modal
    settingsModal: $("settings-modal"),
    settingsBackdrop: $("settings-backdrop"),
    settingsClose: $("settings-close"),
    setDifficulty: $("set-difficulty"),
    setGrid: $("set-grid"),
    setTheme: $("set-theme"),
    setSound: $("set-sound"),
    btnResetHigh: $("btn-reset-high"),
    // confirm modal
    confirmModal: $("confirm-modal"),
    confirmBackdrop: $("confirm-backdrop"),
    confirmTitle: $("confirm-title"),
    confirmText: $("confirm-text"),
    confirmCancel: $("confirm-cancel"),
    confirmOk: $("confirm-ok"),
    goldPoints: $("gold-points"),
  };

  const ctx = el.canvas.getContext("2d");

  /* ---------------- Game state ---------------- */
  const game = {
    state: STATE.WELCOME,
    gridSize: 20,             // cells per side
    cell: 0,                  // pixel size of a cell (computed)
    snake: [],                // array of {x,y}, head = [0]
    dir: DIR.right,
    pendingDir: DIR.right,
    food: null,               // {x,y,type}
    secondaryFood: null,      // optional time-limited food
    obstacles: [],            // [{x,y}]
    score: 0,
    highScore: 0,
    level: 1,
    difficulty: "medium",
    baseInterval: DIFFICULTY.medium.baseMs,
    currentInterval: DIFFICULTY.medium.baseMs,
    minInterval: DIFFICULTY.medium.minMs,
    lastTick: 0,
    rafId: 0,
    // combo
    combo: 1,
    comboTimer: 0,            // ms remaining to keep combo
    // power-ups
    powerBoostUntil: 0,
    powerSlowUntil: 0,
    // particles
    particles: [],
    // food spawn helpers
    foodPulse: 0,
    secondarySpawnAt: 0,      // timestamp to consider spawning secondary
    secondaryExpiresAt: 0,    // timestamp when current secondary disappears
    // visibility autopause
    wasPlayingBeforeHidden: false,
  };

  let settings = {
    sound: true,
    theme: "dark",
    difficulty: "medium",
    gridSize: 20,
  };

  /* ---------------- Persistence ---------------- */
  function loadSettings() {
    try {
      const s = (v, d) => (v === null ? d : v);
      settings.sound = String(localStorage.getItem(KEYS.sound)) !== "false";
      settings.theme = s(localStorage.getItem(KEYS.theme), "dark");
      settings.difficulty = s(localStorage.getItem(KEYS.difficulty), "medium");
      settings.gridSize = parseInt(s(localStorage.getItem(KEYS.gridSize), "20"), 10);
      if (!DIFFICULTY[settings.difficulty]) settings.difficulty = "medium";
      if (![15, 20, 25].includes(settings.gridSize)) settings.gridSize = 20;
      game.highScore = parseInt(s(localStorage.getItem(KEYS.highScore), "0"), 10) || 0;
    } catch (e) {
      // localStorage may be unavailable; fall back to defaults silently
    }
  }
  function saveSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  /* ---------------- Web Audio (sound) ---------------- */
  let audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  // Play a short oscillator-driven beep with an optional frequency sweep.
  function beep(opts) {
    if (!settings.sound) return;
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    const {
      freq = 440, toFreq = null, type = "sine",
      duration = 0.12, volume = 0.18, delay = 0,
    } = opts || {};
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
  const SFX = {
    eat: () => beep({ freq: 520, toFreq: 760, type: "square", duration: 0.1, volume: 0.16 }),
    gold: () => {
      beep({ freq: 660, toFreq: 990, type: "triangle", duration: 0.12, volume: 0.18 });
      beep({ freq: 880, toFreq: 1320, type: "triangle", duration: 0.12, volume: 0.16, delay: 0.1 });
    },
    boost: () => beep({ freq: 300, toFreq: 900, type: "sawtooth", duration: 0.18, volume: 0.14 }),
    slow: () => beep({ freq: 700, toFreq: 220, type: "sine", duration: 0.22, volume: 0.14 }),
    levelUp: () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        beep({ freq: f, type: "triangle", duration: 0.12, volume: 0.16, delay: i * 0.08 }));
    },
    gameOver: () => {
      [440, 349, 261, 174].forEach((f, i) =>
        beep({ freq: f, type: "sawtooth", duration: 0.18, volume: 0.16, delay: i * 0.1 }));
    },
    newHigh: () => {
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        beep({ freq: f, type: "triangle", duration: 0.14, volume: 0.18, delay: i * 0.09 }));
    },
    click: () => beep({ freq: 420, toFreq: 520, type: "square", duration: 0.05, volume: 0.1 }),
  };

  /* ---------------- Helpers ---------------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function now() { return performance.now(); }
  function cellsEqual(a, b) { return a && b && a.x === b.x && a.y === b.y; }
  function randInt(n) { return Math.floor(Math.random() * n); }

  /* ---------------- Canvas sizing ---------------- */
  function resizeCanvas() {
    const rect = el.canvas.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    // Use device pixels for crispness, capped for perf.
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    el.canvas.width = Math.floor(size * dpr);
    el.canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.cell = size / game.gridSize;
    draw();
  }

  /* ---------------- Cell occupancy ---------------- */
  function isOccupied(x, y, includeFood) {
    for (let i = 0; i < game.snake.length; i++) {
      if (game.snake[i].x === x && game.snake[i].y === y) return true;
    }
    for (let i = 0; i < game.obstacles.length; i++) {
      if (game.obstacles[i].x === x && game.obstacles[i].y === y) return true;
    }
    if (includeFood) {
      if (game.food && game.food.x === x && game.food.y === y) return true;
      if (game.secondaryFood && game.secondaryFood.x === x && game.secondaryFood.y === y) return true;
    }
    return false;
  }

  function randomEmptyCell() {
    // Fallback-friendly: try random sampling, then exhaustive scan.
    const N = game.gridSize;
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = randInt(N), y = randInt(N);
      if (!isOccupied(x, y, true)) return { x, y };
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!isOccupied(x, y, true)) return { x, y };
      }
    }
    return null;
  }

  /* ---------------- Game setup ---------------- */
  function configureDifficulty() {
    const d = DIFFICULTY[settings.difficulty];
    game.difficulty = settings.difficulty;
    game.baseInterval = d.baseMs;
    game.minInterval = d.minMs;
    game.currentInterval = computeInterval();
    el.difficultyDisplay.textContent =
      settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1);
  }

  function computeInterval() {
    const d = DIFFICULTY[settings.difficulty];
    // Decrease interval (faster) as level rises.
    let interval = d.baseMs - (game.level - 1) * d.msStep;
    interval = Math.max(d.minMs, interval);
    // Power-ups temporarily modify the effective interval (applied in loop).
    return interval;
  }

  function resetGame() {
    const N = game.gridSize;
    const mid = Math.floor(N / 2);
    game.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    game.dir = DIR.right;
    game.pendingDir = DIR.right;
    game.obstacles = [];
    game.score = 0;
    game.level = 1;
    game.combo = 1;
    game.comboTimer = 0;
    game.particles = [];
    game.powerBoostUntil = 0;
    game.powerSlowUntil = 0;
    game.secondaryFood = null;
    game.secondarySpawnAt = now() + 6000 + Math.random() * 4000;
    game.secondaryExpiresAt = 0;
    configureDifficulty();
    spawnFood();
    updateHUD();
    renderEffects();
  }

  function spawnFood() {
    const cell = randomEmptyCell();
    if (!cell) return;
    game.food = { x: cell.x, y: cell.y, type: FOOD.APPLE };
  }

  // Occasionally spawn a secondary (special) food.
  function maybeSpawnSecondary() {
    if (game.secondaryFood) return;
    if (now() < game.secondarySpawnAt) return;
    // Choose a type: gold / boost / slow
    const r = Math.random();
    let type;
    if (r < 0.5) type = FOOD.GOLD;
    else if (r < 0.78) type = FOOD.BOOST;
    else type = FOOD.SLOW;
    const cell = randomEmptyCell();
    if (!cell) return;
    game.secondaryFood = { x: cell.x, y: cell.y, type };
    game.secondaryExpiresAt = now() + POWER_DURATION[type === FOOD.GOLD ? "gold" : "boost"];
  }

  // Obstacles appear from level 3 and grow slightly with level.
  function rebuildObstacles() {
    game.obstacles = [];
    if (game.level < 3) return;
    const N = game.gridSize;
    const count = Math.min(6, game.level - 1); // 2 at L3, ..., capped at 6
    let placed = 0, attempts = 0;
    while (placed < count && attempts < 300) {
      attempts++;
      const x = randInt(N);
      const y = randInt(N);
      // Keep clear of center spawn row and existing entities.
      const mid = Math.floor(N / 2);
      if (Math.abs(y - mid) < 2 && x < mid + 4 && x > mid - 6) continue;
      if (isOccupied(x, y, true)) continue;
      game.obstacles.push({ x, y });
      placed++;
    }
  }

  /* ---------------- Direction handling ---------------- */
  function setDirection(name) {
    const next = DIR[name];
    if (!next) return;
    // Prevent 180° reversal relative to current committed direction.
    if (next.x === -game.dir.x && next.y === -game.dir.y) return;
    game.pendingDir = next;
  }

  /* ---------------- Main loop ---------------- */
  function effectiveInterval() {
    let interval = game.currentInterval;
    const t = now();
    if (t < game.powerBoostUntil) interval = Math.max(40, interval * 0.55);
    if (t < game.powerSlowUntil) interval = interval * 1.7;
    return interval;
  }

  function loop(ts) {
    game.rafId = requestAnimationFrame(loop);
    const interval = effectiveInterval();
    if (game.state === STATE.PLAYING && ts - game.lastTick >= interval) {
      game.lastTick = ts;
      tick();
    }
    // Combo decay
    if (game.state === STATE.PLAYING && game.combo > 1) {
      const d = DIFFICULTY[settings.difficulty].comboWindow;
      game.comboBarValue = clamp(game.comboTimer / d, 0, 1);
      el.comboBarFill.style.width = (game.comboBarValue * 100) + "%";
      if (game.comboTimer <= 0) {
        game.combo = 1;
        el.comboMeter.classList.remove("is-active");
      }
    }
    updateEffectsList();
    draw(ts);
  }

  function tick() {
    // Commit pending direction (validated again to avoid double-turn self-kill).
    game.dir = game.pendingDir;

    const head = game.snake[0];
    const nx = head.x + game.dir.x;
    const ny = head.y + game.dir.y;
    const N = game.gridSize;

    // Wall collision
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) {
      return endGame();
    }
    // Obstacle collision
    for (let i = 0; i < game.obstacles.length; i++) {
      if (game.obstacles[i].x === nx && game.obstacles[i].y === ny) return endGame();
    }
    // Self collision (ignore the tail cell since it will move, unless growing)
    const willEat = (game.food && nx === game.food.x && ny === game.food.y) ||
      (game.secondaryFood && nx === game.secondaryFood.x && ny === game.secondaryFood.y);
    const bodyEnd = willEat ? game.snake.length : game.snake.length - 1;
    for (let i = 0; i < bodyEnd; i++) {
      if (game.snake[i].x === nx && game.snake[i].y === ny) return endGame();
    }

    // Move head
    game.snake.unshift({ x: nx, y: ny });

    // Eating?
    if (game.food && nx === game.food.x && ny === game.food.y) {
      onEat(game.food, false);
      spawnFood();
    } else if (game.secondaryFood && nx === game.secondaryFood.x && ny === game.secondaryFood.y) {
      onEat(game.secondaryFood, true);
      game.secondaryFood = null;
      game.secondaryExpiresAt = 0;
      game.secondarySpawnAt = now() + 7000 + Math.random() * 5000;
    } else {
      game.snake.pop(); // not eating: drop the tail
    }

    // Expire uneaten secondary food
    if (game.secondaryFood && now() > game.secondaryExpiresAt) {
      game.secondaryFood = null;
      game.secondarySpawnAt = now() + 7000 + Math.random() * 5000;
    }

    // Maybe spawn a new secondary food
    maybeSpawnSecondary();

    // Combo timer countdown (called each tick; approximated)
    if (game.comboTimer > 0) {
      game.comboTimer -= intervalApprox();
      if (game.comboTimer <= 0) {
        game.combo = 1;
        el.comboMeter.classList.remove("is-active");
      }
    }

    updateHUD();
  }

  function intervalApprox() {
    return effectiveInterval();
  }

  /* ---------------- Eating / scoring ---------------- */
  function onEat(foodItem, isSpecial) {
    const base = FOOD_POINTS[foodItem.type] || 10;
    // Combo multiplier (only meaningful for normal apple chains)
    let gained = base;
    if (foodItem.type === FOOD.APPLE) {
      game.comboTimer = DIFFICULTY[settings.difficulty].comboWindow;
      if (game.combo < 1) game.combo = 1;
      gained = Math.round(base * game.combo);
      game.combo = Math.min(8, game.combo + 1);
      if (game.combo > 1) {
        el.comboMeter.classList.add("is-active");
        el.comboLabel.textContent = "Combo x" + game.combo;
      }
    }

    game.score += gained;
    popStat(el.score);
    spawnParticles(foodItem.x, foodItem.y, foodItem.type);
    el.boardFrame.classList.remove("is-eating");
    void el.boardFrame.offsetWidth; // reflow to restart animation
    el.boardFrame.classList.add("is-eating");

    // Apply power-up effects + sounds
    const t = now();
    if (foodItem.type === FOOD.GOLD) {
      SFX.gold();
      showToast("+" + gained + "  Golden!");
    } else if (foodItem.type === FOOD.BOOST) {
      SFX.boost();
      game.powerBoostUntil = t + POWER_DURATION.boost;
      showToast("Speed Boost!");
    } else if (foodItem.type === FOOD.SLOW) {
      SFX.slow();
      game.powerSlowUntil = t + POWER_DURATION.slow;
      showToast("Slow Motion!");
    } else {
      SFX.eat();
    }

    // Level progression every 50 points.
    const newLevel = Math.floor(game.score / 50) + 1;
    if (newLevel > game.level) {
      game.level = newLevel;
      game.currentInterval = computeInterval();
      rebuildObstacles();
      SFX.levelUp();
      showToast("Level " + game.level + "!");
      popStat(el.level);
    }
    updateHUD();
  }

  function popStat(node) {
    node.classList.remove("is-pop");
    void node.offsetWidth;
    node.classList.add("is-pop");
  }

  /* ---------------- Particles ---------------- */
  function spawnParticles(cx, cy, type) {
    const colors = {
      apple: ["#f87171", "#fca5a5", "#fecaca"],
      gold: ["#fbbf24", "#fde68a", "#f59e0b"],
      boost: ["#fb923c", "#fdba74", "#f97316"],
      slow: ["#a78bfa", "#c4b5fd", "#8b5cf6"],
    };
    const palette = colors[type] || colors.apple;
    const count = type === "gold" ? 18 : 12;
    const px = (cx + 0.5) * game.cell;
    const py = (cy + 0.5) * game.cell;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1.2 + Math.random() * 2.2;
      game.particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: palette[i % palette.length],
      });
    }
  }

  function updateParticles() {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // slight gravity
      p.life -= p.decay;
      if (p.life <= 0) game.particles.splice(i, 1);
    }
  }

  /* ---------------- End game ---------------- */
  function endGame() {
    game.state = STATE.GAMEOVER;
    SFX.gameOver();
    el.boardFrame.classList.add("is-shaking");
    setTimeout(() => el.boardFrame.classList.remove("is-shaking"), 450);

    const isNewHigh = game.score > game.highScore;
    if (isNewHigh) {
      game.highScore = game.score;
      saveSetting(KEYS.highScore, String(game.highScore));
    }
    el.resultScore.textContent = game.score;
    el.resultHigh.textContent = game.highScore;
    el.newhighScore.textContent = game.score;

    if (isNewHigh && game.score > 0) {
      game.state = STATE.NEWHIGH;
      SFX.newHigh();
      showOverlayScreen(STATE.NEWHIGH);
    } else {
      showOverlayScreen(STATE.GAMEOVER);
    }
    setControlButtons();
    updateHUD();
  }

  /* ---------------- HUD ---------------- */
  function updateHUD() {
    el.score.textContent = game.score;
    el.highScore.textContent = game.highScore;
    el.level.textContent = game.level;
    // Show speed as a friendly tier number.
    const d = DIFFICULTY[settings.difficulty];
    const speedTier = clamp(Math.round((d.baseMs - game.currentInterval) / d.msStep) + 1, 1, 99);
    el.speed.textContent = speedTier;
    el.goldPoints.textContent = "+" + FOOD_POINTS.gold;
  }

  /* ---------------- Active effects list ---------------- */
  function updateEffectsList() {
    renderEffects(); // cheap re-render each frame is fine
  }
  function renderEffects() {
    const items = [];
    const t = now();
    if (t < game.powerBoostUntil) {
      items.push({ icon: "⚡", label: "Speed Boost", remain: Math.ceil((game.powerBoostUntil - t) / 1000) });
    }
    if (t < game.powerSlowUntil) {
      items.push({ icon: "🐢", label: "Slow-Mo", remain: Math.ceil((game.powerSlowUntil - t) / 1000) });
    }
    if (game.secondaryFood) {
      const remain = Math.max(0, Math.ceil((game.secondaryExpiresAt - t) / 1000));
      const label = game.secondaryFood.type === FOOD.GOLD ? "Golden Apple" :
        game.secondaryFood.type === FOOD.BOOST ? "Boost Food" : "Slow Food";
      const icon = game.secondaryFood.type === FOOD.GOLD ? "🌟" :
        game.secondaryFood.type === FOOD.BOOST ? "🔥" : "💧";
      items.push({ icon, label, remain });
    }
    if (items.length === 0) {
      el.effectsList.innerHTML = '<li class="effects-empty">No active power-ups</li>';
      return;
    }
    el.effectsList.innerHTML = items.map((it) =>
      '<li><span>' + it.icon + "</span><span>" + it.label + "</span>" +
      '<span class="fx-time">' + it.remain + "s</span></li>").join("");
  }

  /* ---------------- Overlay management ---------------- */
  const SCREEN_MAP = {
    welcome: el.welcome,
    paused: el.paused,
    gameover: el.gameover,
    newhigh: el.newhigh,
  };
  function showOverlayScreen(stateKey) {
    Object.keys(SCREEN_MAP).forEach((k) => {
      const node = SCREEN_MAP[k];
      if (k === stateKey) node.classList.remove("overlay-card--hidden");
      else node.classList.add("overlay-card--hidden");
    });
    el.overlay.classList.remove("is-hidden");
  }
  function hideOverlay() {
    el.overlay.classList.add("is-hidden");
  }

  function setState(newState) {
    game.state = newState;
    if (newState === STATE.WELCOME) showOverlayScreen(STATE.WELCOME);
    else if (newState === STATE.PAUSED) showOverlayScreen(STATE.PAUSED);
    else if (newState === STATE.GAMEOVER) showOverlayScreen(STATE.GAMEOVER);
    else if (newState === STATE.NEWHIGH) showOverlayScreen(STATE.NEWHIGH);
    else if (newState === STATE.PLAYING) hideOverlay();
    setControlButtons();
  }

  function setControlButtons() {
    const playing = game.state === STATE.PLAYING;
    const paused = game.state === STATE.PAUSED;
    const stopped = game.state === STATE.WELCOME || game.state === STATE.GAMEOVER || game.state === STATE.NEWHIGH;
    el.btnPlay.disabled = playing || paused;
    el.btnPlay.textContent = stopped ? "Start Game" : (paused ? "Resume" : "Playing");
    el.btnPause.disabled = !playing;
    el.btnPause.textContent = paused ? "Paused" : "Pause";
  }

  /* ---------------- Game flow controls ---------------- */
  function startGame() {
    ensureAudio();
    resetGame();
    rebuildObstacles();
    game.lastTick = now();
    setState(STATE.PLAYING);
    showToast("Go!");
  }
  function pauseGame() {
    if (game.state !== STATE.PLAYING) return;
    setState(STATE.PAUSED);
  }
  function resumeGame() {
    if (game.state !== STATE.PAUSED) return;
    game.lastTick = now();
    setState(STATE.PLAYING);
  }
  function quitToMenu() {
    setState(STATE.WELCOME);
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = 0;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 1400);
  }

  /* ---------------- Confirm modal ---------------- */
  let confirmResolver = null;
  function openConfirm(title, text) {
    return new Promise((resolve) => {
      el.confirmTitle.textContent = title;
      el.confirmText.textContent = text;
      el.confirmModal.setAttribute("aria-hidden", "false");
      confirmResolver = resolve;
    });
  }
  function closeConfirm(value) {
    el.confirmModal.setAttribute("aria-hidden", "true");
    const r = confirmResolver;
    confirmResolver = null;
    if (r) r(value);
  }

  /* ---------------- Settings modal ---------------- */
  function openSettings() {
    el.setDifficulty.value = settings.difficulty;
    el.setGrid.value = String(settings.gridSize);
    el.setTheme.value = settings.theme;
    el.setSound.checked = settings.sound;
    el.settingsModal.setAttribute("aria-hidden", "false");
  }
  function closeSettings() {
    el.settingsModal.setAttribute("aria-hidden", "true");
  }

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    settings.theme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", settings.theme);
    el.themeIcon.textContent = settings.theme === "dark" ? "🌙" : "☀️";
    saveSetting(KEYS.theme, settings.theme);
    draw();
  }
  function toggleTheme() {
    applyTheme(settings.theme === "dark" ? "light" : "dark");
  }

  /* ---------------- Sound toggle ---------------- */
  function applySoundIcon() {
    el.soundIcon.textContent = settings.sound ? "🔊" : "🔇";
  }
  function toggleSound() {
    settings.sound = !settings.sound;
    saveSetting(KEYS.sound, String(settings.sound));
    applySoundIcon();
    el.setSound.checked = settings.sound;
    if (settings.sound) { ensureAudio(); SFX.click(); }
  }

  /* ---------------- Drawing ---------------- */
  function draw(ts) {
    const size = el.canvas.clientWidth;
    if (!size) return;
    const N = game.gridSize;
    const cell = game.cell;
    ctx.clearRect(0, 0, size, size);

    // Board background
    const dark = settings.theme === "dark";
    ctx.fillStyle = dark ? "#060912" : "#f1f5f9";
    ctx.fillRect(0, 0, size, size);

    // Subtle grid lines
    ctx.strokeStyle = dark ? "rgba(56, 189, 248, 0.07)" : "rgba(2, 132, 199, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < N; i++) {
      const p = Math.round(i * cell) + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, size);
      ctx.moveTo(0, p); ctx.lineTo(size, p);
    }
    ctx.stroke();

    // Obstacles
    for (let i = 0; i < game.obstacles.length; i++) {
      drawObstacle(game.obstacles[i], cell, dark);
    }

    // Food (apple)
    if (game.food) drawFood(game.food, cell, ts || 0);
    // Secondary (special) food
    if (game.secondaryFood) drawFood(game.secondaryFood, cell, ts || 0);

    // Snake
    drawSnake(cell, dark);

    // Particles
    updateParticles();
    drawParticles();

    // Slow-mo / boost vignette
    const t = now();
    if (t < game.powerSlowUntil || t < game.powerBoostUntil) {
      const color = t < game.powerSlowUntil ? "rgba(167,139,250,0.10)" : "rgba(251,146,60,0.10)";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size, size);
    }
  }

  function drawObstacle(o, cell, dark) {
    const x = o.x * cell, y = o.y * cell;
    const pad = Math.max(1, cell * 0.08);
    ctx.save();
    ctx.fillStyle = dark ? "#334155" : "#475569";
    ctx.shadowColor = dark ? "rgba(148,163,184,0.5)" : "rgba(71,85,105,0.4)";
    ctx.shadowBlur = 8;
    roundRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, Math.max(2, cell * 0.18));
    ctx.fill();
    // inner highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.25)";
    roundRect(ctx, x + pad + 2, y + pad + 2, cell - pad * 2 - 4, Math.max(2, cell * 0.18), 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFood(food, cell, ts) {
    const pulse = 0.5 + 0.5 * Math.sin((ts || 0) / 180);
    const cx = (food.x + 0.5) * cell;
    const cy = (food.y + 0.5) * cell;
    const baseR = Math.max(2, cell * 0.32);
    const r = baseR * (0.9 + pulse * 0.18);

    let coreColor, glowColor;
    switch (food.type) {
      case FOOD.GOLD:  coreColor = "#fbbf24"; glowColor = "rgba(251,191,36,0.9)"; break;
      case FOOD.BOOST: coreColor = "#fb923c"; glowColor = "rgba(251,146,60,0.9)"; break;
      case FOOD.SLOW:  coreColor = "#a78bfa"; glowColor = "rgba(167,139,250,0.9)"; break;
      default:         coreColor = "#f87171"; glowColor = "rgba(248,113,113,0.9)";
    }

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16 + pulse * 10;
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // inner highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Time-limited ring for special foods
    if (game.secondaryFood && food === game.secondaryFood && game.secondaryExpiresAt) {
      const total = food.type === FOOD.GOLD ? POWER_DURATION.gold : POWER_DURATION.boost;
      const remain = clamp((game.secondaryExpiresAt - now()) / total, 0, 1);
      ctx.strokeStyle = coreColor;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, baseR + Math.max(3, cell * 0.12), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSnake(cell, dark) {
    const len = game.snake.length;
    const boosted = now() < game.powerBoostUntil;
    for (let i = len - 1; i >= 0; i--) {
      const seg = game.snake[i];
      const t = i / Math.max(1, len);
      const x = seg.x * cell, y = seg.y * cell;
      const pad = Math.max(1, cell * 0.06);

      // Gradient from head (cyan) to tail (green)
      const head = [34, 211, 238];   // cyan
      const tail = [52, 211, 153];   // green
      const r = Math.round(head[0] + (tail[0] - head[0]) * t);
      const g = Math.round(head[1] + (tail[1] - head[1]) * t);
      const b = Math.round(head[2] + (tail[2] - head[2]) * t);
      const fill = "rgb(" + r + "," + g + "," + b + ")";

      ctx.save();
      ctx.shadowColor = boosted ? "rgba(251,146,60,0.9)" : "rgba(34,211,238,0.8)";
      ctx.shadowBlur = i === 0 ? 18 : 10;
      ctx.fillStyle = fill;
      const radius = Math.max(2, cell * 0.28);
      roundRect(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, radius);
      ctx.fill();

      // Head eyes
      if (i === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = dark ? "#031018" : "#06283d";
        const ex = cell * 0.18, ey = cell * 0.18;
        const cx = x + cell / 2, cy = y + cell / 2;
        const dx = game.dir.x, dy = game.dir.y;
        const off = cell * 0.16;
        // eye positions perpendicular to direction
        const px = -dy, py = dx;
        ctx.beginPath();
        ctx.arc(cx + dx * off + px * ex, cy + dy * off + py * ey, Math.max(1.2, cell * 0.07), 0, Math.PI * 2);
        ctx.arc(cx + dx * off - px * ex, cy + dy * off - py * ey, Math.max(1.2, cell * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (let i = 0; i < game.particles.length; i++) {
      const p = game.particles[i];
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  /* ---------------- Input ---------------- */
  function handleKey(e) {
    const k = e.key.toLowerCase();
    // Pause/resume shortcuts
    if (k === "p" || k === " ") {
      e.preventDefault();
      if (game.state === STATE.PLAYING) pauseGame();
      else if (game.state === STATE.PAUSED) resumeGame();
      return;
    }
    if (k === "r") {
      e.preventDefault();
      if (game.state !== STATE.WELCOME) startGame();
      return;
    }
    let dirName = null;
    if (k === "arrowup" || k === "w") dirName = "up";
    else if (k === "arrowdown" || k === "s") dirName = "down";
    else if (k === "arrowleft" || k === "a") dirName = "left";
    else if (k === "arrowright" || k === "d") dirName = "right";
    if (!dirName) return;
    e.preventDefault();
    if (game.state !== STATE.PLAYING) return;
    setDirection(dirName);
  }

  function wireDpadButton(node, dirName) {
    const trigger = (e) => {
      e.preventDefault();
      ensureAudio();
      if (game.state === STATE.PLAYING) setDirection(dirName);
      else if (game.state === STATE.PAUSED) resumeGame();
    };
    node.addEventListener("touchstart", trigger, { passive: false });
    node.addEventListener("mousedown", trigger);
  }

  // Swipe support on the canvas
  function wireSwipe() {
    let sx = 0, sy = 0, active = false;
    const canvas = el.canvas;
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      active = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener("touchmove", (e) => {
      if (!active || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      const TH = 24;
      if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
      if (game.state === STATE.PLAYING) {
        if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? "right" : "left");
        else setDirection(dy > 0 ? "down" : "up");
      }
      active = false;
    }, { passive: true });
    canvas.addEventListener("touchend", () => { active = false; }, { passive: true });
  }

  /* ---------------- Visibility autopause ---------------- */
  function onVisibilityChange() {
    if (document.hidden) {
      if (game.state === STATE.PLAYING) {
        game.wasPlayingBeforeHidden = true;
        pauseGame();
      } else {
        game.wasPlayingBeforeHidden = false;
      }
    } else if (game.wasPlayingBeforeHidden) {
      game.wasPlayingBeforeHidden = false;
      resumeGame();
    }
  }

  /* ---------------- Event wiring ---------------- */
  function wireEvents() {
    // Keyboard
    window.addEventListener("keydown", handleKey);

    // Top buttons
    el.soundToggle.addEventListener("click", () => { SFX.click(); toggleSound(); });
    el.themeToggle.addEventListener("click", () => { SFX.click(); toggleTheme(); });
    el.settingsToggle.addEventListener("click", () => { SFX.click(); openSettings(); });

    // Game flow buttons
    el.btnStart.addEventListener("click", () => { SFX.click(); startGame(); });
    el.btnPlay.addEventListener("click", () => {
      SFX.click();
      if (game.state === STATE.PAUSED) resumeGame();
      else startGame();
    });
    el.btnPause.addEventListener("click", () => { SFX.click(); pauseGame(); });
    el.btnResume.addEventListener("click", () => { SFX.click(); resumeGame(); });
    el.btnRestart.addEventListener("click", () => { SFX.click(); startGame(); });
    el.btnQuit.addEventListener("click", () => { SFX.click(); quitToMenu(); });
    el.btnPlayAgain.addEventListener("click", () => { SFX.click(); startGame(); });
    el.btnHome.addEventListener("click", () => { SFX.click(); quitToMenu(); });
    el.btnNewhighAgain.addEventListener("click", () => { SFX.click(); startGame(); });
    el.btnNewhighHome.addEventListener("click", () => { SFX.click(); quitToMenu(); });

    // D-pad
    wireDpadButton(el.dpadUp, "up");
    wireDpadButton(el.dpadDown, "down");
    wireDpadButton(el.dpadLeft, "left");
    wireDpadButton(el.dpadRight, "right");

    wireSwipe();

    // Settings modal
    el.settingsClose.addEventListener("click", () => { SFX.click(); closeSettings(); });
    el.settingsBackdrop.addEventListener("click", () => closeSettings());
    el.setDifficulty.addEventListener("change", () => {
      settings.difficulty = el.setDifficulty.value;
      saveSetting(KEYS.difficulty, settings.difficulty);
      if (game.state === STATE.WELCOME) { configureDifficulty(); updateHUD(); }
      SFX.click();
    });
    el.setGrid.addEventListener("change", () => {
      settings.gridSize = parseInt(el.setGrid.value, 10);
      saveSetting(KEYS.gridSize, String(settings.gridSize));
      SFX.click();
      if (game.state === STATE.WELCOME) {
        game.gridSize = settings.gridSize;
        resizeCanvas();
      }
    });
    el.setTheme.addEventListener("change", () => {
      applyTheme(el.setTheme.value);
      SFX.click();
    });
    el.setSound.addEventListener("change", () => {
      settings.sound = el.setSound.checked;
      saveSetting(KEYS.sound, String(settings.sound));
      applySoundIcon();
      if (settings.sound) { ensureAudio(); SFX.click(); }
    });
    el.btnResetHigh.addEventListener("click", async () => {
      SFX.click();
      const ok = await openConfirm("Reset High Score?", "This will permanently clear your saved high score.");
      if (!ok) return;
      game.highScore = 0;
      saveSetting(KEYS.highScore, "0");
      updateHUD();
      showToast("High score reset");
    });

    // Confirm modal
    el.confirmCancel.addEventListener("click", () => { SFX.click(); closeConfirm(false); });
    el.confirmOk.addEventListener("click", () => { SFX.click(); closeConfirm(true); });
    el.confirmBackdrop.addEventListener("click", () => closeConfirm(false));

    // Prevent context menu / scroll on game board for mobile feel
    el.boardFrame.addEventListener("contextmenu", (e) => e.preventDefault());

    // Resize
    window.addEventListener("resize", resizeCanvas);

    // Visibility autopause
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  /* ---------------- Init ---------------- */
  function init() {
    loadSettings();
    game.gridSize = settings.gridSize;
    applyTheme(settings.theme);
    applySoundIcon();
    configureDifficulty();
    el.setDifficulty.value = settings.difficulty;
    el.setGrid.value = String(settings.gridSize);
    el.setTheme.value = settings.theme;
    el.setSound.checked = settings.sound;

    updateHUD();
    showOverlayScreen(STATE.WELCOME);
    setControlButtons();
    wireEvents();
    // Defer canvas sizing until layout is ready
    requestAnimationFrame(() => {
      resizeCanvas();
      game.rafId = requestAnimationFrame(loop);
    });
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
