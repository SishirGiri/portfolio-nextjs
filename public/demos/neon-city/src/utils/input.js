// utils/input.js — unified keyboard / mouse / touch input state.
// Exposes a frame-consistent snapshot the game reads each tick.

export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;                       // DOM elements (stick, buttons)
    this.keys = Object.create(null);
    this.mouse = { x: 0, y: 0, down: false, fired: false };
    this.fireHeld = false;              // true while fire button / mouse held
    this.stick = { x: 0, y: 0, active: false };
    this.touchAim = null;               // {x,y} world aim point for mobile auto-aim
    this.isMobile = false;
    this._bind();
  }

  _bind() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });

    this.canvas.addEventListener("mousemove", (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) { this.mouse.down = true; this.fireHeld = true; this.mouse.fired = true; }
    });
    window.addEventListener("mouseup", (e) => { if (e.button === 0) { this.mouse.down = false; this.fireHeld = false; } });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this._bindTouch();
    // Prevent page scroll during gameplay on touch.
    document.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });
  }

  _bindTouch() {
    const stick = this.ui?.stick;
    if (!stick) return;
    let id = null, cx = 0, cy = 0;
    const start = (e) => {
      const t = e.changedTouches[0]; id = t.identifier;
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    };
    const move = (e) => {
      if (id === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== id) continue;
        let dx = t.clientX - cx, dy = t.clientY - cy;
        const max = 46, m = Math.hypot(dx, dy);
        if (m > max) { dx = dx / m * max; dy = dy / m * max; }
        if (this.ui.knob) this.ui.knob.style.transform = `translate(${dx}px,${dy}px)`;
        this.stick.x = dx / max; this.stick.y = dy / max; this.stick.active = true;
      }
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === id) {
          id = null; this.stick.x = 0; this.stick.y = 0; this.stick.active = false;
          if (this.ui.knob) this.ui.knob.style.transform = "translate(0,0)";
        }
      }
    };
    stick.addEventListener("touchstart", (e) => { e.preventDefault(); start(e); }, { passive: false });
    stick.addEventListener("touchmove", (e) => { e.preventDefault(); move(e); }, { passive: false });
    stick.addEventListener("touchend", (e) => { e.preventDefault(); end(e); }, { passive: false });
    stick.addEventListener("touchcancel", (e) => { e.preventDefault(); end(e); }, { passive: false });

    const bindBtn = (el, down, up) => {
      if (!el) return;
      el.addEventListener("touchstart", (e) => { e.preventDefault(); down && down(); }, { passive: false });
      el.addEventListener("touchend", (e) => { e.preventDefault(); up && up(); }, { passive: false });
    };
    bindBtn(this.ui.fire, () => { this.fireHeld = true; this.mouse.fired = true; }, () => { this.fireHeld = false; });
    bindBtn(this.ui.reload, () => this._pendingReload = true);
    bindBtn(this.ui.roll, () => this._pendingRoll = true);
    bindBtn(this.ui.grenade, () => this._pendingGrenade = true);
    bindBtn(this.ui.enter, () => this._pendingInteract = true);
    bindBtn(this.ui.switch, () => this._pendingSwitch = true);
  }

  // Movement intent as a normalized vector {x,y}. Keyboard takes precedence; else joystick.
  moveVec() {
    let x = 0, y = 0;
    if (this.keys["w"] || this.keys["arrowup"]) y -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) y += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) x -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) x += 1;
    if (x === 0 && y === 0 && this.stick.active) {
      x = this.stick.x; y = this.stick.y;
      if (Math.hypot(x, y) < 0.18) return { x: 0, y: 0 };
    } else if (x !== 0 || y !== 0) {
      const m = Math.hypot(x, y); x /= m; y /= m;
    }
    return { x, y };
  }

  sprinting() { return !!this.keys["shift"]; }
  // Consume one-shot intents (returns true once per press).
  consumeReload() { const v = !!this._pendingReload || !!this.keys["r"]; this._pendingReload = false; return v; }
  consumeRoll() { const v = !!this._pendingRoll || !!this.keys[" "] || !!this.keys["q"]; this._pendingRoll = false; return v; }
  consumeGrenade() { const v = !!this._pendingGrenade || !!this.keys["g"]; this._pendingGrenade = false; return v; }
  consumeInteract() { const v = !!this._pendingInteract || !!this.keys["e"] || !!this.keys["f"]; this._pendingInteract = false; return v; }
  consumeSwitch() { const v = !!this._pendingSwitch; this._pendingSwitch = false; return v; }
  weaponKey() {
    for (let i = 1; i <= 5; i++) if (this.keys[String(i)]) return i - 1;
    if (this.keys["q"]) return -1; // handled as roll elsewhere
    return -1;
  }

  clearFrame() { this.mouse.fired = false; }
}
