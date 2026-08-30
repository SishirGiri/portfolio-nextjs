// ════════════════════════════════════════════════════════
// GAME STATE — centralized finite state machine.
//
//   BOOT → LOADING → MENU ⇄ {MISSIONS, GARAGE, DEALER,
//                            SETTINGS, LEADERBOARD, ACCOUNT}
//          MENU → GAMEPLAY ⇄ PAUSED
//          GAMEPLAY → RESULTS → MENU
//
// The machine only guards transitions; it holds no game
// logic. Anything may return to MENU (esc/back), and
// GAMEPLAY may restart (RESULTS → GAMEPLAY, "replay").
// ════════════════════════════════════════════════════════

export const State = Object.freeze({
  BOOT: 'BOOT',
  LOADING: 'LOADING',
  MENU: 'MENU',
  MISSIONS: 'MISSIONS',
  GARAGE: 'GARAGE',
  DEALER: 'DEALER',
  SETTINGS: 'SETTINGS',
  LEADERBOARD: 'LEADERBOARD',
  ACCOUNT: 'ACCOUNT',
  MULTIPLAYER: 'MULTIPLAYER',
  FRIENDS: 'FRIENDS',
  COACH: 'COACH',
  ADMIN: 'ADMIN',
  GAMEPLAY: 'GAMEPLAY',
  PAUSED: 'PAUSED',
  RESULTS: 'RESULTS',
});

const MENU_SCREENS = new Set([State.MISSIONS, State.GARAGE, State.DEALER,
  State.SETTINGS, State.LEADERBOARD, State.ACCOUNT,
  State.MULTIPLAYER, State.FRIENDS, State.COACH, State.ADMIN]);

/** state -> set of states it may move to */
const TRANSITIONS = {
  [State.BOOT]: new Set([State.LOADING]),
  [State.LOADING]: new Set([State.MENU]),
  [State.MENU]: new Set([State.GAMEPLAY, ...MENU_SCREENS]),
  [State.GAMEPLAY]: new Set([State.PAUSED, State.RESULTS, State.MENU]),
  [State.PAUSED]: new Set([State.GAMEPLAY, State.RESULTS, State.MENU, ...MENU_SCREENS]),
  [State.RESULTS]: new Set([State.GAMEPLAY, State.MENU]),
};
// every menu screen can go back to MENU, hop to another screen,
// or (for garage/dealer/settings opened in-pause) resume play
for (const s of MENU_SCREENS) {
  TRANSITIONS[s] = new Set([State.MENU, State.GAMEPLAY, ...MENU_SCREENS]);
}

export class GameState {
  constructor(onChange) {
    this._state = State.BOOT;
    this._onChange = onChange || null;
    this._history = [State.BOOT];
  }

  get current() { return this._state; }
  get previous() { return this._history[this._history.length - 2] || null; }

  /** True when `next` is a legal move from the current state. */
  can(next) {
    if (!(next in State)) return false;
    if (next === this._state) return false;
    return TRANSITIONS[this._state]?.has(next) ?? false;
  }

  /**
   * Attempt a transition. Returns the state on success, null when
   * rejected (callers keep working unchanged — this is a guard,
   * not a crash).
   */
  set(next) {
    if (!this.can(next)) {
      console.warn(`[GameState] illegal transition ${this._state} → ${next}`);
      return null;
    }
    const from = this._state;
    this._state = next;
    this._history.push(next);
    if (this._history.length > 12) this._history.shift();
    this._onChange?.(next, from);
    return next;
  }

  /** Emergency hatch for menu-mode legacy code paths (mode strings). */
  force(next) {
    if (!(next in State)) return null;
    const from = this._state;
    this._state = next;
    this._history.push(next);
    this._onChange?.(next, from);
    return next;
  }
}
