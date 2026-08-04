// ui/Inventory.js — weapon/grenade switch overlay shown briefly on swap, and the
// shop/garage panel builders used by Game when opening those markers.
import { WEAPONS, GRENADES } from "../config.js";
import { fmtMoney } from "../utils/math.js";
import { UNLOCKS } from "../weapons/Arsenal.js";

export class Inventory {
  constructor(dom) { this.dom = dom; this.flashT = 0; this.flashText = ""; }
  flash(text) { this.flashText = text; this.flashT = 1.2; if (this.dom.weaponFlash) { this.dom.weaponFlash.textContent = text; this.dom.weaponFlash.classList.add("show"); } }
  update(dt) { if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0 && this.dom.weaponFlash) this.dom.weaponFlash.classList.remove("show"); } }
}

// Build the shop panel content (weapon ammo / armor / heal). Returns HTML string.
export function buildShopHTML(player, money) {
  let html = "";
  for (const w of WEAPONS) {
    const unlocked = (UNLOCKS[w.id] || 1) <= player._level || true;
    const price = 90;
    html += `<div class="result-row"><span>${w.icon} ${w.name} — ammo +30 ${unlocked ? "" : "(locked)"}</span>` +
      `<button class="mini-btn ${unlocked ? "" : "disabled"}" data-shop="ammo" data-id="${w.id}">$${price}</button></div>`;
  }
  html += `<div class="result-row"><span>🛡️ Full Armor</span><button class="mini-btn" data-shop="armor">$300</button></div>`;
  html += `<div class="result-row"><span>❤️ Med Kit (full health)</span><button class="mini-btn" data-shop="heal">$200</button></div>`;
  html += `<div class="result-row"><span>💣 Frag grenade x2</span><button class="mini-btn" data-shop="frag">$250</button></div>`;
  return html;
}

// Build garage panel content listing vehicles + upgrade buttons.
export function buildGarageHTML(player, money) {
  return ""; // garage is built dynamically in Game (interactive); placeholder for doc.
}
