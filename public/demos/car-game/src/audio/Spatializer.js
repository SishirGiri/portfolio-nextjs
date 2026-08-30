// ══════════════════════════════════════════════════════════════
// SPATIALIZER — 3D positional audio on top of the WebAudio
// PannerNode: distance attenuation, stereo positioning and a
// manual Doppler shift (PannerNode's own doppler is deprecated
// and a no-op in every current browser).
//
// The game is third-person: the listener is the CAMERA, not the
// car, so passing traffic pans and fades relative to where the
// player is actually looking.
// ══════════════════════════════════════════════════════════════
import { clamp } from '../utils.js';

const SPEED_OF_SOUND = 343;   // m/s — same unit family as car speeds

export class Spatializer {
  constructor(ctx) {
    this.ctx = ctx;
    this.listener = ctx.listener;
    this.pos = { x: 0, y: 40, z: 0 };
    this.fwd = { x: 0, y: 0, z: -1 };
    this._lastPos = null;
    this._listenerVel = { x: 0, z: 0 };
    this._pannerPool = [];
    this._activeSpatial = 0;
    this.maxSpatialVoices = 14;
    this.onVoiceEnded = null;
  }

  /**
   * Sync the WebAudio listener to the render camera.
   * @param {{x:number,y:number,z:number}} pos camera position
   * @param {{x:number,y:number,z:number}} forward camera forward (normalized)
   * @param {number} dt frame delta (listener velocity estimate)
   */
  updateListener(pos, forward, dt = 0.016) {
    this.pos.x = pos.x; this.pos.y = pos.y; this.pos.z = pos.z;
    this.fwd.x = forward.x; this.fwd.y = forward.y; this.fwd.z = forward.z;
    if (dt > 0) {
      if (this._lastPos) {
        this._listenerVel.x = (pos.x - this._lastPos.x) / dt;
        this._listenerVel.z = (pos.z - this._lastPos.z) / dt;
      }
      this._lastPos = { x: pos.x, z: pos.z };
    }
    const l = this.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pos.x, t, 0.02);
      l.positionY.setTargetAtTime(pos.y, t, 0.02);
      l.positionZ.setTargetAtTime(pos.z, t, 0.02);
      l.forwardX.setTargetAtTime(forward.x, t, 0.02);
      l.forwardY.setTargetAtTime(forward.y, t, 0.02);
      l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      if (l.upY) l.upY.setValueAtTime(1, t);
    } else if (l.setPosition) {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  /** Radial (approach) velocity of a source relative to the listener, m/s. */
  radialVelocity(x, z, velX = 0, velZ = 0) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d, nz = dz / d;
    const srcRadial = velX * nx + velZ * nz;            // source moving away(+)/toward(−)
    const lisRadial = this._listenerVel.x * nx + this._listenerVel.z * nz;
    return srcRadial - lisRadial;
  }

  /**
   * Doppler playback-rate multiplier for a moving source.
   * Approaching → pitch up (>1), receding → pitch down (<1).
   * Pure math — unit tested.
   */
  static dopplerRate(radialV, strength = 1) {
    return clamp(1 - (radialV * strength) / SPEED_OF_SOUND, 0.72, 1.38);
  }

  /** Distance from listener (2D world). */
  distanceTo(x, z) {
    return Math.hypot(x - this.pos.x, z - this.pos.z);
  }

  /**
   * Acquire a panner positioned in the world and connected to the
   * destination channel gain. Cheap `equalpower` model — plenty
   * for a driving game and far lighter than HRTF. Panners are
   * pooled and reused to avoid per-shot GC churn.
   */
  acquirePanner(x, y, z, { refDistance = 8, maxDistance = 180, rolloffFactor = 1 } = {}, dest = null) {
    let panner = this._pannerPool.pop();
    if (!panner) {
      panner = this.ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.distanceModel = 'inverse';
      panner.coneInnerAngle = 360;
    }
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = rolloffFactor;
    if (dest && panner._dest !== dest) {
      try { panner.disconnect(); } catch { /* nothing attached */ }
      panner.connect(dest);
      panner._dest = dest;
    }
    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(y ?? 1, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else if (panner.setPosition) {
      panner.setPosition(x, y ?? 1, z);
    }
    this._activeSpatial++;
    return panner;
  }

  releasePanner(panner) {
    this._activeSpatial = Math.max(0, this._activeSpatial - 1);
    // keep the panner (and its channel connection) for reuse — the
    // dead voice's gain node is discarded by the caller
    if (this._pannerPool.length < 24) this._pannerPool.push(panner);
  }

  get spatialVoiceCount() { return this._activeSpatial; }
}
