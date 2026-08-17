// ════════════════════════════════════════════════════════
// VEHICLES — realistic parametric vehicles:
// extruded side-profile bodies with beveled edges, glass
// canopies, pillars, mirrors, door handles, grilles,
// license plates, wipers, LED DRLs, brake discs + fixed
// calipers, full interiors for the player car, carbon
// fiber / chrome / rubber / glass PBR materials.
// PlayerCar physics: gearbox, TC/ABS, AWD, weight
// transfer, wheelspin, nitro, damage, cockpit dash.
// ════════════════════════════════════════════════════════
import * as THREE from 'three';
import { COLORS, UPGRADES, PAINTS, WHEELS, CALIPERS } from './config.js';
import { clamp, damp, lerp } from './utils.js';

const GEARS = [1.35, 1.08, 0.9, 0.76, 0.64, 0.53];
const IDLE_RPM = 0.11, REDLINE = 1.0;

/** Per-style visual specs. */
const STYLES = {
  lambo:    { w: 2.02, h: 0.44, l: 4.55, cabL: 1.45, cabH: 0.38, wheelR: 0.37, sport: true },
  hatch:    { w: 1.72, h: 0.62, l: 3.75, cabL: 1.7, cabH: 0.55, wheelR: 0.34 },
  sedan:    { w: 1.82, h: 0.58, l: 4.55, cabL: 2.1, cabH: 0.52, wheelR: 0.35 },
  suv:      { w: 1.95, h: 0.82, l: 4.75, cabL: 2.4, cabH: 0.62, wheelR: 0.42 },
  sports:   { w: 1.88, h: 0.48, l: 4.25, cabL: 1.6, cabH: 0.42, wheelR: 0.35, sport: true },
  super:    { w: 1.94, h: 0.46, l: 4.4,  cabL: 1.55, cabH: 0.4, wheelR: 0.36, sport: true },
  taxi:     { w: 1.82, h: 0.58, l: 4.55, cabL: 2.1, cabH: 0.52, wheelR: 0.35 },
  police:   { w: 1.86, h: 0.58, l: 4.6,  cabL: 2.1, cabH: 0.52, wheelR: 0.35 },
  bus:      { w: 2.45, h: 1.65, l: 10.5, cabL: 9.6, cabH: 1.0,  wheelR: 0.52 },
  truck:    { w: 2.3,  h: 1.1,  l: 8.6,  cabL: 1.9, cabH: 0.75, wheelR: 0.5 },
  ambulance:{ w: 2.2,  h: 1.5,  l: 6.2,  cabL: 5.4, cabH: 0.9,  wheelR: 0.42 },
  fire:     { w: 2.4,  h: 1.4,  l: 8.4,  cabL: 2.0, cabH: 0.8,  wheelR: 0.5 },
  moto:     { w: 0.5,  h: 0.4,  l: 2.0,  cabL: 0.6, cabH: 0.5,  wheelR: 0.32 },
};

/** Shared canvas textures (built once). */
let _carbonTex = null;
function carbonTexture() {
  if (_carbonTex) return _carbonTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#15181d'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      const dark = ((x / 8 + y / 8) % 2) === 0;
      const grad = g.createLinearGradient(x, y, x + 8, y + 8);
      grad.addColorStop(0, dark ? '#22262d' : '#181b20');
      grad.addColorStop(1, dark ? '#0f1115' : '#22262d');
      g.fillStyle = grad;
      g.fillRect(x, y, 8, 8);
    }
  }
  _carbonTex = new THREE.CanvasTexture(cv);
  _carbonTex.wrapS = _carbonTex.wrapT = THREE.RepeatWrapping;
  _carbonTex.colorSpace = THREE.SRGBColorSpace;
  return _carbonTex;
}

let _plateTex = null;
function plateTexture() {
  if (_plateTex) return _plateTex;
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 48;
  const g = cv.getContext('2d');
  g.fillStyle = '#e8ecef'; g.fillRect(0, 0, 128, 48);
  g.strokeStyle = '#38414c'; g.lineWidth = 4;
  g.strokeRect(3, 3, 122, 42);
  g.fillStyle = '#1d2733';
  g.font = 'bold 30px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ND·2026', 64, 26);
  _plateTex = new THREE.CanvasTexture(cv);
  _plateTex.colorSpace = THREE.SRGBColorSpace;
  return _plateTex;
}

/**
 * Extruded side-profile body. pts: [[z, y], ...] traced
 * clockwise around the car's side silhouette. Produces a
 * beveled solid with real hood/windshield/roof/trunk slopes.
 */
function profileBody(pts, width, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k][0], pts[k][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
    steps: 1,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2); // profile X (length) → world Z; extrusion → X
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/** Detailed wheel: rubber tire, barrel, spokes, cap, brake disc; fixed caliper. */
function makeWheel(S, opts = {}, detail = 'high') {
  const group = new THREE.Group();
  const spin = new THREE.Group();          // everything that rotates
  group.add(spin);

  const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.94, metalness: 0.02 });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(S.wheelR, S.wheelR, S.sport ? 0.3 : 0.28, 20), rubber);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  spin.add(tire);
  // sidewall lettering band (subtle)
  if (detail === 'high') {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(S.wheelR * 0.82, S.wheelR * 0.82, S.sport ? 0.31 : 0.29, 20),
      new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.85 }));
    band.rotation.z = Math.PI / 2;
    spin.add(band);
  }

  const rimMat = new THREE.MeshStandardMaterial({
    color: opts.rim ?? 0xc9d2dd, metalness: 0.92, roughness: 0.2,
  });
  const rimR = S.wheelR * (S.sport ? 0.68 : 0.6);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, 0.26, 16), rimMat);
  barrel.rotation.z = Math.PI / 2;
  spin.add(barrel);
  const spokes = opts.spokes ?? 5;
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, rimR * 1.9, 0.05), rimMat);
    spoke.rotation.x = a;
    spin.add(spoke);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.16, rimR * 0.16, 0.3, 10), rimMat);
  cap.rotation.z = Math.PI / 2;
  spin.add(cap);

  // brake disc (rotates) + caliper (fixed)
  const discMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, metalness: 0.95, roughness: 0.35 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.8, rimR * 0.8, 0.05, 16), discMat);
  disc.rotation.z = Math.PI / 2;
  spin.add(disc);
  if (opts.caliper) {
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, rimR * 0.95, 0.17),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.caliper), roughness: 0.35, metalness: 0.25 }));
    cal.position.set(0.155, 0, 0);
    group.add(cal);
  }
  group.userData.spin = spin;
  group.userData.rimMat = rimMat;
  return group;
}

/** Shared customization opts for makeWheel. */
function wheelOptsFor(opts = {}) {
  return { rim: opts.wheels?.rim, spokes: opts.wheels?.spokes, caliper: opts.caliper };
}

/**
 * Build a vehicle mesh. style: key of STYLES.
 * opts: { color, detail: 'high'|'low', wheels:{rim,spokes}, caliper,
 *         kit, exhaust, police, emergency:{a,b} }
 */
export function buildVehicleMesh(style, colorHex = 0x8a94a6, opts = {}) {
  const S = STYLES[style] || STYLES.sedan;
  const detail = opts.detail || 'high';
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  // ── materials ──
  const paint = new THREE.MeshStandardMaterial({
    color: colorHex, metalness: 0.75, roughness: 0.26, envMapIntensity: 1.25,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0e1520, metalness: 0.92, roughness: 0.06,
    transparent: true, opacity: 0.88, envMapIntensity: 1.6,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1a1f29, metalness: 0.45, roughness: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1.0, roughness: 0.1, envMapIntensity: 1.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.95 });
  const carbon = new THREE.MeshStandardMaterial({ map: carbonTexture(), roughness: 0.35, metalness: 0.5 });

  const box = (mat, w, h, d, x, y, z, parent = body) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const isBus = style === 'bus', isTruck = style === 'truck', isMoto = style === 'moto';
  const isAmb = style === 'ambulance', isFire = style === 'fire';
  const headlights = [], brakeLights = [], reverseLights = [], indicators = [];

  // ══════════ MOTO ══════════
  if (isMoto) {
    box(paint, 0.24, 0.22, S.l * 0.75, 0, 0.62, 0);
    box(trim, 0.26, 0.1, 0.5, 0, 0.82, -0.35);
    box(chrome, 0.55, 0.06, 0.06, 0, 0.98, 0.62);
    box(trim, 0.4, 0.06, 0.4, 0, 0.7, 0.62);
    box(trim, 0.34, 0.44, 0.3, 0, 1.05, -0.2);
    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 }));
    riderHead.position.set(0, 1.38, -0.2);
    riderHead.castShadow = true;
    body.add(riderHead);
    const wheels = [], frontWheels = [];
    const wg1 = makeWheel(S, wheelOptsFor(opts), detail);
    wg1.position.set(0, S.wheelR, S.l / 2 - 0.28);
    const wg2 = makeWheel(S, wheelOptsFor(opts), detail);
    wg2.position.set(0, S.wheelR, -S.l / 2 + 0.28);
    body.add(wg1, wg2);
    wheels.push(wg1, wg2); frontWheels.push(wg1);
    const hl = new THREE.MeshBasicMaterial({ color: 0x6b7b8f });
    const hlm = box(hl, 0.16, 0.16, 0.06, 0, 0.85, S.l / 2);
    headlights.push(hlm);
    const bl = new THREE.MeshBasicMaterial({ color: 0x551111 });
    brakeLights.push(box(bl, 0.1, 0.08, 0.05, 0, 0.75, -S.l / 2));
    return finish({
      group, body, wheels, frontWheels, headlights, brakeLights,
      reverseLights, indicators, bumperF: new THREE.Group(), bumperR: new THREE.Group(),
      lightbar: null, paint, glass, trim, chrome, S, opts, detail,
      sport: false, style: 'moto',
    });
  }

  // ══════════ LAMBO WEDGE ══════════
  if (style === 'lambo') {
    const y0 = 0.26, hl = S.l / 2;
    // extruded wedge profile: splitter → nose → beltline → rear deck → diffuser
    const bodyMesh = profileBody([
      [hl - 0.15, y0 + 0.07], [hl, y0 + 0.16], [hl - 0.25, y0 + S.h * 0.85],
      [hl * 0.45, y0 + S.h], [-hl * 0.5, y0 + S.h * 1.06], [-hl + 0.1, y0 + S.h * 0.95],
      [-hl, y0 + 0.42], [-hl, y0 + 0.05],
    ], S.w - 0.12, paint);
    body.add(bodyMesh);
    // fender blisters
    for (const [fx, fz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      box(paint, 0.16, S.h * 1.1, 1.2, fx * (S.w / 2 - 0.04), y0 + S.h * 0.72, fz * S.l * 0.31);
    }
    // glass canopy (low, forward) + painted roof spine
    const canopy = profileBody([
      [S.cabL / 2 + 0.15, y0 + S.h - 0.02], [S.cabL / 2 - 0.25, y0 + S.h + S.cabH],
      [-S.cabL / 2 + 0.1, y0 + S.h + S.cabH * 0.92], [-S.cabL / 2, y0 + S.h - 0.02],
    ], S.w * 0.56, glass);
    body.add(canopy);
    box(paint, 0.3, 0.05, S.cabL * 0.5, 0, y0 + S.h + S.cabH + 0.005, -0.15);
    // A-pillars
    for (const sx of [-1, 1]) {
      const pil = box(paint, 0.06, S.cabH + 0.1, 0.08, sx * S.w * 0.26, y0 + S.h + S.cabH / 2, S.cabL / 2 - 0.3);
      pil.rotation.x = -0.5;
    }
    // side intakes + splitter + kit
    for (const sx of [-1, 1]) {
      const intake = box(carbon, 0.1, 0.24, 0.8, sx * (S.w / 2 + 0.01), y0 + S.h * 1.15, -0.9);
      intake.rotation.z = sx * -0.25;
    }
    box(carbon, S.w * 0.92, 0.06, 0.42, 0, y0 - 0.01, hl - 0.02);
    if (opts.kit) {
      for (const sx of [-1, 1]) {
        const c = box(carbon, 0.28, 0.04, 0.22, sx * S.w * 0.42, y0 + 0.1, hl - 0.12);
        c.rotation.z = sx * 0.35;
      }
      for (const sx of [-1, 1]) box(carbon, 0.08, 0.08, S.l * 0.6, sx * (S.w / 2 + 0.02), y0 - 0.01, -0.1);
    }
    // engine slats + diffuser
    for (let k = -1; k <= 1; k++) box(carbon, 0.8, 0.045, 0.16, 0, y0 + S.h * 1.35 + 0.06, -S.l * 0.32 + k * 0.3);
    box(carbon, S.w * 0.88, 0.08, 0.4, 0, y0, -hl + 0.08);
    for (let k = -2; k <= 2; k++) box(carbon, 0.05, 0.2, 0.36, k * 0.32, y0 + 0.1, -hl + 0.08);
    // mirrors
    if (detail === 'high') {
      for (const sx of [-1, 1]) {
        box(trim, 0.14, 0.03, 0.05, sx * (S.w / 2 + 0.06), y0 + S.h + 0.1, S.cabL / 2 - 0.35);
        box(paint, 0.06, 0.1, 0.16, sx * (S.w / 2 + 0.13), y0 + S.h + 0.12, S.cabL / 2 - 0.38);
      }
    }
    // lights: Y-shaped LED + hex tails + DRL strip
    const headLens = new THREE.MeshBasicMaterial({ color: 0xcfe4ff });
    const tailLens = new THREE.MeshBasicMaterial({ color: 0x551111 });
    const drlMat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff });
    for (const sx of [-1, 1]) {
      const h1 = box(headLens, 0.44, 0.045, 0.06, sx * S.w * 0.3, y0 + S.h * 0.9, hl - 0.04);
      h1.rotation.z = sx * 0.22;
      const h2 = box(headLens, 0.18, 0.045, 0.06, sx * S.w * 0.46, y0 + S.h * 0.8, hl - 0.1);
      h2.rotation.z = sx * -0.3;
      headlights.push(h1, h2);
      const drl = box(drlMat, 0.5, 0.022, 0.05, sx * S.w * 0.3, y0 + S.h * 0.74, hl - 0.02);
      drl.rotation.z = sx * 0.22;
      const t1 = box(tailLens, 0.36, 0.09, 0.06, sx * S.w * 0.32, y0 + S.h * 1.02, -hl + 0.04);
      t1.rotation.z = sx * 0.1;
      const t2 = box(tailLens, 0.1, 0.24, 0.06, sx * S.w * 0.45, y0 + S.h * 0.95, -hl + 0.04);
      brakeLights.push(t1, t2);
      if (detail === 'high') {
        indicators.push(box(new THREE.MeshBasicMaterial({ color: 0x7a5200 }), 0.1, 0.07, 0.05, sx * S.w * 0.47, y0 + 0.16, hl - 0.1));
      }
    }
    reverseLights.push(box(new THREE.MeshBasicMaterial({ color: 0x777777 }), 0.12, 0.05, 0.05, 0, y0 + 0.1, -hl + 0.05));
    // exhaust variants
    const exIdx = opts.exhaust || 0;
    const tipMat = exIdx === 2
      ? new THREE.MeshStandardMaterial({ color: 0x7ab8d4, metalness: 0.9, roughness: 0.2 })
      : chrome;
    if (exIdx === 1) {
      for (const sx of [-1, 1]) for (const dz of [0, 0.17]) {
        box(tipMat, 0.08, 0.08, 0.18, sx * 0.3 + dz * 0.4 - 0.08, y0 + 0.06, -hl);
      }
    } else {
      for (const sx of [-1, 1]) box(tipMat, 0.1, 0.1, 0.2, sx * 0.32, y0 + 0.06, -hl);
    }
    // license plate
    if (detail === 'high') {
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16),
        new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.6 }));
      plate.position.set(0, y0 + 0.22, -hl - 0.005);
      plate.rotation.y = Math.PI;
      body.add(plate);
    }
    return finish(buildWheelsAndShadow({ group, body, headlights, brakeLights, reverseLights, indicators, paint, glass, trim, chrome, S, opts, detail, style: 'lambo' }));
  }

  // ══════════ BUSES / TRUCKS / EMERGENCY ══════════
  if (isBus || isTruck || isAmb || isFire) {
    const hl = S.l / 2;
    if (isBus) {
      const shell = profileBody([
        [hl, 0.32], [hl, 1.1], [hl - 0.2, 2.1], [-hl + 0.2, 2.15], [-hl, 1.2], [-hl, 0.32],
      ], S.w - 0.1, paint);
      body.add(shell);
      // window band
      const win = new THREE.MeshStandardMaterial({ color: 0x18222f, metalness: 0.9, roughness: 0.08 });
      box(win, S.w + 0.02, 0.7, S.l * 0.82, 0, 1.55, -0.3);
      // roof AC
      box(trim, 1.4, 0.25, 2.4, 0, 2.28, -1);
      box(trim, 1.4, 0.25, 2.4, 0, 2.28, 2);
      // door
      box(win, 0.05, 1.4, 0.9, S.w / 2, 1.05, hl - 1.4);
    } else if (isTruck) {
      // cab
      const cab = profileBody([
        [hl, 0.4], [hl, 1.15], [hl - 0.15, 1.95], [hl - 1.7, 2.0], [hl - 1.9, 0.6], [hl - 1.9, 0.4],
      ], S.w - 0.1, paint);
      body.add(cab);
      const win = new THREE.MeshStandardMaterial({ color: 0x18222f, metalness: 0.9, roughness: 0.08 });
      box(win, S.w - 0.2, 0.55, 0.06, 0, 1.6, hl - 0.35);
      box(chrome, S.w * 0.9, 0.35, 0.08, 0, 0.7, hl + 0.02); // grille/chrome bumper
      // cargo box
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cf, metalness: 0.35, roughness: 0.6 });
      box(cargoMat, S.w, 2.1, S.l - 2.4, 0, 1.45, -1.3);
      box(trim, S.w + 0.04, 0.16, S.l - 2.3, 0, 2.52, -1.3);
    } else if (isAmb) {
      const shell = profileBody([
        [hl, 0.36], [hl, 1.3], [hl - 0.25, 1.85], [-hl + 0.1, 1.9], [-hl, 1.4], [-hl, 0.36],
      ], S.w - 0.1, paint);
      body.add(shell);
      const win = new THREE.MeshStandardMaterial({ color: 0x18222f, metalness: 0.9, roughness: 0.08 });
      box(win, S.w - 0.18, 0.5, 0.06, 0, 1.5, hl - 0.3);
      // box module + red stripe
      box(new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.4 }), S.w * 0.99, 1.5, S.l * 0.6, 0, 1.85, -S.l * 0.17);
      box(new THREE.MeshStandardMaterial({ color: 0xd23b3b, roughness: 0.5 }), S.w + 0.03, 0.26, S.l * 0.55, 0, 1.0, -0.4);
    } else { // fire engine
      const shell = profileBody([
        [hl, 0.4], [hl, 1.2], [hl - 0.2, 1.85], [-hl + 0.1, 1.9], [-hl, 1.3], [-hl, 0.4],
      ], S.w - 0.1, paint);
      body.add(shell);
      const win = new THREE.MeshStandardMaterial({ color: 0x18222f, metalness: 0.9, roughness: 0.08 });
      box(win, S.w - 0.18, 0.5, 0.06, 0, 1.5, hl - 0.3);
      // ladder + outriggers
      for (const sx of [-1, 1]) box(chrome, 0.09, 0.1, S.l * 0.72, sx * 0.55, 2.15, -0.6);
      for (let k = -3; k <= 3; k++) box(chrome, 1.1, 0.06, 0.09, 0, 2.15, -0.6 + k * 1.1);
      // pump controls
      box(trim, 0.7, 0.6, 0.4, 0, 1.0, hl - 0.1);
    }
    // head/tail lights + DRL for big vehicles
    const headLens = new THREE.MeshBasicMaterial({ color: 0x6b6b58 });
    const tailLens = new THREE.MeshBasicMaterial({ color: 0x551111 });
    for (const sx of [-1, 1]) {
      headlights.push(box(headLens, 0.3, 0.16, 0.07, sx * S.w * 0.33, 0.75, hl + 0.01));
      brakeLights.push(box(tailLens, 0.3, 0.14, 0.07, sx * S.w * 0.33, 0.9, -hl - 0.01));
    }
    return finish(buildWheelsAndShadow({ group, body, headlights, brakeLights, reverseLights, indicators, paint, glass, trim, chrome, S, opts, detail, style }));
  }

  // ══════════ STANDARD CARS (hatch/sedan/suv/sports/super/taxi/police) ══════════
  {
    const hl = S.l / 2;
    const belt = 0.34 + S.h;           // beltline (top of lower body)
    const roofH = belt + S.cabH + 0.12;
    const noseH = 0.34 + S.h * (S.sport ? 0.72 : 0.62);
    // lower body silhouette (with hood slope + trunk)
    const bodyPts = [
      [hl - 0.1, 0.3],
      [hl, noseH * 0.72],
      [hl - 0.05, noseH],
      [hl - S.l * (S.sport ? 0.3 : 0.24), belt],        // hood → windshield base
      [-hl + S.l * (S.sport ? 0.3 : 0.26), belt + 0.02], // rear deck
      [-hl + 0.05, belt * 0.96],
      [-hl, belt * 0.8],
      [-hl, 0.32],
    ];
    const bodyMesh = profileBody(bodyPts, S.w - 0.1, paint);
    body.add(bodyMesh);

    // greenhouse: glass canopy + pillars + painted roof
    const cabF = hl - S.l * (S.sport ? 0.28 : 0.22);
    const cabR = cabF - S.cabL;
    const canopyPts = [
      [cabF - 0.12, belt - 0.03],
      [cabF - S.cabL * 0.32, roofH],
      [cabR + S.cabL * 0.22, roofH],
      [cabR, belt - 0.03],
    ];
    const canopy = profileBody(canopyPts, S.w * 0.82, glass);
    body.add(canopy);
    // painted roof panel
    box(paint, S.w * 0.78, 0.05, S.cabL * 0.42, 0, roofH + 0.005, (cabF + cabR) / 2 - 0.1);
    // pillars
    const pilMat = paint;
    for (const sx of [-1, 1]) {
      const a = box(pilMat, 0.055, S.cabH + 0.14, 0.09, sx * S.w * 0.36, belt + S.cabH / 2, cabF - S.cabL * 0.28);
      a.rotation.x = -0.5;
      const c = box(pilMat, 0.055, S.cabH + 0.12, 0.09, sx * S.w * 0.36, belt + S.cabH / 2 - 0.02, cabR + S.cabL * 0.16);
      c.rotation.x = 0.42;
      if (!S.sport) box(pilMat, 0.05, S.cabH + 0.08, 0.07, sx * S.w * 0.36, belt + S.cabH / 2, (cabF + cabR) / 2);
    }
    // rocker panel + door seams
    box(trim, S.w - 0.06, 0.1, S.l * 0.55, 0, 0.3, 0);
    if (detail === 'high') {
      const seamMat = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.8 });
      for (const dz of [S.l * 0.06, -S.l * 0.14]) {
        for (const sx of [-1, 1]) box(seamMat, 0.02, belt - 0.42, 0.02, sx * (S.w / 2 - 0.02), (belt + 0.34) / 2, dz);
      }
      // door handles
      const handleMat = chrome;
      for (const sx of [-1, 1]) for (const dz of [S.l * 0.1, -S.l * 0.12]) {
        box(handleMat, 0.03, 0.045, 0.16, sx * (S.w / 2 - 0.01), belt - 0.18, dz);
      }
      // mirrors
      for (const sx of [-1, 1]) {
        box(trim, 0.13, 0.03, 0.05, sx * (S.w / 2 + 0.05), belt + 0.06, cabF - 0.35);
        box(paint, 0.055, 0.1, 0.15, sx * (S.w / 2 + 0.12), belt + 0.09, cabF - 0.38);
      }
      // wipers
      for (const dx of [-0.35, 0.3]) {
        box(rubber, 0.02, 0.03, 0.42, dx, belt + 0.045, cabF - 0.18);
      }
    }
    // grille + bumpers + plates
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x0f1318, metalness: 0.6, roughness: 0.45 });
    box(grilleMat, S.w * 0.55, 0.16, 0.06, 0, noseH * 0.62, hl + 0.005);
    for (let k = -2; k <= 2; k++) box(chrome, 0.035, 0.13, 0.02, k * 0.16, noseH * 0.62, hl + 0.04);
    const bumperF = new THREE.Group(), bumperR = new THREE.Group();
    body.add(bumperF, bumperR);
    box(trim, S.w * 0.98, 0.24, 0.26, 0, 0.44, hl - 0.1, bumperF);
    box(trim, S.w * 0.98, 0.24, 0.26, 0, 0.5, -hl + 0.1, bumperR);
    if (detail === 'high') {
      const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16),
        new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.6 }));
      plateF.position.set(0, 0.42, hl + 0.03);
      body.add(plateF);
      const plateR = plateF.clone();
      plateR.position.set(0, 0.48, -hl - 0.031);
      plateR.rotation.y = Math.PI;
      body.add(plateR);
    }
    // exhaust
    box(chrome, 0.09, 0.09, 0.2, S.w * 0.3, 0.3, -hl - 0.02);
    if (S.sport) box(chrome, 0.09, 0.09, 0.2, -S.w * 0.3, 0.3, -hl - 0.02);

    // lights: housings + lenses + DRL strips
    const headLens = new THREE.MeshBasicMaterial({ color: 0x6b7b8f });
    const drlMat = new THREE.MeshBasicMaterial({ color: 0xdff1ff });
    const tailLens = new THREE.MeshBasicMaterial({ color: 0x551111 });
    const indMat = new THREE.MeshBasicMaterial({ color: 0x7a5200 });
    for (const sx of [-1, 1]) {
      // headlight housing + lens + DRL under
      box(trim, 0.42, 0.17, 0.1, sx * S.w * 0.31, noseH * 0.72, hl - 0.03);
      headlights.push(box(headLens, 0.34, 0.12, 0.05, sx * S.w * 0.31, noseH * 0.72, hl + 0.02));
      const drl = box(drlMat, 0.38, 0.035, 0.04, sx * S.w * 0.31, noseH * 0.72 - 0.13, hl + 0.015);
      // taillight housing + lens
      box(trim, 0.4, 0.16, 0.09, sx * S.w * 0.3, belt * 0.78, -hl + 0.03);
      brakeLights.push(box(tailLens, 0.34, 0.11, 0.05, sx * S.w * 0.3, belt * 0.78, -hl - 0.02));
      indicators.push(box(indMat, 0.12, 0.1, 0.05, sx * S.w * 0.44, noseH * 0.7, hl + 0.01));
      indicators.push(box(indMat, 0.12, 0.1, 0.05, sx * S.w * 0.43, belt * 0.78, -hl - 0.02));
      reverseLights.push(box(new THREE.MeshBasicMaterial({ color: 0x777777 }), 0.1, 0.08, 0.05, sx * S.w * 0.18, belt * 0.72, -hl - 0.02));
    }
    return finish(buildWheelsAndShadow({ group, body, headlights, brakeLights, reverseLights, indicators, paint, glass, trim, chrome, S, opts, detail, bumperF, bumperR, style }));
  }
}

/** Wheels + contact shadow blob shared by all non-moto builds. */
function buildWheelsAndShadow(ctx) {
  const { group, body, S, opts, detail } = ctx;
  const wheels = [], frontWheels = [];
  const wheelOpts = { rim: opts.wheels?.rim, spokes: opts.wheels?.spokes, caliper: opts.caliper };
  const addWheel = (x, z, front) => {
    const wg = makeWheel(S, wheelOpts, detail);
    wg.position.set(x, S.wheelR, z);
    body.add(wg);
    wheels.push(wg);
    if (front) frontWheels.push(wg);
  };
  const wb = S.l * (S.l > 6 ? 0.3 : 0.33);
  const tr = S.w / 2 - 0.02;
  addWheel(-tr, wb, true); addWheel(tr, wb, true);
  addWheel(-tr, -wb, false); addWheel(tr, -wb, false);
  if (S.l > 6) { addWheel(-tr, -wb + 1.5, false); addWheel(tr, -wb + 1.5, false); }
  // soft contact shadow under the car (fake AO)
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(S.w * 1.25, S.l * 1.1),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  group.add(blob);
  return { ...ctx, wheels, frontWheels };
}

/** Style extras (taxi sign, police/emergency lightbars) + handle assembly. */
function finish(ctx) {
  const { group, body, paint, S, trim } = ctx;  let lightbar = null;
  const boxTo = (mat, w, h, d, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  if (ctx.opts?.police || ctx.style === 'police') {
    paint.color.setHex(0x1d2a44);
    boxTo(new THREE.MeshStandardMaterial({ color: 0xe8edf4, roughness: 0.4 }), S.w + 0.02, 0.34, S.l * 0.34, 0, 0.62, 0, body);
    lightbar = new THREE.Group();
    const a = boxTo(new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0.42, 0.16, 0.24, -0.25, 0, 0, lightbar);
    const b = boxTo(new THREE.MeshBasicMaterial({ color: 0x2040ff }), 0.42, 0.16, 0.24, 0.25, 0, 0, lightbar);
    lightbar.userData = { red: a, blue: b };
    lightbar.position.set(0, 0.34 + S.h + S.cabH + 0.14, -0.1);
    body.add(lightbar);
  }
  if (ctx.style === 'taxi') {
    paint.color.setHex(0xf7c531);
    boxTo(new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.5 }), S.w + 0.02, 0.12, S.l * 0.8, 0, 0.52, 0, body);
    boxTo(new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), 0.7, 0.2, 0.28, 0, 0.34 + S.h + S.cabH + 0.12, -0.1, body);
  }
  if (ctx.style === 'ambulance' || ctx.style === 'fire') {
    const bar = new THREE.Group();
    const a = boxTo(new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0.42, 0.16, 0.24, -0.25, 0, 0, bar);
    const b = boxTo(new THREE.MeshBasicMaterial({ color: ctx.style === 'ambulance' ? 0xffaa20 : 0xff2020 }), 0.42, 0.16, 0.24, 0.25, 0, 0, bar);
    bar.userData = { red: a, blue: b };
    bar.position.set(0, ctx.style === 'ambulance' ? 2.7 : 1.98, S.l / 2 - 0.9);
    body.add(bar);
    lightbar = bar;
  }
  group.position.y = 0;
  return {
    group, body,
    wheels: ctx.wheels || [], frontWheels: ctx.frontWheels || [],
    headlights: ctx.headlights, brakeLights: ctx.brakeLights,
    reverseLights: ctx.reverseLights, indicators: ctx.indicators,
    bumperF: ctx.bumperF || new THREE.Group(), bumperR: ctx.bumperR || new THREE.Group(),
    lightbar, paint, glass: ctx.glass, dims: S,
    rimMats: ctx.wheels ? ctx.wheels.map((w) => w.userData.rimMat) : [],
    sport: !!(S && S.sport), style: ctx.style || '',
  };
}

/** Low-poly walking character (player on foot). */
export function buildCharacter(colorHex = 0x38bdf8) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a679, roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x27303f, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 8), cloth);
  torso.position.y = 1.05;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skin);
  head.position.y = 1.52;
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 6), pants);
  legL.position.set(-0.11, 0.42, 0);
  const legR = legL.clone(); legR.position.x = 0.11;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.4, 4, 6), cloth);
  armL.position.set(-0.3, 1.05, 0);
  const armR = armL.clone(); armR.position.x = 0.3;
  g.add(torso, head, legL, legR, armL, armR);
  let t = 0;
  g.userData.animate = (dt, speed) => {
    t += dt * (2 + speed * 3);
    const sw = Math.sin(t * 5) * clamp(speed, 0, 1) * 0.6;
    legL.rotation.x = sw; legR.rotation.x = -sw;
    armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8;
    torso.position.y = 1.05 + Math.abs(Math.sin(t * 5)) * 0.03 * clamp(speed, 0, 1);
  };
  return g;
}

// ════════════════════════════════════════════════════════
// PLAYER CAR — physics + progression state
// ════════════════════════════════════════════════════════
export class PlayerCar {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.heading = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
    this.trans = 'auto';
    this.tcEnabled = true;
    this.absEnabled = true;
    this.gripMul = 1;
    this.gear = 1;
    this.rpm = IDLE_RPM;
    this.steerAngle = 0;
    this.speedF = 0;
    this.slip = 0;
    this.wheelspin = 0;
    this.health = 100;
    this.engineTemp = 88;
    this.nitroValue = 100;
    this.nitroActive = false;
    this.revsUp = 0;
    this._lastSpeedF = 0;
    this._pitch = 0; this._roll = 0;
    this._flameT = 0;
    this.shiftFlash = 0;
    this.wheelSpin = 0;
    this.vy = 0;             // vertical velocity (airborne)
    this.airborne = false;
    this.groundY = 0;        // set by game each frame (ramps)
    this.onLand = null;      // callback(impactSpeed) when touching down
    this.def = null;
    this.handle = null;
    this._damageF = 0; this._damageR = 0;
    this.onCollision = null;
    this.dash = null;
  }

  configure(def, owned) {
    if (this.handle) {
      this.scene.remove(this.handle.group);
      this.handle.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    this.def = def;
    const paintDef = PAINTS.find((p) => p.hex === (owned?.paint || def.color)) || PAINTS[0];
    const wheelDef = WHEELS[owned?.wheels || 0] || WHEELS[0];
    const calDef = CALIPERS[owned?.caliper || 0] || CALIPERS[0];
    this.handle = buildVehicleMesh(def.style, new THREE.Color(paintDef.hex).getHex(), {
      detail: 'high',
      wheels: { rim: wheelDef.rim, spokes: wheelDef.spokes },
      caliper: calDef.hex,
      kit: owned?.kit || 0,
      exhaust: owned?.exhaust || 0,
    });
    this.paintDef = paintDef;
    this.handle.paint.metalness = paintDef.metal;
    this.handle.paint.roughness = paintDef.rough;
    this.scene.add(this.handle.group);
    this._applySpoiler(owned?.spoiler || 0);
    this._computeStats(owned?.upgrades || {});
    this.nitroValue = this.stats.nitroCap;
    this._buildCockpit();
    this._updateDamageVisuals();
  }

  _computeStats(up = {}) {
    const d = this.def;
    const lv = (k) => up[k] || 0;
    this.stats = {
      topSpeed: d.topSpeed * (1 + UPGRADES.engine.topSpeed * lv('engine')),
      accel: d.accel * (1 + UPGRADES.engine.accel * lv('engine') + (UPGRADES.transmission?.accel || 0) * lv('transmission')),
      brake: d.brake * (1 + UPGRADES.brakes.brake * lv('brakes')),
      steer: d.steer * (1 + UPGRADES.suspension.steer * lv('suspension') + (UPGRADES.transmission?.steer || 0) * lv('transmission')),
      grip: d.grip * (1 + UPGRADES.tires.grip * lv('tires')),
      stability: 1 + UPGRADES.suspension.stability * lv('suspension'),
      nitroCap: d.nitroCap + UPGRADES.nitro.nitroCap * lv('nitro'),
      boost: 0.65 + UPGRADES.nitro.boost * lv('nitro'),
    };
    this._dragC = (this.stats.accel * GEARS[5]) / (this.stats.topSpeed ** 2);
  }

  setPaint(paintDef) {
    this.paintDef = paintDef;
    const p = this.handle.paint;
    p.color.set(paintDef.hex);
    p.metalness = paintDef.metal;
    p.roughness = paintDef.rough;
  }

  setWheels(idx) {
    const def = WHEELS[idx] || WHEELS[0];
    for (const m of this.handle.rimMats) m.color.setHex(def.rim);
  }

  setCaliper(idx) {
    const def = CALIPERS[idx] || CALIPERS[0];
    for (const m of this.handle.rimMats) m.color.setHex(def.hex);
  }

  setKit(idx) { this._rebuild({ kit: idx }); }
  setExhaust(idx) { this._rebuild({ exhaust: idx }); }
  _rebuild(over = {}) {
    if (!this.def) return;
    const owned = {
      paint: this.paintDef.hex,
      spoiler: this._spoilerIdx || 0,
      wheels: this._wheelIdx || 0,
      caliper: this._caliperIdx || 0,
      kit: this._cosmetic?.kit ?? 0,
      exhaust: this._cosmetic?.exhaust ?? 0,
      upgrades: this._upgradesCache || {},
      ...over,
    };
    const pos = this.pos.clone(), h = this.heading;
    this.configure(this.def, owned);
    this.reset(pos.x, pos.z, h);
  }

  _applySpoiler(idx) {
    this._spoilerIdx = idx;
    if (this._spoiler) {
      this.handle.body.remove(this._spoiler);
      this._spoiler.traverse((o) => o.geometry?.dispose?.());
      this._spoiler = null;
    }
    if (!idx) return;
    const S = this.handle.dims;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.4, metalness: 0.6 });
    if (idx === 1) {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(S.w * 0.8, 0.09, 0.22), mat);
      lip.position.set(0, 0.3 + S.h + 0.02, -S.l / 2 + 0.12);
      g.add(lip);
    } else {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(S.w * 0.95, 0.07, 0.34), mat);
      wing.position.set(0, 0.3 + S.h + 0.34, -S.l / 2 + 0.16);
      g.add(wing);
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.12), mat);
        post.position.set(sx * S.w * 0.36, 0.3 + S.h + 0.17, -S.l / 2 + 0.16);
        g.add(post);
      }
    }
    this._spoiler = g;
    this.handle.body.add(g);
  }

  setSpoiler(idx) { this._applySpoiler(idx); }

  // ── Cockpit interior (first-person view) ──
  _buildCockpit() {
    if (this.dash) { this.handle.body.remove(this.dash); }
    const S = this.handle.dims;
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.7 });
    const alcantara = new THREE.MeshStandardMaterial({ color: 0x1c2027, roughness: 0.9 });
    const dash = new THREE.Mesh(new THREE.BoxGeometry(S.w * 0.86, 0.22, 0.5), dark);
    dash.position.set(0, 0.3 + S.h + 0.14, S.cabL / 2 - 0.55);
    g.add(dash);
    this._gaugeCv = document.createElement('canvas');
    this._gaugeCv.width = 256; this._gaugeCv.height = 128;
    this._gaugeTex = new THREE.CanvasTexture(this._gaugeCv);
    this._gaugeTex.colorSpace = THREE.SRGBColorSpace;
    const cluster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.23),
      new THREE.MeshBasicMaterial({ map: this._gaugeTex })
    );
    cluster.position.set(-S.w * 0.22, 0.3 + S.h + 0.28, S.cabL / 2 - 0.62);
    cluster.rotation.x = -0.18;
    g.add(cluster);
    const console2 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x0a2a3a })
    );
    console2.position.set(S.w * 0.08, 0.3 + S.h + 0.26, S.cabL / 2 - 0.6);
    console2.rotation.x = -0.22;
    g.add(console2);
    // flat-bottom wheel
    const wheelG = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 8, 24), alcantara);
    wheelG.add(rim);
    const flat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.025), alcantara);
    flat.position.set(0, -0.185, 0);
    wheelG.add(flat);
    for (const a of [0, 2.1, -2.1]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.02), dark);
      spoke.position.set(Math.sin(a) * 0.09, -Math.cos(a) * 0.09, 0);
      spoke.rotation.z = -a;
      wheelG.add(spoke);
    }
    wheelG.position.set(-S.w * 0.22, 0.3 + S.h + 0.16, S.cabL / 2 - 0.78);
    wheelG.rotation.x = -0.35;
    g.add(wheelG);
    this.steerWheel = wheelG;
    // rear-view mirror (top-center of the windshield)
    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x1c2836, metalness: 0.9, roughness: 0.15 })
    );
    mirror.position.set(0, 0.3 + S.h + S.cabH + 0.02, S.cabL / 2 - 0.5);
    mirror.rotation.x = -0.15;
    g.add(mirror);
    // seats with headrests
    for (const sx of [-1, 1]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.45), alcantara);
      seat.position.set(sx * S.w * 0.22, 0.3 + S.h - 0.14, -S.cabL / 2 + 0.45);
      g.add(seat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.18), alcantara);
      head.position.set(sx * S.w * 0.22, 0.3 + S.h + 0.24, -S.cabL / 2 + 0.34);
      g.add(head);
    }
    g.visible = false;
    this.handle.body.add(g);
    this.dash = g;
    this._gaugeT = 0;
  }

  updateCockpitGauges(dt, fuelFrac, speedKmh, warnings = []) {
    if (!this.dash || !this.dash.visible) return;
    this._gaugeT -= dt;
    if (this._gaugeT > 0) return;
    this._gaugeT = 0.1;
    const cv = this._gaugeCv, ctx = cv.getContext('2d');
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, 256, 128);
    const r = clamp(this.rpm, 0, 1);
    const grad = ctx.createLinearGradient(0, 0, 240, 0);
    grad.addColorStop(0, '#00d4ff'); grad.addColorStop(0.7, '#fbbf24'); grad.addColorStop(1, '#ef4444');
    ctx.fillStyle = grad;
    ctx.fillRect(8, 12, 240 * clamp(r, 0, 1), 14);
    ctx.strokeStyle = '#33415580';
    ctx.strokeRect(8, 12, 240, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 42px Orbitron, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(speedKmh)}`, 200, 82);
    ctx.font = '15px Rajdhani, sans-serif';
    ctx.fillText('KM/H', 244, 82);
    ctx.fillStyle = this.nitroActive ? '#38e8b0' : '#00d4ff';
    ctx.font = 'bold 28px Orbitron, monospace';
    ctx.textAlign = 'left';
    const gearTxt = this.speedF < -0.4 ? 'R' : (this.gear || 'N');
    ctx.fillText(gearTxt, 12, 84);
    ctx.fillStyle = fuelFrac < 0.22 ? '#ef4444' : '#10b981';
    ctx.fillRect(8, 100, 150 * clamp(fuelFrac, 0, 1), 7);
    ctx.font = 'bold 11px Rajdhani, sans-serif';
    let wx = 170;
    for (const wtxt of warnings) {
      ctx.fillStyle = wtxt.color || '#ef4444';
      ctx.fillText(wtxt.text, wx, 108);
      wx -= ctx.measureText(wtxt.text).width + 6;
    }
    this._gaugeTex.needsUpdate = true;
  }

  reset(x, z, heading = 0) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.vel.set(0, 0);
    this.speedF = 0;
    this.gear = 1;
    this.rpm = IDLE_RPM;
    this.steerAngle = 0;
    this._pitch = this._roll = 0;
    this.vy = 0;
    this.airborne = false;
    this.groundY = 0;
    this.applyTransform();
    this.handle.group.rotation.y = heading;
  }

  get speedKmh() { return Math.abs(this.speedF) * 3.6; }
  get forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  applyDamage(mag, nx = 0, nz = 0) {
    const dmg = clamp(mag, 0, 40);
    this.health = Math.max(0, this.health - dmg);
    const f = this.forward;
    const dot = nx * f.x + nz * f.z;
    if (dot < 0) this._damageF = Math.min(1, this._damageF + dmg / 55);
    else this._damageR = Math.min(1, this._damageR + dmg / 55);
    this._updateDamageVisuals();
  }

  repair() {
    this.health = 100;
    this._damageF = this._damageR = 0;
    this.engineTemp = 88;
    this._updateDamageVisuals();
  }

  _updateDamageVisuals() {
    if (!this.handle) return;
    const h = this.handle;
    h.bumperF.position.set(0, -this._damageF * 0.12, -this._damageF * 0.16);
    h.bumperF.rotation.set(this._damageF * 0.2, this._damageF * 0.15, 0);
    h.bumperR.position.set(this._damageR * 0.1, -this._damageR * 0.1, this._damageR * 0.14);
    h.bumperR.rotation.set(-this._damageR * 0.18, -this._damageR * 0.12, 0);
    const crack = clamp((100 - this.health) / 60, 0, 1);
    h.glass.opacity = 0.88 - crack * 0.25;
    h.glass.color.setRGB(0.05 + crack * 0.12, 0.08 + crack * 0.1, 0.12 + crack * 0.08);
    this.hazards = this.health < 25;
  }

  setHeadlights(on, high = false) {
    const col = on ? (high ? 0xffffff : COLORS.headlight) : 0x6b7b8f;
    for (const hl of this.handle.headlights) {
      hl.material.color.setHex(col);
    }
  }

  setLightsRaw(braking, reversing, indicating) {
    for (const b of this.handle.brakeLights) b.material.color.setHex(braking ? COLORS.brakeLight : 0x551111);
    for (const r of this.handle.reverseLights) r.material.color.setHex(reversing ? COLORS.reverseLight : 0x777777);
    const blink = Math.floor(performance.now() / 350) % 2 === 0;
    for (const i of this.handle.indicators) {
      i.material.color.setHex(indicating && blink ? COLORS.indicator : 0x7a5200);
    }
  }

  /** Nitro exhaust flames. */
  _flames() {
    if (!this._flameMeshes) {
      this._flameMeshes = [];
      const S = this.handle.dims;
      for (const sx of [-0.25, 0.25]) {
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.09, 0.6, 8),
          new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.9 })
        );
        flame.rotation.x = Math.PI / 2;
        flame.position.set(sx * S.w, 0.3, -S.l / 2 - 0.3);
        flame.visible = false;
        this.handle.body.add(flame);
        this._flameMeshes.push(flame);
      }
    }
    return this._flameMeshes;
  }

  shiftUp() { if (this.gear < 6 && this.speedF > -0.4) { this.gear++; this.shiftFlash = 0.25; return true; } return false; }
  shiftDown() { if (this.gear > 1) { this.gear--; this.shiftFlash = 0.25; return true; } return false; }

  update(dt) {
    const i = this.input;
    const st = this.stats;

    // ── driver assists ──
    let throttle = i.throttle;
    let brakeIn = i.brake;
    if (this.tcEnabled && this.slip > 4.2 && Math.abs(this.speedF) < 26 && !i.handbrake) {
      throttle *= 0.45;
    }
    if (this.absEnabled && brakeIn > 0.85 && Math.abs(this.speedF) < 7) {
      brakeIn *= 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(performance.now() / 26));
    }
    this.wheelspin = (!this.tcEnabled && throttle > 0.6 && Math.abs(this.speedF) < 9)
      ? clamp(this.rpm * 1.1, 0.35, 1) : 0;

    // ── health/temp factors ──
    const healthF = lerp(0.62, 1, clamp(this.health / 100, 0, 1));
    const hotF = this.engineTemp > 118 ? lerp(1, 0.72, clamp((this.engineTemp - 118) / 14, 0, 1)) : 1;

    // ── rpm model ──
    const gearTop = st.topSpeed * (this.gear / 6) * 1.08;
    let rpmTarget = Math.abs(this.speedF) / gearTop;
    if (Math.abs(this.speedF) < 2 && throttle > 0) {
      this.revsUp = Math.min(1, this.revsUp + dt * 2.2);
    } else {
      this.revsUp = Math.max(0, this.revsUp - dt * 3);
    }
    rpmTarget = Math.max(IDLE_RPM, rpmTarget * (1 - this.revsUp * 0.4) + this.revsUp * 0.85 * throttle);
    if (this.wheelspin > 0) rpmTarget = Math.max(rpmTarget, 0.85 + this.wheelspin * 0.15);
    this.rpm = damp(this.rpm, Math.min(rpmTarget, 1.04), 8, dt);

    if (this.trans === 'auto') {
      if (this.rpm > 0.95 && this.gear < 6 && this.speedF > 1) { this.gear++; this.shiftFlash = 0.25; }
      else if (this.rpm < 0.38 && this.gear > 1) { this.gear--; this.shiftFlash = 0.15; }
    } else if (this.rpm > 1.02) {
      this.rpm = 1.0 + Math.sin(performance.now() / 22) * 0.03;
    }

    // ── forces ──
    const torque = 0.55 + 0.45 * Math.sin(Math.min(this.rpm, 1) * Math.PI * 0.75);
    let force = st.accel * GEARS[this.gear - 1] * torque * throttle * healthF * hotF;
    if (this.airborne) force *= 0.15;   // wheels can't push against air
    this.nitroActive = false;
    if (i.nitro && this.nitroValue > 1 && throttle > 0.1 && this.health > 0) {
      force *= 1 + st.boost;
      this.nitroValue = Math.max(0, this.nitroValue - 26 * dt);
      this.nitroActive = true;
    } else {
      this.nitroValue = Math.min(st.nitroCap, this.nitroValue + 4.5 * dt);
    }

    const f = this.forward;
    this.speedF = this.vel.x * f.x + this.vel.y * f.z;

    if (this.health > 0) this.vel.x += f.x * force * dt, this.vel.y += f.z * force * dt;

    if (brakeIn > 0) {
      if (this.speedF > 0.3) {
        const dec = Math.min(this.speedF, st.brake * brakeIn * dt);
        this.vel.x -= f.x * dec; this.vel.y -= f.z * dec;
      } else if (this.speedF > -this.def.reverse) {
        this.vel.x -= f.x * this.def.accel * 0.55 * dt;
        this.vel.y -= f.z * this.def.accel * 0.55 * dt;
      }
    }

    const v = Math.hypot(this.vel.x, this.vel.y);
    if (v > 0.01) {
      const drag = this._dragC * v * v + 0.45;
      const nv = Math.max(0, v - drag * dt);
      this.vel.multiplyScalar(nv / v);
    }

    // ── lateral grip / drift ──
    let latX = this.vel.x - f.x * this.speedF;
    let latZ = this.vel.y - f.z * this.speedF;
    let gripRate = st.grip * 10 * st.stability * clamp(this.gripMul, 0.55, 1);
    if (this.def.drive === 'AWD') gripRate *= 1 + Math.abs(this.steerAngle) * 0.35;
    if (this.wheelspin > 0.2) gripRate *= 1 - this.wheelspin * 0.3;
    if (brakeIn > 0.3 && this.speedF > 5) gripRate *= 1.08;
    if (this.airborne) gripRate *= 0.06;                                   // no traction mid-air
    gripRate *= 1 + clamp((v - 28) / 40, 0, 1) * 0.35;                     // aerodynamic downforce
    if (i.handbrake) gripRate *= 0.16;
    if (v < 0.4) gripRate = 20;
    const keep = Math.exp(-gripRate * dt);
    latX *= keep; latZ *= keep;
    this.vel.x = f.x * this.speedF + latX;
    this.vel.y = f.z * this.speedF + latZ;
    this.slip = Math.hypot(latX, latZ);

    // ── steering ──
    const steerMaxEff = st.steer / (1 + Math.abs(this.speedF) * 0.03);
    this.steerAngle = damp(this.steerAngle, i.steer * steerMaxEff, 7, dt);
    if (Math.abs(this.speedF) > 0.15) {
      let yawRate = this.steerAngle * clamp(Math.abs(this.speedF) / 6, 0, 1) * 1.85;
      if (i.handbrake) yawRate *= 1.3;
      this.heading -= yawRate * dt * Math.sign(this.speedF);
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.y * dt;
    this.speedF = this.vel.x * f.x + this.vel.y * f.z;

    // ── vertical / airborne physics ──
    if (this.airborne) {
      this.vy -= 26 * dt;                 // gravity
      this.pos.y += this.vy * dt;
      if (this.pos.y <= this.groundY) {
        this.pos.y = this.groundY;
        const impact = -this.vy;
        this.vy = 0;
        this.airborne = false;
        // hard landings bounce the suspension and hurt a little
        this._pitch = clamp(-0.09, -0.09, 0.09);
        if (impact > 6) this.applyDamage((impact - 6) * 1.2, 0, 1);
        if (this.onLand) this.onLand(impact);
      }
    } else if (this.pos.y > this.groundY + 0.05) {
      // drove off a ramp edge
      this.airborne = true;
      this.vy = Math.max(0, this.vy);
    } else {
      this.pos.y = damp(this.pos.y, this.groundY, 20, dt);
    }

    // ── engine temp ──
    const heat = (this.rpm > 0.85 ? 3.2 : 0) + (this.nitroActive ? 4.5 : 0);
    const cool = 2.4 + (v > 8 ? 1.6 : 0);
    this.engineTemp = clamp(this.engineTemp + (heat - cool) * dt, 78, 132);

    this.applyTransform(dt);
    this._lastSpeedF = this.speedF;
    if (this.shiftFlash > 0) this.shiftFlash -= dt;
    return {
      speedKmh: this.speedKmh,
      moving: v > 0.2,
      accel: (this.speedF - this._lastSpeedF) / Math.max(dt, 0.001),
    };
  }

  applyTransform(dt = 0) {
    const h = this.handle;
    h.group.position.copy(this.pos);
    h.group.rotation.y = this.heading;
    if (dt > 0) {
      const a = (this.speedF - this._lastSpeedF) / Math.max(dt, 0.001);
      const pitchT = clamp(-a * 0.0045, -0.05, 0.075);
      const rollT = clamp(this.steerAngle * this.speedF * 0.004, -0.06, 0.06);
      this._pitch = damp(this._pitch, pitchT, 6, dt);
      this._roll = damp(this._roll, rollT, 6, dt);
      h.body.rotation.x = this._pitch;
      h.body.rotation.z = this._roll;
      this.wheelSpin += (this.speedF / (h.dims.wheelR || 0.35) + this.wheelspin * 40) * dt;
      for (const w of h.wheels) w.userData.spin.rotation.x = this.wheelSpin;
      for (const w of h.frontWheels) w.rotation.y = this.steerAngle;
      const flames = this._flames();
      this._flameT += dt * 30;
      for (const fl of flames) {
        fl.visible = this.nitroActive;
        if (this.nitroActive) fl.scale.setScalar(0.7 + Math.sin(this._flameT + fl.position.x) * 0.3);
      }
      this.setLightsRaw(this.input.brake > 0 && this.speedF > 0.3, this.speedF < -0.4, this.hazards);
      if (this.steerWheel) this.steerWheel.rotation.z = -this.steerAngle * 2.6;
    }
  }
}
