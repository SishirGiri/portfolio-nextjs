import { describe, it, expect } from 'vitest';
import { SaveService } from '../../public/demos/car-game/src/services/SaveService.js';
import { createMemoryStorage } from '../../public/demos/car-game/src/services/storage.js';
import { EventBus } from '../../public/demos/car-game/src/core/EventBus.js';
import { SAVE_KEY, SAVE_KEY_V1 } from '../../public/demos/car-game/src/data/save.js';

function makeService(initial = {}) {
  const bus = new EventBus();
  const storage = createMemoryStorage(initial);
  return { bus, storage, svc: new SaveService(bus, storage) };
}

describe('SaveService', () => {
  it('creates a fresh v3 save when nothing is stored', () => {
    const { svc } = makeService();
    const save = svc.load();
    expect(save.v).toBe(3);
    expect(save.money).toBe(500);
    expect(save.ownedCars.toro).toBeTruthy();
    expect(save.rev).toBe(1);
    expect(save.stats.distanceM).toBe(0);
  });

  it('migrates a v1 save (original game) including the +$500 bonus', () => {
    const { svc } = makeService({
      [SAVE_KEY_V1]: JSON.stringify({ money: 900, xp: 400, completedMissions: ['first-drive'], sound: true }),
    });
    const save = svc.load();
    expect(save.money).toBe(1400);
    expect(save.xp).toBe(400);
    expect(save.completed['first-drive'].stars).toBe(1);
    expect(save.ownedCars.toro).toBeTruthy();     // hero car granted
    expect(save.ownedCars.corsa).toBeTruthy();    // legacy starter kept
    expect(save.currentCar).toBe('toro');
  });

  it('upgrades a v2 save to v3 without losing progress', () => {
    const { svc } = makeService({
      [SAVE_KEY]: JSON.stringify({
        v: 2, money: 5300, xp: 1500, currentCar: 'vela',
        ownedCars: { vela: { upgrades: { engine: 2 }, paint: '#f97316', spoiler: 1 } },
        completed: { 'first-drive': { stars: 3, bestTime: 41.2 } },
        settings: { sound: false, quality: 'high' },
      }),
    });
    const save = svc.load();
    expect(save.v).toBe(3);
    expect(save.money).toBe(5300);
    expect(save.currentCar).toBe('vela');
    expect(save.ownedCars.vela.upgrades.engine).toBe(2);
    expect(save.completed['first-drive'].stars).toBe(3);
    expect(save.settings.quality).toBe('high');
    expect(save.stats).toBeTruthy();
  });

  it('recovers from a corrupted blob by backing it up and starting fresh', () => {
    const events = [];
    const { svc, bus, storage } = makeService({ [SAVE_KEY]: '{{{not json' });
    bus.on('save:corrupted', (e) => events.push(e));
    const save = svc.load();
    expect(save.money).toBe(500);                        // fresh default
    expect(storage.get(SAVE_KEY)).toBe(null);            // bad blob gone
    const keys = Object.keys(storage._dump());
    expect(keys.some((k) => k.startsWith(`${SAVE_KEY}.corrupt-`))).toBe(true);
    expect(events.length).toBe(1);
  });

  it('sanitizes hand-edited values', () => {
    const { svc } = makeService({
      [SAVE_KEY]: JSON.stringify({
        v: 3, rev: 2, money: -50, xp: 1e12,
        currentCar: 'ufo',
        ownedCars: { toro: { upgrades: { engine: 99 }, paint: 'not-a-color', spoiler: 42 } },
        completed: { 'first-drive': { stars: 9, bestTime: 0.1 }, 'hack-mission': { stars: 3 } },
        settings: { quality: 'insane', volumes: { music: 42 } },
      }),
    });
    const save = svc.load();
    expect(save.money).toBeGreaterThanOrEqual(0);
    expect(save.currentCar).toBe('toro');
    expect(save.ownedCars.toro.upgrades.engine).toBe(3);   // clamped 99 → 3
    expect(save.ownedCars.toro.spoiler).toBe(2);
    expect(save.ownedCars.toro.paint).toMatch(/^#[0-9a-f]{6}$/i);
    expect(save.completed['first-drive'].stars).toBe(3);
    expect(save.completed['hack-mission']).toBeUndefined();
    expect(save.settings.quality).toBe('medium');
    expect(save.settings.volumes.music).toBeLessThanOrEqual(1);
    expect(save.xp).toBeLessThan(1e12);                    // level cap applied
  });

  it('mutate() bumps revision, persists and emits SAVE_COMPLETED', () => {
    const { svc, bus } = makeService();
    svc.load();
    const events = [];
    bus.on('save:completed', (e) => events.push(e));
    const revBefore = svc.save.rev;
    svc.mutate((s) => { s.money += 250; }, 'test');
    expect(svc.save.money).toBe(750);
    expect(svc.save.rev).toBe(revBefore + 1);
    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe('test');
  });

  it('a throwing mutator discards its change but keeps the save usable', () => {
    const { svc } = makeService();
    svc.load();
    expect(() => svc.mutate(() => { throw new Error('bug'); })).not.toThrow();
    expect(svc.save.money).toBe(500);
  });

  it('reset() wipes progress and re-grants defaults', () => {
    const { svc } = makeService();
    svc.load();
    svc.mutate((s) => { s.money = 99999; s.xp = 5000; });
    svc.reset();
    expect(svc.save.money).toBe(500);
    expect(svc.save.xp).toBe(0);
  });

  it('adoptServer replaces state (sync conflict resolution)', () => {
    const { svc } = makeService();
    svc.load();
    svc.adoptServer({ v: 3, rev: 9, money: 1234, xp: 60 });
    expect(svc.save.rev).toBe(9);
    expect(svc.save.money).toBe(1234);
  });
});
