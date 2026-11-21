// The lantern cats: patrol, suspicion, chase and investigation as one
// small state machine per cat. Pure logic — main.js feeds it the player,
// the solids and any noise events, and reads back what happened.

import {
  CAT_CHASE_SPEED, CAT_INVESTIGATE_SPEED, CAT_PATROL_SPEED, CAT_RADIUS,
  CAT_TURN_RATE, CATCH_DISTANCE, CHASE_MEMORY, DETECT_ALERT, DETECT_DECAY,
  DETECT_SUSPECT,
} from './config.js';
import { angleDelta, dist, moveCircle, visionStrength } from './world.js';

let nextCatId = 1;

export function createCat(def, solids) {
  const [x, y] = def.path[0];
  const [nx, ny] = def.path[1 % def.path.length];
  return {
    id: nextCatId++,
    x, y,
    facing: Math.atan2(ny - y, nx - x),
    path: def.path,
    wp: 1 % def.path.length,
    state: 'patrol',
    stateTime: 0,
    pauseFor: 0,
    detection: 0,
    lastSeen: null,
    memory: 0,
    target: null,
    lookTime: 0,
    scanPhase: def.phase ?? 0,
    solids,
  };
}

function turnToward(cat, want, dt) {
  const d = angleDelta(cat.facing, want);
  const maxTurn = CAT_TURN_RATE * dt;
  cat.facing += Math.max(-maxTurn, Math.min(maxTurn, d));
  return Math.abs(d) < 0.05;
}

function walkToward(cat, tx, ty, speed, dt) {
  const d = dist(cat.x, cat.y, tx, ty);
  if (d < 3) return true;
  turnToward(cat, Math.atan2(ty - cat.y, tx - cat.x), dt);
  const step = Math.min(d, speed * dt);
  const moved = moveCircle(
    cat.x, cat.y, CAT_RADIUS,
    Math.cos(cat.facing) * step, Math.sin(cat.facing) * step, cat.solids,
  );
  // If a wall blocks the facing line, slide toward the target directly.
  if (Math.abs(moved.x - cat.x) < 0.01 && Math.abs(moved.y - cat.y) < 0.01) {
    const direct = moveCircle(cat.x, cat.y, CAT_RADIUS, (tx - cat.x) / d * step, (ty - cat.y) / d * step, cat.solids);
    cat.x = direct.x; cat.y = direct.y;
  } else { cat.x = moved.x; cat.y = moved.y; }
  return d <= Math.max(4, speed * dt);
}

function nearestWaypoint(cat) {
  let best = 0, bd = Infinity;
  cat.path.forEach(([px, py], i) => {
    const d = dist(cat.x, cat.y, px, py);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

// Advance one cat by dt seconds. ctx: { player, noises, onRug } where
// player is {x, y, stance} and noises are fresh {x, y, radius} events.
// Returns a list of event names: 'suspect', 'alert', 'lost', 'caught'.
export function updateCat(cat, ctx, dt) {
  const events = [];
  const { player } = ctx;
  const seen = visionStrength(cat.x, cat.y, cat.facing, player.x, player.y, cat.solids);
  const prevState = cat.state;

  // --- perception -----------------------------------------------------
  if (seen > 0) {
    let rate = 0.45 + seen * 1.35;
    if (player.stance === 'sneak') rate *= 0.55;
    if (player.stance === 'run') rate *= 1.3;
    if (ctx.playerOnRug) rate *= 0.45;
    cat.detection = Math.min(DETECT_ALERT, cat.detection + rate * dt);
    cat.lastSeen = { x: player.x, y: player.y };
    cat.memory = CHASE_MEMORY;
  } else {
    cat.detection = Math.max(0, cat.detection - DETECT_DECAY * dt);
    cat.memory = Math.max(0, cat.memory - dt);
  }

  for (const n of ctx.noises) {
    if (cat.state !== 'chase' && dist(cat.x, cat.y, n.x, n.y) <= n.radius + 30) {
      cat.state = 'investigate';
      cat.target = { x: n.x, y: n.y };
      cat.lookTime = 0;
    }
  }

  // --- state transitions ----------------------------------------------
  if (cat.detection >= DETECT_ALERT && cat.state !== 'chase') {
    cat.state = 'chase';
    events.push('alert');
  } else if (cat.state === 'chase' && cat.memory <= 0 && cat.detection < 0.3) {
    cat.state = 'return';
    cat.wp = nearestWaypoint(cat);
    events.push('lost');
  } else if (
    (cat.state === 'patrol' || cat.state === 'pause' || cat.state === 'return') &&
    cat.detection >= DETECT_SUSPECT
  ) {
    cat.state = 'suspect';
    events.push('suspect');
  } else if (cat.state === 'suspect' && cat.detection < 0.18) {
    cat.state = 'return';
    cat.wp = nearestWaypoint(cat);
  }

  // --- behaviour --------------------------------------------------------
  cat.stateTime += dt;
  switch (cat.state) {
    case 'patrol': {
      const [tx, ty] = cat.path[cat.wp];
      if (walkToward(cat, tx, ty, CAT_PATROL_SPEED, dt)) {
        cat.state = 'pause';
        cat.stateTime = 0;
        cat.pauseFor = 1.15;
        cat.wp = (cat.wp + 1) % cat.path.length;
      }
      break;
    }
    case 'pause': {
      // Stand still and sweep the lantern left and right.
      const base = cat.facing;
      cat.scanPhase += dt;
      cat.facing = base + Math.sin(cat.scanPhase * 2.2) * 0.012;
      if (cat.stateTime >= cat.pauseFor) { cat.state = 'patrol'; cat.stateTime = 0; }
      break;
    }
    case 'suspect': {
      // Freeze and stare at whatever caught the eye.
      const t = cat.lastSeen ?? player;
      turnToward(cat, Math.atan2(t.y - cat.y, t.x - cat.x), dt * 1.6);
      break;
    }
    case 'chase': {
      const t = seen > 0 ? player : (cat.lastSeen ?? player);
      walkToward(cat, t.x, t.y, CAT_CHASE_SPEED, dt);
      if (dist(cat.x, cat.y, player.x, player.y) < CATCH_DISTANCE) events.push('caught');
      break;
    }
    case 'investigate': {
      if (cat.target && walkToward(cat, cat.target.x, cat.target.y, CAT_INVESTIGATE_SPEED, dt)) {
        cat.lookTime += dt;
        cat.facing += Math.sin(cat.stateTime * 3.1) * 0.02;
        if (cat.lookTime > 1.5) { cat.state = 'return'; cat.wp = nearestWaypoint(cat); cat.target = null; }
      }
      break;
    }
    case 'return': {
      const [tx, ty] = cat.path[cat.wp];
      if (walkToward(cat, tx, ty, CAT_PATROL_SPEED + 14, dt)) {
        cat.state = 'patrol';
        cat.wp = (cat.wp + 1) % cat.path.length;
      }
      break;
    }
  }

  if (prevState !== cat.state && cat.state === 'patrol') cat.stateTime = 0;
  return events;
}

// The cone colour band for a cat, from its state and detection level.
export function coneMood(cat) {
  if (cat.state === 'chase') return 'alert';
  if (cat.state === 'suspect' || cat.detection >= DETECT_SUSPECT) return 'suspect';
  return 'calm';
}
