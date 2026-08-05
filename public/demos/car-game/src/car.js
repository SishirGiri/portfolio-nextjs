// ════════════════════════════════════════════
// CAR — player vehicle + bicycle-model physics
// Also exports buildCarMesh() reused by traffic.
// ════════════════════════════════════════════
import * as THREE from 'three';
import { CAR, COLORS } from './config.js';

/** Build a stylized car mesh. Returns { group, wheels[], brakeLights[], headlights[] }. */
export function buildCarMesh(bodyColor = COLORS.carBody) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });

  // lower body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 4.1), bodyMat);
  body.position.y = 0.55;
  group.add(body);
  // cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), bodyMat);
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);
  // greenhouse / windows
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 1.85), glassMat);
  glass.position.set(0, 1.08, -0.2);
  group.add(glass);
  // hood/trunk accent
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 4.0), trimMat);
  trim.position.y = 0.88;
  group.add(trim);

  // wheels (FL, FR, RL, RR)
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
  const wheels = [];
  const wp = [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]];
  for (const [x, z] of wp) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    group.add(w);
    wheels.push(w);
  }

  // headlights (front)
  const hlMat = new THREE.MeshBasicMaterial({ color: COLORS.headlight });
  const headlights = [];
  for (const x of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), hlMat);
    h.position.set(x, 0.6, 2.05);
    group.add(h);
    headlights.push(h);
  }
  // brake lights (rear)
  const blMat = new THREE.MeshBasicMaterial({ color: COLORS.brakeLight });
  const brakeLights = [];
  for (const x of [-0.65, 0.65]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1), blMat);
    b.position.set(x, 0.62, -2.05);
    group.add(b);
    brakeLights.push(b);
  }

  group.position.y = 0;
  return { group, wheels, brakeLights, headlights, bodyMat };
}

export class Car {
  constructor(scene, x = 0, z = 0) {
    this.scene = scene;
    const built = buildCarMesh(COLORS.carBody);
    this.group = built.group;
    this.wheels = built.wheels;
    this.brakeLights = built.brakeLights;
    this.headlights = built.headlights;
    this.bodyMat = built.bodyMat;
    scene.add(this.group);

    // State
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = 0;          // yaw radians
    this.speed = 0;            // forward signed speed (units/s)
    this.steer = 0;            // current steer angle (-steerMax..steerMax)
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };

    this.group.position.copy(this.pos);
  }

  reset(x, z, heading = 0) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.group.position.copy(this.pos);
    this.group.rotation.y = heading;
  }

  /** Advance physics by dt seconds. Returns { speedKmh, moving }. */
  update(dt) {
    const i = this.input;
    const p = CAR;

    // Acceleration / brake
    if (i.throttle > 0) {
      this.speed += p.accel * i.throttle * dt;
    }
    if (i.brake > 0) {
      if (this.speed > 0.2) {
        // braking
        this.speed -= p.brakeForce * i.brake * dt;
        if (this.speed < 0) this.speed = 0;
      } else {
        // reverse
        this.speed -= p.reverseAccel * i.brake * dt;
      }
    }
    if (i.throttle === 0 && i.brake === 0) {
      this.speed *= Math.pow(p.drag, dt * 60); // frame-rate independent damping
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    // Clamp speed
    this.speed = Math.max(-p.maxReverse, Math.min(p.maxSpeed, this.speed));

    // Steering: ramp toward target, effectiveness depends a bit on speed
    const targetSteer = i.steer * p.steerMax;
    this.steer += (targetSteer - this.steer) * Math.min(1, p.steerSpeed * dt);

    // Bicycle model: turning radius depends on wheelbase + steer angle.
    // Note: yaw is negated so that steer = -1 (A / left) turns the car to the
    // player's left, matching the on-screen chase-camera perspective.
    const speedFactor = Math.min(1, Math.abs(this.speed) / 8) * p.turnAtSpeedFactor + (1 - p.turnAtSpeedFactor);
    const effectiveSteer = this.steer * speedFactor;
    if (Math.abs(this.speed) > 0.05 && Math.abs(effectiveSteer) > 0.001) {
      const turnRadius = p.wheelBase / Math.tan(effectiveSteer);
      const yawDelta = (this.speed / turnRadius) * dt;
      this.heading -= yawDelta;
    }

    // Position integration
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;

    // Handbrake reduces grip → allow slight drift (visual only, simplified)
    const grip = i.handbrake ? p.handbrakeGrip : p.grip;

    // Apply to mesh
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;

    // Wheel spin + front-wheel turn
    const spin = this.speed * dt * 2.4;
    for (let k = 0; k < 4; k++) {
      this.wheels[k].rotation.x += spin;
      if (k < 2) this.wheels[k].rotation.y = this.steer; // front wheels steer
    }

    // Brake light intensity
    const braking = i.brake > 0 && this.speed > 0;
    for (const b of this.brakeLights) {
      b.material.color.setHex(braking ? 0xff2d2d : 0x551111);
    }

    const speedKmh = Math.abs(this.speed) * 1.8; // raw speed → km/h display
    return { speedKmh, moving: Math.abs(this.speed) > 0.1, grip };
  }

  setHeadlights(on) {
    for (const h of this.headlights) {
      h.material.color.setHex(on ? COLORS.headlight : 0x666644);
    }
  }
}
