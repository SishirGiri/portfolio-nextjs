// ════════════════════════════════════════════════════════
// MISSIONS — career chain + free-roam events, loaded from
// missions.json (shared with the server for score validation).
// Career = !roam; roam events start from city markers.
// ════════════════════════════════════════════════════════
import missionsData from './missions.json' with { type: 'json' };

export const MISSIONS = missionsData;
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
export const CAREER_MISSIONS = MISSIONS.filter((m) => !m.roam);
export const ROAM_MISSIONS = MISSIONS.filter((m) => !!m.roam);
