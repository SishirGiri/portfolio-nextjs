import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameLoop } from '../../public/demos/car-game/src/core/GameLoop.js';

describe('GameLoop', () => {
  let rafQueue;
  let now;

  beforeEach(() => {
    now = 1000;
    rafQueue = [];
    globalThis.performance = { now: () => now };
    globalThis.requestAnimationFrame = (cb) => { rafQueue.push(cb); return rafQueue.length; };
  });
  afterEach(() => { rafQueue = null; });

  const tick = (advanceMs) => {
    now += advanceMs;
    const queue = rafQueue.splice(0);
    for (const cb of queue) cb(now);
  };

  it('calls update with clamped dt and keeps scheduling while running', () => {
    const dts = [];
    const loop = new GameLoop((dt) => dts.push(dt), () => {});
    loop.start();
    expect(rafQueue.length).toBe(1);
    tick(16);            // 16ms frame
    tick(16);
    expect(dts).toEqual([0.016, 0.016]);
    expect(rafQueue.length).toBe(1);   // re-scheduled
  });

  it('clamps huge frame gaps (tab switch) to maxDt', () => {
    const dts = [];
    const loop = new GameLoop((dt) => dts.push(dt), () => {});
    loop.start();
    tick(5_000);         // 5 second gap
    expect(dts[0]).toBe(0.05);
  });

  it('stop() halts scheduling', () => {
    let frames = 0;
    const loop = new GameLoop(() => { frames++; }, () => {});
    loop.start();
    tick(16);
    tick(16);
    loop.stop();
    tick(16);
    tick(16);
    expect(frames).toBe(2);
    expect(rafQueue.length).toBe(0);
  });

  it('start() twice does not double-schedule', () => {
    const loop = new GameLoop(() => {}, () => {});
    loop.start();
    loop.start();
    expect(rafQueue.length).toBe(1);
  });
});
