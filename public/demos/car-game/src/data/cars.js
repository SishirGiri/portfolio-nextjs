// ════════════════════════════════════════════════════════
// CARS — player vehicle catalog, loaded from vehicles.json.
// The same JSON is imported by the server (validation +
// pricing), making it the single source of truth.
// speed units ≈ m/s → km/h = ×3.6
// ════════════════════════════════════════════════════════
import carsData from './vehicles.json' with { type: 'json' };

export const CARS = carsData;
export const CAR_BY_ID = Object.fromEntries(CARS.map((c) => [c.id, c]));
export const CAR_IDS = CARS.map((c) => c.id);
