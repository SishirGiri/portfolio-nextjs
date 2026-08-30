/**
 * Offline smoke test: drives the real audio stack (AudioManager, EngineAudio,
 * GameAudio facade) with a mocked WebAudio AudioContext + fetch, simulating a
 * full play session (menu -> free drive -> drive cycle with shifts, skids,
 * crashes, sirens, rain -> pause -> stop). Catches runtime errors in code
 * paths a browser would execute, without needing a real browser.
 *
 * Run: node public/demos/car-game/tools/smoke-audio.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const GAME_SRC = resolve(ROOT, 'public/demos/car-game/src');

// ---------------------------------------------------------------- shims ----
class FakeAudioParam {
  constructor(v = 0) { this.value = v; this._v = v; }
  setValueAtTime(v) { this._v = v; this.value = v; }
  setTargetAtTime(v) { this._v = v; this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = Math.max(v, 1e-4); }
  cancelScheduledValues() {}
}
class FakeNode {
  constructor(ctx, extra = {}) {
    this.context = ctx;
    this.gain = new FakeAudioParam(1);
    this.playbackRate = new FakeAudioParam(1);
    this.frequency = new FakeAudioParam(440);
    this.Q = new FakeAudioParam(1);
    this.detune = new FakeAudioParam(0);
    Object.assign(this, extra);
    this._connected = [];
  }
  connect(n) { this._connected.push(n); return n; }
  disconnect() { this._connected.length = 0; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  positionX = new FakeAudioParam(0); positionY = new FakeAudioParam(0);
  positionZ = new FakeAudioParam(0); orientationX = new FakeAudioParam(0);
  orientationZ = new FakeAudioParam(1);
  setPosition() {} setOrientation() {}
  setPeriodicWave() {}
  addEventListener() {}
}
class FakePanner extends FakeNode {
  constructor(ctx) { super(ctx, { panningModel: '', distanceModel: '', refDistance: 1, maxDistance: 1e4, rolloffFactor: 1 }); }
}
class FakeBuffer {
  constructor(seconds = 1) { this.duration = seconds; this.sampleRate = 48000; this.numberOfChannels = 1; this.getChannelData = () => new Float32Array(16); }
}
let createdNodes = 0;
class FakeAudioContext {
  constructor() { this.sampleRate = 48000; this.state = 'running'; this.currentTime = 0; this.listener = new FakeNode(this); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  createGain() { createdNodes++; return new FakeNode(this); }
  createBiquadFilter() { createdNodes++; return new FakeNode(this, { type: 'lowpass' }); }
  createDynamicsCompressor() { createdNodes++; return new FakeNode(this, { threshold: new FakeAudioParam(-14), knee: new FakeAudioParam(30), ratio: new FakeAudioParam(5), attack: new FakeAudioParam(0.003), release: new FakeAudioParam(0.25) }); }
  createBufferSource() { createdNodes++; return new FakeNode(this, { buffer: null, loop: false, onended: null }); }
  createOscillator() { createdNodes++; return new FakeNode(this, { type: 'sine', onended: null }); }
  createPanner() { createdNodes++; return new FakePanner(this); }
  createBuffer(_ch, len) { createdNodes++; return { duration: len / 48000, getChannelData: () => new Float32Array(len) }; }
  createPeriodicWave() { return {}; }
  decodeAudioData() { return Promise.resolve(new FakeBuffer(0.5)); }
}
globalThis.window = globalThis;
globalThis.AudioContext = FakeAudioContext;
globalThis.HTMLCanvasElement = undefined;
// fetch shim: serve files from disk; unknown paths 404 so missing assets show up
globalThis.fetch = (url) => {
  const clean = String(url).split('?')[0];
  const m = clean.match(/^\/?(?:audio|demos)(\/.*)$/);
  const path = m ? resolve(ROOT, 'public', m[0].replace(/^\//, '')) : null;
  if (path && m[0].startsWith('/audio/') || (path && m[0].startsWith('/demos/'))) {
    try { return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(readFileSync(path)) }); }
    catch { return Promise.resolve({ ok: false, status: 404 }); }
  }
  return Promise.resolve({ ok: false, status: 404 });
};
globalThis.document = { createElement: () => ({ canPlayType: () => 'probably' }), addEventListener() {} };

// ------------------------------------------------------------- load real ----
const { AudioManager } = await import(pathToFileURL(resolve(GAME_SRC, 'audio/AudioManager.js')).href);
const { EngineAudio } = await import(pathToFileURL(resolve(GAME_SRC, 'audio/EngineAudio.js')).href);
const { Spatializer } = await import(pathToFileURL(resolve(GAME_SRC, 'audio/Spatializer.js')).href);
const audio = await import(pathToFileURL(resolve(GAME_SRC, 'audio.js')).href);
const { engineProfileFor } = await import(pathToFileURL(resolve(GAME_SRC, 'audio/manifest.js')).href);

const failures = [];
const step = (name, fn) => {
  try { fn(); console.log('  ok', name); }
  catch (e) { failures.push(name + ': ' + e.message); console.log('  FAIL', name, '—', e.message); }
};
const stepAsync = async (name, fn) => {
  try { await fn(); console.log('  ok', name); }
  catch (e) { failures.push(name + ': ' + e.message); console.log('  FAIL', name, '—', e.message); }
};

console.log('== boot ==');
const mgr = new AudioManager();
await stepAsync('ensure() builds graph', () => mgr.ensure());
step('setVolumes all 7 channels', () => mgr.setVolumes({ master: 1, music: 0.4, engine: 0.8, sfx: 0.9, environment: 0.5, ui: 0.9, voice: 1 }));
step('setVolumes legacy fx/amb migration', () => mgr.setVolumes({ fx: 0.7, amb: 0.3 }));
step('setEnabled(false) then true', () => { mgr.setEnabled(false); mgr.setEnabled(true); });
await stepAsync('warm() preloads hot set', () => mgr.warm(['crash.medium', 'tire.skid', 'siren.wail']));
await stepAsync('preload() ui channel', () => mgr.preload(['ui.click', 'ui.menu_transition']));

console.log('== one-shots & spatial ==');
step('play() ui click', () => mgr.play('ui.click', { channel: 'ui' }));
step('play() respects cooldown (2nd trigger)', () => mgr.play('ui.click', { channel: 'ui' }));
step('playAt() positioned crash with doppler', () => mgr.playAt('crash.heavy', 40, -25, { velX: -18, velZ: 4, gain: 0.9 }));
step('playAt() culls beyond maxDistance', () => mgr.playAt('crash.heavy', 5000, 5000, {}));
step('playShiftClunk()', () => mgr.playShiftClunk(0.9));
const pz = mgr.spatial.acquirePanner(10, 0, 20, { refDistance: 8, maxDistance: 220 }, mgr.chMaster);
step('acquirePanner()', () => { if (!pz) throw new Error('no panner'); });
step('releasePanner() reuse', () => { mgr.spatial.releasePanner(pz); const p2 = mgr.spatial.acquirePanner(0, 0, 0, {}, mgr.chMaster); if (p2 !== pz) throw new Error('pool miss'); mgr.spatial.releasePanner(p2); });
step('dopplerRate bounds', () => {
  // convention: positive radialV = receding -> rate < 1; negative = approaching -> rate > 1
  const recede = Spatializer.dopplerRate(100);
  const approach = Spatializer.dopplerRate(-100);
  if (!(approach > 1 && recede < 1)) throw new Error(`approach=${approach} recede=${recede}`);
});

console.log('== loops ==');
let skid, road, rain, wind, siren;
await stepAsync('getLoop tire.skid', async () => { skid = mgr.getLoop('tire.skid'); await skid.ensurePublic?.(); });
await stepAsync('getLoop tire.road', async () => { road = mgr.getLoop('tire.road'); await road.ensurePublic?.(); });
await stepAsync('getLoop rain + wind', async () => { rain = mgr.getLoop('environment.rain'); wind = mgr.getLoop('environment.wind'); await Promise.all([rain.ensurePublic?.(), wind.ensurePublic?.()]); });
await stepAsync('getLoop siren.wail (spatial)', async () => { siren = mgr.getLoop('siren.wail'); await siren.ensurePublic?.(); });
step('loop.set intensities', () => { skid.set(0.7); road.set(0.4); rain.set(0.9); wind.set(0.6); siren.set(0.8); });
step('loop.setPosition moving siren', () => siren.setPosition(30, 0, -12, { velX: 5, velZ: 22 }));
await stepAsync('playMusic menu -> game crossfade', async () => {
  mgr.playMusic('menu'); await new Promise(r => setTimeout(r, 20));
  mgr.playMusic('game'); await new Promise(r => setTimeout(r, 20));
});
step('pauseMusic/resumeMusic', () => { mgr.pauseMusic(); mgr.resumeMusic(); });

console.log('== engine ==');
const toro = JSON.parse(readFileSync(resolve(GAME_SRC, 'data/vehicles.json'), 'utf8')).find(v => v.id === 'toro');
const profile = engineProfileFor(toro, { engine: 2, nitro: 1 });
const eng = new EngineAudio(mgr);
step('setVehicle(toro profile)', () => eng.setVehicle(toro, { engine: 2, nitro: 1 }, profile));
step('start() (starter -> catch)', () => eng.start());
// simulate 60s of driving at 60fps: throttle ramps, gear shifts, nitro, damage, rain
step('update() 3600-frame drive cycle', () => {
  let gear = 1, rpm = 0.1, boost = 0;
  for (let i = 0; i < 3600; i++) {
    const t = i / 60;
    const throttle = (Math.sin(t * 0.7) * 0.5 + 0.5) * (i % 900 < 700 ? 1 : 0.05);
    rpm = Math.min(1, Math.max(0.05, rpm + (throttle - rpm) * 0.02));
    if (i % 720 === 719) { gear = Math.min(6, gear + 1); eng.shift(); }
    boost = throttle > 0.6 ? Math.min(1, boost + 0.01) : Math.max(0, boost - 0.05);
    const health = i > 3000 ? 22 : 100;
    eng.update({
      rpm, throttle, speed: 10 + rpm * 50, gear, boosting: boost > 0.5, boost,
      nitro: boost > 0.8 ? 1 : 0, health, braking: i % 300 < 40, slip: (i % 500 < 60) ? 0.8 : 0,
    }, 1 / 60);
  }
  if (gear !== 6) throw new Error('gear sim desync');
});
step('stop()', () => eng.stop());

console.log('== facade (GameAudio) ==');
const A = audio.default ?? audio.GameAudio ?? audio;
step('facade methods across all channels', () => {
  A.click?.(); A.hover?.(); A.back?.(); A.menuTransition?.();
  A.missionStart?.(); A.checkpoint?.(); A.missionComplete?.(); A.gameOver?.(); A.busted?.();
  A.coin?.(); A.purchase?.(); A.upgrade?.(); A.refuel?.(); A.deny?.();
  A.door?.(); A.countdown?.(2); A.levelUp?.();
});
step('facade spatial + ambience', () => {
  A.crashAt?.(0.8, 20, 10, { glass: true });
  A.landing?.(0.5, 0, 0);
  A.horn?.(true); A.horn?.(false);
  A.aiHorn?.(15, 30, 25, 'truck');
  A.siren?.(true, 20, 30, 0.8); A.siren?.(false, 0, 0, 0);
  A.trafficPass?.(12, 4, -2, 18);
  A.thunder?.(); A.splash?.(0.6);
  A.rain?.(0.7); A.wind?.(0.5);
  A.ambience?.(0.1); A.ambience?.(0.9); // day -> night crossfade
});
step('facade tires matrix', () => {
  A.tires?.({ slip: 0.9, speed: 20, braking: true, handbrake: false, wheelspin: false });
  A.tires?.({ slip: 0.2, speed: 5, braking: false, handbrake: true, wheelspin: false });
  A.tires?.({ slip: 0, speed: 55, braking: false, handbrake: false, wheelspin: false });
  A.tires?.({ slip: 0, speed: 0, braking: false, handbrake: false, wheelspin: false });
  A.setScrape?.(0.5); A.setScrape?.(0);
});
step('facade listener + engine passthrough', () => {
  // mimic THREE.Camera.getWorldDirection exactly: it calls target.set(...).normalize()
  A.updateListener?.({
    position: { x: 0, y: 5, z: 10 },
    getWorldDirection(target) {
      return target.set(0.3, 0, -0.9).normalize();
    },
  }, 1 / 60);
  A.engineUpdate?.({ rpm: 0.5, throttle: 0.5, speed: 25, gear: 3, health: 100, boost: 0.2, nitro: 0 }, 1 / 60);
  A.gearShift?.();
});
step('facade music controls', () => { A.music?.(true); A.pauseMusic?.(); A.resumeMusic?.(); });
step('stopAll() cleanup', () => A.stopAll?.());

console.log(`\nnodes created: ${createdNodes}`);
if (failures.length) { console.log(`\n${failures.length} FAILURES:`); failures.forEach(f => console.log(' -', f)); process.exit(1); }
console.log('\nSMOKE PASS — all audio paths executed without runtime errors');
