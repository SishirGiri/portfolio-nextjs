// maps/buildings.js — tile ground renderer + 2.5D building renderer with rooftops/shadows.
import { CONFIG, PALETTE } from "../config.js";
import { shade, TAU } from "../utils/math.js";
import { hash2 } from "../utils/helpers.js";

// Draw the ground tiles within the camera view rect.
export function drawGround(ctx, map, view, nf) {
  const T = CONFIG.TILE;
  const x0 = Math.max(0, Math.floor(view.x / T));
  const y0 = Math.max(0, Math.floor(view.y / T));
  const x1 = Math.min(map.w, Math.ceil((view.x + view.w) / T) + 1);
  const y1 = Math.min(map.h, Math.ceil((view.y + view.h) / T) + 1);

  // Base asphalt fill across the whole view (fast), then detail tiles on top.
  ctx.fillStyle = PALETTE.asphalt;
  ctx.fillRect(view.x, view.y, view.w, view.h);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = map.tiles[map.idx(x, y)];
      const px = x * T, py = y * T;
      switch (t) {
        case CONFIG.T_GRASS: ctx.fillStyle = PALETTE.grass; ctx.fillRect(px, py, T, T); break;
        case CONFIG.T_PLAZA: ctx.fillStyle = PALETTE.plaza; ctx.fillRect(px, py, T, T); break;
        case CONFIG.T_WATER: ctx.fillStyle = nf > 0.4 ? "#0a1a2c" : PALETTE.water; ctx.fillRect(px, py, T, T); break;
        case CONFIG.T_SAND: ctx.fillStyle = PALETTE.sand; ctx.fillRect(px, py, T, T); break;
        case CONFIG.T_TRACK: ctx.fillStyle = "#26231a"; ctx.fillRect(px, py, T, T); break;
        case CONFIG.T_SIDEWALK: drawSidewalkTile(ctx, px, py); break;
        case CONFIG.T_ROAD: /* already asphalt base */ break;
        case CONFIG.T_LANE: drawLaneMarking(ctx, px, py, x, y, map); break;
        case CONFIG.T_CROSSWALK: drawCrosswalk(ctx, px, py); break;
      }
    }
  }
}

function drawSidewalkTile(ctx, px, py) {
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(px, py, CONFIG.TILE, CONFIG.TILE);
  // concrete seam grid
  ctx.strokeStyle = PALETTE.sidewalkDark; ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, CONFIG.TILE - 1, CONFIG.TILE - 1);
}

function drawLaneMarking(ctx, px, py, x, y, map) {
  // Dashed yellow center line. Draw along the road direction.
  const T = CONFIG.TILE;
  // Determine orientation: if horizontal neighbors are road/lane -> vertical dash
  const hor = map.get(x - 1, y) === CONFIG.T_ROAD || map.get(x + 1, y) === CONFIG.T_ROAD;
  ctx.fillStyle = PALETTE.laneMark;
  if (hor) {
    if ((Math.floor(px / T)) % 2 === 0) ctx.fillRect(px + T / 2 - 1, py, 2, T);
  } else {
    if ((Math.floor(py / T)) % 2 === 0) ctx.fillRect(px, py + T / 2 - 1, T, 2);
  }
}

function drawCrosswalk(ctx, px, py) {
  const T = CONFIG.TILE;
  ctx.fillStyle = PALETTE.crosswalk;
  // zebra stripes
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(px + 4 + i * 11, py + 6, 6, T - 12);
  }
}

// Draw a single 2.5D building: shadow + body + faux height offset + roof + windows.
export function drawBuilding(ctx, b, nf) {
  const off = Math.min(10, b.height * 0.06);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h);
  // base (ground floor)
  ctx.fillStyle = shade(b.color, 0.85);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // raised roof slab (faux height)
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x - off, b.y - off, b.w, b.h);
  // roof edge highlight
  ctx.fillStyle = shade(b.color, 1.2);
  ctx.fillRect(b.x - off, b.y - off, b.w, 3);
  ctx.fillRect(b.x - off, b.y - off, 3, b.h);
  // neon trim at night
  if (nf > 0.3) {
    ctx.strokeStyle = b.district === "Downtown" || b.district === "Midtown" ? "#3da9fc" : "#ffb020";
    ctx.globalAlpha = 0.4 + 0.4 * nf;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(b.x - off, b.y - off, b.w, b.h);
    ctx.globalAlpha = 1;
  }
  // windows grid (lit at night)
  drawWindows(ctx, b, off, nf);
}

function drawWindows(ctx, b, off, nf) {
  const cols = Math.max(2, Math.floor(b.w / 16));
  const rows = Math.max(2, Math.floor(b.h / 16));
  const ww = (b.w - 8) / cols, wh = (b.h - 8) / rows;
  const lit = 0.15 + 0.55 * nf;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = hash2(b.tx + c, b.ty + r);
      if (h < 0.25 && nf < 0.3) continue;            // unlit by day sometimes
      const isLit = h > 0.4;
      ctx.fillStyle = isLit ? `rgba(255,225,150,${lit})` : "rgba(40,50,70,0.6)";
      ctx.fillRect(b.x - off + 4 + c * ww, b.y - off + 4 + r * wh, ww * 0.7, wh * 0.7);
    }
  }
}
