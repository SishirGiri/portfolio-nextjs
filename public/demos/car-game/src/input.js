// ════════════════════════════════════════════════════════
// INPUT — keyboard + gamepad + touch (virtual steering
// wheel, pedal buttons) merged into one analog state.
// Edge events (camera, map, pause, enter/exit…) queued
// as actions and consumed by the game loop.
// ════════════════════════════════════════════════════════
import { clamp } from './utils.js';

const PREVENT = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);

export class Input {
  constructor() {
    this.keys = new Set();
    this.state = {
      throttle: 0, brake: 0, steer: 0,
      handbrake: false, nitro: false, horn: false,
    };
    this.actions = [];
    this.touch = { wheel: 0, wheelHeld: false, gas: 0, brake: 0, handbrake: false, nitro: false };
    this.gamepadIndex = null;
    this._prevPad = [];
    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (PREVENT.has(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      this._edge(k);
    };
    this._onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this._onBlur = () => this.keys.clear();
    this._targets = [];
    this._docTargets = [];
    this._padConnected = (e) => { this.gamepadIndex = e.gamepad.index; };
    this._padDisconnected = () => { this.gamepadIndex = null; };
  }

  _edge(k) {
    switch (k) {
      case 'c': this.actions.push('camera'); break;
      case 'm': this.actions.push('map'); break;
      case 'escape': case 'p': this.actions.push('pause'); break;
      case 'e': case 'f': this.actions.push('enter'); break;
      case 'l': this.actions.push('lights'); break;
      case 't': this.actions.push('trans'); break;
      case 'k': this.actions.push('tc'); break;
      case 'z': this.actions.push('shiftDown'); break;
      case 'x': this.actions.push('shiftUp'); break;
    }
  }

  bind() {
    // attach to parent frames too — keyboard focus inside the demo iframe
    this._targets = [window];
    this._docTargets = [document];
    try {
      if (window.parent && window.parent !== window) {
        this._targets.push(window.parent);
        this._docTargets.push(window.parent.document);
      }
    } catch { /* cross-origin */ }
    for (const w of this._targets) {
      w.addEventListener('keydown', this._onKeyDown);
      w.addEventListener('keyup', this._onKeyUp);
    }
    for (const d of this._docTargets) {
      d.addEventListener('keydown', this._onKeyDown);
      d.addEventListener('keyup', this._onKeyUp);
    }
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('gamepadconnected', this._padConnected);
    window.addEventListener('gamepaddisconnected', this._padDisconnected);
  }

  unbind() {
    for (const w of this._targets) {
      w.removeEventListener('keydown', this._onKeyDown);
      w.removeEventListener('keyup', this._onKeyUp);
    }
    for (const d of this._docTargets) {
      d.removeEventListener('keydown', this._onKeyDown);
      d.removeEventListener('keyup', this._onKeyUp);
    }
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('gamepadconnected', this._padConnected);
    window.removeEventListener('gamepaddisconnected', this._padDisconnected);
  }

  /** Called by main.js for touch buttons. */
  setTouch(name, val) {
    if (name in this.touch) this.touch[name] = val;
  }

  /** Virtual wheel pointer handling. */
  attachWheel(el) {
    if (!el) return;
    this._wheelEl = el;
    let activeId = null;
    let startAngle = 0, startWheel = 0;
    const center = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const angleOf = (e) => {
      const c = center();
      return Math.atan2(e.clientY - c.y, e.clientX - c.x);
    };
    const down = (e) => {
      e.preventDefault();
      activeId = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      startAngle = angleOf(e);
      startWheel = this.touch.wheel;
      this.touch.wheelHeld = true;
    };
    const move = (e) => {
      if (!this.touch.wheelHeld || e.pointerId !== activeId) return;
      let d = angleOf(e) - startAngle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.touch.wheel = clamp(startWheel + d / 2.1, -1, 1);
      el.style.transform = `rotate(${this.touch.wheel * 110}deg)`;
    };
    const up = (e) => {
      if (e.pointerId !== activeId) return;
      this.touch.wheelHeld = false;
      activeId = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  update(dt) {
    const k = this.keys;
    const has = (...names) => names.some((n) => k.has(n));

    // keyboard
    let steer = (has('a', 'arrowleft') ? -1 : 0) + (has('d', 'arrowright') ? 1 : 0);
    let throttle = has('w', 'arrowup') ? 1 : 0;
    let brake = has('s', 'arrowdown') ? 1 : 0;
    let handbrake = k.has(' ');
    let nitro = k.has('shift');
    let horn = k.has('h');

    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = this.gamepadIndex !== null ? pads[this.gamepadIndex] : pads.find?.((p) => p);
    if (pad) {
      const ax = pad.axes[0] || 0;
      if (Math.abs(ax) > 0.12) steer = clamp(ax, -1, 1);
      const rt = pad.buttons[7]?.value || 0;
      const lt = pad.buttons[6]?.value || 0;
      if (rt > 0.05) throttle = Math.max(throttle, rt);
      if (lt > 0.05) brake = Math.max(brake, lt);
      if (pad.buttons[0]?.pressed) handbrake = true;
      if (pad.buttons[2]?.pressed) nitro = true;
      if (pad.buttons[1]?.pressed) horn = true;
      const edge = (idx) => {
        const now = pad.buttons[idx]?.pressed || false;
        const was = this._prevPad[idx] || false;
        this._prevPad[idx] = now;
        return now && !was;
      };
      if (edge(3)) this.actions.push('camera');
      if (edge(9)) this.actions.push('pause');
      if (edge(8)) this.actions.push('map');
      if (edge(4)) this.actions.push('shiftDown');
      if (edge(5)) this.actions.push('shiftUp');
      if (edge(10)) this.actions.push('enter');
    }

    // touch (virtual wheel springs back when released)
    if (!this.touch.wheelHeld && Math.abs(this.touch.wheel) > 0.02) {
      this.touch.wheel *= Math.exp(-7 * dt);
      if (this._wheelEl) this._wheelEl.style.transform = `rotate(${this.touch.wheel * 110}deg)`;
    }
    if (Math.abs(this.touch.wheel) > 0.06) steer = this.touch.wheel;
    if (this.touch.gas) throttle = Math.max(throttle, 1);
    if (this.touch.brake) brake = Math.max(brake, 1);
    if (this.touch.handbrake) handbrake = true;
    if (this.touch.nitro) nitro = true;

    this.state.throttle = clamp(throttle, 0, 1);
    this.state.brake = clamp(brake, 0, 1);
    this.state.steer = clamp(steer, -1, 1);
    this.state.handbrake = handbrake;
    this.state.nitro = nitro;
    this.state.horn = horn;
  }

  consumeActions() {
    const a = this.actions;
    this.actions = [];
    return a;
  }
}
