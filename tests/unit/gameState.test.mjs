import { describe, it, expect } from 'vitest';
import { GameState, State } from '../../public/demos/car-game/src/core/GameState.js';

describe('GameState machine', () => {
  it('boots → loading → menu', () => {
    const sm = new GameState();
    expect(sm.current).toBe(State.BOOT);
    expect(sm.set(State.MENU)).toBeNull();          // illegal skip
    expect(sm.set(State.LOADING)).toBe(State.LOADING);
    expect(sm.set(State.MENU)).toBe(State.MENU);
  });

  it('menu → gameplay ⇄ paused → results → menu', () => {
    const sm = new GameState();
    sm.force(State.MENU);
    expect(sm.set(State.GAMEPLAY)).toBe(State.GAMEPLAY);
    expect(sm.set(State.PAUSED)).toBe(State.PAUSED);
    expect(sm.set(State.GAMEPLAY)).toBe(State.GAMEPLAY);
    expect(sm.set(State.RESULTS)).toBe(State.RESULTS);
    expect(sm.set(State.MENU)).toBe(State.MENU);
  });

  it('menu screens can hop between each other and back to menu', () => {
    const sm = new GameState();
    sm.force(State.MENU);
    expect(sm.set(State.GARAGE)).toBe(State.GARAGE);
    expect(sm.set(State.DEALER)).toBe(State.DEALER);
    expect(sm.set(State.LEADERBOARD)).toBe(State.LEADERBOARD);
    expect(sm.set(State.MENU)).toBe(State.MENU);
  });

  it('rejects unknown states and same-state transitions', () => {
    const sm = new GameState();
    expect(sm.can('NONSENSE')).toBe(false);
    sm.force(State.MENU);
    expect(sm.set(State.MENU)).toBeNull();
  });

  it('notifies the change callback with (next, from)', () => {
    const changes = [];
    const sm = new GameState((next, from) => changes.push([next, from]));
    sm.set(State.LOADING);
    sm.set(State.MENU);
    expect(changes).toEqual([[State.LOADING, State.BOOT], [State.MENU, State.LOADING]]);
  });
});
