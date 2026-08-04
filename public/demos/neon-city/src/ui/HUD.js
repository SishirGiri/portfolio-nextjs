// ui/HUD.js — updates the DOM HUD elements from game state each frame.
import { CONFIG } from "../config.js";
import { clamp, fmtMoney, TAU } from "../utils/math.js";

export class HUD {
  constructor(dom) { this.dom = dom; }
  refresh(game) {
    const p = game.player; if (!p) return;
    const d = this.dom;
    // vitals
    d.health.style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + "%";
    d.armor.style.width = clamp(p.armor / p.maxArmor * 100, 0, 100) + "%";
    d.stamina.style.width = clamp(p.stamina / CONFIG.PLAYER.staminaMax * 100, 0, 100) + "%";
    // weapon
    const w = p.weapon;
    d.weaponName.textContent = w.def.name;
    d.ammo.textContent = w.mag + " / " + w.def.mag;
    d.reserve.textContent = "+" + (p.reserves[w.def.id] || 0);
    d.weaponIcon.textContent = w.def.icon;
    // grenades
    const g = p.currentGrenade;
    d.grenadeName.textContent = g.name; d.grenadeIcon.textContent = g.icon;
    d.grenadeCount.textContent = p.grenades[g.id] || 0;
    // economy / level
    d.money.textContent = fmtMoney(game.money);
    d.level.textContent = game.level;
    d.xp.style.width = (game.xp / game.xpNext * 100) + "%";
    // heat stars
    const h = Math.floor(game.heat);
    d.heat.textContent = "★".repeat(h) + "☆".repeat(5 - h);
    // kill count
    d.kills.textContent = game.kills;
    // mission tracker
    d.missionName.textContent = game.mission ? game.mission.def.name : "No active mission";
    d.missionDesc.innerHTML = game.missionDesc;
    // timer
    d.timer.textContent = game.missionTimer > 0 ? formatTime(game.missionTimer) : "";
    d.timer.parentElement.style.opacity = game.missionTimer > 0 ? "1" : "0";
    // drive HUD
    if (p.inVehicle) {
      const v = p.inVehicle;
      d.driveHud.classList.add("show");
      d.speed.textContent = Math.abs(Math.round(v.speed));
      d.vehHealth.style.width = clamp(v.hp / v.maxHp * 100, 0, 100) + "%";
      d.nitro.style.width = clamp(v.maxNitro ? v.nitro / v.maxNitro * 100 : 0, 0, 100) + "%";
    } else {
      d.driveHud.classList.remove("show");
    }
  }
}

function formatTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return m + ":" + String(ss).padStart(2, "0");
}
