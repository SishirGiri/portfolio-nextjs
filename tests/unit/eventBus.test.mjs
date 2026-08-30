import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../public/demos/car-game/src/core/EventBus.js';
import { EVENTS } from '../../public/demos/car-game/src/core/events.js';

describe('EventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = new EventBus();
    const spy = vi.fn();
    bus.on(EVENTS.MISSION_COMPLETED, spy);
    bus.emit(EVENTS.MISSION_COMPLETED, { stars: 3 });
    expect(spy).toHaveBeenCalledWith({ stars: 3 });
  });

  it('supports multiple listeners and once()', () => {
    const bus = new EventBus();
    const a = vi.fn(), b = vi.fn(), once = vi.fn();
    bus.on('x', a);
    bus.on('x', b);
    bus.once('x', once);
    bus.emit('x', 1);
    bus.emit('x', 2);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe functions work', () => {
    const bus = new EventBus();
    const spy = vi.fn();
    const off = bus.on('x', spy);
    off();
    bus.emit('x');
    expect(spy).not.toHaveBeenCalled();
  });

  it('a throwing handler does not break other handlers', () => {
    const bus = new EventBus();
    const good = vi.fn();
    bus.on('x', () => { throw new Error('boom'); });
    bus.on('x', good);
    expect(() => bus.emit('x')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('onAny receives every event name', () => {
    const bus = new EventBus();
    const seen = [];
    bus.onAny((name) => seen.push(name));
    bus.emit('a'); bus.emit('b');
    expect(seen).toEqual(['a', 'b']);
  });
});
