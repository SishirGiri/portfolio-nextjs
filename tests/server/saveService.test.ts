import { beforeEach, describe, expect, it } from 'vitest';
import { SaveSyncService } from '../../src/server/services/saveService';
import { createMemoryRepositories } from '../../src/server/repositories/memory';
import { resetRateLimits } from '../../src/server/services/antiCheat';
import type { SaveBlob } from '../../src/server/repositories/types';

beforeEach(() => resetRateLimits());

function validSave(partial: Partial<SaveBlob> = {}): SaveBlob {
  return {
    v: 3,
    rev: 5,
    updatedAt: Date.now(),
    money: 2_000,
    xp: 800,
    currentCar: 'toro',
    ownedCars: {
      toro: { upgrades: { engine: 1 }, paint: '#f5b301', spoiler: 0, wheels: 0, caliper: 0, kit: 0, exhaust: 0 },
    },
    completed: { 'first-drive': { stars: 3, bestTime: 38.4 } },
    achievements: [],
    stats: {
      distanceM: 42_000, playtimeSec: 3_600, missionsCompleted: 1, missionsFailed: 0,
      collisions: 2, busts: 0, escapes: 1, topSpeedKmh: 220, moneyEarned: 2_400, moneySpent: 400, bestRunScore: 0,
    },
    settings: {
      sound: true, quality: 'high', transmission: 'auto', tractionControl: true,
      volumes: { master: 1, music: 0.5, engine: 0.8, sfx: 0.9, environment: 0.5, ui: 0.9, voice: 1 },
    },
    ...partial,
  };
}

describe('SaveSyncService (memory repositories)', () => {
  it('accepts a valid first sync and projects the relational views', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    const out = await svc.sync(user.id, validSave());
    expect(out.status).toBe('accepted');

    const profile = await repos.players.getProfile(user.id);
    expect(profile?.money).toBe(2_000);
    expect(profile?.xp).toBe(800);
    const stats = await repos.players.getStats(user.id);
    expect(stats?.distanceM).toBe(42_000);
    const vehicles = await repos.vehicles.listForUser(user.id);
    expect(vehicles.map((v) => v.carId)).toEqual(['toro']);
    expect(vehicles[0].upgrades.engine).toBe(1);
    const missions = await repos.missions.listForUser(user.id);
    expect(missions[0].missionId).toBe('first-drive');
    expect(missions[0].bestTimeMs).toBe(38_400);
  });

  it('unlocks achievements derived from the save', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    const out = await svc.sync(user.id, validSave({
      stats: {
        distanceM: 150_000, playtimeSec: 10_000, missionsCompleted: 10, missionsFailed: 1,
        collisions: 3, busts: 0, escapes: 6, topSpeedKmh: 240, moneyEarned: 120_000, moneySpent: 20_000, bestRunScore: 0,
      },
    }));
    expect(out.status).toBe('accepted');
    if (out.status !== 'accepted') return;
    const ids = out.achievements.map((a) => a.id);
    expect(ids).toContain('first-mission');
    expect(ids).toContain('road-tripper');
    expect(ids).toContain('high-roller');
    expect(ids).toContain('untouchable');
    // stored + mirrored into the blob for the client
    expect((await repos.achievements.listForUser(user.id)).length).toBe(ids.length);
    expect(out.save.data.achievements).toEqual(expect.arrayContaining(ids));
  });

  it('does not re-unlock already stored achievements', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    const first = await svc.sync(user.id, validSave());
    const second = await svc.sync(user.id, validSave({ rev: 6 }));
    if (first.status !== 'accepted' || second.status !== 'accepted') throw new Error('expected accepts');
    expect(second.achievements).toHaveLength(0);
  });

  it('returns a conflict when the client revision is behind the server', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    await svc.sync(user.id, validSave({ rev: 10, money: 3_000 }));
    const out = await svc.sync(user.id, validSave({ rev: 7, money: 999_999 }));
    expect(out.status).toBe('conflict');
    if (out.status !== 'conflict') return;
    expect(out.serverSave.rev).toBe(10);
    // server state unchanged by the rejected push
    const stored = await repos.saves.get(user.id);
    expect(stored?.data.money).toBe(3_000);
  });

  it('sanitizes hostile blobs before storing them', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    const out = await svc.sync(user.id, {
      ...validSave(),
      money: -999,
      xp: 1e15,
      ownedCars: { jetpack: { upgrades: {}, paint: '#000000' } },
      completed: { 'win-everything': { stars: 3 } },
    });
    expect(out.status).toBe('accepted');
    const stored = await repos.saves.get(user.id);
    const data = stored?.data as SaveBlob;
    expect(data.money).toBeGreaterThanOrEqual(0);
    expect(data.xp).toBeLessThan(1e15);
    expect(data.ownedCars.jetpack).toBeUndefined();
    expect(data.ownedCars.toro).toBeDefined();          // granted back
    expect(data.completed['win-everything']).toBeUndefined();
  });

  it('rejects non-object payloads', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    expect((await svc.sync(user.id, 'hax')).status).toBe('rejected');
    expect((await svc.sync(user.id, 42)).status).toBe('rejected');
    expect((await svc.sync(user.id, null)).status).toBe('rejected');
  });

  it('clamps earn rates that outpace wall-clock time', async () => {
    const repos = createMemoryRepositories();
    const user = await repos.players.createUser({ isGuest: true });
    const svc = new SaveSyncService(repos);
    await svc.sync(user.id, validSave({ rev: 1, money: 1_000, xp: 100 }));
    // immediately claim millions one second later
    const out = await svc.sync(user.id, validSave({ rev: 2, money: 8_000_000, xp: 500_000 }));
    expect(out.status).toBe('accepted');
    const stored = await repos.saves.get(user.id);
    const data = stored?.data as SaveBlob;
    expect(data.money).toBeLessThan(50_000);   // bounded by rate × elapsed
    expect(data.xp).toBeLessThan(10_000);
  });
});
