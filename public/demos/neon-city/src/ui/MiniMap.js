// ui/MiniMap.js — renders the minimap canvas: districts, roads, entities, objective, compass.
import { CONFIG, DISTRICTS, PALETTE } from "../config.js";

export class MiniMap {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.size = 168; }
  resize() { this.canvas.width = this.size; this.canvas.height = this.size; }

  draw(game) {
    const ctx = this.ctx, S = this.size;
    const scale = S / (CONFIG.WORLD_W * CONFIG.TILE);
    ctx.clearRect(0, 0, S, S);
    // bg
    ctx.fillStyle = "rgba(2,4,14,0.85)"; ctx.fillRect(0, 0, S, S);
    // districts
    for (const d of DISTRICTS) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(d.x * CONFIG.TILE * scale, d.y * CONFIG.TILE * scale, d.w * CONFIG.TILE * scale, d.h * CONFIG.TILE * scale);
      ctx.strokeStyle = d.accent; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
      ctx.strokeRect(d.x * CONFIG.TILE * scale, d.y * CONFIG.TILE * scale, d.w * CONFIG.TILE * scale, d.h * CONFIG.TILE * scale);
      ctx.globalAlpha = 1;
    }
    // markers
    for (const m of game.markers) {
      const col = m.kind === "race" ? PALETTE.magenta : m.kind === "garage" ? PALETTE.amber :
                  m.kind === "safehouse" ? PALETTE.green : m.kind === "shop" ? PALETTE.violet : PALETTE.cyan;
      ctx.fillStyle = col;
      ctx.fillRect(m.x * scale - 2, m.y * scale - 2, 4, 4);
    }
    // mission objective
    if (game.mission && game.mission.dest) {
      ctx.fillStyle = PALETTE.green; ctx.strokeStyle = PALETTE.green;
      ctx.beginPath(); ctx.arc(game.mission.dest.x * scale, game.mission.dest.y * scale, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // enemies
    ctx.fillStyle = PALETTE.red;
    for (const e of game.enemies) if (e.alive) ctx.fillRect(e.x * scale - 1.5, e.y * scale - 1.5, 3, 3);
    // npc (civilians faint)
    ctx.fillStyle = "rgba(155,214,255,0.4)";
    for (const n of game.npcs) if (n.alive) ctx.fillRect(n.x * scale - 1, n.y * scale - 1, 2, 2);
    // vehicles
    ctx.fillStyle = "rgba(200,210,230,0.5)";
    for (const v of game.vehicles) if (!v.wrecked) ctx.fillRect(v.x * scale - 1, v.y * scale - 1, 2, 2);
    // player
    const p = game.player;
    if (p) {
      const px = p.x * scale, py = p.y * scale;
      ctx.fillStyle = PALETTE.cyan; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
      // aim direction
      ctx.strokeStyle = PALETTE.cyan; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(p.aimAngle) * 8, py + Math.sin(p.aimAngle) * 8); ctx.stroke();
    }
    // viewport rect
    if (game.camera) {
      ctx.strokeStyle = "rgba(61,169,252,0.4)"; ctx.lineWidth = 1;
      ctx.strokeRect(game.camera.x * scale, game.camera.y * scale, CONFIG.VIEW_W * scale, CONFIG.VIEW_H * scale);
    }
    // compass N marker
    ctx.fillStyle = PALETTE.amber; ctx.font = "bold 10px Rajdhani"; ctx.textAlign = "center";
    ctx.fillText("N", S / 2, 10);
  }
}
