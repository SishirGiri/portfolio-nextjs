// ════════════════════════════════════════════════════════
// EVENTS — the names every system may emit/listen for.
// Systems talk through the EventBus instead of calling each
// other directly (see core/EventBus.js).
// ════════════════════════════════════════════════════════

export const EVENTS = {
  // lifecycle
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_STOPPED: 'game:stopped',

  // missions
  MISSION_STARTED: 'mission:started',
  MISSION_COMPLETED: 'mission:completed',   // {mission, stars, money, xp, elapsed, isRoam, vehicleId, distanceM}
  MISSION_FAILED: 'mission:failed',        // {mission, reason, isRoam}

  // progression
  PLAYER_LEVEL_UP: 'player:level-up',      // {level}
  XP_EARNED: 'player:xp',                  // {amount}
  MONEY_EARNED: 'player:money-earned',     // {amount, reason}
  MONEY_SPENT: 'player:money-spent',       // {amount, reason}
  VEHICLE_PURCHASED: 'vehicle:purchased',  // {vehicleId}
  UPGRADE_PURCHASED: 'upgrade:purchased',  // {vehicleId, upgrade, level}

  // saves + sync
  SAVE_COMPLETED: 'save:completed',
  SAVE_FAILED: 'save:failed',              // {error}
  SAVE_CORRUPTED: 'save:corrupted',        // {backedUpAs}
  SYNC_STATUS_CHANGED: 'sync:status',      // {status: idle|syncing|offline|error|off}
  SYNC_CONFLICT: 'sync:conflict',          // {resolved: 'local'|'server'}
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked', // {id, name, desc}

  // accounts + leaderboards
  AUTH_CHANGED: 'auth:changed',            // {user|null}
  LEADERBOARD_UPDATED: 'leaderboard:updated',
};
