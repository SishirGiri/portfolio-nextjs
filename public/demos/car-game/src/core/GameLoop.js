// ════════════════════════════════════════════════════════
// GAME LOOP — owns the requestAnimationFrame cycle.
// Keeps dt clamped so a tab-switch never teleports physics,
// and supports start/stop without leaking rAF handles.
// ════════════════════════════════════════════════════════

export class GameLoop {
  /**
   * @param {(dt:number, now:number)=>void} update
   * @param {()=>void} render
   * @param {{maxDt?: number}} opts
   */
  constructor(update, render, opts = {}) {
    this._update = update;
    this._render = render;
    this.maxDt = opts.maxDt ?? 0.05;
    this.running = false;
    this._last = 0;
    this._frame = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
  }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(this.maxDt, (now - this._last) / 1000);
    this._last = now;
    this._update(dt, now);
    this._render();
    requestAnimationFrame(this._frame);
  }
}
