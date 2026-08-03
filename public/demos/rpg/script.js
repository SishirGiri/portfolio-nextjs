/* ============================================================
 * Terminal RPG -- script.js
 * A self-contained text-adventure engine: procedural dungeon,
 * branching narrative, turn-based combat, inventory, leveling,
 * and localStorage save/load. Pure vanilla JS, no deps.
 * ============================================================ */

(() => {
  "use strict";

  /* ---------------------------------------------------------
   * Constants & data
   * ------------------------------------------------------- */

  const SAVE_KEY = "terminal-rpg-save-v1";

  // Safe localStorage wrapper. Some environments (privacy mode, sandboxed
  // iframes) throw on localStorage access; we degrade gracefully to no-op.
  const store = {
    _ok: (() => {
      try {
        const t = "__trpg_test__";
        window.localStorage.setItem(t, "1");
        window.localStorage.removeItem(t);
        return true;
      } catch (_) {
        return false;
      }
    })(),
    get(key) {
      if (!this._ok) return null;
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, val) {
      if (!this._ok) return false;
      try { window.localStorage.setItem(key, val); return true; } catch (_) { return false; }
    }
  };

  // Item catalogue. kind: weapon | armor | potion | key | misc
  const ITEMS = {
    fists:     { name: "Fists",      kind: "weapon", atk: 2 },
    rusty:     { name: "Rusty Sword", kind: "weapon", atk: 5 },
    iron:      { name: "Iron Blade",  kind: "weapon", atk: 9 },
    rags:      { name: "Rags",        kind: "armor",  def: 0 },
    leather:   { name: "Leather Vest",kind: "armor",  def: 2 },
    shield:    { name: "Oak Shield",  kind: "armor",  def: 4 },
    potion:    { name: "Health Potion", kind: "potion", heal: 10 },
    key:       { name: "Rusty Key",   kind: "key" },
    gold:      { name: "Gold",        kind: "misc" }
  };

  // Enemy templates. Scaled slightly by dungeon depth.
  const ENEMIES = {
    goblin:  { name: "Goblin Scout", hp: 10, atk: 4,  xp: 6,  gold: [3, 8],  loot: ["potion"] },
    wolf:    { name: "Dire Wolf",    hp: 14, atk: 6,  xp: 9,  gold: [2, 6],  loot: [] },
    skeleton:{ name: "Skeleton",     hp: 12, atk: 7,  xp: 10, gold: [4, 10], loot: ["rusty"] },
    ogre:    { name: "Cave Ogre",    hp: 24, atk: 9,  xp: 18, gold: [8, 18], loot: ["potion", "leather"] },
    wraith:  { name: "Pale Wraith",  hp: 18, atk: 8,  xp: 16, gold: [6, 14], loot: ["iron"] },
    dragon:  { name: "Young Dragon", hp: 40, atk: 12, xp: 50, gold: [40, 80],loot: ["iron", "shield"] }
  };

  /* ---------------------------------------------------------
   * Game state
   * ------------------------------------------------------- */

  const defaultPlayer = () => ({
    name: "Wanderer",
    level: 1,
    xp: 0,
    hp: 20, maxHp: 20,
    baseAtk: 2, baseDef: 0,
    weapon: "fists",
    armor: "rags",
    gold: 0,
    inv: { potion: 1 } // start with one potion
  });

  // XP needed to advance FROM the given level to the next.
  const xpForLevel = (lvl) => 10 + (lvl - 1) * 8;

  // Mutable game state.
  let state = {
    player: defaultPlayer(),
    dungeon: null,        // procedural layout
    roomId: null,         // current room id
    log: [],              // combat log lines
    combat: null,         // active combat state or null
    over: false,          // game-over flag
    awaitingChoice: null  // { resolve } when waiting on a numbered choice
  };

  /* ---------------------------------------------------------
   * DOM helpers
   * ------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);
  const el = {
    story:    $("story"),
    options:  $("options"),
    map:      $("map"),
    log:      $("log"),
    inv:      $("inventory"),
    cmd:      $("cmd"),
    btnNew:   $("btn-new"),
    btnSave:  $("btn-save"),
    btnLoad:  $("btn-load"),
    btnRest:  $("btn-restart"),
    btnHelp:  $("btn-help"),
    // stats
    name: $("s-name"), level: $("s-level"), hp: $("s-hp"), xp: $("s-xp"),
    atk: $("s-atk"), def: $("s-def"), gold: $("s-gold"), room: $("s-room"),
    barHp: $("bar-hp"), barXp: $("bar-xp"),
    eqW: $("eq-weapon"), eqA: $("eq-armor")
  };

  /** Append typed text/HTML to the story viewport and auto-scroll. */
  function say(html = "", cls = "") {
    const node = document.createElement("div");
    if (cls) node.className = cls;
    node.innerHTML = html;
    el.story.appendChild(node);
    el.story.scrollTop = el.story.scrollHeight;
  }

  /** Push a colored line to the combat log. */
  function logLine(text, cls = "sys") {
    state.log.push({ text, cls });
    if (state.log.length > 60) state.log.shift();
    renderLog();
  }

  function renderLog() {
    el.log.innerHTML = "";
    for (const l of state.log.slice(-25)) {
      const d = document.createElement("div");
      d.className = l.cls;
      d.textContent = l.text;
      el.log.appendChild(d);
    }
    el.log.scrollTop = el.log.scrollHeight;
  }

  /* ---------------------------------------------------------
   * RNG helpers
   * ------------------------------------------------------- */
  const rnd  = (n) => Math.floor(Math.random() * n);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rnd(arr.length)];
  const chance = (p) => Math.random() < p;

  /* ---------------------------------------------------------
   * Procedural dungeon generation
   *
   * Builds a 4x4 grid of rooms, carves random connections so
   * every room is reachable (spanning tree + a few extra loops),
   * then scatters enemies, chests, NPCs, and special rooms.
   * Each room stores typed flavor + choices so the story itself
   * is data-driven and changes every run.
   * ------------------------------------------------------- */

  const ROOM_W = 4, ROOM_H = 4;

  // Room "biomes" / types. Each gives different choices & content.
  const ROOM_TYPES = ["forest", "cave", "ruin", "crypt", "river", "clearing"];

  const ROOM_FLAVOR = {
    forest: {
      title: "Whispering Forest",
      desc: "Pale moss clings to gnarled oaks. The canopy chokes out the moon, and something <span class='dim'>watches</span> from between the trunks."
    },
    cave: {
      title: "Dripping Cave",
      desc: "Water echoes off wet limestone. Phosphorescent fungus glows faint blue along the walls, revealing a narrow passage ahead."
    },
    ruin: {
      title: "Sunken Ruins",
      desc: "Broken pillars jut from the earth like rotten teeth. Faded runes warn of <span class='enemy'>old gods</span> and older bargains."
    },
    crypt: {
      title: "Dustfall Crypt",
      desc: "A cold draft carries the smell of dust and bone. Sarcophagi line the walls; one lid is slightly ajar."
    },
    river: {
      title: "Blackwater Bend",
      desc: "A slow river of ink-black water slides past. A rotting rope bridge spans it, and fish the size of dogs ripple the surface."
    },
    clearing: {
      title: "Silent Clearing",
      desc: "A ring of toadstools surrounds a patch of unnaturally green grass. Fireflies hover, motionless, as if frozen."
    }
  };

  function generateDungeon() {
    const rooms = {};
    // 1. Create grid of rooms.
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) {
        const id = `${x},${y}`;
        rooms[id] = {
          id, x, y,
          type: pick(ROOM_TYPES),
          seen: false,
          exits: { n: false, s: false, e: false, w: false },
          content: null,   // 'enemy:kind' | 'chest:items' | 'npc' | 'shrine' | 'boss' | null
          cleared: false
        };
      }
    }

    // 2. Carve a random spanning tree (randomized DFS) so all rooms connect.
    const start = "0,0";
    const visited = new Set([start]);
    const stack = [start];
    const dirs = [
      ["n", 0, -1, "s"],
      ["s", 0,  1, "n"],
      ["e", 1,  0, "w"],
      ["w",-1,  0, "e"]
    ];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const [cx, cy] = cur.split(",").map(Number);
      const opts = dirs
        .map(([d, dx, dy, o]) => {
          const nx = cx + dx, ny = cy + dy;
          const nid = `${nx},${ny}`;
          return (nx >= 0 && nx < ROOM_W && ny >= 0 && ny < ROOM_H && !visited.has(nid))
            ? { d, o, nid } : null;
        })
        .filter(Boolean);
      if (opts.length) {
        const c = pick(opts);
        rooms[cur].exits[c.d] = true;
        rooms[c.nid].exits[c.o] = true;
        visited.add(c.nid);
        stack.push(c.nid);
      } else {
        stack.pop();
      }
    }

    // 3. Add a handful of extra loops for non-linearity.
    const loopCount = rand(3, 5);
    for (let i = 0; i < loopCount; i++) {
      const x = rnd(ROOM_W), y = rnd(ROOM_H);
      const id = `${x},${y}`;
      const c = pick(dirs);
      const nx = x + c[1], ny = y + c[2];
      if (nx >= 0 && nx < ROOM_W && ny >= 0 && ny < ROOM_H) {
        rooms[id].exits[c[0]] = true;
        rooms[`${nx},${ny}`].exits[c[3]] = true;
      }
    }

    // 4. Place boss in the farthest room (bottom-right area).
    const bossId = `${ROOM_W - 1},${ROOM_H - 1}`;
    rooms[bossId].type = "crypt";
    rooms[bossId].content = "boss";

    // 5. Scatter content into the remaining rooms.
    const ids = Object.keys(rooms).filter(id => id !== bossId && id !== start);
    // Shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const enemyPool = ["goblin", "wolf", "skeleton", "wraith", "goblin", "wolf"];
    let idx = 0;
    // ~45% of rooms get an enemy
    const enemyCount = Math.floor(ids.length * 0.45);
    for (let i = 0; i < enemyCount && idx < ids.length; i++, idx++) {
      rooms[ids[idx]].content = "enemy:" + pick(enemyPool);
    }
    // ~20% get a chest
    const chestCount = Math.max(2, Math.floor(ids.length * 0.2));
    for (let i = 0; i < chestCount && idx < ids.length; i++, idx++) {
      rooms[ids[idx]].content = "chest";
    }
    // one NPC (merchant/hermit)
    if (idx < ids.length) { rooms[ids[idx]].content = "npc"; idx++; }
    // one shrine (heal/level bonus)
    if (idx < ids.length) { rooms[ids[idx]].content = "shrine"; idx++; }

    // 6. Starting room is a safe clearing.
    rooms[start].type = "clearing";
    rooms[start].seen = true;

    return { rooms, start, bossId, w: ROOM_W, h: ROOM_H };
  }

  /** Render the dungeon as an ASCII map. */
  function renderMap() {
    if (!state.dungeon) { el.map.textContent = ""; return; }
    const d = state.dungeon;
    const cellW = 5, cellH = 3;
    const rows = d.h * cellH;
    const cols = d.w * cellW;
    // build a char grid
    const grid = Array.from({ length: rows }, () => Array(cols).fill(" "));

    const setContentGlyph = (room) => {
      if (room.id === d.bossId && !room.cleared) return "D"; // dragon/boss
      if (room.content && room.content.startsWith("enemy") && !room.cleared) return "e";
      if (room.content === "chest"   && !room.cleared) return "c";
      if (room.content === "npc"     && !room.cleared) return "N";
      if (room.content === "shrine"  && !room.cleared) return "S";
      return ".";
    };

    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        const id = `${x},${y}`;
        const r = d.rooms[id];
        const gx = x * cellW, gy = y * cellH;
        const cx = gx + 2, cy = gy + 1; // center of cell
        const glyph = r.seen ? setContentGlyph(r) : " ";
        const cls = (id === state.roomId) ? "here" : (r.seen ? "seen" : "wall");
        // mark center glyph with a data attribute via wrapping span later; here we just store char + class
        grid[gy + 1][gx + 2] = `\u0001${cls}\u0001${glyph}`;

        // walls/borders + passages
        // top border (north wall unless exit)
        for (let i = 0; i < cellW; i++) {
          if (grid[gy][gx + i] === " ") grid[gy][gx + i] = (i === 2 && r.exits.n) ? " " : "\u0001wall\u0001#";
        }
        // bottom border
        for (let i = 0; i < cellW; i++) {
          if (grid[gy + cellH - 1] && grid[gy + cellH - 1][gx + i] === " ")
            grid[gy + cellH - 1][gx + i] = (i === 2 && r.exits.s) ? " " : "\u0001wall\u0001#";
        }
        // left border
        for (let j = 0; j < cellH; j++) {
          if (grid[gy + j] && grid[gy + j][gx] === " ")
            grid[gy + j][gx] = (j === 1 && r.exits.w) ? " " : "\u0001wall\u0001#";
        }
        // right border
        for (let j = 0; j < cellH; j++) {
          if (grid[gy + j] && grid[gy + j][gx + cellW - 1] === " ")
            grid[gy + j][gx + cellW - 1] = (j === 1 && r.exits.e) ? " " : "\u0001wall\u0001#";
        }
      }
    }

    // Convert grid -> HTML with spans for color classes.
    let html = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = grid[y][x];
        if (typeof ch === "string" && ch.startsWith("\u0001")) {
          const [, cls, glyph] = ch.split("\u0001");
          html += `<span class="${cls}">${glyph}</span>`;
        } else {
          html += ch;
        }
      }
      html += "\n";
    }
    el.map.innerHTML = html;
  }

  /* ---------------------------------------------------------
   * Side panel rendering
   * ------------------------------------------------------- */
  function renderStats() {
    const p = state.player;
    el.name.textContent  = p.name;
    el.level.textContent = p.level;
    el.hp.textContent    = `${Math.max(0, p.hp)} / ${p.maxHp}`;
    const xpNeed = xpForLevel(p.level);
    el.xp.textContent    = `${p.xp} / ${xpNeed}`;
    el.atk.textContent   = totalAtk();
    el.def.textContent   = totalDef();
    el.gold.textContent  = p.gold;
    const room = currentRoom();
    el.room.textContent  = room ? (ROOM_FLAVOR[room.type].title) : "\u2014";
    el.barHp.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
    el.barXp.style.width = `${(p.xp / xpNeed) * 100}%`;
    el.eqW.textContent = ITEMS[p.weapon].name;
    el.eqA.textContent = ITEMS[p.armor].name;
  }

  function totalAtk() {
    const p = state.player;
    return p.baseAtk + ITEMS[p.weapon].atk;
  }
  function totalDef() {
    const p = state.player;
    return p.baseDef + ITEMS[p.armor].def;
  }

  function renderInventory() {
    el.inv.innerHTML = "";
    const inv = state.player.inv;
    const keys = Object.keys(inv).filter(k => inv[k] > 0);
    if (!keys.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.innerHTML = '<span class="iname">(empty)</span>';
      el.inv.appendChild(li);
      return;
    }
    for (const k of keys) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="iname">${ITEMS[k].name}</span><span class="icnt">x${inv[k]}</span>`;
      el.inv.appendChild(li);
    }
  }

  function renderAll() {
    renderStats();
    renderInventory();
    renderMap();
    renderLog();
  }

  /* ---------------------------------------------------------
   * Choice system: numbered options, clickable + typable
   * ------------------------------------------------------- */

  function clearOptions() { el.options.innerHTML = ""; }

  /** Present options as buttons; resolves chosen index 0-based. */
  function presentOptions(promptText, opts) {
    clearOptions();
    if (promptText) say(promptText, "dim");

    return new Promise((resolve) => {
      state.awaitingChoice = { resolve, count: opts.length };
      opts.forEach((label, i) => {
        const b = document.createElement("button");
        b.className = "opt-btn";
        b.innerHTML = `<span class="num">${i + 1}.</span>${label}`;
        b.addEventListener("click", () => choose(i));
        el.options.appendChild(b);
      });
    });
  }

  function choose(idx) {
    if (!state.awaitingChoice) return;
    const { resolve, count } = state.awaitingChoice;
    if (idx < 0 || idx >= count) return;
    state.awaitingChoice = null;
    clearOptions();
    // echo the choice into the story
    say(`&gt; ${idx + 1}`, "dim");
    resolve(idx);
  }

  /* ---------------------------------------------------------
   * Inventory operations
   * ------------------------------------------------------- */
  function addItem(key, qty = 1) {
    state.player.inv[key] = (state.player.inv[key] || 0) + qty;
    renderInventory();
  }
  function removeItem(key, qty = 1) {
    if (!state.player.inv[key]) return false;
    state.player.inv[key] -= qty;
    if (state.player.inv[key] <= 0) delete state.player.inv[key];
    renderInventory();
    return true;
  }
  function hasItem(key) { return (state.player.inv[key] || 0) > 0; }

  function usePotion() {
    if (!hasItem("potion")) {
      say("You have no <span class='item'>Health Potions</span>.", "dim");
      return false;
    }
    removeItem("potion");
    const before = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + ITEMS.potion.heal);
    const gained = state.player.hp - before;
    logLine(`You drink a potion and recover ${gained} HP.`, "heal");
    say(`You quaff a <span class='item'>Health Potion</span> and restore <span class='good'>${gained} HP</span>.`);
    renderStats();
    return true;
  }

  /* ---------------------------------------------------------
   * Combat
   * ------------------------------------------------------- */

  function startCombat(enemyKey) {
    const tpl = ENEMIES[enemyKey];
    // scale slightly with player level for tension
    const scale = 1 + (state.player.level - 1) * 0.08;
    state.combat = {
      key: enemyKey,
      name: tpl.name,
      hp: Math.round(tpl.hp * scale),
      maxHp: Math.round(tpl.hp * scale),
      atk: Math.round(tpl.atk * scale),
      xp: tpl.xp,
      gold: tpl.gold,
      loot: tpl.loot,
      defending: false
    };
  }

  /** A single damage roll: base + 1d(variance). */
  function rollDamage(base, variance) {
    return base + rand(1, Math.max(1, variance));
  }

  async function runCombat() {
    const c = state.combat;
    say(`<span class="hr">---------- COMBAT ----------</span>`);
    say(`A wild <span class='enemy'>${c.name}</span> blocks your path! (HP ${c.hp})`);
    logLine(`Engaged ${c.name} (${c.hp} HP).`, "sys");

    while (c.hp > 0 && state.player.hp > 0) {
      renderStats();
      const choice = await presentOptions(
        `<span class='enemy'>${c.name}</span> HP ${c.hp}/${c.maxHp} &nbsp;|&nbsp; You HP ${Math.max(0, state.player.hp)}/${state.player.maxHp}`,
        ["Attack", "Defend", "Use Item", "Flee"]
      );

      if (choice === 0) await playerAttack();
      else if (choice === 1) { c.defending = true; say("You raise your guard, bracing for impact.", "dim"); }
      else if (choice === 2) {
        const usedPotion = await useItemInCombat();
        if (!usedPotion) continue; // re-prompt if nothing used
      }
      else if (choice === 3) {
        const fled = attemptFlee();
        if (fled) { state.combat = null; return "fled"; }
      }

      // Enemy turn (if still alive)
      if (c.hp > 0) {
        await enemyTurn();
        c.defending = false;
      }
    }

    if (state.player.hp <= 0) {
      state.combat = null;
      return "lose";
    }
    return "win";
  }

  async function playerAttack() {
    const c = state.combat;
    const dmg = rollDamage(totalAtk(), 4);
    // small crit chance
    const crit = chance(0.12);
    const final = crit ? Math.round(dmg * 1.6) : dmg;
    c.hp -= final;
    if (crit) {
      say(`<span class='good'>CRITICAL!</span> Your strike tears into the <span class='enemy'>${c.name}</span> for <span class='enemy'>${final}</span> damage!`);
      logLine(`CRIT! You hit ${c.name} for ${final}.`, "dmg");
    } else {
      say(`You strike the <span class='enemy'>${c.name}</span> for <span class='enemy'>${final}</span> damage.`);
      logLine(`You hit ${c.name} for ${final}.`, "dmg");
    }
    await delay(120);
  }

  async function enemyTurn() {
    const c = state.combat;
    const dmg = rollDamage(c.atk, 3);
    let final = dmg;
    if (c.defending) final = Math.max(1, Math.round(final * 0.5));
    final = Math.max(1, final - totalDef());
    state.player.hp -= final;
    say(`The <span class='enemy'>${c.name}</span> hits you for <span class='enemy'>${final}</span> damage${c.defending ? " (reduced by your guard)" : ""}.`);
    logLine(`${c.name} hit you for ${final}.`, "dmg");
    await delay(120);
  }

  async function useItemInCombat() {
    if (!hasItem("potion")) {
      say("You fumble for an item but find nothing usable.", "dim");
      return false;
    }
    usePotion();
    await delay(120);
    return true;
  }

  function attemptFlee() {
    // 55% chance to flee, lower vs boss
    const c = state.combat;
    const odds = c.key === "dragon" ? 0.2 : 0.55;
    if (chance(odds)) {
      say("You break away and flee into the dark!", "good");
      logLine("Fled from combat.", "sys");
      return true;
    }
    say("You try to flee but stumble! The enemy keeps you cornered.", "dim");
    logLine("Failed to flee.", "sys");
    return false;
  }

  function resolveCombatWin() {
    const c = state.combat;
    const gold = rand(c.gold[0], c.gold[1]);
    state.player.gold += gold;
    say(`<span class='good'>You vanquish the ${c.name}!</span>`);
    logLine(`Defeated ${c.name}. +${c.xp} XP, +${gold} gold.`, "loot");
    say(`You gain <span class='item'>${c.xp} XP</span> and <span class='item'>${gold} gold</span>.`);

    // loot drop
    if (c.loot.length && chance(0.6)) {
      const drop = pick(c.loot);
      addItem(drop);
      say(`It drops a <span class='item'>${ITEMS[drop].name}</span>!`);
      logLine(`Looted ${ITEMS[drop].name}.`, "loot");
    }
    state.combat = null;
    gainXp(c.xp);
  }

  function gainXp(amount) {
    state.player.xp += amount;
    let leveled = false;
    while (state.player.xp >= xpForLevel(state.player.level)) {
      state.player.xp -= xpForLevel(state.player.level);
      state.player.level++;
      const hpUp = 6, atkUp = 1, defUp = 1;
      state.player.maxHp += hpUp;
      state.player.hp = state.player.maxHp; // full heal on level
      state.player.baseAtk += atkUp;
      state.player.baseDef += defUp;
      leveled = true;
      say(`<span class='npc'>*** LEVEL UP! ***</span> You are now level <span class='good'>${state.player.level}</span>. HP +${hpUp}, ATK +${atkUp}, DEF +${defUp}. Fully healed!`);
      logLine(`LEVEL UP to ${state.player.level}!`, "level");
    }
    if (leveled) delay(150);
    renderStats();
  }

  /* ---------------------------------------------------------
   * Room / scene logic
   * ------------------------------------------------------- */

  function currentRoom() {
    if (!state.dungeon || !state.roomId) return null;
    return state.dungeon.rooms[state.roomId];
  }

  /** The list of exit directions available from current room. */
  function availableExits(room) {
    return Object.entries(room.exits).filter(([, open]) => open).map(([d]) => d);
  }

  const DIR_NAMES = { n: "North", s: "South", e: "East", w: "West" };

  function describeRoom(room) {
    const f = ROOM_FLAVOR[room.type];
    say(`<span class='scene-title'>== ${f.title} ==</span>`);
    say(`<p>${f.desc}</p>`);
    if (room.id === state.dungeon.bossId && !room.cleared) {
      say(`<p class='enemy'>A colossal shape coils in the dark. The air shimmers with heat. The <span class='enemy'>Young Dragon</span> awaits.</p>`);
    }
  }

  async function enterRoom(roomId, firstVisit = false) {
    state.roomId = roomId;
    const room = state.dungeon.rooms[roomId];
    const newlySeen = !room.seen;
    room.seen = true;
    renderMap();
    renderStats();
    describeRoom(room);

    // Resolve content (only triggers if not cleared)
    if (room.content && !room.cleared) {
      await resolveRoomContent(room);
    }

    if (state.over) return;

    // Movement menu (always available unless game over)
    await movementMenu(room);
  }

  async function resolveRoomContent(room) {
    if (room.content.startsWith("enemy")) {
      const kind = room.content.split(":")[1];
      startCombat(kind);
      const result = await runCombat();
      if (result === "win") {
        resolveCombatWin();
        room.cleared = true;
        renderMap();
      } else if (result === "lose") {
        await gameOver();
        return;
      } else {
        // fled: keep enemy (not cleared); flee back to a random open exit
        say("You retreat to a neighboring room.", "dim");
        return;
      }
    } else if (room.content === "chest") {
      await openChest(room);
    } else if (room.content === "npc") {
      await talkNpc(room);
    } else if (room.content === "shrine") {
      await visitShrine(room);
    } else if (room.content === "boss") {
      startCombat("dragon");
      const result = await runCombat();
      if (result === "win") {
        resolveCombatWin();
        room.cleared = true;
        renderMap();
        say(`<span class='npc'>The dragon collapses. A hush falls over the dungeon. You have won, ${state.player.name}.</span>`);
        say("<span class='good'>*** YOU HAVE COMPLETED THE DUNGEON ***</span>");
        say("<span class='dim'>Start a New Game for a freshly generated run.</span>");
        logLine("Dungeon cleared! Victory.", "level");
        state.over = "win";
        return;
      } else if (result === "lose") {
        await gameOver();
        return;
      } else {
        say("You retreat from the dragon's lair, heart pounding.", "dim");
        return;
      }
    }
  }

  async function openChest(room) {
    say("A <span class='item'>dusty chest</span> rests against the wall.");
    const choice = await presentOptions("What do you do?", [
      "Open the chest",
      "Leave it alone"
    ]);
    if (choice === 0) {
      // Trap chance
      if (chance(0.25)) {
        const dmg = rand(3, 7);
        state.player.hp -= dmg;
        say(`<span class='enemy'>A spring-loaded dart!</span> It grazes you for <span class='enemy'>${dmg}</span> damage before you pry the lid open.`);
        logLine(`Chest trap: -${dmg} HP.`, "dmg");
        renderStats();
        if (state.player.hp <= 0) { await gameOver(); return; }
      }
      // Loot
      const lootTable = ["potion", "potion", "rusty", "leather", "key", "shield", "iron"];
      const drop = pick(lootTable);
      const gold = rand(5, 15);
      state.player.gold += gold;
      addItem(drop);
      say(`Inside you find <span class='item'>${ITEMS[drop].name}</span> and <span class='item'>${gold} gold</span>!`);
      logLine(`Chest: ${ITEMS[drop].name}, ${gold} gold.`, "loot");

      // Offer to equip weapons/armor
      maybeEquip(drop);

      room.cleared = true;
      renderMap();
      renderStats();
    } else {
      say("You leave the chest untouched. Some things are best left alone.", "dim");
    }
  }

  async function maybeEquip(itemKey) {
    const it = ITEMS[itemKey];
    if (!it) return;
    if (it.kind === "weapon") {
      const cur = ITEMS[state.player.weapon];
      if (it.atk > cur.atk) {
        const choice = await presentOptions(
          `<span class='item'>${it.name}</span> (ATK +${it.atk}) is stronger than your <span class='item'>${cur.name}</span> (ATK +${cur.atk}). Equip it?`,
          ["Equip it", "Keep current"]
        );
        if (choice === 0) {
          state.player.weapon = itemKey;
          removeItem(itemKey);
          if (state.player.weapon !== "fists" && state.player.weapon !== itemKey) addItem(state.player.weapon);
          say(`You equip the <span class='item'>${it.name}</span>.`);
          logLine(`Equipped ${it.name}.`, "loot");
          renderStats();
        }
      }
    } else if (it.kind === "armor") {
      const cur = ITEMS[state.player.armor];
      if (it.def > cur.def) {
        const choice = await presentOptions(
          `<span class='item'>${it.name}</span> (DEF +${it.def}) is sturdier than your <span class='item'>${cur.name}</span> (DEF +${cur.def}). Equip it?`,
          ["Equip it", "Keep current"]
        );
        if (choice === 0) {
          state.player.armor = itemKey;
          removeItem(itemKey);
          say(`You don the <span class='item'>${it.name}</span>.`);
          logLine(`Equipped ${it.name}.`, "loot");
          renderStats();
        }
      }
    }
  }

  async function talkNpc(room) {
    say("A hooded <span class='npc'>hermit</span> sits by a small fire, turning a spit of charred rabbit.");
    say('<span class="npc">"Sit, traveler. The roads are unkind. I trade, and I talk."</span>', "");
    const choice = await presentOptions("The hermit looks up. What do you say?", [
      "Trade (10g for a potion)",
      "Ask for rumors",
      "Attack the hermit",
      "Leave"
    ]);
    if (choice === 0) {
      if (state.player.gold >= 10) {
        state.player.gold -= 10;
        addItem("potion");
        say('<span class="npc">"Fair trade. Use it well."</span> You receive a <span class=\'item\'>Health Potion</span>.');
        logLine("Bought a potion for 10g.", "loot");
      } else {
        say('<span class="npc">"No coin, no trade. Come back when your purse jingles."</span>');
      }
    } else if (choice === 1) {
      say('<span class="npc">"The dragon sleeps in the deep crypt to the southeast. Bring a shield, or bring a coffin."</span>');
      say('<span class="npc">"There is a shrine somewhere that still answers prayers. And chests that bite. Mind the dart traps."</span>');
    } else if (choice === 2) {
      say('<span class="npc">"...you would strike an old man? Then strike."</span> The hermit\'s eyes flash.');
      // Fight a tough enemy as "hermit"
      startCombat("ogre");
      state.combat.name = "Hermit (revealed as a bandit)";
      const r = await runCombat();
      if (r === "win") {
        resolveCombatWin();
        say("Searching his satchel, you find <span class='item'>15 gold</span> and a <span class='item'>Health Potion</span>.");
        state.player.gold += 15; addItem("potion");
        renderStats();
        room.cleared = true; renderMap();
      } else if (r === "lose") { await gameOver(); return; }
      else { say("You back away from the bandit's blade.", "dim"); return; }
    } else {
      say('You nod and step back into the dark. <span class="dim">The fire crackles behind you.</span>');
    }
  }

  async function visitShrine(room) {
    say("A <span class='npc'>stone shrine</span> stands here, its basin dry but faintly glowing.");
    const choice = await presentOptions("A voice whispers: 'What do you seek?'", [
      "Healing (restore full HP)",
      "Blessing (gain 5 XP)",
      "Pray for gold",
      "Leave"
    ]);
    if (choice === 0) {
      state.player.hp = state.player.maxHp;
      say("Warm light washes over you. <span class='good'>Your wounds close.</span>");
      logLine("Shrine: full heal.", "heal");
      renderStats();
    } else if (choice === 1) {
      gainXp(5);
      say("Knowledge floods your mind. <span class='good'>+5 XP</span>.");
    } else if (choice === 2) {
      if (chance(0.5)) {
        const g = rand(8, 20);
        state.player.gold += g;
        say(`The shrine gifts you <span class='item'>${g} gold</span>.`);
        logLine(`Shrine: +${g} gold.`, "loot");
      } else {
        say("The shrine is silent. Your prayer goes unanswered. <span class='dim'>(No gold.)</span>");
      }
      renderStats();
    } else {
      say("You bow and step away from the shrine.", "dim");
    }
    room.cleared = true;
    renderMap();
  }

  async function movementMenu(room) {
    const exits = availableExits(room);
    // Build option labels
    const opts = exits.map(d => `Go ${DIR_NAMES[d]}`);

    // Always allow resting (costs nothing but small risk) and inventory check
    opts.push("Camp here (rest, risky)");
    opts.push("Use a potion");
    opts.push("View status");

    const choice = await presentOptions("Choose your action:", opts);

    if (choice < exits.length) {
      const dir = exits[choice];
      const [x, y] = state.roomId.split(",").map(Number);
      const dx = dir === "e" ? 1 : dir === "w" ? -1 : 0;
      const dy = dir === "s" ? 1 : dir === "n" ? -1 : 0;
      const newId = `${x + dx},${y + dy}`;
      say(`You head ${DIR_NAMES[dir].toLowerCase()}...`, "dim");
      await enterRoom(newId);
    } else if (choice === exits.length) {
      await camp();
      await movementMenu(room);
    } else if (choice === exits.length + 1) {
      usePotion();
      await movementMenu(room);
    } else {
      showStatus();
      await movementMenu(room);
    }
  }

  async function camp() {
    say("You make a small camp, banking the fire low.", "dim");
    if (chance(0.35)) {
      // ambush
      const kind = pick(["goblin", "wolf", "skeleton"]);
      say(`But you are not alone! A <span class='enemy'>${ENEMIES[kind].name}</span> ambushes your rest!`);
      startCombat(kind);
      const r = await runCombat();
      if (r === "win") { resolveCombatWin(); }
      else if (r === "lose") { await gameOver(); return; }
      else { say("Your rest is ruined. You pack up quickly.", "dim"); return; }
    } else {
      const heal = rand(4, 9);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      say(`You rest uneasily and recover <span class='good'>${heal} HP</span>.`);
      logLine(`Rested: +${heal} HP.`, "heal");
      renderStats();
    }
  }

  function showStatus() {
    const p = state.player;
    say("<span class='hr'>---------- STATUS ----------</span>");
    say(`<span class='dim'>${p.name} | Lv ${p.name && p.level} | HP ${p.hp}/${p.maxHp} | ATK ${totalAtk()} | DEF ${totalDef()} | XP ${p.xp}/${xpForLevel(p.level)} | Gold ${p.gold}</span>`);
    say(`<span class='dim'>Weapon: ${ITEMS[p.weapon].name} | Armor: ${ITEMS[p.armor].name}</span>`);
  }

  /* ---------------------------------------------------------
   * Game over & restart
   * ------------------------------------------------------- */
  async function gameOver() {
    state.over = true;
    state.awaitingChoice = null;
    clearOptions();
    say("<span class='enemy'>========== YOU DIED ==========</span>");
    say(`<span class='dim'>${state.player.name} fell in the ${currentRoom() ? ROOM_FLAVOR[currentRoom().type].title : "dark"}.</span>`);
    logLine("YOU DIED. Game over.", "dmg");
    const choice = await presentOptions("The dungeon claims another. What now?", [
      "Restart run",
      "New procedurally-generated game"
    ]);
    if (choice === 0) restartRun();
    else newGame();
  }

  function restartRun() {
    // Re-enter the existing dungeon from scratch with a fresh player.
    if (!state.dungeon) { newGame(); return; }
    // Clear room "cleared" flags? Keep dungeon but reset rooms.
    for (const id in state.dungeon.rooms) {
      const r = state.dungeon.rooms[id];
      r.seen = (id === state.dungeon.start);
      r.cleared = false;
    }
    const savedDungeon = state.dungeon;
    state = {
      player: defaultPlayer(),
      dungeon: savedDungeon,
      roomId: savedDungeon.start,
      log: [],
      combat: null,
      over: false,
      awaitingChoice: null
    };
    logLine("Run restarted (same dungeon).", "sys");
    bootIntoDungeon();
  }

  function newGame() {
    state = {
      player: defaultPlayer(),
      dungeon: generateDungeon(),
      roomId: null,
      log: [],
      combat: null,
      over: false,
      awaitingChoice: null
    };
    state.roomId = state.dungeon.start;
    logLine("New procedural dungeon generated.", "sys");
    bootIntoDungeon();
  }

  function bootIntoDungeon() {
    clearOptions();
    el.story.innerHTML = "";
    say("<span class='scene-title'>========== TERMINAL RPG ==========</span>");
    say(`<p>Welcome, <span class='good'>${state.player.name}</span>. You stand at the entrance to a forgotten dungeon. Somewhere in its depths coils a <span class='enemy'>Young Dragon</span>. Slay it &mdash; or die trying.</p>`);
    say("<p class='dim'>Tip: click the numbered options, or type the number / a command in the input below. Try 'help'.</p>");
    renderAll();
    // kick off the first room
    enterRoom(state.roomId, true);
  }

  /* ---------------------------------------------------------
   * Save / Load (localStorage)
   * ------------------------------------------------------- */
  function saveGame() {
    try {
      const snapshot = {
        player: state.player,
        dungeon: state.dungeon,
        roomId: state.roomId,
        over: state.over
      };
      const ok = store.set(SAVE_KEY, JSON.stringify(snapshot));
      if (!ok) {
        say("<span class='enemy'>Save failed: storage unavailable in this browser.</span>");
        logLine("Save failed: storage unavailable.", "dmg");
        return;
      }
      say("<span class='good'>Game saved.</span>");
      logLine("Game saved to localStorage.", "sys");
    } catch (e) {
      say("<span class='enemy'>Save failed: storage unavailable.</span>");
      logLine("Save failed: " + e.message, "dmg");
    }
  }

  function loadGame() {
    try {
      const raw = store.get(SAVE_KEY);
      if (!raw) {
        say("<span class='dim'>No save found.</span>");
        logLine("Load: no save present.", "sys");
        return false;
      }
      const snap = JSON.parse(raw);
      if (!snap || !snap.dungeon || !snap.player) throw new Error("corrupt save");
      state = {
        player: snap.player,
        dungeon: snap.dungeon,
        roomId: snap.roomId,
        log: [],
        combat: null,
        over: !!snap.over,
        awaitingChoice: null
      };
      logLine("Game loaded.", "sys");
      bootIntoDungeon();
      return true;
    } catch (e) {
      say("<span class='enemy'>Load failed: save is corrupt or incompatible.</span>");
      logLine("Load failed: " + e.message, "dmg");
      return false;
    }
  }

  /* ---------------------------------------------------------
   * Command input handling
   * ------------------------------------------------------- */
  function handleCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    // 1. If awaiting a numbered choice, a bare number selects it.
    if (state.awaitingChoice) {
      const num = parseInt(cmd, 10);
      if (!isNaN(num) && String(num) === cmd) {
        choose(num - 1);
        return;
      }
      // keyword shortcuts during choices
      const opts = el.options.querySelectorAll(".opt-btn");
      const keywordMap = {
        attack: 0, a: 0, fight: 0,
        defend: 1, block: 1, d: 1,
        item: 2, use: 2, potion: 2, drink: 2, i: 2,
        flee: 3, run: 3, escape: 3
      };
      if (opts.length === 4 && cmd in keywordMap) {
        choose(keywordMap[cmd]);
        return;
      }
      // directional keywords during movement
      const moveKeywords = { north: "n", n: "n", south: "s", s: "s", east: "e", e: "e", west: "w", w: "w", go: null };
      if (cmd in moveKeywords && moveKeywords[cmd]) {
        // find matching option
        opts.forEach((b, i) => {
          if (b.textContent.toLowerCase().includes(`go ${DIR_NAMES[moveKeywords[cmd]].toLowerCase()}`)) choose(i);
        });
        return;
      }
      // generic: try to match option label text
      for (let i = 0; i < opts.length; i++) {
        if (opts[i].textContent.toLowerCase().includes(cmd)) { choose(i); return; }
      }
    }

    // 2. Global commands
    switch (cmd) {
      case "help":       showHelp(); break;
      case "inventory":
      case "inv":
        showStatus();
        sayInventorySummary();
        break;
      case "status":
      case "stats":
        showStatus();
        break;
      case "take":
      case "get":
      case "pickup":
        say("<span class='dim'>There is nothing here to take by hand. Try opening chests or looting foes.</span>");
        break;
      case "use potion":
      case "potion":
      case "heal":
        usePotion();
        break;
      case "save":       saveGame(); break;
      case "load":       loadGame(); break;
      case "new":        newGame(); break;
      case "restart":    restartRun(); break;
      case "look":
        if (currentRoom()) describeRoom(currentRoom());
        break;
      case "clear":
        el.story.innerHTML = "";
        say("<span class='dim'>-- screen cleared --</span>");
        break;
      default:
        say(`<span class='dim'>Unknown command: "${raw}". Type 'help' for commands, or pick a numbered option.</span>`);
    }
  }

  function showHelp() {
    say("<span class='hr'>---------- HELP ----------</span>");
    say("<span class='dim'>Commands you can type in the input box:</span>");
    say("<span class='dim'>  &bull; A number (1-4) to pick the matching option.</span>");
    say("<span class='dim'>  &bull; attack / defend / item / flee during combat.</span>");
    say("<span class='dim'>  &bull; north / south / east / west (or n/s/e/w) to move.</span>");
    say("<span class='dim'>  &bull; inventory (inv) &mdash; show your gear.</span>");
    say("<span class='dim'>  &bull; potion / heal &mdash; drink a Health Potion.</span>");
    say("<span class='dim'>  &bull; look &mdash; re-read the current room.</span>");
    say("<span class='dim'>  &bull; save / load &mdash; localStorage save slot.</span>");
    say("<span class='dim'>  &bull; new / restart &mdash; new dungeon / replay this one.</span>");
    say("<span class='dim'>  &bull; clear &mdash; wipe the screen. help &mdash; this list.</span>");
  }

  function sayInventorySummary() {
    const inv = state.player.inv;
    const keys = Object.keys(inv).filter(k => inv[k] > 0);
    say("<span class='hr'>---------- INVENTORY ----------</span>");
    if (!keys.length) { say("<span class='dim'>(empty)</span>"); return; }
    for (const k of keys) say(`<span class='dim'>&bull; ${ITEMS[k].name} x${inv[k]}</span>`);
  }

  /* ---------------------------------------------------------
   * Small utilities
   * ------------------------------------------------------- */
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  /* ---------------------------------------------------------
   * Wire up the DOM
   * ------------------------------------------------------- */
  function bind() {
    el.cmd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const v = el.cmd.value;
        if (v.trim()) {
          // echo command
          say(`<span class='dim'>${"$"} ${escapeHtml(v)}</span>`);
          handleCommand(v);
        }
        el.cmd.value = "";
      }
    });

    // Number keys 1-9 quick-fire the corresponding option button.
    document.addEventListener("keydown", (e) => {
      // ignore if typing in the input (it handles Enter/numbers itself)
      if (document.activeElement === el.cmd) return;
      if (state.awaitingChoice && /^[1-9]$/.test(e.key)) {
        choose(parseInt(e.key, 10) - 1);
      }
    });

    el.btnNew.addEventListener("click", () => {
      if (state.awaitingChoice) { state.awaitingChoice = null; clearOptions(); }
      newGame();
    });
    el.btnSave.addEventListener("click", saveGame);
    el.btnLoad.addEventListener("click", loadGame);
    el.btnRest.addEventListener("click", restartRun);
    el.btnHelp.addEventListener("click", showHelp);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ---------------------------------------------------------
   * Boot
   * ------------------------------------------------------- */
  function boot() {
    bind();
    renderAll();
    // Try to auto-load a save; else start fresh.
    const hasSave = !!store.get(SAVE_KEY);
    say("<span class='scene-title'>========== TERMINAL RPG ==========</span>");
    say("<p>A text-based adventure &mdash; JS port of a C engine. Procedural dungeons, branching choices, turn-based combat.</p>");
    if (hasSave) {
      say("<p class='dim'>A saved game was found. Choose how to begin:</p>");
      presentOptions("", [
        "Continue from save",
        "Start a new procedural run"
      ]).then((c) => {
        if (c === 0) { if (!loadGame()) newGame(); }
        else newGame();
      });
    } else {
      say("<p class='dim'>No save found. Generating your first dungeon...</p>");
      setTimeout(newGame, 400);
    }
  }

  // The input prompt reflects current room path.
  function tickPrompt() {
    const room = currentRoom();
    const path = room ? room.id : "void";
    document.querySelector(".prompt").textContent = `root@ardent:${path}$`;
    requestAnimationFrame(tickPrompt);
  }

  // Start everything.
  boot();
  tickPrompt();
})();
