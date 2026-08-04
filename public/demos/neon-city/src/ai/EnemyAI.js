// ai/EnemyAI.js — per-enemy think: perception (sight/sound), state transitions,
// cover scoring, flanking, and attack decisions. Movement + shooting executed
// via the Enemy entity. The game provides context { player, world, hasLOS, soundEvents }.
import { CONFIG } from "../config.js";
import { dist, dist2, angleTo } from "../utils/math.js";
import { hasLineOfSight } from "../utils/collision.js";

const SOUND_RADIUS = 360; // gunfire propagates; enemies inside hear it

export class EnemyAI {
  constructor(pathfinder) { this.pathfinder = pathfinder; this.soundEvents = []; }

  // Game calls this when a loud event happens (gunfire, explosion).
  reportSound(x, y, radius = SOUND_RADIUS) {
    this.soundEvents.push({ x, y, radius, t: 2.5 });
  }
  updateSounds(dt) {
    for (const s of this.soundEvents) s.t -= dt;
    this.soundEvents = this.soundEvents.filter((s) => s.t > 0);
  }

  think(enemy, ctx, dt) {
    if (!enemy.alive) return;
    const { player, world, audio, game } = ctx;
    const target = player.inVehicle ? player.inVehicle : player;

    // --- Perception ---
    const d = dist(enemy.x, enemy.y, target.x, target.y);
    const canSee = enemy.flashStun <= 0 && d < enemy.range + 60 && hasLineOfSight(world, enemy.x, enemy.y, target.x, target.y);
    // Hear nearby sounds
    let heard = null;
    for (const s of this.soundEvents) {
      if (dist2(enemy.x, enemy.y, s.x, s.y) < s.radius * s.radius) { heard = s; break; }
    }

    if (canSee) {
      enemy.alert = Math.min(1, enemy.alert + dt * 1.5);
      enemy.lastKnown = { x: target.x, y: target.y };
      if (enemy.reactTimer <= 0) enemy.reactTimer = enemy.react;
    } else {
      enemy.alert = Math.max(0, enemy.alert - dt * 0.3);
      if (heard) {
        enemy.lastKnown = { x: heard.x, y: heard.y };
        if (enemy.state === "patrol" || enemy.state === "guard") enemy.setState("investigate");
      }
    }
    if (enemy.reactTimer > 0 && canSee) enemy.reactTimer -= dt;

    // --- State machine ---
    const engaged = canSee && enemy.alert > 0.6 && enemy.reactTimer <= 0;
    switch (enemy.state) {
      case "patrol": this.statePatrol(enemy, ctx, dt, engaged, canSee); break;
      case "guard": this.stateGuard(enemy, ctx, dt, engaged, canSee); break;
      case "investigate": this.stateInvestigate(enemy, ctx, dt, engaged, canSee); break;
      case "chase": this.stateChase(enemy, ctx, dt, engaged, canSee, target, d); break;
      case "attack": this.stateAttack(enemy, ctx, dt, engaged, canSee, target, d, audio); break;
      case "cover": this.stateCover(enemy, ctx, dt, engaged, canSee, target, d, audio); break;
      case "search": this.stateSearch(enemy, ctx, dt, engaged, canSee); break;
    }

    // Flee if critically wounded and not an elite
    if (enemy.hp < enemy.maxHp * 0.25 && enemy.tierLevel < 3 && enemy.state !== "flee") {
      enemy.setState("flee");
    }
    if (enemy.state === "flee") this.stateFlee(enemy, ctx, dt, target);
  }

  // --- States ---
  statePatrol(e, ctx, dt, engaged, canSee) {
    if (engaged) { e.setState("chase"); return; }
    if (canSee) { e.setState("investigate"); return; }
    if (!e.patrolTarget || dist(e.x, e.y, e.patrolTarget.x, e.patrolTarget.y) < 20) {
      const p = ctx.game.randomRoadPointNear(e.x, e.y, 600);
      e.patrolTarget = p;
    }
    this.stepToward(e, ctx, e.patrolTarget, dt, e.speed * 0.4);
  }
  stateGuard(e, ctx, dt, engaged, canSee) {
    if (engaged) { e.setState("attack"); return; }
    if (canSee) { e.setState("investigate"); return; }
    // stay near spawn; small idle turn
    if (Math.random() < 0.01) e.angle += (Math.random() - 0.5);
  }
  stateInvestigate(e, ctx, dt, engaged, canSee) {
    if (engaged) { e.setState("chase"); return; }
    if (!e.lastKnown) { e.setState("patrol"); return; }
    this.stepToward(e, ctx, e.lastKnown, dt, e.speed * 0.7);
    if (dist(e.x, e.y, e.lastKnown.x, e.lastKnown.y) < 30) {
      e.lastKnown = null; e.setState("search"); e.stateTime = 0;
    }
    if (e.stateTime > 8) e.setState("patrol");
  }
  stateChase(e, ctx, dt, engaged, canSee, target, d) {
    if (!canSee && !e.lastKnown) { e.setState("search"); e.stateTime = 0; return; }
    const dest = canSee ? target : e.lastKnown;
    this.stepToward(e, ctx, dest, dt, e.speed);
    if (canSee && d < e.range * 0.7) e.setState("attack");
  }
  stateAttack(e, ctx, dt, engaged, canSee, target, d, audio) {
    if (!canSee) { e.setState(e.lastKnown ? "search" : "patrol"); e.stateTime = 0; return; }
    // maintain distance, take cover if exposed & low
    const ideal = e.range * 0.5;
    let mv = { x: 0, y: 0 };
    if (d > ideal * 1.2) { mv = this.dirToward(e, target); }
    else if (d < ideal * 0.6) { mv = this.dirAway(e, target); }
    else {
      // strafe occasionally
      if (Math.random() < 0.02) { const a = angleTo(e.x, e.y, target.x, target.y) + Math.PI / 2; mv = { x: Math.cos(a), y: Math.sin(a) }; }
    }
    e.move(dt, ctx.world, mv.x * e.speed * 0.7, mv.y * e.speed * 0.7);
    e.aimAngle = angleTo(e.x, e.y, target.x, target.y);
    // shoot
    const shot = e.tryShoot(target, audio);
    if (shot && ctx.onEnemyShoot) ctx.onEnemyShoot(e, shot);
    // occasionally seek cover
    if (e.hp < e.maxHp * 0.5 && Math.random() < 0.01) e.setState("cover");
  }
  stateCover(e, ctx, dt, engaged, canSee, target, d, audio) {
    // find a building corner to break LOS to player, then peek & shoot
    if (!e._coverTarget || e.stateTime > 3) {
      e._coverTarget = this.findCover(e, target, ctx.world);
      e.stateTime = 0;
    }
    if (e._coverTarget) {
      this.stepToward(e, ctx, e._coverTarget, dt, e.speed);
      if (dist(e.x, e.y, e._coverTarget.x, e._coverTarget.y) < 24) {
        if (canSee) {
          e.aimAngle = angleTo(e.x, e.y, target.x, target.y);
          const shot = e.tryShoot(target, audio);
          if (shot && ctx.onEnemyShoot) ctx.onEnemyShoot(e, shot);
        }
        if (e.stateTime > 2.5) e.setState("attack");
      }
    } else e.setState("attack");
  }
  stateSearch(e, ctx, dt, engaged, canSee) {
    if (engaged) { e.setState("chase"); return; }
    if (canSee) { e.setState("investigate"); return; }
    // wander near last known
    if (Math.random() < 0.02) {
      const a = Math.random() * Math.PI * 2;
      e.patrolTarget = { x: e.x + Math.cos(a) * 120, y: e.y + Math.sin(a) * 120 };
    }
    if (e.patrolTarget) this.stepToward(e, ctx, e.patrolTarget, dt, e.speed * 0.5);
    if (e.stateTime > 7) { e.setState("patrol"); e.lastKnown = null; }
  }
  stateFlee(e, ctx, dt, target) {
    const mv = this.dirAway(e, target);
    e.move(dt, ctx.world, mv.x * e.speed * 1.1, mv.y * e.speed * 1.1);
    e.aimAngle = angleTo(e.x, e.y, target.x, target.y);
  }

  // --- Movement helpers ---
  stepToward(e, ctx, dest, dt, speed) { this.goToward(e, ctx, dest, dt, speed); }
  // Move toward dest using the pathfinder's next-step direction.
  goToward(e, ctx, dest, dt, speed) {
    if (!dest) return;
    const step = this.pathfinder.nextStep(e.x, e.y, dest.x, dest.y);
    if (!step) return;
    e.move(dt, ctx.world, step.x * speed * dt, step.y * speed * dt);
  }
  dirToward(e, target) { return norm(target.x - e.x, target.y - e.y); }
  dirAway(e, target) { return norm(e.x - target.x, e.y - target.y); }

  // Find a nearby tile that breaks line of sight to the player.
  findCover(e, target, world) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 120;
      const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
      if (!hasLineOfSight(world, x, y, target.x, target.y)) return { x, y };
    }
    return null;
  }
}

function norm(x, y) { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; }
