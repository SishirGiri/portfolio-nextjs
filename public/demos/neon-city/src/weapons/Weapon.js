// weapons/Weapon.js — base weapon instance tracking ammo, cooldowns, recoil.
export class Weapon {
  constructor(def) {
    this.def = def;
    this.mag = def.mag;
    this.fireCd = 0;
    this.recoil = 0;          // current added spread (rad), decays via recovery
  }
  update(dt) {
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - this.def.recovery * dt);
  }
  // Effective spread including current recoil.
  spread() {
    return this.def.spread + this.recoil * 0.5;
  }
}
