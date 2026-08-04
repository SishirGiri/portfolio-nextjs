// maps/CityMap.js — procedural modern city: road grid, lane markings, sidewalks,
// crosswalks, districts, building footprints, and prop spawn anchors.
import { CONFIG, DISTRICTS } from "../config.js";
import { makeRng } from "../utils/math.js";

const SEED = 90210;

export class CityMap {
  constructor() {
    this.w = CONFIG.WORLD_W;
    this.h = CONFIG.WORLD_H;
    this.tiles = new Uint8Array(this.w * this.h);
    // Building footprints: {x,y,w,h,kind,height,color,roof,district}
    this.buildings = [];
    // Prop anchors placed alongside roads: {x,y,type}
    this.props = [];
    // Road-cell list for vehicle/mission spawning.
    this.roadCells = [];
    this._generate();
  }

  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.inBounds(x, y) ? this.tiles[this.idx(x, y)] : CONFIG.T_VOID; }
  set(x, y, t) { if (this.inBounds(x, y)) this.tiles[this.idx(x, y)] = t; }

  districtAt(cx, cy) {
    for (const d of DISTRICTS) if (cx >= d.x && cx < d.x + d.w && cy >= d.y && cy < d.y + d.h) return d;
    return null;
  }

  _generate() {
    const rng = makeRng(SEED);
    rng.reseed();
    const W = this.w, H = this.h;
    // 1. Base ground: grass everywhere.
    for (let i = 0; i < W * H; i++) this.tiles[i] = CONFIG.T_GRASS;

    // 2. City edge water + a river band for bridges.
    for (let x = 0; x < W; x++) { this.set(x, 0, CONFIG.T_WATER); this.set(x, H - 1, CONFIG.T_WATER); }
    for (let y = 0; y < H; y++) { this.set(0, y, CONFIG.T_WATER); this.set(W - 1, y, CONFIG.T_WATER); }
    // Small lake in the park district.
    const park = DISTRICTS.find((d) => d.type === "park");
    if (park) {
      const lx = park.x + 8, ly = park.y + 8, lw = 14, lh = 12;
      for (let y = ly; y < ly + lh; y++) for (let x = lx; x < lx + lw; x++) this.set(x, y, CONFIG.T_WATER);
    }

    // 3. Carve road grid. Major avenues + per-district local streets.
    // Major cross-town avenues (multi-lane).
    const majors = [
      { horizontal: true, at: Math.floor(H * 0.5) },
      { horizontal: true, at: Math.floor(H * 0.28) },
      { horizontal: false, at: Math.floor(W * 0.5) },
      { horizontal: false, at: Math.floor(W * 0.28) },
    ];
    for (const m of majors) this._carveAvenue(m, rng);

    // Local street grid per district.
    for (const d of DISTRICTS) this._carveDistrictStreets(d, rng);

    // 4. Sidewalk ring around roads + crosswalks at intersections.
    this._addSidewalksAndCrosswalks();

    // 5. Place buildings on non-road cells adjacent to roads/sidewalks.
    this._placeBuildings(rng);

    // 6. Scatter props (street furniture, vehicles, barrels, etc.).
    this._placeProps(rng);

    // 7. Collect road cells for spawn lookups.
    this.roadCells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = this.tiles[this.idx(x, y)];
      if (t === CONFIG.T_ROAD || t === CONFIG.T_LANE || t === CONFIG.T_CROSSWALK) {
        this.roadCells.push({ x, y });
      }
    }
  }

  _carveAvenue(m, rng) {
    const T = CONFIG;
    if (m.horizontal) {
      const y = m.at;
      for (let x = 1; x < this.w - 1; x++) {
        this.set(x, y, T.T_ROAD); this.set(x, y + 1, T.T_LANE); this.set(x, y - 1, T.T_LANE);
        this.set(x, y + 2, T.T_ROAD);
      }
    } else {
      const x = m.at;
      for (let y = 1; y < this.h - 1; y++) {
        this.set(x, y, T.T_ROAD); this.set(x + 1, y, T.T_LANE); this.set(x - 1, y, T.T_LANE);
        this.set(x + 2, y, T.T_ROAD);
      }
    }
  }

  _carveDistrictStreets(d, rng) {
    const T = CONFIG;
    const step = d.type === "park" ? 16 : 9;
    for (let y = d.y + 2; y < d.y + d.h - 2; y += step) {
      for (let x = d.x + 1; x < d.x + d.w - 1; x++) { this.set(x, y, T.T_ROAD); }
    }
    for (let x = d.x + 2; x < d.x + d.w - 2; x += step) {
      for (let y = d.y + 1; y < d.y + d.h - 1; y++) { this.set(x, y, T.T_ROAD); }
    }
  }

  _addSidewalksAndCrosswalks() {
    const T = CONFIG;
    // First pass: any grass/plaza next to a road becomes sidewalk.
    const next = new Uint8Array(this.tiles);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        const t = this.tiles[this.idx(x, y)];
        if (t === T.T_GRASS || t === T.T_PLAZA) {
          for (const [dx, dy] of dirs) {
            const nt = this.tiles[this.idx(x + dx, y + dy)];
            if (nt === T.T_ROAD || nt === T.T_LANE) { next[this.idx(x, y)] = T.T_SIDEWALK; break; }
          }
        }
      }
    }
    this.tiles = next;
    // Crosswalks: where a road meets an intersection (4-way). Simple heuristic:
    // mark road cells that have road on both horizontal and vertical neighbors.
    for (let y = 2; y < this.h - 2; y++) {
      for (let x = 2; x < this.w - 2; x++) {
        if (this.tiles[this.idx(x, y)] !== T.T_ROAD) continue;
        const hor = this.tiles[this.idx(x + 1, y)] === T.T_ROAD && this.tiles[this.idx(x - 1, y)] === T.T_ROAD;
        const ver = this.tiles[this.idx(x, y + 1)] === T.T_ROAD && this.tiles[this.idx(x, y - 1)] === T.T_ROAD;
        if (hor && ver) this.tiles[this.idx(x, y)] = T.T_CROSSWALK;
      }
    }
  }

  _placeBuildings(rng) {
    const T = CONFIG;
    for (const d of DISTRICTS) {
      if (d.type === "park") continue;
      // Walk the district in chunks; place a building block where the cell is grass.
      for (let y = d.y; y < d.y + d.h - 3; y += 1) {
        for (let x = d.x; x < d.x + d.w - 3; x += 1) {
          if (this.tiles[this.idx(x, y)] !== T.T_GRASS) continue;
          // need sidewalk/road adjacent
          const adj = this._isAdjacentTo(x, y, [T.T_SIDEWALK, T.T_ROAD, T.T_LANE]);
          if (!adj) continue;
          if (!rng.chance(0.5)) continue;
          const bw = rng.int(2, 4), bh = rng.int(2, 4);
          if (!this._rectAll(x, y, bw, bh, T.T_GRASS)) continue;
          const kind = this._buildingKind(d, rng);
          const height = this._buildingHeight(kind, rng);
          const color = this._buildingColor(d, rng);
          // stamp building tiles
          for (let by = y; by < y + bh; by++) for (let bx = x; bx < x + bw; bx++) this.set(bx, by, T.T_BUILDING);
          this.buildings.push({
            tx: x, ty: y, tw: bw, th: bh,
            x: x * CONFIG.TILE, y: y * CONFIG.TILE, w: bw * CONFIG.TILE, h: bh * CONFIG.TILE,
            kind, height, color, district: d.name,
          });
          x += bw; // skip ahead
        }
      }
    }
  }

  _buildingKind(d, rng) {
    if (d.type === "industrial") return rng.pick(["warehouse", "factory", "container"]);
    if (d.type === "commercial") return rng.pick(["office", "apartment", "shop"]);
    return rng.pick(["apartment", "house", "shop"]);
  }
  _buildingHeight(kind, rng) {
    switch (kind) {
      case "office": return rng.range(120, 210);
      case "apartment": return rng.range(70, 130);
      case "shop": return rng.range(40, 70);
      case "house": return rng.range(34, 54);
      case "warehouse": return rng.range(50, 80);
      case "factory": return rng.range(60, 95);
      default: return rng.range(40, 70);
    }
  }
  _buildingColor(d, rng) {
    const palettes = {
      commercial: ["#222838", "#262d40", "#1f2433", "#2a2f44"],
      industrial: ["#2a241c", "#2e2620", "#241e1a"],
      residential: ["#212738", "#1f2433", "#262030"],
      park: ["#22261c"],
    };
    return rng.pick(palettes[d.type] || palettes.commercial);
  }

  _placeProps(rng) {
    const T = CONFIG;
    // Street furniture along sidewalks: lights, hydrants, signs, benches, trees, dumpsters, bins, barriers.
    const furniture = ["streetlight", "streetlight", "hydrant", "sign", "bench", "tree", "dumpster", "trashbin", "barrier"];
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        if (this.tiles[this.idx(x, y)] !== T.T_SIDEWALK) continue;
        if (!rng.chance(0.08)) continue;
        this.props.push({ x: x * CONFIG.TILE + CONFIG.TILE / 2, y: y * CONFIG.TILE + CONFIG.TILE / 2, type: rng.pick(furniture) });
      }
    }
    // Trees & bushes in parks / grass.
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.tiles[this.idx(x, y)] !== T.T_GRASS) continue;
        if (!rng.chance(0.05)) continue;
        this.props.push({ x: x * CONFIG.TILE + rng.range(8, CONFIG.TILE - 8), y: y * CONFIG.TILE + rng.range(8, CONFIG.TILE - 8), type: rng.chance(0.7) ? "tree" : "bush" });
      }
    }
    // Parked vehicles along roads.
    for (let i = 0; i < 120; i++) {
      const c = rng.pick(this.roadCells.length ? this.roadCells : [{ x: 5, y: 5 }]);
      this.props.push({ x: c.x * CONFIG.TILE + CONFIG.TILE / 2, y: c.y * CONFIG.TILE + CONFIG.TILE / 2, type: "parkedcar", variant: rng.int(0, 3) });
    }
    // Utility poles near sidewalks periodically.
    for (let y = 2; y < this.h - 2; y += 6) {
      for (let x = 2; x < this.w - 2; x += 6) {
        if (this.tiles[this.idx(x, y)] === T.T_SIDEWALK) this.props.push({ x: x * CONFIG.TILE, y: y * CONFIG.TILE, type: "utilitypole" });
      }
    }
    // Explosive barrels (rare) near industrial buildings.
    for (const b of this.buildings) {
      if ((b.kind === "warehouse" || b.kind === "factory") && rng.chance(0.5)) {
        this.props.push({ x: b.x + b.w + 10, y: b.y + b.h - 14, type: "barrel" });
        if (rng.chance(0.5)) this.props.push({ x: b.x + b.w + 24, y: b.y + b.h - 14, type: "barrel" });
      }
    }
    // Shipping containers in industrial.
    for (const b of this.buildings) {
      if (b.kind === "container" && rng.chance(0.8)) {
        const rot = rng.chance(0.5);
        this.props.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, type: "container", rot, color: rng.pick(["#c34a2a", "#3a6a8a", "#3aa06a", "#c0a02a"]) });
      }
    }
  }

  _isAdjacentTo(x, y, types) {
    const T = CONFIG;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const t = this.tiles[this.idx(x + dx, y + dy)];
      if (types.includes(t)) return true;
    }
    return false;
  }
  _rectAll(x, y, w, h, type) {
    for (let by = y; by < y + h; by++) for (let bx = x; bx < x + w; bx++) {
      if (!this.inBounds(bx, by)) return false;
      if (this.tiles[this.idx(bx, by)] !== type) return false;
    }
    return true;
  }

  // Find a road cell near a world point (spiral search). Returns world {x,y}.
  findRoadNear(wx, wy, maxRadius = 14) {
    const cx = Math.floor(wx / CONFIG.TILE), cy = Math.floor(wy / CONFIG.TILE);
    for (let r = 0; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const t = this.get(cx + dx, cy + dy);
          if (t === CONFIG.T_ROAD || t === CONFIG.T_LANE || t === CONFIG.T_CROSSWALK) {
            return { x: (cx + dx) * CONFIG.TILE + CONFIG.TILE / 2, y: (cy + dy) * CONFIG.TILE + CONFIG.TILE / 2 };
          }
        }
      }
    }
    // Fallback: random road cell.
    if (this.roadCells.length) {
      const c = this.roadCells[Math.floor(Math.random() * this.roadCells.length)];
      return { x: c.x * CONFIG.TILE + CONFIG.TILE / 2, y: c.y * CONFIG.TILE + CONFIG.TILE / 2 };
    }
    return { x: wx, y: wy };
  }

  randomRoadPointFar(ox, oy, minDist) {
    for (let i = 0; i < 40; i++) {
      const c = this.roadCells[Math.floor(Math.random() * this.roadCells.length)];
      const wx = c.x * CONFIG.TILE + CONFIG.TILE / 2, wy = c.y * CONFIG.TILE + CONFIG.TILE / 2;
      if ((wx - ox) ** 2 + (wy - oy) ** 2 > minDist * minDist) return { x: wx, y: wy };
    }
    const c = this.roadCells[Math.floor(Math.random() * this.roadCells.length)];
    return { x: c.x * CONFIG.TILE + CONFIG.TILE / 2, y: c.y * CONFIG.TILE + CONFIG.TILE / 2 };
  }
}
