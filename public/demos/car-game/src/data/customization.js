// ════════════════════════════════════════════════════════
// CUSTOMIZATION — upgrades + cosmetics, loaded from
// customization.json (shared with the server for price
// validation). Wheel rim colors are hex strings in JSON and
// are converted to ints here for the mesh builder.
// ════════════════════════════════════════════════════════
import data from './customization.json' with { type: 'json' };

export const UPGRADES = data.upgrades;
export const UPGRADE_KEYS = Object.keys(data.upgrades);
export const PAINTS = data.paints;
export const SPOILERS = data.spoilers;
export const WHEELS = data.wheels.map((w) => ({ ...w, rim: parseInt(w.rim.slice(1), 16) }));
export const CALIPERS = data.calipers;
export const BODYKITS = data.bodyKits;
export const EXHAUSTS = data.exhausts;
