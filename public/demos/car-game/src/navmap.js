// ════════════════════════════════════════════════════════
// NAVMAP — rotating minimap, fullscreen map with POI +
// district labels + click-to-navigate, A* GPS routing,
// turn-by-turn directions, and off-route detection for
// dynamic recalculation.
// ════════════════════════════════════════════════════════
import { WORLD, DISTRICTS } from './config.js';
import { aStar, normAngle, clamp } from './utils.js';

export class NavMap {
  constructor(city) {
    this.city = city;
    this.route = [];
    this.dest = null;
    this.bigMapOpen = false;
  }

  setDestination(px, pz, tx, tz) {
    const from = this.city.nearestNode(px, pz);
    const to = this.city.nearestNode(tx, tz);
    if (!from || !to) return;
    const path = aStar(this.city.nodes, from.id, to.id);
    if (!path || path.length < 1) {
      this.route = [{ x: tx, z: tz }];
    } else {
      this.route = path.map((id) => ({ x: this.city.nodes[id].x, z: this.city.nodes[id].z }));
      this.route.push({ x: tx, z: tz });
    }
    this.dest = { x: tx, z: tz };
  }

  clearRoute() {
    this.route = [];
    this.dest = null;
  }

  /** Drop waypoints the player has passed; returns next one. */
  nextWaypoint(px, pz) {
    while (this.route.length > 1) {
      const w = this.route[0];
      if (Math.hypot(px - w.x, pz - w.z) < 10) this.route.shift();
      else break;
    }
    return this.route[0] || null;
  }

  routeDistanceLeft(px, pz) {
    if (!this.route.length) return 0;
    let d = Math.hypot(px - this.route[0].x, pz - this.route[0].z);
    for (let k = 0; k < this.route.length - 1; k++) {
      d += Math.hypot(this.route[k + 1].x - this.route[k].x, this.route[k + 1].z - this.route[k].z);
    }
    return d;
  }

  /** Distance from the player to the current route leg (for recalc). */
  distanceToRoute(px, pz) {
    if (this.route.length < 1) return 0;
    const pts = [{ x: px, z: pz }, ...this.route.slice(0, 2)];
    let min = Infinity;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const abx = b.x - a.x, abz = b.z - a.z;
      const len2 = abx * abx + abz * abz || 1;
      const t = clamp(((px - a.x) * abx + (pz - a.z) * abz) / len2, 0, 1);
      const cx = a.x + abx * t, cz = a.z + abz * t;
      min = Math.min(min, Math.hypot(px - cx, pz - cz));
    }
    return min;
  }

  /**
   * Turn-by-turn instruction relative to the car heading.
   * Returns { icon, distance } or null.
   */
  turnInstruction(px, pz, heading) {
    if (this.route.length < 1) return null;
    const wp = this.route[0];
    const dx = wp.x - px, dz = wp.z - pz;
    const dist = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, dz);
    const rel = normAngle(bearing - heading);
    let icon = '↑';
    if (rel < -2.4 || rel > 2.4) icon = '↓';
    else if (rel < -0.5) icon = '↰';
    else if (rel > 0.5) icon = '↱';
    return { icon, distance: dist };
  }

  // ───────── Rotating minimap ─────────
  drawMinimap(ctx, W, H, player, opts = {}) {
    const { heading, x: px, z: pz } = player;
    const night = opts.night || 0;
    const scale = opts.scale || 0.62;
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = night > 0.5 ? 'rgba(8,12,22,0.88)' : 'rgba(14,20,34,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-heading);
    ctx.scale(scale, -scale);
    ctx.translate(-px, -pz);

    // east river
    if (this.city.waterRect) {
      ctx.fillStyle = '#123c4e';
      ctx.fillRect(this.city.waterRect.x0, this.city.waterRect.z0,
        this.city.waterRect.x1 - this.city.waterRect.x0,
        this.city.waterRect.z1 - this.city.waterRect.z0);
    }
    // central park
    ctx.fillStyle = '#1c4a30';
    {
      const W2 = WORLD.PARK;
      ctx.fillRect(WORLD.roadX(W2.i0) + 7, WORLD.roadZ(W2.j0) + 7,
        (W2.i1 - W2.i0 + 1) * WORLD.BLOCK - 14, (W2.j1 - W2.j0 + 1) * WORLD.BLOCK - 14);
    }
    // roads
    for (const s of this.city.mapSegs) {
      ctx.strokeStyle = s.highway ? 'rgba(148,180,220,0.55)' : 'rgba(120,150,190,0.4)';
      ctx.lineWidth = s.w * 0.7;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.z1);
      ctx.lineTo(s.x2, s.z2);
      ctx.stroke();
    }
    // GPS route
    if (this.route.length) {
      ctx.strokeStyle = '#38e8b0';
      ctx.lineWidth = 3.2 / scale;
      ctx.beginPath();
      ctx.moveTo(px, pz);
      for (const w of this.route) ctx.lineTo(w.x, w.z);
      ctx.stroke();
    }

    const blip = (x, z, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, z, r / scale, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const g of this.city.gasStations) blip(g.x, g.z, '#00d4ff', 3);
    if (this.city.garage) blip(this.city.garage.x, this.city.garage.z, '#f59e0b', 3.5);
    if (this.city.dealer) blip(this.city.dealer.x, this.city.dealer.z, '#f472b6', 3.5);
    if (this.city.policeStation) blip(this.city.policeStation.x, this.city.policeStation.z, '#60a5fa', 3);
    for (const e of (opts.roamDots || [])) blip(e.x, e.z, e.color || '#fbbf24', 4);
    for (const t of (opts.trafficDots || [])) blip(t.x, t.z, 'rgba(200,210,225,0.5)', 2);
    for (const p of (opts.policeDots || [])) blip(p.x, p.z, opts.flash ? '#3b82f6' : '#93c5fd', 2.6);
    if (opts.rivalDot) blip(opts.rivalDot.x, opts.rivalDot.z, '#f97316', 2.8);
    if (this.dest) blip(this.dest.x, this.dest.z, opts.destColor || '#fbbf24', 4);
    ctx.restore();

    // player arrow
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2 - 7);
    ctx.lineTo(W / 2 + 5, H / 2 + 5);
    ctx.lineTo(W / 2, H / 2 + 2.5);
    ctx.lineTo(W / 2 - 5, H / 2 + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = 'rgba(0,212,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    // north indicator (world north = -z)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nxp = W / 2 + Math.sin(heading) * (W / 2 - 10);
    const nyp = H / 2 + Math.cos(heading) * (H / 2 - 10);
    ctx.fillText('N', nxp, nyp);
  }

  // ───────── Fullscreen map ─────────
  worldToMap(wx, wz, w, h) {
    const scale = Math.min(w / WORLD.spanX, h / WORLD.spanZ) * 0.9;
    return { x: w / 2 + wx * scale, y: h / 2 + wz * scale, scale };
  }

  mapToWorld(mx, my, w, h) {
    const scale = Math.min(w / WORLD.spanX, h / WORLD.spanZ) * 0.9;
    return { x: (mx - w / 2) / scale, z: (my - h / 2) / scale };
  }

  drawBigMap(ctx, w, h, player, opts = {}) {
    ctx.clearRect(0, 0, w, h);
    const { scale } = this.worldToMap(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);

    // river
    if (this.city.waterRect) {
      ctx.fillStyle = '#123c4e';
      ctx.fillRect(this.city.waterRect.x0, this.city.waterRect.z0,
        this.city.waterRect.x1 - this.city.waterRect.x0,
        this.city.waterRect.z1 - this.city.waterRect.z0);
    }
    // parks
    ctx.fillStyle = '#1c4a30';
    {
      const P = WORLD.PARK;
      ctx.fillRect(WORLD.roadX(P.i0) + 6, WORLD.roadZ(P.j0) + 6,
        (P.i1 - P.i0 + 1) * WORLD.BLOCK - 12, (P.j1 - P.j0 + 1) * WORLD.BLOCK - 12);
    }
    // roads
    for (const s of this.city.mapSegs) {
      ctx.strokeStyle = s.highway ? 'rgba(148,180,220,0.75)' : 'rgba(120,150,190,0.5)';
      ctx.lineWidth = Math.max(1.2, s.w * 0.7);
      ctx.beginPath();
      ctx.moveTo(s.x1, s.z1);
      ctx.lineTo(s.x2, s.z2);
      ctx.stroke();
    }
    // district labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = (i, j, txt) => {
      const c = this.city.cellCenter(i, j);
      ctx.font = `${Math.round(13 / scale)}px Rajdhani, sans-serif`;
      ctx.fillStyle = 'rgba(226,232,240,0.5)';
      ctx.fillText(txt, c.x, c.z);
    };
    label(3, 1, 'CENTRAL PARK');
    label(4, 5, 'TIMES SQUARE');
    label(5, 6, 'MIDTOWN');
    label(5, 10, 'FINANCIAL');
    label(1, 4, 'WEST SIDE');
    label(10, 7, 'BROOKLYN HTS');
    label(14, 3, 'BROOKLYN');
    label(10, 10, 'DUMBO');

    // route
    if (this.route.length) {
      ctx.strokeStyle = '#38e8b0';
      ctx.lineWidth = 4 / scale;
      ctx.beginPath();
      ctx.moveTo(player.x, player.z);
      for (const wp of this.route) ctx.lineTo(wp.x, wp.z);
      ctx.stroke();
    }
    // POI markers
    const icon = (x, z, emoji, label2, color) => {
      ctx.font = `${Math.round(13 / scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(emoji, x, z);
      if (label2) {
        ctx.font = `${Math.round(10 / scale)}px Rajdhani, sans-serif`;
        ctx.fillStyle = 'rgba(226,232,240,0.85)';
        ctx.fillText(label2, x, z + 12 / scale);
      }
    };
    for (const g of this.city.gasStations) icon(g.x, g.z, '⛽', '', '#00d4ff');
    if (this.city.garage) icon(this.city.garage.x, this.city.garage.z, '🔧', 'Garage', '#f59e0b');
    if (this.city.dealer) icon(this.city.dealer.x, this.city.dealer.z, '🚗', 'Dealer', '#f472b6');
    if (this.city.policeStation) icon(this.city.policeStation.x, this.city.policeStation.z, '🚓', 'Police', '#60a5fa');
    for (const lm of this.city.landmarks) icon(lm.x, lm.z, '⭐', lm.name, '#fbbf24');
    for (const m of (opts.missionDots || [])) icon(m.x, m.z, m.emoji || '📍', m.label || '', m.color || '#fbbf24');
    for (const r of (opts.roamDots || [])) icon(r.x, r.z, r.emoji || '🏁', r.label || '', '#38e8b0');
    if (this.dest) icon(this.dest.x, this.dest.z, '🎯', 'Destination', '#38e8b0');

    // player
    ctx.save();
    ctx.translate(player.x, player.z);
    ctx.rotate(player.heading);
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.moveTo(0, -7 / scale);
    ctx.lineTo(4.5 / scale, 5 / scale);
    ctx.lineTo(-4.5 / scale, 5 / scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
