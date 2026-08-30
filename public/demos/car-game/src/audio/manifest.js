// ══════════════════════════════════════════════════════════════
// AUDIO MANIFEST — every sound the game can play, mapped to the
// files under /public/audio. Pure data: imported by the runtime
// AND by unit tests (which verify each referenced file exists).
//
//   file     path under /audio (no extension)
//   formats  extension preference, first playable wins (wav/ogg/mp3)
//   channel  mixer channel: music | engine | sfx | environment | ui | voice
//   loop     long-running loop (single instance, gain-controlled)
//   preload  decoded up-front after first user gesture
//   gain     per-sound trim before the channel fader
//   pool     max simultaneous instances of this sound
//   cooldown min seconds between retriggers of this sound
//   ref/max  3D falloff radii for positional playback (metres)
// ══════════════════════════════════════════════════════════════

export const AUDIO_BASE = '/audio';

export const CHANNELS = ['master', 'music', 'engine', 'sfx', 'environment', 'ui', 'voice'];

/** Default channel faders (persisted in save.settings.volumes). */
export const DEFAULT_VOLUMES = {
  master: 1, music: 0.45, engine: 0.8, sfx: 0.9, environment: 0.55, ui: 0.9, voice: 1,
};

/** Legacy save keys → current channels (volumes written pre-audio-upgrade). */
export const LEGACY_VOLUME_KEYS = { fx: 'sfx', amb: 'environment' };

export const SOUNDS = {
  // ── UI ──────────────────────────────────────────────────────
  'ui.click':        { file: 'ui/click', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.9, cooldown: 0.03 },
  'ui.hover':        { file: 'ui/hover', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.5, cooldown: 0.06, pool: 1 },
  'ui.back':         { file: 'ui/back', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.8, cooldown: 0.05 },
  'ui.toggle_on':    { file: 'ui/toggle_on', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.7 },
  'ui.toggle_off':   { file: 'ui/toggle_off', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.7 },
  'ui.slider':       { file: 'ui/slider', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.45, cooldown: 0.05 },
  'ui.deny':         { file: 'ui/deny', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.7, cooldown: 0.15 },
  'ui.menu_transition': { file: 'ui/menu_transition', formats: ['ogg', 'mp3'], channel: 'ui', preload: true, gain: 0.55, cooldown: 0.12 },

  // ── missions ────────────────────────────────────────────────
  'mission.start':       { file: 'missions/mission_start', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.8 },
  'mission.countdown':   { file: 'missions/countdown', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.7 },
  'mission.go':          { file: 'missions/countdown_go', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.75 },
  'mission.checkpoint':  { file: 'missions/checkpoint', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.75 },
  'mission.complete':    { file: 'missions/mission_complete', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.85 },
  'mission.fail':        { file: 'missions/mission_fail', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.8 },
  'mission.level_up':    { file: 'missions/level_up', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.8 },
  'mission.busted':      { file: 'missions/busted', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.8 },

  // ── economy / rewards ───────────────────────────────────────
  'economy.coin':      { file: 'economy/coin', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.65, cooldown: 0.08 },
  'economy.purchase':  { file: 'economy/purchase', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.75 },
  'economy.upgrade':   { file: 'economy/upgrade', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.75 },
  'economy.refuel':    { file: 'economy/refuel', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.6, cooldown: 0.3 },

  // ── collisions ──────────────────────────────────────────────
  'crash.light':  { file: 'collisions/crash_light', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.9, cooldown: 0.08, ref: 6, max: 150 },
  'crash.medium': { file: 'collisions/crash_medium', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.95, cooldown: 0.08, ref: 7, max: 180 },
  'crash.heavy':  { file: 'collisions/crash_heavy', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 1.0, cooldown: 0.1, ref: 9, max: 240 },
  'crash.glass':  { file: 'collisions/glass', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.8, cooldown: 0.4, ref: 6, max: 120 },
  'crash.thud':   { file: 'collisions/thud', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.8, cooldown: 0.1, ref: 5, max: 90 },
  'crash.scrape': { file: 'collisions/scrape_loop', formats: ['wav', 'ogg', 'mp3'], channel: 'sfx', loop: true, gain: 0.7 },

  // ── vehicles ────────────────────────────────────────────────
  'horn.player':    { file: 'vehicles/horn', formats: ['ogg', 'mp3'], channel: 'sfx', loop: true, gain: 0.8 },
  'horn.ai_car':    { file: 'vehicles/horn_ai_car', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.6, cooldown: 1.5, pool: 2, ref: 6, max: 110 },
  'horn.ai_truck':  { file: 'vehicles/horn_ai_truck', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.7, cooldown: 1.5, pool: 2, ref: 8, max: 150 },
  'siren.wail':     { file: 'vehicles/siren_wail', formats: ['wav'], channel: 'sfx', loop: true, gain: 0.65, ref: 10, max: 260 },
  'siren.burst':    { file: 'vehicles/siren_burst', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.6 },
  'vehicle.door':   { file: 'vehicles/door', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.75, cooldown: 0.2 },
  'vehicle.buzzer': { file: 'vehicles/buzzer', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.6 },

  // ── engines (one-shots; RPM loop layers live in EngineAudio) ──
  'engine.start':    { file: 'engines/start', formats: ['ogg', 'mp3'], channel: 'engine', gain: 0.85 },
  'engine.stop':     { file: 'engines/stop', formats: ['ogg', 'mp3'], channel: 'engine', gain: 0.6 },
  'engine.blowoff':  { file: 'engines/blowoff', formats: ['ogg', 'mp3'], channel: 'engine', gain: 0.5, cooldown: 0.4 },
  'engine.backfire1': { file: 'engines/backfire_1', formats: ['ogg', 'mp3'], channel: 'engine', gain: 0.55, cooldown: 0.25 },
  'engine.backfire2': { file: 'engines/backfire_2', formats: ['ogg', 'mp3'], channel: 'engine', gain: 0.55, cooldown: 0.25 },

  // ── tires ───────────────────────────────────────────────────
  'tire.screech_onset': { file: 'tires/screech_onset', formats: ['ogg', 'mp3'], channel: 'sfx', gain: 0.55, cooldown: 0.5 },
  'tire.skid':   { file: 'tires/skid_loop', formats: ['wav', 'ogg', 'mp3'], channel: 'sfx', loop: true, gain: 0.85 },
  'tire.drift':  { file: 'tires/drift_loop', formats: ['wav', 'ogg', 'mp3'], channel: 'sfx', loop: true, gain: 0.85 },
  'tire.road':   { file: 'tires/road_loop', formats: ['wav', 'ogg', 'mp3'], channel: 'sfx', loop: true, gain: 0.8 },

  // ── environment ─────────────────────────────────────────────
  'env.rain':      { file: 'environment/rain_loop', formats: ['ogg', 'mp3'], channel: 'environment', loop: true, gain: 0.8 },
  'env.wind':      { file: 'environment/wind_loop', formats: ['ogg', 'mp3'], channel: 'environment', loop: true, gain: 0.85 },
  'env.city_day':  { file: 'environment/city_day_loop', formats: ['wav'], channel: 'environment', loop: true, gain: 0.8 },
  'env.city_night': { file: 'environment/city_night_loop', formats: ['wav'], channel: 'environment', loop: true, gain: 0.75 },
  'env.thunder1':  { file: 'environment/thunder_1', formats: ['ogg', 'mp3'], channel: 'environment', gain: 0.9, pool: 1 },
  'env.thunder2':  { file: 'environment/thunder_2', formats: ['ogg', 'mp3'], channel: 'environment', gain: 0.85, pool: 1 },
  'env.thunder3':  { file: 'environment/thunder_3', formats: ['ogg', 'mp3'], channel: 'environment', gain: 0.85, pool: 1 },
  'env.splash':    { file: 'environment/splash', formats: ['ogg', 'mp3'], channel: 'environment', gain: 0.6, cooldown: 0.6, ref: 4, max: 40 },
  'env.traffic_pass': { file: 'environment/traffic_pass', formats: ['ogg', 'mp3'], channel: 'environment', gain: 0.6, cooldown: 0.25, pool: 3, ref: 5, max: 55 },

  // ── music ───────────────────────────────────────────────────
  'music.menu': { file: 'music/menu_loop', formats: ['ogg', 'mp3'], channel: 'music', loop: true, gain: 0.8, lazy: true },
  'music.game': { file: 'music/game_loop', formats: ['ogg', 'mp3'], channel: 'music', loop: true, gain: 0.8, lazy: true },
};

/**
 * Engine RPM loop layers per vehicle audio profile. `rpm` is the
 * absolute engine speed the file was rendered at (see
 * tools/generate-audio.mjs) and `cyl` the cylinder count used —
 * together they give the file's baked-in firing frequency, which
 * the runtime pitch-matches when crossfading layers.
 */
export const ENGINE_PROFILES = {
  sport: {
    cyl: 10,
    layers: [
      { id: 'idle', center: 0.06, rpm: 900 },
      { id: 'low', center: 0.30, rpm: 2600 },
      { id: 'mid', center: 0.60, rpm: 4600 },
      { id: 'high', center: 0.90, rpm: 6600 },
    ],
    file: (layer) => `engines/sport_${layer}`,
    formats: ['wav'],
  },
  std: {
    cyl: 4,
    layers: [
      { id: 'idle', center: 0.06, rpm: 900 },
      { id: 'low', center: 0.30, rpm: 2600 },
      { id: 'mid', center: 0.60, rpm: 4600 },
      { id: 'high', center: 0.90, rpm: 6600 },
    ],
    file: (layer) => `engines/std_${layer}`,
    formats: ['wav'],
  },
};

/** Styles that get the sport engine character (supercar/sports). */
const SPORT_STYLES = new Set(['lambo', 'sports', 'super']);

/**
 * Derive the engine audio setup for a catalog vehicle definition.
 * Pure function (unit-tested): profile + pitch scaling + turbo.
 */
export function engineProfileFor(def, upgrades = {}) {
  const style = def?.style || 'sedan';
  const profile = SPORT_STYLES.has(style) ? 'sport' : 'std';
  const eng = def?.engine || { base: 72, range: 150, sub: 0.5 };
  // per-car pitch multiplier from the catalog tuning (base 72→~0.96, 92→~1.06)
  const pitch = 0.92 + (eng.base - 72) / 200;
  return {
    profile,
    pitch,
    sub: eng.sub ?? 0.5,
    // turbo whistle scales with engine upgrade level
    turbo: 0.35 + 0.35 * ((upgrades.engine || 0) + (upgrades.nitro || 0) * 0.5) / 3,
    redlineHz: eng.base + eng.range,
  };
}
