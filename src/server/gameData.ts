/**
 * Shared game data — the SAME JSON files the browser game
 * imports (public/demos/car-game/src/data/*.json). The client
 * renders from them; the server validates purchases, saves and
 * leaderboard runs against them. One source of truth, no drift.
 */
import vehiclesJson from '../../public/demos/car-game/src/data/vehicles.json';
import customizationJson from '../../public/demos/car-game/src/data/customization.json';
import missionsJson from '../../public/demos/car-game/src/data/missions.json';
import economyJson from '../../public/demos/car-game/src/data/economy.json';

export interface VehicleDef {
  id: string;
  name: string;
  cls: string;
  style: string;
  price: number;
  levelReq: number;
  color: string;
  topSpeed: number;
  accel: number;
  brake: number;
  grip: number;
  steer: number;
  reverse: number;
  nitroCap: number;
  weight: number;
  dims: { w: number; h: number; l: number };
  desc: string;
  engine: { base: number; range: number; sub: number };
  drive: string;
}

export interface MissionDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: string;
  timeLimit: number;
  reward: number;
  xp: number;
  levelReq: number;
  roam?: boolean;
  params: Record<string, unknown>;
}

export const VEHICLES = vehiclesJson as VehicleDef[];
export const VEHICLE_BY_ID = new Map(VEHICLES.map((v) => [v.id, v]));

export interface UpgradeDef {
  name: string;
  icon: string;
  costs: number[];
  [key: string]: unknown;
}
export const UPGRADES = customizationJson.upgrades as Record<string, UpgradeDef>;
export const MAX_UPGRADE_LEVEL = 3;

export const MISSIONS = missionsJson as MissionDef[];
export const MISSION_BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));
export const CAREER_MISSION_IDS = MISSIONS.filter((m) => !m.roam).map((m) => m.id);

export const ECONOMY = economyJson;

/** Mirrors the client formula (data/economy.js). */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / ECONOMY.levelCoefficient));
}
export function levelXp(level: number): number {
  return ECONOMY.levelCoefficient * level * level;
}
