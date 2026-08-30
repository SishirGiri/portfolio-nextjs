/**
 * AI Driving Coach — modular performance analyzer (spec §17).
 *
 * Problem it solves: players get stars/scores but no actionable
 * feedback on WHAT to improve.
 *
 * Design: a rule-based expert system over the player's own
 * telemetry (mission history + career stats). The `Analyzer`
 * interface keeps it swappable — an LLM-backed implementation
 * can produce the same output shape later without touching
 * routes or the client.
 */
import { MISSION_BY_ID } from '../gameData';
import type { Repositories, UserRecord, MissionProgressRecord, StatsRecord } from '../repositories/types';

export interface CoachInsight {
  kind: 'strength' | 'weakness' | 'trend' | 'recommendation';
  title: string;
  detail: string;
}

export interface CoachReport {
  generatedAt: string;
  focus: string | null;          // the single most valuable next practice target
  insights: CoachInsight[];
}

export interface Analyzer {
  analyze(input: {
    progress: MissionProgressRecord[];
    stats: StatsRecord | null;
    level: number;
  }): CoachReport;
}

/** Rule-based analyzer — deterministic, testable, no network. */
export class RuleBasedAnalyzer implements Analyzer {
  analyze({ progress, stats, level }: { progress: MissionProgressRecord[]; stats: StatsRecord | null; level: number }): CoachReport {
    const insights: CoachInsight[] = [];
    if (!progress.length) {
      return {
        generatedAt: new Date().toISOString(),
        focus: 'first-drive',
        insights: [{
          kind: 'recommendation',
          title: 'Start your career',
          detail: 'Complete the First Drive mission — the coach needs a few runs before it can spot patterns.',
        }],
      };
    }

    const completed = progress.length;
    const avgStars = progress.reduce((s, p) => s + p.stars, 0) / completed;
    const threeStar = progress.filter((p) => p.stars === 3).length;
    const oneStar = progress.filter((p) => p.stars <= 1);

    // ── strengths ────────────────────────────────────────
    if (avgStars >= 2.5) {
      insights.push({
        kind: 'strength',
        title: 'Consistent execution',
        detail: `You average ${avgStars.toFixed(1)}★ across ${completed} completed missions — clean, disciplined driving.`,
      });
    }
    if (threeStar >= Math.ceil(completed * 0.6) && completed >= 5) {
      insights.push({
        kind: 'strength',
        title: 'Precision driver',
        detail: `${threeStar} of ${completed} missions at 3★ — your collision discipline is excellent.`,
      });
    }
    if ((stats?.escapes ?? 0) >= 5) {
      insights.push({
        kind: 'strength',
        title: 'Escape artist',
        detail: `${stats!.escapes} police escapes — you keep your cool under pressure.`,
      });
    }

    // ── weaknesses ───────────────────────────────────────
    let focus: string | null = null;
    if (oneStar.length >= 2) {
      const worst = oneStar
        .map((p) => ({ p, mission: MISSION_BY_ID.get(p.missionId) }))
        .filter((x) => x.mission)
        .sort((a, b) => a.p.stars - b.p.stars)[0];
      if (worst) {
        focus = worst.p.missionId;
        insights.push({
          kind: 'weakness',
          title: `Replay: ${worst.mission!.name}`,
          detail: `${oneStar.length} missions are stuck at 1★. ${worst.mission!.name} is your lowest — its 3★ needs fewer collisions and a faster time.`,
        });
      }
    }
    if (stats && completed >= 5) {
      const collisionsPerMission = stats.collisions / Math.max(1, stats.missionsCompleted);
      if (collisionsPerMission > 3) {
        if (!focus) focus = 'braking';
        insights.push({
          kind: 'weakness',
          title: 'Collision-heavy driving',
          detail: `You average ${collisionsPerMission.toFixed(1)} collisions per mission. Ease off the throttle approaching intersections — every hit costs a star.`,
        });
      }
    }
    if (stats && stats.topSpeedKmh > 0 && stats.topSpeedKmh < 140 && level >= 3) {
      insights.push({
        kind: 'weakness',
        title: 'Under-using the straights',
        detail: `Your top speed is ${Math.round(stats.topSpeedKmh)} km/h. Avenues and bridges are free real estate — full throttle where there is no cross traffic.`,
      });
    }

    // ── trend ────────────────────────────────────────────
    const timed = progress
      .filter((p) => p.bestTimeMs !== null)
      .sort((a, b) => (b.updatedAt.getTime()) - (a.updatedAt.getTime()));
    if (timed.length >= 2) {
      const half = Math.floor(timed.length / 2);
      const recent = timed.slice(0, half);
      const older = timed.slice(half);
      const avg = (arr: MissionProgressRecord[]) => arr.reduce((s, p) => s + (p.bestTimeMs ?? 0), 0) / arr.length;
      if (older.length && recent.length) {
        const delta = (avg(recent) - avg(older)) / avg(older);
        if (delta < -0.05) {
          insights.push({
            kind: 'trend',
            title: 'Getting faster',
            detail: `Your recent best times are ${Math.round(-delta * 100)}% quicker than your earlier runs. Keep it up.`,
          });
        } else if (delta > 0.05) {
          insights.push({
            kind: 'trend',
            title: 'Times are slipping',
            detail: `Recent best times are ${Math.round(delta * 100)}% slower — revisit the routes you know well to rebuild rhythm.`,
          });
        }
      }
    }

    // ── recommendations ──────────────────────────────────
    if (!focus) {
      const next = [...MISSION_BY_ID.values()]
        .filter((m) => !m.roam && !progress.some((p) => p.missionId === m.id))
        .sort((a, b) => (a.levelReq ?? 0) - (b.levelReq ?? 0))[0];
      if (next) {
        focus = next.id;
        insights.push({
          kind: 'recommendation',
          title: `Next up: ${next.name}`,
          detail: `You have completed ${completed} missions — ${next.name} is unlocked and untouched.`,
        });
      }
    }
    if (level >= 2 && (stats?.distanceM ?? 0) < 50_000) {
      insights.push({
        kind: 'recommendation',
        title: 'Log some free-drive miles',
        detail: 'Ten minutes of Free Drive builds road memory for the routes your missions use — no risk to your stars.',
      });
    }

    return { generatedAt: new Date().toISOString(), focus, insights };
  }
}

export class CoachService {
  private analyzer: Analyzer;

  constructor(private repos: Repositories, analyzer?: Analyzer) {
    this.analyzer = analyzer ?? new RuleBasedAnalyzer();
  }

  async report(viewer: UserRecord): Promise<CoachReport> {
    const [progress, stats, profile] = await Promise.all([
      this.repos.missions.listForUser(viewer.id),
      this.repos.players.getStats(viewer.id),
      this.repos.players.getProfile(viewer.id),
    ]);
    return this.analyzer.analyze({ progress, stats, level: profile?.level ?? 0 });
  }
}
