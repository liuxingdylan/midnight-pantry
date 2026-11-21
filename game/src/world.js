// Pure geometry for Midnight Pantry: collision, line of sight and the
// vision-cone maths. No DOM in here, so the same code the browser plays
// with can be exercised headlessly from Node.

import { CONE_HALF_ANGLE, CONE_RANGE } from './config.js';

// Deterministic little RNG (mulberry32) so floors and jars are stable.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

// Signed smallest turn from angle a to angle b, in (-pi, pi].
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function pointInRect(x, y, r, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

export function circleHitsRect(x, y, radius, r) {
  const nx = clamp(x, r.x, r.x + r.w);
  const ny = clamp(y, r.y, r.y + r.h);
  return (x - nx) * (x - nx) + (y - ny) * (y - ny) < radius * radius;
}

// Move a circle by (dx, dy), sliding along any solid it meets. Axis by
// axis, so corners feel right and nothing tunnels at game speeds.
export function moveCircle(x, y, radius, dx, dy, solids) {
  let nx = x + dx;
  for (const s of solids) if (circleHitsRect(nx, y, radius, s)) { nx = x; break; }
  let ny = y + dy;
  for (const s of solids) if (circleHitsRect(nx, ny, radius, s)) { ny = y; break; }
  return { x: nx, y: ny };
}

// Segment vs rectangle: does the open segment (ax, ay)-(bx, by) cross r?
// Slab test; touching an edge counts as blocked so sight never leaks
// through the crack between two touching boxes.
export function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  for (const [p, d, lo, hi] of [[ax, dx, r.x, r.x + r.w], [ay, dy, r.y, r.y + r.h]]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let ta = (lo - p) / d, tb = (hi - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
  }
  return t1 > 0.001 && t0 < 0.999;
}

// Clear line of sight between two points against every solid.
export function hasLineOfSight(ax, ay, bx, by, solids) {
  for (const s of solids) if (segmentHitsRect(ax, ay, bx, by, s)) return false;
  return true;
}

// How far a ray travels before it meets a solid (for drawing cones).
export function raycast(ax, ay, angle, maxDist, solids) {
  const bx = ax + Math.cos(angle) * maxDist;
  const by = ay + Math.sin(angle) * maxDist;
  let best = maxDist;
  for (const s of solids) {
    // Sample the segment finely against the rect by slab entry distance.
    if (!segmentHitsRect(ax, ay, bx, by, s)) continue;
    let lo = 0, hi = best;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      const mx = ax + Math.cos(angle) * mid, my = ay + Math.sin(angle) * mid;
      if (pointInRect(mx, my, s, 0.5)) hi = mid; else lo = mid;
    }
    best = hi;
  }
  return best;
}

// The visible polygon of a vision cone: a fan of rays clipped by cover,
// so the light visibly bends around crates and shelf ends.
export function conePolygon(x, y, facing, range = CONE_RANGE, halfAngle = CONE_HALF_ANGLE, solids = []) {
  const steps = 26;
  const pts = [{ x, y }];
  for (let i = 0; i <= steps; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / steps;
    const d = raycast(x, y, a, range, solids);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

// Can a guard at (gx, gy) facing `facing` see the target right now?
// Returns 0 when unseen, else a strength in (0, 1] growing as the
// target gets closer and nearer the centre of the cone.
export function visionStrength(gx, gy, facing, tx, ty, solids) {
  const d = dist(gx, gy, tx, ty);
  if (d > CONE_RANGE) return 0;
  const ang = Math.atan2(ty - gy, tx - gx);
  const off = Math.abs(angleDelta(facing, ang));
  if (off > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(gx, gy, tx, ty, solids)) return 0;
  const closeness = 1 - d / CONE_RANGE;
  const centred = 1 - off / CONE_HALF_ANGLE;
  return 0.35 + 0.65 * Math.max(closeness, centred * 0.7);
}
