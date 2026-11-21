// The mouse: movement, stance and the noise it makes, plus the crumbs it
// tosses to pull a cat off its patrol. Pure logic, driven by an input
// snapshot {dx, dy, sneak, run} that input.js builds from the keyboard.

import {
  NOISE_RADIUS, PLAYER_RADIUS, PLAYER_RUN, PLAYER_SNEAK, PLAYER_WALK,
  STEP_SECONDS, CRUMB_FLY_SECONDS,
} from './config.js';
import { dist, moveCircle, pointInRect } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x, y: start.y,
    facing: -Math.PI / 2,
    stance: 'walk',
    stepClock: 0,
    moving: false,
    crumbs: [], // flying or landed: {x, y, tx, ty, t, landed, pinged}
  };
}

// Advance the mouse by dt. Returns noise events made this tick:
// [{x, y, radius, kind: 'step' | 'crumb'}].
export function updatePlayer(player, input, solids, dt) {
  const noises = [];
  const wantX = input.dx, wantY = input.dy;
  player.moving = wantX !== 0 || wantY !== 0;
  player.stance = !player.moving ? 'still' : input.sneak ? 'sneak' : input.run ? 'run' : 'walk';

  if (player.moving) {
    const len = Math.hypot(wantX, wantY) || 1;
    const speed = player.stance === 'run' ? PLAYER_RUN : player.stance === 'sneak' ? PLAYER_SNEAK : PLAYER_WALK;
    const moved = moveCircle(player.x, player.y, PLAYER_RADIUS, (wantX / len) * speed * dt, (wantY / len) * speed * dt, solids);
    player.x = moved.x; player.y = moved.y;
    player.facing = Math.atan2(wantY, wantX);

    player.stepClock -= dt;
    if (player.stepClock <= 0) {
      player.stepClock = STEP_SECONDS[player.stance];
      const radius = NOISE_RADIUS[player.stance];
      if (radius > 0) noises.push({ x: player.x, y: player.y, radius, kind: 'step' });
    }
  }

  for (const c of player.crumbs) {
    if (c.landed) { c.age = (c.age ?? 0) + dt; continue; }
    if (!c.landed) {
      c.t += dt / CRUMB_FLY_SECONDS;
      if (c.t >= 1) {
        c.landed = true;
        c.x = c.tx; c.y = c.ty;
        if (!c.pinged) {
          c.pinged = true;
          noises.push({ x: c.x, y: c.y, radius: 138, kind: 'crumb' });
        }
      } else {
        c.x = c.sx + (c.tx - c.sx) * c.t;
        c.y = c.sy + (c.ty - c.sy) * c.t - Math.sin(c.t * Math.PI) * 26;
      }
    }
  }
  // A landed crumb stays on the floorboards a few seconds, then is gone.
  player.crumbs = player.crumbs.filter((c) => !c.landed || (c.age ?? 0) < 6);
  return noises;
}

// Toss a crumb toward (tx, ty); it lands short if the toss is too long.
export function tossCrumb(player, tx, ty) {
  const d = dist(player.x, player.y, tx, ty);
  const maxToss = 260;
  const k = d > maxToss ? maxToss / d : 1;
  player.crumbs.push({
    sx: player.x, sy: player.y,
    x: player.x, y: player.y,
    tx: player.x + (tx - player.x) * k,
    ty: player.y + (ty - player.y) * k,
    t: 0, landed: false, pinged: false,
  });
}

export function onRug(player, rugs) {
  return rugs.some((r) => pointInRect(player.x, player.y, r));
}

export function atExit(player, exit) {
  return pointInRect(player.x, player.y, exit, -6);
}
