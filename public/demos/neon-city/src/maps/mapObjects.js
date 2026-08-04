// maps/mapObjects.js — realistic Canvas-vector renderers for environment props.
// Each renderer takes (ctx, prop, nightFactor). Props are drawn in world space.
import { PALETTE } from "../config.js";
import { shade, TAU } from "../utils/math.js";

const CAR_COLORS = ["#5a3a2a", "#2a3a5a", "#3a3a3a", "#6a6a3a", "#3a5a3a", "#5a2a3a"];

// Master dispatcher.
export function drawProp(ctx, prop, nf) {
  switch (prop.type) {
    case "streetlight": return drawStreetlight(ctx, prop, nf);
    case "hydrant": return drawHydrant(ctx, prop);
    case "sign": return drawSign(ctx, prop);
    case "bench": return drawBench(ctx, prop);
    case "tree": return drawTree(ctx, prop);
    case "bush": return drawBush(ctx, prop);
    case "dumpster": return drawDumpster(ctx, prop);
    case "trashbin": return drawTrashBin(ctx, prop);
    case "barrier": return drawBarrier(ctx, prop);
    case "utilitypole": return drawUtilityPole(ctx, prop);
    case "parkedcar": return drawParkedCar(ctx, prop);
    case "container": return drawContainer(ctx, prop);
    default: return;
  }
}

// Solid prop registry (for collision). Returns prop radius for circle collision, 0 if non-solid.
export function propRadius(type) {
  switch (type) {
    case "tree": return 10;
    case "dumpster": return 16;
    case "barrier": return 12;
    case "container": return 30;
    case "utilitypole": return 6;
    case "hydrant": return 7;
    case "parkedcar": return 18;
    case "barrel": return 10;
    default: return 0;
  }
}
export function isPropSolid(type) { return propRadius(type) > 0; }
export function isPropDestructible(type) { return type === "barrel" || type === "barrier"; }
export function isPropExplosive(type) { return type === "barrel"; }

function shadow(ctx, x, y, r) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(x + 3, y + 3, r, r * 0.6, 0, 0, TAU); ctx.fill();
}

function drawStreetlight(ctx, p, nf) {
  shadow(ctx, p.x, p.y, 6);
  // pole
  ctx.strokeStyle = "#2a2e36"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 16); ctx.stroke();
  // arm
  ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x + 8, p.y - 18); ctx.stroke();
  // lamp
  ctx.fillStyle = nf > 0.4 ? "#fff3c0" : "#6a6a4a";
  ctx.beginPath(); ctx.arc(p.x + 8, p.y - 17, 3, 0, TAU); ctx.fill();
}

function drawHydrant(ctx, p) {
  shadow(ctx, p.x, p.y, 6);
  ctx.fillStyle = "#b8341f";
  ctx.fillRect(p.x - 4, p.y - 8, 8, 12);
  ctx.fillStyle = "#8a2414";
  ctx.fillRect(p.x - 5, p.y - 10, 10, 4);
  ctx.fillStyle = "#d04a30";
  ctx.beginPath(); ctx.arc(p.x, p.y - 10, 3, 0, TAU); ctx.fill();
}

function drawSign(ctx, p) {
  shadow(ctx, p.x, p.y, 4);
  ctx.strokeStyle = "#3a3e46"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 14); ctx.stroke();
  ctx.fillStyle = "#2a6a9a";
  ctx.fillRect(p.x - 7, p.y - 22, 14, 9);
  ctx.fillStyle = "#e6f0ff"; ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("STOP", p.x, p.y - 15);
}

function drawBench(ctx, p) {
  shadow(ctx, p.x, p.y, 10);
  ctx.fillStyle = "#5a4a2a";
  ctx.fillRect(p.x - 11, p.y - 3, 22, 6);
  ctx.fillStyle = "#3a2e1a";
  ctx.fillRect(p.x - 11, p.y + 3, 22, 2);
  ctx.fillRect(p.x - 10, p.y - 5, 2, 9);
  ctx.fillRect(p.x + 8, p.y - 5, 2, 9);
}

function drawTree(ctx, p) {
  // trunk
  shadow(ctx, p.x, p.y, 12);
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  // canopy layers
  ctx.fillStyle = "#1f3315";
  ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2a4a1c";
  ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = "#356024";
  ctx.beginPath(); ctx.arc(p.x - 4, p.y - 4, 5, 0, TAU); ctx.fill();
}

function drawBush(ctx, p) {
  shadow(ctx, p.x, p.y, 8);
  ctx.fillStyle = "#1f3315";
  ctx.beginPath(); ctx.arc(p.x - 4, p.y, 6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + 4, p.y, 6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x, p.y - 3, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2a4a1c";
  ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 4, 0, TAU); ctx.fill();
}

function drawDumpster(ctx, p) {
  shadow(ctx, p.x, p.y, 18);
  ctx.fillStyle = "#2a5a3a";
  ctx.fillRect(p.x - 16, p.y - 9, 32, 18);
  ctx.fillStyle = "#1f4530";
  ctx.fillRect(p.x - 16, p.y - 9, 32, 4);
  ctx.fillStyle = "#3a6a4a";
  ctx.fillRect(p.x - 14, p.y - 6, 28, 2);
}

function drawTrashBin(ctx, p) {
  shadow(ctx, p.x, p.y, 7);
  ctx.fillStyle = "#3a3e2a";
  ctx.fillRect(p.x - 5, p.y - 7, 10, 14);
  ctx.fillStyle = "#2a2e1e";
  ctx.fillRect(p.x - 6, p.y - 9, 12, 3);
}

function drawBarrier(ctx, p) {
  shadow(ctx, p.x, p.y, 14);
  // concrete jersey barrier
  ctx.fillStyle = "#7a7a72";
  ctx.beginPath();
  ctx.moveTo(p.x - 14, p.y - 6);
  ctx.lineTo(p.x + 14, p.y - 6);
  ctx.lineTo(p.x + 10, p.y + 6);
  ctx.lineTo(p.x - 10, p.y + 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a5a52";
  ctx.fillRect(p.x - 14, p.y - 6, 28, 2);
  // warning stripe
  ctx.fillStyle = "#ffb020";
  ctx.fillRect(p.x - 12, p.y - 2, 24, 2);
}

function drawUtilityPole(ctx, p) {
  shadow(ctx, p.x, p.y, 5);
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(p.x - 2, p.y - 8, 4, 16);
  ctx.fillRect(p.x - 8, p.y - 6, 16, 2);
}

function drawParkedCar(ctx, p) {
  const color = CAR_COLORS[(p.variant || 0) % CAR_COLORS.length];
  shadow(ctx, p.x, p.y, 18);
  // body (top-down)
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = color;
  ctx.fillRect(-15, -9, 30, 18);
  // cabin
  ctx.fillStyle = shade(color, 0.7);
  ctx.fillRect(-8, -7, 16, 14);
  // windshield
  ctx.fillStyle = "rgba(150,200,230,0.6)";
  ctx.fillRect(4, -6, 6, 12);
  ctx.fillRect(-10, -6, 4, 12);
  // roof line
  ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
  ctx.strokeRect(-15, -9, 30, 18);
  ctx.restore();
}

function drawContainer(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.rot) ctx.rotate(Math.PI / 2);
  shadow(ctx, 0, 0, 30);
  const w = 56, h = 22;
  ctx.fillStyle = p.color || "#3a6a8a";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  // ribs
  ctx.strokeStyle = shade(p.color || "#3a6a8a", 0.7); ctx.lineWidth = 1;
  for (let i = -w / 2 + 6; i < w / 2; i += 7) {
    ctx.beginPath(); ctx.moveTo(i, -h / 2); ctx.lineTo(i, h / 2); ctx.stroke();
  }
  // end doors
  ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.beginPath(); ctx.moveTo(w / 2 - 8, -h / 2); ctx.lineTo(w / 2 - 8, h / 2); ctx.stroke();
  ctx.restore();
}

// Draw a barrel (with explosive marker). Used by entities too.
export function drawBarrel(ctx, p) {
  shadow(ctx, p.x, p.y, 9);
  ctx.fillStyle = "#a83232";
  ctx.fillRect(p.x - 7, p.y - 9, 14, 18);
  ctx.fillStyle = "#7a2222";
  ctx.fillRect(p.x - 7, p.y - 6, 14, 2);
  ctx.fillRect(p.x - 7, p.y + 4, 14, 2);
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("☠", p.x, p.y + 1);
}
