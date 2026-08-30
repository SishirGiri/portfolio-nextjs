// ══════════════════════════════════════════════════════════════
// AUDIO SYSTEM TESTS — manifest integrity (every referenced file
// exists on disk), pure DSP math (Doppler, engine layer windows,
// per-vehicle profiles) and legacy volume migration.
// ══════════════════════════════════════════════════════════════
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUDIO_BASE, CHANNELS, DEFAULT_VOLUMES, ENGINE_PROFILES, SOUNDS, engineProfileFor,
} from '../../public/demos/car-game/src/audio/manifest.js';
import { Spatializer } from '../../public/demos/car-game/src/audio/Spatializer.js';
import { EngineAudio } from '../../public/demos/car-game/src/audio/EngineAudio.js';
import { GameAudio } from '../../public/demos/car-game/src/audio.js';
import { defaultSave } from '../../public/demos/car-game/src/data/save.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

describe('audio manifest', () => {
  it('every sound id maps to a channel that exists', () => {
    for (const [id, e] of Object.entries(SOUNDS)) {
      expect(CHANNELS, `channel of ${id}`).toContain(e.channel);
    }
  });

  it('every referenced file exists on disk in at least one format', () => {
    const missing = [];
    for (const [id, e] of Object.entries(SOUNDS)) {
      const ok = e.formats.some((ext) =>
        existsSync(join(PUBLIC, AUDIO_BASE, `${e.file}.${ext}`)));
      if (!ok) missing.push(`${id} → ${e.file}.{${e.formats}}`);
    }
    expect(missing, `missing asset files: ${missing.join(', ')}`).toEqual([]);
  });

  it('engine profile layer files exist', () => {
    for (const [name, p] of Object.entries(ENGINE_PROFILES)) {
      for (const L of p.layers) {
        const path = join(PUBLIC, AUDIO_BASE, p.file(L.id) + '.wav');
        expect(existsSync(path), `${name}/${L.id}`).toBe(true);
      }
    }
  });

  it('default volumes cover every channel', () => {
    for (const ch of CHANNELS) expect(DEFAULT_VOLUMES).toHaveProperty(ch);
  });
});

describe('engine profiles', () => {
  it('supercars get the sport character, commuters the std one', () => {
    expect(engineProfileFor({ style: 'lambo' }).profile).toBe('sport');
    expect(engineProfileFor({ style: 'super' }).profile).toBe('sport');
    expect(engineProfileFor({ style: 'sports' }).profile).toBe('sport');
    expect(engineProfileFor({ style: 'hatch' }).profile).toBe('std');
    expect(engineProfileFor({ style: 'sedan' }).profile).toBe('std');
    expect(engineProfileFor({ style: 'suv' }).profile).toBe('std');
    expect(engineProfileFor(null).profile).toBe('std');
  });

  it('catalog engine tuning scales the per-car pitch', () => {
    const toro = engineProfileFor({ style: 'lambo', engine: { base: 92, range: 245, sub: 0.22 } });
    const corsa = engineProfileFor({ style: 'hatch', engine: { base: 72, range: 150, sub: 0.5 } });
    expect(toro.pitch).toBeGreaterThan(corsa.pitch);
    expect(toro.pitch).toBeCloseTo(1.02, 1);
    expect(corsa.pitch).toBeCloseTo(0.92, 1);
  });

  it('engine upgrades grow the turbo whistle', () => {
    const stock = engineProfileFor({ style: 'lambo' }).turbo;
    const built = engineProfileFor({ style: 'lambo' }, { engine: 3, nitro: 3 }).turbo;
    expect(built).toBeGreaterThan(stock);
    expect(built).toBeLessThanOrEqual(1.05);
  });
});

describe('engine crossfade math', () => {
  it('layer windows peak at their centers and vanish past the width', () => {
    const w = EngineAudio.layerWindow;
    expect(w(0.30, 0.30)).toBeCloseTo(1);
    expect(w(0.60, 0.60)).toBeCloseTo(1);
    expect(w(0.30 + 0.35, 0.30)).toBe(0);
    expect(w(0, 0.9)).toBe(0);
  });

  it('adjacent layers overlap so there is never a silent gap', () => {
    const centers = ENGINE_PROFILES.sport.layers.map((l) => l.center);
    for (let i = 0; i < centers.length - 1; i++) {
      const mid = (centers[i] + centers[i + 1]) / 2;
      const sum = EngineAudio.layerWindow(mid, centers[i])
        + EngineAudio.layerWindow(mid, centers[i + 1]);
      expect(sum).toBeGreaterThan(0.9);
    }
  });

  it('file layers pitch-align: all layers map to the same firing Hz', () => {
    const conf = ENGINE_PROFILES.sport;
    const fireAt = (rpm) => (rpm / 60) * (conf.cyl / 2);
    for (const rpmNorm of [0.15, 0.45, 0.75, 0.95]) {
      const rpm = 900 + rpmNorm * 6300;
      const target = fireAt(rpm);
      for (const L of conf.layers) {
        const rate = target / fireAt(L.rpm);
        // effective frequency of that layer at this rpm
        expect(fireAt(L.rpm) * rate).toBeCloseTo(target, 6);
      }
    }
  });
});

describe('spatial math', () => {
  it('doppler: approaching pitch up, receding pitch down, clamped', () => {
    expect(Spatializer.dopplerRate(-34.3)).toBeGreaterThan(1);   // 10% toward
    expect(Spatializer.dopplerRate(34.3)).toBeLessThan(1);       // 10% away
    expect(Spatializer.dopplerRate(0)).toBe(1);
    expect(Spatializer.dopplerRate(-5000)).toBeLessThanOrEqual(1.38);
    expect(Spatializer.dopplerRate(5000)).toBeGreaterThanOrEqual(0.72);
  });

  it('radial velocity uses source AND listener motion', () => {
    const sz = Object.create(Spatializer.prototype);
    sz.pos = { x: 0, y: 0, z: 0 };
    sz._listenerVel = { x: 0, z: 10 };   // listener driving +z away from origin-facing source at +z? see below
    // source at (0, 30) moving toward listener at 20 m/s
    const v = sz.radialVelocity(0, 30, 0, -20);
    // radial axis points from listener to source (+z); source approaches → negative
    expect(v).toBe(-20 - 10);
  });
});

describe('volume migration', () => {
  it('default save carries all seven channels', () => {
    const vols = defaultSave().settings.volumes;
    for (const ch of CHANNELS) expect(vols).toHaveProperty(ch);
  });

  it('manager maps legacy fx/amb keys onto sfx/environment', () => {
    const g = new GameAudio();
    g.setVolumes({ fx: 0.3, amb: 0.7, music: 0.5 });
    expect(g.mgr.volumes.sfx).toBeCloseTo(0.3);
    expect(g.mgr.volumes.environment).toBeCloseTo(0.7);
    expect(g.mgr.volumes.music).toBeCloseTo(0.5);
    expect(g.mgr.volumes.master).toBe(DEFAULT_VOLUMES.master);
  });

  it('out-of-range values are clamped, garbage ignored', () => {
    const g = new GameAudio();
    g.setVolumes({ music: 42, engine: -3, bogus: 0.5 });
    expect(g.mgr.volumes.music).toBe(1);
    expect(g.mgr.volumes.engine).toBe(0);
    expect(g.mgr.volumes).not.toHaveProperty('bogus');
  });
});
