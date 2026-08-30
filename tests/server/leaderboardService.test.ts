import { beforeEach, describe, expect, it } from 'vitest';
import { LeaderboardService } from '../../src/server/services/leaderboardService';
import { createMemoryRepositories } from '../../src/server/repositories/memory';
import { resetRateLimits } from '../../src/server/services/antiCheat';

beforeEach(() => resetRateLimits());

function player(name?: string) {
  const repos = createMemoryRepositories();
  return {
    repos,
    svc: new LeaderboardService(repos),
    user: null as unknown as Awaited<ReturnType<typeof repos.players.createUser>>,  // assigned in init()
    async init() {
      this.user = await repos.players.createUser(
        name ? { username: name, isGuest: false } : { isGuest: true },
      );
      return this;
    },
  };
}

describe('LeaderboardService.submitRun', () => {
  it('computes the score server-side and stores the entry', async () => {
    const p = await player('speedy').init();
    const out = await p.svc.submitRun(p.user!, {
      missionId: 'checkpoint-race', elapsedMs: 105_000, stars: 3, vehicleId: 'toro',
      distanceM: 1_800, collisions: 1,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.score).toBe(720);
    expect(out.isPersonalBest).toBe(true);
    const entries = await p.repos.leaderboard.bestForUser(p.user!.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].score).toBe(720);
  });

  it('accumulates career score only by personal-best delta', async () => {
    const p = await player('grinder').init();
    await p.svc.submitRun(p.user!, { missionId: 'checkpoint-race', elapsedMs: 120_000, stars: 2, vehicleId: 'toro', distanceM: 1_500, collisions: 0 });
    let profile = await p.repos.players.getProfile(p.user!.id);
    const afterFirst = profile?.careerScore ?? 0;
    expect(afterFirst).toBeGreaterThan(0);

    // slower run — career score must not change
    await p.svc.submitRun(p.user!, { missionId: 'checkpoint-race', elapsedMs: 150_000, stars: 2, vehicleId: 'toro', distanceM: 1_500, collisions: 0 });
    profile = await p.repos.players.getProfile(p.user!.id);
    expect(profile?.careerScore).toBe(afterFirst);

    // better run — career score grows by the personal-best DELTA
    // (525 stored best; new best 945 → 525 + (945 − 525) = 945)
    const better = await p.svc.submitRun(p.user!, { missionId: 'checkpoint-race', elapsedMs: 80_000, stars: 3, vehicleId: 'toro', distanceM: 1_600, collisions: 0 });
    profile = await p.repos.players.getProfile(p.user!.id);
    if (better.ok) expect(profile?.careerScore).toBe(better.score);
  });

  it('rejects impossible runs', async () => {
    const p = await player().init();
    const out = await p.svc.submitRun(p.user!, {
      missionId: 'checkpoint-race', elapsedMs: 1_000, stars: 3, vehicleId: 'toro',
      distanceM: 100, collisions: 0,
    });
    expect(out.ok).toBe(false);
    expect(await p.repos.leaderboard.bestForUser(p.user!.id)).toHaveLength(0);
  });

  it('rate-limits flooding', async () => {
    const p = await player().init();
    let ok = 0;
    for (let i = 0; i < 30; i++) {
      const out = await p.svc.submitRun(p.user!, {
        missionId: 'checkpoint-race', elapsedMs: 100_000 + i * 100, stars: 1, vehicleId: 'toro',
        distanceM: 1_500, collisions: 0,
      });
      if (out.ok) ok++;
    }
    expect(ok).toBe(25);   // RATE_LIMIT.maxSubmissions
  });
});

describe('LeaderboardService.board', () => {
  it('overall board ranks career scores across players', async () => {
    const repos = createMemoryRepositories();
    const svc = new LeaderboardService(repos);
    const a = await repos.players.createUser({ username: 'aaa', isGuest: false });
    const b = await repos.players.createUser({ username: 'bbb', isGuest: false });
    await repos.players.upsertProfile(a.id, { careerScore: 500, currentCar: 'toro' });
    await repos.players.upsertProfile(b.id, { careerScore: 900, currentCar: 'axiom' });

    const board = await svc.board({ scope: 'overall' });
    expect(board?.entries.map((e) => e.displayName)).toEqual(['bbb', 'aaa']);
    expect(board?.entries[0].score).toBe(900);
    expect(board?.entries[0].vehicleName).toBe('Axiom X');
    expect(board?.entries[0].rank).toBe(1);
  });

  it('mission board shows the best run per player', async () => {
    const repos = createMemoryRepositories();
    const svc = new LeaderboardService(repos);
    const a = await repos.players.createUser({ username: 'aaa', isGuest: false });
    await svc.submitRun(a, { missionId: 'checkpoint-race', elapsedMs: 100_000, stars: 2, vehicleId: 'toro', distanceM: 1_500, collisions: 0 });
    await svc.submitRun(a, { missionId: 'checkpoint-race', elapsedMs: 90_000, stars: 3, vehicleId: 'toro', distanceM: 1_500, collisions: 0 });

    const board = await svc.board({ scope: 'checkpoint-race' });
    expect(board?.total).toBe(1);   // one player, not two entries
    expect(board?.entries).toHaveLength(1);
    // the 3-star faster run has the higher score
    expect(board?.entries[0].stars).toBe(3);
  });

  it('pagination slices correctly', async () => {
    const repos = createMemoryRepositories();
    const svc = new LeaderboardService(repos);
    for (let i = 0; i < 7; i++) {
      const u = await repos.players.createUser({ username: `driver${i}`, isGuest: false });
      await repos.players.upsertProfile(u.id, { careerScore: (i + 1) * 10 });
    }
    const page1 = await svc.board({ scope: 'overall', limit: 5 });
    const page2 = await svc.board({ scope: 'overall', limit: 5, page: 2 });
    expect(page1?.entries).toHaveLength(5);
    expect(page2?.entries).toHaveLength(2);
    expect(page1?.total).toBe(7);
    expect(page2?.entries[0].rank).toBe(6);
  });

  it('public boards exclude guests; mine lists personal bests', async () => {
    const repos = createMemoryRepositories();
    const svc = new LeaderboardService(repos);
    const guest = await repos.players.createUser({ isGuest: true });
    const named = await repos.players.createUser({ username: 'ranked', isGuest: false });
    for (const u of [guest, named]) await repos.players.upsertProfile(u.id, { careerScore: 500 });
    const board = await svc.board({ scope: 'overall' });
    expect(board?.total).toBe(1);               // guest filtered out
    expect(board?.entries[0].displayName).toBe('ranked');

    await svc.submitRun(named, { missionId: 'checkpoint-race', elapsedMs: 100_000, stars: 3, vehicleId: 'toro', distanceM: 1_000, collisions: 0 });
    const mine = await svc.board({ scope: 'mine', viewer: named });
    expect(mine?.total).toBe(1);
    expect(mine?.entries[0].isMe).toBe(true);
    expect(mine?.entries[0].score).toBeGreaterThan(0);
  });

  it('returns null for an unknown scope', async () => {
    const p = await player().init();
    expect(await p.svc.board({ scope: 'win-everything' })).toBeNull();
  });
});
